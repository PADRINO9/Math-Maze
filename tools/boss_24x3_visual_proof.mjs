#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "boss-24x3", "after");
const rawVideoDir = path.join(outputDir, "raw-video");
const requestedStage = Number.parseInt(
  process.argv.find((argument) => argument.startsWith("--stage="))?.split("=")[1] || "",
  10
);
const allWorlds = [
  { index: 0, key: "ice", name: "גן השמש" },
  { index: 1, key: "lava", name: "עולם הלבה" },
  { index: 2, key: "ancient", name: "עולם העתיקות" },
  { index: 3, key: "diamond", name: "עולם היהלומים" }
];
const worlds = Number.isFinite(requestedStage)
  ? allWorlds.filter((world) => world.index === requestedStage - 1)
  : allWorlds;
if (worlds.length === 0) throw new Error(`Unknown stage: ${requestedStage}`);
const reportPath = path.join(
  outputDir,
  Number.isFinite(requestedStage)
    ? `boss-24x3-stage-${requestedStage}-proof-report.json`
    : "boss-24x3-proof-report.json"
);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
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
      if (url.pathname === "/api/champions") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ entries: [] }));
        return;
      }
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

async function preparePage(context, baseUrl, levelIndex) {
  await context.addInitScript(() => {
    localStorage.setItem("mathMazeCharacter", "bifly");
    localStorage.setItem("mathMazeMode", "adventure");
    localStorage.setItem("mathMazeTimeLimit", "off");
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${baseUrl}/?verify=1&verifyLevel=${levelIndex}`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 15_000 });
  await page.waitForFunction(() => typeof window.__mathMazeRuntime?.getBossEncounterSnapshot === "function");
  await page.evaluate((index) => window.__mathMazeRuntime.forceLevelForVerification(index), levelIndex);
  await page.waitForTimeout(300);
  return { page, errors };
}

async function captureDesktopEntrance(browser, baseUrl, world) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: "he-IL"
  });
  const { page, errors } = await preparePage(context, baseUrl, world.index);
  await page.evaluate(() => window.__mathMazeRuntime.forceBossChallenge());
  await page.waitForFunction(() => {
    const cinematic = window.__mathMazeRuntime.getBossEncounterSnapshot().cinematic;
    return cinematic && cinematic.elapsed >= cinematic.totalDuration * 0.42;
  });
  const screenshot = path.join(outputDir, `stage-${world.index + 1}-${world.key}-boss-entrance-1280x720.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const snapshot = await page.evaluate(() => window.__mathMazeRuntime.getBossEncounterSnapshot());
  await context.close();
  return { screenshot, snapshot, errors };
}

async function answerBossQuestion(page) {
  const question = await page.evaluate(() => window.__mathMazeRuntime.openBossQuestionForVerification());
  if (!question) throw new Error("Boss question did not open");
  await page.locator("#question-dialog").waitFor({ state: "visible" });
  await page.waitForTimeout(520);
  await page.evaluate(() => window.__mathMazeRuntime.answerCurrentQuestionForVerification());
  await page.waitForFunction(() => document.querySelector("#question-dialog")?.dataset.answerResult === "correct");
  await page.waitForTimeout(360);
  await page.waitForFunction(() => document.documentElement.dataset.gameState !== "question");
  return question;
}

async function captureMobileEncounter(browser, baseUrl, world) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
    recordVideo: {
      dir: rawVideoDir,
      size: { width: 390, height: 844 }
    }
  });
  const { page, errors } = await preparePage(context, baseUrl, world.index);
  const video = page.video();
  await page.evaluate(() => {
    window.__mathMazeRuntime.setBossQuestionFeedbackDelayForVerification(760);
    window.__mathMazeRuntime.forceBossChallenge();
  });
  await page.waitForFunction(() => {
    const cinematic = window.__mathMazeRuntime.getBossEncounterSnapshot().cinematic;
    return cinematic && cinematic.elapsed >= cinematic.totalDuration * 0.42;
  });
  const entranceScreenshot = path.join(outputDir, `stage-${world.index + 1}-${world.key}-boss-entrance-390x844.png`);
  await page.screenshot({ path: entranceScreenshot, fullPage: false });
  const entrance = await page.evaluate(() => window.__mathMazeRuntime.getBossEncounterSnapshot());
  await page.waitForFunction(() => window.__mathMazeRuntime.getBossEncounterSnapshot().cinematic === null);
  await page.waitForTimeout(520);

  const questions = [];
  const damageSnapshots = [];
  let questionScreenshot = null;
  for (let index = 0; index < 3; index += 1) {
    const question = await page.evaluate(() => window.__mathMazeRuntime.openBossQuestionForVerification());
    if (!question) throw new Error(`Boss question ${index + 1} did not open`);
    questions.push(question);
    await page.locator("#question-dialog").waitFor({ state: "visible" });
    await page.waitForTimeout(520);
    if (index === 0) {
      questionScreenshot = path.join(outputDir, `stage-${world.index + 1}-${world.key}-boss-question-1-390x844.png`);
      await page.screenshot({ path: questionScreenshot, fullPage: false });
    }
    await page.evaluate(() => window.__mathMazeRuntime.answerCurrentQuestionForVerification());
    await page.waitForFunction(() => document.querySelector("#question-dialog")?.dataset.answerResult === "correct");
    await page.waitForTimeout(360);
    await page.waitForFunction(() => document.documentElement.dataset.gameState !== "question");
    damageSnapshots.push(await page.evaluate(() => window.__mathMazeRuntime.getBossEncounterSnapshot()));
    if (index < 2) await page.waitForTimeout(620);
  }

  await page.waitForTimeout(260);
  const explosionScreenshot = path.join(outputDir, `stage-${world.index + 1}-${world.key}-boss-explosion-390x844.png`);
  await page.screenshot({ path: explosionScreenshot, fullPage: false });
  if (world.index < allWorlds.length - 1) {
    await page.waitForFunction((expectedLevel) => {
      const snapshot = window.__mathMazeRuntime.getBossEncounterSnapshot();
      return snapshot.levelIndex === expectedLevel && snapshot.stageIntro;
    }, world.index + 1);
    await page.waitForTimeout(2300);
  } else {
    await page.locator("#end-screen").waitFor({ state: "visible", timeout: 8_000 });
    await page.waitForTimeout(900);
  }

  const finalSnapshot = await page.evaluate(() => window.__mathMazeRuntime.getBossEncounterSnapshot());
  await context.close();
  const rawPath = await video.path();
  const videoPath = path.join(outputDir, `stage-${world.index + 1}-${world.key}-boss-24x3-390x844.webm`);
  await rm(videoPath, { force: true });
  await rename(rawPath, videoPath);
  return {
    video: videoPath,
    entranceScreenshot,
    questionScreenshot,
    explosionScreenshot,
    entrance,
    questions,
    damageSnapshots,
    finalSnapshot,
    errors
  };
}

await mkdir(outputDir, { recursive: true });
await rm(rawVideoDir, { recursive: true, force: true });
await mkdir(rawVideoDir, { recursive: true });
const server = createStaticServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const world of worlds) {
    const desktop = await captureDesktopEntrance(browser, baseUrl, world);
    const mobile = await captureMobileEncounter(browser, baseUrl, world);
    const questionTexts = mobile.questions.map((question) => question.text);
    const passed = desktop.errors.length === 0
      && mobile.errors.length === 0
      && mobile.entrance.regularCorrect === 24
      && mobile.entrance.cinematic?.vanishingEnemyCount >= 6
      && mobile.questions.length === 3
      && new Set(questionTexts).size === 3
      && mobile.damageSnapshots[0]?.bossCorrect === 1
      && mobile.damageSnapshots[1]?.bossCorrect === 2
      && mobile.damageSnapshots[2]?.bossCorrect === 3
      && mobile.damageSnapshots[2]?.phase === "victory"
      && (world.index === allWorlds.length - 1
        ? mobile.finalSnapshot.phase === "ended"
        : mobile.finalSnapshot.levelIndex === world.index + 1);
    results.push({ world, passed, desktop, mobile });
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(rawVideoDir, { recursive: true, force: true });
}

await writeFile(reportPath, `${JSON.stringify({ passed: results.every((result) => result.passed), results }, null, 2)}\n`);
console.log(JSON.stringify({
  passed: results.every((result) => result.passed),
  reportPath,
  videos: results.map((result) => result.mobile.video),
  screenshots: results.flatMap((result) => [
    result.desktop.screenshot,
    result.mobile.entranceScreenshot,
    result.mobile.questionScreenshot,
    result.mobile.explosionScreenshot
  ])
}, null, 2));
if (!results.every((result) => result.passed)) process.exitCode = 1;
