#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.KAFLUL_PLAYWRIGHT_PORT) || 4173;

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".json") || filePath.endsWith(".webmanifest")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".wav")) return "audio/wav";
  if (filePath.endsWith(".m4a")) return "audio/mp4";
  return "application/octet-stream";
}

createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://127.0.0.1:${PORT}`);
  if (requestUrl.pathname === "/api/champions") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({
      publicAvailable: false,
      publicSubmissionsAvailable: false,
      code: "leaderboard_not_configured",
      message: "טבלת השיאים עדיין לא הוגדרה."
    }));
    return;
  }

  try {
    const resolved = await resolveStaticFile(ROOT, requestUrl.pathname);
    const bytes = await readFile(resolved);
    response.writeHead(200, { "content-type": contentType(resolved), "cache-control": "no-store" });
    response.end(bytes);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`[playwright-server] http://127.0.0.1:${PORT}`);
});
