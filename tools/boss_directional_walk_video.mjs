#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.KAFLUL_BASE_URL || "http://127.0.0.1:4178";
const outputPath = path.resolve(
  process.env.KAFLUL_BOSS_DIRECTION_VIDEO_OUTPUT
    || "docs/visual-proof-screenshots/boss-encounter/kaflul-all-bosses-directional-walk.webm"
);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: "he-IL"
});
await context.addInitScript(() => {
  localStorage.setItem("mathMazeCharacter", "bifly");
  localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
  localStorage.setItem("mathMazeTimeLimit", "off");
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await page.exposeFunction("saveDirectionalBossVideo", async (base64) => {
  await writeFile(outputPath, Buffer.from(base64, "base64"));
});

try {
  await page.goto(`${baseUrl}/?verify=boss-directional-video`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 15_000 });
  await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady);
  await page.locator("#start-button").click();
  await page.locator("#start-screen").waitFor({ state: "hidden" });

  const report = await page.evaluate(async () => {
    const runtime = window.__mathMazeRuntime;
    const source = document.querySelector("#game-canvas");
    const proofCanvas = document.createElement("canvas");
    proofCanvas.width = 640;
    proofCanvas.height = 640;
    const proofContext = proofCanvas.getContext("2d", { alpha: false });
    proofContext.imageSmoothingEnabled = true;
    proofContext.imageSmoothingQuality = "high";

    let copyingFrames = true;
    const copyFrame = () => {
      const camera = runtime.getBossCameraSnapshotForVerification();
      const boss = camera?.boss;
      const scaleX = source.width / (camera?.projectionWidth || 960);
      const scaleY = source.height / (camera?.projectionHeight || 720);
      const cropWidth = 230 * scaleX;
      const cropHeight = 230 * scaleY;
      const centerX = boss ? boss.x * scaleX : source.width / 2;
      const centerY = boss ? (boss.y - 12) * scaleY : source.height / 2;
      const cropX = Math.max(0, Math.min(source.width - cropWidth, centerX - cropWidth / 2));
      const cropY = Math.max(0, Math.min(source.height - cropHeight, centerY - cropHeight / 2));
      proofContext.fillStyle = "#05070b";
      proofContext.fillRect(0, 0, proofCanvas.width, proofCanvas.height);
      proofContext.drawImage(
        source,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        proofCanvas.width,
        proofCanvas.height
      );
      if (copyingFrames) requestAnimationFrame(copyFrame);
    };
    copyFrame();

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const stream = proofCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_500_000
    });
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    const stopped = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
    const stages = [];

    recorder.start(180);
    for (let levelIndex = 0; levelIndex < 4; levelIndex += 1) {
      runtime.forceLevelForVerification(levelIndex);
      runtime.forceBossChallenge();
      runtime.completeBossCinematicForVerification();
      await new Promise((resolve) => setTimeout(resolve, 320));
      runtime.setPlayerCellForVerification(34, 23);
      runtime.setBossCellForVerification(24, 23);
      runtime.clearFloatingTextsForVerification();
      await new Promise((resolve) => setTimeout(resolve, 180));
      const before = runtime.getBossSnapshot();
      await new Promise((resolve) => setTimeout(resolve, 1550));
      const after = runtime.getBossSnapshot();
      stages.push({ levelIndex, before, after });
    }
    recorder.stop();
    await stopped;
    copyingFrames = false;

    const blob = new Blob(chunks, { type: mimeType });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const stride = 0x8000;
    for (let index = 0; index < bytes.length; index += stride) {
      binary += String.fromCharCode(...bytes.subarray(index, index + stride));
    }
    await window.saveDirectionalBossVideo(btoa(binary));
    stream.getTracks().forEach((track) => track.stop());
    return { stages, mimeType, byteLength: bytes.length };
  });

  const passed = errors.length === 0
    && report.stages.length === 4
    && report.stages.every(({ before, after }) => (
      before?.actorFacing === before?.direction
      && after?.actorFacing === after?.direction
      && (before?.moving || after?.moving)
    ))
    && report.byteLength > 250_000;
  console.log(JSON.stringify({ passed, outputPath, errors, report }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
