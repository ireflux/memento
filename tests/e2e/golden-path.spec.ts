import { expect, test } from "@playwright/test";

const hasDb = Boolean(process.env.DATABASE_URL);

test.describe("golden path (requires DATABASE_URL)", () => {
  test.skip(() => !hasDb, "DATABASE_URL not configured");

  test("create → edit → publish → guest rsvp & blessing → manage", async ({
    page,
    context,
  }) => {
    await page.goto("/");

    const card = page.locator("text=囍·朱砂").first();
    await expect(card).toBeVisible();

    const createButton = page
      .locator("button", { hasText: "用这套制作" })
      .first();
    await createButton.click();

    const codeText = page.getByRole("dialog").locator("p.font-mono");
    await expect(codeText).toHaveText(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    const manageCode = (await codeText.textContent()) ?? "";

    await page.getByRole("button", { name: "进入编辑器" }).click();
    await expect(page).toHaveURL(/\/edit\/[A-Za-z0-9]{8}$/);

    const slug = new URL(page.url()).pathname.split("/")[2];

    const groomInput = page.locator("input").first();
    await groomInput.fill("沈星回");
    // 等待自动保存完成的明确信号，替代固定 sleep
    await expect(page.locator("text=已自动保存 ✓")).toBeVisible({
      timeout: 10_000,
    });

    const publishTab = page.locator("button", { hasText: "发布" });
    await publishTab.click();
    await page.locator("button", { hasText: "发布请柬" }).click();
    await expect(page.getByText("已发布", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    const guestPage = await context.newPage();
    await guestPage.goto(`/i/${slug}`);
    await expect(guestPage.locator("h1")).toContainText("沈星回");

    await guestPage.locator('button[aria-label="第 6 页"]').click();

    const nameInput = guestPage.getByPlaceholder("怎么称呼您");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("王小明");
    await guestPage.getByLabel("备注（选填）").fill("不吃香菜");
    await guestPage.locator("button", { hasText: "提 交 回 执" }).click();
    await expect(guestPage.locator("text=期待与您相见")).toBeVisible();

    await guestPage.locator('button[aria-label="第 7 页"]').click();
    const blessingInput = guestPage.getByPlaceholder("写下您的祝福…");
    await expect(blessingInput).toBeVisible({ timeout: 5_000 });
    await blessingInput.fill("百年好合！");
    await guestPage.getByPlaceholder("您的名字").fill("李雷");
    await guestPage.locator("button", { hasText: "送出祝福" }).click();
    await expect(guestPage.locator("text=百年好合！").first()).toBeVisible();
    await guestPage.close();

    // 管理码二次登录：无 cookie 的全新上下文应被引导到验证页并凭码通过
    const freshContext = await context.browser()?.newContext();
    if (!freshContext) throw new Error("browser unavailable");
    const freshPage = await freshContext.newPage();
    await freshPage.goto(`/manage/${slug}`);
    await expect(freshPage).toHaveURL(new RegExp(`/access/${slug}`));
    await freshPage.locator("input[placeholder='管理码']").fill(manageCode);
    await freshPage.locator("button", { hasText: "进入管理" }).click();
    await expect(freshPage).toHaveURL(new RegExp(`/manage/${slug}$`));
    await expect(freshPage.locator("text=出席回执")).toBeVisible();
    await expect(freshPage.locator("text=王小明").first()).toBeVisible();
    await expect(freshPage.locator("text=不吃香菜")).toBeVisible();
    await freshContext.close();

    await page.goto(`/manage/${slug}`);
    await expect(page.locator("text=出席回执")).toBeVisible();
    await expect(page.locator("text=王小明").first()).toBeVisible();
  });
});

test.describe("public pages without db", () => {
  test("landing renders brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=拾进一张柬")).toBeVisible();
  });

  test("unknown invitation shows friendly 404", async ({ page }) => {
    await page.goto("/i/zzzzzzzz");
    await expect(page.locator("text=这封柬可能已失效")).toBeVisible();
  });

  test("template preview renders demo content", async ({ page }) => {
    await page.goto("/preview/wedding-vermilion");
    await expect(page.locator("h1")).toContainText("陆时");
    await expect(
      page.locator("text=模板预览 · 囍·朱砂"),
    ).toBeVisible();
  });
});
