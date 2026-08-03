#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = path.join(ROOT, "docs", "visual-proof-screenshots", "global-champions");
const PLAYER_ID = "74d8f8db-3d41-4f4d-84e1-09b2f8bbbfc2";
const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800, mobile: false },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true }
];

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".json") || filePath.endsWith(".webmanifest")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".wav")) return "audio/wav";
  if (filePath.endsWith(".m4a")) return "audio/mp4";
  return "application/octet-stream";
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const resolved = await resolveStaticFile(ROOT, url.pathname);
      const bytes = await readFile(resolved);
      response.writeHead(200, { "content-type": contentType(resolved), "cache-control": "no-store" });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function mockScores() {
  const names = [
    "מלכת הכפל", "נועם האלוף", "כוכבת המספרים", "אלוף המבוך", "שיאן 15",
    "מכפיל העל", "נבטיק לנצח", "ביפלי המלך", "אשף התרגילים", "אלופת העולם"
  ];
  return Array.from({ length: 50 }, (_, index) => ({
    playerName: index === 41 ? "אלוף 7" : (names[index % names.length] + (index > 9 ? ` ${index + 1}` : "")),
    score: index === 41 ? 18500 : 99000 - index * 1950,
    correctAnswers: Math.max(28, 108 - index),
    levelReached: index < 12 ? 4 : Math.max(1, 4 - Math.floor(index / 14)),
    mode: index % 3 === 0 ? "adventure" : "arcade",
    difficulty: index < 8 ? "legendary" : (index < 24 ? "expert" : "normal"),
    maxCombo: Math.max(5, 36 - Math.floor(index / 2)),
    accuracy: Math.max(78, 99 - Math.floor(index / 3)),
    isCurrentPlayer: index === 41
  }));
}

async function installLeaderboardMock(page, connected) {
  await page.route("**/api/champions**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!connected) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          publicAvailable: false,
          publicSubmissionsAvailable: false,
          code: "leaderboard_not_configured"
        })
      });
      return;
    }
    if (requestUrl.searchParams.get("capability") === "1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ publicAvailable: true, publicSubmissionsAvailable: true, automaticSync: true })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope: "global",
        scores: mockScores(),
        player: {
          rank: 42,
          totalPlayers: 1200,
          score: 18500,
          scoreToNextRank: 175,
          playerName: "אלוף 7"
        }
      })
    });
  });
}

async function seedPlayer(page) {
  await page.addInitScript(({ playerId }) => {
    localStorage.setItem("kaflulFirstRunTutorialV1", "complete");
    localStorage.setItem("mathMazePlayerId", playerId);
    localStorage.setItem("mathMazeBest", "18500");
    localStorage.setItem("mathMazeNickname", "אלוף 7");
  }, { playerId: PLAYER_ID });
}

async function captureState(browser, baseUrl, viewport, connected, report) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await seedPlayer(page);
  await installLeaderboardMock(page, connected);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#start-screen").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);

  const stateName = connected ? "after" : "before";
  const stateDir = path.join(OUTPUT_ROOT, stateName);
  await mkdir(stateDir, { recursive: true });
  const homePath = path.join(stateDir, `home-${viewport.name}.png`);
  await page.screenshot({ path: homePath, animations: "disabled" });

  await page.locator("#leaderboard-open").click();
  await page.locator("#leaderboard-dialog").waitFor({ state: "visible" });
  if (connected) await page.locator("#leaderboard-world-rank").waitFor({ state: "visible" });
  const dialogPath = path.join(stateDir, `champions-${viewport.name}.png`);
  await page.screenshot({ path: dialogPath, animations: "disabled" });

  const layout = await page.evaluate(() => {
    const dialog = document.querySelector(".leaderboard-panel")?.getBoundingClientRect();
    const badge = document.querySelector(".home-world-rank-badge")?.getBoundingClientRect();
    return {
      rank: document.querySelector("#menu-rank-value")?.textContent,
      worldRank: document.querySelector("#leaderboard-world-rank")?.textContent,
      personalBest: document.querySelector("#leaderboard-personal-best")?.textContent,
      totalPlayers: document.querySelector("#leaderboard-total-players")?.textContent,
      publicChip: document.querySelector("#leaderboard-public-chip")?.textContent,
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
      dialogInsideViewport: Boolean(dialog && dialog.left >= 0 && dialog.right <= innerWidth && dialog.top >= 0 && dialog.bottom <= innerHeight),
      badgeHasArea: Boolean(badge && badge.width > 0 && badge.height > 0)
    };
  });

  report.captures.push({
    state: stateName,
    viewport: viewport.name,
    home: path.relative(ROOT, homePath),
    dialog: path.relative(ROOT, dialogPath),
    layout,
    errors
  });
  await context.close();
}

await rm(OUTPUT_ROOT, { recursive: true, force: true });
await mkdir(OUTPUT_ROOT, { recursive: true });
const { server, baseUrl } = await startServer();
const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), captures: [] };

try {
  for (const viewport of VIEWPORTS) {
    await captureState(browser, baseUrl, viewport, false, report);
    await captureState(browser, baseUrl, viewport, true, report);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

report.passed = report.captures.every((capture) => (
  capture.errors.length === 0
  && capture.layout.noHorizontalOverflow
  && capture.layout.dialogInsideViewport
  && capture.layout.badgeHasArea
  && (capture.state === "before" || capture.layout.worldRank === "#42")
));
await writeFile(path.join(OUTPUT_ROOT, "proof.json"), `${JSON.stringify(report, null, 2)}\n`);

if (!report.passed) {
  throw new Error("Global leaderboard visual proof failed. See proof.json.");
}
console.log(JSON.stringify(report, null, 2));
