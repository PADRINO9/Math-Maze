#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "axonometric-worlds-v1");
const worlds = [
  { key: "ice", levelIndex: 0 },
  { key: "lava", levelIndex: 1 },
  { key: "ancient", levelIndex: 2 },
  { key: "diamond", levelIndex: 3 }
];
const viewports = [
  { key: "desktop-1280x720", width: 1280, height: 720, mobile: false },
  { key: "mobile-390x844", width: 390, height: 844, mobile: true }
];
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
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function createStaticServer() {
  return createServer(async (request, response) => {
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
}

async function capture(browser, baseUrl, world, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile
  });
  await context.addInitScript(() => {
    localStorage.setItem("mathMazeCharacter", "bifly");
    localStorage.setItem("mathMazeTimeLimit", "on");
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  try {
    await page.goto(`${baseUrl}/?verify=axonometric-worlds-v1&verifyLevel=${world.levelIndex}`, {
      waitUntil: "domcontentloaded"
    });
    await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 });
    await page.waitForFunction(() => Boolean(
      window.__mathMazeRuntime?.gameReady
        && window.__mathMazeRuntime?.forceLevelForVerification
        && window.__mathMazeRuntime?.getMazeProjectionSnapshot
    ));
    const forced = await page.evaluate((levelIndex) => (
      window.__mathMazeRuntime.forceLevelForVerification(levelIndex)
    ), world.levelIndex);
    if (forced?.world !== world.key || forced?.phase !== "playing") {
      throw new Error(`Could not force ${world.key}: ${JSON.stringify(forced)}`);
    }
    await page.waitForFunction((expectedWorld) => {
      const projection = window.__mathMazeRuntime?.getMazeProjectionSnapshot?.();
      return projection?.world === expectedWorld && (
        expectedWorld === "ice"
          ? projection?.visualRenderer === "world1-authored-environment-v1"
          : projection?.visualRenderer === "stage1-style-themed-continuous-v1"
      );
    }, world.key, { timeout: 15_000 });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.waitForTimeout(500);

    const fileName = `${world.key}-${viewport.key}.png`;
    const filePath = path.join(outputDir, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    const bytes = await readFile(filePath);

    let questionFlow = null;
    let deepQa = null;
    if (viewport.mobile) {
      const question = await page.evaluate(() => window.__mathMazeRuntime.openQuestionForVerification());
      if (typeof question?.answer === "number") {
        await page.locator("#question-dialog").waitFor({ state: "visible" });
        for (const digit of String(question.answer)) {
          await page.locator(`#game-number-pad [data-keypad-digit="${digit}"]`).click();
        }
        const inputValue = await page.locator("#answer-input").inputValue();
        await page.locator("#game-number-pad [data-keypad-action='submit']").click();
        await page.locator("#question-dialog[data-answer-result='correct']").waitFor({ state: "visible" });
        const feedbackResult = await page.locator("#question-dialog").getAttribute("data-answer-result");
        const feedbackStatus = await page.locator("#question-status").textContent();
        await page.waitForFunction(
          () => document.documentElement.dataset.gameState === "playing",
          null,
          { timeout: 5_000 }
        );
        questionFlow = {
          opened: true,
          text: question.text,
          answer: question.answer,
          inputValue,
          feedbackResult,
          status: feedbackStatus,
          returnedToPlaying: await page.evaluate(() => (
            document.documentElement.dataset.gameState === "playing"
          ))
        };
      }

      deepQa = await page.evaluate((levelIndex) => {
        const runtime = window.__mathMazeRuntime;
        runtime.forceLevelForVerification(levelIndex);
        const collision = runtime.auditMazeCollisionForVerification();
        const traversal = runtime.auditFullMazeTraversalForVerification();
        const wallStops = runtime.auditWallStopTurnsForVerification();
        const actorVisuals = runtime.getActorVisualMetricsForVerification();
        const initialActors = runtime.spawnEnemiesForVerification(5);
        const enemyMotion = runtime.stepEnemiesForVerification(360, 1 / 60);
        runtime.forceLevelForVerification(levelIndex);
        const hazard = runtime.forceEnvironmentHazardForVerification();
        const chestClosed = runtime.forceArcadeBonusForVerification("closed");
        const chestReady = runtime.forceArcadeBonusForVerification("ready");
        const chestOpened = runtime.forceArcadeBonusForVerification("opened");
        runtime.forceLevelForVerification(levelIndex);
        const introStart = runtime.forceStageIntroForVerification(levelIndex);
        const introMid = runtime.setStageIntroProgressForVerification(0.5);
        const introEnd = runtime.setStageIntroProgressForVerification(0.995);
        runtime.forceLevelForVerification(levelIndex);
        runtime.profileRenderForVerification(1);
        const renderProfile = runtime.profileRenderForVerification(12);
        const projection = runtime.getMazeProjectionSnapshot();
        const visual = runtime.getMazeVisualSnapshot();
        return {
          collision,
          traversal,
          wallStops,
          actorVisuals,
          initialActors,
          enemyMotion,
          hazard,
          chestClosed,
          chestReady,
          chestOpened,
          intro: { start: introStart, mid: introMid, end: introEnd },
          renderProfile,
          projection,
          visual
        };
      }, world.levelIndex);
      await page.waitForTimeout(350);
    }

    const diagnostics = await page.evaluate(async () => {
      const canvas = document.querySelector("#game-canvas");
      const hud = document.querySelector(".hud");
      const canvasBounds = canvas?.getBoundingClientRect();
      const hudBounds = hud?.getBoundingClientRect();
      const start = performance.now();
      let frames = 0;
      const end = await new Promise((resolve) => {
        const tick = (now) => {
          frames += 1;
          if (now - start >= 700) resolve(now);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      return {
        phase: document.documentElement.dataset.gameState || "",
        projection: window.__mathMazeRuntime?.getMazeProjectionSnapshot?.() || null,
        visual: window.__mathMazeRuntime?.getMazeVisualSnapshot?.() || null,
        collisionAudit: window.__mathMazeRuntime?.auditMazeCollisionForVerification?.() || null,
        canvas: canvasBounds ? {
          width: Math.round(canvasBounds.width),
          height: Math.round(canvasBounds.height),
          top: Math.round(canvasBounds.top)
        } : null,
        hud: hudBounds ? {
          height: Math.round(hudBounds.height),
          canvasOverlapPx: Math.max(0, Math.round(hudBounds.bottom - (canvasBounds?.top || 0)))
        } : null,
        frameRate: Math.round(frames * 1000 / Math.max(1, end - start))
      };
    });
    return {
      world: world.key,
      viewport: viewport.key,
      file: path.relative(root, filePath),
      sha256: sha256(bytes),
      browserErrors,
      questionFlow,
      deepQa,
      ...diagnostics
    };
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });
const server = createStaticServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const captures = [];

try {
  for (const world of worlds) {
    for (const viewport of viewports) {
      captures.push(await capture(browser, baseUrl, world, viewport));
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const failures = captures.flatMap((capture) => {
  const issues = [];
  if (capture.phase !== "playing") issues.push("not-playing");
  if (capture.projection?.renderer !== "orthographic-3/4") issues.push("wrong-renderer");
  if (capture.projection?.elevationDegrees !== 56) issues.push("wrong-elevation");
  if (capture.world !== "ice" && !capture.projection?.blenderAtlasReady) issues.push("atlas-not-ready");
  if (capture.world === "ice" && capture.projection?.visualRenderer !== "world1-authored-environment-v1") issues.push("world1-renderer-not-ready");
  if (capture.world !== "ice" && capture.projection?.visualRenderer !== "stage1-style-themed-continuous-v1") issues.push("approved-stage-style-not-ready");
  if (capture.world !== "ice" && capture.visual?.renderer !== "stage1-style-themed-continuous-v1") issues.push("visual-audit-not-ready");
  if (capture.world !== "ice" && capture.visual?.canonicalCollisionMask !== true) issues.push("visual-collision-mask-not-canonical");
  if (capture.world !== "ice" && capture.visual?.misleadingRouteLineDrawn !== false) issues.push("misleading-route-line");
  if (!capture.collisionAudit?.passed) issues.push("collision-audit-failed");
  if (capture.viewport.startsWith("mobile")) {
    if (!capture.questionFlow?.opened || capture.questionFlow?.feedbackResult !== "correct") issues.push("question-flow-failed");
    if (!capture.questionFlow?.returnedToPlaying) issues.push("question-return-to-play-failed");
    if (!capture.deepQa?.collision?.passed) issues.push("deep-collision-failed");
    if (!capture.deepQa?.traversal?.passed) issues.push("full-traversal-failed");
    if (!capture.deepQa?.wallStops?.passed) issues.push("wall-stop-turn-failed");
    if ((capture.deepQa?.enemyMotion?.wallOverlapFrames ?? 1) !== 0) issues.push("enemy-wall-overlap");
    if ((capture.deepQa?.enemyMotion?.maxStepDistance ?? 0) <= 0.01) issues.push("enemies-not-moving");
    if ((capture.deepQa?.enemyMotion?.actors?.enemies?.length ?? 0) !== 5) issues.push("enemy-count-wrong");
    if (!capture.deepQa?.hazard?.cells?.length) issues.push("hazard-not-created");
    if (!capture.deepQa?.chestClosed?.chest?.reachable) issues.push("chest-unreachable-closed");
    if (!capture.deepQa?.chestReady?.chest?.reachable || capture.deepQa?.chestReady?.keysCollected !== 3) issues.push("chest-ready-failed");
    if (!capture.deepQa?.chestOpened?.chestOpened) issues.push("chest-open-failed");
    if (capture.deepQa?.intro?.start?.phase !== "overview") issues.push("intro-overview-missing");
    if ((capture.deepQa?.intro?.mid?.travelProgress ?? 0) <= 0) issues.push("intro-travel-missing");
    if ((capture.deepQa?.renderProfile?.fullFrame?.p95Ms ?? Number.POSITIVE_INFINITY) > 35) issues.push("render-p95-too-slow");
  }
  if (!capture.canvas?.width || !capture.canvas?.height) issues.push("missing-canvas");
  if ((capture.hud?.canvasOverlapPx || 0) > 0) issues.push("hud-overlap");
  if (capture.browserErrors.length) issues.push("browser-errors");
  return issues.map((issue) => ({ world: capture.world, viewport: capture.viewport, issue }));
});
const report = {
  createdAt: new Date().toISOString(),
  renderer: "orthographic-3/4",
  camera: { azimuthDegrees: 10, elevationDegrees: 56, tiltFromVerticalDegrees: 34 },
  captures,
  failures,
  passed: failures.length === 0
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
