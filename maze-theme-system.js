(() => {
  "use strict";

  const WORLD_IDS = ["ice", "lava", "ancient", "diamond"];

  const THEMES = {
    ice: {
      worldId: "ice",
      displayName: "Ice World",
      floorColors: ["#071b2d", "#0e3855", "#061627"],
      wallColors: ["#5ab9d3", "#c9f4ff", "#2b769a"],
      glowColors: ["#9ef7ff", "rgba(103, 215, 255, 0.12)", "rgba(158, 247, 255, 0.62)"],
      collectibleColors: {
        regular: "#e9fdff",
        bonus: "#9ef7ff"
      },
      portalColors: {
        primary: "#62e8ff",
        glow: "rgba(98, 232, 255, 0.58)"
      },
      decor: {
        style: "frosted ice spikes, frozen chips, snow dust",
        density: 0.06,
        preferredAnchors: ["wall-top", "outer-border"]
      },
      particles: {
        type: "snow",
        color: "rgba(217, 250, 255, 0.28)",
        density: 0.24
      },
      runtime: {}
    },
    lava: {
      worldId: "lava",
      displayName: "Lava World",
      floorColors: ["#171311", "#2b201b", "#100907"],
      wallColors: ["#2b2421", "#8f4630", "#17100d"],
      glowColors: ["#ff8a24", "rgba(255, 92, 22, 0.12)", "rgba(255, 122, 26, 0.62)"],
      collectibleColors: {
        regular: "#fff2cf",
        bonus: "#ff9f1c"
      },
      portalColors: {
        primary: "#ff7a1a",
        glow: "rgba(255, 122, 26, 0.62)"
      },
      decor: {
        style: "basalt chips, cooled lava cracks, ash marks",
        density: 0.05,
        preferredAnchors: ["wall-top", "outer-border"]
      },
      particles: {
        type: "embers",
        color: "rgba(255, 151, 69, 0.2)",
        density: 0.2
      },
      runtime: {}
    },
    ancient: {
      worldId: "ancient",
      displayName: "Ancient World",
      floorColors: ["#4d4128", "#786947", "#322815"],
      wallColors: ["#8b7040", "#dfc68d", "#5a4726"],
      glowColors: ["#29dcc6", "rgba(232, 195, 113, 0.08)", "rgba(41, 220, 198, 0.48)"],
      collectibleColors: {
        regular: "#ffe8a3",
        bonus: "#27e0c3"
      },
      portalColors: {
        primary: "#24dac1",
        glow: "rgba(39, 224, 195, 0.48)"
      },
      decor: {
        style: "carved tablets, moss flecks, broken stone fragments",
        density: 0.05,
        preferredAnchors: ["wall-top", "outer-border"]
      },
      particles: {
        type: "dust-motes",
        color: "rgba(244, 214, 154, 0.15)",
        density: 0.16
      },
      runtime: {}
    },
    diamond: {
      worldId: "diamond",
      displayName: "Diamond World",
      floorColors: ["#171d55", "#2c45a0", "#11143f"],
      wallColors: ["#684ed1", "#9df0ff", "#2f45b4"],
      glowColors: ["#55ffd6", "rgba(104, 226, 255, 0.1)", "rgba(104, 226, 255, 0.56)"],
      collectibleColors: {
        regular: "#f8ffff",
        bonus: "#ff5fd7"
      },
      portalColors: {
        primary: "#b96cff",
        glow: "rgba(185, 108, 255, 0.56)"
      },
      decor: {
        style: "small crystals, gem chips, prism fragments",
        density: 0.05,
        preferredAnchors: ["wall-top", "outer-border"]
      },
      particles: {
        type: "crystal-glints",
        color: "rgba(225, 247, 255, 0.2)",
        density: 0.18
      },
      runtime: {}
    }
  };

  function normalizeWorldId(worldId) {
    return WORLD_IDS.includes(worldId) ? worldId : "ice";
  }

  function getMazeTheme(worldId = "ice") {
    return THEMES[normalizeWorldId(worldId)];
  }

  function getAllMazeThemes() {
    return Object.fromEntries(WORLD_IDS.map((worldId) => [worldId, getMazeTheme(worldId)]));
  }

  function attachRuntimeThemes({ materials = {}, renderThemes = {}, autotileThemes = {}, sheets = {} } = {}) {
    for (const worldId of WORLD_IDS) {
      const theme = THEMES[worldId];
      theme.runtime = {
        material: materials[worldId] || null,
        renderTheme: renderThemes[worldId] || null,
        autotileTheme: autotileThemes[worldId] || null,
        sheet: sheets[worldId] || null
      };
    }
  }

  window.KaflulMazeThemeSystem = {
    worldIds: [...WORLD_IDS],
    getMazeTheme,
    getAllMazeThemes,
    attachRuntimeThemes
  };
})();
