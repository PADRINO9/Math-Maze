(() => {
  "use strict";

  const root = document.documentElement;
  const loadingScreen = document.getElementById("app-loading-screen");
  const loadingProgress = loadingScreen?.querySelector(".loading-progress");
  const startScreen = document.getElementById("start-screen");
  const endScreen = document.getElementById("end-screen");
  const pauseButton = document.getElementById("pause-button");
  const poster = document.getElementById("start-poster-image");
  const coarseQuery = window.matchMedia("(hover: none), (pointer: coarse)");

  const runtime = window.__mathMazeRuntime = window.__mathMazeRuntime || {
    errors: [],
    startedAt: performance.now(),
    startTransitions: 0
  };

  window.addEventListener("error", (event) => {
    runtime.errors.push(String(event.error || event.message || "Unknown runtime error"));
  });
  window.addEventListener("unhandledrejection", (event) => {
    runtime.errors.push(String(event.reason || "Unhandled promise rejection"));
  });

  // The legacy engine registers a window blur handler near the end of game.js.
  // Keep registration blocked until every parser-loaded game script has run;
  // restoring on a zero-delay timer was network-timing dependent in production.
  const nativeAddEventListener = window.addEventListener;
  window.addEventListener = function addEventListenerWithoutLegacyBlur(type, listener, options) {
    if (type === "blur") {
      return undefined;
    }
    return nativeAddEventListener.call(this, type, listener, options);
  };

  const restoreNativeWindowEvents = () => {
    window.addEventListener = nativeAddEventListener;
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restoreNativeWindowEvents, { once: true });
  } else {
    restoreNativeWindowEvents();
  }

  const stateStyle = document.createElement("style");
  stateStyle.id = "game-screen-state-fix";
  stateStyle.textContent = `
    html #start-screen[hidden],
    html #end-screen[hidden],
    html #question-dialog[hidden],
    html #leaderboard-dialog[hidden],
    html #publish-score-panel[hidden],
    html #winner-trophy[hidden] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(stateStyle);

  function syncStartScreenState() {
    if (!startScreen) {
      return;
    }

    const isOpen = !startScreen.hidden;
    root.classList.toggle("start-screen-open", isOpen && coarseQuery.matches);
    startScreen.setAttribute("aria-hidden", String(!isOpen));

    if (isOpen) {
      startScreen.style.removeProperty("display");
      startScreen.style.removeProperty("visibility");
      startScreen.style.removeProperty("pointer-events");
      if (coarseQuery.matches) {
        startScreen.scrollTop = 0;
        startScreen.querySelector(".screen-panel")?.scrollTo?.(0, 0);
      }
      return;
    }

    runtime.startTransitions += 1;
    if (startScreen.classList.contains("screen-visible")) {
      startScreen.classList.remove("screen-visible");
    }
    startScreen.style.setProperty("display", "none", "important");
    startScreen.style.setProperty("visibility", "hidden", "important");
    startScreen.style.setProperty("pointer-events", "none", "important");
  }

  if (startScreen) {
    // Observe only the state source. Observing `class` while also changing it in
    // the callback created an endless MutationObserver microtask loop that froze
    // the page immediately after the Start button hid the screen.
    new MutationObserver(syncStartScreenState).observe(startScreen, {
      attributes: true,
      attributeFilter: ["hidden"]
    });
  }

  coarseQuery.addEventListener?.("change", syncStartScreenState);
  window.addEventListener("pageshow", syncStartScreenState);
  window.addEventListener(
    "orientationchange",
    () => window.setTimeout(syncStartScreenState, 120),
    { passive: true }
  );

  // Pause only when the document is genuinely hidden. Do not auto-resume on
  // return because the player may expect the game to remain safely paused.
  document.addEventListener("visibilitychange", () => {
    const gameIsOpen = Boolean(startScreen?.hidden && (!endScreen || endScreen.hidden));
    const isRunning = pauseButton?.dataset.icon !== "play";
    if (document.hidden && gameIsOpen && isRunning) {
      pauseButton.click();
    }
  });

  syncStartScreenState();

  const loadingAssets = [
    "assets/loading/kaflul-loading-background-v1.webp",
    "assets/kaflul-logo-official.png",
    "assets/generated/bifly-expression-idle.png",
    "assets/generated/nabatick-expression-idle.png",
    "assets/dark-enemy.png",
    "assets/dark-enemy-angry.png",
    "assets/dark-enemy-surprised.png"
  ];

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function setLoadingProgress(value) {
    if (!loadingProgress) {
      return;
    }

    const progress = Math.max(8, Math.min(100, Math.round(value)));
    loadingProgress.style.setProperty("--loading-progress", `${progress}%`);
    loadingProgress.setAttribute("aria-valuenow", String(progress));
  }

  function preloadLoadingImage(source) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve({ source, ok: true });
      image.onerror = () => resolve({ source, ok: false });
      image.src = source;
    });
  }

  function waitForDomReady() {
    if (document.readyState !== "loading") {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  function waitForGameReady() {
    if (runtime.gameReady) {
      return Promise.resolve();
    }

    return Promise.race([
      new Promise((resolve) => {
        window.addEventListener("kaflul:game-ready", resolve, { once: true });
      }),
      delay(2600)
    ]);
  }

  function waitForFonts() {
    if (!document.fonts?.ready) {
      return Promise.resolve();
    }

    return Promise.race([
      document.fonts.ready.catch(() => undefined),
      delay(1300)
    ]);
  }

  async function waitForNextPaint() {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  async function prepareInitialLoadingScreen() {
    if (!loadingScreen) {
      root.classList.remove("loading-screen-active");
      return;
    }

    const startedAt = performance.now();
    const params = new URLSearchParams(window.location.search);
    const minVisibleMs = params.get("verify") === "loading-proof" ? 3200 : 2800;
    runtime.loadingStartedAt = startedAt;
    setLoadingProgress(12);

    let completedAssets = 0;
    const assetWork = Promise.allSettled(
      loadingAssets.map((source) => preloadLoadingImage(source).then((result) => {
        completedAssets += 1;
        setLoadingProgress(12 + (completedAssets / loadingAssets.length) * 58);
        return result;
      }))
    );

    const readiness = Promise.allSettled([
      waitForDomReady().then(() => setLoadingProgress(76)),
      assetWork,
      waitForFonts().then(() => setLoadingProgress(86)),
      waitForGameReady().then(() => setLoadingProgress(94))
    ]);

    await Promise.race([readiness, delay(5200)]);
    await waitForNextPaint();

    const elapsed = performance.now() - startedAt;
    if (elapsed < minVisibleMs) {
      await delay(minVisibleMs - elapsed);
    }

    setLoadingProgress(100);
    runtime.loadingFinishedAt = performance.now();
    loadingScreen.setAttribute("aria-hidden", "true");
    root.classList.remove("loading-screen-active");
    root.classList.add("loading-screen-complete");

    window.setTimeout(() => {
      loadingScreen.hidden = true;
      root.classList.remove("loading-screen-complete");
    }, 520);
  }

  prepareInitialLoadingScreen();

  if (!poster) {
    return;
  }

  window.__keflulPosterLoaderInstalled = true;
  try {
    sessionStorage.removeItem("keflul-start-poster-webp-v3");
  } catch {
    // Session storage may be unavailable in private browsing.
  }

  const fallbackSource = poster.getAttribute("src") || "assets/math-maze-poster.png";
  const sourceParts = Array.from(
    { length: 8 },
    (_, index) => `assets/poster-source/keflul-mobile-${String(index).padStart(2, "0")}.txt`
  );

  function showReadyPoster(source) {
    const verificationImage = new Image();
    verificationImage.decoding = "async";
    verificationImage.onload = () => {
      poster.src = source;
      poster.classList.remove("poster-loading", "poster-fallback", "poster-error");
      poster.classList.add("poster-ready");
    };
    verificationImage.onerror = () => {
      poster.src = fallbackSource;
      poster.classList.remove("poster-loading", "poster-ready", "poster-error");
      poster.classList.add("poster-fallback");
    };
    verificationImage.src = source;
  }

  Promise.all(
    sourceParts.map(async (path) => {
      const response = await fetch(`${path}?v=20260624-1`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Poster source failed: ${response.status}`);
      }
      return response.text();
    })
  )
    .then((parts) => {
      const base64 = parts.join("").replace(/\s+/g, "");
      if (base64.length !== 80144 || !base64.startsWith("UklGR")) {
        throw new Error("Poster source is incomplete");
      }

      const binary = atob(base64);
      if (binary.length !== 60108 || binary.slice(0, 4) !== "RIFF" || binary.slice(8, 12) !== "WEBP") {
        throw new Error("Poster binary failed validation");
      }

      showReadyPoster(`data:image/webp;base64,${base64}`);
    })
    .catch((error) => {
      console.warn("Using the bundled poster fallback.", error);
      poster.src = fallbackSource;
      poster.classList.remove("poster-loading", "poster-ready", "poster-error");
      poster.classList.add("poster-fallback");
    });
})();
