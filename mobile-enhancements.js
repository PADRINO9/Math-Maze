(() => {
  "use strict";

  const root = document.documentElement;
  const stage = document.querySelector(".stage");
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

  function syncDeviceClasses() {
    const touch = isTouchLayout();
    const controlMode = getStoredControlMode();
    root.classList.toggle("touch-layout", touch);
    root.classList.toggle("mobile-low-effects", touch && (window.innerWidth < 900 || window.devicePixelRatio > 2));
    root.classList.toggle("control-joystick", touch && controlMode === "joystick");
    root.classList.toggle("control-swipe", touch && controlMode === "swipe");
    root.dataset.controlMode = controlMode;
    syncViewportHeight();
  }

  function removeLegacyTouchControls() {
    document.querySelectorAll(".control-field").forEach((element) => element.remove());
    document.querySelectorAll(".mobile-number-pad").forEach((pad) => pad.remove());
  }

  function configureNativeAnswerInput() {
    if (!answerInput) {
      return;
    }

    answerInput.readOnly = false;
    answerInput.inputMode = "numeric";
    answerInput.setAttribute("inputmode", "numeric");
    answerInput.setAttribute("pattern", "[0-9]*");
    answerInput.setAttribute("enterkeyhint", "done");
    answerInput.removeAttribute("aria-describedby");
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

  new MutationObserver(() => {
    removeLegacyTouchControls();
    configureNativeAnswerInput();
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  coarseQuery.addEventListener?.("change", () => {
    syncDeviceClasses();
    configureNativeAnswerInput();
  });
  window.addEventListener("resize", syncDeviceClasses, { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(syncDeviceClasses, 120), { passive: true });
  window.addEventListener("kaflul:control-mode-change", syncDeviceClasses);
  window.visualViewport?.addEventListener("resize", syncViewportHeight, { passive: true });
  document.addEventListener("fullscreenchange", syncDeviceClasses);

  removeLegacyTouchControls();
  configureNativeAnswerInput();
  injectFullscreenButton();
  syncActionButtonStates();
  syncDeviceClasses();
})();
