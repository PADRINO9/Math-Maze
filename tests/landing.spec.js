const { test, expect } = require("@playwright/test");

test.describe("כפלול landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/champions?capability=1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ publicAvailable: true, automaticSync: true, minimumCorrectAnswers: 1 })
      });
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: async (value) => { window.__copiedLandingUrl = value; } },
        configurable: true
      });
    });
    await page.goto("/landing.html?verify=landing", { waitUntil: "domcontentloaded" });
    await page.locator('body[data-landing-ready="true"]').waitFor();
  });

  test("presents the game without the removed steps and stage galleries", async ({ page }) => {
    await expect(page).toHaveTitle(/כפלול/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("הכפל רודף אחריכם");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("טוב שיש מבוך לברוח אליו");
    await expect(page.getByRole("link", { name: "נכנסים למשחק", exact: true })).toHaveAttribute("href", /index\.html/);

    await expect(page.locator("#how")).toHaveCount(0);
    await expect(page.getByRole("list", { name: "שלבי המשחק" })).toHaveCount(0);
    await expect(page.locator("#gameplay")).toHaveCount(0);
    await expect(page.locator(".screens-grid, .screen-card, .world-strip")).toHaveCount(0);
    await expect(page.locator("#champions").getByRole("heading", { name: /אלוף האלופים/ })).toBeVisible();
  });

  test("loads real artwork and stays within the viewport", async ({ page }) => {
    await page.locator("#download").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const audit = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      brokenImages: Array.from(document.images)
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.getAttribute("src")),
      generatedHeroLoaded: document.querySelector(".hero-background")?.naturalWidth > 0,
      characterArtLoaded: Array.from(document.querySelectorAll(".hero-characters img"))
        .every((image) => image.naturalWidth > 0)
    }));

    expect(audit.pageWidth).toBeLessThanOrEqual(audit.viewportWidth + 1);
    expect(audit.brokenImages).toEqual([]);
    expect(audit.generatedHeroLoaded).toBe(true);
    expect(audit.characterArtLoaded).toBe(true);
  });

  test("keeps the hero characters separated and Bifly fully visible", async ({ page }) => {
    await page.setViewportSize({ width: 1152, height: 970 });
    const desktopCharacterOverlap = await page.evaluate(() => {
      const bifly = document.querySelector(".hero-bifly").getBoundingClientRect();
      const nabatick = document.querySelector(".hero-nabatick").getBoundingClientRect();
      const overlapWidth = Math.max(0, Math.min(bifly.right, nabatick.right) - Math.max(bifly.left, nabatick.left));
      const overlapHeight = Math.max(0, Math.min(bifly.bottom, nabatick.bottom) - Math.max(bifly.top, nabatick.top));
      return (overlapWidth * overlapHeight) / (nabatick.width * nabatick.height);
    });
    expect(desktopCharacterOverlap).toBeLessThan(0.08);

    await page.setViewportSize({ width: 390, height: 700 });
    const heroPlacement = await page.evaluate(() => {
      const hero = document.querySelector(".hero").getBoundingClientRect();
      const playbar = document.querySelector(".mobile-playbar").getBoundingClientRect();
      const tolerance = 1;
      return Array.from(document.querySelectorAll(".hero-characters img")).map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          insideHero: rect.left >= hero.left - tolerance
            && rect.right <= hero.right + tolerance
            && rect.top >= hero.top - tolerance
            && rect.bottom <= hero.bottom + tolerance,
          clearOfPlaybar: rect.bottom <= playbar.top - 8,
          square: Math.abs(rect.width - rect.height) < 12
        };
      });
    });
    expect(heroPlacement).toHaveLength(4);
    expect(heroPlacement.every(({ insideHero, clearOfPlaybar, square }) => insideHero && clearOfPlaybar && square)).toBe(true);

    await page.locator("#download").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const placement = await page.evaluate(() => {
      const card = document.querySelector(".download-card").getBoundingClientRect();
      const bifly = document.querySelector(".download-character").getBoundingClientRect();
      const tolerance = 1;
      return {
        left: bifly.left >= card.left - tolerance,
        right: bifly.right <= card.right + tolerance,
        top: bifly.top >= card.top - tolerance,
        bottom: bifly.bottom <= card.bottom + tolerance,
        square: Math.abs(bifly.width - bifly.height) < 12
      };
    });

    expect(placement).toEqual({ left: true, right: true, top: true, bottom: true, square: true });
  });

  test("provides working sharing, Google Play links and disabled App Store buttons", async ({ page }) => {
    const shareButton = page.getByRole("button", { name: "שתפו את האתגר" });
    await shareButton.scrollIntoViewIfNeeded();
    await shareButton.click();
    await expect(page.locator("[data-share-toast]")).toBeVisible();
    await expect(page.locator("[data-share-message]")).toContainText("הקישור הועתק");
    await expect.poll(() => page.evaluate(() => window.__copiedLandingUrl)).toContain("math-maze-il.vercel.app/landing.html");

    const googlePlayLinks = page.getByRole("link", { name: "פתיחת כפלול ב-Google Play" });
    await expect(googlePlayLinks).toHaveCount(2);
    for (let index = 0; index < await googlePlayLinks.count(); index += 1) {
      await expect(googlePlayLinks.nth(index)).toHaveAttribute(
        "href",
        "https://play.google.com/store/apps/details?id=com.kaflul.mathmaze&pcampaignid=web_share"
      );
      await expect(googlePlayLinks.nth(index)).not.toHaveAttribute("download", /.+/);
      await expect(googlePlayLinks.nth(index)).toHaveAttribute("rel", /noopener/);
      await expect(googlePlayLinks.nth(index)).toContainText("Google Play");
    }

    await expect(page.locator('.store-button-google img[src$="google-play-mark.svg"]')).toHaveCount(2);
    const comingSoonButtons = page.getByRole("button", { name: "גרסת כפלול ל-App Store — בקרוב" });
    await expect(comingSoonButtons).toHaveCount(2);
    for (let index = 0; index < await comingSoonButtons.count(); index += 1) {
      await expect(comingSoonButtons.nth(index)).toBeDisabled();
      await expect(comingSoonButtons.nth(index)).toContainText("בקרוב");
    }
  });

  test("has a semantic Hebrew structure and visible keyboard focus", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('nav[aria-label="ניווט ראשי"]')).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /הדף נבנה כדי/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "דיווח על בעיית נגישות" })).toHaveAttribute("href", /^mailto:/);
    const creatorCredit = page.locator(".creator-credit");
    await expect(creatorCredit).toHaveAccessibleName("האפליקציה מבית היוצר של יציר");
    await expect(creatorCredit).toContainText("האפליקציה מבית היוצר של יציר");
    const creatorLogo = creatorCredit.locator('img[src$="yatzir-logo.png"]');
    await expect(creatorLogo).toHaveCount(1);
    await expect.poll(() => creatorLogo.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    const outline = await page.locator(".skip-link").evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");

    const faq = page.locator(".faq-list details").first();
    await faq.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(faq).toHaveAttribute("open", "");
  });

  test("mobile navigation opens, closes with Escape, and restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const toggle = page.locator(".nav-toggle");
    await expect(toggle).toHaveAttribute("aria-label", "פתיחת תפריט הניווט");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAttribute("aria-label", "סגירת תפריט הניווט");
    const primaryNavigation = page.getByRole("navigation", { name: "ניווט ראשי" });
    await expect(primaryNavigation).toBeVisible();
    await expect(primaryNavigation.getByRole("link", { name: "אלוף האלופים", exact: true })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });

  test("meets minimum touch target sizing on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const tooSmall = await page.evaluate(() => Array.from(document.querySelectorAll("a, button, summary"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { text: element.textContent.trim().slice(0, 60), width: rect.width, height: rect.height };
      })
      .filter(({ width, height }) => width < 44 || height < 44));

    expect(tooSmall).toEqual([]);
  });

  test("honors reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('body[data-landing-ready="true"]').waitFor();
    const motion = await page.locator("[data-enter]").first().evaluate((element) => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, transform: style.transform, duration: style.transitionDuration };
    });
    expect(motion.opacity).toBe("1");
    expect(motion.transform).toBe("none");
  });
});
