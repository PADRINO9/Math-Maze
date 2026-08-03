#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "world1-gameplay-flow-fix");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
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

function installErrorCapture(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function preparePage(browser, baseUrl, viewport) {
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
  const browserErrors = installErrorCapture(page);
  await page.goto(`${baseUrl}/?verify=world1-gameplay-flow`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
  await page.waitForFunction(() => Boolean(
    window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.setEnemyMotionStateForVerification
      && window.__mathMazeRuntime?.auditFullMazeTraversalForVerification
  ));
  await page.evaluate(() => {
    const runtime = window.__mathMazeRuntime;
    runtime.forceLevelForVerification(0);
    runtime.resumeLiveGameplayForVerification();
    for (const selector of ["#start-screen", "#end-screen", "#question-dialog", "#pause-screen"]) {
      const element = document.querySelector(selector);
      if (element) {
        element.hidden = true;
        element.classList.remove("screen-visible");
      }
    }
  });
  return { context, page, browserErrors };
}

async function runMobileProof(browser, baseUrl) {
  const { context, page, browserErrors } = await preparePage(browser, baseUrl, {
    width: 390,
    height: 844
  });
  try {
    const result = await page.evaluate(async () => {
      const runtime = window.__mathMazeRuntime;
      const enemyCells = [
        { x: 13, y: 3 },
        { x: 26, y: 3 },
        { x: 3, y: 12 },
        { x: 36, y: 12 },
        { x: 35, y: 24 }
      ];

      runtime.setPlayerCellForVerification(22, 12);
      runtime.setEnemyCellsForVerification(enemyCells);
      runtime.setEnemyMotionStateForVerification(0, { direction: "none", pathCooldown: 5 });
      const immediateRecovery = runtime.stepEnemiesForVerification(1, 1 / 60);

      runtime.setEnemyCellsForVerification(enemyCells);
      runtime.setEnemyMotionStateForVerification(0, { direction: "none", pathCooldown: 5 });
      const startPlayer = runtime.getPlayerSnapshot();
      const startCollision = runtime.getMazeCollisionSnapshot();
      const geometryAudit = runtime.auditWorldOneAuthoredGeometryForVerification();
      const traversalAudit = runtime.auditFullMazeTraversalForVerification();
      const wallTurnAudit = runtime.auditWallStopTurnsForVerification();

      const canvas = document.querySelector("#game-canvas");
      const stream = canvas.captureStream(0);
      const videoTrack = stream.getVideoTracks()[0];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";
      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      const recordingPromise = new Promise((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: mimeType });
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          const chunkSize = 0x8000;
          for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
          }
          resolve({ base64: btoa(binary), size: bytes.length, mimeType });
        };
      });
      recorder.start(120);
      videoTrack?.requestFrame?.();

      const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      for (let index = 0; index < 6; index += 1) await nextFrame();
      const stage = document.querySelector(".stage");
      const rect = stage.getBoundingClientRect();
      const eventInit = {
        bubbles: true,
        cancelable: true,
        pointerId: 77,
        pointerType: "touch",
        isPrimary: true,
        buttons: 1
      };
      const startX = rect.left + rect.width * 0.42;
      const startY = rect.top + rect.height * 0.56;
      stage.dispatchEvent(new PointerEvent("pointerdown", {
        ...eventInit,
        clientX: startX,
        clientY: startY
      }));
      stage.dispatchEvent(new PointerEvent("pointermove", {
        ...eventInit,
        clientX: startX + 86,
        clientY: startY
      }));
      stage.dispatchEvent(new PointerEvent("pointerup", {
        ...eventInit,
        buttons: 0,
        clientX: startX + 86,
        clientY: startY
      }));

      let previousPlayer = runtime.getPlayerSnapshot();
      let maxPlayerStep = 0;
      const enemyStats = Array.from({ length: enemyCells.length }, () => ({
        travel: 0,
        stationaryFrames: 0,
        longestStationaryRun: 0,
        overlapFrames: 0
      }));
      let previousEnemies = runtime.getActorCollisionSnapshotForVerification().enemies.slice(0, enemyCells.length);
      let sampledFrames = 0;
      const recordingStartedAt = performance.now();

      for (let frame = 0; frame < 240; frame += 1) {
        await nextFrame();
        videoTrack?.requestFrame?.();
        const player = runtime.getPlayerSnapshot();
        maxPlayerStep = Math.max(
          maxPlayerStep,
          Math.hypot(player.x - previousPlayer.x, player.y - previousPlayer.y)
        );
        previousPlayer = player;
        const enemies = runtime.getActorCollisionSnapshotForVerification().enemies.slice(0, enemyCells.length);
        enemies.forEach((enemy, index) => {
          const previous = previousEnemies[index] || enemy;
          const distance = Math.hypot(enemy.x - previous.x, enemy.y - previous.y);
          const stats = enemyStats[index];
          stats.travel += distance;
          if (distance < 0.05) {
            stats.stationaryFrames += 1;
            stats.longestStationaryRun = Math.max(
              stats.longestStationaryRun,
              stats.stationaryFrames
            );
          } else {
            stats.stationaryFrames = 0;
          }
          if (enemy.overlapsWall) stats.overlapFrames += 1;
        });
        previousEnemies = enemies;
        sampledFrames += 1;
        if (player.x >= 660 && performance.now() - recordingStartedAt >= 4200) break;
      }

      videoTrack?.requestFrame?.();
      recorder.stop();
      const recording = await recordingPromise;
      const endPlayer = runtime.getPlayerSnapshot();
      const endCollision = runtime.getMazeCollisionSnapshot();
      runtime.setPlayerCellForVerification(24, 12);
      return {
        startPlayer,
        endPlayer,
        maxPlayerStep,
        sampledFrames,
        immediateRecovery,
        enemyStats,
        startCollision,
        endCollision,
        geometryAudit,
        traversalAudit,
        wallTurnAudit,
        recording
      };
    });

    await page.waitForTimeout(300);
    const screenshot = path.join(outputDir, "mobile-390x844-corridor-after.png");
    await page.screenshot({ path: screenshot });
    const video = path.join(outputDir, "mobile-live-corridor-and-ghosts-after.webm");
    await writeFile(video, Buffer.from(result.recording.base64, "base64"));
    delete result.recording.base64;

    const corridorOpen = result.startCollision.grid[12][23] === "0"
      && result.startCollision.grid[12][24] === "0";
    const ghostsMove = result.enemyStats.every((stats) => (
      stats.travel > 30
        && stats.longestStationaryRun <= 3
        && stats.overlapFrames === 0
    ));
    const passed = corridorOpen
      && result.startPlayer.speed === 148
      && result.endPlayer.x >= 660
      && result.maxPlayerStep <= 5
      && result.immediateRecovery.maxStepDistance > 1
      && result.immediateRecovery.wallOverlapFrames === 0
      && ghostsMove
      && result.geometryAudit.passed
      && result.traversalAudit.passed
      && result.wallTurnAudit.passed
      && result.recording.size > 10_000
      && browserErrors.length === 0;

    return {
      viewport: { width: 390, height: 844 },
      screenshot,
      video,
      browserErrors,
      ...result,
      corridorOpen,
      ghostsMove,
      passed
    };
  } finally {
    await context.close();
  }
}

async function runDesktopProof(browser, baseUrl) {
  const { context, page, browserErrors } = await preparePage(browser, baseUrl, {
    width: 1280,
    height: 720
  });
  try {
    const result = await page.evaluate(() => {
      const runtime = window.__mathMazeRuntime;
      runtime.setPlayerCellForVerification(24, 12);
      runtime.setEnemyCellsForVerification([
        { x: 13, y: 3 },
        { x: 26, y: 3 },
        { x: 3, y: 12 },
        { x: 36, y: 12 }
      ]);
      return {
        player: runtime.getPlayerSnapshot(),
        collision: runtime.getMazeCollisionSnapshot(),
        geometryAudit: runtime.auditWorldOneAuthoredGeometryForVerification()
      };
    });
    await page.waitForTimeout(350);
    const screenshot = path.join(outputDir, "desktop-1280x720-corridor-after.png");
    await page.screenshot({ path: screenshot });
    return {
      viewport: { width: 1280, height: 720 },
      screenshot,
      browserErrors,
      ...result,
      passed: result.player.speed === 148
        && result.collision.grid[12][23] === "0"
        && result.collision.grid[12][24] === "0"
        && result.geometryAudit.passed
        && browserErrors.length === 0
    };
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });
const server = staticServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

try {
  const mobile = await runMobileProof(browser, baseUrl);
  const desktop = await runDesktopProof(browser, baseUrl);
  const report = {
    generatedAt: new Date().toISOString(),
    outputDir,
    mobile,
    desktop,
    passed: mobile.passed && desktop.passed
  };
  const reportPath = path.join(outputDir, "proof.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
