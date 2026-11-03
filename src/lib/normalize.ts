import type { Blank } from "../data/types";

/**
 * 記述入力の比較用に表記ゆれを吸収する。
 * 全角/半角・大文字/小文字・空白・句読点・括弧の違いを無視する。
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・、。,.()（）「」『』【】\[\]"'“”‘’!?:;/]/g, "");
}

export function isAcceptedAnswer(input: string, blank: Blank): boolean {
  const given = normalizeAnswer(input);
  if (!given) return false;
  return [blank.answer, ...(blank.alt ?? [])].some((a) => normalizeAnswer(a) === given);
}
