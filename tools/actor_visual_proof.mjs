#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "actor-scale-and-ghost-cue");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".wav": "audio/wav"
};

function staticServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const filePath = await resolveStaticFile(root, url.pathname);
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(filePath)] || "application/octet-stream",
        "cache-control": "no-store"
      });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

async function capture(browser, baseUrl, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile
  });
  await context.addInitScript(() => {
    localStorage.setItem("mathMazeCharacter", "bifly");
    localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
    localStorage.setItem("mathMazeTimeLimit", "off");
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  try {
    await page.goto(`${baseUrl}/?verify=actor-scale-and-ghost-cue&verifyLevel=0`, {
      waitUntil: "domcontentloaded"
    });
    await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
    await page.waitForFunction(() => Boolean(
      window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.forceLevelForVerification
      && window.__mathMazeRuntime?.getActorVisualMetricsForVerification
    ));

    const snapshot = await page.evaluate(() => {
      const runtime = window.__mathMazeRuntime;
      runtime.forceLevelForVerification(0);
      runtime.setPlayerCellForVerification(20, 23);
      const placement = runtime.setEnemyCellsForVerification([
        { x: 16, y: 23 },
        { x: 18, y: 23 },
        { x: 22, y: 23 },
        { x: 24, y: 23 }
      ]);
      for (let index = 0; index < placement.actors.enemies.length; index += 1) {
        runtime.setEnemyMotionStateForVerification(index, {
          direction: "none",
          pathCooldown: 9999
        });
      }
      return {
        release: runtime.getWorldOneReleaseBaselineForVerification(),
        visual: runtime.getActorVisualMetricsForVerification(),
        collision: runtime.getActorCollisionSnapshotForVerification(),
        rejectedEnemyCells: placement.rejected
      };
    });

    await page.waitForTimeout(180);
    const screenshotPath = path.join(outputDir, `${viewport.key}-after.png`);
    await page.screenshot({ path: screenshotPath });
    const actorCropPath = path.join(outputDir, `${viewport.mobile ? "mobile" : "desktop"}-actor-crop-after.png`);
    await page.screenshot({
      path: actorCropPath,
      clip: viewport.mobile
        ? { x: 0, y: 575, width: 390, height: 240 }
        : { x: 290, y: 500, width: 700, height: 260 }
    });
    return {
      viewport,
      screenshot: path.relative(root, screenshotPath),
      actorCrop: path.relative(root, actorCropPath),
      snapshot,
      errors,
      passed: errors.length === 0
        && snapshot.rejectedEnemyCells.length === 0
        && snapshot.visual.player?.scale >= 0.88
        && snapshot.visual.enemies.every((enemy) => enemy.scale >= 0.7)
        && !snapshot.collision.player?.overlapsWall
        && snapshot.collision.enemies.every((enemy) => !enemy.overlapsWall)
    };
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });
const server = staticServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

try {
  const results = [];
  results.push(await capture(browser, baseUrl, {
    key: "desktop-1280x800",
    width: 1280,
    height: 800,
    mobile: false
  }));
  results.push(await capture(browser, baseUrl, {
    key: "mobile-390x844",
    width: 390,
    height: 844,
    mobile: true
  }));
  const report = {
    generatedAt: new Date().toISOString(),
    passed: results.every((result) => result.passed),
    results
  };
  await writeFile(path.join(outputDir, "proof.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
