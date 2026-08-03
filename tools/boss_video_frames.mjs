#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.KAFLUL_BASE_URL || "http://127.0.0.1:4178";
const videoName = process.env.KAFLUL_BOSS_VIDEO_NAME || "kaflul-boss-walk-polished.webm";
const outputDir = path.resolve("docs/visual-proof-screenshots/boss-encounter/boss-walk-frames");
const videoUrl = `${baseUrl}/docs/visual-proof-screenshots/boss-encounter/${videoName}`;
const sampleTimes = process.env.KAFLUL_BOSS_FRAME_TIMES
  ? process.env.KAFLUL_BOSS_FRAME_TIMES.split(",").map(Number).filter(Number.isFinite)
  : [0.35, 0.8, 1.25, 1.7, 2.2, 3.25, 4.15];
const framePrefix = process.env.KAFLUL_BOSS_FRAME_PREFIX || "boss-walk";
const frameWidth = Math.max(320, Number(process.env.KAFLUL_BOSS_FRAME_WIDTH) || 432);
const frameHeight = Math.max(320, Number(process.env.KAFLUL_BOSS_FRAME_HEIGHT) || 848);
const playbackMode = process.env.KAFLUL_BOSS_FRAME_PLAYBACK === "1";

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: frameWidth + 88, height: frameHeight + 92 } });

try {
  await page.setContent(`
    <style>
      html, body { margin: 0; background: #050810; min-height: 100%; display: grid; place-items: center; }
      video { display: block; width: ${frameWidth}px; height: ${frameHeight}px; object-fit: contain; }
    </style>
    <video id="proof" muted playsinline preload="auto" src="${videoUrl}"></video>
  `);
  await page.locator("#proof").evaluate((video) => new Promise((resolve, reject) => {
    if (video.readyState >= 1) return resolve();
    video.addEventListener("loadedmetadata", resolve, { once: true });
    video.addEventListener("error", () => reject(new Error("Unable to load proof video")), { once: true });
  }));

  const duration = await page.locator("#proof").evaluate((video) => video.duration);
  const frames = [];
  let previousTime = 0;
  if (playbackMode) {
    await page.locator("#proof").evaluate(async (video) => {
      video.currentTime = 0;
      await video.play();
    });
  }
  for (let index = 0; index < sampleTimes.length; index += 1) {
    const time = Math.min(sampleTimes[index], Math.max(0, duration - 0.05));
    if (playbackMode) {
      await page.waitForTimeout(Math.max(0, sampleTimes[index] - previousTime) * 1000);
      previousTime = sampleTimes[index];
    } else {
      await page.locator("#proof").evaluate((video, seekTime) => new Promise((resolve) => {
        video.addEventListener("seeked", resolve, { once: true });
        video.currentTime = seekTime;
      }), time);
    }
    const outputPath = path.join(outputDir, `${framePrefix}-${String(index + 1).padStart(2, "0")}-${time.toFixed(2)}s.png`);
    await page.locator("#proof").screenshot({ path: outputPath });
    frames.push(outputPath);
  }
  console.log(JSON.stringify({ videoUrl, duration, frames }, null, 2));
} finally {
  await browser.close();
}
