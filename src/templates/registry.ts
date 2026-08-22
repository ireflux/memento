import type { SceneType } from "@/lib/validation/schemas";
import type { InvitationContent } from "@/lib/validation/schemas";
import type { Block } from "@/lib/validation/schemas";
import type { TemplateDef } from "./types";
import {
  birthdayCandle,
  birthdayPeach,
  weddingLongline,
  weddingMist,
  weddingPosterVow,
  weddingVermilion,
} from "./theme-data";

export const TEMPLATES: TemplateDef[] = [
  weddingVermilion,
  weddingMist,
  birthdayCandle,
  birthdayPeach,
  weddingLongline,
  weddingPosterVow,
];

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesForScene(scene: SceneType): TemplateDef[] {
  return TEMPLATES.filter((t) => t.scene === scene);
}

function defaultEventTime(): string {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

export function buildInitialContent(template: TemplateDef): InvitationContent {
  const pages: Block[] = template.defaultPages.map((p) =>
    structuredClone(p),
  );
  if (template.scene === "wedding") {
    return {
      info: {
        groomName: "新郎名",
        brideName: "新娘名",
        eventTime: defaultEventTime(),
        venueName: "婚礼酒店（待填写）",
        venueAddress: "",
        story: "",
        musicId: undefined,
      },
      pages,
    };
  }
  return {
    info: {
      celebrantName: "寿星昵称",
      eventTime: defaultEventTime(),
      venueName: "派对地点（待填写）",
      venueAddress: "",
      wish: "",
      musicId: undefined,
    },
    pages,
  };
}
