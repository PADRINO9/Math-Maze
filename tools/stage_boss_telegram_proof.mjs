#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "stage-boss-telegram");

const worlds = [
  { index: 0, key: "ice", he: "שלב 1 - קרח", boss: "בוס 1 - ליבת הקרח" },
  { index: 1, key: "lava", he: "שלב 2 - לבה", boss: "בוס 2 - ליבת הלבה" },
  { index: 2, key: "ancient", he: "שלב 3 - עתיק", boss: "בוס 3 - הליבה העתיקה" },
  { index: 3, key: "diamond", he: "שלב 4 - יהלום", boss: "בוס 4 - ליבת היהלום" }
];

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

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

async function openGamePage(browser, baseUrl, levelIndex) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  await context.addInitScript(() => {
    localStorage.setItem("mathMazeCharacter", "bifly");
    localStorage.setItem("mathMazeTimeLimit", "on");
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/?verify=1&verifyLevel=${levelIndex}`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 });
  await page.waitForFunction((expectedLevel) => {
    const snapshot = window.__mathMazeRuntime?.getPlayerSnapshot?.();
    return snapshot?.phase === "playing"
      && document.documentElement.dataset.gameState === "playing"
      && window.__mathMazeRuntime?.forceLevelForVerification
      && window.__mathMazeRuntime?.getBossSnapshot
      && Number.isFinite(expectedLevel);
  }, levelIndex);
  await page.evaluate((expectedLevel) => window.__mathMazeRuntime.forceLevelForVerification(expectedLevel), levelIndex);
  await page.waitForTimeout(550);
  return { context, page };
}

async function captureStage(browser, baseUrl, world) {
  const { context, page } = await openGamePage(browser, baseUrl, world.index);
  const file = path.join(outputDir, `stage-${world.index + 1}-${world.key}-390x844.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return { file, caption: `כפלול - ${world.he}` };
}

async function captureBoss(browser, baseUrl, world) {
  const { context, page } = await openGamePage(browser, baseUrl, world.index);
  const boss = await page.evaluate(async () => {
    const snapshot = window.__mathMazeRuntime.forceBossChallenge();
    await new Promise((resolve) => setTimeout(resolve, 900));
    return window.__mathMazeRuntime.getBossSnapshot() || snapshot;
  });
  if (!boss) {
    await context.close();
    throw new Error(`Could not force boss for level ${world.index}`);
  }
  await page.waitForTimeout(450);
  const file = path.join(outputDir, `boss-${world.index + 1}-${world.key}-390x844.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return { file, caption: `כפלול - ${world.boss}` };
}

async function captureIceHazard(browser, baseUrl) {
  const { context, page } = await openGamePage(browser, baseUrl, 0);
  const hazard = await page.evaluate(() => window.__mathMazeRuntime.forceEnvironmentHazardForVerification());
  if (!hazard) {
    await context.close();
    throw new Error("Could not force the ice-world hazard");
  }
  await page.waitForTimeout(450);
  const file = path.join(outputDir, "hazard-1-ice-slick-390x844.png");
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return { file, caption: "כפלול - עולם הקרח - סכנת קרח שחור" };
}

await mkdir(outputDir, { recursive: true });
const server = createStaticServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const captures = [];

try {
  for (const world of worlds) {
    captures.push(await captureStage(browser, baseUrl, world));
  }
  captures.push(await captureIceHazard(browser, baseUrl));
  for (const world of worlds) {
    captures.push(await captureBoss(browser, baseUrl, world));
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

console.log(JSON.stringify({ outputDir, captures }, null, 2));
