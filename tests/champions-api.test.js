"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const championsHandler = require("../api/champions.js");

const PLAYER_ID = "74d8f8db-3d41-4f4d-84e1-09b2f8bbbfc2";
const OTHER_PLAYER_ID = "b36f8b33-c83a-46ca-a0aa-752f438f9828";

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    end(body = "") {
      this.body = String(body);
    }
  };
}

function parseResponse(response) {
  return JSON.parse(response.body || "{}");
}

test("leaderboard session tickets are signed and bound to one anonymous player", () => {
  const config = { signingSecret: "test-signing-secret" };
  const session = championsHandler._private.signSession(config, PLAYER_ID);

  assert.ok(session.token.includes("."));
  assert.equal(championsHandler._private.verifySession(config, session.token, PLAYER_ID)?.playerId, PLAYER_ID);
  assert.equal(championsHandler._private.verifySession(config, session.token, OTHER_PLAYER_ID), null);
  assert.equal(championsHandler._private.verifySession({ signingSecret: "wrong" }, session.token, PLAYER_ID), null);
});

test("legacy offensive leaderboard names are never returned to players", () => {
  assert.equal(championsHandler._private.sanitizePublicNickname("f.u-c_k"), "כינוי הוסר");
  assert.equal(championsHandler._private.sanitizePublicNickname("נועה 7"), "נועה 7");
});

test("score validation accepts current game fields and rejects an impossible level", () => {
  const session = {
    playerId: PLAYER_ID,
    issuedAt: Date.now() - 15_000,
    expiresAt: Date.now() + 60_000
  };
  const submission = {
    playerId: PLAYER_ID,
    playerName: "אלוף 7",
    score: 12_450,
    correctAnswers: 28,
    incorrectAnswers: 2,
    levelReached: 2,
    mode: "adventure",
    difficulty: "legendary",
    operationMode: "mixed",
    selectedCharacter: "nabatick",
    maxCombo: 11,
    accuracy: 93,
    playTimeMs: 11_000,
    timeLimitEnabled: true,
    gameVersion: "test"
  };

  const valid = championsHandler._private.validateScoreSubmission(submission, session);
  assert.equal(valid.error, undefined);
  assert.equal(valid.value.difficulty, "legendary");
  assert.equal(valid.value.levelReached, 2);

  const invalid = championsHandler._private.validateScoreSubmission({ ...submission, levelReached: 4 }, session);
  assert.equal(invalid.error, "invalid_level");

  const inappropriate = championsHandler._private.validateScoreSubmission({
    ...submission,
    playerName: "f.u-c_k"
  }, session);
  assert.equal(inappropriate.error, "inappropriate_player_name");
});

test("capability endpoint reports a truthful disabled state without server secrets", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousSecret = process.env.LEADERBOARD_SIGNING_SECRET;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.LEADERBOARD_SIGNING_SECRET;

  try {
    const request = {
      method: "GET",
      url: "/api/champions?capability=1",
      headers: { host: "localhost:3000" },
      socket: { remoteAddress: "127.0.0.11" }
    };
    const response = createResponse();
    await championsHandler(request, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(parseResponse(response), {
      publicAvailable: false,
      publicSubmissionsAvailable: false,
      code: "leaderboard_not_configured",
      message: "טבלת השיאים עדיין לא הוגדרה."
    });
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.LEADERBOARD_SIGNING_SECRET;
    else process.env.LEADERBOARD_SIGNING_SECRET = previousSecret;
  }
});

test("Capacitor Android origin receives a narrow CORS preflight allowance", async () => {
  const request = {
    method: "OPTIONS",
    url: "/api/champions",
    headers: {
      host: "math-maze-il.vercel.app",
      origin: "https://localhost"
    },
    socket: { remoteAddress: "127.0.0.13" }
  };
  const response = createResponse();
  await championsHandler(request, response);

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["access-control-allow-origin"], "https://localhost");
  assert.equal(response.headers["access-control-allow-methods"], "GET, POST, OPTIONS");
  assert.match(response.headers["access-control-allow-headers"], /Content-Type/);
});

test("global list returns top scores plus the exact current-player world rank", async () => {
  const previousFetch = global.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://leaderboard.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-test-key";

  global.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer server-only-test-key");
    if (String(url).includes("get_champion_rank")) {
      return new Response(JSON.stringify({
        rank: 42,
        totalPlayers: 1200,
        score: 18_500,
        scoreToNextRank: 175,
        playerName: "אלוף 7"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify([{
      player_id: PLAYER_ID,
      player_name: "אלוף 7",
      score: 18_500,
      correct_answers: 52,
      level_reached: 2,
      game_mode: "arcade",
      difficulty: "normal",
      operation_mode: "multiplication",
      selected_character: "bifly",
      max_combo: 14,
      accuracy: 96,
      updated_at: "2026-08-03T08:00:00.000Z"
    }]), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const request = {
      method: "GET",
      url: `/api/champions?limit=50&playerId=${PLAYER_ID}`,
      headers: { host: "localhost:3000" },
      socket: { remoteAddress: "127.0.0.12" }
    };
    const response = createResponse();
    await championsHandler(request, response);
    const payload = parseResponse(response);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.scope, "global");
    assert.equal(payload.scores[0].isCurrentPlayer, true);
    assert.equal(payload.player.rank, 42);
    assert.equal(payload.player.totalPlayers, 1200);
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
