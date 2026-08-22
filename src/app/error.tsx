"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-5xl">🕯️</div>
      <div>
        <h1 className="mb-2 text-xl tracking-widest">烛光晃了一下</h1>
        <p className="text-sm text-neutral-500">
          服务暂时不可用，请稍后重试
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-[#8f1f1f] px-8 py-3 text-sm text-[#fdf3e3]"
      >
        再试一次
      </button>
    </div>
  );
}
