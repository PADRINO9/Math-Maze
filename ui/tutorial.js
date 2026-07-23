(() => {
  "use strict";

  const TUTORIAL_STATUS_KEY = "kaflulFirstRunTutorialV1";
  const SAVE_KEY = "kaflulArcadeSave";
  const TARGET_CLASS = "kf-coach-active-target";

  const tutorial = document.getElementById("first-run-tutorial");
  const replayButton = document.getElementById("tutorial-replay-button");
  const skipButton = document.getElementById("tutorial-skip-button");
  const targetRing = document.getElementById("tutorial-target-ring");
  const hand = document.getElementById("tutorial-hand");
  const actionPill = document.getElementById("tutorial-action-pill");
  const actionText = document.getElementById("tutorial-title");
  const speechBubble = document.getElementById("tutorial-speech-bubble");
  const speechCopy = document.getElementById("tutorial-lead");
  const stepLabel = document.getElementById("tutorial-step-label");
  const stepName = document.getElementById("tutorial-step-name");
  const progress = tutorial?.querySelector(".kf-coach-progress");
  const progressFill = document.getElementById("tutorial-progress-fill");
  const statusBar = document.getElementById("tutorial-coach-status");
  const lockMessage = document.getElementById("tutorial-lock-message");
  const shades = {
    top: tutorial?.querySelector('[data-coach-shade="top"]'),
    right: tutorial?.querySelector('[data-coach-shade="right"]'),
    bottom: tutorial?.querySelector('[data-coach-shade="bottom"]'),
    left: tutorial?.querySelector('[data-coach-shade="left"]')
  };

  if (
    !tutorial || !skipButton || !targetRing || !hand || !actionPill || !actionText
    || !speechBubble || !speechCopy || !stepLabel || !stepName || !progress || !progressFill
    || !statusBar || !lockMessage || Object.values(shades).some((shade) => !shade)
  ) {
    return;
  }

  const radioLabel = (name, value) => document
    .querySelector(`input[name="${name}"][value="${value}"]`)
    ?.closest("label");

  const alternateRadioLabel = (name, preferredValue, alternateValue) => {
    const preferred = document.querySelector(`input[name="${name}"][value="${preferredValue}"]`);
    return radioLabel(name, preferred?.checked ? alternateValue : preferredValue);
  };

  const STEPS = [
    {
      id: "open-settings",
      target: () => document.getElementById("menu-settings-button"),
      he: {
        name: "מסך ההגדרות",
        action: "לחצו על גלגל השיניים",
        feedback: "כאן משנים מצב משחק, רמה, תרגילים, צלילים ושליטה."
      },
      en: {
        name: "Settings",
        action: "Tap the settings gear",
        feedback: "This is where you change the game mode, difficulty, questions, sound, and controls."
      }
    },
    {
      id: "open-mode",
      target: () => document.getElementById("mode-control-button"),
      he: {
        name: "מצב המשחק",
        action: "לחצו על מצב המשחק",
        feedback: "ארקייד הוא מרדף אינסופי אחרי שיא; הרפתקה היא מסע בין עולמות."
      },
      en: {
        name: "Game mode",
        action: "Tap Game Mode",
        feedback: "Arcade is an endless high-score chase; Adventure is a journey through worlds."
      }
    },
    {
      id: "choose-adventure",
      target: () => alternateRadioLabel("game-mode", "adventure", "arcade"),
      he: {
        name: "בחירת מצב",
        action: "בחרו את המצב המואר",
        feedback: "בהרפתקה יש 4 עולמות: 24 תרגילים ו־3 שאלות בוס בכל עולם — 108 בסך הכול. ארקייד אינסופי."
      },
      en: {
        name: "Choose a mode",
        action: "Choose the highlighted mode",
        feedback: "Adventure has 4 worlds with 24 facts and 3 boss questions each — 108 total. Arcade is endless."
      }
    },
    {
      id: "reopen-settings-difficulty",
      target: () => document.getElementById("menu-settings-button"),
      he: {
        name: "בחירת רמה",
        action: "חזרו להגדרות",
        feedback: "עכשיו נבחר רמה שמתאימה למשחק הראשון."
      },
      en: {
        name: "Choose difficulty",
        action: "Open Settings again",
        feedback: "Now we will choose a comfortable difficulty for the first game."
      }
    },
    {
      id: "open-difficulty",
      target: () => document.getElementById("difficulty-control-button"),
      he: {
        name: "רמת קושי",
        action: "לחצו על רמת הקושי",
        feedback: "בכל הרמות יש 3 חיים ו־25 שניות. הרמה משנה את סוג התרגילים, מהירות האויבים ומכפיל הניקוד."
      },
      en: {
        name: "Difficulty",
        action: "Tap Difficulty",
        feedback: "Every level gives 3 lives and 25 seconds. Difficulty changes the facts, enemy speed, and score multiplier."
      }
    },
    {
      id: "choose-beginner",
      target: () => alternateRadioLabel("difficulty", "beginner", "normal"),
      he: {
        name: "בחירת רמה",
        action: "בחרו את הרמה המוארת",
        feedback: "נקודות מקבלים מתשובות נכונות, פריטים, משימות ובוסים. קומבו ורמה גבוהה מכפילים אותן."
      },
      en: {
        name: "Choose a difficulty",
        action: "Choose the highlighted level",
        feedback: "Correct answers, items, missions, and bosses earn points. Combos and harder levels multiply them."
      }
    },
    {
      id: "reopen-settings-control",
      target: () => document.getElementById("menu-settings-button"),
      he: {
        name: "איך זזים",
        action: "פתחו שוב את ההגדרות",
        feedback: "נשאר לבחור דרך תנועה ודמות."
      },
      en: {
        name: "How to move",
        action: "Open Settings once more",
        feedback: "Only movement controls and a character remain."
      }
    },
    {
      id: "choose-joystick",
      target: () => alternateRadioLabel("control-mode", "joystick", "swipe"),
      he: {
        name: "שליטה במשחק",
        action: "בחרו את השליטה המוארת",
        feedback: "זזים בהחלקה או בגרירת הג׳ויסטיק. במפגש עם אויב המשחק נעצר ונפתח תרגיל."
      },
      en: {
        name: "Game controls",
        action: "Choose the highlighted control",
        feedback: "Move by swiping or dragging the joystick. Meeting an enemy pauses the game and opens a question."
      }
    },
    {
      id: "open-characters",
      target: () => document.getElementById("character-control-button"),
      he: {
        name: "בחירת דמות",
        action: "לחצו על דמות",
        feedback: "לביפלי ולנבטיק יש אותו כוח במשחק — בוחרים את מי שהכי אוהבים."
      },
      en: {
        name: "Choose a character",
        action: "Tap Character",
        feedback: "Bifly and Nabatik are equally strong — choose the hero you like best."
      }
    },
    {
      id: "preview-nabatick",
      target: () => document.getElementById("hero-gallery-next"),
      he: {
        name: "הכירו את הדמויות",
        action: "עברו לדמות הבאה",
        feedback: "זאת הדמות השנייה. אפשר לעבור בין הדמויות לפני שבוחרים."
      },
      en: {
        name: "Meet the heroes",
        action: "Show the next character",
        feedback: "This is the other hero. You can browse both characters before choosing."
      }
    },
    {
      id: "select-nabatick",
      target: () => document.getElementById("hero-gallery-select"),
      he: {
        name: "אישור דמות",
        action: "אשרו את הדמות",
        feedback: "הדמות שבחרתם מוכנה למשחק הראשון."
      },
      en: {
        name: "Confirm character",
        action: "Confirm this character",
        feedback: "Your chosen character is ready for the first game."
      }
    },
    {
      id: "return-home",
      target: () => document.getElementById("hero-gallery-home"),
      he: {
        name: "חזרה למשחק",
        action: "חזרו למסך הראשי",
        feedback: "הכול מוכן: דמות, מצב משחק, רמת קושי ודרך שליטה."
      },
      en: {
        name: "Return to the game",
        action: "Return to the home screen",
        feedback: "Everything is ready: a hero, game mode, difficulty, and controls."
      }
    },
    {
      id: "start-game",
      target: () => document.getElementById("start-button"),
      feedbackMs: 2100,
      he: {
        name: "יוצאים לדרך",
        action: "לחצו שחק עכשיו",
        feedback: "המטרה: לאסוף פריטים, להתחמק מאויבים, לפתור נכון ולהשלים את כל 4 העולמות. בהצלחה!"
      },
      en: {
        name: "Let’s play",
        action: "Tap Play Now",
        feedback: "Collect items, dodge enemies, solve correctly, and complete all 4 worlds. Good luck!"
      }
    }
  ];

  const TOTAL_STEPS = STEPS.length;
  const state = {
    open: false,
    stepIndex: 0,
    phase: "closed",
    target: null,
    targetRect: null,
    feedbackRect: null,
    previousFocus: null,
    feedbackTimer: null,
    lockTimer: null,
    repositionFrame: null,
    clickPending: false,
    runToken: 0
  };

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function language() {
    return document.documentElement.lang === "en" ? "en" : "he";
  }

  function copyFor(step = STEPS[state.stepIndex]) {
    return step?.[language()] || step?.he;
  }

  function interfaceCopy() {
    return language() === "en"
      ? {
          step: (current) => `Tutorial ${current} of ${TOTAL_STEPS}`,
          skip: "Skip",
          replay: "Tutorial: how to play?",
          locked: "Tap only the button the hand is pointing at"
        }
      : {
          step: (current) => `הדרכה ${current} מתוך ${TOTAL_STEPS}`,
          skip: "דלג",
          replay: "הדרכה: איך משחקים?",
          locked: "לחצו רק על הכפתור שהיד מצביעה עליו"
        };
  }

  function setBox(element, left, top, width, height) {
    element.style.left = `${Math.max(0, left)}px`;
    element.style.top = `${Math.max(0, top)}px`;
    element.style.width = `${Math.max(0, width)}px`;
    element.style.height = `${Math.max(0, height)}px`;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function viewportSize() {
    return {
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight)
    };
  }

  function rectFor(element) {
    if (!(element instanceof HTMLElement) || !element.isConnected) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (
      rect.width < 4 || rect.height < 4 || style.display === "none"
      || style.visibility === "hidden" || Number(style.opacity) === 0
    ) {
      return null;
    }
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    };
  }

  function paddedHole(rect) {
    const viewport = viewportSize();
    const padding = viewport.width <= 600 ? 6 : 9;
    const left = clamp(rect.left - padding, 0, viewport.width);
    const top = clamp(rect.top - padding, 0, viewport.height);
    const right = clamp(rect.right + padding, 0, viewport.width);
    const bottom = clamp(rect.bottom + padding, 0, viewport.height);
    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2
    };
  }

  function positionShades(hole) {
    const viewport = viewportSize();
    setBox(shades.top, 0, 0, viewport.width, hole.top);
    setBox(shades.bottom, 0, hole.bottom, viewport.width, viewport.height - hole.bottom);
    setBox(shades.left, 0, hole.top, hole.left, hole.height);
    setBox(shades.right, hole.right, hole.top, viewport.width - hole.right, hole.height);
  }

  function positionActionPill(hole, side, handTop, handHeight) {
    const viewport = viewportSize();
    const pillWidth = actionPill.offsetWidth;
    const pillHeight = actionPill.offsetHeight;
    const left = clamp(hole.centerX - pillWidth / 2, 8, viewport.width - pillWidth - 8);
    const desiredTop = side === "below"
      ? handTop + handHeight - 2
      : handTop - pillHeight + 4;
    const top = clamp(desiredTop, 8, viewport.height - pillHeight - 8);
    actionPill.style.left = `${left}px`;
    actionPill.style.top = `${top}px`;
  }

  function positionTarget(rect) {
    if (!rect) {
      return;
    }
    const viewport = viewportSize();
    const hole = paddedHole(rect);
    const targetStyle = state.target ? window.getComputedStyle(state.target) : null;
    const radius = clamp(parseFloat(targetStyle?.borderRadius || "16") + 7, 14, 30);
    positionShades(hole);
    setBox(targetRing, hole.left, hole.top, hole.width, hole.height);
    targetRing.style.borderRadius = `${radius}px`;

    const isMobile = viewport.width <= 600;
    const handWidth = isMobile ? 58 : 68;
    const handHeight = isMobile ? 68 : 78;
    const roomBelow = viewport.height - hole.bottom;
    const side = roomBelow >= handHeight + 54 ? "below" : "above";
    let handLeft;
    let handTop;
    if (side === "below") {
      handLeft = hole.centerX - handWidth * 0.36;
      handTop = hole.bottom + 7;
    } else {
      handLeft = hole.centerX - handWidth * 0.64;
      handTop = hole.top - handHeight - 7;
    }
    handLeft = clamp(handLeft, 4, viewport.width - handWidth - 4);
    handTop = clamp(handTop, 4, viewport.height - handHeight - 4);
    hand.dataset.side = side;
    hand.style.left = `${handLeft}px`;
    hand.style.top = `${handTop}px`;
    positionActionPill(hole, side, handTop, handHeight);

    statusBar.dataset.edge = hole.centerY < viewport.height / 2 ? "bottom" : "top";
  }

  function positionSpeech(rect) {
    if (!rect || speechBubble.hidden) {
      return;
    }
    const viewport = viewportSize();
    const bubbleWidth = speechBubble.offsetWidth;
    const bubbleHeight = speechBubble.offsetHeight;
    const spaceAbove = rect.top;
    const spaceBelow = viewport.height - rect.bottom;
    const side = spaceAbove >= bubbleHeight + 22 || spaceAbove > spaceBelow ? "above" : "below";
    const left = clamp(rect.centerX - bubbleWidth / 2, 8, viewport.width - bubbleWidth - 8);
    const desiredTop = side === "above"
      ? rect.top - bubbleHeight - 18
      : rect.bottom + 18;
    const top = clamp(desiredTop, 8, viewport.height - bubbleHeight - 8);
    const tailX = clamp(rect.centerX - left, 30, bubbleWidth - 30);
    speechBubble.dataset.side = side;
    speechBubble.style.setProperty("--coach-tail-x", `${tailX}px`);
    speechBubble.style.left = `${left}px`;
    speechBubble.style.top = `${top}px`;
  }

  function scheduleReposition() {
    if (!state.open || state.repositionFrame !== null) {
      return;
    }
    state.repositionFrame = window.requestAnimationFrame(() => {
      state.repositionFrame = null;
      if (!state.open) {
        return;
      }
      if (state.phase === "awaiting") {
        const nextRect = rectFor(state.target);
        if (nextRect) {
          state.targetRect = nextRect;
          positionTarget(nextRect);
        }
      } else if (state.phase === "feedback" && state.feedbackRect) {
        positionSpeech(state.feedbackRect);
      }
    });
  }

  function updateStaticCopy() {
    const labels = interfaceCopy();
    skipButton.textContent = labels.skip;
    lockMessage.textContent = labels.locked;
    const replayLabel = replayButton?.querySelector("span") || replayButton;
    if (replayLabel) {
      replayLabel.textContent = labels.replay;
    }
    if (state.open) {
      const activeCopy = copyFor();
      stepLabel.textContent = labels.step(state.stepIndex + 1);
      stepName.textContent = activeCopy.name;
      actionText.textContent = activeCopy.action;
      if (state.phase === "feedback") {
        speechCopy.textContent = activeCopy.feedback;
      }
    }
  }

  function resolveStepTarget(step) {
    try {
      return step.target?.() || null;
    } catch {
      return null;
    }
  }

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function waitForStepTarget(step, token) {
    const deadline = window.performance.now() + 4500;
    let candidate = null;
    while (state.open && token === state.runToken && window.performance.now() < deadline) {
      candidate = resolveStepTarget(step);
      const rect = rectFor(candidate);
      if (rect) {
        const viewport = viewportSize();
        if (rect.top < 62 || rect.bottom > viewport.height - 62) {
          candidate.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
          await delay(320);
        }
        const settled = resolveStepTarget(step);
        if (rectFor(settled)) {
          return settled;
        }
      }
      await delay(60);
    }
    return null;
  }

  function focusTarget(target) {
    const focusable = target.matches("button, input, select, textarea, a[href], [tabindex]")
      ? target
      : target.querySelector("button, input, select, textarea, a[href], [tabindex]");
    focusable?.focus?.({ preventScroll: true });
  }

  function clearActiveTarget() {
    state.target?.classList?.remove(TARGET_CLASS);
    state.target = null;
    state.targetRect = null;
  }

  async function showStep() {
    const token = state.runToken;
    const step = STEPS[state.stepIndex];
    if (!state.open || !step) {
      return;
    }

    state.phase = "locating";
    state.clickPending = false;
    state.feedbackRect = null;
    speechBubble.hidden = true;
    speechBubble.classList.remove("is-popping");
    tutorial.classList.remove("is-ready", "is-feedback");
    clearActiveTarget();
    updateStaticCopy();
    progress.setAttribute("aria-valuenow", String(state.stepIndex + 1));
    progressFill.style.width = `${((state.stepIndex + 1) / TOTAL_STEPS) * 100}%`;

    const target = await waitForStepTarget(step, token);
    if (!state.open || token !== state.runToken) {
      return;
    }
    if (!target) {
      console.warn(`[Kaflul tutorial] Target unavailable for step: ${step.id}`);
      closeTutorial({ complete: false });
      return;
    }

    state.target = target;
    state.target.classList.add(TARGET_CLASS);
    state.targetRect = rectFor(target);
    state.phase = "awaiting";
    positionTarget(state.targetRect);
    tutorial.classList.add("is-ready");
    window.setTimeout(() => focusTarget(target), 80);
    window.dispatchEvent(new CustomEvent("kaflul:tutorial-step", {
      detail: {
        step: state.stepIndex + 1,
        total: TOTAL_STEPS,
        id: step.id,
        target: target.id || target.getAttribute("name") || target.tagName.toLowerCase()
      }
    }));
  }

  function showLockFeedback() {
    if (!state.open) {
      return;
    }
    window.clearTimeout(state.lockTimer);
    lockMessage.hidden = false;
    lockMessage.style.animation = "none";
    void lockMessage.offsetWidth;
    lockMessage.style.animation = "";
    state.lockTimer = window.setTimeout(() => {
      lockMessage.hidden = true;
    }, 1250);
  }

  function showFeedback(step, anchorRect) {
    if (!state.open || step !== STEPS[state.stepIndex]) {
      return;
    }
    state.phase = "feedback";
    state.feedbackRect = anchorRect || state.targetRect;
    const activeCopy = copyFor(step);
    speechCopy.textContent = activeCopy.feedback;
    speechBubble.hidden = false;
    speechBubble.classList.remove("is-popping");
    void speechBubble.offsetWidth;
    speechBubble.classList.add("is-popping");
    tutorial.classList.remove("is-ready");
    tutorial.classList.add("is-feedback");
    positionSpeech(state.feedbackRect);
    window.dispatchEvent(new CustomEvent("kaflul:tutorial-feedback", {
      detail: { step: state.stepIndex + 1, total: TOTAL_STEPS, id: step.id, copy: activeCopy.feedback }
    }));

    window.clearTimeout(state.feedbackTimer);
    state.feedbackTimer = window.setTimeout(() => {
      if (!state.open) {
        return;
      }
      if (state.stepIndex >= TOTAL_STEPS - 1) {
        closeTutorial({ complete: true });
        return;
      }
      state.stepIndex += 1;
      showStep();
    }, step.feedbackMs || 1450);
  }

  function targetContains(node) {
    return node instanceof Node && Boolean(state.target?.contains(node));
  }

  function guardPointer(event) {
    if (!state.open || skipButton.contains(event.target)) {
      return;
    }
    if (state.phase === "awaiting" && targetContains(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    showLockFeedback();
  }

  function guardClick(event) {
    if (!state.open || skipButton.contains(event.target)) {
      return;
    }
    if (state.phase !== "awaiting" || !targetContains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showLockFeedback();
      return;
    }

    if (!state.clickPending) {
      state.clickPending = true;
      const step = STEPS[state.stepIndex];
      const anchorRect = rectFor(state.target) || state.targetRect;
      window.setTimeout(() => showFeedback(step, anchorRect), 0);
    }
  }

  function focusCurrentTarget() {
    if (state.target) {
      focusTarget(state.target);
    }
  }

  function guardKeyboard(event) {
    if (!state.open) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeTutorial({ complete: true });
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.shiftKey) {
        skipButton.focus({ preventScroll: true });
      } else {
        focusCurrentTarget();
      }
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && !targetContains(document.activeElement) && document.activeElement !== skipButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showLockFeedback();
      focusCurrentTarget();
    }
  }

  function resetOverlayGeometry() {
    const viewport = viewportSize();
    setBox(shades.top, 0, 0, viewport.width, viewport.height);
    setBox(shades.right, 0, 0, 0, 0);
    setBox(shades.bottom, 0, 0, 0, 0);
    setBox(shades.left, 0, 0, 0, 0);
  }

  function openTutorial(options = {}) {
    if (state.open) {
      return;
    }
    state.open = true;
    state.stepIndex = clamp(Number(options.step) || 0, 0, TOTAL_STEPS - 1);
    state.phase = "opening";
    state.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    state.runToken += 1;
    state.clickPending = false;
    writeStorage(TUTORIAL_STATUS_KEY, "in-progress");
    document.documentElement.classList.add("kf-tutorial-open");
    tutorial.hidden = false;
    resetOverlayGeometry();
    updateStaticCopy();
    showStep();
    window.dispatchEvent(new CustomEvent("kaflul:tutorial-open", {
      detail: { source: options.source || "first-run", total: TOTAL_STEPS }
    }));
  }

  function closeTutorial(options = {}) {
    if (!state.open) {
      return;
    }
    const completed = Boolean(options.complete);
    state.open = false;
    state.runToken += 1;
    state.phase = "closed";
    window.clearTimeout(state.feedbackTimer);
    window.clearTimeout(state.lockTimer);
    if (state.repositionFrame !== null) {
      window.cancelAnimationFrame(state.repositionFrame);
      state.repositionFrame = null;
    }
    if (completed) {
      writeStorage(TUTORIAL_STATUS_KEY, "complete");
    }
    clearActiveTarget();
    tutorial.classList.remove("is-ready", "is-feedback");
    tutorial.hidden = true;
    speechBubble.hidden = true;
    lockMessage.hidden = true;
    document.documentElement.classList.remove("kf-tutorial-open");
    if (!options.keepFocus) {
      state.previousFocus?.focus?.({ preventScroll: true });
    }
    state.previousFocus = null;
    window.dispatchEvent(new CustomEvent("kaflul:tutorial-close", {
      detail: { completed, step: state.stepIndex + 1, total: TOTAL_STEPS }
    }));
  }

  function openFromSettings() {
    const closeSettings = document.querySelector("#settings-panel [data-close-panel]");
    if (closeSettings && !document.getElementById("settings-panel")?.hidden) {
      closeSettings.click();
    }
    window.setTimeout(() => openTutorial({ source: "settings" }), 180);
  }

  function scheduleFirstRunOpen() {
    let opened = false;
    let observer = null;
    let fallbackTimer = null;
    const show = () => {
      if (opened) {
        return;
      }
      opened = true;
      observer?.disconnect();
      window.clearTimeout(fallbackTimer);
      window.setTimeout(() => openTutorial({ source: "first-run" }), 140);
    };
    if (!document.documentElement.classList.contains("loading-screen-active")) {
      show();
      return;
    }
    observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("loading-screen-active")) {
        show();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    fallbackTimer = window.setTimeout(show, 5800);
  }

  document.addEventListener("pointerdown", guardPointer, true);
  document.addEventListener("click", guardClick, true);
  document.addEventListener("keydown", guardKeyboard, true);
  window.addEventListener("resize", scheduleReposition, { passive: true });
  document.addEventListener("scroll", scheduleReposition, { capture: true, passive: true });
  skipButton.addEventListener("click", () => closeTutorial({ complete: true }));
  replayButton?.addEventListener("click", openFromSettings);

  new MutationObserver(() => {
    updateStaticCopy();
    scheduleReposition();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir", "data-language"] });

  updateStaticCopy();

  window.KaflulTutorial = Object.freeze({
    open: () => openTutorial({ source: "api" }),
    close: () => closeTutorial({ complete: true }),
    getState: () => ({
      isOpen: state.open,
      currentStep: state.stepIndex + 1,
      totalSteps: TOTAL_STEPS,
      phase: state.phase,
      stepId: STEPS[state.stepIndex]?.id || null,
      status: readStorage(TUTORIAL_STATUS_KEY)
    }),
    statusKey: TUTORIAL_STATUS_KEY
  });

  const params = new URLSearchParams(window.location.search);
  const forceOpen = params.get("tutorial") === "1";
  const suppressOpen = params.get("tutorial") === "0" || params.has("verify");
  const tutorialStatus = readStorage(TUTORIAL_STATUS_KEY);
  const hasExistingSave = readStorage(SAVE_KEY) !== null;
  const firstRun = !tutorialStatus && !hasExistingSave;

  if (forceOpen || (!suppressOpen && (tutorialStatus === "in-progress" || firstRun))) {
    scheduleFirstRunOpen();
  }
})();
