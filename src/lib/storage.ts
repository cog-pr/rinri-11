import { useEffect, useState } from "preact/hooks";
import { LECTURE_IDS, type LectureId } from "../data";
import type { ClozeFormat, QuizMode } from "./questions";

const KEY = "rinri11:v1";

/** 問題ごとの成績 */
export interface QuestionStat {
  /** 正解回数 */
  c: number;
  /** 不正解回数 */
  w: number;
  /** 直近の結果 1=正解 0=不正解 */
  last: 0 | 1;
  /** 最終解答日時 (epoch ms) */
  t: number;
}

export interface SessionLog {
  mode: QuizMode;
  label: string;
  correct: number;
  total: number;
  at: number;
}

export interface Prefs {
  lectures: LectureId[];
  count: number;
  format: ClozeFormat;
}

interface State {
  stats: Record<string, QuestionStat>;
  history: SessionLog[];
  prefs: Prefs;
}

const DEFAULT_PREFS: Prefs = { lectures: [...LECTURE_IDS], count: 20, format: "choice" };

function load(): State {
  const empty: State = { stats: {}, history: [], prefs: { ...DEFAULT_PREFS } };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      stats: parsed.stats ?? {},
      history: parsed.history ?? [],
      prefs: { ...DEFAULT_PREFS, ...parsed.prefs },
    };
  } catch {
    return empty;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // プライベートブラウズ等で保存できなくても学習自体は続けられるようにする
  }
  listeners.forEach((fn) => fn());
}

export function recordAnswer(id: string, correct: boolean) {
  const prev = state.stats[id] ?? { c: 0, w: 0, last: 0, t: 0 };
  const stat: QuestionStat = {
    c: prev.c + (correct ? 1 : 0),
    w: prev.w + (correct ? 0 : 1),
    last: correct ? 1 : 0,
    t: Date.now(),
  };
  commit({ ...state, stats: { ...state.stats, [id]: stat } });
}

export function logSession(log: SessionLog) {
  commit({ ...state, history: [log, ...state.history].slice(0, 20) });
}

export function savePrefs(prefs: Partial<Prefs>) {
  commit({ ...state, prefs: { ...state.prefs, ...prefs } });
}

export function resetProgress() {
  commit({ ...state, stats: {}, history: [] });
}

export function getStat(id: string): QuestionStat | undefined {
  return state.stats[id];
}

/** 直近で間違えた問題を「苦手」とみなす（次に正解すると外れる） */
export function isWeak(id: string): boolean {
  return state.stats[id]?.last === 0;
}

export function isMastered(id: string): boolean {
  return state.stats[id]?.last === 1;
}

export function getPrefs(): Prefs {
  return state.prefs;
}

export function getHistory(): SessionLog[] {
  return state.history;
}

/** 保存データが変わったら再描画する */
export function useStore(): State {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}
