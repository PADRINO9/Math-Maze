import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";
import { resolveStaticFile } from "./static-file-security.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const webDir = join(rootDir, "dist", "android-www");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp"
};

function fail(message) {
  console.error(`[android:smoke] ${message}`);
  process.exit(1);
}

if (!existsSync(join(webDir, "index.html"))) {
  fail("dist/android-www is missing. Run tools/android_webdir_gate.mjs first.");
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const filePath = await resolveStaticFile(webDir, requestUrl.pathname);

      const body = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

const server = createStaticServer();
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices["Pixel 5"] });
const page = await context.newPage();
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));
page.on("response", (response) => {
  if (response.status() >= 400) {
    errors.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await page.goto(`${baseUrl}/?verify=android-webdir`, { waitUntil: "domcontentloaded" });
  await page.locator("#start-screen").waitFor({ state: "visible" });

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector("link[rel='manifest']");
    const href = link?.getAttribute("href") || "";
    const response = await fetch(href, { cache: "no-store" });
    return {
      href,
      ok: response.ok,
      payload: await response.json()
    };
  });

  if (!manifest.ok || manifest.payload.display !== "fullscreen") {
    fail(`manifest did not load correctly: ${JSON.stringify(manifest)}`);
  }

  await page.locator("#start-button").click();
  await page.locator("#game-canvas").waitFor({ state: "visible" });
  await page.waitForTimeout(500);

  const gameplay = await page.evaluate(() => {
    const canvas = document.querySelector("#game-canvas");
    const joystick = document.querySelector("#movement-joystick");
    const joystickStyle = joystick ? getComputedStyle(joystick) : null;
    const canvasContext = canvas?.getContext("2d");
    let painted = 0;

    if (canvasContext) {
      const data = canvasContext.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 0; index < data.length; index += 4 * 211) {
        const alpha = data[index + 3];
        const light = data[index] + data[index + 1] + data[index + 2];
        if (alpha > 0 && light > 8) painted += 1;
      }
    }

    return {
      state: document.documentElement.dataset.gameState || "",
      controlMode: document.documentElement.dataset.controlMode || "",
      canvas: canvas ? {
        width: canvas.width,
        height: canvas.height,
        painted
      } : null,
      joystickHidden: Boolean(joystick && joystickStyle && (
        joystickStyle.display === "none" || joystickStyle.visibility === "hidden" || joystickStyle.opacity === "0"
      ))
    };
  });

  if (gameplay.state !== "playing" || gameplay.controlMode !== "swipe" || !gameplay.canvas || gameplay.canvas.painted < 100 || !gameplay.joystickHidden) {
    fail(`gameplay smoke failed: ${JSON.stringify(gameplay)}`);
  }

  const question = await page.evaluate(() => window.__mathMazeRuntime?.openQuestionForVerification?.());
  if (typeof question?.answer !== "number") {
    fail("verification question did not open");
  }

  await page.locator("#question-dialog").waitFor({ state: "visible" });
  const questionAudit = await page.evaluate(() => {
    const joystick = document.querySelector("#movement-joystick");
    const style = joystick ? getComputedStyle(joystick) : null;
    return {
      state: document.documentElement.dataset.gameState || "",
      joystickHidden: Boolean(joystick && style && (
        style.display === "none" || style.visibility === "hidden" || style.opacity === "0"
      ))
    };
  });

  if (questionAudit.state !== "question" || !questionAudit.joystickHidden) {
    fail(`question smoke failed: ${JSON.stringify(questionAudit)}`);
  }

  if (errors.length > 0) {
    fail(`browser errors:\n${JSON.stringify(errors, null, 2)}`);
  }

  console.log(`[android:smoke] static bundle passed from ${relative(rootDir, webDir)}`);
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
