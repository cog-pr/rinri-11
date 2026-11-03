import { L1 } from "./L1";
import { L2 } from "./L2";
import { L3 } from "./L3";
import { L4 } from "./L4";
import { L5 } from "./L5";
import { L6 } from "./L6";
import type { Lecture, LectureId } from "./types";

export const LECTURES: Lecture[] = [L1, L2, L3, L4, L5, L6];

export const LECTURE_IDS = LECTURES.map((l) => l.id);

export function getLecture(id: string): Lecture | undefined {
  return LECTURES.find((l) => l.id === id);
}

export function isLectureId(id: string): id is LectureId {
  return LECTURES.some((l) => l.id === id);
}

export type { Lecture, LectureId, ClozeItem, Blank, Section, TfItem } from "./types";
