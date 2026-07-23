import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = process.env.KAFLUL_ANDROID_CDP || "http://127.0.0.1:9222";
const holdAt = process.env.KAFLUL_ANDROID_HOLD_AT || "";
const outputDir = path.resolve("docs/visual-proof-screenshots/boss-encounter");
await mkdir(outputDir, { recursive: true });

const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = targets.find((candidate) => candidate.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("Android WebView CDP target was not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let requestId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result || {});
});

function send(method, params = {}) {
  requestId += 1;
  const id = requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description
      || result.exceptionDetails.exception?.value
      || result.exceptionDetails.text;
    throw new Error(detail || "Android WebView evaluation failed");
  }
  return result.result?.value;
}

async function waitFor(expression, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

function leaveAt(label, value) {
  console.log(JSON.stringify({ holdAt: label, value }, null, 2));
  socket.close();
  process.exit(0);
}

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: "https://localhost/?verify=android-boss-1.3" });
await waitFor("window.__mathMazeRuntime?.gameReady");
const startVisible = await evaluate(`(() => {
  const element = document.querySelector("#start-screen");
  return element && !element.hidden;
})()`);
if (startVisible) {
  await evaluate(`document.querySelector("#start-button").click()`);
  await waitFor(`document.querySelector("#start-screen")?.hidden`);
}

await evaluate(`(() => {
  const runtime = window.__mathMazeRuntime;
  runtime.forceLevelForVerification(0);
  runtime.setBossQuestionFeedbackDelayForVerification(120);
  runtime.forceBossChallenge();
  runtime.completeBossCinematicForVerification();
  runtime.setPlayerCellForVerification(30, 23);
  runtime.setBossCellForVerification(20, 23);
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));
const chase = await evaluate(`window.__mathMazeRuntime.getBossEncounterSnapshot()`);
if (holdAt === "chase") leaveAt("chase", chase);

const contact = await evaluate(`window.__mathMazeRuntime.forceBossContactForVerification()`);
await waitFor(`!document.querySelector("#question-dialog")?.hidden`);
if (holdAt === "question") {
  await new Promise((resolve) => setTimeout(resolve, 280));
  leaveAt("question", contact);
}

await evaluate(`window.__mathMazeRuntime.answerCurrentQuestionForVerification(undefined, true)`);
await new Promise((resolve) => setTimeout(resolve, 100));
const afterHit = await evaluate(`({
  encounter: window.__mathMazeRuntime.getBossEncounterSnapshot(),
  audio: window.KaflulAudio?.getDiagnostics?.() || null
})`);
if (holdAt === "after-hit") {
  await new Promise((resolve) => setTimeout(resolve, 360));
  leaveAt("after-hit", afterHit);
}

const report = {
  generatedAt: new Date().toISOString(),
  passed: chase.boss?.speedRatio >= 1.12
    && chase.camera?.player?.onScreen
    && chase.camera?.boss?.onScreen
    && contact.question?.status?.includes("פגיעה")
    && contact.encounter?.boss?.contactCount === 1
    && afterHit.encounter?.boss?.healthRemaining === 2
    && afterHit.encounter?.phase === "playing"
    && (afterHit.audio?.loadErrors || 0) === 0,
  chase,
  contact: {
    status: contact.question?.status,
    contactCount: contact.encounter?.boss?.contactCount,
    camera: contact.encounter?.camera
  },
  afterHit
};
await writeFile(path.join(outputDir, "android-16-proof.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
socket.close();
if (!report.passed) process.exitCode = 1;
