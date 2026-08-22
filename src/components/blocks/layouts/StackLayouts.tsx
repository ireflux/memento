import type { ReactNode } from "react";
import { Reveal } from "../Reveal";

export function LongLayout({ pages }: { pages: ReactNode[] }) {
  return (
    <div className="mx-auto max-w-md space-y-16 px-5 pb-24 pt-12">
      {pages.map((page, i) => (
        <Reveal key={i}>{page}</Reveal>
      ))}
    </div>
  );
}

export function PosterLayout({ pages }: { pages: ReactNode[] }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-12 px-6 py-16">
      {pages}
    </div>
  );
}
