#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "stage-intro-camera", "after");
const viewports = [
  { key: "desktop", width: 1280, height: 800, isMobile: false },
  { key: "mobile", width: 390, height: 844, isMobile: true }
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
  ".webp": "image/webp"
};

function staticServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const file = await resolveStaticFile(root, url.pathname);
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(file)] || "application/octet-stream",
        "cache-control": "no-store"
      });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

async function recordIntro(page) {
  const dataUrl = await page.evaluate(async () => {
    const canvas = document.getElementById("game-canvas");
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    const completed = new Promise((resolve) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    recorder.start(100);
    window.__mathMazeRuntime.forceStageIntroForVerification(0);
    await new Promise((resolve) => setTimeout(resolve, 3900));
    recorder.stop();
    const blob = await completed;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  });

  await writeFile(
    path.join(outputDir, "stage-intro-camera-mobile.webm"),
    Buffer.from(dataUrl.split(",")[1], "base64")
  );
}

async function captureViewport(browser, baseUrl, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${baseUrl}/?verify=1`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 });
  await page.waitForFunction(() => window.__mathMazeRuntime?.forceStageIntroForVerification);
  await page.evaluate(() => window.__mathMazeRuntime.forceStageIntroForVerification(0));
  const overview = await page.evaluate(() => window.__mathMazeRuntime.setStageIntroProgressForVerification(0.2));
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(outputDir, `${viewport.key}-overview.png`) });

  const focus = await page.evaluate(() => window.__mathMazeRuntime.setStageIntroProgressForVerification(0.68));
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(outputDir, `${viewport.key}-focus.png`) });

  await page.evaluate(() => window.__mathMazeRuntime.setStageIntroProgressForVerification(0.995));
  await page.waitForFunction(() => !window.__mathMazeRuntime.getStageIntroCameraSnapshot().active);
  const settled = await page.evaluate(() => window.__mathMazeRuntime.getStageIntroCameraSnapshot());
  await page.screenshot({ path: path.join(outputDir, `${viewport.key}-settled.png`) });

  const layout = await page.evaluate(() => {
    const canvas = document.getElementById("game-canvas");
    const stage = document.querySelector(".stage");
    const canvasRect = canvas.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      canvas: { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height },
      stage: { x: stageRect.x, y: stageRect.y, width: stageRect.width, height: stageRect.height },
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      verticalOverflow: document.documentElement.scrollHeight - innerHeight
    };
  });

  if (viewport.isMobile) {
    await recordIntro(page);
  }

  await context.close();
  return {
    viewport: viewport.key,
    overview,
    focus,
    settled,
    layout,
    errors,
    passed: overview.active
      && overview.keyCount === 3
      && overview.letterCount === 3
      && overview.zoom < overview.gameplayZoom * 0.9
      && focus.travelProgress > 0.25
      && !settled.active
      && Math.abs(settled.zoom - settled.gameplayZoom) < 0.02
      && layout.horizontalOverflow <= 1
      && errors.length === 0
  };
}

await mkdir(outputDir, { recursive: true });
const server = staticServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  for (const viewport of viewports) {
    results.push(await captureViewport(browser, baseUrl, viewport));
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const reportPath = path.join(outputDir, "verification.json");
await writeFile(reportPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ passed: results.every((result) => result.passed), outputDir, reportPath, results }, null, 2));
if (!results.every((result) => result.passed)) process.exitCode = 1;
