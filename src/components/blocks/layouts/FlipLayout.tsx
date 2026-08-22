"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function FlipLayout({ pages }: { pages: ReactNode[] }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = (next: number) => {
    if (next < 0 || next >= pages.length) return;
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(idx + 1);
      if (e.key === "ArrowLeft") go(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (pages.length === 0) return null;

  return (
    <div
      className="relative h-dvh overflow-hidden"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touch.current.x;
        const dy = t.clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          go(dx < 0 ? idx + 1 : idx - 1);
        }
      }}
    >
      <AnimatePresence custom={dir} mode="popLayout" initial={false}>
        <motion.div
          key={idx}
          custom={dir}
          initial={{ opacity: 0, x: 56 * dir }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -56 * dir }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center px-6 py-14"
        >
          <div className="max-h-full w-full max-w-md overflow-y-auto">
            {pages[idx]}
          </div>
        </motion.div>
      </AnimatePresence>

      {idx > 0 ? (
        <button
          type="button"
          aria-label="上一页"
          onClick={() => go(idx - 1)}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 p-3 text-xl opacity-50"
        >
          ‹
        </button>
      ) : null}
      {idx < pages.length - 1 ? (
        <button
          type="button"
          aria-label="下一页"
          onClick={() => go(idx + 1)}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 animate-bounce p-3 text-xl opacity-60"
        >
          ›
        </button>
      ) : null}

      {pages.length > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`第 ${i + 1} 页`}
              onClick={() => go(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 20 : 6,
                background:
                  i === idx
                    ? "var(--tk-primary)"
                    : "var(--tk-muted)",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
