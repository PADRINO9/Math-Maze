#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "boss-animation-qa");
const nodeOutput = path.join(outputDir, "boss-animation-qa-results.json");
const worlds = [
  { index: 0, key: "ice" },
  { index: 1, key: "lava" },
  { index: 2, key: "ancient" },
  { index: 3, key: "diamond" }
];
const viewports = [
  { key: "desktop", width: 1280, height: 720, isMobile: false },
  { key: "mobile", width: 390, height: 844, isMobile: true }
];
const contentTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".json": "application/json; charset=utf-8"
};

function staticServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const file = await resolveStaticFile(root, url.pathname);
      response.writeHead(200, { "content-type": contentTypes[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

function circularDelta(first, last) {
  const raw = Math.abs((last || 0) - (first || 0)) % (Math.PI * 2);
  return Math.min(raw, Math.PI * 2 - raw);
}

async function inspectBoss(browser, baseUrl, world, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile
  });
  await context.addInitScript(() => {
    localStorage.setItem("mathMazeCharacter", "bifly");
    localStorage.setItem("mathMazeTimeLimit", "on");
  });
  const page = await context.newPage();
  const prefix = `stage-${world.index + 1}-${world.key}-${viewport.key}`;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/?verify=1&verifyLevel=${world.index}`, { waitUntil: "domcontentloaded" });
    await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 });
    await page.waitForFunction(() => window.__mathMazeRuntime?.forceBossChallenge && window.__mathMazeRuntime?.getBossSnapshot);
    const forced = await page.evaluate(() => window.__mathMazeRuntime.forceBossChallenge());
    if (!forced) throw new Error("Boss challenge could not be started");
    await page.waitForTimeout(1250);
    const start = await page.evaluate(() => window.__mathMazeRuntime.getBossSnapshot());
    await page.screenshot({ path: path.join(outputDir, `${prefix}-before.png`) });

    const recorded = await page.evaluate(async ({ shouldRecord }) => {
      const runtime = window.__mathMazeRuntime;
      const canvas = document.getElementById("game-canvas");
      const samples = [];
      let dataUrl = null;
      let recorder;
      let completed;
      if (shouldRecord) {
        const stream = canvas.captureStream(30);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm";
        const chunks = [];
        completed = new Promise((resolve) => { recorder = new MediaRecorder(stream, { mimeType }); recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType })); });
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.start(100);
      }
      for (let index = 0; index < 8; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        samples.push({ at: (index + 1) * 180, boss: runtime.getBossSnapshot() });
      }
      if (recorder) {
        recorder.stop();
        const blob = await completed;
        dataUrl = await new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(blob); });
      }
      return { samples, dataUrl };
    }, { shouldRecord: viewport.isMobile });
    const end = await page.evaluate(() => window.__mathMazeRuntime.getBossSnapshot());
    await page.screenshot({ path: path.join(outputDir, `${prefix}-after.png`) });
    if (recorded.dataUrl) await writeFile(path.join(outputDir, `${prefix}.webm`), Buffer.from(recorded.dataUrl.split(",")[1], "base64"));

    const aliveSamples = recorded.samples.map((sample) => sample.boss).filter(Boolean);
    const movedFrames = aliveSamples.filter((sample) => sample.moving).length;
    const directions = [...new Set(aliveSamples.map((sample) => sample.direction))];
    const walked = aliveSamples.length > 1 && circularDelta(aliveSamples[0].walkCycle, aliveSamples.at(-1).walkCycle) > 0.03;
    const displacement = start && end ? Math.hypot(end.x - start.x, end.y - start.y) : 0;
    const passed = Boolean(
      start?.actorSheetReady && start.spawnProgress >= 0.78 && end &&
      aliveSamples.length >= 6 && movedFrames >= 5 && walked && displacement >= 12 && errors.length === 0
    );
    return {
      stage: world.index + 1, world: world.key, viewport: viewport.key, passed,
      forced, start, end, sampleCount: aliveSamples.length, movedFrames, directions,
      walked, displacement: Number(displacement.toFixed(2)), errors,
      proof: {
        before: path.join(outputDir, `${prefix}-before.png`),
        after: path.join(outputDir, `${prefix}-after.png`),
        video: viewport.isMobile ? path.join(outputDir, `${prefix}.webm`) : null
      }
    };
  } catch (error) {
    return {
      stage: world.index + 1, world: world.key, viewport: viewport.key, passed: false,
      sampleCount: 0, movedFrames: 0, directions: [], walked: false, displacement: 0,
      errors: [...errors, error instanceof Error ? error.stack || error.message : String(error)],
      proof: null
    };
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });
const server = staticServer();
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const browser = await chromium.launch({ headless: true });
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const results = [];
try {
  for (const viewport of viewports) for (const world of worlds) results.push(await inspectBoss(browser, baseUrl, world, viewport));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
await writeFile(nodeOutput, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ passed: results.every((result) => result.passed), results, nodeOutput }, null, 2));
if (!results.every((result) => result.passed)) process.exitCode = 1;
