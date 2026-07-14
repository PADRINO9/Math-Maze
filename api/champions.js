"use strict";

const SCORE_LIMIT = 10;

function sendJson(response, status, payload) {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function getSupabaseConfig() {
  return {
    url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, ""),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };
}

function getRequestOriginHost(request) {
  return request.headers["x-forwarded-host"] || request.headers.host || "";
}

function isSameOriginRequest(request) {
  const origin = request.headers.origin;
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === getRequestOriginHost(request);
  } catch {
    return false;
  }
}

function isCapabilityRequest(request) {
  try {
    const host = getRequestOriginHost(request) || "localhost";
    const url = new URL(request.url || "/api/champions", `https://${host}`);
    return request.method === "GET" && url.searchParams.get("capability") === "1";
  } catch {
    return false;
  }
}

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(`${config.url}${path}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error("Supabase request failed");
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
}

function mapScore(row) {
  return {
    playerName: row.player_name,
    score: row.score,
    correctAnswers: row.correct_answers,
    levelReached: row.level_reached,
    difficulty: row.difficulty,
    timeLimitEnabled: row.time_limit_enabled,
    updatedAt: row.updated_at
  };
}

async function getScores(config) {
  const query = new URLSearchParams({
    select: "player_name,score,correct_answers,level_reached,difficulty,time_limit_enabled,updated_at",
    order: "score.desc,correct_answers.desc,updated_at.asc",
    limit: String(SCORE_LIMIT)
  });
  const rows = await supabaseRequest(config, `/rest/v1/champion_scores?${query.toString()}`, {
    method: "GET"
  });
  return Array.isArray(rows) ? rows.map(mapScore) : [];
}

module.exports = async function championsHandler(request, response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");

  if (!isSameOriginRequest(request)) {
    sendJson(response, 403, {
      code: "origin_not_allowed",
      message: "הבקשה חייבת להגיע מאתר המשחק."
    });
    return;
  }

  const config = getSupabaseConfig();
  if (isCapabilityRequest(request)) {
    response.setHeader("Cache-Control", "no-store");
    if (!config.url || !config.serviceRoleKey) {
      sendJson(response, 200, {
        publicAvailable: false,
        code: "leaderboard_not_configured",
        message: "טבלת השיאים עדיין לא הוגדרה."
      });
      return;
    }

    try {
      await getScores(config);
      sendJson(response, 200, {
        publicAvailable: true,
        publicSubmissionsAvailable: false
      });
    } catch {
      sendJson(response, 200, {
        publicAvailable: false,
        code: "leaderboard_unavailable",
        message: "טבלת השיאים הציבורית לא זמינה כרגע."
      });
    }
    return;
  }

  if (!config.url || !config.serviceRoleKey) {
    sendJson(response, 503, {
      code: "leaderboard_not_configured",
      message: "טבלת השיאים עדיין לא הוגדרה."
    });
    return;
  }

  try {
    if (request.method === "GET") {
      response.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
      const scores = await getScores(config);
      sendJson(response, 200, { scores });
      return;
    }

    if (request.method === "POST") {
      response.setHeader("Cache-Control", "no-store");
      sendJson(response, 403, {
        code: "score_submission_disabled",
        message: "פרסום שיאים ציבורי יופעל לאחר הוספת אימות משחק בצד השרת."
      });
      return;
    }

    response.setHeader("Allow", "GET");
    sendJson(response, 405, {
      code: "method_not_allowed",
      message: "שיטת הבקשה אינה נתמכת."
    });
  } catch (error) {
    console.error("Champion leaderboard error", {
      status: error?.status,
      details: error?.details
    });
    sendJson(response, 502, {
      code: "leaderboard_unavailable",
      message: "טבלת השיאים אינה זמינה כרגע."
    });
  }
};
