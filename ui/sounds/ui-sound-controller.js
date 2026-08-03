(() => {
  "use strict";

  if (window.KaflulAudio) {
    const audio = window.KaflulAudio;
    const UI_EVENTS = Object.freeze([
      "buttonPress", "primary-play", "panelOpen", "panelClose", "tabChange",
      "characterSelected", "modeSelected", "difficultySelected", "lockedAction",
      "notification", "reward", "newRecord"
    ]);

    function controlFromTarget(target) {
      const element = target instanceof Element ? target : null;
      if (!element) return null;
      const direct = element.closest("button, [role='button'], input[type='button'], input[type='submit']");
      if (direct instanceof HTMLElement) return direct;
      const label = element.closest("label");
      return label?.querySelector?.("input[type='radio'], input[type='checkbox']") ? label : null;
    }

    function isDisabled(element) {
      if (!(element instanceof HTMLElement)) return true;
      if (element.matches("button:disabled, input:disabled")) return true;
      return Boolean(element.querySelector?.("input")?.disabled);
    }

    function playControl(target) {
      const control = controlFromTarget(target);
      if (!control || isDisabled(control)) return;
      // KaflulAudio already owns the document-level gesture unlock. Avoid a
      // second synchronous unlock/preload pass on every gameplay swipe.
      audio.unlockFromGesture();
      const requestedSound = control.dataset.uiSound || "buttonPress";
      if (requestedSound !== "none") audio.play(requestedSound, { fromGesture: true });
    }

    document.addEventListener("pointerdown", (event) => playControl(event.target), { capture: true, passive: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") playControl(event.target);
    }, { capture: true });

    window.KaflulUiSound = Object.freeze({
      events: UI_EVENTS,
      setEnabled: audio.setEnabled,
      unlockFromGesture: audio.unlockFromGesture,
      play: audio.play,
      getDiagnostics: audio.getDiagnostics
    });
    return;
  }

  const EVENT_LIBRARY = {
    buttonPress: {
      gain: 0.012,
      notes: [{ frequency: 360, duration: 0.035, type: "triangle" }]
    },
    "primary-play": {
      gain: 0.021,
      notes: [
        { frequency: 440, duration: 0.05, type: "triangle" },
        { frequency: 660, start: 0.045, duration: 0.065, type: "triangle" }
      ]
    },
    panelOpen: {
      gain: 0.018,
      notes: [
        { frequency: 420, duration: 0.045, type: "sine" },
        { frequency: 560, start: 0.035, duration: 0.055, type: "triangle" }
      ]
    },
    panelClose: {
      gain: 0.014,
      notes: [{ frequency: 260, duration: 0.055, type: "sine" }]
    },
    tabChange: {
      gain: 0.014,
      notes: [{ frequency: 500, duration: 0.045, type: "triangle" }]
    },
    characterSelected: {
      gain: 0.022,
      notes: [
        { frequency: 520, duration: 0.06, type: "triangle" },
        { frequency: 700, start: 0.055, duration: 0.075, type: "triangle" }
      ]
    },
    modeSelected: {
      gain: 0.016,
      notes: [{ frequency: 460, duration: 0.055, type: "triangle" }]
    },
    difficultySelected: {
      gain: 0.017,
      notes: [
        { frequency: 390, duration: 0.045, type: "triangle" },
        { frequency: 520, start: 0.04, duration: 0.05, type: "triangle" }
      ]
    },
    lockedAction: {
      gain: 0.018,
      notes: [
        { frequency: 180, duration: 0.07, type: "sine" },
        { frequency: 140, start: 0.055, duration: 0.08, type: "sine" }
      ]
    },
    notification: {
      gain: 0.016,
      notes: [{ frequency: 620, duration: 0.06, type: "sine" }]
    },
    reward: {
      gain: 0.022,
      notes: [
        { frequency: 620, duration: 0.06, type: "triangle" },
        { frequency: 820, start: 0.055, duration: 0.07, type: "triangle" },
        { frequency: 980, start: 0.12, duration: 0.09, type: "triangle" }
      ]
    },
    newRecord: {
      gain: 0.024,
      notes: [
        { frequency: 760, duration: 0.06, type: "triangle" },
        { frequency: 960, start: 0.06, duration: 0.08, type: "triangle" },
        { frequency: 1180, start: 0.13, duration: 0.1, type: "triangle" }
      ]
    }
  };

  const diagnostics = {
    enabled: true,
    unlocked: false,
    contextState: "none",
    played: 0,
    mutedSkips: 0,
    autoplayBlocks: 0,
    unavailableSkips: 0,
    throttledSkips: 0,
    lastEvent: "",
    lastReason: ""
  };

  let enabled = true;
  let audioContext = null;
  let masterGain = null;
  const lastPlayedAt = new Map();

  function contextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function updateDiagnostics() {
    diagnostics.enabled = enabled;
    diagnostics.unlocked = Boolean(audioContext);
    diagnostics.contextState = audioContext?.state || "none";
  }

  function setEnabled(value) {
    enabled = value !== false;
    updateDiagnostics();
  }

  function ensureContext() {
    const AudioContextClass = contextClass();
    if (!AudioContextClass) {
      diagnostics.unavailableSkips += 1;
      diagnostics.lastReason = "audio-context-unavailable";
      updateDiagnostics();
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.82;
      masterGain.connect(audioContext.destination);
    }

    updateDiagnostics();
    return audioContext;
  }

  function unlockFromGesture() {
    if (!enabled) {
      diagnostics.mutedSkips += 1;
      diagnostics.lastReason = "muted";
      updateDiagnostics();
      return false;
    }

    const context = ensureContext();
    if (!context) return false;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    updateDiagnostics();
    return true;
  }

  function scheduleNote(context, note, baseGain, offsetScale) {
    const start = context.currentTime + (note.start || 0) * offsetScale;
    const duration = Math.max(0.02, note.duration || 0.05);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = note.type || "sine";
    oscillator.frequency.setValueAtTime(note.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(baseGain, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }

  function play(eventName, options = {}) {
    const event = EVENT_LIBRARY[eventName] ? eventName : "notification";
    const definition = EVENT_LIBRARY[event];

    if (!enabled) {
      diagnostics.mutedSkips += 1;
      diagnostics.lastEvent = event;
      diagnostics.lastReason = "muted";
      updateDiagnostics();
      return { ok: false, reason: "muted" };
    }

    if (!audioContext && !options.fromGesture) {
      diagnostics.autoplayBlocks += 1;
      diagnostics.lastEvent = event;
      diagnostics.lastReason = "not-unlocked";
      updateDiagnostics();
      return { ok: false, reason: "not-unlocked" };
    }

    const context = ensureContext();
    if (!context) {
      return { ok: false, reason: "audio-context-unavailable" };
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const now = performance.now();
    const last = lastPlayedAt.get(event) || 0;
    const throttleMs = Number(options.throttleMs) || (event === "buttonPress" ? 55 : 90);
    if (now - last < throttleMs) {
      diagnostics.throttledSkips += 1;
      diagnostics.lastEvent = event;
      diagnostics.lastReason = "throttled";
      updateDiagnostics();
      return { ok: false, reason: "throttled" };
    }
    lastPlayedAt.set(event, now);

    const gain = Math.min(0.035, Math.max(0.003, Number(options.gain) || definition.gain || 0.014));
    const offsetScale = Math.max(0.5, Math.min(1.6, Number(options.offsetScale) || 1));

    for (const note of definition.notes) {
      scheduleNote(context, note, gain, offsetScale);
    }

    diagnostics.played += 1;
    diagnostics.lastEvent = event;
    diagnostics.lastReason = "played";
    updateDiagnostics();
    return { ok: true, event };
  }

  function controlFromTarget(target) {
    const element = target instanceof Element ? target : null;
    if (!element) return null;
    const direct = element.closest("button, [role='button'], input[type='button'], input[type='submit']");
    if (direct instanceof HTMLElement) return direct;
    const label = element.closest("label");
    if (label?.querySelector?.("input[type='radio'], input[type='checkbox']")) {
      return label;
    }
    return null;
  }

  function isDisabledControl(element) {
    if (!(element instanceof HTMLElement)) return true;
    if (element.matches("button:disabled, input:disabled")) return true;
    const input = element.querySelector?.("input");
    return Boolean(input?.disabled);
  }

  document.addEventListener("pointerdown", (event) => {
    const control = controlFromTarget(event.target);
    if (!control || isDisabledControl(control)) {
      unlockFromGesture();
      return;
    }

    unlockFromGesture();
    const requestedSound = control.dataset.uiSound || "buttonPress";
    if (requestedSound !== "none") {
      play(requestedSound, { fromGesture: true, gain: requestedSound === "buttonPress" ? 0.009 : undefined });
    }
  }, { capture: true, passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const control = controlFromTarget(event.target);
    if (!control || isDisabledControl(control)) return;
    unlockFromGesture();
    const requestedSound = control.dataset.uiSound || "buttonPress";
    if (requestedSound !== "none") {
      play(requestedSound, { fromGesture: true, gain: requestedSound === "buttonPress" ? 0.009 : undefined });
    }
  }, { capture: true });

  updateDiagnostics();

  window.KaflulUiSound = Object.freeze({
    events: Object.freeze(Object.keys(EVENT_LIBRARY)),
    setEnabled,
    unlockFromGesture,
    play,
    getDiagnostics: () => ({ ...diagnostics })
  });
})();
