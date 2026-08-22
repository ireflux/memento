import type { DecorationKind } from "@/templates/types";

export function Decoration({
  kind,
  className,
}: {
  kind: DecorationKind;
  className?: string;
}) {
  switch (kind) {
    case "xi":
      return (
        <svg viewBox="0 0 120 120" className={className} aria-hidden>
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M60 14v92" />
            <path d="M28 30c22 8 42 8 64 0M28 90c22-8 42-8 64 0" />
            <path d="M34 46c18 6 34 6 52 0M34 74c18-6 34-6 52 0" />
            <circle cx="60" cy="10" r="4" />
          </g>
        </svg>
      );
    case "arch":
      return (
        <svg viewBox="0 0 200 120" className={className} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 118V70a80 80 0 0 1 160 0v48" />
            <path d="M40 118V72a60 60 0 0 1 120 0v46" opacity=".5" />
            <circle cx="100" cy="26" r="5" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
    case "wave":
      return (
        <svg viewBox="0 0 240 60" className={className} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M0 30c20-16 40-16 60 0s40 16 60 0 40-16 60 0 40 16 60 0" />
            <path d="M0 44c20-12 40-12 60 0s40 12 60 0 40-12 60 0 40 12 60 0" opacity=".45" />
          </g>
        </svg>
      );
    case "frame":
      return (
        <svg viewBox="0 0 160 160" className={className} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="8" y="8" width="144" height="144" />
            <rect x="16" y="16" width="128" height="128" opacity=".4" />
          </g>
        </svg>
      );
    case "candle":
      return (
        <svg viewBox="0 0 60 140" className={className} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="24" y="50" width="12" height="70" rx="4" />
            <path d="M30 46c-7-9-2-16 0-24 2 8 7 15 0 24z" fill="currentColor" />
            <path d="M30 128v6" strokeLinecap="round" />
          </g>
        </svg>
      );
    case "peach":
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M50 88C26 82 14 62 22 44c7-16 28-18 38-6 4-14 24-14 31 0 9 18-4 40-41 50z" />
            <path d="M50 38c-2-10 2-18 10-22" strokeLinecap="round" />
            <path d="M60 16c8-2 14 0 18 6-8 2-14 0-18-6z" fill="currentColor" />
          </g>
        </svg>
      );
  }
}
