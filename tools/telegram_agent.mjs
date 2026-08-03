import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const MAX_TELEGRAM_FILE_BYTES = 50 * 1024 * 1024;
const DEFAULT_API_BASE = "https://api.telegram.org";
const STATE_FILE = path.join(PROJECT_ROOT, ".telegram-agent-state.json");

function printUsage() {
  console.log(`Kaflul Telegram agent

Usage:
  node tools/telegram_agent.mjs whoami
  node tools/telegram_agent.mjs chat-id
  node tools/telegram_agent.mjs inbox [--all]
  node tools/telegram_agent.mjs send <file> [--caption "message"]
  node tools/telegram_agent.mjs send-latest-apk [--caption "message"]
  node tools/telegram_agent.mjs notify --message "message"

Environment:
  TELEGRAM_BOT_TOKEN   Bot token from @BotFather
  TELEGRAM_CHAT_ID     Private chat, group, or channel id
  TELEGRAM_API_BASE    Optional, defaults to ${DEFAULT_API_BASE}
`);
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const raw = await readFile(filePath, "utf8");
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function loadLocalEnv() {
  await loadEnvFile(path.join(PROJECT_ROOT, ".env"));
  await loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));
}

async function loadState() {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function saveState(state) {
  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function requireToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN. Create a bot with @BotFather and put the token in .env.");
  }
  return token;
}

function requireChatId() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw new Error("Missing TELEGRAM_CHAT_ID. Run `npm run telegram:chat-id` after sending a message to the bot.");
  }
  return chatId;
}

function apiUrl(method) {
  const base = process.env.TELEGRAM_API_BASE || DEFAULT_API_BASE;
  return new URL(`/bot${requireToken()}/${method}`, base);
}

function requestBuffer(url, { method = "POST", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method,
        headers: {
          "User-Agent": "kaflul-telegram-agent/1.0",
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");
          let parsed;
          try {
            parsed = JSON.parse(responseBody);
          } catch (error) {
            reject(new Error(`Telegram returned a non-JSON response (${response.statusCode}): ${responseBody}`));
            return;
          }
          if (!parsed.ok) {
            reject(new Error(parsed.description || `Telegram API error ${response.statusCode}`));
            return;
          }
          resolve(parsed.result);
        });
      },
    );
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

async function telegramJson(method, payload = {}) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  return requestBuffer(apiUrl(method), {
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(body.byteLength),
    },
    body,
  });
}

function multipartTextPart(boundary, name, value) {
  return Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${String(value)}\r\n`,
    "utf8",
  );
}

function multipartFilePart(boundary, name, fileName, mimeType, fileBuffer) {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
      "utf8",
    ),
    fileBuffer,
    Buffer.from("\r\n", "utf8"),
  ]);
}

async function telegramDocument(filePath, caption) {
  const resolvedPath = path.resolve(PROJECT_ROOT, filePath);
  const fileStats = await stat(resolvedPath);
  if (!fileStats.isFile()) {
    throw new Error(`Not a file: ${resolvedPath}`);
  }
  if (fileStats.size > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error(
      `Telegram Bot API cloud upload limit is 50MB. This file is ${(fileStats.size / 1024 / 1024).toFixed(1)}MB.`,
    );
  }

  const boundary = `----kaflul-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const fileBuffer = await readFile(resolvedPath);
  const parts = [
    multipartTextPart(boundary, "chat_id", requireChatId()),
    multipartFilePart(boundary, "document", path.basename(resolvedPath), "application/vnd.android.package-archive", fileBuffer),
  ];
  if (caption) {
    parts.splice(1, 0, multipartTextPart(boundary, "caption", caption));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  const body = Buffer.concat(parts);

  return requestBuffer(apiUrl("sendDocument"), {
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.byteLength),
    },
    body,
  });
}

async function walkForApks(rootDir) {
  if (!existsSync(rootDir)) return [];
  const found = [];
  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".apk")) {
        const fileStats = await stat(fullPath);
        found.push({ filePath: fullPath, mtimeMs: fileStats.mtimeMs, size: fileStats.size });
      }
    }
  }
  await visit(rootDir);
  return found;
}

async function findLatestApk() {
  const searchRoots = [
    path.join(PROJECT_ROOT, "dist"),
    path.join(PROJECT_ROOT, "android", "app", "build", "outputs", "apk"),
  ];
  const apks = (await Promise.all(searchRoots.map(walkForApks))).flat();
  apks.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return apks[0] || null;
}

function summarizeChat(chat) {
  const title = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "unknown";
  const username = chat.username ? ` @${chat.username}` : "";
  return `${chat.id} | ${chat.type} | ${title}${username}`;
}

function summarizeUpdate(update) {
  const message = update.message || update.channel_post;
  if (!message) return null;
  const chat = message.chat;
  const author = message.from?.username
    ? `@${message.from.username}`
    : [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || "unknown";
  const text = message.text || message.caption || `[${Object.keys(message).filter((key) => key !== "chat" && key !== "from").join(", ")}]`;
  return {
    updateId: update.update_id,
    line: `${update.update_id} | ${summarizeChat(chat)} | ${author}: ${text}`,
  };
}

async function run() {
  await loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  const [command, maybeFile] = args._;

  if (!command || command === "help" || command === "--help") {
    printUsage();
    return;
  }

  if (command === "whoami") {
    const me = await telegramJson("getMe");
    console.log(`Connected to @${me.username} (${me.first_name || "Telegram bot"})`);
    return;
  }

  if (command === "chat-id") {
    const updates = await telegramJson("getUpdates", {
      allowed_updates: ["message", "channel_post", "my_chat_member"],
      timeout: 0,
    });
    const chats = new Map();
    for (const update of updates) {
      const chat = update.message?.chat || update.channel_post?.chat || update.my_chat_member?.chat;
      if (chat) chats.set(chat.id, chat);
    }
    if (chats.size === 0) {
      console.log("No chats found yet. Open the bot in Telegram, send it any message, then run this command again.");
      return;
    }
    console.log("Available Telegram chat ids:");
    for (const chat of chats.values()) {
      console.log(`  ${summarizeChat(chat)}`);
    }
    return;
  }

  if (command === "inbox") {
    const state = await loadState();
    const payload = {
      allowed_updates: ["message", "channel_post"],
      timeout: 0,
    };
    if (!args.all && Number.isInteger(state.lastUpdateId)) {
      payload.offset = state.lastUpdateId + 1;
    }
    const updates = await telegramJson("getUpdates", payload);
    const messages = updates.map(summarizeUpdate).filter(Boolean);
    if (messages.length === 0) {
      console.log("No new Telegram messages.");
      return;
    }
    console.log("Telegram inbox:");
    for (const message of messages) {
      console.log(`  ${message.line}`);
    }
    const newestUpdateId = Math.max(...messages.map((message) => message.updateId));
    if (!args.all) {
      await saveState({ ...state, lastUpdateId: newestUpdateId });
    }
    return;
  }

  if (command === "notify") {
    const message = args.message || args.caption;
    if (!message) throw new Error("Missing --message");
    const sent = await telegramJson("sendMessage", {
      chat_id: requireChatId(),
      text: message,
    });
    console.log(`Telegram message sent: ${sent.message_id}`);
    return;
  }

  if (command === "send") {
    if (!maybeFile) throw new Error("Missing file path.");
    const caption = args.caption || `Kaflul build: ${path.basename(maybeFile)}`;
    const sent = await telegramDocument(maybeFile, caption);
    console.log(`Telegram document sent: ${sent.document?.file_name || maybeFile}`);
    return;
  }

  if (command === "send-latest-apk") {
    const latest = await findLatestApk();
    if (!latest) throw new Error("No APK files found in dist/ or android/app/build/outputs/apk/.");
    const relativePath = path.relative(PROJECT_ROOT, latest.filePath);
    const caption = args.caption || `Kaflul Android build\n${path.basename(latest.filePath)}`;
    const sent = await telegramDocument(relativePath, caption);
    console.log(`Telegram APK sent: ${sent.document?.file_name || relativePath}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

run().catch((error) => {
  console.error(`Telegram agent failed: ${error.message}`);
  process.exitCode = 1;
});
