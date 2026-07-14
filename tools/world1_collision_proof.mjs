#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "world1-collision-fix");
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

async function openLevel(browser, baseUrl, viewport) {
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
  await page.goto(`${baseUrl}/?verify=world1-collision&verifyLevel=0`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
  await page.waitForFunction(() => Boolean(
    window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.forceLevelForVerification
      && window.__mathMazeRuntime?.auditMazeCollisionForVerification
  ));
  await page.evaluate(() => window.__mathMazeRuntime.forceLevelForVerification(0));
  await page.waitForTimeout(500);
  return { context, page, browserErrors };
}

async function animatePlayer(page, direction, frames, distance = 2.2, stopAfter = true) {
  return page.evaluate(async ({ selectedDirection, frameCount, stepDistance, shouldStop }) => {
    let result = null;
    const samples = [window.__mathMazeRuntime.getPlayerSnapshot()];
    for (let frame = 0; frame < frameCount; frame += 1) {
      result = window.__mathMazeRuntime.stepPlayerForVerification(selectedDirection, stepDistance);
      samples.push({
        ...result.player,
        overlapsWall: result.collision.playerOverlapsWall
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    if (shouldStop) window.__mathMazeRuntime.setPlayerDirectionForVerification("none");
    return { result, samples };
  }, { selectedDirection: direction, frameCount: frames, stepDistance: distance, shouldStop: stopAfter });
}

async function dispatchSwipe(page, direction) {
  return page.evaluate((selectedDirection) => {
    const stage = document.querySelector(".stage");
    if (!stage) return { delivered: false, reason: "missing-stage" };
    const rect = stage.getBoundingClientRect();
    const start = {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.56
    };
    const delta = {
      left: { x: -72, y: 0 },
      right: { x: 72, y: 0 },
      up: { x: 0, y: -72 },
      down: { x: 0, y: 72 }
    }[selectedDirection];
    if (!delta) return { delivered: false, reason: "invalid-direction" };

    const eventInit = {
      bubbles: true,
      cancelable: true,
      pointerId: 41,
      pointerType: "touch",
      isPrimary: true,
      buttons: 1
    };
    const startedAt = performance.now();
    stage.dispatchEvent(new PointerEvent("pointerdown", {
      ...eventInit,
      clientX: start.x,
      clientY: start.y
    }));
    stage.dispatchEvent(new PointerEvent("pointermove", {
      ...eventInit,
      clientX: start.x + delta.x,
      clientY: start.y + delta.y
    }));
    stage.dispatchEvent(new PointerEvent("pointerup", {
      ...eventInit,
      buttons: 0,
      clientX: start.x + delta.x,
      clientY: start.y + delta.y
    }));
    return {
      delivered: true,
      direction: selectedDirection,
      handlerDurationMs: performance.now() - startedAt,
      player: window.__mathMazeRuntime.getPlayerSnapshot()
    };
  }, direction);
}

async function primeGameplayGesture(page) {
  return page.evaluate(() => {
    const stage = document.querySelector(".stage");
    if (!stage) return { delivered: false, reason: "missing-stage" };
    const rect = stage.getBoundingClientRect();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      pointerId: 40,
      pointerType: "touch",
      isPrimary: true,
      clientX: rect.left + rect.width * 0.5,
      clientY: rect.top + rect.height * 0.56
    };
    const startedAt = performance.now();
    stage.dispatchEvent(new PointerEvent("pointerdown", { ...eventInit, buttons: 1 }));
    stage.dispatchEvent(new PointerEvent("pointerup", { ...eventInit, buttons: 0 }));
    return {
      delivered: true,
      handlerDurationMs: performance.now() - startedAt
    };
  });
}

async function measureFramePacing(page, sampleCount = 120) {
  return page.evaluate((requestedSamples) => new Promise((resolve) => {
    const deltas = [];
    let previous = performance.now();
    const collect = (now) => {
      const delta = now - previous;
      previous = now;
      if (deltas.length || delta < 100) deltas.push(delta);
      if (deltas.length < requestedSamples) {
        requestAnimationFrame(collect);
        return;
      }
      const sorted = [...deltas].sort((a, b) => a - b);
      const percentile = (ratio) => sorted[Math.min(
        sorted.length - 1,
        Math.floor((sorted.length - 1) * ratio)
      )];
      const totalMs = deltas.reduce((sum, value) => sum + value, 0);
      resolve({
        sampleCount: deltas.length,
        medianMs: percentile(0.5),
        p95Ms: percentile(0.95),
        p99Ms: percentile(0.99),
        maxMs: sorted[sorted.length - 1],
        effectiveFps: totalMs > 0 ? 1000 * deltas.length / totalMs : 0,
        framesOver33Ms: deltas.filter((value) => value > 33.4).length,
        framesOver50Ms: deltas.filter((value) => value > 50).length
      });
    };
    requestAnimationFrame(collect);
  }), sampleCount);
}

function measureBufferedTurn(samples = [], expectedLaneX = 540) {
  let maxStepDistance = 0;
  for (let index = 1; index < samples.length; index += 1) {
    maxStepDistance = Math.max(
      maxStepDistance,
      Math.hypot(samples[index].x - samples[index - 1].x, samples[index].y - samples[index - 1].y)
    );
  }
  const firstVerticalSample = samples.find((sample) => sample.direction === "down");
  return {
    sampleCount: samples.length,
    maxStepDistance,
    firstVerticalSample,
    turnLaneDeviation: firstVerticalSample ? Math.abs(firstVerticalSample.x - expectedLaneX) : null,
    wallOverlapSamples: samples.filter((sample) => sample.overlapsWall).length
  };
}

async function captureDesktop(browser, baseUrl) {
  const viewport = { width: 1280, height: 720 };
  const { context, page, browserErrors } = await openLevel(browser, baseUrl, viewport);
  try {
    const placement = await page.evaluate(() => window.__mathMazeRuntime.setPlayerCellForVerification(19, 12));
    await page.evaluate(() => window.__mathMazeRuntime.setEnemyCellsForVerification([
      { x: 13, y: 3 },
      { x: 26, y: 3 },
      { x: 3, y: 12 },
      { x: 36, y: 12 },
      { x: 20, y: 23 }
    ]));
    await page.waitForTimeout(300);
    const filePath = path.join(outputDir, "world1-collision-desktop-1280x720.png");
    await page.screenshot({ path: filePath });
    return {
      viewport,
      file: path.relative(root, filePath),
      placement,
      collision: await page.evaluate(() => window.__mathMazeRuntime.getMazeCollisionSnapshot()),
      audit: await page.evaluate(() => window.__mathMazeRuntime.auditMazeCollisionForVerification()),
      fullTraversalAudit: await page.evaluate(() => window.__mathMazeRuntime.auditFullMazeTraversalForVerification()),
      wallStopTurnAudit: await page.evaluate(() => window.__mathMazeRuntime.auditWallStopTurnsForVerification()),
      authoredGeometryAudit: await page.evaluate(() => window.__mathMazeRuntime.auditWorldOneAuthoredGeometryForVerification()),
      inputResponseAudit: await page.evaluate(() => window.__mathMazeRuntime.auditFirstInputResponseForVerification("left")),
      browserErrors
    };
  } finally {
    await context.close();
  }
}

async function captureMobileMovement(browser, baseUrl) {
  const viewport = { width: 390, height: 844 };
  const { context, page, browserErrors } = await openLevel(browser, baseUrl, viewport);
  try {
    const placement = await page.evaluate(() => window.__mathMazeRuntime.setPlayerCellForVerification(17, 12));
    const recordingActors = await page.evaluate(() => (
      window.__mathMazeRuntime.setEnemyCellsForVerification([
        { x: 26, y: 3 },
        { x: 3, y: 12 },
        { x: 36, y: 12 },
        { x: 21, y: 23 },
        { x: 35, y: 24 }
      ])
    ));
    const renderProfile = await page.evaluate(() => (
      window.__mathMazeRuntime.profileRenderForVerification(16)
    ));
    // Measure the live renderer before captureStream/MediaRecorder is attached;
    // Chromium intentionally paces a 30 fps capture track at ~33 ms.
    const framePacing = await measureFramePacing(page);
    await page.evaluate(() => window.__mathMazeRuntime.setEnemyCellsForVerification([]));
    const framePacingPlayerOnly = await measureFramePacing(page, 60);
    await page.evaluate(() => window.__mathMazeRuntime.setEnemyCellsForVerification([
      { x: 26, y: 3 },
      { x: 3, y: 12 },
      { x: 36, y: 12 },
      { x: 21, y: 23 },
      { x: 35, y: 24 }
    ]));
    await page.evaluate(() => {
      const canvas = document.querySelector("#game-canvas");
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      window.__worldOneCollisionRecorder = recorder;
      window.__worldOneCollisionRecording = new Promise((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          const chunkSize = 0x8000;
          for (let index = 0; index < bytes.length; index += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
          }
          resolve({ base64: btoa(binary), mimeType: recorder.mimeType, size: bytes.length });
        };
      });
      recorder.start(120);
    });

    await animatePlayer(page, "left", 30);
    const afterBlockedLeft = await page.evaluate(() => ({
      player: window.__mathMazeRuntime.getPlayerSnapshot(),
      collision: window.__mathMazeRuntime.getMazeCollisionSnapshot()
    }));

    await page.evaluate(() => window.__mathMazeRuntime.setPlayerCellForVerification(19, 12));
    await animatePlayer(page, "right", 22, 2.2, false);
    const afterOpenLane = await page.evaluate(() => ({
      player: window.__mathMazeRuntime.getPlayerSnapshot(),
      collision: window.__mathMazeRuntime.getMazeCollisionSnapshot()
    }));

    const bufferedTurnRun = await animatePlayer(page, "down", 36);
    const bufferedTurn = measureBufferedTurn(bufferedTurnRun.samples, 540);
    const afterOpenVerticalLane = await page.evaluate(() => ({
      player: window.__mathMazeRuntime.getPlayerSnapshot(),
      collision: window.__mathMazeRuntime.getMazeCollisionSnapshot()
    }));

    const wallStopPlacement = await page.evaluate(() => (
      window.__mathMazeRuntime.setPlayerCellForVerification(20, 26)
    ));
    await animatePlayer(page, "right", 70);
    const afterBottomWallStop = await page.evaluate(() => ({
      player: window.__mathMazeRuntime.getPlayerSnapshot(),
      collision: window.__mathMazeRuntime.getMazeCollisionSnapshot()
    }));
    await animatePlayer(page, "up", 18);
    const afterBottomWallTurn = await page.evaluate(() => ({
      player: window.__mathMazeRuntime.getPlayerSnapshot(),
      collision: window.__mathMazeRuntime.getMazeCollisionSnapshot()
    }));

    // Reproduce the same stop-then-turn through the production swipe handler.
    const realSwipePlacement = await page.evaluate(() => (
      window.__mathMazeRuntime.setPlayerCellForVerification(20, 26)
    ));
    // A real player has already tapped Start before the first maze swipe, which
    // is when the browser performs its one-time AudioContext unlock. Recreate
    // that lifecycle and measure gameplay input separately from startup audio.
    const startupGesture = await primeGameplayGesture(page);
    await page.waitForTimeout(80);
    const realSwipeRight = await dispatchSwipe(page, "right");
    const realSwipeRightRun = await page.evaluate(() => (
      window.__mathMazeRuntime.advancePlayerInputForVerification(80, 1 / 60)
    ));
    const realSwipeUp = await dispatchSwipe(page, "up");
    const realSwipeUpRun = await page.evaluate(() => (
      window.__mathMazeRuntime.advancePlayerInputForVerification(18, 1 / 60)
    ));
    await page.waitForTimeout(250);

    await page.evaluate(() => window.__worldOneCollisionRecorder.stop());
    const recording = await page.evaluate(() => window.__worldOneCollisionRecording);
    const videoPath = path.join(outputDir, "world1-collision-mobile-movement.webm");
    await writeFile(videoPath, Buffer.from(recording.base64, "base64"));

    const topFramePlacement = await page.evaluate(() => (
      window.__mathMazeRuntime.setPlayerCellForVerification(13, 3)
    ));
    const spawnedActors = await page.evaluate(() => (
      window.__mathMazeRuntime.setEnemyCellsForVerification([
        { x: 26, y: 3 },
        { x: 3, y: 12 },
        { x: 36, y: 12 },
        { x: 21, y: 23 }
      ])
    ));
    await page.waitForTimeout(700);
    const topFrameScreenshotPath = path.join(outputDir, "world1-collision-mobile-top-frame-390x844.png");
    await page.screenshot({ path: topFrameScreenshotPath });
    const topFrameCropPath = path.join(outputDir, "world1-collision-top-frame-crop.png");
    await page.screenshot({
      path: topFrameCropPath,
      clip: { x: 0, y: 70, width: 390, height: 360 }
    });

    const screenshotPlacement = await page.evaluate(() => (
      window.__mathMazeRuntime.setPlayerCellForVerification(23, 26)
    ));
    await page.waitForTimeout(700);
    const screenshotPath = path.join(outputDir, "world1-collision-mobile-390x844.png");
    await page.screenshot({ path: screenshotPath });
    const movingEnemyRun = await page.evaluate(() => (
      window.__mathMazeRuntime.stepEnemiesForVerification(180, 1 / 60)
    ));

    return {
      viewport,
      screenshot: path.relative(root, screenshotPath),
      topFrameScreenshot: path.relative(root, topFrameScreenshotPath),
      topFrameCrop: path.relative(root, topFrameCropPath),
      video: path.relative(root, videoPath),
      videoBytes: recording.size,
      placement,
      topFramePlacement,
      screenshotPlacement,
      afterBlockedLeft,
      afterOpenLane,
      afterOpenVerticalLane,
      wallStopPlacement,
      afterBottomWallStop,
      afterBottomWallTurn,
      realSwipePlacement,
      startupGesture,
      realSwipeRight,
      realSwipeRightRun,
      realSwipeUp,
      realSwipeUpRun,
      bufferedTurn,
      framePacing,
      framePacingPlayerOnly,
      renderProfile,
      recordingActors,
      spawnedActors,
      movingEnemyRun,
      audit: await page.evaluate(() => window.__mathMazeRuntime.auditMazeCollisionForVerification()),
      fullTraversalAudit: await page.evaluate(() => window.__mathMazeRuntime.auditFullMazeTraversalForVerification()),
      wallStopTurnAudit: await page.evaluate(() => window.__mathMazeRuntime.auditWallStopTurnsForVerification()),
      authoredGeometryAudit: await page.evaluate(() => window.__mathMazeRuntime.auditWorldOneAuthoredGeometryForVerification()),
      inputResponseAudit: await page.evaluate(() => window.__mathMazeRuntime.auditFirstInputResponseForVerification("left")),
      browserErrors
    };
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
  const desktop = await captureDesktop(browser, baseUrl);
  const mobile = await captureMobileMovement(browser, baseUrl);
  const failures = [];
  if (!desktop.audit?.passed || !mobile.audit?.passed) failures.push("collision-audit-failed");
  if (!desktop.fullTraversalAudit?.passed || !mobile.fullTraversalAudit?.passed) failures.push("full-traversal-audit-failed");
  if (!desktop.wallStopTurnAudit?.passed || !mobile.wallStopTurnAudit?.passed) failures.push("wall-stop-turn-audit-failed");
  if (!desktop.authoredGeometryAudit?.passed || !mobile.authoredGeometryAudit?.passed) failures.push("authored-geometry-audit-failed");
  if (!desktop.inputResponseAudit?.passed || !mobile.inputResponseAudit?.passed) failures.push("first-input-response-audit-failed");
  if (desktop.collision?.playerOverlapsWall) failures.push("desktop-player-overlaps-wall");
  if (mobile.afterBlockedLeft?.collision?.playerOverlapsWall) failures.push("blocked-left-entered-wall");
  if (mobile.afterOpenLane?.collision?.playerOverlapsWall) failures.push("open-lane-entered-wall");
  if (mobile.afterOpenVerticalLane?.collision?.playerOverlapsWall) failures.push("open-vertical-lane-entered-wall");
  if (mobile.afterBottomWallStop?.collision?.playerOverlapsWall) failures.push("bottom-wall-stop-entered-wall");
  if (Math.abs((mobile.afterBottomWallStop?.player?.x ?? 0) - 564) > 0.05) failures.push("bottom-wall-stop-missed-lane-center");
  if (Math.abs((mobile.afterBottomWallStop?.player?.y ?? 0) - 636) > 0.05) failures.push("bottom-wall-stop-drifted-cross-axis");
  if (mobile.afterBottomWallTurn?.collision?.playerOverlapsWall) failures.push("bottom-wall-turn-entered-wall");
  if (Math.abs((mobile.afterBottomWallTurn?.player?.x ?? 0) - 564) > 0.05) failures.push("bottom-wall-turn-left-lane-center");
  if ((mobile.afterBottomWallTurn?.player?.y ?? 720) >= 630) failures.push("bottom-wall-legal-turn-stalled");
  if (!mobile.realSwipeRight?.delivered || mobile.realSwipeRight?.player?.desiredDirection !== "right") failures.push("real-swipe-right-not-delivered");
  if (Math.abs((mobile.realSwipeRightRun?.player?.x ?? 0) - 564) > 0.05) failures.push("real-swipe-wall-stop-missed-lane-center");
  if (mobile.realSwipeRightRun?.wallOverlapFrames) failures.push("real-swipe-right-overlapped-wall");
  if (!mobile.realSwipeUp?.delivered || mobile.realSwipeUp?.player?.desiredDirection !== "up") failures.push("real-swipe-up-not-delivered");
  if (Math.abs((mobile.realSwipeUpRun?.player?.x ?? 0) - 564) > 0.05) failures.push("real-swipe-turn-left-lane-center");
  if ((mobile.realSwipeUpRun?.player?.y ?? 720) >= 630) failures.push("real-swipe-legal-turn-stalled");
  if (mobile.realSwipeUpRun?.wallOverlapFrames || mobile.realSwipeUpRun?.collision?.playerOverlapsWall) failures.push("real-swipe-up-overlapped-wall");
  if ((mobile.afterBlockedLeft?.player?.x || 0) < 415) failures.push("blocked-left-crossed-wall-boundary");
  if (Math.abs((mobile.afterBlockedLeft?.player?.y || 0) - 300) > 0.1) failures.push("blocked-left-drifted-vertically");
  if ((mobile.afterOpenLane?.player?.x || 0) < 515) failures.push("open-horizontal-lane-did-not-move");
  if ((mobile.afterOpenVerticalLane?.player?.y || 0) < 350) failures.push("open-vertical-lane-did-not-move");
  if (!mobile.bufferedTurn?.firstVerticalSample) failures.push("buffered-turn-did-not-apply");
  if ((mobile.bufferedTurn?.turnLaneDeviation ?? Number.POSITIVE_INFINITY) > 0.05) failures.push("buffered-turn-left-lane-center");
  if ((mobile.bufferedTurn?.maxStepDistance || 0) > 2.21) failures.push("buffered-turn-jumped");
  if ((mobile.bufferedTurn?.wallOverlapSamples || 0) > 0) failures.push("buffered-turn-overlapped-wall");
  if ((mobile.movingEnemyRun?.wallOverlapFrames || 0) > 0) failures.push("moving-enemy-overlapped-wall");
  if ((mobile.movingEnemyRun?.maxStepDistance || 0) > 3) failures.push("moving-enemy-jumped");
  if (mobile.movingEnemyRun?.actors?.enemies?.some((enemy) => enemy.overlapsWall)) failures.push("moving-enemy-ended-in-wall");
  if (mobile.spawnedActors?.rejected?.length) failures.push("authored-proof-actor-placement-rejected");
  if ((mobile.fullTraversalAudit?.visitedCellCount || 0)
    !== (mobile.fullTraversalAudit?.walkableCellCount || 0)) {
    failures.push("full-traversal-did-not-visit-every-walkable-cell");
  }
  if ((mobile.fullTraversalAudit?.maxTurnResponseFrames ?? Number.POSITIVE_INFINITY) > 1) failures.push("turn-response-exceeded-one-frame");
  if ((mobile.inputResponseAudit?.handlerDurationMs ?? Number.POSITIVE_INFINITY) > 50) failures.push("first-input-handler-too-slow");
  if ((mobile.realSwipeRight?.handlerDurationMs ?? Number.POSITIVE_INFINITY) > 50
    || (mobile.realSwipeUp?.handlerDurationMs ?? Number.POSITIVE_INFINITY) > 50) failures.push("real-swipe-handler-too-slow");
  if ((mobile.framePacing?.medianMs ?? Number.POSITIVE_INFINITY) > 25) failures.push("mobile-frame-pacing-median-too-slow");
  if ((mobile.framePacing?.framesOver50Ms ?? Number.POSITIVE_INFINITY) > 3) failures.push("mobile-frame-pacing-long-frames");
  if (desktop.browserErrors.length || mobile.browserErrors.length) failures.push("browser-errors");
  if (!mobile.videoBytes) failures.push("empty-movement-video");
  const report = {
    generatedAt: new Date().toISOString(),
    desktop,
    mobile,
    failures,
    passed: failures.length === 0
  };
  await writeFile(path.join(outputDir, "proof.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ outputDir: path.relative(root, outputDir), ...report }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
