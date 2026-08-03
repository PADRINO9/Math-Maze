const { test, expect } = require("@playwright/test");

test.describe("כפלול landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/landing.html?verify=landing", { waitUntil: "domcontentloaded" });
    await page.locator('body[data-landing-ready="true"]').waitFor();
  });

  test("presents the screen-time and multiplication value proposition", async ({ page }) => {
    await expect(page).toHaveTitle(/כפלול/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("זמן מסך");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("לוח הכפל");
    await expect(page.getByRole("link", { name: "שחקו עכשיו בחינם", exact: true })).toHaveAttribute("href", /index\.html/);
    await expect(page.getByAltText("קוד QR לפתיחת המשחק כפלול")).toHaveJSProperty("complete", true);
  });

  test("keeps the page within the viewport and loads its real imagery", async ({ page }) => {
    await page.locator("#download").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const audit = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      brokenImages: Array.from(document.images)
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.getAttribute("src"))
    }));

    expect(audit.pageWidth).toBeLessThanOrEqual(audit.viewportWidth + 1);
    expect(audit.brokenImages).toEqual([]);
  });

  test("moves the flashlight reveal and advances the scroll story", async ({ page }) => {
    const hero = page.locator("#top");
    const bounds = await hero.boundingBox();
    expect(bounds).toBeTruthy();

    await page.mouse.move(bounds.x + bounds.width * 0.28, bounds.y + bounds.height * 0.42);
    await expect(hero).toHaveClass(/is-pointer-active/);

    const revealPosition = await hero.evaluate((element) => ({
      x: element.style.getPropertyValue("--reveal-x"),
      y: element.style.getPropertyValue("--reveal-y")
    }));
    expect(revealPosition.x).toMatch(/px$/);
    expect(revealPosition.y).toMatch(/px$/);

    await page.evaluate(() => window.__kaflulLanding.setJourneyStep("question"));
    await expect(page.locator('[data-screen="question"]')).toHaveClass(/is-active/);
    await expect(page.locator("[data-device-caption]")).toHaveText("פוגשים תרגיל ברגע הנכון");
  });

  test("keeps the main interactions keyboard accessible", async ({ page }) => {
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();

    const firstQuestion = page.locator(".faq-list details").first();
    await firstQuestion.scrollIntoViewIfNeeded();
    await firstQuestion.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(firstQuestion).not.toHaveAttribute("open", "");
  });
});
