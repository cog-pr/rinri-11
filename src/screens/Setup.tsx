import { useState } from "preact/hooks";
import { LECTURES, LECTURE_IDS, type LectureId } from "../data";
import { allClozeQuestions, allTfQuestions, type ClozeFormat } from "../lib/questions";
import { href, navigate } from "../lib/router";
import { getPrefs, savePrefs } from "../lib/storage";
import { TopBar } from "../components/ui";

type SetupMode = "cloze" | "tf" | "mock";

const META: Record<SetupMode, { title: string; desc: string }> = {
  cloze: { title: "穴埋めクイズ", desc: "配布資料の赤字部分を答えます。ほかの空欄は答えを表示した状態で出題されます。" },
  tf: { title: "○×問題", desc: "文が適切か判定します。×の文は修正文と解説で確認できます。" },
  mock: { title: "模擬テスト", desc: "穴埋めと○×を 6：4 の割合でミックスして出題します。" },
};

const COUNTS = [10, 20, 30, 0];

export function Setup({ mode }: { mode: SetupMode }) {
  const prefs = getPrefs();
  const [lectures, setLectures] = useState<LectureId[]>(prefs.lectures.length ? prefs.lectures : [...LECTURE_IDS]);
  const [format, setFormat] = useState<ClozeFormat>(prefs.format);
  const [count, setCount] = useState<number>(prefs.count);

  const available =
    mode === "cloze"
      ? allClozeQuestions(lectures).length
      : mode === "tf"
        ? allTfQuestions(lectures).length
        : allClozeQuestions(lectures).length + allTfQuestions(lectures).length;

  const toggleLecture = (id: LectureId) =>
    setLectures((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : LECTURE_IDS.filter((x) => x === id || prev.includes(x)),
    );
  const allSelected = lectures.length === LECTURE_IDS.length;

  const start = () => {
    savePrefs({ lectures, format, count });
    navigate("/play", { mode, l: lectures.join(","), n: count, f: mode === "tf" ? undefined : format });
  };

  const meta = META[mode];

  return (
    <div class="page has-bottom-bar">
      <TopBar backHref={href("/")} backLabel="ホームへ" title={meta.title} />
      <main class="narrow">
        <h1 class="page-title">{meta.title}</h1>
        <p class="lead">{meta.desc}</p>

        <fieldset class="field">
          <legend class="field-label">
            出題範囲
            <button
              type="button"
              class="text-btn"
              onClick={() => setLectures(allSelected ? [] : [...LECTURE_IDS])}
            >
              {allSelected ? "すべて解除" : "すべて選択"}
            </button>
          </legend>
          <div class="chip-grid">
            {LECTURES.map((l) => {
              const on = lectures.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  class={`chip ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggleLecture(l.id)}
                >
                  <span class="chip-no">第{l.no}回</span>
                  <span class="chip-title">{l.title}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {mode !== "tf" ? (
          <fieldset class="field">
            <legend class="field-label">穴埋めの解答形式</legend>
            <div class="segmented" role="radiogroup">
              {(
                [
                  ["choice", "4択", "選択肢から選ぶ"],
                  ["input", "記述", "答えを入力する"],
                ] as const
              ).map(([value, label, sub]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={format === value}
                  class={`segment ${format === value ? "is-on" : ""}`}
                  onClick={() => setFormat(value)}
                >
                  <span>{label}</span>
                  <small>{sub}</small>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset class="field">
          <legend class="field-label">
            問題数 <small class="field-note">（対象 {available}問）</small>
          </legend>
          <div class="segmented" role="radiogroup">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={count === n}
                class={`segment ${count === n ? "is-on" : ""}`}
                onClick={() => setCount(n)}
              >
                <span>{n === 0 ? "すべて" : `${n}問`}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </main>

      <div class="bottom-bar">
        <div class="bottom-bar-inner">
          <button type="button" class="btn btn-primary btn-block" disabled={!lectures.length} onClick={start}>
            {lectures.length ? `スタート（${count === 0 ? available : Math.min(count, available)}問）` : "範囲を選んでください"}
          </button>
        </div>
      </div>
    </div>
  );
}
