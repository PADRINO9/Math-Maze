#!/usr/bin/env node

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "player-gameplay-animation");
const recordingFramesDir = path.join(outputDir, "recording-frames");
const videoPath = path.join(outputDir, "kaflul-blue-green-maze-animation.mp4");
const execFileAsync = promisify(execFile);
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

async function openGame(browser, baseUrl, viewport, characterId) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    reducedMotion: viewport.reducedMotion ? "reduce" : "no-preference"
  });
  await context.addInitScript(({ selectedCharacter }) => {
    localStorage.setItem("mathMazeCharacter", selectedCharacter);
    localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
    localStorage.setItem("mathMazeTimeLimit", "off");
  }, { selectedCharacter: characterId });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${baseUrl}/?verify=player-gameplay-animation&verifyLevel=0`, {
    waitUntil: "domcontentloaded"
  });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
  await page.waitForFunction(() => Boolean(
    window.__mathMazeRuntime?.gameReady
    && window.__mathMazeRuntime?.setPlayerCharacterForVerification
    && window.__mathMazeRuntime?.getPlayerMazeAnimationSnapshotForVerification
    && window.__mathMazeRuntime?.stagePlayerCollectibleForVerification
    && window.__mathMazeRuntime?.getPlayerCanvasPointForVerification
  ));
  return { context, page, errors };
}

async function captureScreenshot(browser, baseUrl, viewport, characterId) {
  const session = await openGame(browser, baseUrl, viewport, characterId);
  const { context, page, errors } = session;
  try {
    const setup = await page.evaluate(({ selectedCharacter }) => {
      const runtime = window.__mathMazeRuntime;
      runtime.forceLevelForVerification(0);
      runtime.setEnemyCellsForVerification([]);
      runtime.setPlayerCharacterForVerification(selectedCharacter);
      runtime.setPlayerCellForVerification(17, 23);
      runtime.stagePlayerCollectibleForVerification("standard", 20, 23);
      runtime.resumeLiveGameplayForVerification();
      runtime.setPlayerInvulnerabilityForVerification(0);
      runtime.setPlayerDirectionForVerification("right");
      return runtime.getPlayerMazeAnimationSnapshotForVerification();
    }, { selectedCharacter: characterId });
    await page.waitForTimeout(420);
    const screenshotPath = path.join(outputDir, `${viewport.key}-${characterId}-after.png`);
    await page.screenshot({ path: screenshotPath });
    const animation = await page.evaluate(() => window.__mathMazeRuntime.getPlayerMazeAnimationSnapshotForVerification());
    return {
      viewport,
      characterId,
      screenshot: path.relative(root, screenshotPath),
      setup,
      animation,
      errors,
      passed: errors.length === 0
        && animation.characterId === characterId
        && animation.displayScaleBoost > 1
        && animation.maximumMovingBouncePx <= 1
        && animation.maximumSquash <= 0.03
    };
  } finally {
    await context.close();
  }
}

async function captureCombinedVideo(browser, baseUrl) {
  const session = await openGame(browser, baseUrl, {
    key: "desktop-video",
    width: 1280,
    height: 800,
    mobile: false,
    reducedMotion: true
  }, "bifly");
  const { context, page, errors } = session;
  try {
    await mkdir(recordingFramesDir, { recursive: true });
    const pickupPolicy = await page.evaluate(() => {
      const runtime = window.__mathMazeRuntime;
      runtime.forceLevelForVerification(0);
      runtime.setEnemyCellsForVerification([]);
      runtime.resumeLiveGameplayForVerification();
      runtime.setPlayerInvulnerabilityForVerification(0);

      const pickupPolicy = {};
      for (const characterId of ["bifly", "nabatick"]) {
        pickupPolicy[characterId] = {};
        runtime.setPlayerCharacterForVerification(characterId);
        for (const kind of ["standard", "bonus-letter", "bonus-key", "boss-core"]) {
          pickupPolicy[characterId][kind] = runtime.collectPlayerItemNowForVerification(kind);
        }
      }
      return pickupPolicy;
    });

    await page.evaluate(() => {
      const runtime = window.__mathMazeRuntime;
      runtime.forceLevelForVerification(0);
      runtime.setEnemyCellsForVerification([]);
      runtime.beginDeterministicPlayerCaptureForVerification();
      const sourceCanvas = document.querySelector("#game-canvas");
      const proofCanvas = document.createElement("canvas");
      proofCanvas.id = "player-proof-canvas";
      proofCanvas.width = 432;
      proofCanvas.height = 432;
      Object.assign(proofCanvas.style, {
        position: "fixed",
        inset: "0 auto auto 0",
        width: "432px",
        height: "432px",
        zIndex: "999999",
        pointerEvents: "none"
      });
      document.body.append(proofCanvas);
      const proofContext = proofCanvas.getContext("2d", { alpha: false });
      proofContext.imageSmoothingEnabled = true;
      proofContext.imageSmoothingQuality = "high";

      let activeLabel = "";
      const drawProofFrame = () => {
        const point = runtime.getPlayerCanvasPointForVerification();
        const cropSize = Math.min(sourceCanvas.width, sourceCanvas.height) * 0.46;
        const sourceX = Math.max(0, Math.min(sourceCanvas.width - cropSize, point.x - cropSize / 2));
        const sourceY = Math.max(0, Math.min(sourceCanvas.height - cropSize, point.y - cropSize / 2));
        proofContext.fillStyle = "#050810";
        proofContext.fillRect(0, 0, proofCanvas.width, proofCanvas.height);
        proofContext.drawImage(
          sourceCanvas,
          sourceX,
          sourceY,
          cropSize,
          cropSize,
          0,
          0,
          proofCanvas.width,
          proofCanvas.height
        );
        proofContext.fillStyle = "rgba(4, 9, 20, 0.82)";
        proofContext.beginPath();
        proofContext.roundRect(66, 12, 300, 44, 20);
        proofContext.fill();
        proofContext.strokeStyle = "rgba(255,255,255,0.24)";
        proofContext.lineWidth = 2;
        proofContext.stroke();
        proofContext.direction = "rtl";
        proofContext.textAlign = "center";
        proofContext.textBaseline = "middle";
        proofContext.fillStyle = "#ffffff";
        proofContext.font = "700 20px Arial, sans-serif";
        proofContext.fillText(activeLabel, 216, 34);
      };

      window.__playerProofCapture = {
        setupCharacter(characterId, label) {
          activeLabel = label;
          runtime.setPlayerCharacterForVerification(characterId);
          runtime.setPlayerCellForVerification(2, 23);
          runtime.stagePlayerCollectibleForVerification("standard", 5, 23);
          runtime.setPlayerInvulnerabilityForVerification(0);
        },
        step(direction) {
          const sample = runtime.advancePlayerAnimationFrameForVerification(direction, 1 / 30);
          drawProofFrame();
          return {
            eating: sample.animation.eating,
            moving: sample.animation.moving,
            frame: sample.animation.frame,
            stepPx: sample.stepPx
          };
        },
        finish() {
          return runtime.endDeterministicPlayerCaptureForVerification();
        }
      };
    });

    const proofCanvas = page.locator("#player-proof-canvas");
    const sequences = [];
    let frameIndex = 0;
    for (const definition of [
      { id: "bifly", label: "ביפלי הכחול — תנועה ואכילה" },
      { id: "nabatick", label: "נבטיק הירוק — תנועה ואכילה" }
    ]) {
      await page.evaluate(({ characterId, label }) => {
        window.__playerProofCapture.setupCharacter(characterId, label);
      }, { characterId: definition.id, label: definition.label });
      const samples = [];
      for (const phase of [
        { direction: "none", frames: 10 },
        { direction: "right", frames: 61 },
        { direction: "none", frames: 10 }
      ]) {
        for (let frame = 0; frame < phase.frames; frame += 1) {
          samples.push(await page.evaluate((direction) => (
            window.__playerProofCapture.step(direction)
          ), phase.direction));
          const framePath = path.join(recordingFramesDir, `frame-${String(frameIndex).padStart(4, "0")}.png`);
          await proofCanvas.screenshot({ path: framePath });
          frameIndex += 1;
        }
      }
      sequences.push({
        characterId: definition.id,
        sampleCount: samples.length,
        eatingFrames: samples.filter((sample) => sample.eating).length,
        movingNonEatingFrames: samples.filter((sample) => sample.moving && !sample.eating).length,
        maximumStepPx: Math.max(...samples.map((sample) => sample.stepPx)),
        frames: [...new Set(samples.map((sample) => sample.frame))]
      });
    }
    const finalAnimation = await page.evaluate(() => window.__playerProofCapture.finish());
    const playbackFps = 30;
    const encoder = await execFileAsync("/usr/bin/swift", [
      path.join(root, "tools", "encode_png_sequence.swift"),
      recordingFramesDir,
      videoPath,
      String(playbackFps)
    ], { maxBuffer: 1024 * 1024 * 4 });
    const videoStats = await stat(videoPath);
    const pickupPolicyPassed = Object.values(pickupPolicy).every((policy) => (
      policy.standard.eating
      && !policy["bonus-letter"].eating
      && !policy["bonus-key"].eating
      && !policy["boss-core"].eating
    ));
    const sequencesPassed = sequences.every((sequence) => (
      sequence.eatingFrames > 0
      && sequence.movingNonEatingFrames > 8
      && sequence.maximumStepPx <= 6.2
      && sequence.frames.includes("eat")
      && sequence.frames.includes("idle")
    ));
    return {
      video: path.relative(root, videoPath),
      videoBytes: videoStats.size,
      pickupPolicy,
      sequences,
      renderedFrameCount: frameIndex,
      playbackFps,
      durationSeconds: frameIndex / playbackFps,
      encoder: encoder.stdout.trim(),
      finalAnimation,
      errors,
      passed: errors.length === 0
        && videoStats.size > 100_000
        && frameIndex === 162
        && playbackFps === 30
        && pickupPolicyPassed
        && sequencesPassed
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
const browser = await chromium.launch({
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows"
  ]
});

try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const screenshots = [];
  for (const viewport of [
    { key: "desktop-1280x800", width: 1280, height: 800, mobile: false },
    { key: "mobile-390x844", width: 390, height: 844, mobile: true }
  ]) {
    for (const characterId of ["bifly", "nabatick"]) {
      screenshots.push(await captureScreenshot(browser, baseUrl, viewport, characterId));
    }
  }
  const video = await captureCombinedVideo(browser, baseUrl);
  const report = {
    generatedAt: new Date().toISOString(),
    screenshots,
    video,
    passed: screenshots.every((item) => item.passed) && video.passed
  };
  const reportPath = path.join(outputDir, "proof.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    outputDir: path.relative(root, outputDir),
    reportPath: path.relative(root, reportPath),
    screenshots: screenshots.map((item) => ({
      viewport: item.viewport.key,
      characterId: item.characterId,
      screenshot: item.screenshot,
      passed: item.passed
    })),
    video: {
      path: video.video,
      videoBytes: video.videoBytes,
      sequences: video.sequences,
      passed: video.passed
    },
    passed: report.passed
  }, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
