(function attachKaflulSystems(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  root.KaflulSystems = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createKaflulSystems() {
  "use strict";

  const GAME_VERSION = "2026.06-arcade-foundation";
  const SAVE_KEY = "kaflulArcadeSave";
  const SAVE_SCHEMA_VERSION = 2;
  const DEFAULT_NICKNAME = "אלוף כפלול";
  const MAX_NICKNAME_LENGTH = 14;
  const MASTERY_RANGE = Object.freeze({ min: 1, max: 10 });
  const MASTERY_LEVELS = Object.freeze({
    unpracticed: "unpracticed",
    learning: "learning",
    practicing: "practicing",
    mastered: "mastered"
  });
  const LEAGUE_ALIASES = Object.freeze([
    "ברק", "נמר", "כוכב", "טיל", "דרקון", "פנדה",
    "שועל", "נינג׳ה", "סערה", "פלאש", "אריה", "קוסם"
  ]);

  const GAME_MODES = {
    adventure: {
      id: "adventure",
      label: "מצב הרפתקה",
      shortLabel: "הרפתקה"
    },
    arcade: {
      id: "arcade",
      label: "מצב ארקייד",
      shortLabel: "ארקייד"
    }
  };

  const DIFFICULTIES = {
    beginner: {
      id: "beginner",
      label: "מתחילים",
      enemyCount: 8,
      enemySpeedMultiplier: 0.86,
      enemyAiAggressiveness: 0.78,
      answerTimeLimit: 30,
      questionMode: "table",
      availableHints: 2,
      initialLives: 4,
      comboTolerance: 1,
      scoreMultiplierPct: 100,
      progressionSpeed: 0.72,
      mistakePenalty: 0.6
    },
    normal: {
      id: "normal",
      label: "רגיל",
      enemyCount: 10,
      enemySpeedMultiplier: 1,
      enemyAiAggressiveness: 1,
      answerTimeLimit: 25,
      questionMode: "filteredTable",
      availableHints: 1,
      initialLives: 3,
      comboTolerance: 0,
      scoreMultiplierPct: 150,
      progressionSpeed: 1,
      mistakePenalty: 1
    },
    advanced: {
      id: "advanced",
      label: "מתקדם",
      enemyCount: 11,
      enemySpeedMultiplier: 1.12,
      enemyAiAggressiveness: 1.12,
      answerTimeLimit: 20,
      questionMode: "twoByOne",
      availableHints: 0,
      initialLives: 3,
      comboTolerance: 0,
      scoreMultiplierPct: 200,
      progressionSpeed: 1.18,
      mistakePenalty: 1.2
    },
    expert: {
      id: "expert",
      label: "מומחה",
      enemyCount: 12,
      enemySpeedMultiplier: 1.25,
      enemyAiAggressiveness: 1.24,
      answerTimeLimit: 16,
      questionMode: "twoByTwo",
      availableHints: 0,
      initialLives: 2,
      comboTolerance: 0,
      scoreMultiplierPct: 300,
      progressionSpeed: 1.38,
      mistakePenalty: 1.5
    },
    legendary: {
      id: "legendary",
      label: "אגדי",
      enemyCount: 14,
      enemySpeedMultiplier: 1.42,
      enemyAiAggressiveness: 1.42,
      answerTimeLimit: 12,
      questionMode: "legendary",
      availableHints: 0,
      initialLives: 1,
      comboTolerance: 0,
      scoreMultiplierPct: 500,
      progressionSpeed: 1.7,
      mistakePenalty: 2
    }
  };

  const LEGENDARY_UNLOCK_RULE = {
    id: "expert_mastery",
    label: "סיימו הרפתקה במומחה או הגיעו ל-75,000 נקודות בארקייד מומחה",
    expertArcadeScore: 75000
  };

  const PUBLIC_LEADERBOARD_LOCAL_ONLY_MESSAGE = "טבלת השיאים הציבורית עדיין לא פעילה. השיא נשמר במכשיר הזה.";

  const LEGACY_DIFFICULTY_MAP = {
    easy: "beginner",
    medium: "normal",
    normal: "normal",
    hard: "advanced",
    veryHard: "expert",
    impossible: "expert"
  };

  const SCORE_CONFIG = {
    collectibleFallback: 10,
    answerBase: 300,
    enemyDefeated: 220,
    missionBonusFallback: 420,
    stageComplete: 1800,
    arcadeWaveComplete: 1200,
    lifeRemaining: 650,
    noHit: 1800,
    accuracyExcellent: 2200,
    accuracyGood: 900,
    timeBonusMax: 1200,
    complexity: {
      table: 0,
      filteredTable: 60,
      twoByOne: 150,
      twoByTwo: 290,
      legendary: 460
    },
    speedBonuses: [
      { ratio: 0.25, absoluteMs: 3500, points: 220 },
      { ratio: 0.5, absoluteMs: 7000, points: 130 },
      { ratio: 0.75, absoluteMs: 12000, points: 60 }
    ],
    comboThresholds: [
      { count: 20, multiplierPct: 300 },
      { count: 10, multiplierPct: 200 },
      { count: 5, multiplierPct: 150 },
      { count: 3, multiplierPct: 120 }
    ]
  };

  const GAME_STATES = [
    "boot",
    "loading",
    "mainMenu",
    "modeSelection",
    "difficultySelection",
    "characterSelection",
    "playing",
    "question",
    "paused",
    "levelComplete",
    "gameOver",
    "results",
    "leaderboard"
  ];

  const STATE_TRANSITIONS = {
    boot: ["loading", "mainMenu"],
    loading: ["mainMenu"],
    mainMenu: ["modeSelection", "difficultySelection", "characterSelection", "playing", "leaderboard"],
    modeSelection: ["mainMenu", "difficultySelection", "characterSelection", "playing"],
    difficultySelection: ["mainMenu", "modeSelection", "characterSelection", "playing"],
    characterSelection: ["mainMenu", "modeSelection", "difficultySelection", "playing"],
    playing: ["question", "paused", "levelComplete", "gameOver", "results", "mainMenu"],
    question: ["playing", "paused", "gameOver", "results", "mainMenu"],
    paused: ["playing", "question", "mainMenu", "results"],
    levelComplete: ["playing", "results", "mainMenu"],
    gameOver: ["results", "mainMenu"],
    results: ["playing", "mainMenu", "leaderboard"],
    leaderboard: ["mainMenu", "results"]
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeGameMode(value) {
    return GAME_MODES[value] ? value : "arcade";
  }

  function normalizeDifficulty(value) {
    const mapped = LEGACY_DIFFICULTY_MAP[value] || value;
    return DIFFICULTIES[mapped] ? mapped : "normal";
  }

  function normalizeCharacterId(value) {
    return value === "nabatick" ? "nabatick" : "bifly";
  }

  function validateNickname(value) {
    const normalized = String(value || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) {
      return {
        ok: false,
        value: "",
        error: "צריך לבחור כינוי קצר לפני שמתחילים."
      };
    }

    const trimmed = Array.from(normalized).slice(0, MAX_NICKNAME_LENGTH).join("");
    if (!/^[\p{Script=Hebrew}A-Za-z0-9 _.\-]+$/u.test(trimmed)) {
      return {
        ok: false,
        value: "",
        error: "הכינוי יכול לכלול אותיות, מספרים, רווח, נקודה, מקף או קו תחתון."
      };
    }

    return {
      ok: true,
      value: trimmed,
      error: ""
    };
  }

  function safeNickname(value) {
    const result = validateNickname(value || DEFAULT_NICKNAME);
    return result.ok ? result.value : DEFAULT_NICKNAME;
  }

  function createDefaultSave() {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      gameVersion: GAME_VERSION,
      player: {
        nickname: DEFAULT_NICKNAME
      },
      settings: {
        selectedCharacter: "bifly",
        selectedDifficulty: "normal",
        selectedMode: "arcade",
        soundEnabled: true,
        musicEnabled: true,
        audioVolumes: {
          master: 0.78,
          music: 0.45,
          sfx: 0.78,
          voices: 0.82,
          ui: 0.68
        },
        headphoneSafetyMode: true,
        language: "he",
        controlMode: "swipe",
        timeLimitEnabled: true,
        accessibility: {
          reducedMotion: false
        }
      },
      unlockedDifficulties: ["beginner", "normal", "advanced", "expert"],
      personalBests: {},
      leaderboardEntries: [],
      completedLevels: {},
      achievementProgress: {},
      dailyProgress: {
        lastCompletedDate: null,
        streak: 0,
        totalCompleted: 0,
        bestByDate: {}
      },
      duelProgress: {
        history: []
      },
      leagueProgress: {
        currentLeague: null,
        entriesByWeek: {}
      },
      recovery: null,
      updatedAt: null
    };
  }

  function safeJsonParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function normalizeSave(rawSave) {
    const base = createDefaultSave();
    if (!rawSave || typeof rawSave !== "object" || Array.isArray(rawSave)) {
      return base;
    }

    const save = {
      ...base,
      ...rawSave,
      player: {
        ...base.player,
        ...(rawSave.player && typeof rawSave.player === "object" ? rawSave.player : {})
      },
      settings: {
        ...base.settings,
        ...(rawSave.settings && typeof rawSave.settings === "object" ? rawSave.settings : {})
      },
      personalBests: rawSave.personalBests && typeof rawSave.personalBests === "object" && !Array.isArray(rawSave.personalBests)
        ? rawSave.personalBests
        : {},
      completedLevels: rawSave.completedLevels && typeof rawSave.completedLevels === "object" && !Array.isArray(rawSave.completedLevels)
        ? rawSave.completedLevels
        : {},
      achievementProgress: rawSave.achievementProgress && typeof rawSave.achievementProgress === "object" && !Array.isArray(rawSave.achievementProgress)
        ? rawSave.achievementProgress
        : {},
      dailyProgress: normalizeDailyProgress(rawSave.dailyProgress),
      duelProgress: normalizeDuelProgress(rawSave.duelProgress),
      leagueProgress: normalizeLeagueProgress(rawSave.leagueProgress)
    };

    save.schemaVersion = SAVE_SCHEMA_VERSION;
    save.gameVersion = GAME_VERSION;
    save.player.nickname = safeNickname(save.player.nickname);
    save.settings.selectedMode = normalizeGameMode(save.settings.selectedMode);
    save.settings.selectedCharacter = normalizeCharacterId(save.settings.selectedCharacter);
    save.settings.selectedDifficulty = normalizeDifficulty(save.settings.selectedDifficulty);
    save.settings.soundEnabled = save.settings.soundEnabled !== false;
    save.settings.musicEnabled = save.settings.musicEnabled !== false;
    const rawVolumes = save.settings.audioVolumes && typeof save.settings.audioVolumes === "object"
      ? save.settings.audioVolumes
      : {};
    save.settings.audioVolumes = Object.fromEntries(Object.entries(base.settings.audioVolumes).map(([key, fallback]) => {
      const value = Number(rawVolumes[key]);
      return [key, Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback];
    }));
    save.settings.headphoneSafetyMode = save.settings.headphoneSafetyMode !== false;
    save.settings.language = save.settings.language === "en" ? "en" : "he";
    save.settings.controlMode = save.settings.controlMode === "joystick" ? "joystick" : "swipe";
    save.settings.timeLimitEnabled = save.settings.timeLimitEnabled === true;
    save.unlockedDifficulties = normalizeUnlockedDifficulties(save.unlockedDifficulties);
    save.leaderboardEntries = Array.isArray(rawSave.leaderboardEntries)
      ? rawSave.leaderboardEntries.map(normalizeLeaderboardEntry).filter(Boolean)
      : [];

    if (!isDifficultyUnlocked(save, save.settings.selectedDifficulty)) {
      save.settings.selectedDifficulty = "normal";
    }

    return save;
  }

  function normalizeUnlockedDifficulties(values) {
    const defaults = new Set(["beginner", "normal", "advanced", "expert"]);
    if (Array.isArray(values)) {
      for (const value of values) {
        const difficulty = normalizeDifficulty(value);
        if (difficulty !== "normal" || value === "normal" || value === "medium") {
          defaults.add(difficulty);
        }
      }
    }
    return Array.from(defaults);
  }

  function isDateKey(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
  }

  function getLocalDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return getLocalDateKey(new Date());
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeDailyProgress(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const bestByDate = source.bestByDate && typeof source.bestByDate === "object" && !Array.isArray(source.bestByDate)
      ? Object.fromEntries(Object.entries(source.bestByDate).filter(([key, entry]) => (
        isDateKey(key) && entry && Number.isFinite(Number(entry.score))
      )).map(([key, entry]) => [key, {
        score: Math.max(0, Math.floor(Number(entry.score) || 0)),
        accuracy: clamp(Math.round(Number(entry.accuracy) || 0), 0, 100),
        correctAnswers: Math.max(0, Math.floor(Number(entry.correctAnswers) || 0)),
        completedAt: typeof entry.completedAt === "string" ? entry.completedAt : null,
        seed: Math.max(0, Math.floor(Number(entry.seed) || 0))
      }]))
      : {};
    return {
      lastCompletedDate: isDateKey(source.lastCompletedDate) ? source.lastCompletedDate : null,
      streak: Math.max(0, Math.floor(Number(source.streak) || 0)),
      totalCompleted: Math.max(0, Math.floor(Number(source.totalCompleted) || 0)),
      bestByDate
    };
  }

  function hashSeed(value) {
    let hash = 2166136261;
    for (const character of String(value || "")) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createSeededRandom(seed) {
    let value = (Number(seed) >>> 0) || 0x6d2b79f5;
    return () => {
      value += 0x6d2b79f5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(values, seed) {
    const result = [...values];
    const random = createSeededRandom(seed);
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function createDailyChallenge(factStats, dateKey = getLocalDateKey(), options = {}) {
    const normalizedDate = isDateKey(dateKey) ? dateKey : getLocalDateKey();
    const questionCount = Math.max(6, Math.min(20, Math.floor(Number(options.questionCount) || 10)));
    const mastery = buildMultiplicationMastery(factStats, { focusLimit: 5 });
    const focus = mastery.focusFacts.slice(0, 3);
    const focusKeys = new Set(focus.map((fact) => `${Math.min(fact.a, fact.b)}×${Math.max(fact.a, fact.b)}`));
    const seed = hashSeed(`${normalizedDate}|${[...focusKeys].join("|")}`);
    const uniquePool = mastery.cells.filter((cell) => cell.a <= cell.b && !focusKeys.has(`${cell.a}×${cell.b}`));
    const extraCount = Math.max(0, questionCount - focus.length * 2);
    const extras = seededShuffle(uniquePool, seed).slice(0, extraCount);
    const questionFacts = seededShuffle([
      ...focus,
      ...focus.map((fact) => ({ ...fact })),
      ...extras
    ], seed ^ 0x9e3779b9).slice(0, questionCount);

    return {
      id: `daily-${normalizedDate}`,
      dateKey: normalizedDate,
      seed,
      targetCorrect: questionCount,
      focusFacts: focus.map(({ a, b, answer, level }) => ({ a, b, answer, level })),
      questions: questionFacts.map(({ a, b, answer }) => ({
        key: `${a}×${b}`,
        a,
        b,
        answer,
        text: `${a} × ${b} = ?`
      }))
    };
  }

  function dateKeyDistance(laterKey, earlierKey) {
    if (!isDateKey(laterKey) || !isDateKey(earlierKey)) {
      return null;
    }
    return Math.round((Date.parse(`${laterKey}T00:00:00.000Z`) - Date.parse(`${earlierKey}T00:00:00.000Z`)) / 86400000);
  }

  function recordDailyCompletion(save, result, dateKey = getLocalDateKey()) {
    const normalizedDate = isDateKey(dateKey) ? dateKey : getLocalDateKey();
    const daily = normalizeDailyProgress(save.dailyProgress);
    const previous = daily.bestByDate[normalizedDate] || null;
    const score = Math.max(0, Math.floor(Number(result?.score) || 0));
    const improved = !previous || score > previous.score;
    const firstCompletionToday = daily.lastCompletedDate !== normalizedDate;

    if (firstCompletionToday) {
      const gap = dateKeyDistance(normalizedDate, daily.lastCompletedDate);
      daily.streak = gap === 1 ? daily.streak + 1 : 1;
      daily.totalCompleted += 1;
      daily.lastCompletedDate = normalizedDate;
    }
    if (improved) {
      daily.bestByDate[normalizedDate] = {
        score,
        accuracy: clamp(Math.round(Number(result?.accuracy) || 0), 0, 100),
        correctAnswers: Math.max(0, Math.floor(Number(result?.correctAnswers) || 0)),
        completedAt: result?.completedAt || new Date().toISOString(),
        seed: Math.max(0, Math.floor(Number(result?.seed) || 0))
      };
    }
    const orderedDates = Object.keys(daily.bestByDate).sort().slice(-45);
    daily.bestByDate = Object.fromEntries(orderedDates.map((key) => [key, daily.bestByDate[key]]));
    save.dailyProgress = daily;
    save.updatedAt = new Date().toISOString();
    return { improved, firstCompletionToday, previousBest: previous?.score || 0, progress: daily };
  }

  const DUEL_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  function bytesToBase64Url(bytes) {
    let output = "";
    let buffer = 0;
    let bits = 0;
    for (const byte of bytes) {
      buffer = (buffer << 8) | byte;
      bits += 8;
      while (bits >= 6) {
        bits -= 6;
        output += DUEL_CODE_ALPHABET[(buffer >>> bits) & 63];
      }
    }
    if (bits > 0) {
      output += DUEL_CODE_ALPHABET[(buffer << (6 - bits)) & 63];
    }
    return output;
  }

  function base64UrlToBytes(value) {
    const bytes = [];
    let buffer = 0;
    let bits = 0;
    for (const character of String(value || "")) {
      const index = DUEL_CODE_ALPHABET.indexOf(character);
      if (index < 0) {
        throw new Error("invalid_duel_code");
      }
      buffer = (buffer << 6) | index;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >>> bits) & 255);
      }
    }
    return bytes;
  }

  function duelChecksum(bytes) {
    return bytes.reduce((checksum, byte) => ((checksum * 31) ^ byte) & 0xffff, 0x4b46);
  }

  function formatDuelCode(raw) {
    const compact = String(raw || "").replace(/[^A-Za-z0-9_-]/g, "");
    return `KF1-${compact.match(/.{1,5}/g)?.join("-") || ""}`;
  }

  function createFriendChallenge(challenge, result = {}) {
    const questions = Array.isArray(challenge?.questions) ? challenge.questions.slice(0, 10) : [];
    if (questions.length !== 10) {
      throw new Error("duel_requires_ten_questions");
    }
    const seed = Number(challenge.seed) >>> 0;
    const score = Math.max(0, Math.min(0xffffff, Math.floor(Number(result.score) || 0)));
    const accuracy = clamp(Math.round(Number(result.accuracy) || 0), 0, 100);
    const bytes = [
      1,
      (seed >>> 24) & 255,
      (seed >>> 16) & 255,
      (seed >>> 8) & 255,
      seed & 255
    ];
    for (const question of questions) {
      const a = Math.max(1, Math.min(10, Math.floor(Number(question.a) || 1)));
      const b = Math.max(1, Math.min(10, Math.floor(Number(question.b) || 1)));
      bytes.push(((a - 1) << 4) | (b - 1));
    }
    bytes.push((score >>> 16) & 255, (score >>> 8) & 255, score & 255, accuracy);
    const checksum = duelChecksum(bytes);
    bytes.push((checksum >>> 8) & 255, checksum & 255);
    return formatDuelCode(bytesToBase64Url(bytes));
  }

  function decodeFriendChallenge(code) {
    const normalized = String(code || "").trim();
    if (!/^KF1-/i.test(normalized)) {
      throw new Error("invalid_duel_prefix");
    }
    const compact = normalized.slice(4).replace(/-/g, "");
    const bytes = base64UrlToBytes(compact);
    if (bytes.length !== 21 || bytes[0] !== 1) {
      throw new Error("invalid_duel_payload");
    }
    const expectedChecksum = (bytes[19] << 8) | bytes[20];
    if (duelChecksum(bytes.slice(0, 19)) !== expectedChecksum) {
      throw new Error("invalid_duel_checksum");
    }
    const seed = (((bytes[1] << 24) >>> 0) + (bytes[2] << 16) + (bytes[3] << 8) + bytes[4]) >>> 0;
    const questions = bytes.slice(5, 15).map((byte) => {
      const a = ((byte >>> 4) & 15) + 1;
      const b = (byte & 15) + 1;
      if (a > 10 || b > 10) {
        throw new Error("invalid_duel_fact");
      }
      return { key: `${a}×${b}`, a, b, answer: a * b, text: `${a} × ${b} = ?` };
    });
    const targetScore = (bytes[15] << 16) | (bytes[16] << 8) | bytes[17];
    return {
      id: `duel-${seed.toString(36)}`,
      seed,
      targetCorrect: 10,
      targetScore,
      targetAccuracy: bytes[18],
      questions,
      code: formatDuelCode(compact)
    };
  }

  function normalizeDuelProgress(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const history = Array.isArray(source.history) ? source.history.map((entry) => ({
      id: String(entry?.id || ""),
      seed: Math.max(0, Math.floor(Number(entry?.seed) || 0)),
      score: Math.max(0, Math.floor(Number(entry?.score) || 0)),
      targetScore: Math.max(0, Math.floor(Number(entry?.targetScore) || 0)),
      accuracy: clamp(Math.round(Number(entry?.accuracy) || 0), 0, 100),
      won: entry?.won === true,
      playedAt: typeof entry?.playedAt === "string" ? entry.playedAt : null
    })).filter((entry) => entry.id).slice(-30) : [];
    return { history };
  }

  function recordDuelResult(save, result) {
    const duel = normalizeDuelProgress(save.duelProgress);
    const entry = {
      id: String(result?.id || `duel-${Date.now()}`),
      seed: Math.max(0, Math.floor(Number(result?.seed) || 0)),
      score: Math.max(0, Math.floor(Number(result?.score) || 0)),
      targetScore: Math.max(0, Math.floor(Number(result?.targetScore) || 0)),
      accuracy: clamp(Math.round(Number(result?.accuracy) || 0), 0, 100),
      won: Number(result?.score) > Number(result?.targetScore),
      playedAt: result?.playedAt || new Date().toISOString()
    };
    duel.history.push(entry);
    duel.history = duel.history.slice(-30);
    save.duelProgress = duel;
    save.updatedAt = new Date().toISOString();
    return entry;
  }

  const LEAGUE_WEEK_EPOCH = Date.parse("2020-01-06T00:00:00.000Z");

  function getWeekKey(value = new Date()) {
    const date = value instanceof Date
      ? new Date(value.getTime())
      : (isDateKey(value) ? new Date(`${value}T12:00:00`) : new Date(value));
    if (Number.isNaN(date.getTime())) {
      return getWeekKey(new Date());
    }
    const day = date.getDay() || 7;
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - day + 1);
    return getLocalDateKey(date);
  }

  function weekKeyToIndex(weekKey) {
    const normalized = getWeekKey(weekKey);
    return clamp(Math.round((Date.parse(`${normalized}T00:00:00.000Z`) - LEAGUE_WEEK_EPOCH) / 86400000), 0, 0xffff);
  }

  function weekIndexToKey(index) {
    return new Date(LEAGUE_WEEK_EPOCH + clamp(Math.floor(Number(index) || 0), 0, 0xffff) * 86400000)
      .toISOString()
      .slice(0, 10);
  }

  function formatLeagueCode(prefix, bytes) {
    const raw = bytesToBase64Url(bytes);
    return `${prefix}-${raw.match(/.{1,5}/g)?.join("-") || ""}`;
  }

  function parseLeagueCode(code, prefix, expectedLength) {
    const normalized = String(code || "").trim();
    if (!new RegExp(`^${prefix}-`, "i").test(normalized)) {
      throw new Error("invalid_league_prefix");
    }
    const compact = normalized.slice(prefix.length + 1).replace(/-/g, "");
    const bytes = base64UrlToBytes(compact);
    if (bytes.length !== expectedLength || bytes[0] !== 1) {
      throw new Error("invalid_league_payload");
    }
    const checksumIndex = expectedLength - 2;
    const expectedChecksum = (bytes[checksumIndex] << 8) | bytes[checksumIndex + 1];
    if (duelChecksum(bytes.slice(0, checksumIndex)) !== expectedChecksum) {
      throw new Error("invalid_league_checksum");
    }
    return { bytes, compact };
  }

  function createPrivateLeagueInvite(weekKey = getWeekKey(), ownerToken = Date.now()) {
    const normalizedWeek = getWeekKey(weekKey);
    const leagueId = hashSeed(`${normalizedWeek}|${ownerToken}`) || 1;
    const weekIndex = weekKeyToIndex(normalizedWeek);
    const bytes = [
      1,
      (leagueId >>> 24) & 255,
      (leagueId >>> 16) & 255,
      (leagueId >>> 8) & 255,
      leagueId & 255,
      (weekIndex >>> 8) & 255,
      weekIndex & 255
    ];
    const checksum = duelChecksum(bytes);
    bytes.push((checksum >>> 8) & 255, checksum & 255);
    return formatLeagueCode("KL1", bytes);
  }

  function decodePrivateLeagueInvite(code) {
    const { bytes, compact } = parseLeagueCode(code, "KL1", 9);
    const id = (((bytes[1] << 24) >>> 0) + (bytes[2] << 16) + (bytes[3] << 8) + bytes[4]) >>> 0;
    const weekKey = weekIndexToKey((bytes[5] << 8) | bytes[6]);
    return {
      id,
      weekKey,
      code: formatLeagueCode("KL1", bytes),
      compact
    };
  }

  function getLeagueAlias(memberId) {
    return LEAGUE_ALIASES[Math.abs(Math.floor(Number(memberId) || 0)) % LEAGUE_ALIASES.length];
  }

  function buildWeeklyLeagueScore(dailyProgress, weekKey = getWeekKey()) {
    const normalizedWeek = getWeekKey(weekKey);
    const progress = normalizeDailyProgress(dailyProgress);
    const start = Date.parse(`${normalizedWeek}T00:00:00.000Z`);
    const entries = Object.entries(progress.bestByDate).filter(([dateKey]) => {
      const distance = Math.round((Date.parse(`${dateKey}T00:00:00.000Z`) - start) / 86400000);
      return distance >= 0 && distance < 7;
    });
    const points = entries.reduce((sum, [, entry]) => sum + entry.score, 0);
    const accuracy = entries.length
      ? Math.round(entries.reduce((sum, [, entry]) => sum + entry.accuracy, 0) / entries.length)
      : 0;
    return {
      weekKey: normalizedWeek,
      points: Math.min(0xffffff, Math.max(0, Math.floor(points))),
      daysPlayed: entries.length,
      accuracy,
      dailyScores: entries.map(([dateKey, entry]) => ({ dateKey, score: entry.score })).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    };
  }

  function createWeeklyLeagueResultCode(league, memberId, summary) {
    const leagueId = Number(league?.id) >>> 0;
    const weekKey = getWeekKey(league?.weekKey);
    if (!leagueId) {
      throw new Error("league_required");
    }
    const normalizedMemberId = clamp(Math.floor(Number(memberId) || 1), 1, 0xffff);
    const aliasIndex = normalizedMemberId % LEAGUE_ALIASES.length;
    const points = Math.min(0xffffff, Math.max(0, Math.floor(Number(summary?.points) || 0)));
    const daysPlayed = clamp(Math.floor(Number(summary?.daysPlayed) || 0), 0, 7);
    const accuracy = clamp(Math.round(Number(summary?.accuracy) || 0), 0, 100);
    const weekIndex = weekKeyToIndex(weekKey);
    const bytes = [
      1,
      (leagueId >>> 24) & 255,
      (leagueId >>> 16) & 255,
      (leagueId >>> 8) & 255,
      leagueId & 255,
      (weekIndex >>> 8) & 255,
      weekIndex & 255,
      (normalizedMemberId >>> 8) & 255,
      normalizedMemberId & 255,
      aliasIndex,
      (points >>> 16) & 255,
      (points >>> 8) & 255,
      points & 255,
      daysPlayed,
      accuracy
    ];
    const checksum = duelChecksum(bytes);
    bytes.push((checksum >>> 8) & 255, checksum & 255);
    return formatLeagueCode("KR1", bytes);
  }

  function decodeWeeklyLeagueResultCode(code) {
    const { bytes } = parseLeagueCode(code, "KR1", 17);
    const leagueId = (((bytes[1] << 24) >>> 0) + (bytes[2] << 16) + (bytes[3] << 8) + bytes[4]) >>> 0;
    const memberId = (bytes[7] << 8) | bytes[8];
    if (!leagueId || !memberId || bytes[9] >= LEAGUE_ALIASES.length || bytes[13] > 7 || bytes[14] > 100) {
      throw new Error("invalid_league_result");
    }
    return {
      leagueId,
      weekKey: weekIndexToKey((bytes[5] << 8) | bytes[6]),
      memberId,
      aliasIndex: bytes[9],
      alias: LEAGUE_ALIASES[bytes[9]],
      points: (bytes[10] << 16) | (bytes[11] << 8) | bytes[12],
      daysPlayed: bytes[13],
      accuracy: bytes[14],
      code: formatLeagueCode("KR1", bytes)
    };
  }

  function normalizeLeagueProgress(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    let currentLeague = null;
    if (source.currentLeague && Number(source.currentLeague.id) > 0 && isDateKey(source.currentLeague.weekKey)) {
      currentLeague = {
        id: Number(source.currentLeague.id) >>> 0,
        weekKey: getWeekKey(source.currentLeague.weekKey),
        code: typeof source.currentLeague.code === "string" ? source.currentLeague.code : ""
      };
    }
    const entriesByWeek = {};
    if (source.entriesByWeek && typeof source.entriesByWeek === "object" && !Array.isArray(source.entriesByWeek)) {
      for (const [weekKey, entries] of Object.entries(source.entriesByWeek)) {
        if (!isDateKey(weekKey) || !Array.isArray(entries)) {
          continue;
        }
        entriesByWeek[getWeekKey(weekKey)] = entries.map((entry) => ({
          leagueId: Number(entry?.leagueId) >>> 0,
          memberId: clamp(Math.floor(Number(entry?.memberId) || 0), 0, 0xffff),
          aliasIndex: clamp(Math.floor(Number(entry?.aliasIndex) || 0), 0, LEAGUE_ALIASES.length - 1),
          alias: getLeagueAlias(entry?.aliasIndex),
          points: Math.min(0xffffff, Math.max(0, Math.floor(Number(entry?.points) || 0))),
          daysPlayed: clamp(Math.floor(Number(entry?.daysPlayed) || 0), 0, 7),
          accuracy: clamp(Math.round(Number(entry?.accuracy) || 0), 0, 100),
          isLocal: entry?.isLocal === true,
          updatedAt: typeof entry?.updatedAt === "string" ? entry.updatedAt : null
        })).filter((entry) => entry.leagueId && entry.memberId).slice(0, 20);
      }
    }
    return { currentLeague, entriesByWeek };
  }

  function joinPrivateLeague(save, inviteCode) {
    const league = decodePrivateLeagueInvite(inviteCode);
    const progress = normalizeLeagueProgress(save.leagueProgress);
    progress.currentLeague = { id: league.id, weekKey: league.weekKey, code: league.code };
    progress.entriesByWeek[league.weekKey] = (progress.entriesByWeek[league.weekKey] || [])
      .filter((entry) => entry.leagueId === league.id);
    save.leagueProgress = progress;
    save.updatedAt = new Date().toISOString();
    return progress.currentLeague;
  }

  function recordWeeklyLeagueEntry(save, result, options = {}) {
    const progress = normalizeLeagueProgress(save.leagueProgress);
    const league = progress.currentLeague;
    const weekKey = getWeekKey(result?.weekKey || league?.weekKey);
    const leagueId = Number(result?.leagueId) >>> 0;
    if (!league || league.id !== leagueId || league.weekKey !== weekKey) {
      throw new Error("league_result_mismatch");
    }
    const entry = {
      leagueId,
      memberId: clamp(Math.floor(Number(result?.memberId) || 0), 1, 0xffff),
      aliasIndex: clamp(Math.floor(Number(result?.aliasIndex) || 0), 0, LEAGUE_ALIASES.length - 1),
      alias: LEAGUE_ALIASES[clamp(Math.floor(Number(result?.aliasIndex) || 0), 0, LEAGUE_ALIASES.length - 1)],
      points: Math.min(0xffffff, Math.max(0, Math.floor(Number(result?.points) || 0))),
      daysPlayed: clamp(Math.floor(Number(result?.daysPlayed) || 0), 0, 7),
      accuracy: clamp(Math.round(Number(result?.accuracy) || 0), 0, 100),
      isLocal: options.isLocal === true,
      updatedAt: options.updatedAt || new Date().toISOString()
    };
    const entries = (progress.entriesByWeek[weekKey] || []).filter((candidate) => (
      candidate.leagueId === leagueId && candidate.memberId !== entry.memberId
    ));
    entries.push(entry);
    progress.entriesByWeek[weekKey] = entries.slice(-20);
    save.leagueProgress = progress;
    save.updatedAt = new Date().toISOString();
    return entry;
  }

  function getWeeklyLeagueStandings(leagueProgress, weekKey = getWeekKey()) {
    const progress = normalizeLeagueProgress(leagueProgress);
    const normalizedWeek = getWeekKey(weekKey);
    const leagueId = progress.currentLeague?.id;
    return (progress.entriesByWeek[normalizedWeek] || [])
      .filter((entry) => entry.leagueId === leagueId)
      .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy || a.memberId - b.memberId)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  function migrateSave(rawSave) {
    if (!rawSave || typeof rawSave !== "object") {
      return createDefaultSave();
    }

    if (!rawSave.schemaVersion) {
      return normalizeSave({
        settings: {
          selectedCharacter: rawSave.selectedCharacter,
          selectedDifficulty: rawSave.selectedDifficulty,
          selectedMode: rawSave.selectedMode
        },
        player: {
          nickname: rawSave.nickname || rawSave.playerName
        },
        personalBests: rawSave.personalBests,
        leaderboardEntries: rawSave.leaderboardEntries
      });
    }

    return normalizeSave(rawSave);
  }

  function loadSave(storage, options = {}) {
    const key = options.key || SAVE_KEY;
    let raw = null;
    try {
      raw = storage?.getItem?.(key) ?? null;
    } catch {
      const save = createDefaultSave();
      save.recovery = "storage_unavailable";
      return save;
    }

    if (!raw) {
      return createDefaultSave();
    }

    const parsed = safeJsonParse(raw);
    if (!parsed) {
      const save = createDefaultSave();
      save.recovery = "corrupt_json";
      return save;
    }

    return migrateSave(parsed);
  }

  function persistSave(storage, save, options = {}) {
    const key = options.key || SAVE_KEY;
    try {
      storage?.setItem?.(key, JSON.stringify(normalizeSave(save)));
      return true;
    } catch {
      return false;
    }
  }

  function isDifficultyUnlocked(save, difficultyId) {
    const normalized = normalizeDifficulty(difficultyId);
    return normalizeUnlockedDifficulties(save?.unlockedDifficulties).includes(normalized);
  }

  function shouldUnlockLegendary(save, result) {
    if (isDifficultyUnlocked(save, "legendary")) {
      return false;
    }

    const difficulty = normalizeDifficulty(result?.difficulty);
    const mode = normalizeGameMode(result?.mode);
    return difficulty === "expert" && (
      (mode === "adventure" && result?.won === true)
      || (mode === "arcade" && Number(result?.score) >= LEGENDARY_UNLOCK_RULE.expertArcadeScore)
    );
  }

  function unlockDifficulty(save, difficultyId) {
    const normalized = normalizeDifficulty(difficultyId);
    const unlocked = new Set(normalizeUnlockedDifficulties(save.unlockedDifficulties));
    unlocked.add(normalized);
    save.unlockedDifficulties = Array.from(unlocked);
    save.updatedAt = new Date().toISOString();
    return save;
  }

  function personalBestKey(mode, difficulty) {
    return `${normalizeGameMode(mode)}:${normalizeDifficulty(difficulty)}`;
  }

  function getPersonalBest(save, mode, difficulty) {
    const key = personalBestKey(mode, difficulty);
    const value = Number(save?.personalBests?.[key]?.score);
    return Number.isInteger(value) && value > 0 ? value : 0;
  }

  function recordPersonalBest(save, result) {
    const key = personalBestKey(result.mode, result.difficulty);
    const previous = getPersonalBest(save, result.mode, result.difficulty);
    const score = Math.max(0, Math.floor(Number(result.score) || 0));
    const improved = score > previous;
    if (improved) {
      save.personalBests[key] = {
        score,
        mode: normalizeGameMode(result.mode),
        difficulty: normalizeDifficulty(result.difficulty),
        reachedStage: Math.max(1, Math.floor(Number(result.reachedStage) || 1)),
        maxCombo: Math.max(0, Math.floor(Number(result.maxCombo) || 0)),
        accuracy: clamp(Math.round(Number(result.accuracy) || 0), 0, 100),
        date: result.date || new Date().toISOString(),
        gameVersion: GAME_VERSION
      };
      save.updatedAt = new Date().toISOString();
    }

    return { previous, improved, current: Math.max(previous, score) };
  }

  function createScoreState() {
    return {
      total: 0,
      rawSubtotal: 0,
      breakdown: {
        gameplay: 0,
        math: 0,
        speed: 0,
        enemy: 0,
        mission: 0,
        completion: 0,
        lives: 0,
        noHit: 0,
        accuracy: 0,
        time: 0,
        difficulty: 0,
        combo: 0
      },
      events: []
    };
  }

  function createComboState() {
    return {
      count: 0,
      max: 0,
      multiplierPct: 100,
      lastMilestone: 0
    };
  }

  function getComboMultiplierPct(count) {
    const threshold = SCORE_CONFIG.comboThresholds.find((item) => count >= item.count);
    return threshold ? threshold.multiplierPct : 100;
  }

  function applyComboEvent(comboState, eventName, difficulty = DIFFICULTIES.normal) {
    const state = comboState || createComboState();
    if (eventName === "success") {
      state.count += 1;
    } else if (eventName === "mistake" || eventName === "lifeLost") {
      const tolerance = Math.max(0, Math.floor(Number(difficulty.comboTolerance) || 0));
      state.count = tolerance > 0 ? Math.max(0, state.count - (tolerance + 1)) : 0;
    } else if (eventName === "reset") {
      state.count = 0;
    }

    state.max = Math.max(state.max, state.count);
    state.multiplierPct = getComboMultiplierPct(state.count);
    return state;
  }

  function createMathStats() {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      totalAnswerTimeMs: 0,
      fastestAnswerMs: null,
      currentStreak: 0,
      maxStreak: 0
    };
  }

  function recordMathAnswer(stats, result) {
    const target = stats || createMathStats();
    const responseMs = Math.max(0, Math.floor(Number(result?.responseMs) || 0));
    target.totalQuestions += 1;
    target.totalAnswerTimeMs += responseMs;
    target.fastestAnswerMs = target.fastestAnswerMs === null
      ? responseMs
      : Math.min(target.fastestAnswerMs, responseMs);

    if (result?.correct) {
      target.correctAnswers += 1;
      target.currentStreak += 1;
      target.maxStreak = Math.max(target.maxStreak, target.currentStreak);
    } else {
      target.incorrectAnswers += 1;
      target.currentStreak = 0;
    }

    return target;
  }

  function getAccuracy(stats) {
    if (!stats || stats.totalQuestions <= 0) {
      return 0;
    }
    return Math.round(stats.correctAnswers / stats.totalQuestions * 100);
  }

  function getAverageAnswerTime(stats) {
    if (!stats || stats.totalQuestions <= 0) {
      return 0;
    }
    return Math.round(stats.totalAnswerTimeMs / stats.totalQuestions);
  }

  function normalizeFactResultStats(value) {
    const stats = value && typeof value === "object" ? value : {};
    const correct = Math.max(0, Math.floor(Number(stats.correct) || 0));
    const wrong = Math.max(0, Math.floor(Number(stats.wrong) || 0));
    const streak = Math.max(0, Math.floor(Number(stats.streak) || 0));
    const lastAnsweredAt = typeof stats.lastAnsweredAt === "string" && !Number.isNaN(Date.parse(stats.lastAnsweredAt))
      ? stats.lastAnsweredAt
      : null;
    return {
      correct,
      wrong,
      attempts: correct + wrong,
      streak,
      lastAnsweredAt
    };
  }

  function getCommutativeFactStats(factStats, a, b) {
    const left = normalizeFactResultStats(factStats?.[`${a}×${b}`]);
    if (a === b) {
      return left;
    }
    const right = normalizeFactResultStats(factStats?.[`${b}×${a}`]);
    return {
      correct: left.correct + right.correct,
      wrong: left.wrong + right.wrong,
      attempts: left.attempts + right.attempts,
      streak: Math.max(left.streak, right.streak),
      lastAnsweredAt: [left.lastAnsweredAt, right.lastAnsweredAt]
        .filter(Boolean)
        .sort()
        .at(-1) || null
    };
  }

  function getFactMasteryLevel(rawStats) {
    const stats = normalizeFactResultStats(rawStats);
    if (stats.attempts === 0) {
      return MASTERY_LEVELS.unpracticed;
    }
    const accuracy = stats.correct / stats.attempts;
    if (stats.correct >= 4 && accuracy >= 0.8 && stats.streak >= 2) {
      return MASTERY_LEVELS.mastered;
    }
    if (stats.correct >= 2 && accuracy >= 0.65) {
      return MASTERY_LEVELS.practicing;
    }
    return MASTERY_LEVELS.learning;
  }

  function getMasteryPriority(cell) {
    if (cell.level === MASTERY_LEVELS.learning) {
      return 400 + cell.wrong * 20 - cell.correct;
    }
    if (cell.level === MASTERY_LEVELS.practicing) {
      return 300 + cell.wrong * 10 - cell.correct;
    }
    if (cell.level === MASTERY_LEVELS.unpracticed) {
      return 200 - (cell.a + cell.b);
    }
    return 100 - cell.correct;
  }

  function buildMultiplicationMastery(factStats, options = {}) {
    const min = Math.max(1, Math.floor(Number(options.min) || MASTERY_RANGE.min));
    const max = Math.max(min, Math.floor(Number(options.max) || MASTERY_RANGE.max));
    const cells = [];
    const counts = {
      [MASTERY_LEVELS.unpracticed]: 0,
      [MASTERY_LEVELS.learning]: 0,
      [MASTERY_LEVELS.practicing]: 0,
      [MASTERY_LEVELS.mastered]: 0
    };

    for (let a = min; a <= max; a += 1) {
      for (let b = min; b <= max; b += 1) {
        const stats = getCommutativeFactStats(factStats, a, b);
        const level = getFactMasteryLevel(stats);
        const accuracy = stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0;
        const cell = { a, b, answer: a * b, level, accuracy, ...stats };
        cell.priority = getMasteryPriority(cell);
        cells.push(cell);
        counts[level] += 1;
      }
    }

    const total = cells.length;
    const weightedProgress = (
      counts[MASTERY_LEVELS.learning] * 0.2
      + counts[MASTERY_LEVELS.practicing] * 0.6
      + counts[MASTERY_LEVELS.mastered]
    );
    const focusLimit = Math.max(1, Math.floor(Number(options.focusLimit) || 3));
    const seenPairs = new Set();
    const focusFacts = [];
    for (const cell of [...cells].sort((left, right) => right.priority - left.priority || left.a - right.a || left.b - right.b)) {
      const pairKey = `${Math.min(cell.a, cell.b)}×${Math.max(cell.a, cell.b)}`;
      if (seenPairs.has(pairKey)) {
        continue;
      }
      seenPairs.add(pairKey);
      focusFacts.push(cell);
      if (focusFacts.length >= focusLimit) {
        break;
      }
    }

    return {
      min,
      max,
      total,
      counts,
      progressPercent: total ? Math.round((weightedProgress / total) * 100) : 0,
      focusFacts,
      cells
    };
  }

  function getSpeedBonus(responseMs, timeLimitMs) {
    const elapsed = Math.max(0, Number(responseMs) || 0);
    const limit = Math.max(0, Number(timeLimitMs) || 0);
    for (const bonus of SCORE_CONFIG.speedBonuses) {
      if (limit > 0 && elapsed <= limit * bonus.ratio) {
        return bonus.points;
      }
      if (limit <= 0 && elapsed <= bonus.absoluteMs) {
        return bonus.points;
      }
    }
    return 0;
  }

  function buildScoreComponents(event) {
    const components = {};
    const type = event?.type;

    if (type === "collectible") {
      components.gameplay = Math.max(0, Math.floor(Number(event.value) || SCORE_CONFIG.collectibleFallback));
    } else if (type === "correctAnswer") {
      components.math = SCORE_CONFIG.answerBase + (SCORE_CONFIG.complexity[event.questionMode] || 0);
      components.speed = getSpeedBonus(event.responseMs, event.timeLimitMs);
      if (event.enemyDefeated) {
        components.enemy = SCORE_CONFIG.enemyDefeated;
      }
    } else if (type === "mission") {
      components.mission = Math.max(0, Math.floor(Number(event.value) || SCORE_CONFIG.missionBonusFallback));
    } else if (type === "stageComplete") {
      components.completion = event.mode === "arcade" ? SCORE_CONFIG.arcadeWaveComplete : SCORE_CONFIG.stageComplete;
    } else if (type === "lifeRemaining") {
      components.lives = Math.max(0, Math.floor(Number(event.count) || 0)) * SCORE_CONFIG.lifeRemaining;
    } else if (type === "noHitBonus") {
      components.noHit = SCORE_CONFIG.noHit;
    } else if (type === "accuracyBonus") {
      const accuracy = clamp(Number(event.accuracy) || 0, 0, 100);
      components.accuracy = accuracy >= 90
        ? SCORE_CONFIG.accuracyExcellent
        : (accuracy >= 80 ? SCORE_CONFIG.accuracyGood : 0);
    } else if (type === "timeBonus") {
      components.time = clamp(Math.floor(Number(event.value) || 0), 0, SCORE_CONFIG.timeBonusMax);
    }

    return components;
  }

  function applyScoreEvent(scoreState, event, context = {}) {
    const target = scoreState || createScoreState();
    const difficulty = DIFFICULTIES[normalizeDifficulty(context.difficulty?.id || context.difficulty || "normal")];
    const difficultyMultiplierPct = Math.max(0, Number(context.difficultyMultiplierPct || difficulty.scoreMultiplierPct) || 100);
    const comboMultiplierPct = Math.max(100, Number(context.comboMultiplierPct) || 100);
    const components = buildScoreComponents(event);
    const rawPoints = Object.values(components).reduce((sum, value) => sum + value, 0);
    const difficultyAdjusted = Math.floor(rawPoints * difficultyMultiplierPct / 100);
    const total = Math.floor(difficultyAdjusted * comboMultiplierPct / 100);
    const difficultyBonus = difficultyAdjusted - rawPoints;
    const comboBonus = total - difficultyAdjusted;

    for (const [key, value] of Object.entries(components)) {
      target.breakdown[key] = (target.breakdown[key] || 0) + value;
    }
    target.breakdown.difficulty += difficultyBonus;
    target.breakdown.combo += comboBonus;
    target.rawSubtotal += rawPoints;
    target.total += total;
    target.events.push({
      type: event?.type || "unknown",
      rawPoints,
      difficultyMultiplierPct,
      comboMultiplierPct,
      total
    });

    return {
      rawPoints,
      difficultyBonus,
      comboBonus,
      total,
      breakdown: clone(target.breakdown)
    };
  }

  function createSessionChecksum(entry) {
    const source = [
      entry.nickname,
      entry.score,
      entry.mode,
      entry.difficulty,
      entry.reachedStage,
      entry.selectedCharacter,
      entry.maxCombo,
      entry.accuracy,
      entry.date,
      entry.gameVersion
    ].join("|");
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function createLocalId(prefix = "score") {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}_${random}`;
  }

  function normalizeLeaderboardEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== "object") {
      return null;
    }

    const score = Math.floor(Number(rawEntry.score) || 0);
    if (score < 0) {
      return null;
    }

    const entry = {
      id: String(rawEntry.id || createLocalId()).slice(0, 80),
      playerId: rawEntry.playerId ? String(rawEntry.playerId).slice(0, 80) : "",
      nickname: safeNickname(rawEntry.nickname || rawEntry.playerNickname || rawEntry.playerName),
      score,
      mode: normalizeGameMode(rawEntry.mode || rawEntry.gameMode),
      difficulty: normalizeDifficulty(rawEntry.difficulty),
      reachedStage: Math.max(1, Math.floor(Number(rawEntry.reachedStage || rawEntry.wave || rawEntry.levelReached) || 1)),
      selectedCharacter: normalizeCharacterId(rawEntry.selectedCharacter || rawEntry.characterId),
      maxCombo: Math.max(0, Math.floor(Number(rawEntry.maxCombo) || 0)),
      accuracy: clamp(Math.round(Number(rawEntry.accuracy) || 0), 0, 100),
      date: rawEntry.date || rawEntry.updatedAt || new Date().toISOString(),
      gameVersion: rawEntry.gameVersion || GAME_VERSION,
      validation: rawEntry.validation && typeof rawEntry.validation === "object" ? rawEntry.validation : {}
    };
    entry.validation.sessionChecksum = entry.validation.sessionChecksum || createSessionChecksum(entry);
    return entry;
  }

  function createLeaderboardEntry(details) {
    return normalizeLeaderboardEntry({
      ...details,
      id: details?.id || createLocalId("kaflul")
    });
  }

  function sortLeaderboardEntries(entries) {
    return entries.slice().sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (right.accuracy !== left.accuracy) {
        return right.accuracy - left.accuracy;
      }
      if (right.maxCombo !== left.maxCombo) {
        return right.maxCombo - left.maxCombo;
      }
      return new Date(left.date).getTime() - new Date(right.date).getTime();
    });
  }

  function getLeaderboardEntries(save, filter = {}) {
    const mode = filter.mode && filter.mode !== "all" ? normalizeGameMode(filter.mode) : null;
    const difficulty = filter.difficulty && filter.difficulty !== "all" ? normalizeDifficulty(filter.difficulty) : null;
    const limit = Math.max(1, Math.floor(Number(filter.limit) || 50));
    let entries = Array.isArray(save?.leaderboardEntries) ? save.leaderboardEntries.map(normalizeLeaderboardEntry).filter(Boolean) : [];
    if (mode) {
      entries = entries.filter((entry) => entry.mode === mode);
    }
    if (difficulty) {
      entries = entries.filter((entry) => entry.difficulty === difficulty);
    }
    return sortLeaderboardEntries(entries).slice(0, limit);
  }

  function addLocalLeaderboardEntry(save, rawEntry, options = {}) {
    const entry = normalizeLeaderboardEntry(rawEntry);
    if (!entry) {
      return { entry: null, rank: null, scoreToNextRank: null };
    }

    const limit = Math.max(10, Math.floor(Number(options.limit) || 50));
    save.leaderboardEntries = Array.isArray(save.leaderboardEntries) ? save.leaderboardEntries.map(normalizeLeaderboardEntry).filter(Boolean) : [];
    save.leaderboardEntries.push(entry);
    save.leaderboardEntries = sortLeaderboardEntries(save.leaderboardEntries).slice(0, 300);
    save.updatedAt = new Date().toISOString();

    const category = getLeaderboardEntries(save, {
      mode: entry.mode,
      difficulty: entry.difficulty,
      limit
    });
    const rankIndex = category.findIndex((candidate) => candidate.id === entry.id);
    const rank = rankIndex >= 0 ? rankIndex + 1 : null;
    const previousEntry = rankIndex > 0 ? category[rankIndex - 1] : null;

    return {
      entry,
      rank,
      scoreToNextRank: previousEntry ? previousEntry.score - entry.score + 1 : 0
    };
  }

  function canTransition(fromState, toState) {
    if (fromState === toState) {
      return true;
    }
    return Boolean(STATE_TRANSITIONS[fromState]?.includes(toState));
  }

  function transitionState(fromState, toState) {
    if (!canTransition(fromState, toState)) {
      throw new Error(`Invalid game state transition: ${fromState} -> ${toState}`);
    }
    return toState;
  }

  function detectSwipeDirection(start, end, options = {}) {
    const threshold = Math.max(1, Number(options.threshold) || 28);
    const dx = Number(end?.x) - Number(start?.x);
    const dy = Number(end?.y) - Number(start?.y);
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < threshold) {
      return "none";
    }
    return Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "right" : "left")
      : (dy > 0 ? "down" : "up");
  }

  function getPublicLeaderboardUiState(status, eligible) {
    const normalizedStatus = status === "available" || status === "checking" ? status : "localOnly";
    const isAvailable = normalizedStatus === "available";
    const isChecking = normalizedStatus === "checking";
    const publicChipText = isAvailable ? "ציבורי זמין לפרסום" : (isChecking ? "בודק ציבורי" : "ציבורי לא פעיל");
    const leaderboardCopy = isAvailable
      ? "השיאים נשמרים במכשיר הזה. אפשר לפרסם שיא ציבורי אחרי מעבר השלב הראשון."
      : (isChecking
        ? "השיאים המקומיים זמינים עכשיו. בדיקת הטבלה הציבורית רצה ברקע."
        : "השיאים נשמרים במכשיר הזה. טבלת השיאים הציבורית עדיין לא פעילה.");

    if (!eligible) {
      return {
        panelHidden: true,
        buttonDisabled: true,
        buttonText: "פרסם את השיא",
        title: "השיא נשמר במכשיר הזה",
        copy: PUBLIC_LEADERBOARD_LOCAL_ONLY_MESSAGE,
        statusText: "",
        publicChipText,
        leaderboardCopy,
        publicAvailable: isAvailable
      };
    }

    if (isAvailable) {
      return {
        panelHidden: false,
        buttonDisabled: false,
        buttonText: "פרסם את השיא",
        title: "מקום בטבלת אלוף האלופים מחכה לך",
        copy: "עברת את השלב הראשון, ולכן אפשר לפרסם את השיא הזה לכל השחקנים.",
        statusText: "",
        publicChipText,
        leaderboardCopy,
        publicAvailable: true
      };
    }

    return {
      panelHidden: false,
      buttonDisabled: true,
      buttonText: isChecking ? "בודק זמינות" : "פרסום לא זמין",
      title: "השיא נשמר במכשיר הזה",
      copy: isChecking
        ? "בודקים אם טבלת השיאים הציבורית זמינה. השיא נשמר במכשיר הזה בכל מקרה."
        : PUBLIC_LEADERBOARD_LOCAL_ONLY_MESSAGE,
      statusText: isChecking ? "בודקים זמינות ציבורית..." : PUBLIC_LEADERBOARD_LOCAL_ONLY_MESSAGE,
      publicChipText,
      leaderboardCopy,
      publicAvailable: false
    };
  }

  return {
    GAME_VERSION,
    SAVE_KEY,
    SAVE_SCHEMA_VERSION,
    DEFAULT_NICKNAME,
    MAX_NICKNAME_LENGTH,
    MASTERY_RANGE,
    MASTERY_LEVELS,
    GAME_MODES,
    DIFFICULTIES,
    LEGENDARY_UNLOCK_RULE,
    PUBLIC_LEADERBOARD_LOCAL_ONLY_MESSAGE,
    SCORE_CONFIG,
    GAME_STATES,
    STATE_TRANSITIONS,
    normalizeGameMode,
    normalizeDifficulty,
    normalizeCharacterId,
    validateNickname,
    safeNickname,
    createDefaultSave,
    safeJsonParse,
    migrateSave,
    loadSave,
    persistSave,
    isDifficultyUnlocked,
    shouldUnlockLegendary,
    unlockDifficulty,
    personalBestKey,
    getPersonalBest,
    recordPersonalBest,
    createScoreState,
    createComboState,
    getComboMultiplierPct,
    applyComboEvent,
    createMathStats,
    recordMathAnswer,
    getAccuracy,
    getAverageAnswerTime,
    normalizeFactResultStats,
    getCommutativeFactStats,
    getFactMasteryLevel,
    buildMultiplicationMastery,
    getLocalDateKey,
    normalizeDailyProgress,
    hashSeed,
    createSeededRandom,
    seededShuffle,
    createDailyChallenge,
    recordDailyCompletion,
    createFriendChallenge,
    decodeFriendChallenge,
    normalizeDuelProgress,
    recordDuelResult,
    LEAGUE_ALIASES,
    getWeekKey,
    createPrivateLeagueInvite,
    decodePrivateLeagueInvite,
    getLeagueAlias,
    buildWeeklyLeagueScore,
    createWeeklyLeagueResultCode,
    decodeWeeklyLeagueResultCode,
    normalizeLeagueProgress,
    joinPrivateLeague,
    recordWeeklyLeagueEntry,
    getWeeklyLeagueStandings,
    getSpeedBonus,
    applyScoreEvent,
    createLeaderboardEntry,
    addLocalLeaderboardEntry,
    getLeaderboardEntries,
    sortLeaderboardEntries,
    createSessionChecksum,
    canTransition,
    transitionState,
    detectSwipeDirection,
    getPublicLeaderboardUiState
  };
});
