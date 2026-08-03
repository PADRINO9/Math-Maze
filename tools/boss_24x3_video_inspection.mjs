#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proofDir = path.join(root, "docs", "visual-proof-screenshots", "boss-24x3", "after");
const outputDir = path.join(proofDir, "video-inspection");
const videos = [
  { key: "stage-1-ice", file: "stage-1-ice-boss-24x3-390x844.webm" },
  { key: "stage-2-lava", file: "stage-2-lava-boss-24x3-390x844.webm" },
  { key: "stage-3-ancient", file: "stage-3-ancient-boss-24x3-390x844.webm" },
  { key: "stage-4-diamond", file: "stage-4-diamond-boss-24x3-390x844.webm" }
];

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const filePath = await resolveStaticFile(root, url.pathname);
    response.writeHead(200, {
      "content-type": path.extname(filePath) === ".webm" ? "video/webm" : "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404).end();
  }
});

await mkdir(outputDir, { recursive: true });
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const inspections = [];

try {
  for (const videoSpec of videos) {
    const context = await browser.newContext({ viewport: { width: 900, height: 1240 } });
    const page = await context.newPage();
    await page.setContent(`<!doctype html><html dir="rtl"><style>
      *{box-sizing:border-box}body{margin:0;padding:20px;background:#050712;color:white;font-family:system-ui,sans-serif}
      h1{margin:0 0 16px;text-align:center;font-size:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      figure{margin:0;padding:8px;background:#10172a;border:1px solid #30476e;border-radius:12px}
      canvas{display:block;width:100%;height:auto;border-radius:8px;background:#000}figcaption{text-align:center;padding-top:6px;font-weight:800}
    </style><h1>${videoSpec.key} · video frame inspection</h1><div id="grid" class="grid"></div></html>`);
    const source = `${baseUrl}/docs/visual-proof-screenshots/boss-24x3/after/${videoSpec.file}`;
    const metadata = await page.evaluate(async ({ sourceUrl }) => {
      const fractions = [0.08, 0.28, 0.48, 0.68, 0.88];
      const video = document.createElement("video");
      video.src = sourceUrl;
      video.muted = true;
      video.playsInline = true;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("video metadata failed"));
      });
      video.playbackRate = 4;
      const grid = document.querySelector("#grid");
      for (const fraction of fractions) {
        const targetTime = Math.max(0, Math.min(video.duration - 0.05, video.duration * fraction));
        await video.play();
        await new Promise((resolve) => {
          const check = () => video.currentTime >= targetTime ? resolve() : requestAnimationFrame(check);
          check();
        });
        video.pause();
        const figure = document.createElement("figure");
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const label = document.createElement("figcaption");
        label.textContent = `${(video.currentTime).toFixed(1)}s · ${Math.round(fraction * 100)}%`;
        figure.append(canvas, label);
        grid.append(figure);
      }
      return {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        frameCount: fractions.length
      };
    }, { sourceUrl: source });
    const screenshot = path.join(outputDir, `${videoSpec.key}-contact-sheet.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    inspections.push({ ...videoSpec, source, screenshot, ...metadata });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const reportPath = path.join(outputDir, "video-inspection-report.json");
await writeFile(reportPath, `${JSON.stringify({ passed: inspections.length === videos.length, inspections }, null, 2)}\n`);
console.log(JSON.stringify({ passed: inspections.length === videos.length, reportPath, inspections }, null, 2));
