#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "professional-overhaul-after");

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

async function openVerifiedPage(browser, baseUrl, viewport, levelIndex, characterId = "bifly") {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600
  });
  await context.addInitScript(({ characterId }) => {
    localStorage.setItem("mathMazeCharacter", characterId);
    localStorage.setItem("mathMazeTimeLimit", "on");
  }, { characterId });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/?verify=1&verifyLevel=${levelIndex}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((expectedLevel) => {
    const snapshot = window.__mathMazeRuntime?.getPlayerSnapshot?.();
    const level = window.__mathMazeRuntime?.getMazeThemePreviewState?.()?.levelIndex;
    return snapshot?.phase === "playing" && (level === undefined || level === expectedLevel);
  }, levelIndex);
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 8_000 });
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const canvas = document.getElementById("game-canvas");
    const bounds = canvas?.getBoundingClientRect();
    return !root.classList.contains("loading-screen-active")
      && !root.classList.contains("loading-screen-complete")
      && Boolean(bounds?.width && bounds?.height);
  });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await page.waitForTimeout(400);
  return { context, page };
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

try {
  const worlds = ["ice", "lava", "ancient", "diamond"];
  for (let index = 0; index < worlds.length; index += 1) {
    const { context, page } = await openVerifiedPage(browser, baseUrl, { width: 1280, height: 720 }, index);
    await page.screenshot({ path: path.join(outputDir, `after-world-${worlds[index]}-desktop-1280x720.png`) });
    await context.close();
  }

  const { context: mobileContext, page: mobilePage } = await openVerifiedPage(
    browser,
    baseUrl,
    { width: 390, height: 844 },
    0
  );
  await mobilePage.screenshot({ path: path.join(outputDir, "after-first-maze-playing-mobile-390x844.png") });
  const firstQuestion = await mobilePage.evaluate(() => window.__mathMazeRuntime?.openQuestionForVerification?.());
  await mobilePage.locator("#question-dialog").waitFor({ state: "visible" });
  await mobilePage.screenshot({ path: path.join(outputDir, "after-question-mobile-390x844.png") });
  await mobilePage.evaluate(() => window.__mathMazeRuntime?.extendQuestionFeedbackDelayForVerification?.(2600));
  for (const digit of String(firstQuestion.answer)) {
    await mobilePage.locator(`[data-keypad-digit="${digit}"]`).click();
  }
  await mobilePage.locator('[data-keypad-action="submit"]').click();
  await mobilePage.locator("#question-dialog[data-answer-result='correct']").waitFor({ state: "visible" });
  await mobilePage.screenshot({ path: path.join(outputDir, "after-question-correct-mobile-390x844.png") });
  await mobilePage.waitForFunction(() => window.__mathMazeRuntime?.questionFeedbackResult == null);
  await mobilePage.evaluate(() => window.__mathMazeRuntime?.openQuestionForVerification?.());
  await mobilePage.locator("#question-dialog").waitFor({ state: "visible" });
  await mobilePage.evaluate(() => document.querySelector("#pause-button")?.click());
  await mobilePage.locator("#pause-screen").waitFor({ state: "visible" });
  await mobilePage.screenshot({ path: path.join(outputDir, "after-question-paused-mobile-390x844.png") });
  await mobileContext.close();

  const { context: characterContext, page: characterPage } = await openVerifiedPage(
    browser,
    baseUrl,
    { width: 390, height: 844 },
    2,
    "nabatick"
  );
  await characterPage.screenshot({ path: path.join(outputDir, "after-nabatick-ancient-mobile-390x844.png") });
  await characterPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await characterPage.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 8_000 });
  await characterPage.locator("#start-button").click();
  await characterPage.waitForFunction(() => document.documentElement.dataset.gameState === "playing");
  await characterPage.waitForTimeout(350);
  const videoRecording = await characterPage.evaluate(async () => {
    const canvas = document.getElementById("game-canvas");
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const completed = new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });
    recorder.start(100);
    const startSnapshot = {
      phase: document.documentElement.dataset.gameState || "",
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    };
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 3200));
    const endSnapshot = {
      phase: document.documentElement.dataset.gameState || "",
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    };
    recorder.stop();
    const blob = await completed;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    return { dataUrl, startSnapshot, endSnapshot };
  });
  const videoBytes = Buffer.from(String(videoRecording.dataUrl).split(",")[1], "base64");
  await writeFile(path.join(outputDir, "after-nabatick-walk-mobile.webm"), videoBytes);
  console.log(`Nabatick movement: ${JSON.stringify({ start: videoRecording.startSnapshot, end: videoRecording.endSnapshot })}`);
  await characterContext.close();

  console.log(`Professional proof written to ${outputDir}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
