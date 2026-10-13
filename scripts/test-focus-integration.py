"""Real API tests in a temporary database/container; never uses production student data.
Run after npm run build:api. Requires the existing local imai-study Docker stack.
"""
import concurrent.futures, hashlib, json, os, pathlib, secrets, socket, subprocess, tempfile, time, urllib.request, urllib.error, uuid
REPO=pathlib.Path(__file__).resolve().parents[1]
run=lambda args,**kw: subprocess.run(args,check=True,capture_output=True,text=True,**kw)
suffix=secrets.token_hex(5); db='imai_focus_qa_'+suffix; name='imai-focus-qa-'+suffix
sql=lambda q:run(['docker','exec','-i','imai-study-postgres-1','psql','-U','imai_study','-d',db,'-At','-v','ON_ERROR_STOP=1'],input=q).stdout.strip()
checks=0

def check(ok,label):
 global checks
 if not ok: raise AssertionError(label)
 checks+=1; print('PASS '+label,flush=True)

with socket.socket() as sock:
 sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base='http://127.0.0.1:'+str(port)+'/api'
def request(method,path,token=None,body=None):
 headers={}
 if token:headers['Authorization']='Bearer '+token
 raw=None
 if body is not None:raw=json.dumps(body).encode();headers['Content-Type']='application/json'
 req=urllib.request.Request(base+path,data=raw,method=method,headers=headers)
 try:
  with urllib.request.urlopen(req,timeout=10) as res:return res.status,json.loads(res.read() or '{}'),{k.lower():v for k,v in res.headers.items()}
 except urllib.error.HTTPError as e:return e.code,json.loads(e.read() or '{}'),{k.lower():v for k,v in e.headers.items()}

def student(token,name):
 code,data,_=request('POST','/students',token,{'name':name,'levelId':'d2'});check(code==201,'create synthetic student '+name);return data['student']['id']
def link(token,sid,duration=30):
 code,data,h=request('POST',f'/students/{sid}/study-links',token,{'durationMinutes':duration});check(code==201,'create single-use study link');check('no-store' in h.get('cache-control',''),'link response not cached');return data
try:
 info=json.loads(run(['docker','inspect','imai-study-api-1']).stdout)[0]
 env=dict(x.split('=',1) for x in info['Config']['Env'] if '=' in x)
 dburl=env['DATABASE_URL'].rsplit('/',1)[0]+'/'+db
 run(['docker','exec','imai-study-postgres-1','createdb','-U','imai_study',db])
 with tempfile.NamedTemporaryFile('w',prefix='imai-focus-qa-',delete=False) as f:
  path=f.name;os.chmod(path,0o600);f.write('DATABASE_URL='+dburl+'\nJWT_SECRET='+secrets.token_urlsafe(48)+'\nPORT=4181\nFRONTEND_ORIGIN=http://127.0.0.1\nFREE_AI_ONLY=true\n')
 try:
  run(['docker','run','-d','--name',name,'--network','imai-study_study','--env-file',path,'-p',f'127.0.0.1:{port}:4181','-v',str(REPO/'server/dist')+':/app/server/dist:ro',info['Image']])
 finally:os.unlink(path)
 for attempt in range(80):
  try:
   if request('GET','/health')[0]==200:break
  except (OSError,urllib.error.URLError):pass
  time.sleep(.1)
 else:raise RuntimeError('QA API did not become healthy')
 parent=[]
 for i in range(2):
  code,data,_=request('POST','/auth/register',body={'email':f'focus-{suffix}-{i}@example.invalid','password':secrets.token_urlsafe(24),'displayName':'QA Parent'})
  check(code==201,'register synthetic parent');parent.append(data['token'])
 a=student(parent[0],'QA Arif');sibling=student(parent[0],'QA Aila');other=student(parent[1],'QA Other')
 check(request('POST',f'/students/{a}/study-links',body={})[0]==401,'anonymous cannot create link')
 check(request('POST',f'/students/{other}/study-links',parent[0],{})[0]==404,'parent cannot link another family')
 check(request('POST',f'/students/{a}/study-links',parent[0],{'durationMinutes':0})[0]==400,'invalid duration rejected')
 data=link(parent[0],a);sid=data['link']['id'];code=data['code']
 check(len(code)>=40,'invite code has sufficient entropy')
 check(sql("SELECT code_hash FROM study_links WHERE id='"+sid+"';")==hashlib.sha256(code.encode()).hexdigest(),'database stores only hash')
 status,listing,_=request('GET',f'/students/{a}/study-links',parent[0]);check(status==200 and code not in json.dumps(listing) and 'code_hash' not in json.dumps(listing),'listing does not expose invite secrets')
 check(request('GET',f'/students/{a}/study-links',parent[1])[0]==404,'other parent cannot list links')
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(lambda _:request('POST','/auth/redeem-study-link',body={'code':code}),range(2)))
 check(sorted(x[0] for x in results)==[200,410],'simultaneous redemption succeeds exactly once')
 issued=next(x[1] for x in results if x[0]==200);child=issued['token'];focus=issued['session']['id']
 check(issued['user']['role']=='student' and issued['user']['studentId']==a and 'email' not in issued['user'],'redeem scoped child identity without parent email')
 check(issued['user']['focusSessionId']==focus,'session bound to user response')
 check(request('GET','/me',child)[1]['user']['focusSessionId']==focus,'refresh retains focus session binding')
 check([x['id'] for x in request('GET','/students',child)[1]['students']]==[a],'child can only list own profile')
 check(request('GET',f'/students/{sibling}/attempts',child)[0]==403,'child cannot read sibling')
 for method,path,body in [('POST',f'/students/{a}/study-links',{}),('GET',f'/students/{a}/study-links',None),('GET',f'/students/{a}/focus-sessions',None),('POST',f'/students/{a}/focus-sessions/{focus}/approve-exit',{}),('DELETE',f'/students/{a}/study-links/{sid}',None)]:
  check(request(method,path,child,body)[0]==403,'child cannot perform parent action '+method+' '+path.split('/')[-1])
 check(request('POST',f'/students/{a}/focus-sessions/{focus}/approve-exit',parent[1],{})[0]==404,'other parent cannot approve exit')
 check(request('GET','/focus-session',child)[1]['session']['status']=='active','child focus starts active')
 check(request('POST','/focus-session/exit-request',child,{})[1]['session']['status']=='exit_requested','child requests exit')
 check(request('POST','/focus-session/exit-request',child,{})[1]['session']['status']=='exit_requested','repeat exit request idempotent')
 check(request('GET','/me',child)[0]==200,'learning remains available while waiting')
 check(request('GET',f'/students/{a}/focus-sessions',parent[0])[1]['sessions'][0]['status']=='exit_requested','parent sees pending exit request')
 check(request('POST',f'/students/{a}/focus-sessions/{focus}/approve-exit',parent[0],{})[1]['session']['status']=='approved','own parent approves exit')
 check(request('GET','/focus-session',child)[1]['session']['status']=='approved','child can read terminal status')
 for path in ['/me','/students',f'/students/{a}/attempts']:
  check(request('GET',path,child)[0]==401,'approved session cannot reuse protected access '+path)
 second=link(parent[0],a);status,data,_=request('POST','/auth/redeem-study-link',body={'code':second['code']});check(status==200,'redeem second link');child2=data['token']
 check(request('DELETE',f"/students/{a}/study-links/{second['link']['id']}",parent[0])[0]==204,'parent revokes redeemed link')
 check(request('GET','/focus-session',child2)[1]['session']['status']=='revoked','revocation reaches active child')
 check(request('GET','/me',child2)[0]==401,'revoked child cannot continue API access')
 third=link(parent[0],a);sql("UPDATE study_links SET expires_at=now()-interval '1 second' WHERE id='"+third['link']['id']+"';")
 check(request('POST','/auth/redeem-study-link',body={'code':third['code']})[0]==410,'expired link rejected')
 fourth=link(parent[0],a);request('DELETE',f"/students/{a}/study-links/{fourth['link']['id']}",parent[0]);check(request('POST','/auth/redeem-study-link',body={'code':fourth['code']})[0]==410,'revoked unused link rejected')
 fifth=link(parent[0],a);_,data,_=request('POST','/auth/redeem-study-link',body={'code':fifth['code']});child3=data['token'];sql("UPDATE focus_sessions SET ends_at=now()-interval '1 second' WHERE id='"+data['session']['id']+"';")
 check(request('GET','/focus-session',child3)[1]['session']['status']=='expired','expired session status visible')
 check(request('GET','/me',child3)[0]==401,'expired session cannot continue learning API')
 sixth=link(parent[0],sibling);check(request('DELETE',f"/students/{a}/study-links/{sixth['link']['id']}",parent[0])[0]==404,'nested link cannot be revoked under wrong student')
 check(request('POST','/auth/redeem-study-link',body={'code':'bad'})[0]==400,'malformed code rejected')
 check(request('POST','/auth/redeem-study-link',body={'code':secrets.token_urlsafe(32)})[0]==410,'unknown code rejected')
 check(request('DELETE',f'/students/{a}',parent[0])[0]==204,'parent deletes synthetic child')
 check(sql("SELECT count(*) FROM study_links WHERE student_id='"+a+"';")=='0' and sql("SELECT count(*) FROM focus_sessions WHERE student_id='"+a+"';")=='0','deleting child removes links and sessions')
 check(request('GET',f'/students/{sibling}/study-links',parent[0])[0]==200,'sibling remains after delete')
 print('TOTAL',checks,'ASSERTIONS PASSED',flush=True)
finally:
 subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['docker','exec','imai-study-postgres-1','dropdb','-U','imai_study','--if-exists',db],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 print('QA DATABASE AND CONTAINER CLEANED',flush=True)
