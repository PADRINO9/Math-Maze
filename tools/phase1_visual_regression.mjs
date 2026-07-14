#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "phase1-screenshots");
const baselineDir = path.join(root, "docs", "baseline-screenshots");
const args = new Set(process.argv.slice(2));
const shouldFailOnRegression = args.has("--ci");
const diffThreshold = Number(process.env.KAFLUL_VISUAL_DIFF_THRESHOLD || 0.12);

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
  return new Promise((resolve, reject) => {
    const request = new Request(target);
    fetch(request)
      .then(async (response) => {
        if (!response.ok) throw new Error(`${target} returned ${response.status}`);
        resolve(await response.json());
      })
      .catch(reject);
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

async function compareImages(cdp, baselineDataUrl, currentDataUrl) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Runtime.enable", {}, sessionId);
  const result = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(${async function compareInBrowser(input) {
      function load(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Image failed to load"));
          image.src = src;
        });
      }

      const [baseline, current] = await Promise.all([load(input.baseline), load(input.current)]);
      if (baseline.width !== current.width || baseline.height !== current.height) {
        return {
          dimensionMismatch: true,
          width: current.width,
          height: current.height,
          baselineWidth: baseline.width,
          baselineHeight: baseline.height,
          diffPixels: baseline.width * baseline.height,
          diffRatio: 1,
          meanDelta: 255
        };
      }

      const canvas = document.createElement("canvas");
      canvas.width = baseline.width;
      canvas.height = baseline.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(baseline, 0, 0);
      const a = context.getImageData(0, 0, canvas.width, canvas.height).data;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(current, 0, 0);
      const b = context.getImageData(0, 0, canvas.width, canvas.height).data;

      let diffPixels = 0;
      let totalDelta = 0;
      for (let index = 0; index < a.length; index += 4) {
        const dr = Math.abs(a[index] - b[index]);
        const dg = Math.abs(a[index + 1] - b[index + 1]);
        const db = Math.abs(a[index + 2] - b[index + 2]);
        const da = Math.abs(a[index + 3] - b[index + 3]);
        const delta = Math.max(dr, dg, db, da);
        totalDelta += (dr + dg + db + da) / 4;
        if (delta > 28) diffPixels += 1;
      }

      const pixels = canvas.width * canvas.height;
      return {
        dimensionMismatch: false,
        width: current.width,
        height: current.height,
        baselineWidth: baseline.width,
        baselineHeight: baseline.height,
        diffPixels,
        diffRatio: diffPixels / pixels,
        meanDelta: totalDelta / pixels
      };
    }})(${JSON.stringify({ baseline: baselineDataUrl, current: currentDataUrl })})`
  }, sessionId);
  await cdp.send("Target.closeTarget", { targetId });
  return result.result.value;
}

async function runAcceptance(cdp, appPort) {
  const events = [];
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
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
  });

  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Log.enable", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 430,
    height: 932,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 430,
    screenHeight: 932
  }, sessionId);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId);
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase1-acceptance=1` }, sessionId);
  await wait(900);

  const beforeReload = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(${async function acceptanceBeforeReload() {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const click = async (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error("Missing selector: " + selector);
        element.click();
        await wait(80);
      };
      const clickClosestLabel = async (selector) => {
        const input = document.querySelector(selector);
        if (!input) throw new Error("Missing input: " + selector);
        input.closest("label")?.click();
        await wait(120);
      };
      const typeValue = (selector, value) => {
        const input = document.querySelector(selector);
        if (!input) throw new Error("Missing input: " + selector);
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };

      localStorage.clear();
      await click(".menu-character-nabatick");
      await click("#mode-control-button");
      const modeSheetOpened = !document.getElementById("mode-panel").hidden;
      await clickClosestLabel("input[name='game-mode'][value='adventure']");
      await click("#difficulty-control-button");
      const difficultySheetOpened = !document.getElementById("difficulty-panel").hidden;
      await clickClosestLabel("input[name='difficulty'][value='advanced']");
      await click("#menu-settings-button");
      const settingsSheetOpened = !document.getElementById("settings-panel").hidden;
      typeValue("#player-name-input", "בודק יסוד");
      await click("#settings-save-button");
      await click("#leaderboard-open");
      const leaderboardOpened = !document.getElementById("leaderboard-dialog").hidden;
      await click("#leaderboard-close");
      await click("#menu-sound-button");

      return {
        character: document.querySelector("input[name='character']:checked")?.value,
        mode: document.querySelector("input[name='game-mode']:checked")?.value,
        difficulty: document.querySelector("input[name='difficulty']:checked")?.value,
        nickname: document.getElementById("player-name-input")?.value,
        soundIcon: document.getElementById("menu-sound-button")?.dataset.icon,
        modeSheetOpened,
        difficultySheetOpened,
        settingsSheetOpened,
        leaderboardOpened,
        runtimeErrors: window.__mathMazeRuntime?.errors || []
      };
    }})()`
  }, sessionId);

  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await wait(1200);

  const afterReload = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(${async function acceptanceAfterReload() {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const click = async (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error("Missing selector: " + selector);
        element.click();
        await wait(120);
      };
      const setValue = (selector, value) => {
        const input = document.querySelector(selector);
        if (!input) throw new Error("Missing input: " + selector);
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };

      const persisted = {
        character: document.querySelector("input[name='character']:checked")?.value,
        mode: document.querySelector("input[name='game-mode']:checked")?.value,
        difficulty: document.querySelector("input[name='difficulty']:checked")?.value,
        nickname: document.getElementById("player-name-input")?.value,
        soundIcon: document.getElementById("menu-sound-button")?.dataset.icon
      };

      setValue("#player-name-input", persisted.nickname || "בודק יסוד");
      await click("#start-button");
      const gameStarted = document.getElementById("start-screen").hidden === true;
      await click("#pause-button");
      const paused = document.getElementById("pause-button")?.dataset.icon === "play";
      await click("#pause-button");
      const resumed = document.getElementById("pause-button")?.dataset.icon === "pause";
      await click("#restart-button");
      const returnedToMenu = document.getElementById("start-screen").hidden === false;

      return {
        persisted,
        gameStarted,
        paused,
        resumed,
        returnedToMenu,
        runtimeErrors: window.__mathMazeRuntime?.errors || []
      };
    }})()`
  }, sessionId);

  off();
  await cdp.send("Target.closeTarget", { targetId });

  const before = beforeReload.result.value;
  const after = afterReload.result.value;
  const checks = {
    characterPersisted: before.character === "nabatick" && after.persisted.character === "nabatick",
    modePersisted: before.mode === "adventure" && after.persisted.mode === "adventure",
    difficultyPersisted: before.difficulty === "advanced" && after.persisted.difficulty === "advanced",
    nicknamePersisted: before.nickname === "בודק יסוד" && after.persisted.nickname === "בודק יסוד",
    soundPersisted: before.soundIcon === "sound-off" && after.persisted.soundIcon === "sound-off",
    modeSheetOpened: before.modeSheetOpened,
    difficultySheetOpened: before.difficultySheetOpened,
    settingsSheetOpened: before.settingsSheetOpened,
    leaderboardOpened: before.leaderboardOpened,
    gameStarted: after.gameStarted,
    pauseResume: after.paused && after.resumed,
    returnedToMenu: after.returnedToMenu,
    noRuntimeErrors: before.runtimeErrors.length === 0 && after.runtimeErrors.length === 0,
    noConsoleErrors: events.length === 0
  };

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    before,
    after,
    events
  };
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("No Chrome or Chromium executable found. Set CHROME_PATH to run visual regression.");
  }

  await mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const appPort = server.address().port;
  const cdpPort = 9400 + Math.floor(Math.random() * 500);
  const userDataDir = path.join("/private/tmp", `kaflul-phase1-visual-${process.pid}`);
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

  let chromeStderr = "";
  chrome.stderr.on("data", (chunk) => {
    chromeStderr += chunk.toString();
  });

  try {
    const version = await waitForChrome(cdpPort);
    const cdp = new CDP(version.webSocketDebuggerUrl);
    await cdp.ready;
    const results = [];

    for (const viewport of viewports) {
      const events = [];
      const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
      const off = cdp.onEvent((payload) => {
        if (payload.sessionId !== sessionId) return;
        if (payload.method === "Runtime.consoleAPICalled") {
          const text = (payload.params.args || []).map((arg) => arg.value || arg.description || "").join(" ");
          if (payload.params.type === "error") events.push({ type: "console", level: "error", text });
        }
        if (payload.method === "Runtime.exceptionThrown") {
          const details = payload.params.exceptionDetails || {};
          events.push({ type: "exception", text: details.text || details.exception?.description || "Runtime exception" });
        }
        if (payload.method === "Log.entryAdded") {
          const entry = payload.params.entry || {};
          if (entry.level === "error") events.push({ type: "log", level: entry.level, text: entry.text });
        }
      });

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

      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase1=${viewport.name}` }, sessionId);
      await wait(2600);

      const evaluation = await cdp.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const doc = document.documentElement;
          const rect = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              x: Math.round(box.x),
              y: Math.round(box.y),
              width: Math.round(box.width),
              height: Math.round(box.height),
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity
            };
          };
          return {
            title: document.title,
            dir: doc.dir,
            lang: doc.lang,
            selectedCharacter: document.querySelector("input[name='character']:checked")?.value || null,
            selectedMode: document.querySelector("input[name='game-mode']:checked")?.value || null,
            selectedDifficulty: document.querySelector("input[name='difficulty']:checked")?.value || null,
            soundIcon: document.getElementById("sound-button")?.dataset.icon || null,
            pauseIcon: document.getElementById("pause-button")?.dataset.icon || null,
            runtimeErrors: window.__mathMazeRuntime?.errors || [],
            manifestLoaded: Boolean(window.KAFLUL_ASSET_MANIFEST?.iconSprite),
            scroll: {
              width: doc.scrollWidth,
              height: doc.scrollHeight,
              xOverflow: doc.scrollWidth > window.innerWidth + 1,
              yOverflow: doc.scrollHeight > window.innerHeight + 1
            },
            rects: {
              startScreen: rect("#start-screen"),
              logo: rect(".menu-logo"),
              hero: rect(".menu-hero"),
              bifly: rect(".menu-character-bifly .character-card"),
              nabatick: rect(".menu-character-nabatick .character-card"),
              cta: rect("#start-button"),
              leaderboard: rect(".menu-leaderboard-card"),
              controlStrip: rect(".menu-control-strip")
            }
          };
        })()`
      }, sessionId);

      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false
      }, sessionId);
      const screenshotBytes = Buffer.from(screenshot.data, "base64");
      const outputPath = path.join(outputDir, `phase1-home-${viewport.name}.png`);
      await writeFile(outputPath, screenshotBytes);

      const baselinePath = path.join(baselineDir, `phase0-home-${viewport.name}.png`);
      let comparison = null;
      if (existsSync(baselinePath)) {
        const baselineBytes = await readFile(baselinePath);
        comparison = await compareImages(
          cdp,
          `data:image/png;base64,${baselineBytes.toString("base64")}`,
          `data:image/png;base64,${screenshotBytes.toString("base64")}`
        );
      }

      results.push({
        ...viewport,
        file: path.relative(root, outputPath),
        baseline: path.relative(root, baselinePath),
        comparison,
        events,
        evaluation: evaluation.result.value
      });

      off();
      await cdp.send("Target.closeTarget", { targetId });
    }

    const acceptance = await runAcceptance(cdp, appPort);
    const report = {
      phase: 1,
      capturedAt: new Date().toISOString(),
      chrome: version.Browser,
      diffThreshold,
      acceptance,
      results
    };
    await writeFile(path.join(outputDir, "phase1-visual-report.json"), JSON.stringify(report, null, 2));

    const failures = results.filter((result) => (
      result.events.length > 0
      || (result.evaluation.runtimeErrors || []).length > 0
      || result.evaluation.scroll.xOverflow
      || result.evaluation.scroll.yOverflow
      || !result.evaluation.manifestLoaded
      || !result.comparison
      || result.comparison.dimensionMismatch
      || result.comparison.diffRatio > diffThreshold
    ));

    await cdp.send("Browser.close").catch(() => {});
    if (failures.length || !acceptance.ok) {
      const summary = failures.map((failure) => ({
        name: failure.name,
        diffRatio: failure.comparison?.diffRatio ?? null,
        events: failure.events.length,
        runtimeErrors: failure.evaluation.runtimeErrors?.length || 0,
        overflow: failure.evaluation.scroll,
        manifestLoaded: failure.evaluation.manifestLoaded
      }));
      console.error(JSON.stringify({ ok: false, failures: summary, acceptance }, null, 2));
      if (shouldFailOnRegression) process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify({
      ok: true,
      results: results.map((result) => ({
        name: result.name,
        file: result.file,
        diffRatio: Number(result.comparison.diffRatio.toFixed(6)),
        meanDelta: Number(result.comparison.meanDelta.toFixed(3)),
        events: result.events.length,
        runtimeErrors: result.evaluation.runtimeErrors.length,
        overflow: result.evaluation.scroll
      }))
      ,
      acceptance: acceptance.checks
    }, null, 2));
  } finally {
    server.close();
    chrome.kill("SIGKILL");
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    if (chromeStderr && process.env.KAFLUL_DEBUG_CHROME) {
      console.error(chromeStderr);
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
