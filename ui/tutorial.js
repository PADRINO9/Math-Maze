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
  const coachCard = document.getElementById("tutorial-coach-card");
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
  const dimLayer = document.getElementById("tutorial-dim-layer");
  const dimContext = dimLayer instanceof HTMLCanvasElement
    ? dimLayer.getContext("2d", { alpha: true })
    : null;

  if (
    !tutorial || !skipButton || !targetRing || !hand || !coachCard || !actionPill || !actionText
    || !speechBubble || !speechCopy || !stepLabel || !stepName || !progress || !progressFill
    || !statusBar || !lockMessage || !dimLayer || !dimContext
  ) {
    return;
  }

  const radioLabel = (name, value) => document
    .querySelector(`input[name="${name}"][value="${value}"]`)
    ?.closest("label");

  const checkedRadioLabel = (name) => document
    .querySelector(`input[name="${name}"]:checked`)
    ?.closest("label");

  const FEEDBACK_DELAY_MS = Object.freeze({
    standard: 1050,
    detailed: 1250,
    startGame: 1450
  });

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
        feedback: "Change the game mode, difficulty, questions, sound, and controls here."
      }
    },
    {
      id: "open-mode",
      target: () => document.getElementById("mode-control-button"),
      he: {
        name: "מצב המשחק",
        action: "לחצו על מצב המשחק",
        feedback: "ארקייד הוא מרדף אחרי שיא; הרפתקה היא מסע של ארבעה עולמות."
      },
      en: {
        name: "Game mode",
        action: "Tap Game Mode",
        feedback: "Arcade is a high-score chase; Adventure is a journey across four worlds."
      }
    },
    {
      id: "choose-mode",
      target: () => checkedRadioLabel("game-mode") || radioLabel("game-mode", "arcade"),
      feedbackMs: FEEDBACK_DELAY_MS.detailed,
      afterFeedback: () => openSettingsForTutorial(),
      he: {
        name: "בחירת מצב",
        action: "אשרו את מצב המשחק",
        feedback: "בהרפתקה יש 4 עולמות, 24 תרגילים ובוס בכל עולם."
      },
      en: {
        name: "Choose a mode",
        action: "Confirm the game mode",
        feedback: "Adventure has 4 worlds, 24 facts, and a boss in every world."
      }
    },
    {
      id: "open-difficulty",
      target: () => document.getElementById("difficulty-control-button"),
      feedbackMs: FEEDBACK_DELAY_MS.detailed,
      he: {
        name: "רמת קושי",
        action: "לחצו על רמת הקושי",
        feedback: "בכל רמה יש 3 חיים ו־25 שניות. הקושי משנה תרגילים ומהירות."
      },
      en: {
        name: "Difficulty",
        action: "Tap Difficulty",
        feedback: "Every level gives 3 lives and 25 seconds. Difficulty changes facts and speed."
      }
    },
    {
      id: "choose-difficulty",
      target: () => checkedRadioLabel("difficulty") || radioLabel("difficulty", "normal"),
      feedbackMs: FEEDBACK_DELAY_MS.detailed,
      afterFeedback: () => openSettingsForTutorial(),
      he: {
        name: "בחירת רמה",
        action: "אשרו את רמת הקושי",
        feedback: "תשובות, פריטים ובוסים נותנים נקודות; קומבו מכפיל אותן."
      },
      en: {
        name: "Choose a difficulty",
        action: "Confirm the difficulty",
        feedback: "Answers, items, and bosses earn points; combos multiply them."
      }
    },
    {
      id: "choose-control",
      target: () => checkedRadioLabel("control-mode") || radioLabel("control-mode", "swipe"),
      feedbackMs: FEEDBACK_DELAY_MS.detailed,
      he: {
        name: "שליטה במשחק",
        action: "אשרו את דרך התנועה",
        feedback: "זזים בהחלקה או בג׳ויסטיק. נגיעה באויב עוצרת את המבוך ופותחת תרגיל."
      },
      en: {
        name: "Game controls",
        action: "Confirm how to move",
        feedback: "Move by swiping or using the joystick. Touching an enemy pauses the maze and opens a question."
      }
    },
    {
      id: "open-characters",
      target: () => document.getElementById("character-control-button"),
      he: {
        name: "בחירת דמות",
        action: "לחצו על דמות",
        feedback: "לכל הדמויות אותו כוח במשחק — בוחרים את מי שהכי אוהבים."
      },
      en: {
        name: "Choose a character",
        action: "Tap Character",
        feedback: "Every character is equally strong — choose the hero you like best."
      }
    },
    {
      id: "preview-character",
      target: () => document.getElementById("hero-gallery-prev"),
      he: {
        name: "הכירו את הדמויות",
        action: "עברו לדמות השנייה",
        feedback: "יש שתי דמויות. אפשר לעבור ביניהן לפני שבוחרים."
      },
      en: {
        name: "Meet the heroes",
        action: "Show the other character",
        feedback: "There are two heroes. You can browse both before choosing."
      }
    },
    {
      id: "select-character",
      target: () => document.getElementById("hero-gallery-select"),
      feedbackMs: FEEDBACK_DELAY_MS.detailed,
      afterFeedback: () => returnHomeFromGallery(),
      he: {
        name: "אישור דמות",
        action: "אשרו את הדמות",
        feedback: "הדמות מוכנה. במבוך אוספים פריטים, נמנעים מאויבים ועונים נכון."
      },
      en: {
        name: "Confirm character",
        action: "Confirm this character",
        feedback: "Your hero is ready. In the maze, collect items, avoid enemies, and answer correctly."
      }
    },
    {
      id: "start-game",
      target: () => document.getElementById("start-button"),
      feedbackMs: FEEDBACK_DELAY_MS.startGame,
      deferAction: true,
      he: {
        name: "יוצאים לדרך",
        action: "לחצו שחק עכשיו",
        feedback: "המטרה: לצבור נקודות ולהשלים את כל 4 העולמות. אם עוד אין כינוי, ההגדרות ייפתחו עכשיו."
      },
      en: {
        name: "Let’s play",
        action: "Tap Play Now",
        feedback: "Score points and complete all four worlds. If you do not have a nickname yet, Settings opens now."
      }
    }
  ];

  const TOTAL_STEPS = STEPS.length;
  progress.setAttribute("aria-valuemax", String(TOTAL_STEPS));
  const state = {
    open: false,
    stepIndex: 0,
    phase: "closed",
    target: null,
    targetRect: null,
    feedbackTarget: null,
    feedbackRect: null,
    previousFocus: null,
    feedbackTimer: null,
    lockTimer: null,
    repositionFrame: null,
    clickPending: false,
    bypassGuard: false,
    runToken: 0,
    resizeObserver: null,
    lastViewport: null,
    lastCardSize: null,
    lockAnimation: null,
    transitionStartedAt: null,
    lastFeedbackLatencyMs: null,
    forwardedClickUntil: 0,
    renderStats: {
      dimPaints: 0,
      targetPositions: 0,
      feedbackPositions: 0,
      skippedRepositions: 0
    }
  };

  const STABLE_RECT_TOLERANCE = 0.15;
  const STABLE_RECT_FRAMES = 6;

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
          step: (current) => `${current}/${TOTAL_STEPS}`,
          skip: "Skip",
          replay: "Tutorial: how to play?",
          locked: "Tap only the button the hand is pointing at"
        }
      : {
          step: (current) => `${current}/${TOTAL_STEPS}`,
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

  function rectIsStable(previous, next, tolerance = STABLE_RECT_TOLERANCE) {
    return Boolean(
      previous && next
      && Math.abs(previous.left - next.left) <= tolerance
      && Math.abs(previous.top - next.top) <= tolerance
      && Math.abs(previous.width - next.width) <= tolerance
      && Math.abs(previous.height - next.height) <= tolerance
    );
  }

  function viewportIsStable(previous, next) {
    return Boolean(
      previous && next
      && Math.abs(previous.width - next.width) <= STABLE_RECT_TOLERANCE
      && Math.abs(previous.height - next.height) <= STABLE_RECT_TOLERANCE
    );
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

  function resizeDimLayer(viewport) {
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    if (dimLayer.width !== width) {
      dimLayer.width = width;
    }
    if (dimLayer.height !== height) {
      dimLayer.height = height;
    }
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    const safeRadius = Math.min(Math.max(0, radius), width / 2, height / 2);
    context.beginPath();
    if (typeof context.roundRect === "function") {
      context.roundRect(x, y, width, height, safeRadius);
      return;
    }
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }

  function drawDimLayer(hole = null, radius = 0) {
    const viewport = viewportSize();
    resizeDimLayer(viewport);
    state.renderStats.dimPaints += 1;
    dimContext.globalCompositeOperation = "source-over";
    dimContext.clearRect(0, 0, dimLayer.width, dimLayer.height);
    dimContext.fillStyle = "rgba(1, 4, 15, 0.66)";
    dimContext.fillRect(0, 0, viewport.width, viewport.height);
    if (!hole || hole.width <= 0 || hole.height <= 0) {
      return;
    }
    dimContext.globalCompositeOperation = "destination-out";
    dimContext.fillStyle = "rgba(0, 0, 0, 1)";
    roundedRectPath(dimContext, hole.left, hole.top, hole.width, hole.height, radius);
    dimContext.fill();
    dimContext.globalCompositeOperation = "source-over";
  }

  function cardSize() {
    return {
      width: Math.max(1, coachCard.offsetWidth),
      height: Math.max(1, coachCard.offsetHeight)
    };
  }

  function cardSizeIsStable(previous, next) {
    return Boolean(
      previous && next
      && Math.abs(previous.width - next.width) <= STABLE_RECT_TOLERANCE
      && Math.abs(previous.height - next.height) <= STABLE_RECT_TOLERANCE
    );
  }

  function nearbyCardPlacement(rect, size = cardSize()) {
    const viewport = viewportSize();
    const safeInset = viewport.width <= 600 ? 10 : 12;
    const gap = viewport.width <= 600 ? 13 : 15;
    const { width: cardWidth, height: cardHeight } = size;
    const verticalLeft = clamp(
      rect.centerX - cardWidth / 2,
      safeInset,
      Math.max(safeInset, viewport.width - cardWidth - safeInset)
    );
    const horizontalTop = clamp(
      rect.centerY - cardHeight / 2,
      safeInset,
      Math.max(safeInset, viewport.height - cardHeight - safeInset)
    );
    const candidates = [
      {
        placement: "above",
        left: verticalLeft,
        top: rect.top - gap - cardHeight,
        available: rect.top - safeInset
      },
      {
        placement: "below",
        left: verticalLeft,
        top: rect.bottom + gap,
        available: viewport.height - safeInset - rect.bottom
      },
      {
        placement: "left",
        left: rect.left - gap - cardWidth,
        top: horizontalTop,
        available: rect.left - safeInset
      },
      {
        placement: "right",
        left: rect.right + gap,
        top: horizontalTop,
        available: viewport.width - safeInset - rect.right
      }
    ];
    const required = (candidate) => (
      candidate.placement === "above" || candidate.placement === "below"
        ? cardHeight + gap
        : cardWidth + gap
    );
    const fitting = candidates
      .filter((candidate) => candidate.available >= required(candidate))
      .sort((first, second) => {
        const firstVertical = first.placement === "above" || first.placement === "below";
        const secondVertical = second.placement === "above" || second.placement === "below";
        if (firstVertical !== secondVertical) {
          return firstVertical ? -1 : 1;
        }
        return (second.available - required(second)) - (first.available - required(first));
      });
    const selected = fitting[0] || candidates.sort(
      (first, second) => (second.available - required(second)) - (first.available - required(first))
    )[0];
    const left = clamp(
      selected.left,
      safeInset,
      Math.max(safeInset, viewport.width - cardWidth - safeInset)
    );
    const top = clamp(
      selected.top,
      safeInset,
      Math.max(safeInset, viewport.height - cardHeight - safeInset)
    );

    return {
      placement: selected.placement,
      left,
      top,
      tailX: clamp(rect.centerX - left, 24, Math.max(24, cardWidth - 24)),
      tailY: clamp(rect.centerY - top, 24, Math.max(24, cardHeight - 24)),
      fits: fitting.length > 0,
      gap
    };
  }

  function positionCoachCard(rect) {
    const size = cardSize();
    const position = nearbyCardPlacement(rect, size);
    state.lastCardSize = size;
    coachCard.dataset.placement = position.placement;
    coachCard.style.left = `${position.left}px`;
    coachCard.style.top = `${position.top}px`;
    coachCard.style.setProperty("--coach-tail-x", `${position.tailX}px`);
    coachCard.style.setProperty("--coach-tail-y", `${position.tailY}px`);
    return position;
  }

  function positionTarget(rect) {
    if (!rect) {
      return;
    }
    const viewport = viewportSize();
    state.lastViewport = viewport;
    state.renderStats.targetPositions += 1;
    const hole = paddedHole(rect);
    const targetStyle = state.target ? window.getComputedStyle(state.target) : null;
    const radius = clamp(parseFloat(targetStyle?.borderRadius || "16") + 7, 14, 30);
    drawDimLayer(hole, radius);
    setBox(targetRing, hole.left, hole.top, hole.width, hole.height);
    targetRing.style.borderRadius = `${radius}px`;

    const isMobile = viewport.width <= 600;
    const handWidth = isMobile ? 42 : 48;
    const handHeight = isMobile ? 50 : 56;
    const room = {
      below: viewport.height - hole.bottom,
      above: hole.top,
      right: viewport.width - hole.right,
      left: hole.left
    };
    const verticalNeed = handHeight + 12;
    const horizontalNeed = handWidth + 12;
    let side;

    const cardPosition = positionCoachCard(hole);

    if (cardPosition.placement === "above" && room.below >= verticalNeed) {
      side = "below";
    } else if (cardPosition.placement === "below" && room.above >= verticalNeed) {
      side = "above";
    } else if (cardPosition.placement === "left" && room.right >= horizontalNeed) {
      side = "right";
    } else if (cardPosition.placement === "right" && room.left >= horizontalNeed) {
      side = "left";
    } else if (hole.left < handWidth + 8 && room.right >= horizontalNeed) {
      side = "right";
    } else if (hole.right > viewport.width - handWidth - 8 && room.left >= horizontalNeed) {
      side = "left";
    } else if (room.below >= verticalNeed) {
      side = "below";
    } else if (room.above >= verticalNeed) {
      side = "above";
    } else if (room.right >= horizontalNeed) {
      side = "right";
    } else if (room.left >= horizontalNeed) {
      side = "left";
    } else {
      side = room.below >= room.above ? "below" : "above";
    }

    let handLeft;
    let handTop;
    if (side === "below") {
      handLeft = hole.centerX - handWidth * 0.36;
      handTop = hole.bottom + 5;
    } else if (side === "above") {
      handLeft = hole.centerX - handWidth * 0.64;
      handTop = hole.top - handHeight - 5;
    } else if (side === "right") {
      handLeft = hole.right + 5;
      handTop = hole.centerY - handHeight / 2;
    } else {
      handLeft = hole.left - handWidth - 5;
      handTop = hole.centerY - handHeight / 2;
    }
    handLeft = clamp(handLeft, 4, viewport.width - handWidth - 4);
    handTop = clamp(handTop, 4, viewport.height - handHeight - 4);
    hand.dataset.side = side;
    hand.style.left = `${handLeft}px`;
    hand.style.top = `${handTop}px`;
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
          const nextViewport = viewportSize();
          const nextCardSize = cardSize();
          if (
            rectIsStable(state.targetRect, nextRect)
            && viewportIsStable(state.lastViewport, nextViewport)
            && cardSizeIsStable(state.lastCardSize, nextCardSize)
          ) {
            state.renderStats.skippedRepositions += 1;
            return;
          }
          state.targetRect = nextRect;
          positionTarget(nextRect);
        }
      } else if (state.phase === "feedback" && state.feedbackRect) {
        const nextRect = state.feedbackRect;
        const nextViewport = viewportSize();
        if (viewportIsStable(state.lastViewport, nextViewport)) {
          state.renderStats.skippedRepositions += 1;
          return;
        }
        state.lastViewport = nextViewport;
        state.renderStats.feedbackPositions += 1;
        drawDimLayer();
        positionCoachCard(paddedHole(nextRect));
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

  function nextPaint() {
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  async function waitForStepTarget(step, token) {
    const deadline = window.performance.now() + 4500;
    let previousCandidate = null;
    let previousRect = null;
    let stableFrames = 0;
    let centeredCandidate = null;

    while (state.open && token === state.runToken && window.performance.now() < deadline) {
      const candidate = resolveStepTarget(step);
      const rect = rectFor(candidate);
      if (rect) {
        const viewport = viewportSize();
        const placement = nearbyCardPlacement(rect);
        if (
          rect.top < 8 || rect.bottom > viewport.height - 8
          || (!placement.fits && centeredCandidate !== candidate)
        ) {
          candidate.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
          centeredCandidate = candidate;
          previousCandidate = null;
          previousRect = null;
          stableFrames = 0;
          await nextPaint();
          continue;
        }

        if (candidate === previousCandidate && rectIsStable(previousRect, rect)) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
        }
        previousCandidate = candidate;
        previousRect = rect;

        if (stableFrames >= STABLE_RECT_FRAMES) {
          return { target: candidate, rect };
        }
      } else {
        previousCandidate = null;
        previousRect = null;
        stableFrames = 0;
      }
      await nextPaint();
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
    state.resizeObserver?.disconnect?.();
    state.resizeObserver = null;
    state.target?.classList?.remove(TARGET_CLASS);
    state.target = null;
    state.targetRect = null;
  }

  function observeActiveGeometry(target) {
    if (!("ResizeObserver" in window)) {
      return;
    }
    state.resizeObserver?.disconnect?.();
    state.resizeObserver = new ResizeObserver(scheduleReposition);
    state.resizeObserver.observe(target);
    state.resizeObserver.observe(coachCard);
  }

  function runWithoutTutorialGuard(action) {
    state.bypassGuard = true;
    try {
      action?.();
    } finally {
      state.bypassGuard = false;
    }
  }

  function openSettingsForTutorial() {
    const settingsPanel = document.getElementById("settings-panel");
    if (settingsPanel && !settingsPanel.hidden) {
      return;
    }
    runWithoutTutorialGuard(() => document.getElementById("menu-settings-button")?.click());
  }

  function returnHomeFromGallery() {
    const gallery = document.getElementById("hero-gallery");
    if (!gallery || gallery.hidden) {
      return;
    }
    runWithoutTutorialGuard(() => document.getElementById("hero-gallery-home")?.click());
  }

  function resetSettingsScrollAfterTutorial() {
    const settingsPanel = document.getElementById("settings-panel");
    if (!settingsPanel || settingsPanel.hidden) {
      return;
    }
    const settingsSheet = settingsPanel.querySelector(".menu-sheet-inner");
    if (settingsSheet instanceof HTMLElement) {
      settingsSheet.scrollTop = 0;
      settingsSheet.scrollLeft = 0;
    }
  }

  async function showStep() {
    const token = state.runToken;
    const step = STEPS[state.stepIndex];
    if (!state.open || !step) {
      return;
    }

    state.phase = "locating";
    state.clickPending = false;
    state.feedbackTarget = null;
    state.feedbackRect = null;
    speechBubble.hidden = true;
    tutorial.classList.add("is-locating");
    tutorial.classList.remove("is-ready", "is-feedback");
    resetOverlayGeometry();
    clearActiveTarget();
    updateStaticCopy();
    progress.setAttribute("aria-valuenow", String(state.stepIndex + 1));
    progressFill.style.width = `${((state.stepIndex + 1) / TOTAL_STEPS) * 100}%`;

    const located = await waitForStepTarget(step, token);
    if (!state.open || token !== state.runToken) {
      return;
    }
    if (!located) {
      console.warn(`[Kaflul tutorial] Target unavailable for step: ${step.id}`);
      closeTutorial({ complete: false });
      return;
    }

    const { target } = located;
    state.target = target;
    state.target.classList.add(TARGET_CLASS);
    observeActiveGeometry(target);
    state.phase = "positioning";
    focusTarget(target);
    await nextPaint();
    await nextPaint();
    if (!state.open || token !== state.runToken) {
      return;
    }

    const finalRect = rectFor(target);
    if (!finalRect) {
      console.warn(`[Kaflul tutorial] Target moved before display: ${step.id}`);
      showStep();
      return;
    }
    state.targetRect = finalRect;
    positionTarget(finalRect);
    state.phase = "awaiting";
    tutorial.classList.remove("is-locating");
    tutorial.classList.add("is-ready");
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
    state.lockAnimation?.cancel?.();
    state.lockAnimation = lockMessage.animate?.([
      { transform: "translateX(50%)" },
      { transform: "translateX(calc(50% - 7px))", offset: 0.3 },
      { transform: "translateX(calc(50% + 7px))", offset: 0.65 },
      { transform: "translateX(50%)" }
    ], { duration: 360, easing: "ease", fill: "none" }) || null;
    state.lockTimer = window.setTimeout(() => {
      lockMessage.hidden = true;
    }, 1250);
  }

  function showFeedback(step, anchorRect) {
    if (!state.open || step !== STEPS[state.stepIndex]) {
      return;
    }
    state.phase = "feedback";
    state.lastFeedbackLatencyMs = state.transitionStartedAt === null
      ? null
      : window.performance.now() - state.transitionStartedAt;
    state.feedbackTarget = state.feedbackTarget || state.target;
    state.feedbackRect = anchorRect || state.targetRect;
    clearActiveTarget();
    resetOverlayGeometry();
    const activeCopy = copyFor(step);
    speechCopy.textContent = activeCopy.feedback;
    speechBubble.hidden = false;
    tutorial.classList.remove("is-ready", "is-locating", "is-transitioning");
    tutorial.classList.add("is-feedback");
    state.lastViewport = viewportSize();
    state.renderStats.feedbackPositions += 1;
    window.dispatchEvent(new CustomEvent("kaflul:tutorial-feedback", {
      detail: { step: state.stepIndex + 1, total: TOTAL_STEPS, id: step.id, copy: activeCopy.feedback }
    }));

    window.clearTimeout(state.feedbackTimer);
    state.feedbackTimer = window.setTimeout(() => {
      if (!state.open) {
        return;
      }
      if (state.stepIndex >= TOTAL_STEPS - 1) {
        const deferredTarget = step.deferAction ? state.feedbackTarget : null;
        closeTutorial({ complete: true, keepFocus: Boolean(deferredTarget) });
        if (deferredTarget?.isConnected) {
          window.setTimeout(() => {
            runWithoutTutorialGuard(() => deferredTarget.click());
            resetSettingsScrollAfterTutorial();
            window.requestAnimationFrame(resetSettingsScrollAfterTutorial);
          }, 0);
        }
        return;
      }
      step.afterFeedback?.();
      state.stepIndex += 1;
      showStep();
    }, step.feedbackMs || FEEDBACK_DELAY_MS.standard);
  }

  function targetContains(node) {
    return node instanceof Node && Boolean(state.target?.contains(node));
  }

  function guardPointer(event) {
    if (state.bypassGuard || !state.open || skipButton.contains(event.target)) {
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
    if (state.bypassGuard || !state.open || skipButton.contains(event.target)) {
      return;
    }
    if (
      state.phase === "feedback"
      && window.performance.now() <= state.forwardedClickUntil
      && event.target instanceof Node
      && state.feedbackTarget?.contains(event.target)
    ) {
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
      window.clearTimeout(state.lockTimer);
      lockMessage.hidden = true;
      const step = STEPS[state.stepIndex];
      if (step.deferAction) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      const clickedRect = rectFor(state.target) || state.targetRect;
      state.feedbackTarget = state.target;
      state.phase = "transitioning";
      state.transitionStartedAt = window.performance.now();
      state.forwardedClickUntil = state.transitionStartedAt + 250;
      tutorial.classList.remove("is-ready");
      tutorial.classList.add("is-transitioning");
      showFeedback(step, clickedRect);
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
    drawDimLayer();
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
    state.transitionStartedAt = null;
    state.lastFeedbackLatencyMs = null;
    state.forwardedClickUntil = 0;
    state.lastViewport = null;
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
    state.lockAnimation?.cancel?.();
    state.lockAnimation = null;
    if (state.repositionFrame !== null) {
      window.cancelAnimationFrame(state.repositionFrame);
      state.repositionFrame = null;
    }
    if (completed) {
      writeStorage(TUTORIAL_STATUS_KEY, "complete");
    }
    clearActiveTarget();
    tutorial.classList.remove("is-ready", "is-feedback", "is-locating", "is-transitioning");
    tutorial.hidden = true;
    speechBubble.hidden = true;
    lockMessage.hidden = true;
    document.documentElement.classList.remove("kf-tutorial-open");
    state.lastViewport = null;
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
  window.visualViewport?.addEventListener("resize", scheduleReposition, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleReposition, { passive: true });
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
      feedbackDelayMs: STEPS[state.stepIndex]?.feedbackMs || FEEDBACK_DELAY_MS.standard,
      lastFeedbackLatencyMs: state.lastFeedbackLatencyMs,
      renderStats: { ...state.renderStats },
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
