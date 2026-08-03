#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "ice-modular-v3-slice-1");

const captures = [
  {
    key: "desktop",
    viewport: { width: 1280, height: 720 },
    fileName: "ice-modular-v3-slice-1-desktop-1280x720.png",
    isMobile: false
  },
  {
    key: "mobile",
    viewport: { width: 390, height: 844 },
    fileName: "ice-modular-v3-slice-1-mobile-390x844.png",
    isMobile: true
  }
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

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const filePath = await resolveStaticFile(root, requestUrl.pathname);
      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(filePath)] || "application/octet-stream",
        "cache-control": "no-store"
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

async function waitForStableGameFrame(page) {
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 10_000 });
  await page.waitForFunction(() => Boolean(
    window.__mathMazeRuntime?.gameReady
      && window.__mathMazeRuntime?.forceLevelForVerification
      && window.__mathMazeRuntime?.getPlayerSnapshot
  ));

  const forcedState = await page.evaluate(() => window.__mathMazeRuntime.forceLevelForVerification(0));
  if (forcedState?.world !== "ice" || forcedState?.levelIndex !== 0 || forcedState?.phase !== "playing") {
    throw new Error(`Could not force the playable ice world: ${JSON.stringify(forcedState)}`);
  }

  await page.waitForFunction(() => window.__mathMazeRuntime?.getMazeTilesetSnapshot?.().ready === true, null, {
    timeout: 15_000
  });

  await page.waitForTimeout(500);
  const readiness = await page.evaluate(() => {
    const runtime = window.__mathMazeRuntime;
    const canvas = document.querySelector("#game-canvas");
    const stage = document.querySelector(".stage");
    const bounds = canvas?.getBoundingClientRect();
    const stageBounds = stage?.getBoundingClientRect();
    const stageStyle = stage ? getComputedStyle(stage) : null;
    return {
      phase: runtime?.getPlayerSnapshot?.()?.phase || "",
      documentState: document.documentElement.dataset.gameState || "",
      loading: document.documentElement.classList.contains("loading-screen-active"),
      canvas: bounds ? { width: bounds.width, height: bounds.height, top: bounds.top } : null,
      stage: stageBounds ? {
        width: stageBounds.width,
        height: stageBounds.height,
        top: stageBounds.top,
        position: stageStyle.position,
        cssTop: stageStyle.top,
        cssBottom: stageStyle.bottom,
        cssHeight: stageStyle.height,
        minHeight: stageStyle.minHeight,
        maxHeight: stageStyle.maxHeight
      } : null,
      gameplayTopInset: getComputedStyle(document.documentElement).getPropertyValue("--gameplay-top-inset")
    };
  });
  if (readiness.phase !== "playing" || readiness.loading || !readiness.canvas?.width || !readiness.canvas?.height) {
    throw new Error(`Playable frame did not stabilize: ${JSON.stringify(readiness)}`);
  }

  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(650);
  return forcedState;
}

async function recordMobileCanvasProof(page, fileName) {
  const recording = await page.evaluate(async () => {
    const canvas = document.querySelector("#game-canvas");
    if (!canvas?.captureStream || typeof MediaRecorder === "undefined") {
      throw new Error("Canvas MediaRecorder is unavailable.");
    }
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const completed = new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });
    recorder.start(100);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 2200));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 2300));
    recorder.stop();
    const blob = await completed;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    return {
      dataUrl,
      mimeType,
      durationMs: 4500,
      finalPlayer: window.__mathMazeRuntime?.getPlayerSnapshot?.() || null
    };
  });
  const filePath = path.join(outputDir, fileName);
  await writeFile(filePath, Buffer.from(String(recording.dataUrl).split(",")[1], "base64"));
  const reviewPage = await page.context().newPage();
  const frameFiles = [];
  try {
    await reviewPage.setViewportSize({ width: 390, height: 768 });
    await reviewPage.setContent(`
      <style>html,body{margin:0;background:#000}video{display:block;width:390px;height:768px;object-fit:contain}</style>
      <video id="proof" muted playsinline></video>
    `);
    await reviewPage.locator("#proof").evaluate((video, dataUrl) => {
      video.src = dataUrl;
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Could not load the recorded proof video."));
      });
    }, recording.dataUrl);
    for (const [label, seconds] of [["start", 0.45], ["middle", 2.25], ["end", 4.05]]) {
      await reviewPage.locator("#proof").evaluate((video, time) => new Promise((resolve) => {
        const settle = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
        video.onseeked = settle;
        video.currentTime = Math.min(time, Math.max(0, video.duration - 0.05));
        if (Math.abs(video.currentTime - time) < 0.01 && video.readyState >= 2) settle();
      }), seconds);
      const framePath = path.join(outputDir, `ice-modular-v3-slice-1-video-${label}.png`);
      await reviewPage.locator("#proof").screenshot({ path: framePath });
      frameFiles.push(path.relative(root, framePath));
    }
  } finally {
    await reviewPage.close();
  }
  return {
    file: path.relative(root, filePath),
    inspectedFrames: frameFiles,
    mimeType: recording.mimeType,
    durationMs: recording.durationMs,
    finalPlayer: recording.finalPlayer
  };
}

async function captureViewport(browser, baseUrl, definition) {
  const context = await browser.newContext({
    viewport: definition.viewport,
    deviceScaleFactor: 1,
    isMobile: definition.isMobile,
    hasTouch: definition.isMobile
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
    await page.goto(`${baseUrl}/?verify=ice-modular-v3-slice-1&verifyLevel=0`, {
      waitUntil: "domcontentloaded"
    });
    const forcedState = await waitForStableGameFrame(page);
    const filePath = path.join(outputDir, definition.fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    const video = definition.isMobile
      ? await recordMobileCanvasProof(page, "ice-modular-v3-slice-1-mobile-390x844.webm")
      : null;

    const gameState = await page.evaluate(async () => {
      const canvas = document.querySelector("#game-canvas");
      const bounds = canvas?.getBoundingClientRect();
      const hud = document.querySelector(".hud");
      const hudBounds = hud?.getBoundingClientRect();
      const script = document.querySelector("script[src*='game.js']");
      const frameStart = performance.now();
      let frameCount = 0;
      const frameEnd = await new Promise((resolve) => {
        const countFrame = (now) => {
          frameCount += 1;
          if (now - frameStart >= 1000) {
            resolve(now);
            return;
          }
          requestAnimationFrame(countFrame);
        };
        requestAnimationFrame(countFrame);
      });
      return {
        documentState: document.documentElement.dataset.gameState || "",
        player: window.__mathMazeRuntime?.getPlayerSnapshot?.() || null,
        canvas: canvas ? {
          width: canvas.width,
          height: canvas.height,
          clientWidth: Math.round(bounds?.width || 0),
          clientHeight: Math.round(bounds?.height || 0)
        } : null,
        hud: hudBounds ? {
          top: Math.round(hudBounds.top),
          bottom: Math.round(hudBounds.bottom),
          height: Math.round(hudBounds.height),
          canvasOverlapPx: Math.max(0, Math.round(hudBounds.bottom - (bounds?.top || 0)))
        } : null,
        frameRate: Math.round(frameCount * 1000 / Math.max(1, frameEnd - frameStart)),
        gameScript: script?.getAttribute("src") || "",
        tileset: window.__mathMazeRuntime?.getMazeTilesetSnapshot?.() || null
      };
    });

    if (browserErrors.length) {
      throw new Error(`${definition.key} browser errors: ${JSON.stringify(browserErrors)}`);
    }

    return {
      key: definition.key,
      file: path.relative(root, filePath),
      viewport: definition.viewport,
      forcedState,
      video,
      gameState
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
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const definition of captures) {
    results.push(await captureViewport(browser, baseUrl, definition));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    world: "ice",
    levelIndex: 0,
    captures: results
  };
  const manifestPath = path.join(outputDir, "proof.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    outputDir: path.relative(root, outputDir),
    manifest: path.relative(root, manifestPath),
    captures: results.map(({ key, file, viewport, gameState }) => ({ key, file, viewport, gameState }))
  }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
