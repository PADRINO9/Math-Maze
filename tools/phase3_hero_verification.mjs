#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "phase3-screenshots");
const args = new Set(process.argv.slice(2));
const shouldFail = args.has("--ci");

const viewports = [
  { name: "390x844-portrait", width: 390, height: 844, mobile: true },
  { name: "430x932-portrait", width: 430, height: 932, mobile: true },
  { name: "844x390-landscape", width: 844, height: 390, mobile: true },
  { name: "1280x720-desktop", width: 1280, height: 720, mobile: false },
  { name: "1440x900-desktop", width: 1440, height: 900, mobile: false }
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const resolved = await resolveStaticFile(root, url.pathname);
      const bytes = await readFile(resolved);
      response.writeHead(200, { "content-type": contentType(resolved), "cache-control": "no-store" });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function fetchJson(target) {
  return fetch(new Request(target)).then(async (response) => {
    if (!response.ok) throw new Error(`${target} returned ${response.status}`);
    return response.json();
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CDP {
  constructor(wsUrl) {
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Set();
    this.ws = new WebSocket(wsUrl);
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (message) => {
      const payload = JSON.parse(message.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) {
          reject(new Error(`${payload.error.message}${payload.error.data ? `: ${payload.error.data}` : ""}`));
        } else {
          resolve(payload.result || {});
        }
        return;
      }
      for (const handler of this.handlers) handler(payload);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  onEvent(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

async function waitForChrome(port) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      lastError = error;
      await wait(125);
    }
  }
  throw lastError || new Error("Chrome did not expose a debugging endpoint");
}

async function createPage(cdp, viewport) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Log.enable", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  }, sessionId);
  if (viewport.mobile) {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId);
  }
  return { targetId, sessionId };
}

function collectEvents(cdp, sessionId) {
  const events = [];
  const off = cdp.onEvent((payload) => {
    if (payload.sessionId !== sessionId) return;
    if (payload.method === "Runtime.consoleAPICalled" && payload.params.type === "error") {
      events.push({
        type: "console",
        text: (payload.params.args || []).map((arg) => arg.value || arg.description || "").join(" ")
      });
    }
    if (payload.method === "Runtime.exceptionThrown") {
      const details = payload.params.exceptionDetails || {};
      events.push({ type: "exception", text: details.text || details.exception?.description || "Runtime exception" });
    }
    if (payload.method === "Log.entryAdded") {
      const entry = payload.params.entry || {};
      if (entry.level === "error") events.push({ type: "log", text: entry.text });
    }
  });
  return { events, off };
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression
  }, sessionId);
  return result.result.value;
}

async function tapSelector(cdp, sessionId, selector) {
  const point = await evaluate(cdp, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  })()`);
  if (!point) throw new Error(`Missing selector for tap: ${selector}`);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y, radiusX: 3, radiusY: 3, force: 1 }]
  }, sessionId);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, sessionId);
  await wait(120);
}

async function swipeSelector(cdp, sessionId, selector, deltaX) {
  const points = await evaluate(cdp, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const box = element.getBoundingClientRect();
    const startX = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    return { startX, endX: startX + ${Number(deltaX)}, y };
  })()`);
  if (!points) throw new Error(`Missing selector for swipe: ${selector}`);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: points.startX, y: points.y, radiusX: 4, radiusY: 4, force: 1 }]
  }, sessionId);
  await wait(50);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: points.endX, y: points.y, radiusX: 4, radiusY: 4, force: 1 }]
  }, sessionId);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, sessionId);
  await wait(180);
}

async function openHeroGallery(cdp, sessionId) {
  await tapSelector(cdp, sessionId, "#home-nav-characters");
  await wait(250);
}

async function inspectHero(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const selectors = [
      "#start-screen",
      "#hero-gallery",
      ".hero-gallery-header",
      ".hero-gallery-stage",
      ".hero-gallery-card",
      "#hero-gallery-art-button",
      "#hero-animation-mount",
      ".hero-animation-image",
      "#hero-gallery-name",
      "#hero-gallery-select",
      ".hero-gallery-actions"
    ];
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const rects = Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [selector, null];
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return [selector, {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        visible: box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none"
      }];
    }));
    const outOfBounds = Object.entries(rects)
      .filter(([, rect]) => rect?.visible)
      .filter(([, rect]) => (
        rect.x < -1
        || rect.y < -1
        || rect.x + rect.width > viewport.width + 1
        || rect.y + rect.height > viewport.height + 1
      ))
      .map(([selector, rect]) => ({ selector, rect }));
    const overflowingText = [];
    for (const selector of [
      "#hero-gallery-title",
      "#hero-gallery-status",
      "#hero-gallery-name",
      "#hero-gallery-description",
      "#hero-gallery-style",
      "#hero-gallery-best",
      "#hero-gallery-select-label",
      "#hero-gallery-home"
    ]) {
      for (const element of document.querySelectorAll(selector)) {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 3) {
          overflowingText.push({
            selector,
            text: element.textContent.trim(),
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight
          });
        }
      }
    }
    const image = document.querySelector(".hero-animation-image");
    const imageBox = image?.getBoundingClientRect();
    const mountBox = document.querySelector("#hero-animation-mount")?.getBoundingClientRect();
    const naturalRatio = image?.naturalWidth && image?.naturalHeight ? image.naturalWidth / image.naturalHeight : null;
    const renderedRatio = imageBox?.width && imageBox?.height ? imageBox.width / imageBox.height : null;
    const ratioDelta = naturalRatio && renderedRatio ? Math.abs(naturalRatio - renderedRatio) / naturalRatio : 0;
    const imageFitTolerance = 4;
    const imageInMount = Boolean(imageBox && mountBox
      && imageBox.x >= mountBox.x - imageFitTolerance
      && imageBox.y >= mountBox.y - imageFitTolerance
      && imageBox.x + imageBox.width <= mountBox.x + mountBox.width + imageFitTolerance
      && imageBox.y + imageBox.height <= mountBox.y + mountBox.height + imageFitTolerance);
    return {
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      selectedCharacter: document.querySelector("input[name='character']:checked")?.value || null,
      previewCharacter: document.getElementById("hero-gallery")?.dataset.galleryCharacter || null,
      heroHidden: document.getElementById("hero-gallery")?.hidden ?? true,
      adapterLoaded: Boolean(window.KaflulCharacterAnimationAdapter),
      manifestLoaded: Boolean(window.KAFLUL_ASSET_MANIFEST?.characterAnimations),
      supportedStates: window.KaflulCharacterAnimationAdapter?.getSupportedStates(document.getElementById("hero-gallery")?.dataset.galleryCharacter || "bifly", "static-png") || [],
      missingStates: window.KaflulCharacterAnimationAdapter?.getMissingStates(document.getElementById("hero-gallery")?.dataset.galleryCharacter || "bifly", "static-png") || [],
      runtimeErrors: window.__mathMazeRuntime?.errors || [],
      scroll: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        xOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        yOverflow: document.documentElement.scrollHeight > window.innerHeight + 1
      },
      rects,
      outOfBounds,
      overflowingText,
      image: {
        complete: image?.complete || false,
        naturalWidth: image?.naturalWidth || 0,
        naturalHeight: image?.naturalHeight || 0,
        renderedWidth: Math.round(imageBox?.width || 0),
        renderedHeight: Math.round(imageBox?.height || 0),
        ratioDelta,
        imageInMount
      }
    };
  })()`);
}

async function runAcceptance(cdp, appPort) {
  const { targetId, sessionId } = await createPage(cdp, { width: 430, height: 932, mobile: true });
  const { events, off } = collectEvents(cdp, sessionId);
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase3-acceptance=1` }, sessionId);
  await wait(900);
  await evaluate(cdp, sessionId, "localStorage.clear(); location.reload(); true;");
  await wait(900);

  await openHeroGallery(cdp, sessionId);
  const opened = await evaluate(cdp, sessionId, "!document.getElementById('hero-gallery').hidden");
  const initialName = await evaluate(cdp, sessionId, "document.getElementById('hero-gallery-name')?.textContent || ''");

  await tapSelector(cdp, sessionId, "#hero-gallery-next");
  const nextName = await evaluate(cdp, sessionId, "document.getElementById('hero-gallery-name')?.textContent || ''");

  await tapSelector(cdp, sessionId, "#hero-gallery-art-button");
  const tapRequested = await evaluate(cdp, sessionId, "document.getElementById('hero-animation-mount')?.dataset.requestedState === 'tap'");
  await wait(460);

  await tapSelector(cdp, sessionId, "#hero-gallery-select");
  const selectedNabatick = await evaluate(cdp, sessionId, `(() => ({
    radio: document.querySelector("input[name='character'][value='nabatick']")?.checked,
    homeLabel: document.getElementById("selected-character-label")?.textContent || "",
    root: document.documentElement.dataset.character
  }))()`);

  await tapSelector(cdp, sessionId, "#hero-gallery-home");
  const returnedHome = await evaluate(cdp, sessionId, "document.getElementById('hero-gallery').hidden && document.getElementById('start-screen').hidden === false");

  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await wait(900);
  const persisted = await evaluate(cdp, sessionId, `(() => ({
    character: document.querySelector("input[name='character']:checked")?.value,
    label: document.getElementById("selected-character-label")?.textContent || ""
  }))()`);

  await openHeroGallery(cdp, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 }, sessionId);
  await wait(150);
  const keyboardName = await evaluate(cdp, sessionId, "document.getElementById('hero-gallery-name')?.textContent || ''");
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, sessionId);
  await wait(150);
  const keyboardSelected = await evaluate(cdp, sessionId, "document.querySelector(\"input[name='character'][value='bifly']\")?.checked === true");

  await swipeSelector(cdp, sessionId, "#hero-gallery-stage", -130);
  const touchName = await evaluate(cdp, sessionId, "document.getElementById('hero-gallery-name')?.textContent || ''");

  const runtimeErrors = await evaluate(cdp, sessionId, "window.__mathMazeRuntime?.errors || []");
  off();
  await cdp.send("Target.closeTarget", { targetId });

  const checks = {
    opened,
    initialName: initialName.includes("ביפלי"),
    nextControl: nextName.includes("נבטיק"),
    tapReaction: tapRequested,
    selectedNabatick: selectedNabatick.radio === true && selectedNabatick.homeLabel.includes("נבטיק") && selectedNabatick.root === "nabatick",
    returnedHome,
    persistedSelection: persisted.character === "nabatick" && persisted.label.includes("נבטיק"),
    keyboardNavigation: keyboardName.includes("ביפלי"),
    keyboardSelection: keyboardSelected,
    touchNavigation: touchName.includes("נבטיק"),
    noRuntimeErrors: runtimeErrors.length === 0,
    noConsoleErrors: events.length === 0
  };

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    persisted,
    events,
    runtimeErrors
  };
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("No Chrome or Chromium executable found. Set CHROME_PATH to run Phase 3 hero verification.");
  }

  await mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const appPort = server.address().port;
  const cdpPort = 10000 + Math.floor(Math.random() * 500);
  const userDataDir = path.join("/private/tmp", `kaflul-phase3-hero-${process.pid}`);
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  try {
    const version = await waitForChrome(cdpPort);
    const cdp = new CDP(version.webSocketDebuggerUrl);
    await cdp.ready;
    const results = [];

    for (const viewport of viewports) {
      const { targetId, sessionId } = await createPage(cdp, viewport);
      const { events, off } = collectEvents(cdp, sessionId);
      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase3=${viewport.name}` }, sessionId);
      await wait(1000);
      await openHeroGallery(cdp, sessionId);
      await wait(350);
      const evaluation = await inspectHero(cdp, sessionId);
      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false
      }, sessionId);
      const file = path.join(outputDir, `phase3-hero-${viewport.name}.png`);
      await writeFile(file, Buffer.from(screenshot.data, "base64"));
      off();
      await cdp.send("Target.closeTarget", { targetId });

      results.push({
        ...viewport,
        file: path.relative(root, file),
        events,
        evaluation
      });
    }

    const acceptance = await runAcceptance(cdp, appPort);
    const failures = results.filter((result) => (
      result.events.length > 0
      || result.evaluation.runtimeErrors.length > 0
      || result.evaluation.scroll.xOverflow
      || result.evaluation.scroll.yOverflow
      || result.evaluation.outOfBounds.length > 0
      || result.evaluation.overflowingText.length > 0
      || result.evaluation.lang !== "he"
      || result.evaluation.dir !== "rtl"
      || result.evaluation.heroHidden
      || !result.evaluation.adapterLoaded
      || !result.evaluation.manifestLoaded
      || !result.evaluation.image.complete
      || result.evaluation.image.naturalWidth <= 0
      || result.evaluation.image.ratioDelta > 0.12
      || !result.evaluation.image.imageInMount
    ));
    const report = {
      phase: 3,
      capturedAt: new Date().toISOString(),
      chrome: version.Browser,
      ok: failures.length === 0 && acceptance.ok,
      results,
      acceptance
    };
    const reportFile = path.join(outputDir, "phase3-hero-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));

    await cdp.send("Browser.close").catch(() => {});

    const summary = {
      ok: report.ok,
      screenshots: results.map((result) => ({
        name: result.name,
        file: result.file,
        consoleErrors: result.events.length,
        runtimeErrors: result.evaluation.runtimeErrors.length,
        overflow: result.evaluation.scroll,
        outOfBounds: result.evaluation.outOfBounds.length,
        overflowingText: result.evaluation.overflowingText.length,
        image: result.evaluation.image,
        rtl: result.evaluation.dir === "rtl" && result.evaluation.lang === "he"
      })),
      acceptance: acceptance.checks,
      report: path.relative(root, reportFile)
    };

    if (!report.ok && shouldFail) {
      console.error(JSON.stringify(summary, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    server.close();
    chrome.kill("SIGKILL");
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
