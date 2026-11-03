import { describe, expect, it } from "vitest";
import { LECTURES, LECTURE_IDS } from ".";
import { isAcceptedAnswer, normalizeAnswer } from "../lib/normalize";
import { allClozeQuestions, allTfQuestions, blankIndexes, buildQuiz } from "../lib/questions";

const items = LECTURES.flatMap((l) => l.sections.flatMap((s) => s.items));

describe("問題データ", () => {
  it("IDが重複していない", () => {
    const ids = [...items.map((i) => i.id), ...LECTURES.flatMap((l) => l.tf.map((t) => t.id))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("IDの接頭辞が回と一致している", () => {
    for (const l of LECTURES) {
      for (const s of l.sections) for (const item of s.items) expect(item.id.startsWith(`${l.id}-`)).toBe(true);
      for (const t of l.tf) expect(t.id.startsWith(`${l.id}-TF`)).toBe(true);
    }
  });

  it.each(items.map((i) => [i.id, i] as const))("%s: 本文の空欄と blanks が対応している", (_, item) => {
    const used = blankIndexes(item.text).sort((a, b) => a - b);
    expect(used).toEqual(item.blanks.map((_, i) => i));
  });

  it.each(items.map((i) => [i.id, i] as const))("%s: 4択の選択肢が妥当", (_, item) => {
    item.blanks.forEach((b, idx) => {
      const options = [b.answer, ...b.choices].map(normalizeAnswer);
      // 正解と誤答・誤答どうしが重複しない
      expect(new Set(options).size).toBe(4);
      // 誤答が別表記（＝実質正解）になっていない
      for (const c of b.choices) expect(isAcceptedAnswer(c, b), `${item.id}#${idx}: ${c}`).toBe(false);
      // 同じ文の他の空欄（出題時は表示済み）の答えを誤答に使っていない
      item.blanks.forEach((other, j) => {
        if (j !== idx) expect(b.choices).not.toContain(other.answer);
      });
      // 別表記に正解そのものを重複して書いていない
      expect(b.alt ?? []).not.toContain(b.answer);
    });
  });

  it("○×問題の × には修正文がある", () => {
    for (const t of LECTURES.flatMap((l) => l.tf)) {
      if (!t.answer) expect(t.correction, t.id).toBeTruthy();
      else expect(t.correction, t.id).toBeUndefined();
    }
  });

  it("○×問題の○と×が極端に偏っていない", () => {
    const tf = LECTURES.flatMap((l) => l.tf);
    const trueRatio = tf.filter((t) => t.answer).length / tf.length;
    expect(trueRatio).toBeGreaterThan(0.3);
    expect(trueRatio).toBeLessThan(0.7);
  });
});

describe("出題", () => {
  it("穴埋めは空欄ごとに1問になる", () => {
    const total = items.reduce((n, i) => n + blankIndexes(i.text).length, 0);
    expect(allClozeQuestions(LECTURE_IDS)).toHaveLength(total);
  });

  it("4択は正解を含む4つの選択肢", () => {
    for (const q of allClozeQuestions(LECTURE_IDS)) {
      expect(q.choices).toHaveLength(4);
      expect(q.choices).toContain(q.item.blanks[q.blank].answer);
    }
  });

  it("模擬テストは指定数で穴埋めと○×が混ざる", () => {
    const qs = buildQuiz({ mode: "mock", lectures: [...LECTURE_IDS], count: 20, format: "choice" }, () => false);
    expect(qs).toHaveLength(20);
    expect(qs.filter((q) => q.kind === "tf").length).toBe(8);
    expect(new Set(qs.map((q) => q.id)).size).toBe(20);
  });

  it("苦手モードは苦手の問題だけ", () => {
    const weak = new Set(["L1-01#0", "L2-TF01"]);
    const qs = buildQuiz({ mode: "weak", lectures: [...LECTURE_IDS], count: 0, format: "choice" }, (id) => weak.has(id));
    expect(qs.map((q) => q.id).sort()).toEqual([...weak].sort());
  });

  it("範囲を絞ると他の回は出ない", () => {
    const qs = allTfQuestions(["L4"]);
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.lectureId === "L4")).toBe(true);
  });
});

describe("記述の判定", () => {
  const blank = { answer: "利用者数の２乗に比例", alt: ["利用者数の二乗に比例"], choices: ["a", "b", "c"] as [string, string, string] };

  it("全角半角・空白の違いを吸収する", () => {
    expect(isAcceptedAnswer("利用者数の2乗に比例", blank)).toBe(true);
    expect(isAcceptedAnswer(" 利用者数の２乗に比例 ", blank)).toBe(true);
    expect(isAcceptedAnswer("利用者数の二乗に比例", blank)).toBe(true);
  });

  it("英字の大文字小文字を区別しない", () => {
    expect(isAcceptedAnswer("dos", { answer: "DoS", choices: ["a", "b", "c"] })).toBe(true);
    expect(isAcceptedAnswer("ｂｔｏｂ", { answer: "BtoBあるいはB2B", alt: ["BtoB"], choices: ["a", "b", "c"] })).toBe(true);
  });

  it("違う答えや空欄は不正解", () => {
    expect(isAcceptedAnswer("利用者数に比例", blank)).toBe(false);
    expect(isAcceptedAnswer("   ", blank)).toBe(false);
  });
});
