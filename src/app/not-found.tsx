import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-5xl">💌</div>
      <div>
        <h1 className="mb-2 text-xl tracking-widest">这封柬可能已失效</h1>
        <p className="text-sm text-neutral-500">
          链接不存在或已被主人删除
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-[#8f1f1f] px-8 py-3 text-sm text-[#fdf3e3]"
      >
        去制作一张请柬
      </Link>
    </div>
  );
}
