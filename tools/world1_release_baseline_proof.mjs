#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "world1-release-baseline");
const EXPECTED = Object.freeze({
  baselineId: "world1-sun-garden-approved-v2",
  authoredBoardSrc: "assets/maze/world1/sun-garden/board-v3.png",
  authoredBoardSha256: "f114291caf2ccf0f62db575be3809b750439d61fa07db65fbf086c3c8cd7bd63",
  navigationVersion: "world1-canonical-semantic-layout-v6",
  topologySha256: "9d34bb2e464b860aed3361acc096955719edc3efc27f6c11234d13a0f41ef1b4",
  rows: 30,
  cols: 40,
  tile: 24,
  walkableCellCount: 585,
  chestCell: { x: 23, y: 18 },
  desktop: { playerScale: 0.9328000000000001, enemyScale: 0.7, gameplayZoom: 1.06 },
  mobile: { playerScale: 0.9540000000000001, enemyScale: 0.72, gameplayZoom: 1.05 }
});

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const filePath = await resolveStaticFile(root, url.pathname);
      const bytes = await readFile(filePath);
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(filePath)] || "application/octet-stream",
        "cache-control": "no-store"
      });
      response.end(bytes);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

async function captureBaseline(browser, baseUrl, name, viewport, expectedViewport) {
  const mobile = viewport.width < 600;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile
  });
  await context.addInitScript(() => {
    localStorage.setItem("mathMazeCharacter", "nabatick");
    localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  try {
    await page.goto(`${baseUrl}/?verify=world1-baseline&verifyLevel=0`, { waitUntil: "domcontentloaded" });
    await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
    await page.waitForFunction(() => Boolean(
      window.__mathMazeRuntime?.gameReady
        && window.__mathMazeRuntime?.forceLevelForVerification
        && window.__mathMazeRuntime?.getWorldOneReleaseBaselineForVerification
    ));
    await page.evaluate(() => window.__mathMazeRuntime.forceLevelForVerification(0));
    await page.evaluate(() => {
      window.__mathMazeRuntime.forceArcadeBonusForVerification("closed");
      window.__mathMazeRuntime.setPlayerCellForVerification(23, 26);
      window.__mathMazeRuntime.setEnemyCellsForVerification([
        { x: 13, y: 3 },
        { x: 26, y: 3 },
        { x: 3, y: 12 },
        { x: 36, y: 12 },
        { x: 21, y: 23 }
      ]);
    });
    await page.waitForTimeout(800);

    const snapshot = await page.evaluate(() => (
      window.__mathMazeRuntime.getWorldOneReleaseBaselineForVerification()
    ));
    const topologySha256 = sha256(snapshot.runtime.mazeRows.join("\n"));
    const screenshotPath = path.join(outputDir, `world1-baseline-${name}.png`);
    await page.screenshot({ path: screenshotPath });

    assert.equal(snapshot.baseline.id, EXPECTED.baselineId);
    assert.equal(snapshot.baseline.locked, true);
    assert.equal(snapshot.baseline.authoredBoardSrc, EXPECTED.authoredBoardSrc);
    assert.equal(snapshot.baseline.navigationVersion, EXPECTED.navigationVersion);
    assert.deepEqual(snapshot.baseline.chestCell, EXPECTED.chestCell);
    assert.equal(snapshot.baseline.gameplayZoom.desktop, EXPECTED.desktop.gameplayZoom);
    assert.equal(snapshot.baseline.gameplayZoom.phonePortrait, EXPECTED.mobile.gameplayZoom);
    assert.equal(snapshot.runtime.levelIndex, 0);
    assert.equal(snapshot.runtime.concept, "sun-garden");
    assert.equal(snapshot.runtime.authoredBoardReady, true);
    assert.equal(snapshot.runtime.rows, EXPECTED.rows);
    assert.equal(snapshot.runtime.cols, EXPECTED.cols);
    assert.equal(snapshot.runtime.tile, EXPECTED.tile);
    assert.equal(snapshot.runtime.walkableCellCount, EXPECTED.walkableCellCount);
    assert.equal(snapshot.runtime.reachableCellCount, EXPECTED.walkableCellCount);
    assert.equal(topologySha256, EXPECTED.topologySha256);
    assert.deepEqual(snapshot.runtime.chest.cell, EXPECTED.chestCell);
    assert.equal(snapshot.runtime.chest.reachable, true);
    assert.equal(snapshot.runtime.actors.authoredWorldOne, true);
    assert.equal(snapshot.runtime.actors.player.scale, expectedViewport.playerScale);
    assert.ok(snapshot.runtime.actors.enemies.length >= 1);
    assert.ok(snapshot.runtime.actors.enemies.every((enemy) => enemy.scale === expectedViewport.enemyScale));
    assert.equal(snapshot.runtime.camera.gameplayZoom, expectedViewport.gameplayZoom);
    assert.deepEqual(browserErrors, []);

    return {
      viewport,
      screenshot: path.relative(root, screenshotPath),
      topologySha256,
      snapshot,
      browserErrors
    };
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });
const boardBytes = await readFile(path.join(root, EXPECTED.authoredBoardSrc));
assert.equal(sha256(boardBytes), EXPECTED.authoredBoardSha256);

const server = createStaticServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await captureBaseline(
    browser,
    baseUrl,
    "desktop-1280x720",
    { width: 1280, height: 720 },
    EXPECTED.desktop
  );
  const mobile = await captureBaseline(
    browser,
    baseUrl,
    "mobile-390x844",
    { width: 390, height: 844 },
    EXPECTED.mobile
  );
  const report = {
    generatedAt: new Date().toISOString(),
    passed: true,
    baselineId: EXPECTED.baselineId,
    authoredBoardSha256: EXPECTED.authoredBoardSha256,
    desktop,
    mobile
  };
  await writeFile(path.join(outputDir, "proof.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ outputDir: path.relative(root, outputDir), ...report }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
