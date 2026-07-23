#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "boss-encounter");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webp": "image/webp"
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

async function capture(browser, baseUrl, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: 1,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    locale: "he-IL",
    recordVideo: profile.mobile ? { dir: outputDir, size: profile.viewport } : undefined
  });
  await context.addInitScript(() => {
    localStorage.setItem("mathMazeCharacter", "bifly");
    localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
    localStorage.setItem("mathMazeTimeLimit", "off");
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  let result;
  try {
    await page.goto(`${baseUrl}/?verify=boss-encounter`, { waitUntil: "domcontentloaded" });
    await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
    await page.waitForFunction(() => Boolean(
      window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.forceBossChallenge
      && window.__mathMazeRuntime?.forceBossContactForVerification
    ));
    await page.locator("#start-button").click();
    await page.locator("#start-screen").waitFor({ state: "hidden" });

    const setup = await page.evaluate(() => {
      const runtime = window.__mathMazeRuntime;
      runtime.forceLevelForVerification(0);
      runtime.setBossQuestionFeedbackDelayForVerification(120);
      runtime.forceBossChallenge();
      runtime.completeBossCinematicForVerification();
      const playerPlacement = runtime.setPlayerCellForVerification(34, 23);
      const bossPlacement = runtime.setBossCellForVerification(24, 23);
      return {
        playerPlacement,
        bossPlacement,
        encounter: runtime.getBossEncounterSnapshot()
      };
    });

    await page.waitForTimeout(850);
    const chase = await page.evaluate(() => window.__mathMazeRuntime.getBossEncounterSnapshot());
    const chaseScreenshot = path.join(outputDir, `${profile.key}-chase-3hp.png`);
    await page.screenshot({ path: chaseScreenshot, animations: "disabled" });

    const contact = await page.evaluate(() => window.__mathMazeRuntime.forceBossContactForVerification());
    await page.locator("#question-dialog").waitFor({ state: "visible" });
    const questionScreenshot = path.join(outputDir, `${profile.key}-contact-question.png`);
    await page.screenshot({ path: questionScreenshot, animations: "disabled" });

    const hit = await page.evaluate(() => {
      window.__mathMazeRuntime.answerCurrentQuestionForVerification(undefined, true);
      return window.__mathMazeRuntime.getBossEncounterSnapshot();
    });
    await page.waitForTimeout(90);
    const hitScreenshot = path.join(outputDir, `${profile.key}-after-hit-2hp.png`);
    await page.screenshot({ path: hitScreenshot, animations: "disabled" });

    const passed = errors.length === 0
      && setup.playerPlacement?.moved
      && setup.bossPlacement?.moved
      && chase.boss?.speedRatio >= 1.12
      && chase.camera?.player?.onScreen
      && chase.camera?.boss?.onScreen
      && contact.question?.status?.includes("פגיעה")
      && contact.encounter?.boss?.contactCount === 1
      && hit.boss?.healthRemaining === 2
      && hit.phase === "playing";

    result = {
      profile: profile.key,
      passed,
      setup,
      chase,
      contact: {
        phase: contact.encounter?.phase,
        status: contact.question?.status,
        bossQuestionNumber: contact.question?.bossQuestionNumber,
        camera: contact.encounter?.camera,
        contactCount: contact.encounter?.boss?.contactCount
      },
      hit,
      errors,
      screenshots: {
        chase: path.relative(root, chaseScreenshot),
        question: path.relative(root, questionScreenshot),
        afterHit: path.relative(root, hitScreenshot)
      }
    };
  } finally {
    await context.close();
  }

  if (video) {
    const recordedPath = await video.path();
    const videoPath = path.join(outputDir, `${profile.key}-boss-flow.webm`);
    await rename(recordedPath, videoPath);
    result.video = path.relative(root, videoPath);
  }
  return result;
}

await mkdir(outputDir, { recursive: true });
const server = staticServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

try {
  const results = [];
  results.push(await capture(browser, baseUrl, {
    key: "desktop-1280x800",
    viewport: { width: 1280, height: 800 },
    mobile: false
  }));
  results.push(await capture(browser, baseUrl, {
    key: "mobile-390x844",
    viewport: { width: 390, height: 844 },
    mobile: true
  }));
  const report = {
    generatedAt: new Date().toISOString(),
    passed: results.every((result) => result.passed),
    results
  };
  await writeFile(path.join(outputDir, "proof.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
