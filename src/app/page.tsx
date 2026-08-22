import Link from "next/link";
import { getTemplateUsageCounts } from "@/lib/queries";
import { TEMPLATES, templatesForScene } from "@/templates/registry";
import type { SceneType } from "@/lib/validation/schemas";
import { TemplateCard } from "@/components/gallery/TemplateCard";
import { CreateButton } from "@/components/gallery/CreateButton";

export const dynamic = "force-dynamic";

const SCENE_TABS: Array<{ key: string | null; label: string }> = [
  { key: null, label: "全部" },
  { key: "wedding", label: "婚礼邀请" },
  { key: "birthday", label: "生日派对" },
];

export default async function HomePage({
  searchParams,
}: PageProps<"/">) {
  const sp = await searchParams;
  const scene = (
    ["wedding", "birthday"] as const
  ).includes(sp.scene as SceneType)
    ? (sp.scene as SceneType)
    : null;
  const list = scene ? templatesForScene(scene) : TEMPLATES;
  const counts = await getTemplateUsageCounts();

  return (
    <main className="min-h-dvh bg-[#faf7f2]">
      <section className="relative overflow-hidden px-6 pb-16 pt-20 text-center">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8f1f1f]/5 blur-3xl" />
        <p className="mb-3 text-xs tracking-[0.6em] text-[#8f1f1f]/70">
          MEMENTO · 拾光柬
        </p>
        <h1 className="font-serif text-4xl leading-snug tracking-widest text-neutral-800">
          把散落的时光
          <br />
          拾进一张柬
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-neutral-500">
          婚礼、生日，任何值得纪念的日子。
          <br />
          三十秒制作，一条链接送出，回执与祝福自动归集。
        </p>
        <a
          href="#templates"
          className="mt-8 inline-block rounded-full bg-[#8f1f1f] px-10 py-3.5 text-sm tracking-[0.3em] text-[#fdf3e3] shadow-lg shadow-[#8f1f1f]/20"
        >
          开始制作
        </a>
      </section>

      <section id="templates" className="px-5 pb-24">
        <div className="mb-6 flex items-center justify-center gap-2">
          {SCENE_TABS.map((tab) => {
            const active =
              (tab.key ?? null) === scene;
            return (
              <Link
                key={tab.label}
                href={tab.key ? `/?scene=${tab.key}#templates` : "/#templates"}
                className={`rounded-full border px-5 py-2 text-sm transition-colors ${
                  active
                    ? "border-transparent bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
          {list.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              usageCount={counts[t.id] ?? 0}
              action={<CreateButton templateId={t.id} />}
            />
          ))}
        </div>
      </section>

      <footer className="border-t border-neutral-100 py-10 text-center text-xs text-neutral-400">
        拾光柬 Memento · 免注册制作，凭管理码管理
      </footer>
    </main>
  );
}
