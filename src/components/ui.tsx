import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

/** window の keydown を購読する。ハンドラは常に最新の描画時のものが呼ばれる */
export function useKeydown(handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const listener = (e: KeyboardEvent) => ref.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}

interface TopBarProps {
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  title: ComponentChildren;
  right?: ComponentChildren;
  children?: ComponentChildren;
}

/** 画面上部に固定されるナビゲーションバー */
export function TopBar({ backHref, backLabel = "戻る", onBack, title, right, children }: TopBarProps) {
  const icon = (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
  return (
    <header class="topbar">
      <div class="topbar-inner">
        {onBack ? (
          <button type="button" class="icon-btn" aria-label={backLabel} onClick={onBack}>
            {icon}
          </button>
        ) : backHref ? (
          <a class="icon-btn" href={backHref} aria-label={backLabel}>
            {icon}
          </a>
        ) : null}
        <div class="topbar-title">{title}</div>
        {right ? <div class="topbar-right">{right}</div> : null}
      </div>
      {children}
    </header>
  );
}

export function Meter({ value, label, tone = "primary" }: { value: number; label?: string; tone?: "primary" | "ok" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      class={`meter meter-${tone}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ComponentChildren }) {
  return <kbd class="kbd">{children}</kbd>;
}
