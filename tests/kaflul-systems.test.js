const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const systems = require("../kaflul-systems");
const championsHandler = require("../api/champions");

const REPO_ROOT = path.resolve(__dirname, "..");

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function createMockResponse() {
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
      this.body = body;
    }
  };
}

function withLeaderboardEnv(env, callback) {
  const keys = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      process.env[key] = env[key];
    } else {
      delete process.env[key];
    }
  });

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      keys.forEach((key) => {
        if (previous[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous[key];
        }
      });
    });
}

function readRepoFile(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
}

test("difficulty configuration exposes five stable Hebrew difficulties", () => {
  const ids = [
    "beginner",
    "normal",
    "advanced",
    "expert",
    "legendary"
  ];
  assert.deepEqual(Object.keys(systems.DIFFICULTIES), ids);
  assert.deepEqual(ids.map((id) => systems.DIFFICULTIES[id].label), [
    "קל",
    "בינוני",
    "קשה",
    "מומחה",
    "אגדי"
  ]);
  assert.deepEqual(ids.map((id) => systems.DIFFICULTIES[id].questionMode), [
    "easyTable",
    "table",
    "hardTable",
    "extendedTable",
    "masteryTable"
  ]);
  assert.deepEqual(ids.map((id) => systems.DIFFICULTIES[id].answerTimeLimit), [25, 25, 25, 25, 25]);
  assert.deepEqual(ids.map((id) => systems.DIFFICULTIES[id].initialLives), [3, 3, 3, 3, 3]);
  assert.deepEqual(ids.map((id) => systems.DIFFICULTIES[id].enemyCount), [6, 7, 8, 9, 10]);
  assert.deepEqual(ids.map((id) => systems.DIFFICULTIES[id].scoreMultiplierPct), [100, 150, 200, 300, 500]);
  assert.ok(systems.DIFFICULTIES.legendary.enemySpeedMultiplier <= 1.1);
  assert.equal(systems.LEGENDARY_UNLOCK_RULE.expertArcadeScore, 75000);
  assert.equal(systems.normalizeDifficulty("veryHard"), "expert");
});

test("operation mode defaults to multiplication and safely normalizes saved choices", () => {
  assert.deepEqual(Object.keys(systems.OPERATION_MODES), ["multiplication", "mixed"]);
  assert.equal(systems.createDefaultSave().settings.operationMode, "multiplication");
  assert.equal(systems.normalizeOperationMode("mixed"), "mixed");
  assert.equal(systems.normalizeOperationMode("unexpected"), "multiplication");

  const restored = systems.loadSave(memoryStorage({
    [systems.SAVE_KEY]: JSON.stringify({
      schemaVersion: systems.SAVE_SCHEMA_VERSION,
      settings: { operationMode: "mixed" }
    })
  }));
  assert.equal(restored.settings.operationMode, "mixed");
});

test("division table is the exact inverse of every multiplication fact", () => {
  for (let a = 1; a <= 10; a += 1) {
    for (let b = 1; b <= 10; b += 1) {
      const first = systems.createArithmeticQuestion(a, b, {
        operation: "division",
        divisionVariant: "first"
      });
      const second = systems.createArithmeticQuestion(a, b, {
        operation: "division",
        divisionVariant: "second"
      });

      assert.equal(first.operation, "division");
      assert.equal(first.dividend % first.divisor, 0);
      assert.equal(first.answer, b);
      assert.equal(first.dividend / first.divisor, first.answer);
      assert.equal(second.dividend % second.divisor, 0);
      assert.equal(second.answer, a);
      assert.equal(second.dividend / second.divisor, second.answer);
      assert.equal(first.key, `${a}×${b}`);
    }
  }
});

test("default save locks legendary until a configured achievement", () => {
  const save = systems.createDefaultSave();
  assert.equal(systems.isDifficultyUnlocked(save, "expert"), true);
  assert.equal(systems.isDifficultyUnlocked(save, "legendary"), false);
  assert.equal(systems.shouldUnlockLegendary(save, {
    mode: "arcade",
    difficulty: "expert",
    score: systems.LEGENDARY_UNLOCK_RULE.expertArcadeScore
  }), true);
});

test("champion trophy progress persists wins and best score across game modes", () => {
  const save = systems.createDefaultSave();
  const first = systems.recordChampionTrophy(save, {
    mode: "arcade",
    score: 42000,
    earnedAt: "2026-07-26T10:00:00.000Z"
  });
  const second = systems.recordChampionTrophy(save, {
    mode: "adventure",
    score: 39000,
    earnedAt: "2026-07-27T10:00:00.000Z"
  });

  assert.equal(first.earned, true);
  assert.equal(second.totalWins, 2);
  assert.equal(second.firstEarnedAt, "2026-07-26T10:00:00.000Z");
  assert.equal(second.lastEarnedAt, "2026-07-27T10:00:00.000Z");
  assert.equal(second.bestScore, 42000);
  assert.deepEqual(second.modes, { arcade: 1, adventure: 1 });
  assert.deepEqual(save.achievementProgress.championTrophy, second);
});

test("score calculation applies difficulty and combo exactly once", () => {
  const score = systems.createScoreState();
  const award = systems.applyScoreEvent(score, {
    type: "correctAnswer",
    responseMs: 2000,
    timeLimitMs: 25000,
    questionMode: "filteredTable",
    enemyDefeated: true
  }, {
    difficulty: systems.DIFFICULTIES.normal,
    comboMultiplierPct: 150
  });

  assert.equal(award.rawPoints, 800);
  assert.equal(award.difficultyBonus, 400);
  assert.equal(award.comboBonus, 600);
  assert.equal(award.total, 1800);
  assert.equal(score.total, 1800);
});

test("math answer speed bonus uses configured thresholds", () => {
  assert.equal(systems.getSpeedBonus(2000, 20000), 220);
  assert.equal(systems.getSpeedBonus(9000, 20000), 130);
  assert.equal(systems.getSpeedBonus(14000, 20000), 60);
  assert.equal(systems.getSpeedBonus(19000, 20000), 0);
});

test("combo progression and reset are centralized", () => {
  const combo = systems.createComboState();
  systems.applyComboEvent(combo, "success");
  systems.applyComboEvent(combo, "success");
  systems.applyComboEvent(combo, "success");
  assert.equal(combo.count, 3);
  assert.equal(combo.multiplierPct, 120);

  systems.applyComboEvent(combo, "success");
  systems.applyComboEvent(combo, "success");
  assert.equal(combo.multiplierPct, 150);

  systems.applyComboEvent(combo, "lifeLost", systems.DIFFICULTIES.normal);
  assert.equal(combo.count, 3);
  assert.equal(combo.multiplierPct, 120);
  systems.applyComboEvent(combo, "lifeLost", systems.DIFFICULTIES.advanced);
  assert.equal(combo.count, 0);
  assert.equal(combo.multiplierPct, 100);
  assert.equal(combo.max, 5);
});

test("math performance tracks accuracy, average time, fastest answer and streak", () => {
  const stats = systems.createMathStats();
  systems.recordMathAnswer(stats, { correct: true, responseMs: 1800 });
  systems.recordMathAnswer(stats, { correct: true, responseMs: 900 });
  systems.recordMathAnswer(stats, { correct: false, responseMs: 5000 });

  assert.equal(stats.totalQuestions, 3);
  assert.equal(stats.correctAnswers, 2);
  assert.equal(stats.incorrectAnswers, 1);
  assert.equal(stats.fastestAnswerMs, 900);
  assert.equal(stats.maxStreak, 2);
  assert.equal(systems.getAccuracy(stats), 67);
  assert.equal(systems.getAverageAnswerTime(stats), 2567);
});

test("multiplication mastery combines commutative facts and classifies progress", () => {
  const mastery = systems.buildMultiplicationMastery({
    "7×8": { correct: 3, wrong: 0, streak: 3 },
    "8×7": { correct: 1, wrong: 1, streak: 1 },
    "6×9": { correct: 2, wrong: 2, streak: 1 },
    "4×4": { correct: 2, wrong: 0, streak: 2 }
  });

  const sevenByEight = mastery.cells.find((cell) => cell.a === 7 && cell.b === 8);
  const eightBySeven = mastery.cells.find((cell) => cell.a === 8 && cell.b === 7);
  const sixByNine = mastery.cells.find((cell) => cell.a === 6 && cell.b === 9);
  const fourSquared = mastery.cells.find((cell) => cell.a === 4 && cell.b === 4);

  assert.equal(sevenByEight.level, systems.MASTERY_LEVELS.mastered);
  assert.equal(sevenByEight.correct, 4);
  assert.equal(sevenByEight.wrong, 1);
  assert.deepEqual(eightBySeven, { ...sevenByEight, a: 8, b: 7 });
  assert.equal(sixByNine.level, systems.MASTERY_LEVELS.learning);
  assert.equal(fourSquared.level, systems.MASTERY_LEVELS.practicing);
  assert.equal(mastery.total, 100);
  assert.equal(mastery.counts.mastered, 2);
  assert.equal(mastery.counts.practicing, 1);
  assert.equal(mastery.counts.learning, 2);
});

test("multiplication mastery recommends weak facts before untouched facts", () => {
  const mastery = systems.buildMultiplicationMastery({
    "7×8": { correct: 0, wrong: 3, streak: 0 },
    "4×6": { correct: 1, wrong: 1, streak: 0 }
  }, { focusLimit: 2 });

  assert.deepEqual(
    mastery.focusFacts.map((cell) => `${cell.a}×${cell.b}`),
    ["7×8", "4×6"]
  );
  assert.equal(mastery.progressPercent > 0, true);
});

test("daily challenge is personalized, deterministic and repeats focus facts", () => {
  const stats = {
    "7×8": { correct: 0, wrong: 4, streak: 0 },
    "6×9": { correct: 1, wrong: 3, streak: 0 },
    "4×6": { correct: 1, wrong: 2, streak: 0 }
  };
  const first = systems.createDailyChallenge(stats, "2026-07-12");
  const second = systems.createDailyChallenge(stats, "2026-07-12");
  const tomorrow = systems.createDailyChallenge(stats, "2026-07-13");

  assert.deepEqual(first, second);
  assert.notEqual(first.seed, tomorrow.seed);
  assert.equal(first.questions.length, 10);
  assert.deepEqual(first.focusFacts.map((fact) => `${fact.a}×${fact.b}`), ["7×8", "6×9", "4×6"]);
  for (const focus of first.focusFacts) {
    const appearances = first.questions.filter((question) => (
      question.a === focus.a && question.b === focus.b
    )).length;
    assert.equal(appearances, 2);
  }
});

test("daily completion tracks one completion per day and consecutive streaks", () => {
  const save = systems.createDefaultSave();
  const first = systems.recordDailyCompletion(save, {
    score: 1200,
    accuracy: 80,
    correctAnswers: 10,
    seed: 44,
    completedAt: "2026-07-12T08:00:00.000Z"
  }, "2026-07-12");
  assert.equal(first.firstCompletionToday, true);
  assert.equal(save.dailyProgress.streak, 1);
  assert.equal(save.dailyProgress.totalCompleted, 1);

  const retry = systems.recordDailyCompletion(save, {
    score: 1500,
    accuracy: 90,
    correctAnswers: 10,
    seed: 44,
    completedAt: "2026-07-12T09:00:00.000Z"
  }, "2026-07-12");
  assert.equal(retry.firstCompletionToday, false);
  assert.equal(retry.improved, true);
  assert.equal(save.dailyProgress.totalCompleted, 1);
  assert.equal(save.dailyProgress.bestByDate["2026-07-12"].score, 1500);

  systems.recordDailyCompletion(save, { score: 900, accuracy: 70, correctAnswers: 10 }, "2026-07-13");
  assert.equal(save.dailyProgress.streak, 2);
  assert.equal(save.dailyProgress.totalCompleted, 2);
});

test("friend challenge code round-trips the same questions and score target", () => {
  const daily = systems.createDailyChallenge({
    "7×8": { correct: 0, wrong: 4, streak: 0 }
  }, "2026-07-12");
  const code = systems.createFriendChallenge(daily, { score: 54321, accuracy: 91 });
  const decoded = systems.decodeFriendChallenge(code);

  assert.match(code, /^KF1-(?:[A-Za-z0-9_-]{1,5}-?)+$/);
  assert.equal(decoded.seed, daily.seed);
  assert.equal(decoded.targetScore, 54321);
  assert.equal(decoded.targetAccuracy, 91);
  assert.deepEqual(
    decoded.questions.map(({ a, b, answer }) => ({ a, b, answer })),
    daily.questions.map(({ a, b, answer }) => ({ a, b, answer }))
  );
  const replacement = code.endsWith("A") ? "B" : "A";
  assert.throws(() => systems.decodeFriendChallenge(`${code.slice(0, -1)}${replacement}`), /invalid_duel_checksum/);
});

test("friend challenge decoder preserves payload hyphens that look like group separators", () => {
  const daily = systems.createDailyChallenge({
    "7×8": { correct: 0, wrong: 4, streak: 0 }
  }, "2026-07-25");
  const code = systems.createFriendChallenge(daily, { score: 4200, accuracy: 90 });
  const formattedPayload = code.slice(4);
  const rawPayload = Array.from(formattedPayload)
    .filter((_, index) => (index + 1) % 6 !== 0)
    .join("");

  assert.match(rawPayload, /-/);
  const decoded = systems.decodeFriendChallenge(code);
  assert.equal(decoded.seed, daily.seed);
  assert.equal(decoded.targetScore, 4200);
  assert.equal(decoded.targetAccuracy, 90);
});

test("duel history records whether the shared score was beaten", () => {
  const save = systems.createDefaultSave();
  const won = systems.recordDuelResult(save, {
    id: "duel-one",
    seed: 99,
    score: 1200,
    targetScore: 1100,
    accuracy: 90,
    playedAt: "2026-07-12T10:00:00.000Z"
  });
  const lost = systems.recordDuelResult(save, {
    id: "duel-two",
    seed: 100,
    score: 900,
    targetScore: 1100,
    accuracy: 80,
    playedAt: "2026-07-12T11:00:00.000Z"
  });
  assert.equal(won.won, true);
  assert.equal(lost.won, false);
  assert.equal(save.duelProgress.history.length, 2);
});

test("weekly league score counts only daily mazes from the current Monday-to-Sunday week", () => {
  const progress = {
    bestByDate: {
      "2026-07-05": { score: 9000, accuracy: 99 },
      "2026-07-06": { score: 1200, accuracy: 80 },
      "2026-07-08": { score: 1800, accuracy: 90 },
      "2026-07-13": { score: 5000, accuracy: 100 }
    }
  };
  assert.equal(systems.getWeekKey("2026-07-12"), "2026-07-06");
  const summary = systems.buildWeeklyLeagueScore(progress, "2026-07-12");
  assert.equal(summary.weekKey, "2026-07-06");
  assert.equal(summary.points, 3000);
  assert.equal(summary.daysPlayed, 2);
  assert.equal(summary.accuracy, 85);
});

test("private weekly league invite and result codes create sorted local standings", () => {
  const save = systems.createDefaultSave();
  const inviteCode = systems.createPrivateLeagueInvite("2026-07-06", "owner-one");
  const league = systems.joinPrivateLeague(save, inviteCode);
  assert.equal(league.weekKey, "2026-07-06");
  assert.equal(systems.decodePrivateLeagueInvite(inviteCode).id, league.id);

  const firstCode = systems.createWeeklyLeagueResultCode(league, 101, {
    points: 3500,
    daysPlayed: 3,
    accuracy: 88
  });
  const secondCode = systems.createWeeklyLeagueResultCode(league, 202, {
    points: 4200,
    daysPlayed: 4,
    accuracy: 84
  });
  const first = systems.decodeWeeklyLeagueResultCode(firstCode);
  const second = systems.decodeWeeklyLeagueResultCode(secondCode);
  systems.recordWeeklyLeagueEntry(save, first, { isLocal: true });
  systems.recordWeeklyLeagueEntry(save, second);
  const standings = systems.getWeeklyLeagueStandings(save.leagueProgress, league.weekKey);
  assert.deepEqual(standings.map((entry) => entry.points), [4200, 3500]);
  assert.equal(standings[1].isLocal, true);

  const replacement = secondCode.endsWith("A") ? "B" : "A";
  assert.throws(
    () => systems.decodeWeeklyLeagueResultCode(`${secondCode.slice(0, -1)}${replacement}`),
    /invalid_league_checksum/
  );
});

test("private weekly league codes preserve base64url hyphens inside their payloads", () => {
  const inviteCode = systems.createPrivateLeagueInvite("2026-07-20", "league-owner-4");
  assert.match(inviteCode, /--/);
  const invite = systems.decodePrivateLeagueInvite(inviteCode);
  assert.equal(invite.weekKey, "2026-07-20");
  assert.equal(invite.code, inviteCode);

  const league = systems.decodePrivateLeagueInvite(
    systems.createPrivateLeagueInvite("2026-07-20", "owner-one")
  );
  const resultCode = systems.createWeeklyLeagueResultCode(league, 10, {
    points: 7300,
    daysPlayed: 4,
    accuracy: 91
  });
  assert.match(resultCode, /--/);
  const result = systems.decodeWeeklyLeagueResultCode(resultCode);
  assert.equal(result.memberId, 10);
  assert.equal(result.points, 7300);
  assert.equal(result.code, resultCode);
});

test("leaderboard entries sort and filter by mode and difficulty", () => {
  const save = systems.createDefaultSave();
  const low = systems.createLeaderboardEntry({
    nickname: "אחד",
    score: 200,
    mode: "arcade",
    difficulty: "normal",
    reachedStage: 1
  });
  const high = systems.createLeaderboardEntry({
    nickname: "שתיים",
    score: 900,
    mode: "arcade",
    difficulty: "normal",
    reachedStage: 2
  });
  const adventure = systems.createLeaderboardEntry({
    nickname: "שלוש",
    score: 700,
    mode: "adventure",
    difficulty: "normal",
    reachedStage: 4
  });

  systems.addLocalLeaderboardEntry(save, low);
  systems.addLocalLeaderboardEntry(save, high);
  systems.addLocalLeaderboardEntry(save, adventure);

  const arcade = systems.getLeaderboardEntries(save, { mode: "arcade", difficulty: "normal" });
  assert.equal(arcade.length, 2);
  assert.equal(arcade[0].score, 900);

  const adventureOnly = systems.getLeaderboardEntries(save, { mode: "adventure" });
  assert.equal(adventureOnly.length, 1);
  assert.equal(adventureOnly[0].mode, "adventure");
});

test("public leaderboard UI stays local-only when public backend is unavailable", () => {
  const localOnly = systems.getPublicLeaderboardUiState("localOnly", true);
  assert.equal(localOnly.panelHidden, false);
  assert.equal(localOnly.buttonDisabled, true);
  assert.equal(localOnly.buttonText, "הסנכרון ממתין");
  assert.equal(localOnly.title, "השיא האישי נשמר");
  assert.equal(localOnly.copy, systems.PUBLIC_LEADERBOARD_LOCAL_ONLY_MESSAGE);
  assert.equal(localOnly.statusText, systems.PUBLIC_LEADERBOARD_LOCAL_ONLY_MESSAGE);
  assert.equal(localOnly.publicChipText, "הדירוג העולמי לא זמין");
  assert.equal(localOnly.publicAvailable, false);

  const ineligible = systems.getPublicLeaderboardUiState("localOnly", false);
  assert.equal(ineligible.panelHidden, true);
  assert.equal(ineligible.buttonDisabled, true);

  const available = systems.getPublicLeaderboardUiState("available", true);
  assert.equal(available.panelHidden, false);
  assert.equal(available.buttonDisabled, true);
  assert.equal(available.buttonText, "מסנכרן אוטומטית");
  assert.equal(available.publicAvailable, true);
});

test("champions API returns explicit unconfigured status without throwing", async () => {
  await withLeaderboardEnv({}, async () => {
    const response = createMockResponse();
    await championsHandler({
      method: "GET",
      headers: { host: "127.0.0.1:4173" },
      socket: { remoteAddress: "127.0.0.1" }
    }, response);

    assert.equal(response.statusCode, 503);
    assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
    assert.deepEqual(JSON.parse(response.body), {
      publicAvailable: false,
      publicSubmissionsAvailable: false,
      code: "leaderboard_not_configured",
      message: "טבלת השיאים עדיין לא הוגדרה."
    });
  });
});

test("champions API capability check stays HTTP 200 when backend is unconfigured", async () => {
  await withLeaderboardEnv({}, async () => {
    const response = createMockResponse();
    await championsHandler({
      method: "GET",
      url: "/api/champions?capability=1",
      headers: { host: "127.0.0.1:4173" },
      socket: { remoteAddress: "127.0.0.1" }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      publicAvailable: false,
      publicSubmissionsAvailable: false,
      code: "leaderboard_not_configured",
      message: "טבלת השיאים עדיין לא הוגדרה."
    });
  });
});

test("champions API rejects a score that has no signed game session", async () => {
  await withLeaderboardEnv({
    SUPABASE_URL: "https://example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "placeholder"
  }, async () => {
    const response = createMockResponse();
    await championsHandler({
      method: "POST",
      url: "/api/champions",
      headers: { host: "math-maze.example", origin: "https://math-maze.example" },
      socket: { remoteAddress: "127.0.0.1" },
      body: { score: 50000000 }
    }, response);

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), {
      code: "invalid_session",
      message: "נתוני המשחק אינם תקינים."
    });
  });
});

test("production UI uses the Kaflul SVG icon system instead of Unicode icon text", () => {
  const requiredSymbols = [
    "play",
    "pause",
    "sound-on",
    "sound-off",
    "settings",
    "leaderboard",
    "profile",
    "mode",
    "difficulty",
    "close",
    "refresh",
    "check",
    "lock",
    "lives",
    "score",
    "combo",
    "mission",
    "trophy",
    "crown",
    "rank",
    "back",
    "progress"
  ];
  const icons = readRepoFile("ui/icons.svg");
  for (const symbolId of requiredSymbols) {
    assert.match(icons, new RegExp(`<symbol\\s+id="${symbolId}"(?:\\s|>)`), `missing ui/icons.svg#${symbolId}`);
  }

  const productionFiles = [
    "index.html",
    "styles.css",
    "leaderboard.css",
    "arcade-foundation.css",
    "main-menu.css",
    "mobile-phone-refinement.css",
    "mobile-enhancements.css",
    "mobile-start-hotfix.css",
    "mobile-resolution-hotfix.css",
    "mobile-final-layout.css",
    "mobile-native-answer.css",
    "kaflul-systems.js",
    "ui/foundation.css",
    "ui/mobile-overrides.css",
    "ui/secondary-screens.css",
    "ui/motion/motion.css",
    "ui/character-animation-adapter.js",
    "ui/assets/asset-manifest.js",
    "ui/sounds/ui-sound-controller.js",
    "ui/motion/motion-system.js",
    "poster-loader.js",
    "mobile-enhancements.js",
    "mobile-question-state.js",
    "nabatick-directional.js",
    "mobile-native-answer.js",
    "mobile-screen-state.js",
    "game.js",
    "maze-enhancements.js"
  ];
  const forbiddenIconChars = [
    0x2713,
    0x2605,
    0x2665,
    0x2655,
    0x265b,
    0x266a,
    0x2699,
    0x25a3,
    0x25a5,
    0x25cf,
    0x21bb,
    0x2161,
    0x25b6,
    0x1f3c6
  ].map((codePoint) => String.fromCodePoint(codePoint));
  const forbiddenEntityPattern = /&(?:#x?2713|#10003|#x?2605|#9733|#x?2665|#9829|#x?2655|#9813|#x?265b|#9819|#x?266a|#9834|#x?2699|#9881|#x?25a3|#9635|#x?25a5|#9637|#x?25cf|#9679|#x?21bb|#8635|#x?2161|#8545|#x?25b6|#9654|#x?1f3c6|#127942);/i;
  const violations = [];

  for (const file of productionFiles) {
    const text = readRepoFile(file);
    text.split(/\n/).forEach((line, index) => {
      for (const character of forbiddenIconChars) {
        if (line.includes(character)) {
          violations.push(`${file}:${index + 1}: forbidden icon character U+${character.codePointAt(0).toString(16).toUpperCase()}`);
        }
      }
      if (forbiddenEntityPattern.test(line)) {
        violations.push(`${file}:${index + 1}: forbidden icon HTML entity`);
      }
    });
  }

  assert.deepEqual(violations, []);
  assert.equal(readRepoFile("game.js").includes("×"), true, "math multiplication sign should remain available");
});

test("mobile CSS override layer is self contained", () => {
  const mobileOverrides = readRepoFile("ui/mobile-overrides.css");
  const legacyImports = [
    "mobile-enhancements.css",
    "mobile-phone-refinement.css",
    "mobile-start-hotfix.css",
    "mobile-resolution-hotfix.css",
    "mobile-native-answer.css",
    "mobile-final-layout.css"
  ];

  assert.equal(/@import\s+url/.test(mobileOverrides), false);
  for (const file of legacyImports) {
    assert.equal(
      mobileOverrides.includes(`@import url("../${file}`),
      false,
      `ui/mobile-overrides.css should not import ${file}`
    );
    assert.match(
      mobileOverrides,
      new RegExp(`Legacy source: ${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      `ui/mobile-overrides.css should preserve a section marker for ${file}`
    );
  }
});

test("permanent gameplay HUD contains only approved metrics", () => {
  const html = readRepoFile("index.html");
  const hudMatch = html.match(/<div class="hud"[\s\S]*?<section class="stage"/);
  assert.ok(hudMatch, "index.html should contain the gameplay HUD before the stage");
  const hudMarkup = hudMatch[0];
  const metrics = [...hudMarkup.matchAll(/data-hud-metric="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(metrics, ["score", "combo", "lives", "progress", "mission"]);
  assert.equal(hudMarkup.includes("data-hud-secondary"), false);
  assert.equal(hudMarkup.includes('id="level-number"'), false);
  assert.equal(hudMarkup.includes('id="world-name"'), false);
  assert.equal(hudMarkup.includes('id="mode-label"'), false);
  assert.equal(hudMarkup.includes('id="difficulty-label"'), false);
  assert.match(hudMarkup, /ui\/icons\.svg#lives/);
  assert.match(hudMarkup, /ui\/icons\.svg#score/);
  assert.match(hudMarkup, /ui\/icons\.svg#combo/);
  assert.match(hudMarkup, /ui\/icons\.svg#progress/);
  assert.match(hudMarkup, /ui\/icons\.svg#mission/);
});

test("arcade collection HUD keeps three persistent key slots and the full כפל word", () => {
  const html = readRepoFile("index.html");
  const hudMatch = html.match(/<div class="hud"[\s\S]*?<section class="stage"/);
  assert.ok(hudMatch, "index.html should contain the gameplay HUD before the stage");
  const hudMarkup = hudMatch[0];

  assert.match(hudMarkup, /id="arcade-collection-hud"/);
  assert.equal((hudMarkup.match(/data-key-slot="[0-2]"/g) || []).length, 3);
  assert.deepEqual(
    [...hudMarkup.matchAll(/data-bonus-letter="([כפל])"/g)].map((match) => match[1]),
    ["כ", "פ", "ל"]
  );
  assert.match(hudMarkup, /ui\/icons\.svg#key/);
  assert.match(hudMarkup, /id="chest-ready-guidance"/);
  assert.match(hudMarkup, /גש לתיבה ופתח את האוצר/);
});

test("mobile HUD overrides do not hide approved permanent metrics", () => {
  const mobileOverrides = readRepoFile("ui/mobile-overrides.css");
  const hiddenApprovedMetricRules = [];

  for (const block of mobileOverrides.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    const selector = block[1];
    const declarations = block[2];
    if (
      /\.(?:metric-combo|metric-mission)\b/.test(selector)
      && /display\s*:\s*none\b/.test(declarations)
    ) {
      hiddenApprovedMetricRules.push(selector.trim().replace(/\s+/g, " "));
    }
  }

  assert.deepEqual(hiddenApprovedMetricRules, []);
});

test("nickname validation rejects empty and dangerous input", () => {
  assert.equal(systems.createDefaultSave().player.nickname, "");
  assert.equal(systems.safeNickname(), "");
  assert.equal(systems.validateNickname("").ok, false);
  assert.equal(systems.validateNickname("<script>").ok, false);
  assert.equal(systems.validateNickname("  כפלול 7  ").value, "כפלול 7");
});

test("nickname moderation blocks multilingual profanity and punctuation obfuscation", () => {
  const blocked = [
    "f.u-c_k",
    "hero.f.u.c.k.7",
    "fuuuuck",
    "s.h.1.t",
    "ש.ר-מ_ו ט ה",
    "ش.ر.م.و.ط.ة",
    "б.л.я.т.ь",
    "p.u.t.a",
    "傻.逼",
    "씨.발"
  ];
  for (const nickname of blocked) {
    const result = systems.validateNickname(nickname);
    assert.equal(result.ok, false, `expected ${nickname} to be blocked`);
    assert.equal(result.code, "inappropriate", `expected ${nickname} to be classified as inappropriate`);
  }

  for (const nickname of ["אסף", "Scunthorpe", "ClassHero", "Мария", "ليان", "小龙", "Málaga"]) {
    assert.equal(systems.validateNickname(nickname).ok, true, `expected ${nickname} to be accepted`);
  }
});

test("local persistence saves, loads, recovers corruption and migrates legacy values", () => {
  const storage = memoryStorage();
  const save = systems.createDefaultSave();
  save.settings.selectedDifficulty = "advanced";
  assert.equal(systems.persistSave(storage, save), true);
  assert.equal(systems.loadSave(storage).settings.selectedDifficulty, "advanced");

  const corruptStorage = memoryStorage({
    [systems.SAVE_KEY]: "{broken"
  });
  assert.equal(systems.loadSave(corruptStorage).recovery, "corrupt_json");

  const legacy = systems.migrateSave({
    selectedDifficulty: "veryHard",
    selectedMode: "adventure",
    nickname: "בודק"
  });
  assert.equal(legacy.settings.selectedDifficulty, "expert");
  assert.equal(legacy.settings.selectedMode, "adventure");
  assert.equal(legacy.player.nickname, "בודק");
});

test("state machine allows start, pause, resume and rejects invalid skips", () => {
  assert.equal(systems.transitionState("mainMenu", "playing"), "playing");
  assert.equal(systems.transitionState("playing", "paused"), "paused");
  assert.equal(systems.transitionState("paused", "playing"), "playing");
  assert.equal(systems.transitionState("question", "paused"), "paused");
  assert.equal(systems.transitionState("paused", "question"), "question");
  assert.throws(() => systems.transitionState("mainMenu", "results"), /Invalid game state transition/);
});

test("swipe detection filters micro-swipes and returns cardinal directions", () => {
  assert.equal(systems.detectSwipeDirection({ x: 10, y: 10 }, { x: 18, y: 12 }, { threshold: 20 }), "none");
  assert.equal(systems.detectSwipeDirection({ x: 10, y: 10 }, { x: 60, y: 18 }, { threshold: 20 }), "right");
  assert.equal(systems.detectSwipeDirection({ x: 10, y: 10 }, { x: 6, y: 70 }, { threshold: 20 }), "down");
  assert.equal(systems.detectSwipeDirection({ x: 10, y: 10 }, { x: 8, y: -40 }, { threshold: 20 }), "up");
});
