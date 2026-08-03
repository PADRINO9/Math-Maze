import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outputDir = path.join(root, "docs", "visual-proof-screenshots", "audio-production");
await mkdir(outputDir, { recursive: true });

const server = spawn("python3", ["-m", "http.server", "4173", "--bind", "127.0.0.1"], {
  cwd: root,
  stdio: "ignore"
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function browserLaunchOptions() {
  const options = { headless: true };
  const installedBrowsers = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  ];
  for (const executablePath of installedBrowsers) {
    try {
      await access(executablePath);
      return { ...options, executablePath };
    } catch {}
  }
  return options;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:4173/");
      if (response.ok) return;
    } catch {}
    await wait(150);
  }
  throw new Error("Proof server did not start");
}

try {
  await waitForServer();
  const browser = await chromium.launch(await browserLaunchOptions());
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktop.newPage();
  await page.goto("http://127.0.0.1:4173/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady && window.KaflulAudio);
  await page.click("#start-button");
  await page.waitForFunction(() => window.KaflulAudio.getDiagnostics().loaded >= 4);
  await page.evaluate(() => {
    const canvasStream = document.getElementById("game-canvas").captureStream(30);
    const audioStream = window.KaflulAudio.createCaptureStream();
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);
    window.__audioProofChunks = [];
    window.__audioProofRecorder = new MediaRecorder(combined, {
      mimeType: "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: 2_400_000,
      audioBitsPerSecond: 128_000
    });
    window.__audioProofRecorder.ondataavailable = (event) => {
      if (event.data.size) window.__audioProofChunks.push(event.data);
    };
    window.__audioProofRecorder.start(250);
  });

  await wait(1_300);
  await page.evaluate(() => window.__mathMazeRuntime.forceBossIceTrailForVerification());
  await wait(1_800);
  await page.screenshot({ path: path.join(outputDir, "audio-boss-desktop-1280x800.png"), fullPage: true });
  const question = await page.evaluate(() => window.__mathMazeRuntime.openBossQuestionForVerification());
  await wait(850);
  await page.screenshot({ path: path.join(outputDir, "audio-question-desktop-1280x800.png"), fullPage: true });
  for (const digit of String(question.answer)) await page.click(`[data-keypad-digit="${digit}"]`);
  await page.click('[data-keypad-action="submit"]');
  await wait(1_500);
  await page.evaluate(() => {
    window.KaflulAudio.setQuestionDucked(false);
    window.KaflulAudio.play("missionComplete");
    window.KaflulAudio.playCharacter("bifly", "victory", { gain: 0.72 });
  });
  await wait(1_300);

  const videoBase64 = await page.evaluate(() => new Promise((resolve) => {
    const recorder = window.__audioProofRecorder;
    recorder.onstop = () => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(new Blob(window.__audioProofChunks, { type: "video/webm" }));
    };
    recorder.stop();
  }));
  const videoPath = path.join(outputDir, "kaflul-audio-gameplay-proof.webm");
  await writeFile(videoPath, Buffer.from(videoBase64, "base64"));
  const diagnostics = await page.evaluate(() => window.KaflulAudio.getDiagnostics());

  const reviewPage = await desktop.newPage();
  await reviewPage.setViewportSize({ width: 960, height: 720 });
  await reviewPage.setContent("<style>html,body{margin:0;background:#000}video{width:960px;height:720px;object-fit:contain}</style><video controls></video>");
  await reviewPage.evaluate((source) => { document.querySelector("video").src = source; }, `data:video/webm;base64,${videoBase64}`);
  await reviewPage.waitForFunction(() => document.querySelector("video")?.readyState >= 2);
  for (const [seconds, filename] of [[1.5, "audio-proof-frame-1.png"], [4.5, "audio-proof-frame-2.png"]]) {
    await reviewPage.evaluate((time) => new Promise((resolve) => {
      const video = document.querySelector("video");
      video.currentTime = Math.min(time, Math.max(0, video.duration - 0.1));
      video.onseeked = resolve;
    }), seconds);
    await reviewPage.screenshot({ path: path.join(outputDir, filename) });
  }
  await reviewPage.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
  await mobilePage.click("#menu-settings-button");
  await mobilePage.locator("#audio-mixer-title").scrollIntoViewIfNeeded();
  await mobilePage.screenshot({ path: path.join(outputDir, "audio-mixer-mobile-390x844.png"), fullPage: true });
  await mobile.close();
  await desktop.close();
  await browser.close();

  const report = {
    ok: diagnostics.loadErrors === 0 && diagnostics.played > 0,
    diagnostics,
    files: [
      "audio-boss-desktop-1280x800.png",
      "audio-question-desktop-1280x800.png",
      "audio-mixer-mobile-390x844.png",
      "kaflul-audio-gameplay-proof.webm",
      "audio-proof-frame-1.png",
      "audio-proof-frame-2.png"
    ]
  };
  await writeFile(path.join(outputDir, "audio-production-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  server.kill("SIGTERM");
}
