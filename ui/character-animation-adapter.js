(() => {
  "use strict";

  const STATES = [
    "idle",
    "blink",
    "tap",
    "selected",
    "excited",
    "worried",
    "victory",
    "defeat",
    "eat",
    "hit"
  ];

  const ADAPTER_TYPES = [
    "static-png",
    "sprite-sheet",
    "layered-png-rig",
    "rive",
    "spine"
  ];

  const TYPE_LABELS = {
    "static-png": "תמונה סטטית",
    "sprite-sheet": "ספרייט שיט",
    "layered-png-rig": "ריג שכבות PNG",
    rive: "Rive",
    spine: "Spine"
  };

  function manifest() {
    return globalThis.KAFLUL_ASSET_MANIFEST?.characterAnimations || {};
  }

  function normalizeState(state) {
    return STATES.includes(state) ? state : "idle";
  }

  function normalizeAdapterType(type) {
    return ADAPTER_TYPES.includes(type) ? type : "static-png";
  }

  function getCharacterConfig(characterId) {
    return manifest().characters?.[characterId] || manifest().characters?.bifly || null;
  }

  function getAdapterConfig(characterId, type) {
    const character = getCharacterConfig(characterId);
    if (!character) return null;
    return character.adapters?.[normalizeAdapterType(type || character.defaultAdapter)];
  }

  function hasRuntimeSupport(type) {
    if (type === "rive") {
      return Boolean(globalThis.rive?.Rive);
    }
    if (type === "spine") {
      return Boolean(globalThis.spine);
    }
    return true;
  }

  function resolveState(characterId, state, preferredType) {
    const character = getCharacterConfig(characterId);
    if (!character) return null;

    const requestedState = normalizeState(state);
    const adapterType = normalizeAdapterType(preferredType || character.defaultAdapter);
    const adapter = getAdapterConfig(characterId, adapterType);
    const states = adapter?.states || {};
    const fallbackState = normalizeState(character.fallbackState || "idle");
    const stateConfig = states[requestedState] || states[fallbackState];

    if (!stateConfig || !hasRuntimeSupport(adapterType)) {
      const fallbackAdapter = getAdapterConfig(characterId, "static-png");
      const fallbackStates = fallbackAdapter?.states || {};
      const fallbackConfig = fallbackStates[requestedState] || fallbackStates[fallbackState];
      if (!fallbackConfig) return null;
      return {
        character,
        adapterType: "static-png",
        requestedState,
        renderedState: fallbackStates[requestedState] ? requestedState : fallbackState,
        stateConfig: fallbackConfig,
        usedFallback: true
      };
    }

    return {
      character,
      adapterType,
      requestedState,
      renderedState: states[requestedState] ? requestedState : fallbackState,
      stateConfig,
      usedFallback: !states[requestedState]
    };
  }

  function clearMount(mount) {
    while (mount.firstChild) {
      mount.firstChild.remove();
    }
  }

  function renderStaticPng(mount, resolved, options) {
    const image = document.createElement("img");
    image.className = "hero-animation-image";
    image.src = resolved.stateConfig.path;
    image.alt = options.alt || "";
    image.draggable = false;
    if (!options.alt) {
      image.setAttribute("aria-hidden", "true");
    }
    clearMount(mount);
    mount.append(image);
  }

  function renderSpriteSheet(mount, resolved, options) {
    const sheet = document.createElement("span");
    sheet.className = "hero-animation-sheet";
    sheet.setAttribute("role", options.alt ? "img" : "presentation");
    if (options.alt) sheet.setAttribute("aria-label", options.alt);
    sheet.style.backgroundImage = `url("${resolved.stateConfig.path}")`;
    sheet.style.setProperty("--frame-count", String(resolved.stateConfig.frames || 1));
    sheet.style.setProperty("--frame-index", String(resolved.stateConfig.frameIndex || 0));
    clearMount(mount);
    mount.append(sheet);
  }

  function renderLayeredPngRig(mount, resolved, options) {
    const rig = document.createElement("span");
    rig.className = "hero-animation-rig";
    rig.setAttribute("role", options.alt ? "img" : "presentation");
    if (options.alt) rig.setAttribute("aria-label", options.alt);
    for (const layer of resolved.stateConfig.layers || []) {
      const image = document.createElement("img");
      image.className = `hero-animation-layer hero-animation-layer-${layer.id || "asset"}`;
      image.src = layer.path;
      image.alt = "";
      image.draggable = false;
      image.setAttribute("aria-hidden", "true");
      rig.append(image);
    }
    clearMount(mount);
    mount.append(rig);
  }

  function renderUnavailableRuntime(mount, resolved, options) {
    const fallback = resolveState(resolved.character.id, resolved.requestedState, "static-png");
    if (fallback) {
      renderStaticPng(mount, fallback, options);
    }
  }

  function render(mount, options = {}) {
    if (!mount) return null;
    const characterId = options.characterId || mount.dataset.character || "bifly";
    const state = normalizeState(options.state || mount.dataset.state || "idle");
    const resolved = resolveState(characterId, state, options.adapterType);
    if (!resolved) return null;

    mount.dataset.character = characterId;
    mount.dataset.state = resolved.renderedState;
    mount.dataset.requestedState = resolved.requestedState;
    mount.dataset.adapterKind = resolved.adapterType;
    mount.dataset.fallback = resolved.usedFallback ? "true" : "false";

    if (resolved.adapterType === "sprite-sheet") {
      renderSpriteSheet(mount, resolved, options);
    } else if (resolved.adapterType === "layered-png-rig") {
      renderLayeredPngRig(mount, resolved, options);
    } else if (resolved.adapterType === "rive" || resolved.adapterType === "spine") {
      renderUnavailableRuntime(mount, resolved, options);
    } else {
      renderStaticPng(mount, resolved, options);
    }

    return resolved;
  }

  function getSupportedStates(characterId, type = "static-png") {
    const adapter = getAdapterConfig(characterId, type);
    return STATES.filter((state) => Boolean(adapter?.states?.[state]));
  }

  function getMissingStates(characterId, type = "static-png") {
    const supported = new Set(getSupportedStates(characterId, type));
    return STATES.filter((state) => !supported.has(state));
  }

  globalThis.KaflulCharacterAnimationAdapter = Object.freeze({
    STATES: Object.freeze([...STATES]),
    ADAPTER_TYPES: Object.freeze([...ADAPTER_TYPES]),
    TYPE_LABELS: Object.freeze({ ...TYPE_LABELS }),
    getCharacterConfig,
    getSupportedStates,
    getMissingStates,
    hasRuntimeSupport,
    resolveState,
    render
  });
})();
