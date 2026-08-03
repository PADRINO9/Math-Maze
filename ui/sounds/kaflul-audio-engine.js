(() => {
  "use strict";

  const ROOT = "assets/audio";
  const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
  const pick = (items) => items[Math.floor(Math.random() * items.length)];

  const EVENT_LIBRARY = Object.freeze({
    buttonPress: { files: ["sfx/button-press.wav"], bus: "ui", gain: 0.72, cooldown: 45 },
    "primary-play": { files: ["sfx/primary-play.wav"], bus: "ui", gain: 0.82, cooldown: 180 },
    panelOpen: { files: ["sfx/panel-open.wav"], bus: "ui", gain: 0.72, cooldown: 110 },
    panelClose: { files: ["sfx/panel-close.wav"], bus: "ui", gain: 0.66, cooldown: 100 },
    tabChange: { files: ["sfx/tab-change.wav"], bus: "ui", gain: 0.62, cooldown: 70 },
    characterSelected: { dynamic: "character-select", bus: "voices", gain: 0.82, cooldown: 160 },
    modeSelected: { files: ["sfx/tab-change.wav"], bus: "ui", gain: 0.68, cooldown: 90 },
    difficultySelected: { files: ["sfx/panel-open.wav"], bus: "ui", gain: 0.7, cooldown: 90 },
    lockedAction: { files: ["sfx/locked-action.wav"], bus: "ui", gain: 0.72, cooldown: 180 },
    notification: { files: ["sfx/notification.wav"], bus: "ui", gain: 0.64, cooldown: 120 },
    reward: { files: ["sfx/mission-complete.wav"], bus: "sfx", gain: 0.82, cooldown: 240 },
    newRecord: { files: ["music/new-record.wav"], bus: "sfx", gain: 0.92, cooldown: 800 },
    keypadDigit: { files: ["sfx/keypad-digit.wav"], bus: "ui", gain: 0.56, cooldown: 28, detune: 26 },
    keypadDelete: { files: ["sfx/keypad-delete.wav"], bus: "ui", gain: 0.55, cooldown: 45 },
    keypadSubmit: { files: ["sfx/keypad-submit.wav"], bus: "ui", gain: 0.65, cooldown: 90 },
    questionOpen: { files: ["sfx/question-open.wav"], bus: "sfx", gain: 0.74, cooldown: 120 },
    questionReward: { files: ["sfx/question-reward.wav"], bus: "sfx", gain: 0.78, cooldown: 160 },
    questionBoss: { files: ["sfx/question-boss.wav"], bus: "sfx", gain: 0.82, cooldown: 180 },
    answerCorrect: { files: ["sfx/answer-correct-1.wav", "sfx/answer-correct-2.wav", "sfx/answer-correct-3.wav"], bus: "sfx", gain: 0.86, cooldown: 260 },
    answerWrong: { files: ["sfx/answer-wrong-1.wav", "sfx/answer-wrong-2.wav"], bus: "sfx", gain: 0.72, cooldown: 300 },
    answerTimeout: { files: ["sfx/answer-timeout.wav"], bus: "sfx", gain: 0.68, cooldown: 350 },
    timerTick: { files: ["sfx/timer-tick.wav"], bus: "ui", gain: 0.42, cooldown: 700 },
    comboMilestone: { files: ["sfx/combo.wav"], bus: "sfx", gain: 0.76, cooldown: 450 },
    missionComplete: { files: ["sfx/mission-complete.wav"], bus: "sfx", gain: 0.82, cooldown: 500 },
    collectible: { files: ["sfx/collectible-1.wav", "sfx/collectible-2.wav", "sfx/collectible-3.wav", "sfx/collectible-4.wav"], bus: "sfx", gain: 0.42, cooldown: 32, detune: 18 },
    bonusCollectible: { files: ["sfx/bonus-collectible.wav"], bus: "sfx", gain: 0.64, cooldown: 80 },
    letter1: { files: ["sfx/letter-1.wav"], bus: "sfx", gain: 0.74, cooldown: 120 },
    letter2: { files: ["sfx/letter-2.wav"], bus: "sfx", gain: 0.76, cooldown: 120 },
    letter3: { files: ["sfx/letter-3.wav"], bus: "sfx", gain: 0.78, cooldown: 120 },
    key1: { files: ["sfx/key-1.wav"], bus: "sfx", gain: 0.72, cooldown: 120 },
    key2: { files: ["sfx/key-2.wav"], bus: "sfx", gain: 0.74, cooldown: 120 },
    key3: { files: ["sfx/key-3.wav"], bus: "sfx", gain: 0.76, cooldown: 120 },
    wordComplete: { files: ["sfx/word-complete.wav"], bus: "sfx", gain: 0.88, cooldown: 600 },
    chestReady: { files: ["sfx/chest-ready.wav"], bus: "sfx", gain: 0.8, cooldown: 700 },
    chestOpen: { files: ["sfx/chest-open.wav"], bus: "sfx", gain: 0.9, cooldown: 900 },
    heart: { files: ["sfx/heart.wav"], bus: "sfx", gain: 0.75, cooldown: 350 },
    shield: { files: ["sfx/shield.wav"], bus: "sfx", gain: 0.78, cooldown: 350 },
    lifeLost: { files: ["sfx/life-lost.wav"], bus: "sfx", gain: 0.78, cooldown: 450 },
    enemyCaught: { files: ["sfx/enemy-caught.wav"], bus: "voices", gain: 0.75, cooldown: 220 },
    enemyDefeated: { files: ["sfx/enemy-defeated.wav"], bus: "sfx", gain: 0.72, cooldown: 180 },
    bossCore: { files: ["sfx/boss-core.wav"], bus: "sfx", gain: 0.8, cooldown: 220 },
    rewardPower: { files: ["sfx/reward-power.wav"], bus: "sfx", gain: 0.84, cooldown: 500 },
    hazardIce: { files: ["sfx/hazard-ice.wav"], bus: "sfx", gain: 0.68, cooldown: 650 },
    hazardLava: { files: ["sfx/hazard-lava.wav"], bus: "sfx", gain: 0.7, cooldown: 650 },
    hazardRune: { files: ["sfx/hazard-rune.wav"], bus: "sfx", gain: 0.68, cooldown: 650 },
    hazardCrystal: { files: ["sfx/hazard-crystal.wav"], bus: "sfx", gain: 0.68, cooldown: 650 },
    iceSlide: { files: ["sfx/ice-slide.wav"], bus: "sfx", gain: 0.6, cooldown: 420 },
    worldTransition: { files: ["music/world-transition.wav"], bus: "sfx", gain: 0.8, cooldown: 900 },
    pause: { files: ["sfx/pause.wav"], bus: "ui", gain: 0.66, cooldown: 180 },
    resume: { files: ["sfx/resume.wav"], bus: "ui", gain: 0.68, cooldown: 180 },
    victory: { files: ["music/victory.wav"], bus: "sfx", gain: 0.92, cooldown: 1200 },
    gameOver: { files: ["music/game-over.wav"], bus: "sfx", gain: 0.76, cooldown: 1200 },
    firework: { files: ["sfx/bonus-collectible.wav"], bus: "sfx", gain: 0.36, cooldown: 320, detune: 80 }
  });

  const SELECTED_GAMEPLAY_MUSIC = "music/kaflul-afropop-gameplay.m4a";
  const MUSIC = Object.freeze({
    menu: { files: { base: SELECTED_GAMEPLAY_MUSIC } },
    ice: { files: { base: SELECTED_GAMEPLAY_MUSIC } },
    lava: { files: { base: SELECTED_GAMEPLAY_MUSIC } },
    ancient: { files: { base: SELECTED_GAMEPLAY_MUSIC } },
    diamond: { files: { base: SELECTED_GAMEPLAY_MUSIC } }
  });
  const CRITICAL_PRELOAD_FILES = Object.freeze([
    "sfx/button-press.wav", "sfx/primary-play.wav", "sfx/question-open.wav",
    "sfx/answer-correct-1.wav", "sfx/answer-correct-2.wav", "sfx/answer-correct-3.wav",
    "sfx/answer-wrong-1.wav", "sfx/life-lost.wav",
    "sfx/enemy-defeated.wav", "sfx/reward-power.wav",
    "characters/bifly/correct.wav", "characters/nabatick/correct.wav",
    SELECTED_GAMEPLAY_MUSIC
  ]);

  const CHARACTER_CUES = new Set(["select", "eat", "correct", "hit", "victory", "idle"]);
  const BOSS_CUES = new Set(["spawn", "move", "attack", "hit", "defeat"]);
  const diagnostics = {
    enabled: true,
    musicEnabled: true,
    unlocked: false,
    contextState: "none",
    loaded: 0,
    loadErrors: 0,
    played: 0,
    mutedSkips: 0,
    autoplayBlocks: 0,
    throttledSkips: 0,
    voiceSteals: 0,
    currentScene: "",
    questionDucked: false,
    bossActive: false,
    lastEvent: "",
    lastReason: ""
  };

  const volumes = { master: 0.78, music: 0.45, sfx: 0.78, voices: 0.82, ui: 0.68 };
  const buffers = new Map();
  const pendingBuffers = new Map();
  const lastPlayedAt = new Map();
  const activeShots = [];
  let context = null;
  let buses = null;
  let limiter = null;
  let captureDestination = null;
  let musicToken = 0;
  let musicScene = "";
  let musicSources = [];
  let musicIntensity = 0.45;
  let bossActive = false;
  let questionDucked = false;
  let paused = false;
  let enabled = true;
  let musicEnabled = true;
  let selectedCharacter = "bifly";

  function audioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function updateDiagnostics(reason = diagnostics.lastReason) {
    diagnostics.enabled = enabled;
    diagnostics.musicEnabled = musicEnabled;
    diagnostics.unlocked = Boolean(context);
    diagnostics.contextState = context?.state || "none";
    diagnostics.currentScene = musicScene;
    diagnostics.questionDucked = questionDucked;
    diagnostics.bossActive = bossActive;
    diagnostics.lastReason = reason;
  }

  function setTarget(param, value, seconds = 0.08) {
    if (!context || !param) return;
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(Math.max(0.0001, value), now + seconds);
  }

  function applyVolumes(seconds = 0.08) {
    if (!buses) return;
    setTarget(buses.master.gain, enabled ? volumes.master : 0.0001, seconds);
    setTarget(buses.sfx.gain, volumes.sfx, seconds);
    setTarget(buses.voices.gain, volumes.voices, seconds);
    setTarget(buses.ui.gain, volumes.ui, seconds);
    const musicScale = !musicEnabled ? 0.0001 : (paused ? 0.12 : (questionDucked ? 0.35 : 1));
    setTarget(buses.music.gain, volumes.music * musicScale, seconds);
  }

  function ensureContext() {
    const Context = audioContextClass();
    if (!Context) {
      diagnostics.lastReason = "audio-context-unavailable";
      updateDiagnostics();
      return null;
    }
    if (context) return context;
    context = new Context({ latencyHint: "interactive" });
    buses = {
      master: context.createGain(),
      music: context.createGain(),
      sfx: context.createGain(),
      voices: context.createGain(),
      ui: context.createGain()
    };
    limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -7;
    limiter.knee.value = 7;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.006;
    limiter.release.value = 0.18;
    for (const name of ["music", "sfx", "voices", "ui"]) buses[name].connect(buses.master);
    buses.master.connect(limiter);
    limiter.connect(context.destination);
    applyVolumes(0.01);
    updateDiagnostics("unlocked");
    return context;
  }

  function unlockFromGesture() {
    if (!enabled) {
      diagnostics.mutedSkips += 1;
      updateDiagnostics("muted");
      return false;
    }
    const ctx = ensureContext();
    if (!ctx) return false;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    preloadCritical();
    if (!musicScene) setMusicScene("menu");
    updateDiagnostics("unlocked");
    return true;
  }

  function assetUrl(file) {
    return `${ROOT}/${file}`;
  }

  async function loadBuffer(file) {
    if (buffers.has(file)) return buffers.get(file);
    if (pendingBuffers.has(file)) return pendingBuffers.get(file);
    const ctx = ensureContext();
    if (!ctx) throw new Error("AudioContext unavailable");
    const promise = fetch(assetUrl(file), { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Audio ${response.status}: ${file}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        buffers.set(file, buffer);
        pendingBuffers.delete(file);
        diagnostics.loaded = buffers.size;
        updateDiagnostics("loaded");
        return buffer;
      })
      .catch((error) => {
        pendingBuffers.delete(file);
        diagnostics.loadErrors += 1;
        updateDiagnostics("load-error");
        throw error;
      });
    pendingBuffers.set(file, promise);
    return promise;
  }

  function preloadCritical() {
    for (const file of CRITICAL_PRELOAD_FILES) loadBuffer(file).catch(() => {});
  }

  function cleanupShots() {
    for (let index = activeShots.length - 1; index >= 0; index -= 1) {
      if (activeShots[index].ended) activeShots.splice(index, 1);
    }
    while (activeShots.length >= 28) {
      const shot = activeShots.shift();
      shot?.source?.stop?.();
      diagnostics.voiceSteals += 1;
    }
  }

  function resolveEvent(eventName, options) {
    const definition = EVENT_LIBRARY[eventName] || EVENT_LIBRARY.notification;
    if (definition.dynamic === "character-select") {
      return { ...definition, files: [`characters/${options.characterId || selectedCharacter}/select.wav`] };
    }
    return definition;
  }

  function play(eventName, options = {}) {
    const event = EVENT_LIBRARY[eventName] ? eventName : "notification";
    const definition = resolveEvent(event, options);
    diagnostics.lastEvent = event;
    if (!enabled) {
      diagnostics.mutedSkips += 1;
      updateDiagnostics("muted");
      return { ok: false, reason: "muted" };
    }
    if (!context && !options.fromGesture) {
      diagnostics.autoplayBlocks += 1;
      updateDiagnostics("not-unlocked");
      return { ok: false, reason: "not-unlocked" };
    }
    const ctx = ensureContext();
    if (!ctx) return { ok: false, reason: "audio-context-unavailable" };
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const nowMs = performance.now();
    const cooldown = Number(options.throttleMs) || definition.cooldown || 80;
    const last = lastPlayedAt.get(event) || 0;
    if (nowMs - last < cooldown) {
      diagnostics.throttledSkips += 1;
      updateDiagnostics("throttled");
      return { ok: false, reason: "throttled" };
    }
    lastPlayedAt.set(event, nowMs);
    const file = pick(definition.files);
    loadBuffer(file).then((buffer) => {
      if (!enabled || !context) return;
      cleanupShots();
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      const detuneRange = Number(definition.detune) || 0;
      source.detune.value = Number(options.detune) || (detuneRange ? (Math.random() * 2 - 1) * detuneRange : 0);
      gain.gain.value = clamp01((Number(options.gain) || 1) * (definition.gain || 1));
      source.connect(gain);
      let output = gain;
      if (Number.isFinite(options.pan) && context.createStereoPanner) {
        const panner = context.createStereoPanner();
        panner.pan.value = Math.max(-0.65, Math.min(0.65, options.pan));
        gain.connect(panner);
        output = panner;
      }
      output.connect(buses[definition.bus] || buses.sfx);
      const record = { source, ended: false };
      activeShots.push(record);
      source.onended = () => { record.ended = true; };
      source.start();
      diagnostics.played += 1;
      window.dispatchEvent(new CustomEvent("kaflul:audio-play", { detail: { event, file, bus: definition.bus } }));
      updateDiagnostics("played");
    }).catch(() => {});
    updateDiagnostics("queued");
    return { ok: true, event, file, pending: !buffers.has(file) };
  }

  function playCharacter(characterId, cue, options = {}) {
    const character = characterId === "nabatick" ? "nabatick" : "bifly";
    const normalizedCue = CHARACTER_CUES.has(cue) ? cue : "idle";
    return playCustom(`character:${character}:${normalizedCue}`, `characters/${character}/${normalizedCue}.wav`, "voices", {
      gain: 0.76,
      cooldown: normalizedCue === "eat" ? 500 : 900,
      ...options
    });
  }

  function playBoss(bossKey, cue, options = {}) {
    const key = /^stage[1-4]$/.test(bossKey) ? bossKey : "stage1";
    const normalizedCue = BOSS_CUES.has(cue) ? cue : "move";
    return playCustom(`boss:${key}:${normalizedCue}`, `bosses/${key}/${normalizedCue}.wav`, "voices", {
      gain: normalizedCue === "move" ? 0.48 : 0.86,
      cooldown: normalizedCue === "move" ? 720 : 260,
      ...options
    });
  }

  function playEnemy(cue = "alert", options = {}) {
    const file = cue === "idle" ? `enemies/idle-${1 + Math.floor(Math.random() * 3)}.wav` : "enemies/alert.wav";
    return playCustom(`enemy:${cue}`, file, "voices", { gain: 0.62, cooldown: cue === "idle" ? 2600 : 650, ...options });
  }

  function playCustom(key, file, bus, options) {
    const eventName = `custom:${key}`;
    if (!enabled) return { ok: false, reason: "muted" };
    if (!context && !options.fromGesture) return { ok: false, reason: "not-unlocked" };
    ensureContext();
    const now = performance.now();
    const last = lastPlayedAt.get(eventName) || 0;
    if (now - last < options.cooldown) return { ok: false, reason: "throttled" };
    lastPlayedAt.set(eventName, now);
    loadBuffer(file).then((buffer) => {
      if (!enabled || !context) return;
      cleanupShots();
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.detune.value = Number(options.detune) || 0;
      gain.gain.value = clamp01(options.gain);
      source.connect(gain);
      gain.connect(buses[bus] || buses.sfx);
      const record = { source, ended: false };
      activeShots.push(record);
      source.onended = () => { record.ended = true; };
      source.start();
      diagnostics.played += 1;
      diagnostics.lastEvent = key;
      window.dispatchEvent(new CustomEvent("kaflul:audio-play", { detail: { event: key, file, bus } }));
      updateDiagnostics("played");
    }).catch(() => {});
    return { ok: true, event: key, file, pending: !buffers.has(file) };
  }

  function stopMusicSources(seconds = 0.35) {
    if (!context) return;
    const now = context.currentTime;
    for (const item of musicSources) {
      item.gain.gain.cancelScheduledValues(now);
      item.gain.gain.setValueAtTime(item.gain.gain.value, now);
      item.gain.gain.linearRampToValueAtTime(0.0001, now + seconds);
      try { item.source.stop(now + seconds + 0.03); } catch {}
    }
    musicSources = [];
  }

  function stemTarget(stem, scene) {
    // Keep the score supportive during longer learning sessions. Event/SFX
    // buses retain their original levels so answers and rewards stay clear.
    if (scene === "menu") return 0.52;
    if (stem === "base") return bossActive ? 0.9 : 0.78 + musicIntensity * 0.08;
    if (stem === "pulse") return 0.16 + musicIntensity * 0.28;
    if (stem === "melody") return questionDucked ? 0.05 : 0.30 + musicIntensity * 0.16;
    if (stem === "boss") return bossActive ? 0.58 : 0.0001;
    return 0.4;
  }

  async function setMusicScene(scene, options = {}) {
    const normalized = MUSIC[scene] ? scene : "menu";
    if (musicScene === normalized && musicSources.length) {
      updateMusicMix();
      return { ok: true, scene: normalized, unchanged: true };
    }
    musicScene = normalized;
    diagnostics.currentScene = normalized;
    const token = ++musicToken;
    if (!context) {
      updateDiagnostics("music-pending-unlock");
      return { ok: false, reason: "not-unlocked", scene: normalized };
    }
    const spec = MUSIC[normalized];
    try {
      const entries = await Promise.all(Object.entries(spec.files).map(async ([stem, file]) => [stem, file, await loadBuffer(file)]));
      if (token !== musicToken || !context) return { ok: false, reason: "superseded" };
      stopMusicSources(options.immediate ? 0.03 : 0.32);
      const start = context.currentTime + 0.06;
      musicSources = entries.map(([stem, file, buffer]) => {
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0.0001;
        source.connect(gain);
        gain.connect(buses.music);
        source.start(start);
        gain.gain.linearRampToValueAtTime(stemTarget(stem, normalized), start + 0.45);
        return { stem, file, source, gain };
      });
      applyVolumes(0.18);
      window.dispatchEvent(new CustomEvent("kaflul:music-scene", { detail: { scene: normalized } }));
      updateDiagnostics("music-playing");
      return { ok: true, scene: normalized };
    } catch {
      updateDiagnostics("music-load-error");
      return { ok: false, reason: "load-error", scene: normalized };
    }
  }

  function updateMusicMix(seconds = 0.22) {
    for (const item of musicSources) setTarget(item.gain.gain, stemTarget(item.stem, musicScene), seconds);
    applyVolumes(seconds);
  }

  function setMusicIntensity(value) {
    musicIntensity = clamp01(value);
    updateMusicMix();
  }

  function setBossActive(value) {
    bossActive = Boolean(value);
    updateMusicMix(0.32);
    updateDiagnostics("boss-mix");
  }

  function setQuestionDucked(value) {
    questionDucked = Boolean(value);
    updateMusicMix(value ? 0.16 : 0.32);
    updateDiagnostics(value ? "question-duck" : "question-unduck");
  }

  function setPaused(value) {
    paused = Boolean(value);
    applyVolumes(value ? 0.18 : 0.28);
  }

  function setEnabled(value) {
    enabled = value !== false;
    applyVolumes(0.08);
    updateDiagnostics(enabled ? "enabled" : "muted");
  }

  function setMusicEnabled(value) {
    musicEnabled = value !== false;
    applyVolumes(0.12);
    updateDiagnostics(musicEnabled ? "music-enabled" : "music-muted");
  }

  function setVolumes(next = {}) {
    for (const key of Object.keys(volumes)) {
      if (Number.isFinite(Number(next[key]))) volumes[key] = clamp01(next[key]);
    }
    applyVolumes(0.08);
    return { ...volumes };
  }

  function createCaptureStream() {
    if (!ensureContext()) return null;
    if (!captureDestination) {
      captureDestination = context.createMediaStreamDestination();
      limiter.connect(captureDestination);
    }
    return captureDestination.stream;
  }

  function setSelectedCharacter(characterId) {
    selectedCharacter = characterId === "nabatick" ? "nabatick" : "bifly";
  }

  document.addEventListener("pointerdown", () => unlockFromGesture(), { capture: true, passive: true });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") unlockFromGesture();
  }, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (!context) return;
    if (document.hidden) context.suspend().catch(() => {});
    else if (enabled) context.resume().catch(() => {});
  });

  updateDiagnostics("ready");
  window.KaflulAudio = Object.freeze({
    events: Object.freeze(Object.keys(EVENT_LIBRARY)),
    musicScenes: Object.freeze(Object.keys(MUSIC)),
    unlockFromGesture,
    play,
    playCharacter,
    playBoss,
    playEnemy,
    setSelectedCharacter,
    setEnabled,
    setMusicEnabled,
    setVolumes,
    setMusicScene,
    setMusicIntensity,
    setBossActive,
    setQuestionDucked,
    setPaused,
    createCaptureStream,
    preloadCritical,
    getDiagnostics: () => ({
      ...diagnostics,
      volumes: { ...volumes },
      activeShots: activeShots.filter((item) => !item.ended).length,
      criticalLoadedCount: CRITICAL_PRELOAD_FILES.filter((file) => buffers.has(file)).length,
      criticalReady: CRITICAL_PRELOAD_FILES.every((file) => buffers.has(file))
    })
  });
})();
