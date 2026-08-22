# 拾光柬 Memento

把散落的时光拾进一张柬。多场景电子请柬（首发：婚礼 + 生日）——免注册制作、链接分享、宾客回执与祝福墙。

设计文档见 [docs/specs/2026-08-23-memento-design.md](docs/specs/2026-08-23-memento-design.md)。

## 技术栈

Next.js 16 (App Router / Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Drizzle ORM · Neon PostgreSQL · Zod · Framer Motion · Vercel

## 本地开发

```bash
npm install
cp .env.example .env.local   # 填入真实值（见下表）
npm run db:migrate           # 应用数据库迁移到 Neon
npm run dev                  # http://localhost:3000
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL 连接串（pooled） |
| `IMGBED_BASE_URL` | CloudFlare-ImgBed 地址，如 `https://xxx.pages.dev` |
| `IMGBED_TOKEN` | ImgBed 的 API Token（仅服务端使用） |
| `SERVER_SECRET` | 管理凭证 HMAC 签名密钥（`openssl rand -hex 32` 生成） |
| `NEXT_PUBLIC_SITE_URL` | 站点公开地址 |

## 常用脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` / `npm start` | 生产构建 / 启动 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 检查 |
| `npm test` | Vitest 单元测试 |
| `npx playwright test` | E2E（需先 `npx playwright install chromium`；黄金路径用例需要 `DATABASE_URL`，未配置时自动跳过） |
| `npm run db:generate` | 由 schema 变更生成迁移 |
| `npm run db:migrate` | 应用迁移到 `DATABASE_URL` |

## 部署（Vercel + Neon）

1. 仓库推送到 GitHub 后导入 Vercel
2. 在 Vercel 项目设置中配置上表全部环境变量（生产值）
3. Neon 中对主库执行迁移：本地 `DATABASE_URL=<neon连接串> npm run db:migrate`
4. （上线前）给 ImgBed 绑定自定义域名 —— `*.pages.dev` 在中国大陆不可达

## 已知限制（MVP）

- 管理码仅创建时展示一次，丢失无法找回
- 创建接口未做限流（自用阶段），推广前需补充
- 背景音乐曲库条目待上架音频文件（`src/lib/music-library.ts` 配置 URL 即生效）
