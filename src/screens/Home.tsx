import { LECTURES, LECTURE_IDS } from "../data";
import { progressOf } from "../lib/progress";
import { MODE_NAME } from "../lib/questions";
import { href } from "../lib/router";
import { getHistory, getPrefs, resetProgress, useStore } from "../lib/storage";
import { Meter } from "../components/ui";

function formatDate(ms: number) {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function Home() {
  useStore();
  const all = progressOf(LECTURE_IDS);
  const history = getHistory().slice(0, 5);
  const prefs = getPrefs();

  const onReset = () => {
    if (window.confirm("学習記録（正誤の履歴・苦手リスト・最近の結果）をすべて消去します。よろしいですか？")) {
      resetProgress();
    }
  };

  return (
    <div class="page">
      <header class="app-header">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">
            倫
          </span>
          <div>
            <h1 class="brand-title">技術者倫理 試験対策</h1>
            <p class="brand-sub">第1〜6回の配布資料・赤字から出題</p>
          </div>
        </div>
      </header>

      <main class="home-grid">
        <div class="home-main">
          <section class="home-modes" aria-labelledby="modes-title">
            <h2 id="modes-title" class="section-title">
              学習モード
            </h2>
            <a class="mock-cta" href={href("/setup/mock")}>
              <span class="mock-cta-body">
                <span class="mock-cta-label">本番形式</span>
                <span class="mock-cta-title">模擬テスト</span>
                <span class="mock-cta-desc">穴埋めと○×を全範囲からミックス</span>
              </span>
              <span class="mock-cta-arrow" aria-hidden="true">
                →
              </span>
            </a>
            <div class="mode-grid">
              <a class="mode-card" href={href("/sheet/L1")}>
                <span class="mode-icon tone-sheet" aria-hidden="true">
                  赤
                </span>
                <span class="mode-title">赤シート</span>
                <span class="mode-desc">資料の流れのまま赤字を隠して確認</span>
              </a>
              <a class="mode-card" href={href("/setup/cloze")}>
                <span class="mode-icon tone-cloze" aria-hidden="true">
                  穴
                </span>
                <span class="mode-title">穴埋めクイズ</span>
                <span class="mode-desc">赤字を4択か記述で答える（{all.clozeTotal}問）</span>
              </a>
              <a class="mode-card" href={href("/setup/tf")}>
                <span class="mode-icon tone-tf" aria-hidden="true">
                  ○×
                </span>
                <span class="mode-title">○×問題</span>
                <span class="mode-desc">正誤を判定し修正文を確認（{all.tfTotal}問）</span>
              </a>
              {all.weak > 0 ? (
                <a class="mode-card" href={href("/play", { mode: "weak", l: LECTURE_IDS.join(","), f: prefs.format })}>
                  <span class="mode-icon tone-weak" aria-hidden="true">
                    苦
                  </span>
                  <span class="mode-title">苦手復習</span>
                  <span class="mode-desc">直近で間違えた{all.weak}問だけを解き直す</span>
                </a>
              ) : (
                <div class="mode-card is-disabled" aria-disabled="true">
                  <span class="mode-icon tone-weak" aria-hidden="true">
                    苦
                  </span>
                  <span class="mode-title">苦手復習</span>
                  <span class="mode-desc">間違えた問題がここにたまります</span>
                </div>
              )}
            </div>
          </section>

          <section class="home-lectures" aria-labelledby="lectures-title">
            <h2 id="lectures-title" class="section-title">
              回ごとに学習
            </h2>
            <ul class="lecture-list">
              {LECTURES.map((l) => {
                const p = progressOf([l.id]);
                return (
                  <li key={l.id}>
                    <a class="lecture-row" href={href(`/lecture/${l.id}`)}>
                      <span class="lecture-no">第{l.no}回</span>
                      <span class="lecture-body">
                        <span class="lecture-title">{l.title}</span>
                        <span class="lecture-meta">
                          穴埋め{p.clozeTotal}・○×{p.tfTotal}
                          {p.weak > 0 ? <span class="weak-badge">苦手 {p.weak}</span> : null}
                        </span>
                        <Meter value={p.ratio} label={`第${l.no}回の習得率`} tone="ok" />
                      </span>
                      <span class="lecture-pct">{Math.round(p.ratio * 100)}%</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside class="home-aside">
          <section class="card home-progress" aria-labelledby="progress-title">
            <h2 id="progress-title" class="card-title">
              全体の習得状況
            </h2>
            <div class="progress-figure">
              <span class="progress-pct">{Math.round(all.ratio * 100)}</span>
              <span class="progress-unit">%</span>
            </div>
            <Meter value={all.ratio} label="全体の習得率" tone="ok" />
            <dl class="stat-row">
              <div>
                <dt>習得</dt>
                <dd>
                  {all.mastered}
                  <small>/{all.total}</small>
                </dd>
              </div>
              <div>
                <dt>苦手</dt>
                <dd class={all.weak ? "is-weak" : ""}>{all.weak}</dd>
              </div>
              <div>
                <dt>未回答</dt>
                <dd>{all.total - all.mastered - all.weak}</dd>
              </div>
            </dl>
            <p class="hint">直近の解答が正解の問題を「習得」として数えます。</p>
          </section>

          <section class="card home-recent" aria-labelledby="recent-title">
            <h2 id="recent-title" class="card-title">
              最近の結果
            </h2>
            {history.length ? (
              <ul class="recent-list">
                {history.map((h) => (
                  <li key={h.at}>
                    <span class="recent-mode">{MODE_NAME[h.mode]}</span>
                    <span class="recent-label">{h.label}</span>
                    <span class="recent-score">
                      {h.correct}/{h.total}
                      <small>{Math.round((h.correct / h.total) * 100)}%</small>
                    </span>
                    <span class="recent-date">{formatDate(h.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p class="hint">まだ記録がありません。クイズを最後まで解くと表示されます。</p>
            )}
            <button type="button" class="text-btn danger" onClick={onReset}>
              学習記録をリセット
            </button>
          </section>
        </aside>
      </main>
    </div>
  );
}
