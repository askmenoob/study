import type { LevelId } from "../../types";
import { languageBank } from "./languages";
import { scienceHumanitiesBank } from "./scienceHumanities";
import { valuesBank } from "./values";
import { stpmBank } from "./stpm";
import { mathematicsBank } from "./mathematics";

export function additionalTopics(levelId: LevelId, subjectId: string) {
  return [languageBank, scienceHumanitiesBank, valuesBank, stpmBank, mathematicsBank]
    .flatMap(bank => bank[levelId]?.[subjectId] ?? []);
}
