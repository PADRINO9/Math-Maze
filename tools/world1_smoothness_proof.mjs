#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "world1-smoothness-fix");
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

function summarizeSamples(samples) {
  const deltas = samples.map((sample) => sample.deltaMs).sort((a, b) => a - b);
  const steps = samples.map((sample) => sample.stepPx).sort((a, b) => a - b);
  const percentile = (values, ratio) => values[Math.min(
    values.length - 1,
    Math.floor((values.length - 1) * ratio)
  )];
  const totalMs = deltas.reduce((sum, value) => sum + value, 0);
  return {
    sampleCount: samples.length,
    effectiveFps: totalMs > 0 ? 1000 * samples.length / totalMs : 0,
    frameMs: {
      median: percentile(deltas, 0.5),
      p95: percentile(deltas, 0.95),
      max: deltas[deltas.length - 1]
    },
    movement: {
      medianStepPx: percentile(steps, 0.5),
      p95StepPx: percentile(steps, 0.95),
      maxStepPx: steps[steps.length - 1],
      jumpsOver6_2Px: steps.filter((value) => value > 6.2).length,
      jumpsOver10Px: steps.filter((value) => value > 10).length
    }
  };
}

async function runLiveMovementAudit(browser, baseUrl, viewport, { record = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile
  });
  await context.addInitScript(() => {
    localStorage.setItem("mathMazeCharacter", "nabatick");
    localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  try {
    await page.goto(`${baseUrl}/?verify=world1-smoothness&verifyLevel=0`, {
      waitUntil: "domcontentloaded"
    });
    await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
    await page.waitForFunction(() => Boolean(
      window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.resumeLiveGameplayForVerification
      && window.__mathMazeRuntime?.getPlayerSnapshot
    ));

    const liveResult = await page.evaluate(async ({ shouldRecord }) => {
      const runtime = window.__mathMazeRuntime;
      runtime.forceLevelForVerification(0);
      runtime.setPlayerCellForVerification(2, 23);
      runtime.setEnemyCellsForVerification([
        { x: 13, y: 3 },
        { x: 26, y: 3 },
        { x: 3, y: 12 },
        { x: 36, y: 12 },
        { x: 35, y: 24 }
      ]);
      runtime.resumeLiveGameplayForVerification();

      const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      for (let index = 0; index < 8; index += 1) await nextFrame();

      let recordingPromise = null;
      let recorder = null;
      if (shouldRecord) {
        const canvas = document.querySelector("#game-canvas");
        const stream = canvas.captureStream(30);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm";
        const chunks = [];
        recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };
        recordingPromise = new Promise((resolve) => {
          recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: mimeType });
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = "";
            const chunkSize = 0x8000;
            for (let offset = 0; offset < bytes.length; offset += chunkSize) {
              binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
            }
            resolve({ base64: btoa(binary), mimeType, size: bytes.length });
          };
        });
        recorder.start(120);
      }

      const stage = document.querySelector(".stage");
      const rect = stage.getBoundingClientRect();
      const startX = rect.left + rect.width * 0.44;
      const startY = rect.top + rect.height * 0.55;
      const eventInit = {
        bubbles: true,
        cancelable: true,
        pointerId: 91,
        pointerType: "touch",
        isPrimary: true,
        buttons: 1
      };
      stage.dispatchEvent(new PointerEvent("pointerdown", {
        ...eventInit,
        clientX: startX,
        clientY: startY
      }));
      stage.dispatchEvent(new PointerEvent("pointermove", {
        ...eventInit,
        clientX: startX + 84,
        clientY: startY
      }));
      stage.dispatchEvent(new PointerEvent("pointerup", {
        ...eventInit,
        buttons: 0,
        clientX: startX + 84,
        clientY: startY
      }));

      const samples = [];
      let previousTime = await nextFrame();
      let previousPlayer = runtime.getPlayerSnapshot();
      for (let index = 0; index < 90; index += 1) {
        if (index === 24) {
          const stallStartedAt = performance.now();
          while (performance.now() - stallStartedAt < 160) {
            // Deliberately block one presentation frame. Before the fix this
            // produced a 22.08 px catch-up teleport on the next paint.
          }
        }
        const now = await nextFrame();
        const player = runtime.getPlayerSnapshot();
        samples.push({
          index,
          deltaMs: now - previousTime,
          stepPx: Math.hypot(player.x - previousPlayer.x, player.y - previousPlayer.y),
          x: player.x,
          y: player.y,
          overlapsWall: runtime.getMazeCollisionSnapshot().playerOverlapsWall
        });
        previousTime = now;
        previousPlayer = player;
      }
      runtime.setPlayerDirectionForVerification("none");

      let recording = null;
      if (recorder && recordingPromise) {
        recorder.stop();
        recording = await recordingPromise;
      }
      return {
        samples,
        recording,
        finalPlayer: runtime.getPlayerSnapshot(),
        collision: runtime.getMazeCollisionSnapshot()
      };
    }, { shouldRecord: record });

    const screenshotPath = path.join(outputDir, `${viewport.key}-after.png`);
    await page.screenshot({ path: screenshotPath });
    let videoPath = null;
    if (liveResult.recording?.base64) {
      videoPath = path.join(outputDir, `${viewport.key}-live-movement-after.webm`);
      await writeFile(videoPath, Buffer.from(liveResult.recording.base64, "base64"));
    }

    const summary = summarizeSamples(liveResult.samples);
    return {
      viewport,
      screenshot: path.relative(root, screenshotPath),
      video: videoPath ? path.relative(root, videoPath) : null,
      videoBytes: liveResult.recording?.size || 0,
      injectedStallMs: 160,
      ...summary,
      wallOverlapSamples: liveResult.samples.filter((sample) => sample.overlapsWall).length,
      finalPlayer: liveResult.finalPlayer,
      collision: liveResult.collision,
      errors,
      passed: summary.movement.maxStepPx <= 6.2
        && summary.movement.jumpsOver6_2Px === 0
        && liveResult.samples.every((sample) => !sample.overlapsWall)
        && !liveResult.collision.playerOverlapsWall
        && errors.length === 0
        && (!record || liveResult.recording?.size > 0)
    };
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });
const server = staticServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const browser = await chromium.launch({ headless: true });

try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const desktop = await runLiveMovementAudit(browser, baseUrl, {
    key: "desktop-1280x720",
    width: 1280,
    height: 720,
    mobile: false
  });
  const mobile = await runLiveMovementAudit(browser, baseUrl, {
    key: "mobile-390x844",
    width: 390,
    height: 844,
    mobile: true
  }, { record: true });
  const report = {
    generatedAt: new Date().toISOString(),
    regression: "160 ms forced main-thread stall during production gameplay loop",
    expectedMaximumPresentedStepPx: 6.2,
    desktop,
    mobile,
    passed: desktop.passed && mobile.passed
  };
  const reportPath = path.join(outputDir, "proof.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    outputDir: path.relative(root, outputDir),
    reportPath: path.relative(root, reportPath),
    desktop: {
      effectiveFps: desktop.effectiveFps,
      frameMs: desktop.frameMs,
      movement: desktop.movement,
      passed: desktop.passed
    },
    mobile: {
      effectiveFps: mobile.effectiveFps,
      frameMs: mobile.frameMs,
      movement: mobile.movement,
      wallOverlapSamples: mobile.wallOverlapSamples,
      videoBytes: mobile.videoBytes,
      passed: mobile.passed
    },
    passed: report.passed
  }, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
