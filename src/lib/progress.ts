import type { LectureId } from "../data";
import { allClozeQuestions, allTfQuestions } from "./questions";
import { isMastered, isWeak } from "./storage";

export interface Progress {
  clozeTotal: number;
  tfTotal: number;
  total: number;
  /** 直近で正解している問題数 */
  mastered: number;
  /** 直近で間違えている問題数 */
  weak: number;
  ratio: number;
}

/** 問題IDの一覧はデータから決まるので一度だけ作る */
const idCache = new Map<string, { cloze: string[]; tf: string[] }>();

function ids(lectures: readonly LectureId[]) {
  const key = lectures.join(",");
  let entry = idCache.get(key);
  if (!entry) {
    entry = {
      cloze: allClozeQuestions(lectures).map((q) => q.id),
      tf: allTfQuestions(lectures).map((q) => q.id),
    };
    idCache.set(key, entry);
  }
  return entry;
}

export function progressOf(lectures: readonly LectureId[]): Progress {
  const { cloze, tf } = ids(lectures);
  const all = [...cloze, ...tf];
  const mastered = all.filter(isMastered).length;
  const weak = all.filter(isWeak).length;
  return {
    clozeTotal: cloze.length,
    tfTotal: tf.length,
    total: all.length,
    mastered,
    weak,
    ratio: all.length ? mastered / all.length : 0,
  };
}
