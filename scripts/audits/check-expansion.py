"""Deterministic draft audit. Does not claim curriculum or pedagogical approval."""
import collections, difflib, json, pathlib, re, sys, unicodedata
root = pathlib.Path(__file__).resolve().parents[2]
expected = dict(zip(['d1','d2','d3','d4','d5','d6','t1','t2','t3','t4','t5','t6'],[89,89,89,88,88,88,92,92,92,92,92,77]))
normalize = lambda s: re.sub(r'\s+', ' ', unicodedata.normalize('NFKC',s).casefold()).strip()
errors=[]; rows=[]; seen={}; candidates=[]; cross_grade={}; cross_candidates=[]; shared_note_review=[]
for grade, target in expected.items():
    path=root/'server/library/expansion'/f'{grade}.json'
    if not path.exists():
        errors.append(f'{grade}: missing'); continue
    units=json.loads(path.read_text())
    if len(units)!=target: errors.append(f'{grade}: {len(units)}/{target} added units')
    words=[]; subjects=collections.Counter(); signatures=[]
    for u in units:
        uid=u['id']; subjects[u['subjectId']]+=1
        if u['levelId']!=grade: errors.append(f'{uid}: wrong grade')
        reading=u['reading']['body']; passage=' '.join(reading)
        if len(u['note']['body'])<3 or len(u['note'].get('keyPoints',[]))<3: errors.append(f'{uid}: note paragraphs/key points')
        if len(' '.join(u['note']['body']))<(80 if grade=='d1' else 160): errors.append(f'{uid}: note too short')
        if len(passage)<(30 if grade=='d1' else 140): errors.append(f'{uid}: reading too short')
        words.append(len(passage.split()))
        for kind in ['note','reading','practice']:
            for field in ['title','body']:
                value=u[kind][field]; key=(field,normalize(' '.join(value) if isinstance(value,list) else value))
                if key in seen: errors.append(f'{uid}/{kind}: duplicate {field} with {seen[key]}')
                seen[key]=f'{uid}/{kind}'
        if all(normalize(p) in normalize(passage) for p in u['note']['body']):shared_note_review.append(uid)
        qs=u['reading']['questions']+u['practice']['questions']
        if len(qs)!=6:errors.append(f'{uid}: question count')
        if sum('___' not in q['prompt'] for q in qs)<2:errors.append(f'{uid}: all or mostly cloze')
        for i,q in enumerate(qs):
            e=q.get('evidence',{}); p=e.get('paragraph'); text=e.get('text','')
            if not isinstance(p,int) or p<0 or p>=len(reading) or not text or text not in reading[p]: errors.append(f'{uid}/q{i+1}: missing or invalid evidence')
            if len(q['options'])!=4 or len({re.sub(r'\s+', ' ', unicodedata.normalize('NFKC',o)).strip() for o in q['options']})!=4 or q['answer'] not in range(4): errors.append(f'{uid}/q{i+1}: invalid options/key')
        # Near duplicates are review candidates, never proof of editorial uniqueness.
        sig=set(re.findall(r'\w+',normalize(' '.join(u['note']['body'])+' '+passage)))
        for other,other_sig in signatures:
            similarity=len(sig&other_sig)/max(1,len(sig|other_sig))
            if similarity>=.8:candidates.append({'a':other,'b':uid,'jaccard':round(similarity,3)})
        signatures.append((uid,sig))
        for other_grade,other,other_sig in cross_grade.get(u['subjectId'],[]):
            if other_grade==grade:continue
            similarity=len(sig&other_sig)/max(1,len(sig|other_sig))
            if similarity>=.8:cross_candidates.append({'a':other,'b':uid,'jaccard':round(similarity,3)})
        cross_grade.setdefault(u['subjectId'],[]).append((grade,uid,sig))
    rows.append({'grade':grade,'added':len(units),'target':target,'subjects':dict(subjects),'readingWords':{'min':min(words,default=0),'median':sorted(words)[len(words)//2] if words else 0,'max':max(words,default=0)}})
print(json.dumps({'coverage':rows,'structuralErrors':errors,'nearDuplicateReview':candidates,'crossGradeReview':cross_candidates,'sharedNoteReview':shared_note_review,'limitation':'Evidence checks verify textual grounding, not factual accuracy or grade suitability.'},ensure_ascii=False,indent=2))
sys.exit(bool(errors))
