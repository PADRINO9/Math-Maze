#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = process.env.KAFLUL_PROOF_STATE === "before" ? "before" : "after";
const OUTPUT_ROOT = path.join(ROOT, "docs", "visual-proof-screenshots", "nickname-safety", STATE);
const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800, mobile: false },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true }
];

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".json") || filePath.endsWith(".webmanifest")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".wav")) return "audio/wav";
  if (filePath.endsWith(".m4a")) return "audio/mp4";
  return "application/octet-stream";
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === "/api/champions") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        response.end(JSON.stringify({ publicAvailable: false, publicSubmissionsAvailable: false }));
        return;
      }
      const resolved = await resolveStaticFile(ROOT, url.pathname);
      const bytes = await readFile(resolved);
      response.writeHead(200, { "content-type": contentType(resolved), "cache-control": "no-store" });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function capture(browser, baseUrl, viewport, report) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("kaflulFirstRunTutorialV1", "complete");
  });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#start-screen").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);

  await mkdir(OUTPUT_ROOT, { recursive: true });
  const homePath = path.join(OUTPUT_ROOT, `home-${viewport.name}.png`);
  await page.screenshot({ path: homePath, animations: "disabled" });

  if (STATE === "after") {
    await page.locator("#start-button").click();
  } else {
    await page.locator("#menu-settings-button").click();
  }
  await page.locator("#settings-panel").waitFor({ state: "visible" });
  const settingsPath = path.join(OUTPUT_ROOT, `settings-${viewport.name}.png`);
  await page.screenshot({ path: settingsPath, animations: "disabled" });

  let requiredError = "";
  let blockedPath = null;
  if (STATE === "after") {
    requiredError = (await page.locator("#settings-name-error").textContent())?.trim() || "";
    await page.locator("#player-name-input").fill("f.u-c_k");
    await page.locator("#settings-save-button").click();
    await page.locator("#settings-nickname-section").scrollIntoViewIfNeeded();
    blockedPath = path.join(OUTPUT_ROOT, `blocked-${viewport.name}.png`);
    await page.screenshot({ path: blockedPath, animations: "disabled" });
  }

  const snapshot = await page.evaluate(() => ({
    greeting: document.getElementById("player-greeting")?.textContent?.trim(),
    inputValue: document.getElementById("player-name-input")?.value,
    inputFocused: document.activeElement?.id === "player-name-input",
    homeError: document.getElementById("name-error")?.textContent?.trim(),
    settingsError: document.getElementById("settings-name-error")?.textContent?.trim() || "",
    noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1
  }));
  report.captures.push({
    viewport: viewport.name,
    home: path.relative(ROOT, homePath),
    settings: path.relative(ROOT, settingsPath),
    blocked: blockedPath ? path.relative(ROOT, blockedPath) : null,
    requiredError,
    snapshot,
    errors
  });
  await context.close();
}

const { server, baseUrl } = await startServer();
const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), state: STATE, captures: [] };
try {
  for (const viewport of VIEWPORTS) {
    await capture(browser, baseUrl, viewport, report);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

report.passed = report.captures.every((capture) => (
  capture.errors.length === 0
  && capture.snapshot.noHorizontalOverflow
  && (STATE === "before" || (
    capture.snapshot.inputValue === "f.u-c_k"
    && capture.snapshot.inputFocused
    && capture.requiredError.length > 0
    && capture.snapshot.settingsError.includes("אינה מתאימה")
  ))
));
await mkdir(OUTPUT_ROOT, { recursive: true });
await writeFile(path.join(OUTPUT_ROOT, "proof.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
