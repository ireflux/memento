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

/**
 * 模板画廊预览用演示内容：填入可读的示例文案，
 * 让宾客在制作前看到接近成品的真实效果。
 */
export function buildDemoContent(template: TemplateDef): InvitationContent {
  const pages: Block[] = template.defaultPages.map((p) =>
    structuredClone(p),
  );
  if (template.scene === "wedding") {
    return {
      info: {
        groomName: "陆时",
        brideName: "林晚",
        eventTime: defaultEventTime(),
        venueName: "临江宴·宴会厅",
        venueAddress: "杭州市西湖区江锦路 88 号",
        lat: 30.2489,
        lng: 120.1183,
        story:
          "我们在大学的图书馆相识，他借走了我正在读的那本书，\n还回来时夹了一张写着电话号码的便签。\n从那一页到这一页，我们走了七年。",
        musicId: undefined,
      },
      pages,
    };
  }
  return {
    info: {
      celebrantName: "小满",
      eventTime: defaultEventTime(),
      venueName: "山丘咖啡馆",
      venueAddress: "杭州市西湖区文二路 168 号",
      lat: 30.2791,
      lng: 120.1214,
      wish: "又长大一岁啦！蛋糕和快乐都已备好，就等你来。",
      musicId: undefined,
    },
    pages,
  };
}
