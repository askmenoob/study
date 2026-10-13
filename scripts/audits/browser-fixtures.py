"""Export source fixtures for the isolated browser verification script."""
import json, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[2]
subjects=['bm','en','math','science','math','history','bm','en','history','math','geo','physics']
grades=['d1','d2','d3','d4','d5','d6','t1','t2','t3','t4','t5','t6']
fixtures=[]
for grade,subject in list(zip(grades,subjects))+[('t6','bc'),('t6','bt'),('t6','ba')]:
    units=json.loads((root/'server/library/expansion'/f'{grade}.json').read_text())
    unit=next(u for u in units if u['subjectId']==subject)
    fixtures.append({'level':grade,'subject':subject,'id':unit['id'],'title':unit['reading']['title'],'questions':[{'prompt':q['prompt'],'answer':q['answer']} for k in ['reading','practice'] for q in unit[k]['questions']]})
pathlib.Path(sys.argv[1]).write_text(json.dumps(fixtures,ensure_ascii=False))
