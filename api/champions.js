"use strict";

const crypto = require("node:crypto");
const SYSTEMS = require("../kaflul-systems.js");

const DEFAULT_SCORE_LIMIT = 50;
const MAX_SCORE_LIMIT = 50;
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MINIMUM_CORRECT_ANSWERS = 1;
const REQUEST_WINDOW_MS = 60 * 1000;
const REQUEST_LIMIT = 60;
const SUBMISSION_LIMIT = 12;
const rateBuckets = new Map();

const MODES = new Set(["arcade", "adventure"]);
const DIFFICULTIES = new Set(["beginner", "normal", "advanced", "expert", "legendary"]);
const CHARACTERS = new Set(["bifly", "nabatick"]);
const OPERATION_MODES = new Set(["multiplication", "mixed"]);
const NATIVE_APP_ORIGINS = new Set(["https://localhost", "capacitor://localhost"]);
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendJson(response, status, payload) {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function getSupabaseConfig() {
  return {
    url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, ""),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    signingSecret: process.env.LEADERBOARD_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };
}

function getRequestOriginHost(request) {
  return request.headers["x-forwarded-host"] || request.headers.host || "";
}

function getRequestIp(request) {
  return String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 96);
}

function isSameOriginRequest(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === getRequestOriginHost(request) || NATIVE_APP_ORIGINS.has(origin);
  } catch {
    return false;
  }
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (!origin || !NATIVE_APP_ORIGINS.has(origin)) return;
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
  response.setHeader("Access-Control-Max-Age", "7200");
  response.setHeader("Vary", "Origin");
}

function requestUrl(request) {
  const host = getRequestOriginHost(request) || "localhost";
  return new URL(request.url || "/api/champions", `https://${host}`);
}

function takeRateLimit(key, limit) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= REQUEST_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

function cleanupRateLimits() {
  if (rateBuckets.size < 500) return;
  const cutoff = Date.now() - REQUEST_WINDOW_MS * 2;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.startedAt < cutoff) rateBuckets.delete(key);
  }
}

async function supabaseRequest(config, path, options = {}) {
  const result = await fetch(`${config.url}${path}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await result.json().catch(() => null);
  if (!result.ok) {
    const error = new Error("Supabase request failed");
    error.status = result.status;
    error.details = payload;
    throw error;
  }
  return payload;
}

function normalizeDifficulty(value) {
  return {
    easy: "beginner",
    medium: "normal",
    hard: "advanced",
    veryHard: "expert"
  }[value] || value;
}

function sanitizePublicNickname(value) {
  const nickname = SYSTEMS.validateNickname(value);
  return nickname.ok ? nickname.value : "כינוי הוסר";
}

function mapScore(row, currentPlayerId = "") {
  return {
    playerName: sanitizePublicNickname(row.player_name),
    score: row.score,
    correctAnswers: row.correct_answers,
    levelReached: row.level_reached,
    mode: row.game_mode,
    difficulty: row.difficulty,
    operationMode: row.operation_mode,
    selectedCharacter: row.selected_character,
    maxCombo: row.max_combo,
    accuracy: row.accuracy,
    updatedAt: row.updated_at,
    isCurrentPlayer: Boolean(currentPlayerId && row.player_id === currentPlayerId)
  };
}

function parseListQuery(url) {
  const mode = url.searchParams.get("mode") || "all";
  const rawDifficulty = url.searchParams.get("difficulty") || "all";
  const difficulty = rawDifficulty === "all" ? "all" : normalizeDifficulty(rawDifficulty);
  const playerId = url.searchParams.get("playerId") || "";
  const limit = Math.min(MAX_SCORE_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_SCORE_LIMIT));
  return {
    mode: mode === "all" || MODES.has(mode) ? mode : "all",
    difficulty: difficulty === "all" || DIFFICULTIES.has(difficulty) ? difficulty : "all",
    playerId: UUID_V4_PATTERN.test(playerId) ? playerId : "",
    limit
  };
}

async function getScores(config, filters = {}) {
  const query = new URLSearchParams({
    select: "player_id,player_name,score,correct_answers,level_reached,game_mode,difficulty,operation_mode,selected_character,max_combo,accuracy,updated_at",
    order: "score.desc,correct_answers.desc,updated_at.asc",
    limit: String(filters.limit || DEFAULT_SCORE_LIMIT)
  });
  if (filters.mode && filters.mode !== "all") query.set("game_mode", `eq.${filters.mode}`);
  if (filters.difficulty && filters.difficulty !== "all") query.set("difficulty", `eq.${filters.difficulty}`);
  const rows = await supabaseRequest(config, `/rest/v1/champion_scores?${query.toString()}`, { method: "GET" });
  return Array.isArray(rows) ? rows.map((row) => mapScore(row, filters.playerId)) : [];
}

async function getPlayerSummary(config, playerId) {
  if (!playerId) return null;
  const summary = await supabaseRequest(config, "/rest/v1/rpc/get_champion_rank", {
    method: "POST",
    body: JSON.stringify({ p_player_id: playerId })
  });
  if (summary?.playerName) {
    summary.playerName = sanitizePublicNickname(summary.playerName);
  }
  return summary;
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function signSession(config, playerId) {
  const now = Date.now();
  const payload = encodeBase64Url(JSON.stringify({
    version: 1,
    playerId,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
    nonce: crypto.randomBytes(12).toString("base64url")
  }));
  const signature = crypto.createHmac("sha256", config.signingSecret).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt: now + SESSION_TTL_MS };
}

function verifySession(config, token, playerId) {
  try {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) return null;
    const expected = crypto.createHmac("sha256", config.signingSecret).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      decoded.version !== 1 || decoded.playerId !== playerId
      || !Number.isFinite(decoded.issuedAt) || !Number.isFinite(decoded.expiresAt)
      || decoded.issuedAt > Date.now() + 30_000 || decoded.expiresAt < Date.now()
    ) return null;
    return decoded;
  } catch {
    return null;
  }
}

function readBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) return request.body;
  try {
    return JSON.parse(Buffer.isBuffer(request.body) ? request.body.toString("utf8") : String(request.body || "{}"));
  } catch {
    return null;
  }
}

function validateScoreSubmission(raw, session) {
  const playerId = String(raw?.playerId || "");
  const nickname = SYSTEMS.validateNickname(raw?.playerName);
  const playerName = nickname.value;
  const mode = MODES.has(raw?.mode) ? raw.mode : "";
  const difficulty = normalizeDifficulty(raw?.difficulty);
  const operationMode = OPERATION_MODES.has(raw?.operationMode) ? raw.operationMode : "multiplication";
  const selectedCharacter = CHARACTERS.has(raw?.selectedCharacter) ? raw.selectedCharacter : "bifly";
  const score = Number(raw?.score);
  const correctAnswers = Number(raw?.correctAnswers);
  const incorrectAnswers = Number(raw?.incorrectAnswers);
  const levelReached = Number(raw?.levelReached);
  const maxCombo = Number(raw?.maxCombo);
  const accuracy = Number(raw?.accuracy);
  const playTimeMs = Number(raw?.playTimeMs);
  const now = Date.now();

  if (!UUID_V4_PATTERN.test(playerId) || !session || session.playerId !== playerId) return { error: "invalid_session" };
  if (!nickname.ok) {
    return { error: nickname.code === "inappropriate" ? "inappropriate_player_name" : "invalid_player_name" };
  }
  if (!mode || !DIFFICULTIES.has(difficulty)) return { error: "invalid_category" };
  if (!Number.isInteger(correctAnswers) || correctAnswers < MINIMUM_CORRECT_ANSWERS || correctAnswers > 5000) return { error: "invalid_correct_answers" };
  if (!Number.isInteger(incorrectAnswers) || incorrectAnswers < 0 || incorrectAnswers > 5000) return { error: "invalid_incorrect_answers" };
  if (!Number.isInteger(levelReached) || levelReached < 1 || levelReached > 200) return { error: "invalid_level" };
  if (!Number.isInteger(score) || score < 1 || score > Math.min(50_000_000, correctAnswers * 100_000 + levelReached * 50_000)) return { error: "invalid_score" };
  if (!Number.isInteger(maxCombo) || maxCombo < 0 || maxCombo > correctAnswers) return { error: "invalid_combo" };
  if (!Number.isInteger(accuracy) || accuracy < 0 || accuracy > 100) return { error: "invalid_accuracy" };
  const calculatedAccuracy = Math.round((correctAnswers / Math.max(1, correctAnswers + incorrectAnswers)) * 100);
  if (Math.abs(calculatedAccuracy - accuracy) > 1) return { error: "invalid_accuracy" };
  if (!Number.isFinite(playTimeMs) || playTimeMs < correctAnswers * 100 || playTimeMs > 12 * 60 * 60 * 1000) return { error: "invalid_play_time" };
  const elapsedSinceTicket = now - session.issuedAt;
  if (elapsedSinceTicket < Math.max(1500, correctAnswers * 150) || playTimeMs > elapsedSinceTicket + 60_000) return { error: "invalid_play_time" };

  const expectedLevel = mode === "adventure"
    ? Math.min(4, Math.floor(correctAnswers / 27) + 1)
    : Math.floor(correctAnswers / 27) + 1;
  if (levelReached !== expectedLevel) return { error: "invalid_level" };

  return {
    value: {
      playerId,
      playerName,
      score,
      correctAnswers,
      incorrectAnswers,
      levelReached,
      mode,
      difficulty,
      operationMode,
      selectedCharacter,
      maxCombo,
      accuracy,
      playTimeMs: Math.floor(playTimeMs),
      timeLimitEnabled: raw?.timeLimitEnabled !== false,
      gameVersion: String(raw?.gameVersion || "unknown").slice(0, 48)
    }
  };
}

async function submitScore(config, submission) {
  return supabaseRequest(config, "/rest/v1/rpc/submit_champion_score", {
    method: "POST",
    body: JSON.stringify({
      p_player_id: submission.playerId,
      p_player_name: submission.playerName,
      p_score: submission.score,
      p_correct_answers: submission.correctAnswers,
      p_incorrect_answers: submission.incorrectAnswers,
      p_level_reached: submission.levelReached,
      p_game_mode: submission.mode,
      p_difficulty: submission.difficulty,
      p_operation_mode: submission.operationMode,
      p_selected_character: submission.selectedCharacter,
      p_max_combo: submission.maxCombo,
      p_accuracy: submission.accuracy,
      p_play_time_ms: submission.playTimeMs,
      p_time_limit_enabled: submission.timeLimitEnabled,
      p_game_version: submission.gameVersion
    })
  });
}

async function championsHandler(request, response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "interest-cohort=()");
  cleanupRateLimits();

  if (!isSameOriginRequest(request)) {
    sendJson(response, 403, { code: "origin_not_allowed", message: "הבקשה חייבת להגיע מאתר המשחק." });
    return;
  }
  setCorsHeaders(request, response);
  if (request.method === "OPTIONS") {
    response.status(204);
    response.end();
    return;
  }
  if (!takeRateLimit(`ip:${getRequestIp(request)}`, REQUEST_LIMIT)) {
    sendJson(response, 429, { code: "rate_limited", message: "יותר מדי בקשות. נסו שוב בעוד רגע." });
    return;
  }

  const config = getSupabaseConfig();
  const url = requestUrl(request);
  const capabilityRequest = request.method === "GET" && url.searchParams.get("capability") === "1";
  if (!config.url || !config.serviceRoleKey || !config.signingSecret) {
    sendJson(response, capabilityRequest ? 200 : 503, {
      publicAvailable: false,
      publicSubmissionsAvailable: false,
      code: "leaderboard_not_configured",
      message: "טבלת השיאים עדיין לא הוגדרה."
    });
    return;
  }

  try {
    if (capabilityRequest) {
      response.setHeader("Cache-Control", "no-store");
      await getScores(config, { limit: 1 });
      sendJson(response, 200, {
        publicAvailable: true,
        publicSubmissionsAvailable: true,
        automaticSync: true,
        minimumCorrectAnswers: MINIMUM_CORRECT_ANSWERS
      });
      return;
    }

    if (request.method === "GET") {
      const filters = parseListQuery(url);
      response.setHeader("Cache-Control", filters.playerId ? "private, no-store" : "public, s-maxage=20, stale-while-revalidate=40");
      const [scores, player] = await Promise.all([
        getScores(config, filters),
        getPlayerSummary(config, filters.playerId)
      ]);
      sendJson(response, 200, { scores, player, scope: "global", totalShown: scores.length });
      return;
    }

    if (request.method === "POST" && url.searchParams.get("action") === "session") {
      response.setHeader("Cache-Control", "no-store");
      const body = readBody(request);
      const playerId = String(body?.playerId || "");
      if (!UUID_V4_PATTERN.test(playerId)) {
        sendJson(response, 400, { code: "invalid_player", message: "מזהה השחקן אינו תקין." });
        return;
      }
      const session = signSession(config, playerId);
      sendJson(response, 200, { sessionToken: session.token, expiresAt: session.expiresAt });
      return;
    }

    if (request.method === "POST") {
      response.setHeader("Cache-Control", "no-store");
      const body = readBody(request);
      const playerId = String(body?.playerId || "");
      if (!takeRateLimit(`player:${playerId}`, SUBMISSION_LIMIT)) {
        sendJson(response, 429, { code: "rate_limited", message: "השיא כבר מסתנכרן. נסו שוב בעוד רגע." });
        return;
      }
      const session = verifySession(config, body?.sessionToken, playerId);
      const validation = validateScoreSubmission(body, session);
      if (validation.error) {
        sendJson(response, 400, { code: validation.error, message: "נתוני המשחק אינם תקינים." });
        return;
      }
      const saved = await submitScore(config, validation.value);
      const player = await getPlayerSummary(config, playerId);
      sendJson(response, 200, { ...saved, player, automaticSync: true });
      return;
    }

    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, { code: "method_not_allowed", message: "שיטת הבקשה אינה נתמכת." });
  } catch (error) {
    console.error("Champion leaderboard error", { status: error?.status, details: error?.details });
    sendJson(response, 502, { code: "leaderboard_unavailable", message: "טבלת אלוף האלופים אינה זמינה כרגע." });
  }
}

championsHandler._private = {
  getSupabaseConfig,
  mapScore,
  normalizeDifficulty,
  parseListQuery,
  sanitizePublicNickname,
  isSameOriginRequest,
  signSession,
  verifySession,
  validateScoreSubmission
};

module.exports = championsHandler;
