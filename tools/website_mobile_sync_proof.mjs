#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.KAFLUL_WEB_URL || "https://math-maze-il.vercel.app").replace(/\/$/, "");
const label = (process.env.KAFLUL_PROOF_LABEL || "after").replace(/[^a-z0-9_-]/gi, "-");
const requireMobileSync = process.env.KAFLUL_REQUIRE_MOBILE_SYNC === "1";
const outputDir = path.resolve("docs", "visual-proof-screenshots", "website-mobile-sync");

await mkdir(outputDir, { recursive: true });

const report = {
  baseUrl,
  label,
  generatedAt: new Date().toISOString(),
  profiles: [],
  errors: [],
  passed: false
};

function watchPageErrors(page, profile) {
  page.on("pageerror", (error) => report.errors.push(`${profile}: ${String(error)}`));
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(`${profile}: ${message.text()}`);
  });
}

async function waitForGameHome(page) {
  await page.goto(`${baseUrl}/?verify=website-mobile-sync&proof=${label}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000
  });
  await page.locator("#start-button").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await Promise.all(Array.from(document.images, (image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }));
  });
}

async function captureProfile(browser, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    screen: options.viewport,
    deviceScaleFactor: 1,
    isMobile: options.mobile,
    hasTouch: options.mobile,
    locale: "he-IL",
    reducedMotion: "no-preference"
  });
  const page = await context.newPage();
  watchPageErrors(page, options.profile);

  try {
    await waitForGameHome(page);
    const featureAudit = await page.evaluate(async () => {
      const scriptSources = Array.from(document.scripts, (script) => script.getAttribute("src") || "")
        .filter(Boolean);
      const stylesheetSources = Array.from(document.querySelectorAll('link[rel="stylesheet"]'), (link) => link.getAttribute("href") || "")
        .filter(Boolean);
      const runtime = window.__mathMazeRuntime || {};
      const gameScriptSource = scriptSources.find((source) => source.startsWith("game.js")) || "game.js";
      let gameSource = "";
      try {
        const response = await fetch(gameScriptSource, { cache: "no-store" });
        if (response.ok) gameSource = await response.text();
      } catch {
        gameSource = "";
      }
      const headStatus = async (relativeUrl) => {
        try {
          const response = await fetch(relativeUrl, { method: "HEAD", cache: "no-store" });
          return response.status;
        } catch {
          return 0;
        }
      };

      return {
        operationModeMarkup: Boolean(document.querySelector('input[name="operation-mode"][value="mixed"]')),
        divisionCopyVisibleInDom: document.body.textContent?.includes("כפל וחילוק") === true,
        playerAnimationHook: typeof runtime.getPlayerMazeAnimationSnapshotForVerification === "function",
        ghostBlastHook: typeof runtime.getGhostBlastSnapshotForVerification === "function",
        bossWalkHook: typeof runtime.setBossWalkPoseForVerification === "function",
        playerAnimationSource: gameSource.includes("PLAYER_MAZE_PRESENTATION")
          && gameSource.includes("scaleBoost: 1.06")
          && gameSource.includes("movingBouncePx: 0.72"),
        ghostBlastSource: gameSource.includes("getGhostBlastSnapshotForVerification")
          && gameSource.includes("ghostBlastEffect"),
        bossWalkSource: gameSource.includes("setBossWalkPoseForVerification")
          && gameSource.includes("boss-actor-direction-sheet.png"),
        scriptSources,
        stylesheetSources,
        musicAssetStatus: await headStatus("assets/audio/music/kaflul-afropop-gameplay.m4a"),
        bossDirectionAssetStatus: await headStatus("assets/bosses/boss-actor-direction-sheet.png"),
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth
      };
    });

    await page.locator("#start-button").click();
    await page.locator("#start-screen").waitFor({ state: "hidden", timeout: 15_000 });
    await page.waitForTimeout(850);

    const gameplayAudit = await page.evaluate(() => {
      const runtime = window.__mathMazeRuntime || {};
      const canvas = document.querySelector("#game-canvas");
      const rect = canvas?.getBoundingClientRect();
      const animation = typeof runtime.getPlayerMazeAnimationSnapshotForVerification === "function"
        ? runtime.getPlayerMazeAnimationSnapshotForVerification()
        : null;
      return {
        canvasWidth: Math.round(rect?.width || 0),
        canvasHeight: Math.round(rect?.height || 0),
        displayScaleBoost: animation?.displayScaleBoost || null,
        maximumMovingBouncePx: animation?.maximumMovingBouncePx || null,
        playerCharacter: animation?.characterId || null
      };
    });

    const screenshotPath = path.join(outputDir, `${label}-${options.profile}-maze.png`);
    await page.screenshot({ path: screenshotPath, animations: "disabled" });

    const profileReport = {
      profile: options.profile,
      screenshot: path.relative(process.cwd(), screenshotPath),
      features: featureAudit,
      gameplay: gameplayAudit
    };
    report.profiles.push(profileReport);

    if (featureAudit.documentWidth > featureAudit.viewportWidth + 1) {
      report.errors.push(`${options.profile}: horizontal overflow ${featureAudit.documentWidth}px > ${featureAudit.viewportWidth}px`);
    }
    if (gameplayAudit.canvasWidth < 300 || gameplayAudit.canvasHeight < 300) {
      report.errors.push(`${options.profile}: playable maze canvas is too small`);
    }
    if (requireMobileSync) {
      const requiredChecks = [
        [featureAudit.operationModeMarkup, "division setting is missing"],
        [featureAudit.divisionCopyVisibleInDom, "division copy is missing"],
        [featureAudit.playerAnimationHook || featureAudit.playerAnimationSource, "player animation code is missing"],
        [featureAudit.ghostBlastHook || featureAudit.ghostBlastSource, "ghost blast code is missing"],
        [featureAudit.bossWalkHook || featureAudit.bossWalkSource, "boss directional-walk code is missing"],
        [featureAudit.musicAssetStatus === 200, `gameplay music returned ${featureAudit.musicAssetStatus}`],
        [featureAudit.bossDirectionAssetStatus === 200, `boss direction sheet returned ${featureAudit.bossDirectionAssetStatus}`],
        [featureAudit.playerAnimationSource || Math.abs((gameplayAudit.displayScaleBoost || 0) - 1.06) < 0.001, `player scale boost is ${gameplayAudit.displayScaleBoost}`],
        [featureAudit.playerAnimationSource || (gameplayAudit.maximumMovingBouncePx || Infinity) <= 0.72, `player bounce is ${gameplayAudit.maximumMovingBouncePx}`]
      ];
      for (const [passed, error] of requiredChecks) {
        if (!passed) report.errors.push(`${options.profile}: ${error}`);
      }
    }
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await captureProfile(browser, {
    profile: "desktop-1280x800",
    viewport: { width: 1280, height: 800 },
    mobile: false
  });
  await captureProfile(browser, {
    profile: "mobile-390x844",
    viewport: { width: 390, height: 844 },
    mobile: true
  });
} finally {
  await browser.close();
}

report.passed = report.errors.length === 0;
const reportPath = path.join(outputDir, `${label}-report.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, reportPath: path.relative(process.cwd(), reportPath) }, null, 2));

if (!report.passed) process.exitCode = 1;
