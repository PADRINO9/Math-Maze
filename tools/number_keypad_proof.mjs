#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const label = process.argv.find((argument) => argument.startsWith("--label="))?.split("=")[1] || "after";
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "number-keypad", label);
const contentTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp"
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
      response.writeHead(200, { "content-type": contentTypes[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
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
    hasTouch: viewport.mobile
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/?verify=1&verifyLevel=0`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 });
  await page.waitForFunction(() => window.__mathMazeRuntime?.openQuestionForVerification);
  const question = await page.evaluate(() => window.__mathMazeRuntime.openQuestionForVerification());
  await page.locator("#question-dialog").waitFor({ state: "visible" });
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(outputDir, `${viewport.key}-question-empty.png`) });

  const pad = page.locator("#game-number-pad");
  const keypadCount = await pad.count();
  let submitted = false;
  let inputValue = "";
  let feedbackResult = null;
  let deleteWorks = false;
  if (keypadCount === 1 && question?.answer !== undefined) {
    await page.locator('[data-keypad-digit="9"]').click();
    await page.locator('[data-keypad-action="delete"]').click();
    deleteWorks = (await page.locator("#answer-input").inputValue()) === "";
    for (const digit of String(question.answer)) {
      await page.locator(`[data-keypad-digit="${digit}"]`).click();
    }
    inputValue = await page.locator("#answer-input").inputValue();
    await page.screenshot({ path: path.join(outputDir, `${viewport.key}-question-filled.png`) });
    await page.locator('[data-keypad-action="submit"]').click();
    feedbackResult = await page.locator("#question-dialog").getAttribute("data-answer-result");
    submitted = feedbackResult === "correct";
  }

  const snapshot = await page.evaluate(() => {
    const input = document.getElementById("answer-input");
    const padElement = document.getElementById("game-number-pad");
    return {
      inputMode: input?.getAttribute("inputmode") || "",
      readOnly: Boolean(input?.readOnly),
      keypadVisible: Boolean(padElement && getComputedStyle(padElement).display !== "none"),
      digitKeys: padElement?.querySelectorAll("[data-keypad-digit]").length || 0,
      nonNumericVisualLabels: Array.from(padElement?.querySelectorAll("[data-keypad-digit]") || [])
        .map((button) => button.textContent.trim())
        .filter((text) => !/^\d$/.test(text))
    };
  });
  await context.close();
  return { viewport: viewport.key, question, keypadCount, inputValue, deleteWorks, submitted, feedbackResult, snapshot, errors };
}

await mkdir(outputDir, { recursive: true });
const server = staticServer();
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  for (const viewport of viewports) results.push(await capture(browser, baseUrl, viewport));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
await writeFile(path.join(outputDir, "verification.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ label, outputDir, results }, null, 2));
