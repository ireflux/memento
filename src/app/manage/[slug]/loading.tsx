export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f4f1ec]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#8f1f1f]/20 border-t-[#8f1f1f]" />
        <p className="text-xs tracking-[0.5em] text-neutral-400">正在统计数据…</p>
      </div>
    </div>
  );
}
