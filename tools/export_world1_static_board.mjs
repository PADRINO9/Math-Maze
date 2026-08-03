#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "art-src", "maze", "world1", "sun-garden-static-template.png");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const server = createServer(async (request, response) => {
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

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://127.0.0.1:${address.port}/?verify=world1-art-export&verifyLevel=0&world1Concept=sun-garden`, {
    waitUntil: "domcontentloaded"
  });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
  await page.waitForFunction(() => Boolean(
    window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.forceLevelForVerification
      && window.__mathMazeRuntime?.exportWorldOneStaticBoard
  ));
  await page.evaluate(() => window.__mathMazeRuntime.forceLevelForVerification(0));
  await page.waitForTimeout(400);
  const exported = await page.evaluate(() => window.__mathMazeRuntime.exportWorldOneStaticBoard());
  if (!exported?.dataUrl) throw new Error("World-one static board export was unavailable");
  const bytes = Buffer.from(exported.dataUrl.split(",")[1], "base64");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, bytes);
  console.log(JSON.stringify({ output: path.relative(root, output), width: exported.width, height: exported.height, bytes: bytes.length }));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
