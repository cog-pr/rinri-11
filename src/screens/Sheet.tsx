import { useMemo, useState } from "preact/hooks";
import { LECTURES, type Lecture } from "../data";
import { blankIndexes } from "../lib/questions";
import { href } from "../lib/router";
import { ClozeText } from "../components/ClozeText";
import { Kbd, TopBar, useKeydown } from "../components/ui";

const keyOf = (itemId: string, blank: number) => `${itemId}:${blank}`;

export function Sheet({ lecture }: { lecture: Lecture }) {
  const order = useMemo(
    () =>
      lecture.sections.flatMap((s) =>
        s.items.flatMap((item) => blankIndexes(item.text).map((b) => ({ itemId: item.id, key: keyOf(item.id, b) }))),
      ),
    [lecture],
  );
  // 回を切り替えたときは親側で key を変えて状態ごと作り直す
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  const allShown = revealed.size >= order.length;

  const toggle = (key: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const revealNext = () => {
    const target = order.find((o) => !revealed.has(o.key));
    if (!target) return;
    setRevealed((prev) => new Set(prev).add(target.key));
    document.getElementById(`item-${target.itemId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const toggleAll = () => setRevealed(allShown ? new Set() : new Set(order.map((o) => o.key)));

  useKeydown((e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLElement && e.target.closest("button, a, input, [role=button]")) return;
    if (e.key === " " || e.key === "ArrowRight") {
      e.preventDefault();
      revealNext();
    }
  });

  return (
    <div class="page has-bottom-bar">
      <TopBar
        backHref={href("/")}
        backLabel="ホームへ"
        title="赤シート"
        right={
          <span class="counter" aria-live="polite">
            {revealed.size}/{order.length}
          </span>
        }
      >
        <nav class="tabs" aria-label="回の切り替え">
          {LECTURES.map((l) => (
            <a
              key={l.id}
              class={`tab ${l.id === lecture.id ? "is-active" : ""}`}
              href={href(`/sheet/${l.id}`)}
              aria-current={l.id === lecture.id ? "page" : undefined}
            >
              第{l.no}回
            </a>
          ))}
        </nav>
      </TopBar>

      <main class="narrow">
        <div class="sheet-head">
          <p class="eyebrow">第{lecture.no}回</p>
          <h1 class="page-title">{lecture.title}</h1>
          <p class="hint">
            赤い帯をタップすると答えが表示されます。
            <span class="only-pointer">
              {" "}
              <Kbd>Space</Kbd> で次の空欄をめくれます。
            </span>
          </p>
        </div>

        {lecture.sections.map((s) => (
          <section key={s.heading} class="sheet-section">
            <h2 class="sheet-heading">{s.heading}</h2>
            {s.items.map((item) => (
              <div key={item.id} id={`item-${item.id}`} class="sheet-item">
                <ClozeText
                  item={item}
                  stateOf={(b) => (revealed.has(keyOf(item.id, b)) ? "shown" : "hidden")}
                  onToggle={(b) => toggle(keyOf(item.id, b))}
                />
              </div>
            ))}
          </section>
        ))}

        <div class="sheet-next">
          <a class="btn btn-secondary" href={href("/play", { mode: "cloze", l: lecture.id, f: "choice", n: 0 })}>
            この回を4択で解く
          </a>
          <a class="btn btn-secondary" href={href("/play", { mode: "cloze", l: lecture.id, f: "input", n: 0 })}>
            この回を記述で解く
          </a>
        </div>
      </main>

      <div class="bottom-bar">
        <div class="bottom-bar-inner">
          <button type="button" class="btn btn-ghost" onClick={toggleAll}>
            {allShown ? "すべて隠す" : "すべて表示"}
          </button>
          <button type="button" class="btn btn-primary" onClick={revealNext} disabled={allShown}>
            次をめくる
          </button>
        </div>
      </div>
    </div>
  );
}
