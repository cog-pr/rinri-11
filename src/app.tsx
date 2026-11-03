import { LECTURE_IDS, LECTURES, getLecture, isLectureId, type LectureId } from "./data";
import type { ClozeFormat, QuizConfig, QuizMode } from "./lib/questions";

import { href, useRoute } from "./lib/router";
import { Home } from "./screens/Home";
import { LectureScreen } from "./screens/LectureScreen";
import { Play } from "./screens/Play";
import { Setup } from "./screens/Setup";
import { Sheet } from "./screens/Sheet";

const MODES: QuizMode[] = ["cloze", "tf", "mock", "weak"];

function parseConfig(query: URLSearchParams): QuizConfig {
  const mode = (MODES as string[]).includes(query.get("mode") ?? "") ? (query.get("mode") as QuizMode) : "cloze";
  const requested = (query.get("l") ?? "").split(",").filter(isLectureId);
  const lectures: LectureId[] = requested.length ? LECTURE_IDS.filter((id) => requested.includes(id)) : [...LECTURE_IDS];
  const n = Number.parseInt(query.get("n") ?? "0", 10);
  const format: ClozeFormat = query.get("f") === "input" ? "input" : "choice";
  return { mode, lectures, count: Number.isFinite(n) && n > 0 ? n : 0, format };
}

function scopeLabel(lectures: LectureId[]) {
  if (lectures.length === LECTURE_IDS.length) return "全範囲";
  const nos = LECTURES.filter((l) => lectures.includes(l.id)).map((l) => l.no);
  return `第${nos.join("・")}回`;
}

function sessionLabel(config: QuizConfig) {
  const parts = [scopeLabel(config.lectures)];
  if (config.mode !== "tf") parts.push(config.format === "input" ? "記述" : "4択");
  return parts.join(" ・ ");
}

function NotFound() {
  return (
    <div class="page">
      <main class="narrow empty">
        <h1 class="page-title">ページが見つかりません</h1>
        <a class="btn btn-primary" href={href("/")}>
          ホームへ
        </a>
      </main>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const [screen, param] = route.segments;

  switch (screen) {
    case undefined:
      return <Home />;
    case "lecture": {
      const lecture = getLecture(param ?? "");
      return lecture ? <LectureScreen key={lecture.id} lecture={lecture} /> : <NotFound />;
    }
    case "sheet": {
      const lecture = getLecture(param ?? "");
      return lecture ? <Sheet key={lecture.id} lecture={lecture} /> : <NotFound />;
    }
    case "setup":
      return param === "cloze" || param === "tf" || param === "mock" ? <Setup key={param} mode={param} /> : <NotFound />;
    case "play": {
      const config = parseConfig(route.query);
      return <Play key={route.key} config={config} label={sessionLabel(config)} />;
    }
    default:
      return <NotFound />;
  }
}
