#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "phase5-screenshots");
const args = new Set(process.argv.slice(2));
const shouldFail = args.has("--ci");

const viewports = [
  { name: "390x844-portrait", width: 390, height: 844, mobile: true },
  { name: "430x932-portrait", width: 430, height: 932, mobile: true },
  { name: "844x390-landscape", width: 844, height: 390, mobile: true },
  { name: "1280x720-desktop", width: 1280, height: 720, mobile: false },
  { name: "1440x900-desktop", width: 1440, height: 900, mobile: false }
];

const screenFlows = [
  { name: "pregame", selector: "#pregame-panel", open: "#pregame-open-button" },
  { name: "mode", selector: "#mode-panel", open: "#mode-control-button" },
  { name: "difficulty", selector: "#difficulty-panel", open: "#difficulty-control-button" },
  { name: "settings", selector: "#settings-panel", open: "#menu-settings-button" },
  { name: "progress", selector: "#progress-panel", open: "#home-nav-progress" },
  { name: "leaderboard", selector: "#leaderboard-dialog", open: "#leaderboard-open" }
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

async function clickSelector(cdp, sessionId, selector) {
  const point = await evaluate(cdp, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  })()`);
  if (!point) throw new Error(`Missing selector for click: ${selector}`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 }, sessionId);
  await wait(140);
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
    touchPoints: [{ x: point.x, y: point.y, radiusX: 4, radiusY: 4, force: 1 }]
  }, sessionId);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, sessionId);
  await wait(160);
}

async function activateSelector(cdp, sessionId, viewport, selector) {
  if (viewport.mobile) {
    await tapSelector(cdp, sessionId, selector);
  } else {
    await clickSelector(cdp, sessionId, selector);
  }
}

async function sendKey(cdp, sessionId, key, code = key, keyCode = 0) {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode }, sessionId);
  await wait(150);
}

async function navigateSeeded(cdp, sessionId, appPort, viewport, search) {
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?${search}` }, sessionId);
  await wait(850);
  await evaluate(cdp, sessionId, "localStorage.clear(); true;");
  await evaluate(cdp, sessionId, `(() => {
    const systems = window.KaflulSystems;
    const save = systems.createDefaultSave();
    const playerId = localStorage.getItem("mathMazePlayerId") || "phase5-player";
    save.player.nickname = "בודק כפלול";
    save.settings.selectedCharacter = "nabatick";
    save.settings.selectedMode = "arcade";
    save.settings.selectedDifficulty = "normal";
    const arcade = systems.createLeaderboardEntry({
      id: "phase5-current",
      playerId,
      nickname: save.player.nickname,
      score: 48250,
      mode: "arcade",
      difficulty: "normal",
      reachedStage: 12,
      maxCombo: 18,
      accuracy: 91,
      selectedCharacter: "nabatick"
    });
    const adventure = systems.createLeaderboardEntry({
      id: "phase5-adventure",
      playerId: "phase5-other",
      nickname: "אלופת מבוכים",
      score: 31800,
      mode: "adventure",
      difficulty: "advanced",
      reachedStage: 4,
      maxCombo: 11,
      accuracy: 84,
      selectedCharacter: "bifly"
    });
    systems.addLocalLeaderboardEntry(save, arcade);
    systems.addLocalLeaderboardEntry(save, adventure);
    systems.recordPersonalBest(save, {
      mode: "arcade",
      difficulty: "normal",
      score: 48250,
      reachedStage: 12,
      maxCombo: 18,
      accuracy: 91
    });
    systems.persistSave(localStorage, save);
    localStorage.setItem("mathMazeNickname", save.player.nickname);
    localStorage.setItem("mathMazeCharacter", "nabatick");
    localStorage.setItem("mathMazeMode", "arcade");
    localStorage.setItem("mathMazeDifficulty", "normal");
    localStorage.setItem("mathMazePlayerId", playerId);
    return true;
  })()`);
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await wait(viewport.mobile ? 1100 : 900);
}

async function inspectScreen(cdp, sessionId, selector) {
  return evaluate(cdp, sessionId, `(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const root = document.querySelector(${JSON.stringify(selector)});
    const rect = root ? root.getBoundingClientRect() : null;
    const visible = Boolean(root && !root.hidden && rect.width > 0 && rect.height > 0);
    const focusInside = Boolean(root && root.contains(document.activeElement));
    const outOfBounds = rect && visible && (
      rect.x < -1
      || rect.y < -1
      || rect.x + rect.width > viewport.width + 1
      || rect.y + rect.height > viewport.height + 1
    );
    const overflowingText = [];
    for (const element of root?.querySelectorAll?.("h1,h2,h3,p,span,strong,small,button,label,legend,li") || []) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 10) {
        overflowingText.push({
          text: element.textContent.trim().slice(0, 80),
          tag: element.tagName,
          className: element.className,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight
        });
      }
    }
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      visible,
      focusInside,
      rect: rect ? {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      } : null,
      outOfBounds: Boolean(outOfBounds),
      overflowingText,
      scroll: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        xOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        yOverflow: document.documentElement.scrollHeight > window.innerHeight + 1
      },
      activeId: document.activeElement?.id || "",
      runtimeErrors: window.__mathMazeRuntime?.errors || []
    };
  })()`);
}

async function capture(cdp, sessionId, viewport, screenName, selector) {
  await wait(180);
  const evaluation = await inspectScreen(cdp, sessionId, selector);
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  }, sessionId);
  const file = path.join(outputDir, `phase5-${screenName}-${viewport.name}.png`);
  await writeFile(file, Buffer.from(screenshot.data, "base64"));
  return {
    name: screenName,
    selector,
    file: path.relative(root, file),
    evaluation
  };
}

async function closeWithEscape(cdp, sessionId, selector) {
  await sendKey(cdp, sessionId, "Escape", "Escape", 27);
  return evaluate(cdp, sessionId, `document.querySelector(${JSON.stringify(selector)})?.hidden === true`);
}

async function testFocusTrap(cdp, sessionId, selector) {
  await sendKey(cdp, sessionId, "Tab", "Tab", 9);
  await sendKey(cdp, sessionId, "Tab", "Tab", 9);
  return evaluate(cdp, sessionId, `(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    return Boolean(root && root.contains(document.activeElement));
  })()`);
}

function parseAnswer(questionText) {
  const numbers = (questionText.match(/\d+/g) || []).map(Number);
  return numbers.length >= 2 ? numbers[0] * numbers[1] : 1;
}

async function submitAnswer(cdp, sessionId, answer) {
  await evaluate(cdp, sessionId, `(() => {
    const input = document.getElementById("answer-input");
    input.value = ${JSON.stringify(String(answer))};
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("submit-answer").click();
    return true;
  })()`);
  await wait(1100);
}

async function waitForQuestion(cdp, sessionId, timeoutMs = 12000) {
  const start = Date.now();
  let tick = 0;
  while (Date.now() - start < timeoutMs) {
    const visible = await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === false");
    if (visible) return true;
    const directions = [
      ["ArrowRight", "ArrowRight", 39],
      ["ArrowDown", "ArrowDown", 40],
      ["ArrowLeft", "ArrowLeft", 37],
      ["ArrowUp", "ArrowUp", 38]
    ];
    if (tick % 3 === 0) {
      const [key, code, codeNum] = directions[(tick / 3) % directions.length];
      await sendKey(cdp, sessionId, key, code, codeNum);
    }
    tick += 1;
    await wait(250);
  }
  return false;
}

async function answerQuestionIfVisible(cdp, sessionId) {
  const visible = await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === false");
  if (!visible) return false;
  const answer = await evaluate(cdp, sessionId, "document.getElementById('question-title')?.textContent || ''").then(parseAnswer);
  await submitAnswer(cdp, sessionId, answer);
  return true;
}

async function startGameForSecondary(cdp, sessionId, viewport) {
  await activateSelector(cdp, sessionId, viewport, "#start-button");
  await wait(520);
  await answerQuestionIfVisible(cdp, sessionId);
}

async function openPauseForSecondary(cdp, sessionId, viewport) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await answerQuestionIfVisible(cdp, sessionId);
    const ready = await evaluate(cdp, sessionId, `(() => (
      document.getElementById("question-dialog")?.hidden === true
      && document.getElementById("pause-button")?.dataset.icon === "pause"
    ))()`);
    if (ready) {
      await activateSelector(cdp, sessionId, viewport, "#pause-button");
      await wait(260);
      const visible = await evaluate(cdp, sessionId, "document.getElementById('pause-screen')?.hidden === false");
      if (visible) return true;
    }
    await wait(320);
  }
  return false;
}

async function driveGameOver(cdp, sessionId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false")) {
      return true;
    }
    const question = await waitForQuestion(cdp, sessionId, 18000);
    if (!question) break;
    await submitAnswer(cdp, sessionId, 9999);
  }
  return evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false");
}

async function verifyPersistence(cdp, sessionId, appPort) {
  await evaluate(cdp, sessionId, `(() => {
    const input = document.getElementById("player-name-input");
    input.value = "בודק שמירה";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("settings-save-button").click();
    return true;
  })()`);
  await wait(240);
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase5-persistence=1` }, sessionId);
  await wait(900);
  return evaluate(cdp, sessionId, `(() => ({
    nickname: document.getElementById("player-name-input")?.value,
    greeting: document.getElementById("player-greeting")?.textContent,
    soundIcon: document.getElementById("menu-sound-button")?.dataset.icon,
    mode: document.querySelector("input[name='game-mode']:checked")?.value,
    difficulty: document.querySelector("input[name='difficulty']:checked")?.value,
    character: document.querySelector("input[name='character']:checked")?.value
  }))()`);
}

async function runViewport(cdp, appPort, viewport) {
  const { targetId, sessionId } = await createPage(cdp, viewport);
  const { events, off } = collectEvents(cdp, sessionId);
  const screenshots = [];
  const closeChecks = [];
  const focusChecks = [];

  await navigateSeeded(cdp, sessionId, appPort, viewport, `phase5=${viewport.name}`);

  for (const flow of screenFlows) {
    await activateSelector(cdp, sessionId, viewport, flow.open);
    focusChecks.push({ screen: flow.name, ok: await testFocusTrap(cdp, sessionId, flow.selector) });
    screenshots.push(await capture(cdp, sessionId, viewport, flow.name, flow.selector));
    closeChecks.push({ screen: flow.name, closed: await closeWithEscape(cdp, sessionId, flow.selector) });
  }

  await activateSelector(cdp, sessionId, viewport, "#menu-settings-button");
  const persistence = await verifyPersistence(cdp, sessionId, appPort);
  await closeWithEscape(cdp, sessionId, "#settings-panel");

  await startGameForSecondary(cdp, sessionId, viewport);
  const pauseOpened = await openPauseForSecondary(cdp, sessionId, viewport);
  focusChecks.push({ screen: "pause", ok: pauseOpened && await testFocusTrap(cdp, sessionId, "#pause-screen") });
  screenshots.push(await capture(cdp, sessionId, viewport, "pause", "#pause-screen"));
  closeChecks.push({ screen: "pause", closed: await closeWithEscape(cdp, sessionId, "#pause-screen") });

  const gameOver = await driveGameOver(cdp, sessionId);
  if (gameOver) {
    focusChecks.push({ screen: "results", ok: await testFocusTrap(cdp, sessionId, "#end-screen") });
    screenshots.push(await capture(cdp, sessionId, viewport, "results", "#end-screen"));
    closeChecks.push({ screen: "results", closed: await closeWithEscape(cdp, sessionId, "#end-screen") });
  }

  const postRun = await evaluate(cdp, sessionId, `(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    runtimeErrors: window.__mathMazeRuntime?.errors || [],
    currentHighlightExists: Boolean(document.querySelector(".leaderboard-list .is-current-player")),
    legendaryLocked: document.querySelector("input[value='legendary']")?.disabled === true
  }))()`);

  off();
  await cdp.send("Target.closeTarget", { targetId });

  return {
    ...viewport,
    events,
    screenshots,
    closeChecks,
    focusChecks,
    persistence,
    gameOver,
    postRun
  };
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("No Chrome or Chromium executable found. Set CHROME_PATH to run Phase 5 secondary verification.");
  }

  await mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const appPort = server.address().port;
  const cdpPort = 11000 + Math.floor(Math.random() * 500);
  const userDataDir = path.join("/private/tmp", `kaflul-phase5-secondary-${process.pid}`);
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
      results.push(await runViewport(cdp, appPort, viewport));
    }

    const failures = [];
    for (const result of results) {
      if (result.events.length) failures.push(`${result.name}: console/log errors`);
      if (!result.gameOver) failures.push(`${result.name}: results screen did not open from game-over flow`);
      if (result.postRun.lang !== "he" || result.postRun.dir !== "rtl") failures.push(`${result.name}: RTL/lang mismatch`);
      if (result.postRun.runtimeErrors.length) failures.push(`${result.name}: runtime errors`);
      if (result.persistence.nickname !== "בודק שמירה") failures.push(`${result.name}: nickname did not persist`);
      if (result.persistence.mode !== "arcade" || result.persistence.difficulty !== "normal" || result.persistence.character !== "nabatick") {
        failures.push(`${result.name}: saved selections changed unexpectedly`);
      }
      for (const check of result.closeChecks) {
        if (!check.closed) failures.push(`${result.name}/${check.screen}: Escape did not close`);
      }
      for (const check of result.focusChecks) {
        if (!check.ok) failures.push(`${result.name}/${check.screen}: focus trap failed`);
      }
      for (const shot of result.screenshots) {
        const evaluation = shot.evaluation;
        if (!evaluation.visible) failures.push(`${result.name}/${shot.name}: not visible`);
        if (!evaluation.focusInside) failures.push(`${result.name}/${shot.name}: focus outside dialog`);
        if (evaluation.outOfBounds) failures.push(`${result.name}/${shot.name}: out of bounds`);
        if (evaluation.scroll.xOverflow || evaluation.scroll.yOverflow) failures.push(`${result.name}/${shot.name}: document overflow`);
        if (evaluation.overflowingText.length) failures.push(`${result.name}/${shot.name}: text overflow`);
        if (evaluation.runtimeErrors.length) failures.push(`${result.name}/${shot.name}: runtime errors`);
      }
    }

    const report = {
      phase: 5,
      capturedAt: new Date().toISOString(),
      chrome: version.Browser,
      ok: failures.length === 0,
      failures,
      results
    };
    const reportFile = path.join(outputDir, "phase5-secondary-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    await cdp.send("Browser.close").catch(() => {});

    const summary = {
      ok: report.ok,
      failures,
      screenshots: results.flatMap((result) => result.screenshots.map((shot) => ({
        viewport: result.name,
        screen: shot.name,
        file: shot.file,
        visible: shot.evaluation.visible,
        focusInside: shot.evaluation.focusInside,
        textOverflow: shot.evaluation.overflowingText.length,
        overflow: shot.evaluation.scroll
      }))),
      closeChecks: results.flatMap((result) => result.closeChecks.map((check) => ({ viewport: result.name, ...check }))),
      focusChecks: results.flatMap((result) => result.focusChecks.map((check) => ({ viewport: result.name, ...check }))),
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
