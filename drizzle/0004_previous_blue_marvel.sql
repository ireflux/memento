-- 本文件由 `drizzle-kit generate` 生成后手工修正（0004 把 (slug, ip) 引入主键，
-- drizzle-kit 目前无法处理主键变更：见下方它留下的提示）。
--
-- 修正两处：
--   1. 语句顺序 —— 生成结果先 ADD PRIMARY KEY 再 ADD COLUMN，但此时 ip 列尚不存在，会报错；
--   2. 补上旧单列主键的 DROP —— 生成器注释掉了它，不删会变成两个主键而失败。
--      旧约束名已对生产库核实（information_schema.table_constraints）：
--      迁移 0003 用的是内联列级 PRIMARY KEY，Postgres 因此命名为 code_attempts_pkey
--      （而不是表级命名约束的 code_attempts_slug_pkey）。
--
-- 顺带清空历史计数行：这些行按「每 slug 一条」的旧语义累计，
-- 迁移后无法映射到 (slug, ip)，留着只会污染新语义（全部落在 ip='unknown' 桶里）。
ALTER TABLE "code_attempts" ADD COLUMN "ip" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
DELETE FROM "code_attempts";--> statement-breakpoint
ALTER TABLE "code_attempts" DROP CONSTRAINT "code_attempts_pkey";--> statement-breakpoint
ALTER TABLE "code_attempts" ADD CONSTRAINT "code_attempts_slug_ip_pk" PRIMARY KEY("slug","ip");
