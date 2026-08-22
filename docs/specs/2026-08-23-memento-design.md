# 拾光柬（Memento）— 多场景电子请柬平台 设计文档

- 日期：2026-08-23
- 状态：已定稿（设计阶段）
- 阶段：MVP（先自用，再考虑推广）

## 1. 项目概述

**拾光柬 / Memento** 是一个多场景电子请柬制作与分享平台。用户免注册创建请柬，通过短链接分享给宾客；宾客在移动端（以微信内打开为主）浏览请柬、提交出席回执（RSVP）、留下祝福留言。

- 名称寓意：「拾光」谐音「时光」，把散落的时光拾进一张柬里；英文名 Memento（留念之物）。
- 首发场景：婚礼 + 生日。架构上按通用多场景模型设计，后续可扩展满月、乔迁等。
- 对标产品：婚礼纪电子请帖（hunliji.com/theme_new）、婚贝请柬（hunbei.com）。

### 1.1 已确认的关键决策

| 维度 | 决策 |
|---|---|
| 定位 | 先自用再推广：目标是朋友/家人的真实活动能用它发出请柬 |
| 目标用户 | 中国大陆用户为主，微信内打开与转发是核心场景 |
| 账号体系 | 免注册：slug 短链 + 6 位管理码，无用户表 |
| 首发场景 | 婚礼 + 生日（架构为通用多场景模型） |
| 宾客互动 | 祝福留言 + RSVP 出席回执（礼金记账留作后续） |
| 模板视觉 | 代码生成设计：排版 + CSS 效果 + 开源插画/SVG，不依赖外部美术资源 |
| 媒体存储 | CloudFlare-ImgBed（用户自部署实例 + Telegram 存储），经 StorageProvider 适配层接入 |
| 分享方式 | MVP 仅普通链接分享（微信内可直接打开转发）；自定义分享卡片需备案域名 + 公众号 JS-SDK，列为后续演进项 |
| 部署 | Vercel + Neon PostgreSQL |

### 1.2 明确不做（MVP）

- 用户注册/登录体系
- 支付、付费模板、模板市场
- 礼金记账、请柬数据深度分析（仅做轻量浏览计数）
- 用户自传背景音乐（提供内置曲库选择）
- 微信自定义分享卡片（需备案域名 + 公众号）
- 接口限流（自用阶段接受滥用风险，推广前补齐）
- 管理码找回机制

## 2. 技术栈

```
框架        Next.js 16.3.x（App Router，Turbopack 默认构建）
前端        React 19.2 + TypeScript 5.x（strict）
样式/动画   Tailwind CSS v4 + Framer Motion
数据库      Neon PostgreSQL（@neondatabase/serverless 驱动，HTTP 协议）
ORM         Drizzle ORM + drizzle-kit（迁移）
校验        Zod（内容层唯一事实源，双端复用）
媒体存储    CloudFlare-ImgBed（StorageProvider 接口的第一个实现）
部署        Vercel（生产连 Neon 主分支）
测试        Vitest（单元/集成）+ Playwright（E2E/视觉回归，移动端视口）
```

Next.js 16 要点（新项目直接采用新范式）：

- Turbopack 为默认 bundler（dev 与 build），零配置
- `middleware.ts` 更名为 `proxy.ts`（Node.js runtime）；本项目用于 `/edit/*`、`/manage/*` 的边界拦截
- 缓存为 opt-in：请柬展示页适合用 Cache Components（`use cache`）缓存页面外壳，动态部分（计数等）流式注入
- `params` / `searchParams` 均为异步 Promise，从第一天按新写法实现
- React 19.2：View Transitions 可用于翻页转场动画

## 3. 整体架构

采用 **Next.js 全栈单体**（方案 A）。备选方案（前后端分离、Astro 静态生成）因运维负担或复杂度不适配当前规模而被否决。

```
宾客/主人浏览器（微信内置浏览器为主）
        │ HTTPS
        ▼
Vercel: Next.js 16 单体
├── 展示页 /i/[slug]          RSC + Client Components（Blocks 渲染）
├── 编辑器 /edit/[slug]       重交互 SPA 化页面（管理 Cookie 保护）
├── 后台   /manage/[slug]     数据看板/留言管理/CSV 导出
├── proxy.ts                  边界拦截（无凭证重定向）
├── Server Actions            创建/保存/发布/RSVP/留言等写操作
├── Route Handlers            /api/upload、/api/i/[slug]/view、/api/manage/[slug]/export
└── lib/
    ├── storage/              StorageProvider 接口 → ImgBed 实现（可换 R2/OSS）
    └── auth.ts               管理码 scrypt 哈希 + HMAC Cookie 签发/校验
        │
        ├──▶ Neon PostgreSQL（invitations / media_assets / rsvps / blessings）
        └──▶ CloudFlare-ImgBed（图片/音乐文件，Telegram 存储）
```

关键架构原则：

1. **编辑器与展示页共用 Blocks 组件库** —— 所见即所得，避免两套渲染实现漂移。
2. **内容与模板解耦** —— 内容是 zod 校验的数据，模板只决定「怎么渲染」，切换模板不丢内容。
3. **存储可替换** —— 业务代码只依赖 `StorageProvider` 接口；ImgBed 是个人项目 + Telegram 存储存在单点风险，未来换 R2/OSS 只改适配层。

## 4. 数据模型

核心思路：**无用户表**，`invitations` 是聚合根，管理码是唯一凭证。

```ts
// pgEnum
scene_type:  'wedding' | 'birthday'
layout:      'flip' | 'long' | 'poster'
status:      'draft' | 'published' | 'closed'
attending:   'yes' | 'no' | 'maybe'

invitations
  id             uuid pk default gen_random_uuid()
  slug           text unique not null        // 8 位 base62 随机串，防枚举（约 2×10^14 组合）
  scene_type     scene_type not null
  template_id    text not null               // 指向代码中模板注册表条目，非外键
  layout         layout not null             // 冗余自模板元数据，便于筛选
  status         status not null default 'draft'
  manage_code    text not null               // scrypt 加盐哈希，明文仅在创建响应中出现一次
  content        jsonb not null              // { info: {...}, pages: [...] }，按 scene 用 zod schema 校验
  view_count     integer not null default 0  // 轻量统计；详细分析后续再说
  created_at     timestamptz not null default now()
  updated_at     timestamptz not null default now()
  published_at   timestamptz

media_assets                       // 上传文件登记（孤儿清理/统计）
  id             uuid pk
  invitation_id  uuid fk → invitations(id) on delete cascade
  url            text not null               // ImgBed 返回的公开访问 URL
  mime           text not null
  size_bytes     integer not null
  created_at     timestamptz not null default now()

rsvps                              // 宾客回执
  id             uuid pk
  invitation_id  uuid fk → invitations(id) on delete cascade
  guest_name     text not null               // ≤20 字
  phone          text                        // 选填
  attending      attending not null
  party_size     integer not null default 1  // 出席人数合计 = sum where attending='yes'
  note           text                        // ≤100 字
  created_at     timestamptz not null default now()

blessings                          // 祝福留言
  id             uuid pk
  invitation_id  uuid fk → invitations(id) on delete cascade
  guest_name     text not null               // ≤20 字
  content        text not null               // ≤200 字
  status         'visible' | 'hidden' not null default 'visible'   // 主人可隐藏
  created_at     timestamptz not null default now()
```

### 4.1 content JSONB 结构约定

统一外形 `{ info, pages }`，`info` 字段随场景不同（zod discriminated by `scene_type`）：

- `wedding.info`：新人双方称呼、婚礼时间（精确到分钟，倒计时数据源）、酒店名、详细地址、地图坐标（lat/lng）、可选的爱情故事文案、BGM 曲目 id
- `birthday.info`：寿星昵称、派对时间、地点信息、可选寄语文案、BGM 曲目 id

`pages` 是有序块数组，每块形如 `{ type, props }`：

```
type ∈ cover | gallery | countdown | map | story | text | rsvp-form | blessing-wall
```

约束（服务端强制）：content 序列化后 ≤ 256KB；图片总数 ≤ 30 张。

### 4.2 关键决策说明

1. **模板不建表** —— 模板是代码（React 组件 + 注册表元数据），DB 只存 `template_id` 字符串。新增模板 = 提交代码，天然版本化；画廊页的「N 人使用」由 `count(*) group by template_id` 实时得出。
2. **content 用 JSONB 而非宽表** —— 多场景字段差异大（婚礼有坐标、生日没有）；zod 在读写两端做类型守卫，TS 类型由 schema 直推 UI。
3. **管理码流程** —— 创建时生成 6 位友好码（剔除 0/O/1/l/I 易混字符），明文仅在创建完成时展示一次（提示截图保存）；丢失无法找回（已知限制，见 §9）。

## 5. 模板系统设计

三层解耦：

```
┌ 内容层 Content ── 按 scene 定义的 zod schema（数据与模板无关）
├ 块层 Blocks ───── 通用组件库，每 type 一个组件；
│                   通过 CSS 变量读取模板主题（色板/字体/装饰 SVG）
└ 模板层 Templates ─ 注册表条目：
                    { id, scene, layout, name, styleTags,
                      themeTokens(色板+字体+装饰件),
                      默认 pages 编排建议, previewImage }
```

布局原型三种：

| 原型 | 体验 | 说明 |
|---|---|---|
| `flip` 翻页式 | 全屏翻页 + 背景音乐 + 转场动画 | 经典 H5 请柬体验，婚礼主力形态 |
| `long` 长图式 | 纵向滚动 + 滚动触发渐入动画 | 制作传播成本低 |
| `poster` 海报式 | 单屏极简 | 快速告知型 |

MVP 模板数量：婚礼 ×4（flip ×2 + long ×1 + poster ×1）＋ 生日 ×2（flip + long），共 6 套，全部由排版/CSS/开源插画生成。

## 6. 核心流程

### 6.1 创建（30 秒内完成）

```
模板画廊点选模板 → 立即创建草稿(Server Action)
→ 弹窗展示 slug 短链 + 管理码（仅此一次，提示保存）
→ 凭码进入编辑器
```

slug 与管理码是唯一凭证，不绑定任何身份。

### 6.2 编辑（/edit/\[slug\]，需管理 Cookie）

- 布局：左侧手机画布实时预览（直接渲染真实 Blocks 组件），右侧块列表 + 当前块的 zod 驱动表单
- 图片上传：客户端 canvas 压缩（最长边 2000px、质量 0.85，单张目标 ~500KB，规避 Vercel 请求体限制）→ `POST /api/upload` → 服务端持 Token 转发 ImgBed → 登记 `media_assets` → 回写 content
- 音乐：内置曲库选择（曲目文件预置到 ImgBed），MVP 不做用户上传
- 块排序：上移/下移按钮（拖拽排序后续迭代）
- 自动保存（防抖）+ 手动保存按钮双轨

### 6.3 发布

- 一键发布（draft → published），展示 `/i/{slug}` 短链 + 客户端生成的二维码（微信长按识别）
- 草稿状态直接访问展示页带「预览」水印角标，防止误发

### 6.4 宾客浏览与互动（/i/\[slug\]）

- 打开即计一次浏览：客户端 beacon → `POST /api/i/[slug]/view`（独立于 RSC 缓存，避免计数失真）
- flip：全屏翻页 + 音乐开关；long：滚动渐入动画；均支持触摸手势
- 尾部 RSVP 表单（姓名/是否出席/几位/手机号选填）→ Server Action → 致谢态
- 祝福墙：留言默认直接可见，主人可在后台隐藏

### 6.5 主人后台（/manage/\[slug\]）

- 数据一览：浏览数、RSVP 汇总（含「出席人数合计」，婚礼排桌刚需）、留言列表（隐藏开关）
- RSVP 名单 CSV 导出：`GET /api/manage/[slug]/export` 流式下载
- 可撤回发布（closed 状态：宾客端显示「活动已结束」页）

## 7. 安全设计

1. **管理码体系**
   - 6 位友好码，`node:crypto` scrypt 加盐哈希存储，零外部依赖
   - 验证成功签发 HMAC 签名 Cookie（httpOnly + SameSite=Lax + 7 天有效），密钥来自 `SERVER_SECRET`
   - `proxy.ts` 对 `/edit/*`、`/manage/*` 无 Cookie 重定向到验证页；但每次请求服务端仍重新验签——**边界过滤不等于安全边界**
2. **输入校验**：所有 Server Action / Route Handler 入口过 zod；执行 §4.1 的尺寸约束与宾客字段长度限制
3. **XSS**：留言纯文本渲染，全站禁用 `dangerouslySetInnerHTML`
4. **密钥管理**：`DATABASE_URL` / `IMGBED_BASE_URL` / `IMGBED_TOKEN` / `SERVER_SECRET` / `NEXT_PUBLIC_SITE_URL` 全部走环境变量，不入仓库；ImgBed Token 只存在于服务端，永不下发浏览器

## 8. 错误处理

1. **块级 ErrorBoundary（关键设计）**：展示页每个 Block 独立包裹——单个块出错只降级该块，绝不让一张坏图毁掉整场仪式
2. **图片兜底**：onError 切换模板风格占位图 + 全站懒加载
3. **上传失败**：自动重试一次 → toast 提示；本地预览保留可重传
4. **统一错误格式**：`{ error: { code, message } }`；zod 校验失败返回 400 并附字段路径
5. **全局兜底**：root `error.tsx` / `not-found.tsx` 品牌化页面；Neon 连接失败给友好提示而非白屏
6. **微信兼容**：BGM 自动播放受首次触摸手势触发；兼容 `WeixinJSBridge ready` 事件

## 9. 已知限制（记录在案）

| 限制 | 影响 | 计划 |
|---|---|---|
| ImgBed 为个人项目 + Telegram 存储 | 理论单点风险 | StorageProvider 适配层隔离；推广前评估 R2/OSS |
| `*.pages.dev` 大陆不可达 | 图片可能全部裂开 | ⚠️ 上线前必须给 ImgBed 绑定自定义域名并实测微信内加载 |
| 无限流 | 开放创建接口有滥用风险 | 推广前加 Upstash rate-limit 或 Vercel WAF |
| 管理码丢失不可找回 | 用户锁死自己的请柬 | 文档引导保存；后续加找回机制 |
| 普通链接分享无自定义卡片 | 微信转发卡片样式默认 | 后续：备案域名 + 公众号 JS-SDK |

## 10. 测试策略

| 层级 | 工具 | 覆盖范围 |
|---|---|---|
| 单元测试 | Vitest | zod schemas（两场景）、slug/管理码生成与哈希、StorageProvider（mock fetch） |
| 集成测试 | Vitest + Neon dev 分支库 | Server Actions、Route Handlers 读写路径 |
| E2E | Playwright（移动端视口） | 黄金路径：创建→编辑→发布→宾客 RSVP+留言→后台导出 |
| 视觉回归 | Playwright 截图对比 | 每个模板 × fixture 内容渲染快照，防样式回归 |
| 人工清单 | 微信真机 | 音乐手势播放、翻页手感、地图跳转、分享可达性 |

## 11. 目录结构（规划）

```
src/
├── app/
│   ├── page.tsx                  # 落地页 = 模板画廊
│   ├── i/[slug]/page.tsx         # 宾客请柬展示页
│   ├── edit/[slug]/              # 编辑器（需管理 Cookie）
│   ├── manage/[slug]/            # 主人后台
│   └── api/
│       ├── upload/route.ts       # 图片转发 ImgBed
│       ├── i/[slug]/view/route.ts
│       └── manage/[slug]/export/route.ts   # RSVP CSV 导出
├── actions/                      # Server Actions（创建/保存/发布/RSVP/留言）
├── components/blocks/            # 块组件库（编辑器与展示页共用）
├── templates/                    # 模板注册表 + 主题 tokens + 三种布局原型
├── lib/
│   ├── db/schema.ts              # Drizzle schema 与迁移
│   ├── storage/                  # StorageProvider 接口 + ImgBed 实现
│   ├── auth.ts                   # 管理码哈希/HMAC 签发校验
│   └── validation/schemas.ts     # 各场景 zod schema
└── proxy.ts                      # 路由守卫
```

## 12. 部署

- Git 仓库 → Vercel 自动部署；生产连 Neon 主分支；开发可用 Neon branching 出独立分支库
- 环境变量清单见 §7 第 4 条

## 13. 实施里程碑

1. **M1 骨架**：项目初始化（Next.js 16 + TS + Tailwind v4 + ESLint）、Drizzle schema 与迁移、Neon 连通、创建草稿/管理码流程、编辑器外壳、Vercel 首次部署
2. **M2 展示核心**：Blocks 组件库（cover/gallery/countdown/map/story/text）、flip/long 布局原型、首个婚礼模板、展示页 + 浏览计数
3. **M3 互动闭环**：上传链路、内置曲库、RSVP、祝福留言、主人后台（看板/隐藏/CSV 导出）、发布与撤回
4. **M4 模板矩阵**：补齐婚礼 ×4 ＋ 生日 ×2、poster 布局原型、模板画廊筛选上线
5. **M5 打磨上线**：转场与滚动动画细节、微信 iOS/Android 真机调优、移动端性能（懒加载/图片尺寸）、错误兜底完善
6. **M6 推广前置项**：接口限流、管理码找回、备案域名 + 公众号 JS-SDK 自定义分享卡片
