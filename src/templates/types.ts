import type { Block, SceneType } from "@/lib/validation/schemas";

export type DecorationKind =
  | "xi"
  | "arch"
  | "wave"
  | "frame"
  | "candle"
  | "peach";

export const SERIF_CN =
  '"Noto Serif SC","Songti SC","STSong","SimSun",serif';
export const SANS_CN =
  'system-ui,-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

export interface ThemeTokens {
  bg: string;
  bgGradient: string;
  surface: string;
  primary: string;
  primarySoft: string;
  text: string;
  mutedText: string;
  buttonBg: string;
  buttonText: string;
  fontDisplay: string;
  fontBody: string;
  decoration: DecorationKind;
}

export interface TemplateDef {
  id: string;
  scene: SceneType;
  layout: "flip" | "long" | "poster";
  name: string;
  tagline: string;
  styleTags: string[];
  theme: ThemeTokens;
  defaultPages: Block[];
}
