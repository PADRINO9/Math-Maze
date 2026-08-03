#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "maze-connectivity-audit");
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

async function openWorldOne(browser, baseUrl, viewport) {
  const mobile = viewport.width < 600;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile
  });
  await context.addInitScript(() => {
    localStorage.setItem("kaflulFirstRunTutorialV1", "complete");
    localStorage.setItem("mathMazeCharacter", "nabatick");
    localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await page.goto(`${baseUrl}/?verify=world1-collision&verifyLevel=0`, {
    waitUntil: "domcontentloaded"
  });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 15_000 });
  await page.waitForFunction(() => Boolean(
    window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.forceLevelForVerification
      && window.__mathMazeRuntime?.auditAllMazeTopologiesForVerification
  ));
  await page.evaluate(() => {
    const runtime = window.__mathMazeRuntime;
    runtime.forceLevelForVerification(0);
    runtime.setEnemyCellsForVerification([]);
    runtime.setPlayerCellForVerification(13, 12);
  });
  await page.waitForTimeout(700);
  return { context, page, browserErrors };
}

async function captureViewport(browser, baseUrl, viewport, fileName) {
  const { context, page, browserErrors } = await openWorldOne(browser, baseUrl, viewport);
  try {
    const screenshotPath = path.join(outputDir, fileName);
    await page.screenshot({ path: screenshotPath });
    return {
      viewport,
      screenshot: path.relative(root, screenshotPath),
      player: await page.evaluate(() => window.__mathMazeRuntime.getPlayerSnapshot()),
      collision: await page.evaluate(() => window.__mathMazeRuntime.getMazeCollisionSnapshot()),
      topology: await page.evaluate(() => window.__mathMazeRuntime.auditCurrentMazeTopologyForVerification()),
      browserErrors
    };
  } finally {
    await context.close();
  }
}

async function captureMobileTraversal(browser, baseUrl) {
  const viewport = { width: 390, height: 844 };
  const { context, page, browserErrors } = await openWorldOne(browser, baseUrl, viewport);
  try {
    await page.evaluate(() => {
      const canvas = document.querySelector("#game-canvas");
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      window.__mazeConnectivityRecorder = recorder;
      window.__mazeConnectivityRecording = new Promise((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          const chunkSize = 0x8000;
          for (let index = 0; index < bytes.length; index += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
          }
          resolve({ base64: btoa(binary), size: bytes.length });
        };
      });
      recorder.start(120);
    });

    const samples = [];
    for (let frame = 0; frame < 56; frame += 1) {
      const sample = await page.evaluate(() => (
        window.__mathMazeRuntime.stepPlayerForVerification("right", 2.2)
      ));
      samples.push({
        x: sample.player.x,
        y: sample.player.y,
        cell: sample.collision.playerCell,
        overlapsWall: sample.collision.playerOverlapsWall
      });
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(250);
    await page.evaluate(() => window.__mazeConnectivityRecorder.stop());
    const recording = await page.evaluate(() => window.__mazeConnectivityRecording);
    const videoPath = path.join(outputDir, "reported-pocket-through-route-mobile-390x844.webm");
    await writeFile(videoPath, Buffer.from(recording.base64, "base64"));

    const screenshotPath = path.join(outputDir, "after-through-route-mobile-390x844.png");
    await page.screenshot({ path: screenshotPath });
    const finalPlayer = await page.evaluate(() => window.__mathMazeRuntime.getPlayerSnapshot());
    const finalCollision = await page.evaluate(() => window.__mathMazeRuntime.getMazeCollisionSnapshot());

    return {
      viewport,
      screenshot: path.relative(root, screenshotPath),
      video: path.relative(root, videoPath),
      videoBytes: recording.size,
      sampleCount: samples.length,
      wallOverlapSamples: samples.filter((sample) => sample.overlapsWall).length,
      visitedCells: Array.from(new Set(samples.map((sample) => `${sample.cell.x},${sample.cell.y}`))),
      finalPlayer,
      finalCollision,
      browserErrors
    };
  } finally {
    await context.close();
  }
}

async function auditEveryWorld(browser, baseUrl) {
  const { context, page, browserErrors } = await openWorldOne(
    browser,
    baseUrl,
    { width: 1280, height: 800 }
  );
  try {
    const audit = await page.evaluate(() => {
      const runtime = window.__mathMazeRuntime;
      const topology = runtime.auditAllMazeTopologiesForVerification();
      const levels = [];
      for (let levelIndex = 0; levelIndex < 4; levelIndex += 1) {
        runtime.forceLevelForVerification(levelIndex);
        levels.push({
          levelIndex,
          topology: runtime.auditCurrentMazeTopologyForVerification(),
          collision: runtime.auditMazeCollisionForVerification(),
          traversal: runtime.auditFullMazeTraversalForVerification()
        });
      }
      return { topology, levels };
    });
    return { ...audit, browserErrors };
  } finally {
    await context.close();
  }
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
  const desktop = await captureViewport(
    browser,
    baseUrl,
    { width: 1280, height: 800 },
    "after-open-passage-desktop-1280x800.png"
  );
  const mobileStart = await captureViewport(
    browser,
    baseUrl,
    { width: 390, height: 844 },
    "after-open-passage-mobile-390x844.png"
  );
  const mobileTraversal = await captureMobileTraversal(browser, baseUrl);
  const allWorlds = await auditEveryWorld(browser, baseUrl);
  const failures = [];

  if (!desktop.topology?.passed || !mobileStart.topology?.passed) {
    failures.push("world-one-topology-failed");
  }
  if (!allWorlds.topology?.passed) failures.push("all-world-topology-failed");
  if (allWorlds.topology?.levelCount !== 4) failures.push("unexpected-level-count");
  if (allWorlds.topology?.disconnectedComponentCount !== 0) {
    failures.push("disconnected-walkable-components");
  }
  if (allWorlds.topology?.isolatedCellCount !== 0) failures.push("isolated-walkable-cells");
  if (allWorlds.levels.some((level) => !level.collision?.passed)) {
    failures.push("collision-transition-audit-failed");
  }
  if (allWorlds.levels.some((level) => !level.traversal?.passed)) {
    failures.push("full-traversal-audit-failed");
  }
  if (!allWorlds.topology?.levels?.[0]?.reportedPassage?.open) {
    failures.push("reported-passage-closed");
  }
  if ((allWorlds.topology?.levels?.[0]?.reportedPassage?.pocketExitCount || 0) < 2) {
    failures.push("reported-pocket-still-one-way");
  }
  if (mobileTraversal.wallOverlapSamples !== 0 || mobileTraversal.finalCollision?.playerOverlapsWall) {
    failures.push("player-overlapped-wall-during-reported-route");
  }
  if ((mobileTraversal.finalCollision?.playerCell?.x || 0) < 17) {
    failures.push("player-did-not-cross-reported-route");
  }
  if (!mobileTraversal.videoBytes) failures.push("empty-traversal-video");
  if (
    desktop.browserErrors.length
    || mobileStart.browserErrors.length
    || mobileTraversal.browserErrors.length
    || allWorlds.browserErrors.length
  ) {
    failures.push("browser-errors");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    desktop,
    mobileStart,
    mobileTraversal,
    allWorlds,
    failures,
    passed: failures.length === 0
  };
  await writeFile(path.join(outputDir, "proof.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    outputDir: path.relative(root, outputDir),
    passed: report.passed,
    failures,
    screenshots: [
      desktop.screenshot,
      mobileStart.screenshot,
      mobileTraversal.screenshot
    ],
    video: mobileTraversal.video,
    allWorlds: {
      levelCount: allWorlds.topology.levelCount,
      disconnectedComponentCount: allWorlds.topology.disconnectedComponentCount,
      isolatedCellCount: allWorlds.topology.isolatedCellCount
    }
  }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
