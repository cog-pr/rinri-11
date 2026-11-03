import type { Lecture } from "../data";
import { blankIndexes } from "../lib/questions";
import { progressOf } from "../lib/progress";
import { href } from "../lib/router";
import { useStore } from "../lib/storage";
import { Meter, TopBar } from "../components/ui";

export function LectureScreen({ lecture }: { lecture: Lecture }) {
  useStore();
  const p = progressOf([lecture.id]);
  const l = lecture.id;

  return (
    <div class="page">
      <TopBar backHref={href("/")} backLabel="ホームへ" title={`第${lecture.no}回`} />
      <main class="narrow">
        <div class="lecture-hero">
          <p class="eyebrow">第{lecture.no}回</p>
          <h1 class="page-title">{lecture.title}</h1>
          <div class="lecture-hero-meter">
            <Meter value={p.ratio} label="習得率" tone="ok" />
            <span>
              習得 {p.mastered}/{p.total}
              {p.weak > 0 ? <span class="weak-badge">苦手 {p.weak}</span> : null}
            </span>
          </div>
        </div>

        <div class="action-list">
          <a class="action-item" href={href(`/sheet/${l}`)}>
            <span class="mode-icon tone-sheet" aria-hidden="true">
              赤
            </span>
            <span class="action-body">
              <span class="action-title">赤シートで確認</span>
              <span class="action-desc">資料の文章のまま、赤字をタップでめくる</span>
            </span>
          </a>
          <a class="action-item" href={href("/play", { mode: "cloze", l, f: "choice", n: 0 })}>
            <span class="mode-icon tone-cloze" aria-hidden="true">
              4
            </span>
            <span class="action-body">
              <span class="action-title">穴埋め（4択）</span>
              <span class="action-desc">{p.clozeTotal}問をすべて出題</span>
            </span>
          </a>
          <a class="action-item" href={href("/play", { mode: "cloze", l, f: "input", n: 0 })}>
            <span class="mode-icon tone-cloze" aria-hidden="true">
              記
            </span>
            <span class="action-body">
              <span class="action-title">穴埋め（記述）</span>
              <span class="action-desc">答えを入力。本番の筆記に近い形式</span>
            </span>
          </a>
          <a class="action-item" href={href("/play", { mode: "tf", l, n: 0 })}>
            <span class="mode-icon tone-tf" aria-hidden="true">
              ○×
            </span>
            <span class="action-body">
              <span class="action-title">○×問題</span>
              <span class="action-desc">{p.tfTotal}問（配布資料の問題を含む）</span>
            </span>
          </a>
          {p.weak > 0 ? (
            <a class="action-item" href={href("/play", { mode: "weak", l, f: "choice" })}>
              <span class="mode-icon tone-weak" aria-hidden="true">
                苦
              </span>
              <span class="action-body">
                <span class="action-title">苦手だけ解き直す</span>
                <span class="action-desc">直近で間違えた{p.weak}問</span>
              </span>
            </a>
          ) : null}
        </div>

        <section class="card">
          <h2 class="card-title">この回の内容</h2>
          <ol class="toc">
            {lecture.sections.map((s) => (
              <li key={s.heading}>
                <span>{s.heading}</span>
                <span class="toc-count">
                  赤字 {s.items.reduce((n, item) => n + blankIndexes(item.text).length, 0)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
