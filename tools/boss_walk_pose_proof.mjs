#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.KAFLUL_BASE_URL || "http://127.0.0.1:4178";
const outputDir = path.resolve("docs/visual-proof-screenshots/boss-encounter/boss-walk-poses");
const phases = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "he-IL" });
await page.exposeFunction("saveBossPose", async (outputPath, base64) => {
  await writeFile(outputPath, Buffer.from(base64, "base64"));
});
await page.addInitScript(() => {
  localStorage.setItem("mathMazeCharacter", "bifly");
  localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
  localStorage.setItem("mathMazeTimeLimit", "off");
});

async function captureBossCrop(camera, outputPath) {
  await page.evaluate(async ({ outputPath: targetPath, boss, projectionWidth, projectionHeight }) => {
    const source = document.querySelector("#game-canvas");
    const bossX = boss.x * source.width / projectionWidth;
    const bossY = boss.y * source.height / projectionHeight;
    const cropSourceWidth = 220 * source.width / projectionWidth;
    const cropSourceHeight = 230 * source.height / projectionHeight;
    const crop = document.createElement("canvas");
    crop.width = 440;
    crop.height = 460;
    const cropContext = crop.getContext("2d", { alpha: false });
    cropContext.drawImage(
      source,
      bossX - cropSourceWidth / 2,
      bossY - cropSourceHeight * 0.63,
      cropSourceWidth,
      cropSourceHeight,
      0,
      0,
      crop.width,
      crop.height
    );
    await window.saveBossPose(targetPath, crop.toDataURL("image/png").split(",")[1]);
  }, {
    outputPath,
    boss: camera.boss,
    projectionWidth: camera.projectionWidth,
    projectionHeight: camera.projectionHeight
  });
}

try {
  await page.goto(`${baseUrl}/?verify=boss-walk-poses`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 15_000 });
  await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady);
  await page.locator("#start-button").click();
  await page.locator("#start-screen").waitFor({ state: "hidden" });
  await page.evaluate(() => {
    const runtime = window.__mathMazeRuntime;
    runtime.forceLevelForVerification(0);
    runtime.forceBossChallenge();
    runtime.completeBossCinematicForVerification();
    runtime.setPlayerCellForVerification(34, 23);
    runtime.setBossCellForVerification(24, 23);
    runtime.setBossWalkPoseForVerification(0, "right", 0);
  });
  await page.waitForTimeout(220);

  const frames = [];
  for (let index = 0; index < phases.length; index += 1) {
    const camera = await page.evaluate(({ phase, impact }) => {
      const runtime = window.__mathMazeRuntime;
      runtime.setBossWalkPoseForVerification(phase, "right", impact);
      return runtime.getBossCameraSnapshotForVerification();
    }, { phase: phases[index], impact: index % 2 === 0 ? 0.75 : 0 });
    await page.waitForTimeout(60);
    const outputPath = path.join(outputDir, `boss-walk-pose-${index + 1}.png`);
    await captureBossCrop(camera, outputPath);
    frames.push({ outputPath, camera });
  }

  const stageFrames = [];
  const directions = ["down", "right", "up", "left"];
  for (let levelIndex = 0; levelIndex < 4; levelIndex += 1) {
    for (const direction of directions) {
      const snapshot = await page.evaluate(({ requestedLevel, direction: requestedDirection }) => {
        const runtime = window.__mathMazeRuntime;
        runtime.forceLevelForVerification(requestedLevel);
        runtime.forceBossChallenge();
        runtime.completeBossCinematicForVerification();
        runtime.setPlayerCellForVerification(34, 23);
        runtime.setBossCellForVerification(24, 23);
        const boss = runtime.setBossWalkPoseForVerification(Math.PI / 2, requestedDirection, 0.4);
        return { boss, camera: runtime.getBossCameraSnapshotForVerification() };
      }, { requestedLevel: levelIndex, direction });
      await page.waitForTimeout(70);
      const outputPath = path.join(outputDir, `boss-stage-${levelIndex + 1}-${direction}.png`);
      await captureBossCrop(snapshot.camera, outputPath);
      stageFrames.push({ levelIndex, direction, outputPath, boss: snapshot.boss });
    }
  }
  console.log(JSON.stringify({ frames, stageFrames }, null, 2));
} finally {
  await browser.close();
}
