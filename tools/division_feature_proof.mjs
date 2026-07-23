import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.KAFLUL_BASE_URL || "http://127.0.0.1:4173";
const outputDir = resolve("docs/visual-proof-screenshots/division-mode");
await mkdir(outputDir, { recursive: true });

const profiles = [
  { name: "desktop-1280x800", viewport: { width: 1280, height: 800 }, isMobile: false },
  { name: "mobile-390x844", viewport: { width: 390, height: 844 }, isMobile: true }
];

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      isMobile: profile.isMobile,
      hasTouch: profile.isMobile,
      locale: "he-IL"
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto(`${baseUrl}/?verify=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady);
    await page.locator("#menu-settings-button").click();
    await page.locator(".settings-operation-mode label", { hasText: "כפל וחילוק" }).click();
    await page.locator(".settings-operation-mode").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${outputDir}/division-settings-${profile.name}.png`,
      animations: "disabled"
    });

    await page.locator("#settings-panel [data-close-panel]").click();
    await page.locator("#start-button").click();
    const question = await page.evaluate(() => window.__mathMazeRuntime.openQuestionForVerification());
    if (!question || question.operation !== "division" || !question.text.includes("÷")) {
      throw new Error(`Expected a division question for ${profile.name}`);
    }
    await page.locator("#question-dialog").waitFor({ state: "visible" });
    await page.screenshot({
      path: `${outputDir}/division-question-${profile.name}.png`,
      animations: "disabled"
    });

    if (errors.length > 0) {
      throw new Error(`${profile.name} browser errors: ${errors.join(" | ")}`);
    }

    results.push({
      profile: profile.name,
      question,
      settingsScreenshot: `${outputDir}/division-settings-${profile.name}.png`,
      questionScreenshot: `${outputDir}/division-question-${profile.name}.png`
    });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
