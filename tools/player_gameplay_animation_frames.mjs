#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proofDir = path.join(root, "docs", "visual-proof-screenshots", "player-gameplay-animation");
const frameDir = path.join(proofDir, "video-frames");
const videoName = "kaflul-blue-green-maze-animation.mp4";
const sampleTimes = [0.25, 0.75, 0.9, 1.25, 2.95, 3.4, 3.62, 4.85];

await mkdir(frameDir, { recursive: true });
const videoPath = path.join(proofDir, videoName);
const videoUrl = `data:video/mp4;base64,${(await readFile(videoPath)).toString("base64")}`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 496, height: 496 } });
  await page.setContent(`
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #050810; display: grid; place-items: center; }
      video { display: block; width: 432px; height: 432px; object-fit: contain; }
    </style>
    <video id="proof" muted playsinline preload="auto" src="${videoUrl}"></video>
  `);
  await page.locator("#proof").evaluate((video) => new Promise((resolve, reject) => {
    if (video.readyState >= 1) return resolve();
    video.addEventListener("loadedmetadata", resolve, { once: true });
    video.addEventListener("error", () => reject(new Error("Unable to load proof video")), { once: true });
  }));
  const duration = await page.locator("#proof").evaluate((video) => Number.isFinite(video.duration) ? video.duration : null);
  const frames = [];
  for (let index = 0; index < sampleTimes.length; index += 1) {
    const time = sampleTimes[index];
    await page.locator("#proof").evaluate((video, targetTime) => new Promise((resolve, reject) => {
      const onSeeked = () => resolve();
      const onError = () => reject(new Error(`Unable to seek proof video to ${targetTime}s`));
      video.pause();
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onError, { once: true });
      video.currentTime = targetTime;
    }), time);
    const outputPath = path.join(frameDir, `player-animation-${String(index + 1).padStart(2, "0")}-${time.toFixed(2)}s.png`);
    await page.locator("#proof").screenshot({ path: outputPath });
    frames.push(path.relative(root, outputPath));
  }
  const report = { video: path.relative(root, path.join(proofDir, videoName)), duration, frames };
  await writeFile(path.join(frameDir, "frames.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
