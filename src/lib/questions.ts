import { LECTURES, type ClozeItem, type LectureId, type TfItem } from "../data";
import { shuffle } from "./random";

export type QuizMode = "cloze" | "tf" | "mock" | "weak";
export type ClozeFormat = "choice" | "input";

export const MODE_NAME: Record<QuizMode, string> = { cloze: "穴埋め", tf: "○×", mock: "模擬テスト", weak: "苦手復習" };

export interface ClozeQuestion {
  kind: "cloze";
  id: string;
  lectureId: LectureId;
  section: string;
  item: ClozeItem;
  blank: number;
  /** 4択の選択肢（正解を含めてシャッフル済み） */
  choices: string[];
}

export interface TfQuestion {
  kind: "tf";
  id: string;
  lectureId: LectureId;
  item: TfItem;
}

export type Question = ClozeQuestion | TfQuestion;

/** 空欄ごとの問題ID（例: "L4-15#2"） */
export function clozeId(itemId: string, blank: number): string {
  return `${itemId}#${blank}`;
}

/** 本文中に登場する空欄番号（重複なし・登場順） */
export function blankIndexes(text: string): number[] {
  const seen: number[] = [];
  for (const m of text.matchAll(/\{(\d+)\}/g)) {
    const n = Number(m[1]);
    if (!seen.includes(n)) seen.push(n);
  }
  return seen;
}

function makeCloze(lectureId: LectureId, section: string, item: ClozeItem, blank: number): ClozeQuestion {
  const b = item.blanks[blank];
  return {
    kind: "cloze",
    id: clozeId(item.id, blank),
    lectureId,
    section,
    item,
    blank,
    choices: shuffle([b.answer, ...b.choices]),
  };
}

export function allClozeQuestions(lectures: readonly LectureId[]): ClozeQuestion[] {
  return LECTURES.filter((l) => lectures.includes(l.id)).flatMap((l) =>
    l.sections.flatMap((s) =>
      s.items.flatMap((item) => blankIndexes(item.text).map((b) => makeCloze(l.id, s.heading, item, b))),
    ),
  );
}

export function allTfQuestions(lectures: readonly LectureId[]): TfQuestion[] {
  return LECTURES.filter((l) => lectures.includes(l.id)).flatMap((l) =>
    l.tf.map((item): TfQuestion => ({ kind: "tf", id: item.id, lectureId: l.id, item })),
  );
}

export function allQuestions(lectures: readonly LectureId[]): Question[] {
  return [...allClozeQuestions(lectures), ...allTfQuestions(lectures)];
}

export interface QuizConfig {
  mode: QuizMode;
  lectures: LectureId[];
  /** 0 = すべて */
  count: number;
  format: ClozeFormat;
}

/**
 * 設定に従って出題リストを作る。
 * weak モードでは isWeak が true の問題だけを対象にする。
 */
export function buildQuiz(config: QuizConfig, isWeak: (id: string) => boolean): Question[] {
  const { mode, lectures, count } = config;
  let pool: Question[];
  switch (mode) {
    case "cloze":
      pool = shuffle(allClozeQuestions(lectures));
      break;
    case "tf":
      pool = shuffle(allTfQuestions(lectures));
      break;
    case "weak":
      pool = shuffle(allQuestions(lectures).filter((q) => isWeak(q.id)));
      break;
    case "mock": {
      // 穴埋め6：○×4 の割合で混ぜる
      const cloze = shuffle(allClozeQuestions(lectures));
      const tf = shuffle(allTfQuestions(lectures));
      const total = count > 0 ? Math.min(count, cloze.length + tf.length) : cloze.length + tf.length;
      const nCloze = Math.min(cloze.length, total - Math.min(tf.length, Math.round(total * 0.4)));
      const nTf = Math.min(tf.length, total - nCloze);
      return shuffle([...cloze.slice(0, nCloze), ...tf.slice(0, nTf)]);
    }
  }
  return count > 0 ? pool.slice(0, count) : pool;
}

export function questionLecture(q: Question) {
  return LECTURES.find((l) => l.id === q.lectureId)!;
}

export function correctText(q: Question): string {
  return q.kind === "cloze" ? q.item.blanks[q.blank].answer : q.item.answer ? "○" : "×";
}
