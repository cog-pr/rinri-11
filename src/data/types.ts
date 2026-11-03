export type LectureId = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

/** 穴埋めの空欄1つ分（＝配布資料の赤文字1箇所） */
export interface Blank {
  /** 正解（編集済みPDFの赤文字） */
  answer: string;
  /** 記述入力で正解とみなす別表記 */
  alt?: string[];
  /** 4択用の誤答（3つ） */
  choices: [string, string, string];
}

/**
 * 配布資料の1文。text 中の {0} {1} … が blanks[n] の空欄になる。
 * 同じ番号を2回使うと、同じ答えの空欄として同時に出題・表示される。
 */
export interface ClozeItem {
  id: string;
  text: string;
  blanks: Blank[];
}

export interface Section {
  heading: string;
  items: ClozeItem[];
}

/** ○×（正誤）問題 */
export interface TfItem {
  id: string;
  statement: string;
  /** true = ○（適切） / false = ×（不適切） */
  answer: boolean;
  /** ×の場合の修正文 */
  correction?: string;
  explanation: string;
  /** handout = 配布資料に載っている問題 / original = 資料の内容から作成した問題 */
  source: "handout" | "original";
}

export interface Lecture {
  id: LectureId;
  no: number;
  title: string;
  sections: Section[];
  tf: TfItem[];
}
