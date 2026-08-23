"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function CountdownTimer({
  target,
  label,
}: {
  target: string;
  label?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  if (now === null) {
    return (
      <div className="flex items-end justify-center gap-3 opacity-0" aria-hidden>
        <span className="text-5xl font-bold">00</span>
      </div>
    );
  }

  const diff = Date.parse(target) - now;
  if (Number.isNaN(diff)) return null;

  if (diff <= 0 && diff > -24 * 3600 * 1000) {
    return (
      <p className="text-center text-2xl tracking-widest">
        今天，就是这一天
      </p>
    );
  }
  if (diff <= 0) return null;

  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const cell = (v: number, unit: string) => (
    <div className="flex flex-col items-center">
      <span
        className="min-w-14 rounded-xl px-2 py-2 text-4xl font-bold tabular-nums"
        style={{
          background: "var(--tk-surface)",
          color: "var(--tk-primary)",
        }}
      >
        {days > 99 ? String(v) : pad(v)}
      </span>
      <span
        className="mt-1.5 text-xs tracking-widest"
        style={{ color: "var(--tk-muted)" }}
      >
        {unit}
      </span>
    </div>
  );

  return (
    <div>
      {label ? (
        <p
          className="mb-4 text-center text-sm tracking-[0.35em]"
          style={{ color: "var(--tk-muted)" }}
        >
          {label}
        </p>
      ) : null}
      <div className="flex items-start justify-center gap-2.5">
        {cell(days, "天")}
        {cell(hours, "时")}
        {cell(minutes, "分")}
        {cell(seconds, "秒")}
      </div>
    </div>
  );
}
