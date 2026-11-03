import { useEffect, useState } from "preact/hooks";

export interface Route {
  /** "/" や "/sheet/L1" など */
  path: string;
  segments: string[];
  query: URLSearchParams;
  /** ハッシュ全体（画面の作り直し判定に使う） */
  key: string;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return {
    path,
    segments: path.split("/").filter(Boolean),
    query: new URLSearchParams(queryPart),
    key: raw,
  };
}

/** アプリ内で一度でも画面遷移したか（「戻る」で外部サイトに出ないための判定） */
let navigatedInApp = false;

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const onChange = () => {
      navigatedInApp = true;
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function href(path: string, query?: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return `#${path}${qs ? `?${qs}` : ""}`;
}

export function navigate(path: string, query?: Record<string, string | number | undefined>) {
  location.hash = href(path, query);
}

export function goBack(fallback = "/") {
  if (navigatedInApp && history.length > 1) history.back();
  else navigate(fallback);
}
