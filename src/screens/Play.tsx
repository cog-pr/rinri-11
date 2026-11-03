import { useEffect, useRef, useState } from "preact/hooks";
import { LECTURES } from "../data";
import { isAcceptedAnswer } from "../lib/normalize";
import { MODE_NAME, buildQuiz, questionLecture, type Question, type QuizConfig } from "../lib/questions";
import { shuffle } from "../lib/random";
import { goBack, href } from "../lib/router";
import { isWeak, logSession, recordAnswer } from "../lib/storage";
import { ClozeText } from "../components/ClozeText";
import { Kbd, Meter, TopBar, useKeydown } from "../components/ui";

interface Answer {
  q: Question;
  correct: boolean;
  /** 選んだ／入力した解答（「わからない」は空文字） */
  given: string;
}

interface Props {
  config: QuizConfig;
  /** 範囲と形式（例: "第1・2回 ・ 4択"）。履歴に保存される */
  label: string;
}

/** 選択肢が短ければ2列に並べる */
function isShortChoices(choices: string[]) {
  return choices.every((c) => c.length <= 9);
}

function reshuffle(questions: Question[]): Question[] {
  return shuffle(questions).map((q) => (q.kind === "cloze" ? { ...q, choices: shuffle(q.choices) } : q));
}

export function Play({ config, label }: Props) {
  const [questions, setQuestions] = useState<Question[]>(() => buildQuiz(config, isWeak));
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Answer | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [done, setDone] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLElement>(null);

  const q = questions[index] as Question | undefined;
  const isInput = q?.kind === "cloze" && config.format === "input";

  const answer = (given: string, correct: boolean) => {
    if (!q || current) return;
    setCurrent({ q, given, correct });
  };

  const next = () => {
    if (!current) return;
    recordAnswer(current.q.id, current.correct);
    const all = [...answers, current];
    setAnswers(all);
    setCurrent(null);
    setInput("");
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      window.scrollTo(0, 0);
    } else {
      setDone(true);
      window.scrollTo(0, 0);
      logSession({
        mode: config.mode,
        label,
        correct: all.filter((a) => a.correct).length,
        total: all.length,
        at: Date.now(),
      });
    }
  };

  const restart = (qs: Question[]) => {
    setQuestions(qs);
    setIndex(0);
    setAnswers([]);
    setCurrent(null);
    setInput("");
    setDone(false);
    window.scrollTo(0, 0);
  };

  const quit = () => {
    if (!done && answers.length > 0 && !window.confirm("クイズを中断しますか？（ここまでの解答は記録されています）")) return;
    goBack();
  };

  // 解答したら解説が見える位置までスクロール
  useEffect(() => {
    if (current) feedbackRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current]);

  // 記述モードでは次の問題で入力欄にフォーカス
  useEffect(() => {
    if (isInput && !current) inputRef.current?.focus({ preventScroll: true });
  }, [index, isInput, current]);

  // キーボード操作（PC）
  useKeydown((e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || !q || done) return;
    // 操作可能な要素にフォーカスがあるときはその要素の標準動作に任せる
    const target = e.target as HTMLElement | null;
    if (target?.closest("input:not(:disabled), textarea, button:not(:disabled), a")) return;
    if (current) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        next();
      }
      return;
    }
    if (q.kind === "cloze" && !isInput) {
      const n = Number(e.key);
      if (n >= 1 && n <= q.choices.length) {
        const choice = q.choices[n - 1];
        answer(choice, choice === q.item.blanks[q.blank].answer);
      }
    } else if (q.kind === "tf") {
      const k = e.key.toLowerCase();
      if (k === "o" || k === "1") answer("○", q.item.answer);
      if (k === "x" || k === "2") answer("×", !q.item.answer);
    }
  });

  if (!questions.length) {
    return (
      <div class="page">
        <TopBar onBack={() => goBack()} title={MODE_NAME[config.mode]} />
        <main class="narrow empty">
          <h1 class="page-title">出題できる問題がありません</h1>
          <p class="lead">
            {config.mode === "weak"
              ? "直近で間違えた問題はありません。ほかのモードで学習を続けましょう。"
              : "出題範囲を確認してください。"}
          </p>
          <a class="btn btn-primary" href={href("/")}>
            ホームへ
          </a>
        </main>
      </div>
    );
  }

  if (done || !q) {
    return (
      <Result
        answers={answers}
        label={`${MODE_NAME[config.mode]} ・ ${label}`}
        onRetryWrong={() => restart(reshuffle(answers.filter((a) => !a.correct).map((a) => a.q)))}
        onRetry={() => restart(buildQuiz(config, isWeak))}
      />
    );
  }

  const lecture = questionLecture(q);
  const correctSoFar = answers.filter((a) => a.correct).length + (current?.correct ? 1 : 0);
  const blank = q.kind === "cloze" ? q.item.blanks[q.blank] : null;

  return (
    <div class="page has-bottom-bar">
      <TopBar
        onBack={quit}
        backLabel="中断する"
        title={
          <span class="quiz-progress-text">
            <strong>{index + 1}</strong> / {questions.length}
          </span>
        }
        right={<span class="counter is-ok">正解 {correctSoFar}</span>}
      >
        <Meter value={(index + (current ? 1 : 0)) / questions.length} label="進み具合" />
      </TopBar>

      <main class="narrow quiz">
        <div class="q-meta">
          <span class="tag">第{lecture.no}回</span>
          <span class="q-meta-text">
            {q.kind === "cloze" ? q.section : q.item.source === "handout" ? "配布資料の問題" : "資料の内容から作成"}
          </span>
        </div>

        <p class="q-prompt">{q.kind === "cloze" ? "「？」に入る語句は？" : "次の文は適切か。"}</p>

        <div class="q-card">
          {q.kind === "cloze" ? (
            <ClozeText
              item={q.item}
              stateOf={(b) => (b === q.blank ? (current ? (current.correct ? "correct" : "wrong") : "target") : "shown")}
            />
          ) : (
            <p class="tf-statement">{q.item.statement}</p>
          )}
        </div>

        {q.kind === "cloze" && !isInput ? (
          <ol class={`choices ${isShortChoices(q.choices) ? "is-grid" : ""}`}>
            {q.choices.map((c, i) => {
              const isAnswer = c === blank!.answer;
              const state = current ? (isAnswer ? "is-correct" : current.given === c ? "is-wrong" : "is-dim") : "";
              return (
                <li key={c}>
                  <button type="button" class={`choice ${state}`} disabled={!!current} onClick={() => answer(c, isAnswer)}>
                    <span class="choice-key" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span class="choice-text">{c}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}

        {q.kind === "cloze" && isInput ? (
          <div class="answer-input">
            <form
              class="answer-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) answer(input.trim(), isAcceptedAnswer(input, blank!));
              }}
            >
              <input
                ref={inputRef}
                class="text-input"
                type="text"
                value={input}
                onInput={(e) => setInput(e.currentTarget.value)}
                disabled={!!current}
                placeholder="答えを入力"
                aria-label="答えを入力"
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                enterKeyHint="done"
              />
              <button type="submit" class="btn btn-primary" disabled={!!current || !input.trim()}>
                解答
              </button>
            </form>
            {!current ? (
              <button type="button" class="text-btn" onClick={() => answer("", false)}>
                わからない（答えを見る）
              </button>
            ) : null}
          </div>
        ) : null}

        {q.kind === "tf" ? (
          <div class="tf-buttons">
            {([true, false] as const).map((value) => {
              const state = current ? (value === q.item.answer ? "is-correct" : current.given === (value ? "○" : "×") ? "is-wrong" : "is-dim") : "";
              return (
                <button
                  key={String(value)}
                  type="button"
                  class={`tf-btn ${state}`}
                  disabled={!!current}
                  onClick={() => answer(value ? "○" : "×", value === q.item.answer)}
                >
                  <span class="tf-mark">{value ? "○" : "×"}</span>
                  <span class="tf-label">{value ? "適切" : "不適切"}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {!current ? (
          <p class="only-pointer key-hint">
            {q.kind === "tf" ? (
              <>
                <Kbd>O</Kbd> 適切 ／ <Kbd>X</Kbd> 不適切
              </>
            ) : isInput ? (
              <>
                <Kbd>Enter</Kbd> で解答
              </>
            ) : (
              <>
                <Kbd>1</Kbd>〜<Kbd>4</Kbd> で選択
              </>
            )}
          </p>
        ) : null}

        {current ? (
          <section ref={feedbackRef} class={`feedback ${current.correct ? "is-ok" : "is-ng"}`} aria-live="polite">
            <p class="verdict">
              <span class="verdict-mark" aria-hidden="true">
                {current.correct ? "○" : "×"}
              </span>
              {current.correct ? "正解" : "不正解"}
            </p>
            {q.kind === "cloze" ? (
              <>
                <p class="feedback-line">
                  <span class="feedback-key">正解</span>
                  <strong class="answer-text">{blank!.answer}</strong>
                </p>
                {blank!.alt?.length ? (
                  <p class="feedback-line sub">
                    <span class="feedback-key">別表記</span>
                    {blank!.alt.join("、")}
                  </p>
                ) : null}
                {isInput && !current.correct ? (
                  <>
                    <p class="feedback-line">
                      <span class="feedback-key">あなた</span>
                      {current.given || "（未回答）"}
                    </p>
                    {current.given ? (
                      <button type="button" class="btn btn-ghost btn-small" onClick={() => setCurrent({ ...current, correct: true })}>
                        表記ゆれなので正解にする
                      </button>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <p class="feedback-line">
                  <span class="feedback-key">正解</span>
                  <strong>{q.item.answer ? "○ 適切" : "× 不適切"}</strong>
                </p>
                {q.item.correction ? (
                  <div class="correction">
                    <p class="correction-label">修正文</p>
                    <p>{q.item.correction}</p>
                  </div>
                ) : null}
                <p class="explanation">{q.item.explanation}</p>
              </>
            )}
          </section>
        ) : null}
      </main>

      {current ? (
        <div class="bottom-bar">
          <div class="bottom-bar-inner">
            <button type="button" class="btn btn-primary btn-block" onClick={next}>
              {index + 1 < questions.length ? "次へ" : "結果を見る"}
              <span class="only-pointer btn-kbd">
                <Kbd>Enter</Kbd>
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface ResultProps {
  answers: Answer[];
  label: string;
  onRetryWrong: () => void;
  onRetry: () => void;
}

function Result({ answers, label, onRetryWrong, onRetry }: ResultProps) {
  const correct = answers.filter((a) => a.correct).length;
  const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
  const wrong = answers.filter((a) => !a.correct);
  const message =
    pct >= 90 ? "ほぼ完璧です！" : pct >= 70 ? "よくできています" : pct >= 50 ? "あと一歩。間違えた問題を復習しましょう" : "赤シートで見直してから再挑戦しましょう";

  const byLecture = LECTURES.map((l) => {
    const list = answers.filter((a) => a.q.lectureId === l.id);
    return { l, total: list.length, correct: list.filter((a) => a.correct).length };
  }).filter((x) => x.total > 0);

  return (
    <div class="page">
      <TopBar backHref={href("/")} backLabel="ホームへ" title="結果" />
      <main class="narrow">
        <section class="result-hero">
          <p class="eyebrow">{label}</p>
          <p class="result-score">
            <strong>{correct}</strong>
            <span>/ {answers.length}問</span>
          </p>
          <Meter value={answers.length ? correct / answers.length : 0} label="正答率" tone="ok" />
          <p class="result-pct">
            正答率 {pct}% ・ {message}
          </p>
        </section>

        <div class="result-actions">
          {wrong.length ? (
            <button type="button" class="btn btn-primary" onClick={onRetryWrong}>
              間違えた{wrong.length}問をもう一度
            </button>
          ) : null}
          <button type="button" class={`btn ${wrong.length ? "btn-secondary" : "btn-primary"}`} onClick={onRetry}>
            同じ条件でもう一度
          </button>
          <a class="btn btn-ghost" href={href("/")}>
            ホームへ
          </a>
        </div>

        {byLecture.length > 1 ? (
          <section class="card">
            <h2 class="card-title">回ごとの正答率</h2>
            <ul class="breakdown">
              {byLecture.map(({ l, total, correct: c }) => (
                <li key={l.id}>
                  <span class="breakdown-label">第{l.no}回</span>
                  <Meter value={c / total} label={`第${l.no}回の正答率`} tone="ok" />
                  <span class="breakdown-value">
                    {c}/{total}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {wrong.length ? (
          <section>
            <h2 class="section-title">間違えた問題（{wrong.length}）</h2>
            <ol class="review-list">
              {wrong.map(({ q, given }) => {
                const lec = questionLecture(q);
                return (
                  <li key={q.id} class="review-item">
                    <div class="q-meta">
                      <span class="tag">第{lec.no}回</span>
                      <span class="q-meta-text">{q.kind === "cloze" ? q.section : "○×問題"}</span>
                    </div>
                    {q.kind === "cloze" ? (
                      <>
                        <ClozeText item={q.item} stateOf={(b) => (b === q.blank ? "wrong" : "shown")} />
                        <p class="feedback-line">
                          <span class="feedback-key">正解</span>
                          <strong class="answer-text">{q.item.blanks[q.blank].answer}</strong>
                        </p>
                        <p class="feedback-line sub">
                          <span class="feedback-key">あなた</span>
                          {given || "（未回答）"}
                        </p>
                      </>
                    ) : (
                      <>
                        <p class="tf-statement">{q.item.statement}</p>
                        <p class="feedback-line">
                          <span class="feedback-key">正解</span>
                          <strong>{q.item.answer ? "○ 適切" : "× 不適切"}</strong>
                        </p>
                        {q.item.correction ? (
                          <div class="correction">
                            <p class="correction-label">修正文</p>
                            <p>{q.item.correction}</p>
                          </div>
                        ) : null}
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ) : (
          <p class="lead">全問正解です。おつかれさまでした！</p>
        )}
      </main>
    </div>
  );
}
