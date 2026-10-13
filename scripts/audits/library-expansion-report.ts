import { libraryUnits, libraryResources, expansionUnits } from "../../server/library/catalog";
import { levels, getSubjectsForLevel, getTopics } from "../../src/data/curriculum";
import { resources, isResourceForLevel } from "../../src/data/resources";
const grades = levels.map(level => {
  const units = libraryUnits.filter(u => u.levelId === level.id);
  const counts = Object.fromEntries((["note", "reading", "practice"] as const).map(kind => [kind,libraryResources.filter(r => r.levelIds[0] === level.id && r.kind === kind).length]));
  return {
    grade: level.id, label: level.label, units: units.length, ...counts,
    totalLibraryIncludingPilot: resources.filter(r => isResourceForLevel(r,level.id,level.stage)).length,
    subjects: getSubjectsForLevel(level.id).map(subject => {
      const subjectUnits = units.filter(u => u.subjectId === subject.id);
      const questions = getTopics(level.id,subject.id).flatMap(t => t.questions);
      return {id:subject.id,name:subject.name,notes:subjectUnits.length,readings:subjectUnits.length,practiceSets:subjectUnits.length,topicQuestions:questions.length,uniqueQuestionIds:new Set(questions.map(q=>q.id)).size};
    }),
  };
});
console.log(JSON.stringify({
  generatedAt:new Date().toISOString(),
  target:"100 notes + 100 readings + 100 practice sets per grade; 12 grades",
  addedUnits:expansionUnits.length,totalUnits:libraryUnits.length,coreLibraryMaterials:libraryResources.length,
  totalLibraryIncludingPilot:resources.length,
  authoredLibraryQuestions:libraryResources.reduce((n,r)=>n+(r.questions?.length??0),0),
  topicQuestions:grades.reduce((n,g)=>n+g.subjects.reduce((s,x)=>s+x.topicQuestions,0),0),
  grades,
  reviewStatus:"Automated count and linking report. Factual correctness, reading suitability and full curriculum/semester mapping require editorial review; counts do not establish curriculum completeness."
},null,2));
