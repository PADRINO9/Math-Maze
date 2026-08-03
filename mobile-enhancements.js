(() => {
  "use strict";

  const root = document.documentElement;
  const stage = document.querySelector(".stage");
  const hud = document.querySelector(".hud");
  const pauseButton = document.getElementById("pause-button");
  const soundButton = document.getElementById("sound-button");
  const hudActions = document.querySelector(".hud-actions");
  const answerInput = document.getElementById("answer-input");
  const coarseQuery = window.matchMedia("(hover: none), (pointer: coarse)");
  const CONTROL_MODE_STORAGE_KEY = "mathMazeControlMode";
  const SAVE_KEY = window.KaflulSystems?.SAVE_KEY || "kaflulArcadeSave";

  function isTouchLayout() {
    return coarseQuery.matches;
  }

  function normalizeControlMode(value) {
    return value === "joystick" ? "joystick" : "swipe";
  }

  function getStoredControlMode() {
    try {
      const storedMode = window.localStorage?.getItem(CONTROL_MODE_STORAGE_KEY);
      if (storedMode) {
        return normalizeControlMode(storedMode);
      }

      const save = JSON.parse(window.localStorage?.getItem(SAVE_KEY) || "null");
      return normalizeControlMode(save?.settings?.controlMode);
    } catch {
      return "swipe";
    }
  }

  function syncViewportHeight() {
    const height = window.visualViewport?.height || window.innerHeight;
    root.style.setProperty("--visual-viewport-height", `${Math.round(height)}px`);
  }

  function syncGameplayTopInset() {
    if (!hud) {
      root.style.removeProperty("--gameplay-top-inset");
      return;
    }

    const visibleHudRects = [hud, ...hud.querySelectorAll("*")]
      .map((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
          ? rect
          : null;
      })
      .filter(Boolean);
    const hudBottom = visibleHudRects.reduce((bottom, rect) => Math.max(bottom, rect.bottom), 0);
    const nextInset = `${Math.max(0, Math.ceil(hudBottom + 4))}px`;
    if (root.style.getPropertyValue("--gameplay-top-inset") !== nextInset) {
      root.style.setProperty("--gameplay-top-inset", nextInset);
    }
  }

  function syncDeviceClasses() {
    const touch = isTouchLayout();
    const controlMode = getStoredControlMode();
    root.classList.toggle("touch-layout", touch);
    root.classList.toggle("mobile-low-effects", touch && (window.innerWidth < 900 || window.devicePixelRatio > 2));
    root.classList.toggle("control-joystick", touch && controlMode === "joystick");
    root.classList.toggle("control-swipe", touch && controlMode === "swipe");
    root.dataset.controlMode = controlMode;
    syncViewportHeight();
    syncGameplayTopInset();
  }

  function removeLegacyTouchControls() {
    document.querySelectorAll(".control-field").forEach((element) => element.remove());
  }

  function configureGameAnswerInput() {
    if (!answerInput) {
      return;
    }

    answerInput.readOnly = true;
    answerInput.inputMode = "none";
    answerInput.setAttribute("inputmode", "none");
    answerInput.setAttribute("pattern", "[0-9]*");
    answerInput.setAttribute("maxlength", "4");
    answerInput.setAttribute("aria-describedby", "game-number-pad");
  }

  function syncActionButtonStates() {
    if (pauseButton) {
      pauseButton.classList.add("mobile-icon-button");
      pauseButton.dataset.mobileState = pauseButton.dataset.icon === "play" ? "play" : "pause";
    }
    if (soundButton) {
      soundButton.classList.add("mobile-icon-button");
      soundButton.dataset.mobileState = soundButton.dataset.icon === "sound-off" ? "off" : "on";
    }
  }

  function injectFullscreenButton() {
    if (!hudActions || !document.documentElement.requestFullscreen || hudActions.querySelector(".fullscreen-button")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button fullscreen-button mobile-icon-button";
    button.dataset.icon = "fullscreen";
    button.setAttribute("aria-label", "מסך מלא");
    button.innerHTML = '<svg class="ui-icon" aria-hidden="true" focusable="false"><use href="ui/icons.svg#fullscreen"></use></svg>';
    button.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        }
      } catch {
        // Fullscreen is optional and may be rejected by the browser.
      }
    });
    hudActions.appendChild(button);
  }

  function keepSwipeAvailable(event) {
    return event;
  }

  if (stage) {
    stage.addEventListener("pointerdown", keepSwipeAvailable, true);
    stage.addEventListener("pointermove", keepSwipeAvailable, true);
  }

  [pauseButton, soundButton].forEach((button) => {
    if (button) {
      new MutationObserver(syncActionButtonStates).observe(button, {
        attributes: true,
        attributeFilter: ["data-icon", "aria-label"],
        childList: true,
        characterData: true,
        subtree: true
      });
    }
  });

  if (hud && typeof ResizeObserver !== "undefined") {
    const hudResizeObserver = new ResizeObserver(syncGameplayTopInset);
    hudResizeObserver.observe(hud);
    Array.from(hud.children).forEach((element) => hudResizeObserver.observe(element));
  }

  new MutationObserver(() => {
    window.requestAnimationFrame(syncGameplayTopInset);
  }).observe(root, {
    attributes: true,
    attributeFilter: ["class", "data-game-state"]
  });

  new MutationObserver(() => {
    removeLegacyTouchControls();
    configureGameAnswerInput();
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  coarseQuery.addEventListener?.("change", () => {
    syncDeviceClasses();
    configureGameAnswerInput();
  });
  window.addEventListener("resize", syncDeviceClasses, { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(syncDeviceClasses, 120), { passive: true });
  window.addEventListener("kaflul:control-mode-change", syncDeviceClasses);
  window.visualViewport?.addEventListener("resize", () => {
    syncViewportHeight();
    syncGameplayTopInset();
  }, { passive: true });
  document.addEventListener("fullscreenchange", syncDeviceClasses);

  removeLegacyTouchControls();
  configureGameAnswerInput();
  injectFullscreenButton();
  syncActionButtonStates();
  syncDeviceClasses();
})();
