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
| `npm test` | Vitest 单元测试（集成用例无 `DATABASE_URL` 时自动跳过） |
| `npm run test:integration` | Server Actions 集成测试（会写库，请指向 Neon 分支库） |
| `npx playwright test` | E2E（需先 `npx playwright install chromium`；黄金路径用例需要 `DATABASE_URL`，未配置时自动跳过） |
| `npm run db:generate` | 由 schema 变更生成迁移 |
| `npm run db:migrate` | 应用迁移到 `DATABASE_URL` |

## 部署（Vercel + Neon）

1. 仓库推送到 GitHub 后导入 Vercel
2. 在 Vercel 项目设置中配置上表全部环境变量（生产值）
3. Neon 中对主库执行迁移：本地 `DATABASE_URL=<neon连接串> npm run db:migrate`
4. （上线前）给 ImgBed 绑定自定义域名 —— `*.pages.dev` 在中国大陆不可达

> 迁移必须先于代码发布：`code_attempts` 在 `0004` 中新增了 `ip` 列并改为
> `(slug, ip)` 复合主键，未应用迁移时管理码验证会直接报错。

## 已知限制（MVP）

- 管理码仅创建时展示一次，丢失无法找回（同一 slug + IP 连错 5 次锁定 15 分钟）
- 图片配额随「保存内容时移除照片」自动释放；但 ImgBed 没有公开的删除 API，**物理文件仍会残留在服务端**，清理任务待建
- 进程内限流为单实例近似有效（创建 5 次/小时/IP、验证管理码 60 次/小时/IP、浏览 10 次/分钟、回执与祝福 20 次/小时），推广前替换为共享存储
- 背景音乐曲库条目待上架音频文件：把 mp3 上传到 ImgBed 后，将 URL 填入 `src/lib/music-library.ts` 对应条目即生效；未上架曲目不会出现在宾客端
- 上传的图片在登记数据库失败时可能产生 ImgBed 孤儿文件（会记录日志；下次保存内容时未被引用的登记会被回收，物理文件仍残留）
- ⚠️ **上线阻断项：媒体域名**。`.env.example` 与曲库当前都指向 `*.pages.dev`，该域名在中国大陆不可达 —— 需给 ImgBed 绑定自定义域名并实测微信内加载，否则图片裂开、音乐无声
- 尚不支持删除请柬（三张子表是逻辑外键，删除时需在事务中显式清理）
