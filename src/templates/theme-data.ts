import type { Block } from "@/lib/validation/schemas";
import type { TemplateDef } from "./types";
import { SANS_CN, SERIF_CN } from "./types";

function weddingFlipPages(): Block[] {
  return [
    { type: "cover", subtitle: "WE ARE GETTING MARRIED" },
    { type: "countdown", label: "距离婚礼还有" },
    { type: "gallery", images: [] },
    { type: "story", heading: "我们的故事", body: "在这里写下你们的故事…" },
    { type: "map" },
    { type: "rsvp-form", note: "诚邀您出席，请告知我们您是否能来" },
    { type: "blessing-wall", title: "祝福墙" },
  ];
}

function weddingLongPages(): Block[] {
  return [
    { type: "cover", subtitle: "INVITATION" },
    { type: "gallery", images: [] },
    { type: "countdown", label: "倒计时" },
    { type: "map" },
    { type: "rsvp-form", note: "请回复是否出席" },
    { type: "blessing-wall", title: "留下祝福" },
  ];
}

const weddingPosterPages: Block[] = [
  { type: "cover", subtitle: "SAVE THE DATE" },
  { type: "map" },
  { type: "rsvp-form" },
];

function birthdayFlipPages(): Block[] {
  return [
    { type: "cover", subtitle: "HAPPY BIRTHDAY TO ME" },
    { type: "gallery", images: [] },
    { type: "countdown", label: "距离派对还有" },
    { type: "text", heading: "写给你", body: "在这里写下想对大家说的话…" },
    { type: "map" },
    { type: "rsvp-form", note: "来吃蛋糕吗？告诉我你来不来" },
    { type: "blessing-wall", title: "许愿池" },
  ];
}

function birthdayLongPages(): Block[] {
  return [
    { type: "cover", subtitle: "PARTY TIME" },
    { type: "gallery", images: [] },
    { type: "text", heading: "关于这场派对", body: "派对怎么玩，写在这里…" },
    { type: "map" },
    { type: "rsvp-form" },
    { type: "blessing-wall", title: "送上一句祝福" },
  ];
}

export const weddingVermilion: TemplateDef = {
  id: "wedding-vermilion",
  scene: "wedding",
  layout: "flip",
  name: "囍·朱砂",
  tagline: "中式红金，喜气庄重",
  styleTags: ["中式", "红金", "翻页"],
  theme: {
    bg: "#8f1f1f",
    bgGradient:
      "radial-gradient(120% 90% at 50% 0%, #b32727 0%, #8f1f1f 55%, #6d1414 100%)",
    surface: "rgba(255,244,230,0.08)",
    primary: "#f7d794",
    primarySoft: "#ffe9c2",
    text: "#fdf3e3",
    mutedText: "rgba(253,243,227,0.72)",
    buttonBg: "#f7d794",
    buttonText: "#6d1414",
    fontDisplay: SERIF_CN,
    fontBody: SANS_CN,
    decoration: "xi",
  },
  defaultPages: weddingFlipPages(),
};

export const weddingMist: TemplateDef = {
  id: "wedding-mist",
  scene: "wedding",
  layout: "flip",
  name: "雾屿",
  tagline: "蓝灰 ins 风，安静克制",
  styleTags: ["ins风", "清新", "翻页"],
  theme: {
    bg: "#eef2f5",
    bgGradient:
      "linear-gradient(180deg,#f7fafc 0%,#e8eef3 60%,#dde7ee 100%)",
    surface: "rgba(255,255,255,0.72)",
    primary: "#5b7a99",
    primarySoft: "#cfdeea",
    text: "#2f3d49",
    mutedText: "#7a8a97",
    buttonBg: "#5b7a99",
    buttonText: "#ffffff",
    fontDisplay: SERIF_CN,
    fontBody: SANS_CN,
    decoration: "arch",
  },
  defaultPages: weddingFlipPages(),
};

export const weddingLongline: TemplateDef = {
  id: "wedding-longline",
  scene: "wedding",
  layout: "long",
  name: "慢慢",
  tagline: "奶油色长卷，慢慢展开",
  styleTags: ["奶油", "温柔", "长图"],
  theme: {
    bg: "#faf6ef",
    bgGradient: "linear-gradient(180deg,#fdfaf4 0%,#f4ecdf 100%)",
    surface: "rgba(255,255,255,0.85)",
    primary: "#b08968",
    primarySoft: "#e9dcc8",
    text: "#4a3f33",
    mutedText: "#97887a",
    buttonBg: "#b08968",
    buttonText: "#fffaf2",
    fontDisplay: SERIF_CN,
    fontBody: SANS_CN,
    decoration: "wave",
  },
  defaultPages: weddingLongPages(),
};

export const weddingPosterVow: TemplateDef = {
  id: "wedding-poster-vow",
  scene: "wedding",
  layout: "poster",
  name: "誓言海报",
  tagline: "黑白极简，一张海报说完",
  styleTags: ["极简", "黑白", "海报"],
  theme: {
    bg: "#111111",
    bgGradient: "linear-gradient(180deg,#1a1a1a 0%,#0c0c0c 100%)",
    surface: "rgba(255,255,255,0.06)",
    primary: "#e8e2d6",
    primarySoft: "#cfc9bd",
    text: "#f2efe9",
    mutedText: "rgba(242,239,233,0.6)",
    buttonBg: "#f2efe9",
    buttonText: "#111111",
    fontDisplay: SERIF_CN,
    fontBody: SANS_CN,
    decoration: "frame",
  },
  defaultPages: weddingPosterPages,
};

export const birthdayCandle: TemplateDef = {
  id: "birthday-candle",
  scene: "birthday",
  layout: "flip",
  name: "燃烛夜",
  tagline: "深蓝星夜，为寿星点亮",
  styleTags: ["星空", "派对", "翻页"],
  theme: {
    bg: "#101b33",
    bgGradient:
      "radial-gradient(130% 90% at 50% 10%, #1d2f57 0%, #14213f 50%, #0c1526 100%)",
    surface: "rgba(255,214,140,0.09)",
    primary: "#ffd68c",
    primarySoft: "#ffe9bd",
    text: "#f4ecd9",
    mutedText: "rgba(244,236,217,0.66)",
    buttonBg: "#ffd68c",
    buttonText: "#1d2f57",
    fontDisplay: SANS_CN,
    fontBody: SANS_CN,
    decoration: "candle",
  },
  defaultPages: birthdayFlipPages(),
};

export const birthdayPeach: TemplateDef = {
  id: "birthday-peach",
  scene: "birthday",
  layout: "long",
  name: "蜜桃日",
  tagline: "粉桃气泡，甜甜的一天",
  styleTags: ["甜美", "卡通", "长图"],
  theme: {
    bg: "#fff1ee",
    bgGradient: "linear-gradient(180deg,#fff5f2 0%,#ffe4dd 100%)",
    surface: "rgba(255,255,255,0.88)",
    primary: "#e8737f",
    primarySoft: "#ffd4d8",
    text: "#59403f",
    mutedText: "#a98a89",
    buttonBg: "#e8737f",
    buttonText: "#fff8f7",
    fontDisplay: SANS_CN,
    fontBody: SANS_CN,
    decoration: "peach",
  },
  defaultPages: birthdayLongPages(),
};
