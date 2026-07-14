#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...value] = entry.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const label = String(args.get("label") || "after").replace(/[^a-z0-9_-]/gi, "-");
const concept = String(args.get("concept") || "sun-garden").replace(/[^a-z0-9_-]/gi, "-");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "world1-reimagine", label, concept);

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

async function openWorldOne(browser, baseUrl, viewport) {
  const mobile = viewport.width < 600;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile
  });
  await context.addInitScript(({ selectedConcept }) => {
    localStorage.setItem("mathMazeCharacter", "bifly");
    localStorage.setItem("mathMazeTimeLimit", "on");
    localStorage.setItem("mathMazeWorld1Concept", selectedConcept);
  }, { selectedConcept: concept });
  const page = await context.newPage();
  const browserErrors = [];
  const legacyVisualRequests = [];
  page.on("pageerror", (error) => browserErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (
      pathname.endsWith("/assets/reference/maze-worlds/world_ice.png")
      || pathname.includes("/assets/generated/maze-tilesets/ice")
      || pathname.includes("/assets/generated/maze-axonometric/ice")
      || pathname.endsWith("/assets/bosses/stage-2-boss-sprite.png")
    ) {
      legacyVisualRequests.push(pathname);
    }
  });

  const url = new URL(baseUrl);
  url.searchParams.set("verify", "world1-reimagine");
  url.searchParams.set("verifyLevel", "0");
  url.searchParams.set("world1Concept", concept);
  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 12_000 });
  await page.waitForFunction(() => Boolean(
    window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.forceLevelForVerification
      && window.__mathMazeRuntime?.getPlayerSnapshot
  ));
  const forced = await page.evaluate(() => window.__mathMazeRuntime.forceLevelForVerification(0));
  if (forced?.levelIndex !== 0 || forced?.phase !== "playing") {
    throw new Error(`Could not force world one: ${JSON.stringify(forced)}`);
  }
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#game-canvas");
    const bounds = canvas?.getBoundingClientRect();
    return document.documentElement.dataset.gameState === "playing"
      && !document.documentElement.classList.contains("loading-screen-active")
      && Boolean(bounds?.width && bounds?.height);
  });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(800);
  return { context, page, forced, browserErrors, legacyVisualRequests };
}

async function capture(browser, baseUrl, key, viewport, options = {}) {
  const { context, page, forced, browserErrors, legacyVisualRequests } = await openWorldOne(browser, baseUrl, viewport);
  try {
    if (options.boss) {
      const boss = await page.evaluate(() => window.__mathMazeRuntime?.forceBossChallenge?.());
      if (!boss) throw new Error("Could not force world-one boss");
      await page.waitForTimeout(850);
    }
    if (options.question) {
      await page.evaluate(() => window.__mathMazeRuntime?.openQuestionForVerification?.());
      await page.locator("#question-dialog").waitFor({ state: "visible", timeout: 5_000 });
      await page.waitForTimeout(250);
    }
    const stateSuffix = options.boss ? "-boss" : options.question ? "-question" : "";
    const fileName = `${label}-${concept}-${key}${stateSuffix}-${viewport.width}x${viewport.height}.png`;
    const filePath = path.join(outputDir, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    const bytes = await readFile(filePath);
    const diagnostics = await page.evaluate(() => {
      const canvas = document.querySelector("#game-canvas");
      const bounds = canvas?.getBoundingClientRect();
      const hud = document.querySelector(".hud")?.getBoundingClientRect();
      return {
        state: document.documentElement.dataset.gameState || "",
        player: window.__mathMazeRuntime?.getPlayerSnapshot?.() || null,
        projection: window.__mathMazeRuntime?.getMazeProjectionSnapshot?.() || null,
        tileset: window.__mathMazeRuntime?.getMazeTilesetSnapshot?.() || null,
        visual: window.__mathMazeRuntime?.getMazeVisualSnapshot?.() || null,
        collision: window.__mathMazeRuntime?.getMazeCollisionSnapshot?.() || null,
        collisionAudit: window.__mathMazeRuntime?.auditMazeCollisionForVerification?.() || null,
        canvas: bounds ? {
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          top: Math.round(bounds.top)
        } : null,
        hudOverlapPx: bounds && hud ? Math.max(0, Math.round(hud.bottom - bounds.top)) : null,
        questionVisible: Boolean(document.querySelector("#question-dialog:not([hidden])")),
        boss: window.__mathMazeRuntime?.getBossSnapshot?.() || null
      };
    });
    return {
      key,
      viewport,
      mode: options.boss ? "boss" : options.question ? "question" : "playing",
      file: path.relative(root, filePath),
      sha256: sha256(bytes),
      forced,
      browserErrors,
      legacyVisualRequests,
      diagnostics
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

try {
  const captures = [];
  captures.push(await capture(browser, baseUrl, "desktop", { width: 1280, height: 720 }));
  captures.push(await capture(browser, baseUrl, "mobile", { width: 390, height: 844 }));
  captures.push(await capture(browser, baseUrl, "mobile", { width: 390, height: 844 }, { question: true }));
  if (label !== "before") {
    captures.push(await capture(browser, baseUrl, "mobile", { width: 390, height: 844 }, { boss: true }));
  }
  const failures = captures.flatMap((entry) => {
    const issues = [];
    const expectedState = entry.diagnostics.questionVisible ? "question" : "playing";
    if (entry.diagnostics.state !== expectedState) issues.push(`unexpected-state:${entry.diagnostics.state}`);
    if (!entry.diagnostics.canvas?.width || !entry.diagnostics.canvas?.height) issues.push("missing-canvas");
    if ((entry.diagnostics.hudOverlapPx || 0) > 0) issues.push("hud-overlap");
    if (entry.browserErrors.length) issues.push("browser-errors");
    if (entry.mode === "boss" && !entry.diagnostics.boss) issues.push("missing-boss");
    if (label !== "before") {
      const expectedRenderer = concept === "sun-garden"
        ? "world1-authored-environment-v2"
        : "world1-continuous-2.5d";
      if (entry.diagnostics.visual?.renderer !== expectedRenderer) issues.push("wrong-world1-renderer");
      if (concept === "sun-garden" && !entry.diagnostics.visual?.assetUrlsActuallyDrawn?.includes("assets/maze/world1/sun-garden/board-v3.png")) {
        issues.push("authored-world1-board-not-drawn");
      }
      if (concept === "sun-garden" && !entry.diagnostics.visual?.layersDrawn?.includes("world1-authored-depth-sorted-actors")) {
        issues.push("authored-depth-sorted-actors-not-drawn");
      }
      if (!entry.diagnostics.collisionAudit?.passed) issues.push("maze-collision-audit-failed");
      if (entry.diagnostics.collision?.playerOverlapsWall) issues.push("player-overlaps-wall");
      if ((entry.diagnostics.visual?.legacyIceLayersDrawn || []).length) issues.push("legacy-ice-layer-drawn");
      if (entry.diagnostics.visual?.legacyIceAssetsRequested) issues.push("legacy-ice-asset-requested");
      if (entry.legacyVisualRequests.length) issues.push("legacy-visual-network-request");
      if (entry.diagnostics.tileset?.concept !== concept) issues.push("wrong-world1-concept");
    }
    return issues.map((issue) => ({ capture: entry.key, issue }));
  });
  const report = {
    generatedAt: new Date().toISOString(),
    label,
    concept,
    world: "world-1",
    levelIndex: 0,
    captures,
    failures,
    passed: failures.length === 0
  };
  const reportPath = path.join(outputDir, "proof.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ outputDir: path.relative(root, outputDir), ...report }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
