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
    paused: ["playing", "mainMenu", "results"],
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
        language: "he",
        controlMode: "swipe",
        timeLimitEnabled: false,
        accessibility: {
          reducedMotion: false
        }
      },
      unlockedDifficulties: ["beginner", "normal", "advanced", "expert"],
      personalBests: {},
      leaderboardEntries: [],
      completedLevels: {},
      achievementProgress: {},
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
        : {}
    };

    save.schemaVersion = SAVE_SCHEMA_VERSION;
    save.gameVersion = GAME_VERSION;
    save.player.nickname = safeNickname(save.player.nickname);
    save.settings.selectedMode = normalizeGameMode(save.settings.selectedMode);
    save.settings.selectedCharacter = normalizeCharacterId(save.settings.selectedCharacter);
    save.settings.selectedDifficulty = normalizeDifficulty(save.settings.selectedDifficulty);
    save.settings.soundEnabled = save.settings.soundEnabled !== false;
    save.settings.musicEnabled = save.settings.musicEnabled !== false;
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
