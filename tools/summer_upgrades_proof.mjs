import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PROOF_ROOT = path.join(ROOT, "docs", "visual-proof-screenshots", "summer-upgrades");
const BASE_URL = process.env.KAFLUL_PROOF_URL || "http://127.0.0.1:5178";

const viewports = [
  { name: "desktop-1280x720", width: 1280, height: 720 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("mathMazeFactStats", JSON.stringify({
        "7×8": { correct: 0, wrong: 4, streak: 0 },
        "6×9": { correct: 1, wrong: 3, streak: 0 },
        "4×6": { correct: 1, wrong: 2, streak: 0 },
        "4×4": { correct: 4, wrong: 0, streak: 4 },
        "3×7": { correct: 3, wrong: 0, streak: 3 }
      }));
    });
    await page.goto(`${BASE_URL}/?verify=1`, { waitUntil: "domcontentloaded" });
    await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });

    const masteryDir = path.join(PROOF_ROOT, "mastery-map");
    await mkdir(masteryDir, { recursive: true });
    await page.locator("#home-progress-button").click();
    await page.locator("#progress-panel").waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(masteryDir, `mastery-map-${viewport.name}.png`) });
    await page.locator("#progress-panel [data-close-panel]").click();
    await page.locator("#progress-panel").waitFor({ state: "hidden" });

    const dailyDir = path.join(PROOF_ROOT, "daily-maze");
    await mkdir(dailyDir, { recursive: true });
    await page.locator("#daily-challenge-open").click();
    await page.locator("#daily-challenge-panel").waitFor({ state: "visible" });
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(dailyDir, `daily-panel-${viewport.name}.png`) });
    await page.locator("#daily-challenge-start").click();
    await page.locator("#start-screen").waitFor({ state: "hidden" });
    await page.evaluate(() => {
      if (window.__mathMazeRuntime?.getStageIntroCameraSnapshot?.().active) {
        window.__mathMazeRuntime.setStageIntroProgressForVerification?.(0.995);
      }
    });
    await page.waitForFunction(() => !window.__mathMazeRuntime?.getStageIntroCameraSnapshot?.().active, null, { timeout: 4_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dailyDir, `daily-game-${viewport.name}.png`) });
    await page.evaluate(() => window.__mathMazeRuntime.forceDailyCompletionForVerification("אלוף יומי"));
    await page.locator("#end-screen").waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(dailyDir, `daily-results-${viewport.name}.png`) });

    const duelDir = path.join(PROOF_ROOT, "friend-duel");
    await mkdir(duelDir, { recursive: true });
    await page.locator("#restart-button").click();
    await page.locator("#start-screen").waitFor({ state: "visible" });
    await page.locator("#daily-challenge-open").click();
    await page.locator("#duel-panel-open").click();
    await page.locator("#duel-panel").waitFor({ state: "visible" });
    await page.locator("#duel-create-code").click();
    const duelCode = (await page.locator("#duel-code-output").textContent()).trim();
    await page.locator("#duel-code-input").fill(duelCode);
    await page.locator("#duel-validate-code").click();
    await page.locator("#duel-opponent-preview").waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(duelDir, `duel-panel-${viewport.name}.png`) });
    await page.locator("#duel-start").click();
    await page.locator("#start-screen").waitFor({ state: "hidden" });
    await page.evaluate(() => {
      if (window.__mathMazeRuntime?.getStageIntroCameraSnapshot?.().active) {
        window.__mathMazeRuntime.setStageIntroProgressForVerification?.(0.995);
      }
    });
    await page.waitForFunction(() => !window.__mathMazeRuntime?.getStageIntroCameraSnapshot?.().active, null, { timeout: 4_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(duelDir, `duel-game-${viewport.name}.png`) });
    await page.evaluate(() => window.__mathMazeRuntime.forceDuelCompletionForVerification({
      playerName: "אלוף דו קרב",
      win: true
    }));
    await page.locator("#end-screen").waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(duelDir, `duel-results-${viewport.name}.png`) });

    const leagueDir = path.join(PROOF_ROOT, "weekly-league");
    await mkdir(leagueDir, { recursive: true });
    await page.locator("#restart-button").click();
    await page.locator("#start-screen").waitFor({ state: "visible" });
    await page.locator("#daily-challenge-open").click();
    await page.locator("#league-panel-open").click();
    await page.locator("#league-panel").waitFor({ state: "visible" });
    await page.locator("#league-create").click();
    await page.evaluate(() => {
      window.__mathMazeRuntime.forceLeagueFriendResultForVerification({ memberId: 2401, points: 14800, daysPlayed: 4, accuracy: 92 });
      window.__mathMazeRuntime.forceLeagueFriendResultForVerification({ memberId: 3402, points: 8700, daysPlayed: 3, accuracy: 86 });
    });
    await page.screenshot({ path: path.join(leagueDir, `league-panel-${viewport.name}.png`) });
    await page.locator(".league-sheet").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(leagueDir, `league-standings-${viewport.name}.png`) });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(PROOF_ROOT);
