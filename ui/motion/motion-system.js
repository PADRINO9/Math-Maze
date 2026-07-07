(() => {
  "use strict";

  const EVENT_CLASS = {
    buttonPress: "kf-motion-press",
    buttonRelease: "kf-motion-release",
    screenEnter: "kf-motion-screen-enter",
    screenExit: "kf-motion-screen-exit",
    modalOpen: "kf-motion-modal-open",
    modalClose: "kf-motion-modal-close",
    sheetOpen: "kf-motion-sheet-open",
    sheetClose: "kf-motion-sheet-close",
    tabChange: "kf-motion-tab-change",
    characterSelect: "kf-motion-character-select",
    characterTap: "kf-motion-character-tap",
    reward: "kf-motion-reward",
    scoreCountUp: "kf-motion-score-count",
    comboMilestone: "kf-motion-combo-milestone",
    missionComplete: "kf-motion-mission-complete",
    lifeLost: "kf-motion-life-lost",
    worldTransition: "kf-motion-world-transition",
    badgeAppearance: "kf-motion-badge",
    lockedFeedback: "kf-motion-locked",
    newRecord: "kf-motion-new-record"
  };

  const EVENT_DURATION = {
    buttonPress: 110,
    buttonRelease: 150,
    screenEnter: 240,
    screenExit: 120,
    modalOpen: 240,
    modalClose: 120,
    sheetOpen: 240,
    sheetClose: 120,
    tabChange: 220,
    characterSelect: 520,
    characterTap: 420,
    reward: 860,
    scoreCountUp: 620,
    comboMilestone: 860,
    missionComplete: 620,
    lifeLost: 620,
    worldTransition: 760,
    badgeAppearance: 620,
    lockedFeedback: 620,
    newRecord: 860
  };

  const PARTICLE_LIMIT = 10;
  const timers = new WeakMap();
  const hideTimers = new WeakMap();
  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const diagnostics = {
    played: 0,
    skippedHidden: 0,
    particlesCreated: 0,
    activeParticles: 0,
    lastEvent: "",
    reducedMotion: Boolean(media?.matches),
    maxParticleLimit: PARTICLE_LIMIT
  };

  let forcedReducedMotion = null;

  function isReducedMotion() {
    return forcedReducedMotion ?? Boolean(media?.matches);
  }

  function updateReducedMotionClass() {
    diagnostics.reducedMotion = isReducedMotion();
    document.documentElement.classList.toggle("kf-reduced-motion", diagnostics.reducedMotion);
  }

  function setReducedMotionForTest(value) {
    forcedReducedMotion = value === null ? null : Boolean(value);
    updateReducedMotionClass();
  }

  function isHidden(element) {
    return Boolean(element?.hidden || element?.closest?.("[hidden]"));
  }

  function clearTimer(element) {
    const timer = timers.get(element);
    if (timer) {
      window.clearTimeout(timer);
      timers.delete(element);
    }
  }

  function clearHideTimer(element) {
    const timer = hideTimers.get(element);
    if (timer) {
      window.clearTimeout(timer);
      hideTimers.delete(element);
    }
    element?.removeAttribute?.("data-kf-motion-state");
  }

  function getDuration(event, options = {}) {
    if (isReducedMotion()) {
      return 1;
    }
    return Math.max(1, Math.min(1200, Number(options.duration) || EVENT_DURATION[event] || 220));
  }

  function play(element, event, options = {}) {
    if (!(element instanceof HTMLElement)) {
      return { ok: false, reason: "missing-target", duration: 0 };
    }
    if (isHidden(element) && !String(event).endsWith("Close") && !String(event).endsWith("Exit")) {
      diagnostics.skippedHidden += 1;
      return { ok: false, reason: "hidden", duration: 0 };
    }

    const normalizedEvent = EVENT_CLASS[event] ? event : "badgeAppearance";
    const className = EVENT_CLASS[normalizedEvent];
    const duration = getDuration(normalizedEvent, options);

    clearTimer(element);
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    element.dataset.kfMotionEvent = normalizedEvent;

    const timer = window.setTimeout(() => {
      element.classList.remove(className);
      if (element.dataset.kfMotionEvent === normalizedEvent) {
        delete element.dataset.kfMotionEvent;
      }
      timers.delete(element);
    }, duration);
    timers.set(element, timer);

    diagnostics.played += 1;
    diagnostics.lastEvent = normalizedEvent;

    if (options.particles) {
      emitParticles(element, options.particles === true ? {} : options.particles);
    }

    return { ok: true, event: normalizedEvent, duration, reducedMotion: isReducedMotion() };
  }

  function show(element, event = "screenEnter", options = {}) {
    if (!(element instanceof HTMLElement)) {
      return { ok: false, reason: "missing-target", duration: 0 };
    }
    clearHideTimer(element);
    element.hidden = false;
    return play(element, event, options);
  }

  function hideAfter(element, event = "screenExit", options = {}) {
    if (!(element instanceof HTMLElement)) {
      return { ok: false, reason: "missing-target", duration: 0 };
    }
    if (element.hidden) {
      return { ok: true, reason: "already-hidden", duration: 0 };
    }

    clearHideTimer(element);
    const result = play(element, event, options);
    const duration = Math.min(result.duration || 0, options.maxDelay ?? 140);

    if (duration <= 1) {
      element.hidden = true;
      element.removeAttribute("data-kf-motion-state");
      return result;
    }

    element.dataset.kfMotionState = "closing";
    const timer = window.setTimeout(() => {
      element.hidden = true;
      element.removeAttribute("data-kf-motion-state");
      hideTimers.delete(element);
    }, duration);
    hideTimers.set(element, timer);
    return result;
  }

  function emitParticles(element, options = {}) {
    if (!(element instanceof HTMLElement) || isReducedMotion() || isHidden(element)) {
      return 0;
    }

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return 0;
    }

    const count = Math.max(0, Math.min(PARTICLE_LIMIT, Number(options.count) || 6));
    const color = options.color || "var(--kf-color-gold, #ffd84a)";
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("span");
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.35;
      const distance = 18 + Math.random() * 30;
      particle.className = "kf-motion-particle";
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.setProperty("--kf-motion-particle-color", color);
      particle.style.setProperty("--kf-motion-particle-x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--kf-motion-particle-y", `${Math.sin(angle) * distance}px`);
      document.body.append(particle);
      diagnostics.particlesCreated += 1;
      diagnostics.activeParticles += 1;
      window.setTimeout(() => {
        particle.remove();
        diagnostics.activeParticles = Math.max(0, diagnostics.activeParticles - 1);
      }, 620);
    }

    return count;
  }

  function controlFromTarget(target) {
    const element = target instanceof Element ? target : null;
    if (!element) return null;
    const direct = element.closest("button, [role='button'], input[type='button'], input[type='submit']");
    if (direct instanceof HTMLElement) return direct;
    const label = element.closest("label");
    if (label?.querySelector?.("input[type='radio'], input[type='checkbox']")) {
      const characterCard = label.matches("#start-screen .menu-character")
        ? label.querySelector(".character-card")
        : null;
      if (characterCard instanceof HTMLElement) {
        return characterCard;
      }
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

  function setupPressDelegation() {
    document.addEventListener("pointerdown", (event) => {
      const control = controlFromTarget(event.target);
      if (!control || isDisabledControl(control)) return;
      play(control, "buttonPress");
    }, { capture: true, passive: true });

    document.addEventListener("pointerup", (event) => {
      const control = controlFromTarget(event.target);
      if (!control || isDisabledControl(control)) return;
      play(control, "buttonRelease");
    }, { capture: true, passive: true });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const control = controlFromTarget(event.target);
      if (!control || isDisabledControl(control)) return;
      play(control, "buttonPress");
    }, { capture: true });

    document.addEventListener("keyup", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const control = controlFromTarget(event.target);
      if (!control || isDisabledControl(control)) return;
      play(control, "buttonRelease");
    }, { capture: true });
  }

  media?.addEventListener?.("change", updateReducedMotionClass);
  updateReducedMotionClass();
  setupPressDelegation();

  window.KaflulMotionSystem = Object.freeze({
    events: Object.freeze(Object.keys(EVENT_CLASS)),
    play,
    show,
    hideAfter,
    emitParticles,
    isReducedMotion,
    setReducedMotionForTest,
    getDiagnostics: () => ({ ...diagnostics })
  });
})();
