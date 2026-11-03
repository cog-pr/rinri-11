import type { ClozeItem } from "../data";

/**
 * hidden  : 赤シートで隠れている（タップでめくれる）
 * shown   : 答えを赤字で表示
 * target  : 出題中の空欄
 * correct : 解答後（正解）
 * wrong   : 解答後（不正解）
 */
export type BlankState = "hidden" | "shown" | "target" | "correct" | "wrong";

interface Props {
  item: ClozeItem;
  stateOf: (blank: number) => BlankState;
  onToggle?: (blank: number) => void;
}

type Segment = { type: "text"; text: string } | { type: "blank"; index: number };

function split(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(/\{(\d+)\}/g)) {
    const at = m.index ?? 0;
    if (at > last) segments.push({ type: "text", text: text.slice(last, at) });
    segments.push({ type: "blank", index: Number(m[1]) });
    last = at + m[0].length;
  }
  if (last < text.length) segments.push({ type: "text", text: text.slice(last) });
  return segments;
}

export function ClozeText({ item, stateOf, onToggle }: Props) {
  return (
    <p class="cloze">
      {split(item.text).map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.text}</span>;
        const answer = item.blanks[seg.index].answer;
        const state = stateOf(seg.index);
        if (state === "target") {
          return (
            <span key={i} class="blank is-target" aria-label="出題中の空欄">
              ？
            </span>
          );
        }
        if (onToggle && (state === "hidden" || state === "shown")) {
          // <button> だと長い答えが行をまたいで折り返せないため、インラインの span をボタンとして扱う
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              class={`blank is-${state}`}
              aria-pressed={state === "shown"}
              aria-label={state === "hidden" ? "隠れている空欄（タップで表示）" : `答え：${answer}（タップで隠す）`}
              onClick={() => onToggle(seg.index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(seg.index);
                }
              }}
            >
              <span class="blank-text">{answer}</span>
            </span>
          );
        }
        return (
          <span key={i} class={`blank is-${state}`}>
            <span class="blank-text">{answer}</span>
          </span>
        );
      })}
    </p>
  );
}
