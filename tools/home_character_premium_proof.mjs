#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const label = process.argv.find((argument) => argument.startsWith("--label="))?.split("=")[1] || "after";
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "home-character-premium", label);
const videoDir = path.join(outputDir, "raw-video");
const proofResults = [];
const contentTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".webm": "video/webm"
};
const viewports = [
  { key: "desktop-1280x720", width: 1280, height: 720, mobile: false },
  { key: "mobile-390x844", width: 390, height: 844, mobile: true }
];

function staticServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const file = await resolveStaticFile(root, url.pathname);
      const bytes = await readFile(file);
      const contentType = contentTypes[path.extname(file)] || "application/octet-stream";
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || "");
      if (range) {
        const start = Math.min(Number(range[1]), bytes.length - 1);
        const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
        const chunk = bytes.subarray(start, end + 1);
        response.writeHead(206, {
          "content-type": contentType,
          "content-length": chunk.length,
          "content-range": `bytes ${start}-${end}/${bytes.length}`,
          "accept-ranges": "bytes",
          "cache-control": "no-store"
        });
        response.end(chunk);
        return;
      }
      response.writeHead(200, { "content-type": contentType, "content-length": bytes.length, "accept-ranges": "bytes", "cache-control": "no-store" });
      response.end(bytes);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

async function capture(browser, baseUrl, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    reducedMotion: "no-preference",
    recordVideo: { dir: videoDir, size: { width: viewport.width, height: viewport.height } }
  });
  await context.addInitScript(() => localStorage.setItem("mathMazeCharacter", "bifly"));
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outputDir, `${viewport.key}-bifly.png`) });
  await page.locator(".menu-character-nabatick").click();
  await page.waitForTimeout(90);
  const nabatickReaction = await page.evaluate(() => {
    const card = document.querySelector(".menu-character-nabatick");
    const image = card?.querySelector("img[data-character-state]");
    return {
      checked: Boolean(card?.querySelector("input")?.checked),
      selectedCharacter: document.documentElement.dataset.character,
      reaction: card?.querySelector(".character-card")?.dataset.reaction || "",
      imageState: image?.dataset.characterState || "",
      animationName: image ? getComputedStyle(image).animationName : ""
    };
  });
  await page.waitForTimeout(760);
  await page.screenshot({ path: path.join(outputDir, `${viewport.key}-nabatick.png`) });
  await page.locator(".menu-character-bifly").click();
  await page.waitForTimeout(90);
  const biflyReaction = await page.evaluate(() => {
    const card = document.querySelector(".menu-character-bifly");
    const image = card?.querySelector("img[data-character-state]");
    return {
      checked: Boolean(card?.querySelector("input")?.checked),
      selectedCharacter: document.documentElement.dataset.character,
      reaction: card?.querySelector(".character-card")?.dataset.reaction || "",
      imageState: image?.dataset.characterState || "",
      animationName: image ? getComputedStyle(image).animationName : ""
    };
  });
  await page.waitForTimeout(2510);
  const settled = await page.evaluate(() => {
    const selected = document.querySelector(".menu-character input:checked")?.closest(".menu-character");
    const image = selected?.querySelector("img[data-character-state]");
    return {
      reaction: selected?.querySelector(".character-card")?.dataset.reaction || "",
      imageState: image?.dataset.characterState || "",
      animationName: image ? getComputedStyle(image).animationName : ""
    };
  });
  const video = page.video();
  await page.close();
  let videoTarget = null;
  if (video) {
    const source = await video.path();
    videoTarget = path.join(outputDir, `${viewport.key}-selection.webm`);
    await rename(source, videoTarget);
  }
  await context.close();
  const passed = nabatickReaction.checked
    && nabatickReaction.selectedCharacter === "nabatick"
    && nabatickReaction.reaction === "selected"
    && nabatickReaction.animationName.includes("premiumNabatickSelect")
    && biflyReaction.checked
    && biflyReaction.selectedCharacter === "bifly"
    && biflyReaction.reaction === "selected"
    && biflyReaction.animationName.includes("premiumBiflySelect")
    && settled.reaction === "idle"
    && settled.imageState === "idle"
    && settled.animationName.includes("premiumBiflyIdle");
  return { viewport: viewport.key, passed, nabatickReaction, biflyReaction, settled, video: videoTarget };
}

await mkdir(videoDir, { recursive: true });
const server = staticServer();
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const browser = await chromium.launch({ headless: true });
try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  for (const viewport of viewports) {
    proofResults.push(await capture(browser, baseUrl, viewport));
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
await writeFile(path.join(outputDir, "verification.json"), `${JSON.stringify(proofResults, null, 2)}\n`);
console.log(JSON.stringify({ label, outputDir, passed: proofResults.every((result) => result.passed), proofResults }, null, 2));
if (!proofResults.every((result) => result.passed)) process.exitCode = 1;
