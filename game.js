(() => {
  "use strict";

  const SYSTEMS = window.KaflulSystems;
  if (!SYSTEMS) {
    throw new Error("KaflulSystems failed to load");
  }

  const WIDTH = 960;
  const HEIGHT = 720;
  const TILE = 24;
  const COLS = WIDTH / TILE;
  const ROWS = HEIGHT / TILE;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MOBILE_RUNTIME = {
    coarse: false,
    mode: "desktop",
    zoom: 1,
    projectionWidth: WIDTH,
    projectionHeight: HEIGHT,
    phonePortrait: false,
    compactPortrait: false,
    visualProfileKey: "desktop",
    reducedEffects: false
  };
  const CAMERA = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    zoom: 1
  };
  const PLAYER_START = { x: Math.floor(COLS / 2), y: ROWS - 4 };
  const CENTER_CELL = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };

  const PLAYER_CHARACTERS = {
    bifly: {
      id: "bifly",
      name: "ביפלי",
      spriteSources: {
        idle: "assets/generated/bifly-expression-idle.png",
        eatPrepare: "assets/generated/bifly-expression-eat-prepare.png",
        eat: "assets/generated/bifly-expression-eat.png",
        hit: "assets/generated/bifly-expression-hit.png"
      },
      expressionSources: {
        idle: "assets/generated/bifly-expression-idle.png",
        blink: "assets/generated/bifly-expression-blink.png",
        tap: "assets/generated/bifly-expression-tap.png",
        selected: "assets/generated/bifly-expression-blink.png",
        eat: "assets/generated/bifly-expression-eat.png",
        hit: "assets/generated/bifly-expression-hit.png",
        victory: "assets/generated/bifly-expression-victory.png",
        defeat: "assets/generated/bifly-expression-hit.png"
      },
      renderScale: 2.55,
      eatAnimationDuration: 0.34,
      primaryColor: "#35c9b8",
      secondaryColor: "#0f776f",
      detailColor: "#ecfffc",
      trailColor: "53, 201, 184",
      glowColor: "rgba(53, 201, 184, 0.58)",
      motionAccent: "#ff5bd9"
    },
    nabatick: {
      id: "nabatick",
      name: "נבטיק",
      spriteSources: {
        idle: "assets/generated/nabatick-expression-idle.png",
        eatPrepare: "assets/generated/nabatick-expression-eat-prepare.png",
        eat: "assets/generated/nabatick-expression-eat.png",
        hit: "assets/generated/nabatick-expression-hit.png"
      },
      expressionSources: {
        idle: "assets/generated/nabatick-expression-idle.png",
        blink: "assets/generated/nabatick-expression-blink.png",
        tap: "assets/generated/nabatick-expression-tap.png",
        selected: "assets/generated/nabatick-expression-selected.png",
        eat: "assets/generated/nabatick-expression-eat.png",
        hit: "assets/generated/nabatick-expression-hit.png",
        victory: "assets/generated/nabatick-expression-victory.png",
        defeat: "assets/generated/nabatick-expression-hit.png"
      },
      renderScale: 2.65,
      eatAnimationDuration: 0.34,
      primaryColor: "#a9e629",
      secondaryColor: "#4f8c0c",
      detailColor: "#fff8cf",
      trailColor: "173, 230, 44",
      glowColor: "rgba(171, 240, 35, 0.62)",
      motionAccent: "#fff26a"
    }
  };

  const HERO_GALLERY_ORDER = ["bifly", "nabatick"];
  const HERO_GALLERY_COPY = {
    bifly: {
      description: "דמות זריזה ושמחה שמרגישה בבית בתוך מסלולי מבוך מהירים.",
      style: "זריז במבוך",
      assetNote: "תצוגת PNG עם סט פריימים חדש. מצבי idle, tap, eat, hit ו-victory זמינים."
    },
    nabatick: {
      description: "נבטיק רגוע וחד, קורא את המסלול ומחכה לרגע הנכון לברוח מיריבים.",
      style: "חד מול יריבים",
      assetNote: "תצוגת PNG עם סט פריימים חדש. מצבי idle, tap, eat, hit ו-victory זמינים."
    }
  };

  const CHARACTER_REACTIONS = {
    bifly: {
      idle: "מוכן לזוז!",
      tap: "קריצה קטנה וקדימה",
      selected: "ביפלי במבוך!",
      eat: "יאמי, עוד נקודה!",
      hit: "אני חוזר למסלול",
      victory: "עשינו את זה!",
      defeat: "סיבוב חדש ואני איתך"
    },
    nabatick: {
      idle: "אני קורא את המסלול",
      tap: "עלה קטן אומר שלום",
      selected: "נבטיק נכנס למבוך!",
      eat: "טעים וחכם",
      hit: "נושם וחוזר",
      victory: "ניצחנו בשקט",
      defeat: "נגדל מזה"
    }
  };

  const GAME_THEME = {
    title: "Math Maze",
    hebrewTitle: "מבוך הכפל",
    player: PLAYER_CHARACTERS.bifly,
    enemies: {
      spriteSources: {
        idle: "assets/dark-enemy.png",
        angry: "assets/dark-enemy-angry.png",
        surprised: "assets/dark-enemy-surprised.png",
        sad: "assets/dark-enemy-sad.png"
      },
      renderScale: 3.05,
      outlineColor: "rgba(255, 255, 255, 0.64)",
      detailColor: "rgba(255, 255, 255, 0.72)",
      palettes: [
        ["#7b68a6", "#628b72", "#8c7d5b", "#546b92", "#6f7f4f"],
        ["#786b98", "#6e835c", "#8d7761", "#536f78", "#71658a"],
        ["#7f7258", "#668075", "#776792", "#8a805f", "#5f7288"],
        ["#68598d", "#58786a", "#827252", "#586987", "#758158"]
      ]
    },
    collectibles: {
      regularShape: "diamond",
      bonusShape: "plus"
    }
  };

  const MAZE_MATERIALS = {
    ice: {
      floorStops: ["#103d66", "#1c6c96", "#0b2946"],
      floorBridge: "rgba(18, 70, 106, 0.98)",
      floorTile: "rgba(151, 232, 255, 0.26)",
      floorLine: "rgba(218, 252, 255, 0.48)",
      floorNode: "#dffcff",
      wallStops: ["#0b4b78", "#3bb8d4", "#a9f0ff"],
      wallSide: "rgba(8, 50, 86, 0.72)",
      wallCap: "rgba(190, 249, 255, 0.58)",
      wallStroke: "rgba(243, 255, 255, 0.72)",
      seam: "rgba(232, 255, 255, 0.72)",
      shadow: "rgba(0, 14, 28, 0.55)",
      accent: "#9ef7ff",
      accent2: "#3bd9ff",
      portal: "#62e8ff",
      decoration: "#dffcff"
    },
    lava: {
      floorStops: ["#201616", "#33201b", "#0c0505"],
      floorBridge: "rgba(27, 14, 12, 0.98)",
      floorTile: "rgba(255, 98, 24, 0.2)",
      floorLine: "rgba(255, 135, 40, 0.52)",
      floorNode: "#ffb340",
      wallStops: ["#171515", "#4a2a21", "#d95515"],
      wallSide: "rgba(38, 8, 4, 0.78)",
      wallCap: "rgba(255, 149, 43, 0.58)",
      wallStroke: "rgba(255, 218, 151, 0.62)",
      seam: "rgba(255, 111, 32, 0.84)",
      shadow: "rgba(0, 0, 0, 0.62)",
      accent: "#ff9b26",
      accent2: "#ff4e1f",
      portal: "#ff7a1a",
      decoration: "#ffd166"
    },
    ancient: {
      floorStops: ["#706044", "#9a865b", "#4f442d"],
      floorBridge: "rgba(106, 88, 56, 0.98)",
      floorTile: "rgba(244, 219, 165, 0.22)",
      floorLine: "rgba(249, 226, 176, 0.44)",
      floorNode: "#27e0c3",
      wallStops: ["#725d36", "#b99a5e", "#e0c891"],
      wallSide: "rgba(81, 62, 33, 0.72)",
      wallCap: "rgba(255, 238, 190, 0.52)",
      wallStroke: "rgba(255, 239, 199, 0.62)",
      seam: "rgba(39, 224, 195, 0.64)",
      shadow: "rgba(10, 8, 4, 0.55)",
      accent: "#27e0c3",
      accent2: "#e6c680",
      portal: "#24dac1",
      decoration: "#f0d69a"
    },
    diamond: {
      floorStops: ["#3e42a6", "#4e80da", "#2b205c"],
      floorBridge: "rgba(35, 42, 117, 0.98)",
      floorTile: "rgba(154, 239, 255, 0.24)",
      floorLine: "rgba(255, 133, 229, 0.48)",
      floorNode: "#f8ffff",
      wallStops: ["#4c44c4", "#63d8f4", "#d98cf0"],
      wallSide: "rgba(36, 26, 112, 0.72)",
      wallCap: "rgba(239, 255, 255, 0.52)",
      wallStroke: "rgba(255, 255, 255, 0.72)",
      seam: "rgba(255, 95, 215, 0.72)",
      shadow: "rgba(0, 0, 18, 0.58)",
      accent: "#55ffd6",
      accent2: "#ff5fd7",
      portal: "#b96cff",
      decoration: "#e6fbff"
    }
  };

  const MAZE_WORLD_RENDER_THEMES = {
    ice: {
      baseStops: ["#061725", "#0b304c", "#04101c"],
      pathTop: "#0a2b42",
      pathMid: "#0d334c",
      pathDeep: "#081f33",
      pathTextureAlpha: 0.07,
      pathAccentAlpha: 0.04,
      pathFacet: "rgba(177, 238, 255, 0.08)",
      pathLine: "rgba(214, 252, 255, 0.08)",
      contactShadow: "rgba(0, 13, 28, 0.48)",
      wallTop: "#8bdcec",
      wallTopLight: "#dcfbff",
      wallTopDeep: "#55bad4",
      wallSide: "rgba(6, 48, 82, 0.82)",
      wallShadow: "rgba(0, 10, 24, 0.54)",
      wallRim: "rgba(238, 255, 255, 0.82)",
      wallTextureAlpha: 0.14,
      wallFaceTextureAlpha: 0.2,
      crack: "rgba(244, 255, 255, 0.56)",
      glow: "rgba(111, 236, 255, 0.34)",
      ambient: "rgba(132, 235, 255, 0.18)",
      decor: "rgba(220, 253, 255, 0.68)",
      dust: "rgba(222, 252, 255, 0.22)",
      sideDepth: 7,
      bevel: 4.5,
      motif: "ice"
    },
    lava: {
      baseStops: ["#130807", "#241311", "#070303"],
      pathTop: "#211816",
      pathMid: "#2d1e1a",
      pathDeep: "#0d0706",
      pathTextureAlpha: 0.16,
      pathAccentAlpha: 0.05,
      pathFacet: "rgba(255, 132, 46, 0.08)",
      pathLine: "rgba(255, 159, 64, 0.12)",
      contactShadow: "rgba(0, 0, 0, 0.56)",
      wallTop: "#6f3021",
      wallTopLight: "#c95b2f",
      wallTopDeep: "#261614",
      wallSide: "rgba(22, 8, 5, 0.86)",
      wallShadow: "rgba(0, 0, 0, 0.64)",
      wallRim: "rgba(255, 179, 77, 0.58)",
      wallTextureAlpha: 0.26,
      wallFaceTextureAlpha: 0.24,
      crack: "rgba(255, 114, 31, 0.68)",
      glow: "rgba(255, 107, 31, 0.28)",
      ambient: "rgba(255, 112, 36, 0.14)",
      decor: "rgba(255, 183, 78, 0.54)",
      dust: "rgba(255, 159, 80, 0.18)",
      sideDepth: 7,
      bevel: 3.5,
      motif: "lava"
    },
    ancient: {
      baseStops: ["#211c12", "#41351f", "#120f09"],
      pathTop: "#6e6348",
      pathMid: "#7b6d4b",
      pathDeep: "#423722",
      pathTextureAlpha: 0.2,
      pathAccentAlpha: 0.06,
      pathFacet: "rgba(255, 231, 176, 0.11)",
      pathLine: "rgba(42, 224, 198, 0.12)",
      contactShadow: "rgba(18, 13, 7, 0.46)",
      wallTop: "#b99a5e",
      wallTopLight: "#ead39b",
      wallTopDeep: "#6f5a34",
      wallSide: "rgba(78, 58, 31, 0.78)",
      wallShadow: "rgba(8, 6, 3, 0.58)",
      wallRim: "rgba(255, 236, 184, 0.55)",
      wallTextureAlpha: 0.24,
      wallFaceTextureAlpha: 0.22,
      crack: "rgba(39, 224, 195, 0.32)",
      glow: "rgba(39, 224, 195, 0.17)",
      ambient: "rgba(230, 198, 128, 0.12)",
      decor: "rgba(39, 224, 195, 0.44)",
      dust: "rgba(255, 232, 180, 0.15)",
      sideDepth: 6,
      bevel: 3,
      motif: "ancient"
    },
    diamond: {
      baseStops: ["#0b1030", "#18205b", "#080817"],
      pathTop: "#243283",
      pathMid: "#2e4ca9",
      pathDeep: "#17194f",
      pathTextureAlpha: 0.18,
      pathAccentAlpha: 0.08,
      pathFacet: "rgba(166, 243, 255, 0.15)",
      pathLine: "rgba(255, 118, 225, 0.13)",
      contactShadow: "rgba(3, 5, 28, 0.5)",
      wallTop: "#77d6ee",
      wallTopLight: "#e6fbff",
      wallTopDeep: "#6b56dd",
      wallSide: "rgba(33, 27, 112, 0.82)",
      wallShadow: "rgba(1, 2, 20, 0.62)",
      wallRim: "rgba(255, 246, 255, 0.76)",
      wallTextureAlpha: 0.3,
      wallFaceTextureAlpha: 0.24,
      crack: "rgba(255, 116, 229, 0.42)",
      glow: "rgba(98, 229, 255, 0.24)",
      ambient: "rgba(176, 108, 255, 0.16)",
      decor: "rgba(255, 160, 239, 0.56)",
      dust: "rgba(230, 248, 255, 0.18)",
      sideDepth: 6,
      bevel: 4,
      motif: "diamond"
    }
  };

  const MAZE_TILE_ATLAS_SIZE = 72;
  const MAZE_TILE_KEYS = [
    "floor",
    "floorAlt",
    "wall",
    "wallAlt",
    "edgeN",
    "edgeE",
    "edgeS",
    "edgeW",
    "cornerNE",
    "cornerSE",
    "cornerSW",
    "cornerNW",
    "decorA",
    "decorB"
  ];
  const MAZE_PROCEDURAL_ART_VERSION = "next-level-pacman-arena-v1";
  const MAZE_OPTIONAL_TILESET_VERSION = "phase7-optional-tileset-v1";
  const MAZE_STATIC_BOARD_CACHE_VERSION = "multi-world-playful-maze-v1";
  const MAZE_SCATTER_DENSITY_SCALE = 1;
  const MAZE_VISUAL_PROFILES = {
    desktop: {
      key: "desktop",
      decorDensityScale: 1,
      scatterAlphaScale: 1,
      scatterShadowScale: 1,
      floorDetailStep: 1,
      floorDetailThresholdScale: 1,
      wallDetailStep: 1,
      wallDetailThresholdScale: 1,
      rimAlphaScale: 1,
      wallShadowScale: 1,
      glowScale: 1,
      textureAlphaScale: 1,
      ambientParticleScale: 1,
      ambientAlphaScale: 1,
      floorAltAlpha: 0.16,
      wallAltAlpha: 0.12,
      worldLightColumns: 7
    },
    phone: {
      key: "phone",
      decorDensityScale: 0.74,
      scatterAlphaScale: 0.72,
      scatterShadowScale: 0.62,
      floorDetailStep: 2,
      floorDetailThresholdScale: 0.68,
      wallDetailStep: 2,
      wallDetailThresholdScale: 0.62,
      rimAlphaScale: 0.78,
      wallShadowScale: 0.82,
      glowScale: 0.72,
      textureAlphaScale: 0.78,
      ambientParticleScale: 0.62,
      ambientAlphaScale: 0.74,
      floorAltAlpha: 0.1,
      wallAltAlpha: 0.08,
      worldLightColumns: 4
    },
    "compact-phone": {
      key: "compact-phone",
      decorDensityScale: 0.52,
      scatterAlphaScale: 0.56,
      scatterShadowScale: 0.42,
      floorDetailStep: 3,
      floorDetailThresholdScale: 0.48,
      wallDetailStep: 3,
      wallDetailThresholdScale: 0.44,
      rimAlphaScale: 0.64,
      wallShadowScale: 0.72,
      glowScale: 0.54,
      textureAlphaScale: 0.64,
      ambientParticleScale: 0.42,
      ambientAlphaScale: 0.58,
      floorAltAlpha: 0.07,
      wallAltAlpha: 0.05,
      worldLightColumns: 3
    },
    reduced: {
      key: "reduced",
      decorDensityScale: 0.38,
      scatterAlphaScale: 0.48,
      scatterShadowScale: 0,
      floorDetailStep: 4,
      floorDetailThresholdScale: 0.34,
      wallDetailStep: 4,
      wallDetailThresholdScale: 0.3,
      rimAlphaScale: 0.5,
      wallShadowScale: 0.62,
      glowScale: 0.42,
      textureAlphaScale: 0.52,
      ambientParticleScale: 0.28,
      ambientAlphaScale: 0.44,
      floorAltAlpha: 0.04,
      wallAltAlpha: 0.03,
      worldLightColumns: 2
    }
  };

  const MAZE_AUTOTILE_THEMES = {
    ice: {
      world: "ice",
      base: ["#041426", "#0d3657", "#020813"],
      floor: ["#062035", "#11496a", "#061827"],
      floorAlt: ["#0a2a45", "#176080", "#071b2c"],
      floorVein: "rgba(190, 245, 255, 0.3)",
      floorGlow: "rgba(112, 230, 255, 0.18)",
      wall: ["#47b4d2", "#e5fbff", "#2d82a7"],
      wallAlt: ["#3aa3c0", "#bcf5ff", "#237193"],
      wallSide: "#0d3d5b",
      wallShadow: "rgba(0, 8, 20, 0.66)",
      rim: "rgba(240, 255, 255, 0.82)",
      innerShadow: "rgba(0, 10, 28, 0.58)",
      accent: "#9ef3ff",
      decor: "#dffbff",
      particle: "rgba(217, 250, 255, 0.3)",
      hazardWash: "rgba(123, 224, 255, 0.075)",
      motif: "ice"
    },
    lava: {
      world: "lava",
      base: ["#120403", "#2f1009", "#060101"],
      floor: ["#1a1411", "#35231c", "#0f0907"],
      floorAlt: ["#231714", "#443029", "#130806"],
      floorVein: "rgba(255, 118, 35, 0.3)",
      floorGlow: "rgba(255, 86, 18, 0.17)",
      wall: ["#2a211c", "#b05131", "#120b08"],
      wallAlt: ["#221a17", "#853926", "#0f0706"],
      wallSide: "#140605",
      wallShadow: "rgba(0, 0, 0, 0.72)",
      rim: "rgba(255, 184, 82, 0.66)",
      innerShadow: "rgba(0, 0, 0, 0.62)",
      accent: "#ff7a1f",
      decor: "#ffd17a",
      particle: "rgba(255, 151, 69, 0.22)",
      hazardWash: "rgba(255, 75, 18, 0.08)",
      motif: "lava"
    },
    ancient: {
      world: "ancient",
      base: ["#171006", "#4b391f", "#090604"],
      floor: ["#4c3e25", "#89744b", "#302513"],
      floorAlt: ["#5a4a2d", "#9a8152", "#3a2b16"],
      floorVein: "rgba(45, 226, 200, 0.24)",
      floorGlow: "rgba(232, 195, 113, 0.12)",
      wall: ["#87673b", "#edd596", "#574020"],
      wallAlt: ["#765b33", "#cdb276", "#47351c"],
      wallSide: "#342511",
      wallShadow: "rgba(9, 5, 1, 0.64)",
      rim: "rgba(255, 239, 190, 0.66)",
      innerShadow: "rgba(22, 14, 5, 0.56)",
      accent: "#29dcc6",
      decor: "#f1d28e",
      particle: "rgba(244, 214, 154, 0.17)",
      hazardWash: "rgba(41, 220, 198, 0.055)",
      motif: "ancient"
    },
    diamond: {
      world: "diamond",
      base: ["#080721", "#2a2f79", "#050511"],
      floor: ["#171b57", "#3352b2", "#10133d"],
      floorAlt: ["#202871", "#4168cf", "#15164a"],
      floorVein: "rgba(255, 116, 229, 0.28)",
      floorGlow: "rgba(104, 226, 255, 0.16)",
      wall: ["#6b52d6", "#b4f8ff", "#3149bf"],
      wallAlt: ["#5844bd", "#88e8ff", "#263796"],
      wallSide: "#201968",
      wallShadow: "rgba(0, 0, 22, 0.72)",
      rim: "rgba(245, 252, 255, 0.8)",
      innerShadow: "rgba(2, 5, 32, 0.58)",
      accent: "#ff70df",
      decor: "#e8fbff",
      particle: "rgba(225, 247, 255, 0.23)",
      hazardWash: "rgba(178, 112, 255, 0.075)",
      motif: "diamond"
    }
  };

  const MAZE_WORLD_SHEETS = {
    ice: {
      src: "assets/reference/maze-worlds/world_ice.png",
      preview: { x: 14, y: 62, w: 334, h: 282 },
      collectible: { x: 24, y: 635, w: 42, h: 44 },
      bonusCollectible: { x: 65, y: 635, w: 42, h: 44 },
      portal: { x: 284, y: 363, w: 60, h: 116 },
      floorTexture: { x: 22, y: 530, w: 142, h: 75 },
      floorAccentTexture: { x: 190, y: 530, w: 146, h: 75 },
      wallTexture: { x: 77, y: 386, w: 112, h: 48 },
      wallFaceTexture: { x: 77, y: 418, w: 112, h: 34 },
      decorSprites: [
        { id: "decor-a", x: 20, y: 719, w: 74, h: 94 },
        { id: "decor-b", x: 96, y: 719, w: 76, h: 94 },
        { id: "decor-c", x: 176, y: 719, w: 74, h: 94 },
        { id: "decor-d", x: 255, y: 719, w: 84, h: 94 }
      ],
      obstacleSprites: [
        { id: "obstacle-a", x: 20, y: 867, w: 76, h: 76 },
        { id: "obstacle-b", x: 103, y: 867, w: 86, h: 76 },
        { id: "obstacle-c", x: 197, y: 867, w: 68, h: 76 },
        { id: "obstacle-d", x: 271, y: 867, w: 70, h: 76 }
      ],
      decor: { x: 20, y: 705, w: 324, h: 128 },
      border: { x: 20, y: 846, w: 324, h: 112 },
      palette: { x: 20, y: 976, w: 324, h: 82 }
    },
    lava: {
      src: "assets/reference/maze-worlds/world_lava.png",
      preview: { x: 14, y: 62, w: 334, h: 282 },
      collectible: { x: 24, y: 635, w: 42, h: 44 },
      bonusCollectible: { x: 65, y: 635, w: 42, h: 44 },
      portal: { x: 286, y: 363, w: 58, h: 116 },
      floorTexture: { x: 22, y: 530, w: 142, h: 75 },
      floorAccentTexture: { x: 190, y: 530, w: 146, h: 75 },
      wallTexture: { x: 77, y: 386, w: 112, h: 48 },
      wallFaceTexture: { x: 77, y: 418, w: 112, h: 34 },
      decorSprites: [
        { id: "decor-a", x: 20, y: 719, w: 74, h: 94 },
        { id: "decor-b", x: 96, y: 719, w: 76, h: 94 },
        { id: "decor-c", x: 176, y: 719, w: 74, h: 94 },
        { id: "decor-d", x: 255, y: 719, w: 84, h: 94 }
      ],
      obstacleSprites: [
        { id: "obstacle-a", x: 20, y: 867, w: 76, h: 76 },
        { id: "obstacle-b", x: 103, y: 867, w: 86, h: 76 },
        { id: "obstacle-c", x: 197, y: 867, w: 68, h: 76 },
        { id: "obstacle-d", x: 271, y: 867, w: 70, h: 76 }
      ],
      decor: { x: 20, y: 705, w: 324, h: 128 },
      border: { x: 20, y: 846, w: 324, h: 112 },
      palette: { x: 20, y: 976, w: 324, h: 82 }
    },
    ancient: {
      src: "assets/reference/maze-worlds/world_ancient.png",
      preview: { x: 14, y: 62, w: 334, h: 282 },
      collectible: { x: 24, y: 635, w: 42, h: 44 },
      bonusCollectible: { x: 65, y: 635, w: 42, h: 44 },
      portal: { x: 282, y: 363, w: 64, h: 116 },
      floorTexture: { x: 22, y: 530, w: 142, h: 75 },
      floorAccentTexture: { x: 190, y: 530, w: 146, h: 75 },
      wallTexture: { x: 77, y: 386, w: 112, h: 48 },
      wallFaceTexture: { x: 77, y: 418, w: 112, h: 34 },
      decorSprites: [
        { id: "decor-a", x: 20, y: 719, w: 74, h: 94 },
        { id: "decor-b", x: 96, y: 719, w: 76, h: 94 },
        { id: "decor-c", x: 176, y: 719, w: 74, h: 94 },
        { id: "decor-d", x: 255, y: 719, w: 84, h: 94 }
      ],
      obstacleSprites: [
        { id: "obstacle-a", x: 20, y: 867, w: 76, h: 76 },
        { id: "obstacle-b", x: 103, y: 867, w: 86, h: 76 },
        { id: "obstacle-c", x: 197, y: 867, w: 68, h: 76 },
        { id: "obstacle-d", x: 271, y: 867, w: 70, h: 76 }
      ],
      decor: { x: 20, y: 705, w: 324, h: 128 },
      border: { x: 20, y: 846, w: 324, h: 112 },
      palette: { x: 20, y: 976, w: 324, h: 82 }
    },
    diamond: {
      src: "assets/reference/maze-worlds/world_diamond.png",
      preview: { x: 14, y: 62, w: 334, h: 282 },
      collectible: { x: 24, y: 635, w: 42, h: 44 },
      bonusCollectible: { x: 65, y: 635, w: 42, h: 44 },
      portal: { x: 282, y: 363, w: 64, h: 116 },
      floorTexture: { x: 22, y: 530, w: 142, h: 75 },
      floorAccentTexture: { x: 190, y: 530, w: 146, h: 75 },
      wallTexture: { x: 77, y: 386, w: 112, h: 48 },
      wallFaceTexture: { x: 77, y: 418, w: 112, h: 34 },
      decorSprites: [
        { id: "decor-a", x: 20, y: 719, w: 74, h: 94 },
        { id: "decor-b", x: 96, y: 719, w: 76, h: 94 },
        { id: "decor-c", x: 176, y: 719, w: 74, h: 94 },
        { id: "decor-d", x: 255, y: 719, w: 84, h: 94 }
      ],
      obstacleSprites: [
        { id: "obstacle-a", x: 20, y: 867, w: 76, h: 76 },
        { id: "obstacle-b", x: 103, y: 867, w: 86, h: 76 },
        { id: "obstacle-c", x: 197, y: 867, w: 68, h: 76 },
        { id: "obstacle-d", x: 271, y: 867, w: 70, h: 76 }
      ],
      decor: { x: 20, y: 705, w: 324, h: 128 },
      border: { x: 20, y: 846, w: 324, h: 112 },
      palette: { x: 20, y: 976, w: 324, h: 82 }
    }
  };

  // Future production maze tilesets should live at:
  // assets/maze/{world}/tileset.png and optional assets/maze/{world}/tileset.json.
  // Missing PNG/JSON files are expected during development and must fall back to
  // the procedural renderer without changing gameplay.
  const MAZE_OPTIONAL_TILESETS = Object.fromEntries(["ice", "lava", "ancient", "diamond"].map((worldKey) => [
    worldKey,
    {
      mode: "procedural",
      imageSrc: `assets/maze/${worldKey}/tileset.png`,
      metadataSrc: `assets/maze/${worldKey}/tileset.json`
    }
  ]));

  const MAZE_TILESET_EXTRA_ROLES = ["collectible", "bonusCollectible", "portal"];
  const MAZE_TILESET_ROLE_ALIASES = {
    floor: ["floor", "floorTile", "floorBase", "floor-base", "floor tile"],
    floorAlt: ["floorAlt", "floorAccent", "floorVariant", "floorVariant01", "floor-variant-01", "floor alt"],
    wall: ["wall", "wallTile", "wallTop", "wall-top", "wall tile"],
    wallAlt: ["wallAlt", "wallSide", "wallVariant", "wall-side", "wall alt"],
    edgeN: ["edgeN", "wallEdgeN", "wall-edge-n", "edge-n"],
    edgeE: ["edgeE", "wallEdgeE", "wall-edge-e", "edge-e"],
    edgeS: ["edgeS", "wallEdgeS", "wall-edge-s", "edge-s"],
    edgeW: ["edgeW", "wallEdgeW", "wall-edge-w", "edge-w"],
    cornerNE: ["cornerNE", "corner-ne", "cornerTopRight", "corner-top-right"],
    cornerSE: ["cornerSE", "corner-se", "cornerBottomRight", "corner-bottom-right"],
    cornerSW: ["cornerSW", "corner-sw", "cornerBottomLeft", "corner-bottom-left"],
    cornerNW: ["cornerNW", "corner-nw", "cornerTopLeft", "corner-top-left"],
    decorA: ["decorA", "decor01", "decor-01", "decor"],
    decorB: ["decorB", "decor02", "decor-02"],
    collectible: ["collectible", "collectibleTile", "collectible-tile"],
    bonusCollectible: ["bonusCollectible", "collectibleBonus", "collectible-bonus", "bonus-collectible"],
    portal: ["portal", "portalTile", "portal-tile", "gate", "gateTile"]
  };
  const MAZE_THEME_SYSTEM = window.KaflulMazeThemeSystem || null;
  const MAZE_DECOR_SYSTEM = window.KaflulMazeDecorSystem || null;
  MAZE_THEME_SYSTEM?.attachRuntimeThemes?.({
    materials: MAZE_MATERIALS,
    renderThemes: MAZE_WORLD_RENDER_THEMES,
    autotileThemes: MAZE_AUTOTILE_THEMES,
    sheets: MAZE_WORLD_SHEETS
  });

  const BOSS_ACTOR_SHEET = {
    src: "assets/bosses/boss-actor-direction-sheet.png",
    cellSize: 256,
    directionColumns: {
      down: 0,
      right: 1,
      left: 2,
      up: 3
    }
  };

  const BOSS_CONFIG = {
    stage1: {
      id: "magma-bastion",
      name: "לבת-הר",
      title: "בוס שלב 1",
      sheetSource: "assets/bosses/stage-1-boss-sprite.png",
      sourceRect: { x: 0, y: 0, width: 410, height: 360 },
      actor: {
        row: 0,
        size: 126,
        footColor: "#ffb13f",
        motionColor: "#ff6d1a",
        coreColor: "#ffd166"
      },
      accent: "#ff7a1a",
      glow: "rgba(255, 95, 20, 0.82)",
      eyeColor: "#ffd166",
      width: 148,
      height: 112,
      collisionRadius: 24,
      speedMultiplier: 0.64,
      spriteBlendMode: "multiply",
      overlayDetails: false
    },
    stage2: {
      id: "frostmaw",
      name: "שן-הקרחון",
      title: "בוס שלב 2",
      sheetSource: "assets/bosses/stage-2-boss-sprite.png",
      sourceRect: { x: 0, y: 0, width: 380, height: 600 },
      actor: {
        row: 1,
        size: 122,
        footColor: "#bdf9ff",
        motionColor: "#69e7ff",
        coreColor: "#e8fdff"
      },
      accent: "#9ef7ff",
      glow: "rgba(104, 225, 244, 0.78)",
      eyeColor: "#69e7ff",
      width: 124,
      height: 148,
      collisionRadius: 23,
      speedMultiplier: 0.76,
      spriteBlendMode: "multiply",
      overlayDetails: false
    },
    stage3: {
      id: "mire-tyrant",
      name: "מלך-הביצה",
      title: "בוס שלב 3",
      sheetSource: "assets/bosses/stage-3-boss-sprite.png",
      sourceRect: { x: 0, y: 0, width: 430, height: 430 },
      actor: {
        row: 2,
        size: 128,
        footColor: "#d6bd78",
        motionColor: "#9bd846",
        coreColor: "#67d98e"
      },
      accent: "#9bd846",
      glow: "rgba(155, 216, 70, 0.74)",
      eyeColor: "#ffe66d",
      width: 154,
      height: 126,
      collisionRadius: 25,
      speedMultiplier: 0.68,
      spriteBlendMode: "multiply",
      overlayDetails: false
    },
    stage4: {
      id: "eclipse-monarch",
      name: "כתר-הליקוי",
      title: "בוס שלב 4",
      sheetSource: "assets/bosses/stage-4-boss-sprite.png",
      sourceRect: { x: 0, y: 0, width: 340, height: 620 },
      actor: {
        row: 3,
        size: 124,
        footColor: "#d7c8ff",
        motionColor: "#a66bff",
        coreColor: "#ff5fd7"
      },
      accent: "#a66bff",
      glow: "rgba(166, 107, 255, 0.8)",
      eyeColor: "#ff5fd7",
      width: 124,
      height: 152,
      collisionRadius: 23,
      speedMultiplier: 0.78,
      spriteBlendMode: "multiply",
      overlayDetails: false
    }
  };

  const GAME_ASSETS = {
    players: Object.fromEntries(Object.keys(PLAYER_CHARACTERS).map((characterId) => [
      characterId,
      {
        idle: new Image(),
        eatPrepare: new Image(),
        eat: new Image(),
        hit: new Image()
      }
    ])),
    enemies: {
      idle: new Image(),
      angry: new Image(),
      surprised: new Image(),
      sad: new Image()
    },
    bosses: Object.fromEntries(Object.entries(BOSS_CONFIG).map(([bossKey]) => [bossKey, new Image()])),
    bossActorSheet: new Image(),
    mazeWorlds: Object.fromEntries(Object.entries(MAZE_WORLD_SHEETS).map(([worldKey]) => [worldKey, new Image()])),
    arcadeChest: {
      closed: new Image(),
      open: new Image(),
      closedRight: new Image(),
      openRight: new Image()
    }
  };
  const mazeWorldSpriteCache = new Map();
  const mazeTileAtlasCache = new Map();
  const mazeStaticBoardCache = new Map();
  const mazeOptionalTilesetCache = new Map();
  const bossSpriteCutoutCache = new Map();
  for (const [characterId, characterAssets] of Object.entries(GAME_ASSETS.players)) {
    const characterTheme = PLAYER_CHARACTERS[characterId];
    for (const [name, image] of Object.entries(characterAssets)) {
      image.decoding = "async";
      image.src = characterTheme.spriteSources[name];
    }
  }
  const CHARACTER_EXPRESSION_ASSETS = Object.fromEntries(Object.entries(PLAYER_CHARACTERS).map(([characterId, character]) => {
    return [
      characterId,
      Object.fromEntries(Object.entries(character.expressionSources || {}).map(([name, src]) => {
        const image = new Image();
        image.decoding = "async";
        image.src = src;
        return [name, image];
      }))
    ];
  }));
  for (const [name, image] of Object.entries(GAME_ASSETS.enemies)) {
    image.decoding = "async";
    image.src = GAME_THEME.enemies.spriteSources[name];
  }
  for (const [bossKey, image] of Object.entries(GAME_ASSETS.bosses)) {
    image.decoding = "async";
    image.src = BOSS_CONFIG[bossKey].sheetSource;
  }
  GAME_ASSETS.bossActorSheet.decoding = "async";
  GAME_ASSETS.bossActorSheet.src = BOSS_ACTOR_SHEET.src;
  for (const [worldKey, image] of Object.entries(GAME_ASSETS.mazeWorlds)) {
    image.decoding = "async";
    image.src = MAZE_WORLD_SHEETS[worldKey].src;
  }
  GAME_ASSETS.arcadeChest.closed.decoding = "async";
  GAME_ASSETS.arcadeChest.closed.src = "assets/generated/arcade-chest-closed-v1.png";
  GAME_ASSETS.arcadeChest.open.decoding = "async";
  GAME_ASSETS.arcadeChest.open.src = "assets/generated/arcade-chest-open-v1.png";
  GAME_ASSETS.arcadeChest.closedRight.decoding = "async";
  GAME_ASSETS.arcadeChest.closedRight.src = "assets/generated/arcade-chest-closed-right-v1.png";
  GAME_ASSETS.arcadeChest.openRight.decoding = "async";
  GAME_ASSETS.arcadeChest.openRight.src = "assets/generated/arcade-chest-open-right-v1.png";

  const CONFIG = {
    targetCorrect: 100,
    answersPerLevel: 25,
    initialLives: 3,
    minEnemies: 10,
    missionBonus: 420,
    adaptiveQuestionChance: 0.3,
    recentQuestionMemory: 3,
    questionTimeLimit: 25,
    questionFeedbackDelay: {
      correct: 900,
      wrong: 1300
    },
    rewardPower: {
      durationSeconds: 10,
      scoreValue: 160
    },
    arcadeBonus: {
      letters: ["כ", "פ", "ל"],
      keysRequired: 3,
      letterScoreValue: 80,
      keyScoreValue: 120,
      chestScoreValue: 650,
      chestShieldSeconds: 12
    },
    speed: {
      player: 184,
      enemyBase: 108,
      enemyTierEveryAnswers: 6,
      enemyTierStep: 3,
      enemyTierMax: 42,
      enemyIndexStep: 5
    },
    storageKeys: {
      save: SYSTEMS.SAVE_KEY,
      bestScore: "mathMazeBest",
      sound: "mathMazeSound",
      difficulty: "mathMazeDifficulty",
      character: "mathMazeCharacter",
      mode: "mathMazeMode",
      nickname: "mathMazeNickname",
      playerId: "mathMazePlayerId",
      controlMode: "mathMazeControlMode",
      timeLimit: "mathMazeTimeLimit",
      language: "mathMazeLanguage",
      factStats: "mathMazeFactStats"
    },
    legacyStorageKeys: {
      bestScore: "mathPacmanBest",
      sound: "mathPacmanSound",
      difficulty: "mathPacmanDifficulty",
      timeLimit: "mathPacmanTimeLimit",
      factStats: "mathPacmanFactStats"
    },
    iconSprite: "ui/icons.svg",
    difficulty: SYSTEMS.DIFFICULTIES,
    levels: [
      {
        name: "עולם הקרח",
        shortName: "קרח",
        intro: "שלב 1: עולם הקרח",
        bossKey: "stage1",
        enemyVisualStyle: "ice",
        decor: "snow",
        enemyCountBonus: 0,
        enemySpeedMultiplier: 1,
        wallStops: ["#10385f", "#1fb9d4", "#b8f7ff"],
        backgroundStops: ["#04101b", "#082337", "#020914"],
        gridColor: "rgba(170, 244, 255, 0.065)",
        wallGlow: "rgba(104, 225, 244, 0.52)",
        wallStroke: "rgba(232, 253, 255, 0.32)",
        collectibleColor: "#e9fdff",
        bonusCollectibleColor: "#9ef7ff",
        accent: "#9ef7ff",
        decorRgb: "224, 253, 255",
        hazard: {
          type: "ice-slick",
          label: "משטח קרח",
          warning: "קרח חלק במבוך!",
          activeText: "נזהרים מהקרח",
          duration: 22,
          telegraph: 1.6,
          intervalMin: 18,
          intervalMax: 30,
          color: "#9ef7ff",
          hitText: "הקרח הקפיא אותנו"
        },
        enemyColors: GAME_THEME.enemies.palettes[0]
      },
      {
        name: "עולם הלבה",
        shortName: "לבה",
        intro: "שלב 2: עולם הלבה",
        bossKey: "stage2",
        enemyVisualStyle: "lava",
        decor: "embers",
        enemyCountBonus: 1,
        enemySpeedMultiplier: 1.08,
        wallStops: ["#7f1d14", "#f97316", "#ffd166"],
        backgroundStops: ["#160506", "#3a0d09", "#090305"],
        gridColor: "rgba(255, 145, 77, 0.1)",
        wallGlow: "rgba(255, 111, 55, 0.78)",
        wallStroke: "rgba(255, 231, 170, 0.34)",
        collectibleColor: "#fff2cf",
        bonusCollectibleColor: "#ff9f1c",
        accent: "#ffb340",
        decorRgb: "255, 144, 66",
        hazard: {
          type: "lava-spill",
          label: "שפך לבה",
          warning: "לבה עולה במסלול!",
          activeText: "זהירות לבה",
          duration: 30,
          telegraph: 1.8,
          intervalMin: 16,
          intervalMax: 28,
          color: "#ff7a1a",
          hitText: "נכנסנו ללבה"
        },
        enemyColors: GAME_THEME.enemies.palettes[1]
      },
      {
        name: "עולם העתיקות",
        shortName: "עתיקות",
        intro: "שלב 3: עולם העתיקות",
        bossKey: "stage3",
        enemyVisualStyle: "ancient",
        decor: "runes",
        enemyCountBonus: 2,
        enemySpeedMultiplier: 1.16,
        wallStops: ["#6b5734", "#c2a36a", "#1fb6a6"],
        backgroundStops: ["#100d08", "#241b0e", "#071714"],
        gridColor: "rgba(230, 198, 128, 0.09)",
        wallGlow: "rgba(230, 198, 128, 0.58)",
        wallStroke: "rgba(255, 240, 196, 0.3)",
        collectibleColor: "#ffe8a3",
        bonusCollectibleColor: "#27e0c3",
        accent: "#27e0c3",
        decorRgb: "230, 198, 128",
        hazard: {
          type: "rune-trap",
          label: "מלכודת רונים",
          warning: "הרונים נדלקים!",
          activeText: "רונים פעילים",
          duration: 24,
          telegraph: 1.7,
          intervalMin: 17,
          intervalMax: 29,
          color: "#27e0c3",
          hitText: "הרונים פגעו בנו"
        },
        enemyColors: GAME_THEME.enemies.palettes[2]
      },
      {
        name: "עולם היהלומים",
        shortName: "יהלומים",
        intro: "שלב 4: עולם היהלומים",
        bossKey: "stage4",
        enemyVisualStyle: "diamond",
        decor: "diamonds",
        enemyCountBonus: 3,
        enemySpeedMultiplier: 1.25,
        wallStops: ["#1836a3", "#55ffd6", "#ff5fd7"],
        backgroundStops: ["#050817", "#101b45", "#070611"],
        gridColor: "rgba(122, 255, 231, 0.1)",
        wallGlow: "rgba(85, 255, 214, 0.7)",
        wallStroke: "rgba(255, 255, 255, 0.36)",
        collectibleColor: "#f8ffff",
        bonusCollectibleColor: "#ff5fd7",
        accent: "#55ffd6",
        decorRgb: "143, 255, 239",
        hazard: {
          type: "crystal-burst",
          label: "שברי יהלום",
          warning: "יהלומים מתפוצצים במסלול!",
          activeText: "שברי יהלום",
          duration: 24,
          telegraph: 1.5,
          intervalMin: 15,
          intervalMax: 27,
          color: "#55ffd6",
          hitText: "שברי היהלום פגעו בנו"
        },
        enemyColors: GAME_THEME.enemies.palettes[3]
      }
    ],
    missions: [
      { type: "correct", target: 10, label: "ענה נכון על 10 שאלות", labelEn: "Answer 10 questions correctly" },
      { type: "combo", target: 5, label: "צבור רצף של 5", labelEn: "Build a streak of 5" },
      { type: "score", target: 200, label: "אסוף 200 נקודות", labelEn: "Collect 200 points" },
      { type: "safeCorrect", target: 3, label: "ענה נכון על 3 שאלות בלי לאבד חיים", labelEn: "Answer 3 questions without losing a life" },
      { type: "enemies", target: 5, label: "נצח 5 יריבים", labelEn: "Defeat 5 enemies" }
    ],
    positiveFeedback: [
      "נכון מאוד!",
      "כל הכבוד!",
      "איזה יופי!",
      "מעולה, פתרת נכון!",
      "בול!",
      "יפה מאוד!",
      "עבודה מצוינת!"
    ],
    supportFeedback: [
      "לא נורא, מטעויות לומדים",
      "יפה שניסית, ממשיכים",
      "זה בסדר לטעות",
      "עוד תרגול קטן וזה יושב",
      "כל ניסיון עוזר להתקדם",
      "הכול בסדר, ננסה שוב"
    ],
    leaderboard: {
      endpoint: "/api/champions",
      limit: 50,
      minimumCorrectAnswers: 25,
      requestTimeoutMs: 6000
    }
  };

  const LANGUAGE_COPY = {
    he: {
      lang: "he",
      dir: "rtl",
      documentTitle: "כפלול | משחק לוח הכפל",
      appLabel: "כפלול, משחק לוח הכפל",
      loadingLabel: "כפלול נטען",
      loadingTitle: "מכינים את המבוך...",
      loadingSubtitle: "רגע קטן ומתחילים",
      loadingProgress: "טעינת המשחק",
      loadingNote: "כמעט מוכנים",
      defaultNickname: "אלוף כפלול",
      characters: {
        bifly: "ביפלי",
        nabatick: "נבטיק"
      },
      modes: {
        arcade: {
          label: "מצב ארקייד",
          shortLabel: "ארקייד",
          rule: "ארקייד: הישרדות בגלים עם שיא מקומי וקצב שעולה בהדרגה.",
          description: "הישרדות תחרותית, מרדף אחרי ניקוד וטבלת שיאים.",
          meta: "גלים · שיאים · קצב עולה"
        },
        adventure: {
          label: "מצב הרפתקה",
          shortLabel: "הרפתקה",
          rule: "הרפתקה: מסלול של 100 תשובות דרך ארבעת העולמות.",
          description: "שלבים מסודרים, התקדמות והשלמת עולמות.",
          meta: "100 תשובות · עולמות · מסלול ברור"
        }
      },
      difficulties: {
        beginner: { label: "מתחילים", description: "4 חיים, 30 שניות, מרדף רגוע ורמזים." },
        normal: { label: "רגיל", description: "3 חיים, 25 שניות, איזון טוב לאימון יומי." },
        advanced: { label: "מתקדם", description: "3 חיים, 20 שניות, אויבים מהירים יותר." },
        expert: { label: "מומחה", description: "2 חיים, 16 שניות, שאלות מורכבות ומרדף חד." },
        legendary: { label: "אגדי", description: "1 חיים, 12 שניות, אתגר קצה לשיאים גדולים." }
      },
      levels: {
        ice: "עולם הקרח",
        lava: "עולם הלבה",
        ancient: "עולם העתיקות",
        diamond: "עולם היהלומים"
      },
      static: {
        player: "שחקן",
        personalBest: "שיא אישי",
        openProgress: "פתח התקדמות ושיא אישי",
        actions: "פעולות",
        leaderboardHall: "היכל אלופי כפלול",
        categoryBest: "שיא בקטגוריה:",
        noRank: "עוד אין דירוג בקטגוריה הזאת.",
        openLeaderboard: "פתח היכל אלופי כפלול",
        soundTitle: "צלילים",
        openSettings: "פתח הגדרות",
        settingsTitleAttr: "הגדרות",
        logoLabel: "כפלול, מבוך הכפל",
        heroLabel: "בחירת גיבור וסביבת מבוך",
        characterChoice: "בחירת דמות",
        worldsLabel: "עולמות קיימים",
        playNow: "שחק עכשיו",
        startGame: "התחל משחק",
        mainNav: "ניווט ראשי",
        navGame: "משחק",
        navCharacters: "דמויות",
        navProgress: "התקדמות",
        navChampions: "אלופים",
        pregameClose: "סגור סקירה לפני משחק",
        pregameKicker: "לפני שנכנסים למבוך",
        pregameTitle: "סיכום משחק",
        pregameChoices: "בחירות המשחק",
        character: "דמות",
        mode: "מצב",
        difficulty: "קושי",
        scoreMultiplier: "מכפיל ניקוד",
        importantRule: "כלל חשוב",
        modeClose: "סגור בחירת מצב",
        modeKicker: "קצב המשחק",
        modeTitle: "בחרו מצב משחק",
        modeCopy: "שני המצבים משתמשים באותו מבוך כפל, אבל המטרה והלחץ שונים.",
        modeLegend: "בחרו את החוויה שמתאימה לסיבוב הקרוב",
        difficultyClose: "סגור בחירת קושי",
        difficultyKicker: "כמה חזק המרדף?",
        difficultyTitle: "בחרו רמת קושי",
        difficultyCopy: "הקושי משפיע על זמן לתרגיל, חיים, מהירות אויבים ומכפיל ניקוד.",
        difficultyLegend: "מוצגים רק ההבדלים החשובים לשחקן",
        settingsClose: "סגור הגדרות",
        settingsKicker: "פרופיל מקומי",
        settingsTitle: "הגדרות שחקן",
        settingsCopy: "הכינוי והצלילים נשמרים על המכשיר הזה.",
        nickname: "כינוי השחקן",
        nicknamePlaceholder: "אלוף כפלול",
        game: "משחק",
        openCharacterGallery: "פתיחת גלריית דמויות",
        pregameReview: "סקירה לפני משחק",
        language: "שפה",
        languageChoice: "בחירת שפה",
        hebrew: "עברית",
        english: "English",
        controlMode: "שליטה במשחק",
        swipe: "החלקה",
        joystick: "ג׳ויסטיק",
        saveNickname: "שמור כינוי",
        progressClose: "סגור התקדמות",
        progressKicker: "נתונים שמורים בלבד",
        progressTitle: "התקדמות",
        progressCopy: "מוצגים רק שיאים ופתיחות שקיימים בשמירה המקומית.",
        unlockedDifficulties: "רמות פתוחות",
        currentCategoryBest: "שיא בקטגוריה הנוכחית",
        hudScore: "ניקוד",
        hudCombo: "רצף",
        hudLives: "חיים",
        hudMission: "משימה",
        hudProgress: "התקדמות גל או שלב",
        pauseSafe: "הפסקה בטוחה",
        pauseTitle: "המשחק מושהה",
        gameStatePaused: "מצב המשחק בזמן ההשהיה",
        mission: "משימה",
        pauseProgress: "התקדמות",
        resume: "המשך",
        retry: "התחלה מחדש",
        backToMenu: "חזרה לתפריט",
        pauseSettings: "הגדרות",
        pauseNickname: "כינוי",
        save: "שמור",
        boardLabel: "לוח המשחק",
        questionCaught: "יריב נתפס",
        timer: "זמן",
        answer: "תשובה",
        submit: "שלח"
      },
      runtime: {
        wave: "גל",
        stage: "שלב",
        outOf: "מתוך",
        secondsPerQuestion: "שניות לכל תרגיל",
        lives: "חיים",
        noTimeLimit: "ללא זמן",
        arcadeSeconds: "שניות בארקייד",
        missionComing: "משימה חדשה בדרך",
        missionAria: "משימה: {label}, {progress} מתוך {target}",
        progressAria: "{stage}: {value} מתוך {target}",
        newWave: "גל חדש",
        missionPlus: "משימה +",
        missionReset: "משימה אופסה",
        combo: "רצף",
        lifeMinus: "חיים-",
        lifePlus: "+חיים",
        unlocked: "פתוח",
        lockedLegendary: "נעול: סיימו הרפתקה במומחה או הגיעו ל-75,000 נקודות בארקייד מומחה",
        noSavedScores: "עוד אין שיאים שמורים.",
        progressDetail: "שלב/גל {stage} · דיוק {accuracy}% · רצף {combo}",
        noCategoryRank: "עוד אין שיאים בקטגוריה הזאת.",
        saveRoundForRank: "שחק סיבוב כדי לשמור את השיא בטבלה המקומית.",
        firstRoundRank: "הסיבוב הראשון שלך יפתח דירוג חדש.",
        categoryLeader: "אתה מוביל את הקטגוריה הזאת.",
        pointsToRank: "חסרות {points} נקודות למקום {rank}",
        soundOn: "צלילים פועלים",
        soundOff: "צלילים כבויים",
        sound: "צלילים",
        quiet: "שקט",
        pause: "השהיה",
        resumeGame: "המשך משחק",
        scoreBreakdown: {
          gameplay: "נקודות משחק",
          math: "נקודות מתמטיקה",
          speed: "בונוס מהירות",
          enemy: "ניצחון על יריבים",
          mission: "משימות",
          completion: "השלמת שלב או גל",
          lives: "חיים שנשארו",
          noHit: "בונוס ללא פגיעה",
          accuracy: "בונוס דיוק",
          time: "בונוס זמן",
          difficulty: "מכפיל קושי",
          combo: "תרומת רצף"
        },
        question: {
          bossSuffix: "ליבת הקרח",
          rewardStatus: "פתית כוח · שאלת בונוס",
          transitionStatus: "שאלת מעבר 25",
          enemyStatus: "רוח תפסה אותך · ענה כדי לברוח",
          correctMark: "כן",
          correctDefault: "פתרת נכון, הדרך נפתחה!",
          wrongDefault: "התשובה הנכונה כאן, וממשיכים לשאלה הבאה",
          correctAnswer: "התשובה הנכונה",
          rewardWon: "הפרס שלך!",
          rewardWrongTitle: "לא נורא, ננסה שוב",
          rewardWrong: "הפרס יחזור בהמשך",
          wrongNote: "עכשיו רואים את התשובה הנכונה",
          timeoutTitle: "נגמר הזמן",
          timeoutNote: "לא נורא, עכשיו רואים את התשובה וממשיכים",
          rewardTimeoutTitle: "לא הספקנו הפעם",
          rewardTimeoutNote: "לא נורא, תהיה עוד הזדמנות"
        },
        positiveFeedback: [
          "נכון מאוד!",
          "כל הכבוד!",
          "איזה יופי!",
          "מעולה, פתרת נכון!",
          "בול!",
          "יפה מאוד!",
          "עבודה מצוינת!"
        ],
        supportFeedback: [
          "לא נורא, מטעויות לומדים",
          "יפה שניסית, ממשיכים",
          "זה בסדר לטעות",
          "עוד תרגול קטן וזה יושב",
          "כל ניסיון עוזר להתקדם",
          "הכול בסדר, ננסה שוב"
        ]
      }
    },
    en: {
      lang: "en",
      dir: "ltr",
      documentTitle: "Kaflul | Multiplication Maze",
      appLabel: "Kaflul, a multiplication maze game",
      loadingLabel: "Kaflul is loading",
      loadingTitle: "Preparing the maze...",
      loadingSubtitle: "Almost ready",
      loadingProgress: "Game loading",
      loadingNote: "Getting ready",
      defaultNickname: "Kaflul Champion",
      characters: {
        bifly: "Bifly",
        nabatick: "Nabatik"
      },
      modes: {
        arcade: {
          label: "Arcade Mode",
          shortLabel: "Arcade",
          rule: "Arcade: survive waves, chase your best score, and keep the pace rising.",
          description: "Competitive survival, score chasing, and local leaderboards.",
          meta: "Waves · Scores · Faster pace"
        },
        adventure: {
          label: "Adventure Mode",
          shortLabel: "Adventure",
          rule: "Adventure: answer 100 questions across the four worlds.",
          description: "Structured stages, world progress, and a clear route.",
          meta: "100 answers · Worlds · Clear path"
        }
      },
      difficulties: {
        beginner: { label: "Beginner", description: "4 lives, 30 seconds, calmer chase, and hints." },
        normal: { label: "Normal", description: "3 lives, 25 seconds, balanced for daily practice." },
        advanced: { label: "Advanced", description: "3 lives, 20 seconds, faster enemies." },
        expert: { label: "Expert", description: "2 lives, 16 seconds, sharper chase and harder facts." },
        legendary: { label: "Legendary", description: "1 life, 12 seconds, a high-score challenge." }
      },
      levels: {
        ice: "Ice World",
        lava: "Lava World",
        ancient: "Ancient World",
        diamond: "Diamond World"
      },
      static: {
        player: "Player",
        personalBest: "Personal Best",
        openProgress: "Open progress and personal best",
        actions: "Actions",
        leaderboardHall: "Kaflul Champions",
        categoryBest: "Category best:",
        noRank: "No scores in this category yet.",
        openLeaderboard: "Open Kaflul Champions",
        soundTitle: "Sound",
        openSettings: "Open settings",
        settingsTitleAttr: "Settings",
        logoLabel: "Kaflul, Multiplication Maze",
        heroLabel: "Choose a hero and maze world",
        characterChoice: "Choose a character",
        worldsLabel: "Available worlds",
        playNow: "Play Now",
        startGame: "Start Game",
        mainNav: "Main navigation",
        navGame: "Game",
        navCharacters: "Characters",
        navProgress: "Progress",
        navChampions: "Champions",
        pregameClose: "Close pre-game summary",
        pregameKicker: "Before entering the maze",
        pregameTitle: "Game Summary",
        pregameChoices: "Game choices",
        character: "Character",
        mode: "Mode",
        difficulty: "Difficulty",
        scoreMultiplier: "Score multiplier",
        importantRule: "Important rule",
        modeClose: "Close mode selection",
        modeKicker: "Game pace",
        modeTitle: "Choose Game Mode",
        modeCopy: "Both modes use the same multiplication maze, but the goal and pressure are different.",
        modeLegend: "Choose the experience for this round",
        difficultyClose: "Close difficulty selection",
        difficultyKicker: "How intense is the chase?",
        difficultyTitle: "Choose Difficulty",
        difficultyCopy: "Difficulty changes question time, lives, enemy speed, and score multiplier.",
        difficultyLegend: "Only the important gameplay differences are shown",
        settingsClose: "Close settings",
        settingsKicker: "Local profile",
        settingsTitle: "Player Settings",
        settingsCopy: "Your nickname and sound preference are saved on this device.",
        nickname: "Player nickname",
        nicknamePlaceholder: "Kaflul Champion",
        game: "Game",
        openCharacterGallery: "Open character gallery",
        pregameReview: "Pre-game summary",
        language: "Language",
        languageChoice: "Choose language",
        hebrew: "עברית",
        english: "English",
        controlMode: "Game control",
        swipe: "Swipe",
        joystick: "Joystick",
        saveNickname: "Save Nickname",
        progressClose: "Close progress",
        progressKicker: "Local data only",
        progressTitle: "Progress",
        progressCopy: "Only local saved scores and unlocks are shown here.",
        unlockedDifficulties: "Unlocked levels",
        currentCategoryBest: "Best in current category",
        hudScore: "Score",
        hudCombo: "Streak",
        hudLives: "Lives",
        hudMission: "Mission",
        hudProgress: "Wave or stage progress",
        pauseSafe: "Safe pause",
        pauseTitle: "Game Paused",
        gameStatePaused: "Game state while paused",
        mission: "Mission",
        pauseProgress: "Progress",
        resume: "Resume",
        retry: "Restart",
        backToMenu: "Back to Menu",
        pauseSettings: "Settings",
        pauseNickname: "Nickname",
        save: "Save",
        boardLabel: "Game board",
        questionCaught: "Enemy caught you",
        timer: "Time",
        answer: "Answer",
        submit: "Submit"
      },
      runtime: {
        wave: "Wave",
        stage: "Stage",
        outOf: "of",
        secondsPerQuestion: "seconds per question",
        lives: "lives",
        noTimeLimit: "No time limit",
        arcadeSeconds: "seconds in Arcade",
        missionComing: "New mission coming",
        missionAria: "Mission: {label}, {progress} of {target}",
        progressAria: "{stage}: {value} of {target}",
        newWave: "New wave",
        missionPlus: "Mission +",
        missionReset: "Mission reset",
        combo: "Streak",
        lifeMinus: "-Life",
        lifePlus: "+Life",
        unlocked: "Unlocked",
        lockedLegendary: "Locked: finish Adventure on Expert or reach 75,000 points in Expert Arcade",
        noSavedScores: "No saved scores yet.",
        progressDetail: "Stage/wave {stage} · Accuracy {accuracy}% · Streak {combo}",
        noCategoryRank: "No scores in this category yet.",
        saveRoundForRank: "Play a round to save your score to the local board.",
        firstRoundRank: "Your first round will open a new ranking.",
        categoryLeader: "You lead this category.",
        pointsToRank: "{points} points to rank {rank}",
        soundOn: "Sound on",
        soundOff: "Sound off",
        sound: "Sound",
        quiet: "Muted",
        pause: "Pause",
        resumeGame: "Resume game",
        scoreBreakdown: {
          gameplay: "Gameplay points",
          math: "Math points",
          speed: "Speed bonus",
          enemy: "Enemy wins",
          mission: "Missions",
          completion: "Stage or wave completion",
          lives: "Lives remaining",
          noHit: "No-hit bonus",
          accuracy: "Accuracy bonus",
          time: "Time bonus",
          difficulty: "Difficulty multiplier",
          combo: "Streak contribution"
        },
        question: {
          bossSuffix: "Ice core",
          rewardStatus: "Power flake · Bonus question",
          transitionStatus: "Gate question 25",
          enemyStatus: "A ghost caught you · Answer to escape",
          correctMark: "Yes",
          correctDefault: "Correct, the path is open!",
          wrongDefault: "Here is the correct answer, then we keep going",
          correctAnswer: "Correct answer",
          rewardWon: "Your reward!",
          rewardWrongTitle: "No problem, try again",
          rewardWrong: "The reward will return later",
          wrongNote: "Now you can see the correct answer",
          timeoutTitle: "Time is up",
          timeoutNote: "No problem, now we see the answer and keep going",
          rewardTimeoutTitle: "Not this time",
          rewardTimeoutNote: "No problem, there will be another chance"
        },
        positiveFeedback: [
          "Correct!",
          "Great job!",
          "Nice work!",
          "Excellent answer!",
          "You got it!",
          "Beautifully done!",
          "Strong thinking!"
        ],
        supportFeedback: [
          "No problem, mistakes help us learn",
          "Good try, keep going",
          "It is okay to miss one",
          "A little more practice and it will click",
          "Every try helps you move forward",
          "All good, let us try the next one"
        ]
      }
    }
  };

  const DIRS = {
    none: { x: 0, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  const DIR_NAMES = ["up", "down", "left", "right"];
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left", none: "none" };
  const INPUT_BUFFER_SECONDS = 0.7;
  const TURN_LOOKAHEAD = 7.5;
  const TURN_SNAP_DISTANCE = 8.5;
  const JOYSTICK_DEADZONE = 12;
  const NON_EASY_FACTORS = [3, 4, 5, 6, 7, 8, 9];
  const LEGACY_DIFFICULTY_MAP = {
    easy: "beginner",
    medium: "normal",
    hard: "advanced",
    veryHard: "expert",
    impossible: "expert"
  };
  const LTR_ISOLATE_START = "\u2066";
  const LTR_ISOLATE_END = "\u2069";
  const KEY_TO_DIR = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
    8: "up",
    2: "down",
    4: "left",
    6: "right",
    7: "up",
    9: "up",
    1: "down",
    3: "down"
  };

  const ENEMY_COLORS = GAME_THEME.enemies.palettes[0];

  const AMBUSH_CELLS = [
    { x: 8, y: 2 },
    { x: 2, y: 8 },
    { x: 11, y: 6 },
    { x: 29, y: 6 },
    { x: 8, y: 18 },
    { x: 31, y: 18 }
  ];

  const canvas = document.getElementById("game-canvas");
  let ctx = canvas.getContext("2d");
  const stage = document.querySelector(".stage");

  const els = {
    correct: document.getElementById("correct-answers"),
    targetCorrect: document.getElementById("target-correct"),
    hudStageLabel: document.getElementById("hud-progress-stage"),
    score: document.getElementById("score"),
    combo: document.getElementById("combo"),
    lives: document.getElementById("lives"),
    progress: document.getElementById("progress-fill"),
    progressWrap: document.querySelector(".progress-wrap"),
    missionCard: document.getElementById("mission-card"),
    missionTitle: document.getElementById("mission-title"),
    missionProgress: document.getElementById("mission-progress"),
    pause: document.getElementById("pause-button"),
    sound: document.getElementById("sound-button"),
    menuSound: document.getElementById("menu-sound-button"),
    startScreen: document.getElementById("start-screen"),
    playerForm: document.getElementById("player-form"),
    playerNameInput: document.getElementById("player-name-input"),
    modeInputs: Array.from(document.querySelectorAll("input[name='game-mode']")),
    characterInputs: Array.from(document.querySelectorAll("input[name='character']")),
    homeCharacterCards: Array.from(document.querySelectorAll("#start-screen .menu-character")),
    difficultyInputs: Array.from(document.querySelectorAll("input[name='difficulty']")),
    timeLimitToggle: document.getElementById("time-limit-toggle"),
    timeLimitState: document.getElementById("time-limit-state"),
    nameError: document.getElementById("name-error"),
    startButton: document.getElementById("start-button"),
    bestScore: document.getElementById("best-score"),
    selectedModeLabel: document.getElementById("selected-mode-label"),
    selectedDifficultyLabel: document.getElementById("selected-difficulty-label"),
    selectedCharacterLabel: document.getElementById("selected-character-label"),
    menuSelectionSummary: document.getElementById("menu-selection-summary"),
    menuRankValue: document.getElementById("menu-rank-value"),
    menuPersonalBest: document.getElementById("menu-personal-best"),
    menuNextRank: document.getElementById("menu-next-rank"),
    playerGreeting: document.getElementById("player-greeting"),
    modeControlButton: document.getElementById("mode-control-button"),
    difficultyControlButton: document.getElementById("difficulty-control-button"),
    characterControlButton: document.getElementById("character-control-button"),
    profileControlButton: document.getElementById("profile-control-button"),
    pregameOpenButton: document.getElementById("pregame-open-button"),
    menuSettingsButton: document.getElementById("menu-settings-button"),
    menuLeaderboardLink: document.getElementById("menu-leaderboard-link"),
    homeDifficultyButton: document.getElementById("home-difficulty-button"),
    homeModeButton: document.getElementById("home-mode-button"),
    homeDifficultyLabel: document.getElementById("home-difficulty-label"),
    homeModeLabel: document.getElementById("home-mode-label"),
    homeProgressButton: document.getElementById("home-progress-button"),
    homeProgressCard: document.querySelector(".home-progress-card"),
    homeNavButtons: Array.from(document.querySelectorAll(".home-nav-button")),
    homeNavGame: document.getElementById("home-nav-game"),
    homeNavCharacters: document.getElementById("home-nav-characters"),
    homeNavProgress: document.getElementById("home-nav-progress"),
    homeNavChampions: document.getElementById("home-nav-champions"),
    heroGallery: document.getElementById("hero-gallery"),
    heroGalleryBack: document.getElementById("hero-gallery-back"),
    heroGalleryHome: document.getElementById("hero-gallery-home"),
    heroGalleryPrev: document.getElementById("hero-gallery-prev"),
    heroGalleryNext: document.getElementById("hero-gallery-next"),
    heroGalleryStage: document.getElementById("hero-gallery-stage"),
    heroGalleryCard: document.querySelector(".hero-gallery-card"),
    heroGalleryArtButton: document.getElementById("hero-gallery-art-button"),
    heroAnimationMount: document.getElementById("hero-animation-mount"),
    heroGalleryName: document.getElementById("hero-gallery-name"),
    heroGalleryDescription: document.getElementById("hero-gallery-description"),
    heroGalleryStyle: document.getElementById("hero-gallery-style"),
    heroGalleryBest: document.getElementById("hero-gallery-best"),
    heroGalleryStatus: document.getElementById("hero-gallery-status"),
    heroGalleryAssetNote: document.getElementById("hero-gallery-asset-note"),
    heroGallerySelect: document.getElementById("hero-gallery-select"),
    heroGallerySelectLabel: document.getElementById("hero-gallery-select-label"),
    pregamePanel: document.getElementById("pregame-panel"),
    pregameCharacterButton: document.getElementById("pregame-character-button"),
    pregameModeButton: document.getElementById("pregame-mode-button"),
    pregameDifficultyButton: document.getElementById("pregame-difficulty-button"),
    pregameStartButton: document.getElementById("pregame-start-button"),
    pregameCharacterLabel: document.getElementById("pregame-character-label"),
    pregameModeLabel: document.getElementById("pregame-mode-label"),
    pregameDifficultyLabel: document.getElementById("pregame-difficulty-label"),
    pregameMultiplierLabel: document.getElementById("pregame-multiplier-label"),
    pregameRuleCopy: document.getElementById("pregame-rule-copy"),
    pregameImportantRule: document.getElementById("pregame-important-rule"),
    modePanel: document.getElementById("mode-panel"),
    difficultyPanel: document.getElementById("difficulty-panel"),
    settingsPanel: document.getElementById("settings-panel"),
    settingsSoundButton: document.getElementById("settings-sound-button"),
    settingsSoundLabel: document.getElementById("settings-sound-label"),
    settingsSelectionSummary: document.getElementById("settings-selection-summary"),
    settingsSaveButton: document.getElementById("settings-save-button"),
    controlModeInputs: Array.from(document.querySelectorAll("input[name='control-mode']")),
    languageInputs: Array.from(document.querySelectorAll("input[name='language']")),
    progressPanel: document.getElementById("progress-panel"),
    progressUnlockedDifficulties: document.getElementById("progress-unlocked-difficulties"),
    progressCurrentBest: document.getElementById("progress-current-best"),
    progressBestList: document.getElementById("progress-best-list"),
    menuSheets: Array.from(document.querySelectorAll(".menu-sheet")),
    panelCloseButtons: Array.from(document.querySelectorAll("[data-close-panel]")),
    pauseScreen: document.getElementById("pause-screen"),
    pauseSummary: document.getElementById("pause-summary"),
    pauseMissionTitle: document.getElementById("pause-mission-title"),
    pauseMissionProgress: document.getElementById("pause-mission-progress"),
    pauseResumeButton: document.getElementById("pause-resume-button"),
    pauseRetryButton: document.getElementById("pause-retry-button"),
    pauseSoundButton: document.getElementById("pause-sound-button"),
    pauseSoundLabel: document.getElementById("pause-sound-label"),
    pauseMenuButton: document.getElementById("pause-menu-button"),
    pauseNameInput: document.getElementById("pause-player-name-input"),
    pauseSaveNameButton: document.getElementById("pause-save-name-button"),
    endScreen: document.getElementById("end-screen"),
    victoryConfetti: document.querySelector("#end-screen .victory-confetti"),
    winnerTrophy: document.getElementById("winner-trophy"),
    trophyEngravedName: document.getElementById("trophy-engraved-name"),
    trophyShareButton: document.getElementById("trophy-share-button"),
    trophyShareStatus: document.getElementById("trophy-share-status"),
    newRecordBadge: document.getElementById("new-record-badge"),
    endKicker: document.getElementById("end-kicker"),
    endTitle: document.getElementById("end-title"),
    endCopy: document.getElementById("end-copy"),
    finalScore: document.getElementById("final-score"),
    previousBest: document.getElementById("previous-best"),
    leaderboardRank: document.getElementById("leaderboard-rank"),
    nextRankScore: document.getElementById("next-rank-score"),
    resultMode: document.getElementById("result-mode"),
    resultDifficulty: document.getElementById("result-difficulty"),
    resultStageLabel: document.getElementById("result-stage-label"),
    resultStage: document.getElementById("result-stage"),
    finalCorrect: document.getElementById("final-correct"),
    finalIncorrect: document.getElementById("final-incorrect"),
    finalAccuracy: document.getElementById("final-accuracy"),
    averageAnswerTime: document.getElementById("average-answer-time"),
    maxCombo: document.getElementById("max-combo"),
    remainingLives: document.getElementById("remaining-lives"),
    scoreBreakdownList: document.getElementById("score-breakdown-list"),
    retryButton: document.getElementById("retry-button"),
    restartButton: document.getElementById("restart-button"),
    questionDialog: document.getElementById("question-dialog"),
    questionStatus: document.getElementById("question-status"),
    questionTimer: document.getElementById("question-timer"),
    questionTime: document.getElementById("question-time"),
    questionTitle: document.getElementById("question-title"),
    answerForm: document.getElementById("answer-form"),
    answerInput: document.getElementById("answer-input"),
    submitAnswer: document.getElementById("submit-answer"),
    questionFeedback: document.getElementById("question-feedback"),
    joystick: document.getElementById("movement-joystick"),
    joystickKnob: document.querySelector(".joystick-knob"),
    leaderboardOpen: document.getElementById("leaderboard-open"),
    leaderboardDialog: document.getElementById("leaderboard-dialog"),
    leaderboardClose: document.getElementById("leaderboard-close"),
    leaderboardList: document.getElementById("leaderboard-list"),
    leaderboardStatus: document.getElementById("leaderboard-status"),
    leaderboardEmptyState: document.getElementById("leaderboard-empty-state"),
    leaderboardErrorState: document.getElementById("leaderboard-error-state"),
    leaderboardRefresh: document.getElementById("leaderboard-refresh"),
    leaderboardModeFilter: document.getElementById("leaderboard-mode-filter"),
    leaderboardDifficultyFilter: document.getElementById("leaderboard-difficulty-filter"),
    leaderboardCopy: document.getElementById("leaderboard-copy"),
    leaderboardPublicChip: document.getElementById("leaderboard-public-chip"),
    endLeaderboardButton: document.getElementById("end-leaderboard-button"),
    publishScorePanel: document.getElementById("publish-score-panel"),
    publishScoreTitle: document.getElementById("publish-score-title"),
    publishScoreCopy: document.getElementById("publish-score-copy"),
    publishScoreButton: document.getElementById("publish-score-button"),
    publishScoreStatus: document.getElementById("publish-score-status")
  };

  const numberFormat = new Intl.NumberFormat("he-IL");

  const storage = {
    get(key, fallback) {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Storage can be unavailable in some private browser contexts.
      }
    },
    getMigrated(key, legacyKey, fallback) {
      const current = this.get(key, null);
      if (current !== null) {
        return current;
      }

      const legacy = this.get(legacyKey, null);
      if (legacy !== null) {
        this.set(key, legacy);
        return legacy;
      }

      return fallback;
    }
  };

  const localSave = SYSTEMS.loadSave(window.localStorage, { key: CONFIG.storageKeys.save });

  function createPlayerId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function getOrCreatePlayerId() {
    const storedId = storage.get(CONFIG.storageKeys.playerId, "");
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storedId)) {
      return storedId;
    }

    const playerId = createPlayerId();
    storage.set(CONFIG.storageKeys.playerId, playerId);
    return playerId;
  }

  function normalizeDifficulty(value) {
    return SYSTEMS.normalizeDifficulty(LEGACY_DIFFICULTY_MAP[value] || value);
  }

  function normalizeGameMode(value) {
    return SYSTEMS.normalizeGameMode(value);
  }

  function normalizeCharacterId(value) {
    return Object.prototype.hasOwnProperty.call(PLAYER_CHARACTERS, value) ? value : "bifly";
  }

  function normalizeControlMode(value) {
    return value === "joystick" ? "joystick" : "swipe";
  }

  function normalizeLanguage(value) {
    return value === "en" ? "en" : "he";
  }

  function getPlayerTheme() {
    return PLAYER_CHARACTERS[state.characterId] || PLAYER_CHARACTERS.bifly;
  }

  function getPlayerAssets() {
    return GAME_ASSETS.players[state.characterId] || GAME_ASSETS.players.bifly;
  }

  function getPlayerExpressionAssets() {
    return CHARACTER_EXPRESSION_ASSETS[state.characterId] || CHARACTER_EXPRESSION_ASSETS.bifly || {};
  }

  function getDifficultySettings() {
    return CONFIG.difficulty[state.difficulty] || CONFIG.difficulty.normal;
  }

  function getModeSettings() {
    return SYSTEMS.GAME_MODES[state.mode] || SYSTEMS.GAME_MODES.arcade;
  }

  function getPersonalBestForSelection(mode = state.mode, difficulty = state.difficulty) {
    const localBest = SYSTEMS.getPersonalBest(state.save, mode, difficulty);
    return Math.max(localBest, Number(storage.getMigrated(
      CONFIG.storageKeys.bestScore,
      CONFIG.legacyStorageKeys.bestScore,
      "0"
    )) || 0);
  }

  function getLevelIndexForAnswers(correctAnswers) {
    const levelIndex = Math.floor(correctAnswers / CONFIG.answersPerLevel);
    if (state?.mode === "arcade") {
      return levelIndex % CONFIG.levels.length;
    }
    return clamp(levelIndex, 0, CONFIG.levels.length - 1);
  }

  function getCurrentLevel() {
    return CONFIG.levels[state.levelIndex] || CONFIG.levels[0];
  }

  function getUiCopy(language = state.language) {
    return LANGUAGE_COPY[normalizeLanguage(language)] || LANGUAGE_COPY.he;
  }

  function nestedCopy(source, path) {
    return String(path).split(".").reduce((value, key) => value?.[key], source);
  }

  function uiStatic(key, fallback = "") {
    return getUiCopy().static[key] ?? LANGUAGE_COPY.he.static[key] ?? fallback;
  }

  function uiRuntime(path, fallback = "") {
    return nestedCopy(getUiCopy().runtime, path)
      ?? nestedCopy(LANGUAGE_COPY.he.runtime, path)
      ?? fallback;
  }

  function formatTemplate(template, values = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => {
      return values[key] === undefined ? "" : String(values[key]);
    });
  }

  function setText(selector, text, root = document) {
    const element = root.querySelector?.(selector);
    if (element) {
      element.textContent = text;
    }
  }

  function setAttr(selector, name, value, root = document) {
    const element = root.querySelector?.(selector);
    if (element) {
      element.setAttribute(name, value);
    }
  }

  function setButtonLabel(button, text) {
    if (!button) {
      return;
    }

    const textNode = Array.from(button.childNodes).find((node) => node.nodeType === 3);
    if (textNode) {
      textNode.textContent = ` ${text}`;
      return;
    }

    button.append(document.createTextNode(text));
  }

  function replaceLabelWithStrong(container, label, strongElement) {
    if (!container || !strongElement) {
      return;
    }

    container.replaceChildren(document.createTextNode(`${label} `), strongElement);
  }

  function modeCopy(modeId = state.mode) {
    const normalized = normalizeGameMode(modeId);
    return getUiCopy().modes[normalized] || LANGUAGE_COPY.he.modes[normalized] || LANGUAGE_COPY.he.modes.arcade;
  }

  function difficultyCopy(difficultyId = state.difficulty) {
    const normalized = normalizeDifficulty(difficultyId);
    return getUiCopy().difficulties[normalized]
      || LANGUAGE_COPY.he.difficulties[normalized]
      || LANGUAGE_COPY.he.difficulties.normal;
  }

  function levelLabel(level = getCurrentLevel()) {
    const key = level?.bossKey === "stage1"
      ? "ice"
      : level?.bossKey === "stage2"
        ? "lava"
        : level?.bossKey === "stage3"
          ? "ancient"
          : level?.bossKey === "stage4"
            ? "diamond"
            : "";
    return getUiCopy().levels[key] || level?.name || LANGUAGE_COPY.he.levels.ice;
  }

  function missionLabel(mission = state.mission) {
    if (!mission) {
      return uiRuntime("missionComing");
    }
    if (state.language === "en" && mission.labelEn) {
      return mission.labelEn;
    }
    return mission.label || mission.labelEn || uiRuntime("missionComing");
  }

  function updateMetricLabel(metricName, label) {
    const metric = document.querySelector(`[data-hud-metric="${metricName}"]`);
    if (!metric) {
      return;
    }
    metric.setAttribute("aria-label", label);
    setText(".metric-label", label, metric);
  }

  function updateModeOptionCopy() {
    for (const input of els.modeInputs) {
      const copy = modeCopy(input.value);
      const label = input.closest("label");
      if (!label) {
        continue;
      }
      setText("strong", copy.shortLabel, label);
      setText("small", copy.description, label);
      setText("em", copy.meta, label);
    }
  }

  function updateDifficultyOptionCopy() {
    for (const input of els.difficultyInputs) {
      const difficulty = getDifficultySettingsForId(input.value);
      const copy = difficultyCopy(input.value);
      const label = input.closest("label");
      if (!label) {
        continue;
      }
      setText("strong", copy.label, label);
      setText("em", scoreMultiplierLabel(difficulty), label);
      const copyNodes = Array.from(label.querySelectorAll("small:not(.difficulty-lock-copy)"));
      if (copyNodes[0]) {
        copyNodes[0].textContent = copy.description;
      }
    }
  }

  function getDifficultySettingsForId(difficultyId) {
    return CONFIG.difficulty[normalizeDifficulty(difficultyId)] || CONFIG.difficulty.normal;
  }

  function applyLanguageCopy() {
    const copy = getUiCopy();
    const text = copy.static;
    const runtime = copy.runtime;
    const root = document.documentElement;

    root.lang = copy.lang;
    root.dir = copy.dir;
    root.dataset.language = state.language;
    document.title = copy.documentTitle;
    setAttr("main.game-shell", "aria-label", copy.appLabel);
    setAttr("#app-loading-screen", "aria-label", copy.loadingLabel);
    setText("#app-loading-screen .loading-copy strong", copy.loadingTitle);
    setText("#app-loading-screen .loading-copy span", copy.loadingSubtitle);
    setAttr("#app-loading-screen .loading-progress", "aria-label", copy.loadingProgress);
    setText("#app-loading-screen .loading-note", copy.loadingNote);

    setAttr(".hud", "aria-label", text.hudProgress);
    updateMetricLabel("score", text.hudScore);
    updateMetricLabel("combo", text.hudCombo);
    updateMetricLabel("lives", text.hudLives);
    updateMetricLabel("progress", text.hudProgress);
    updateMetricLabel("mission", text.hudMission);
    setAttr(".progress-wrap", "aria-label", text.hudProgress);
    setAttr(".stage", "aria-label", text.boardLabel);
    setText("#question-status", text.questionCaught);
    setText("#question-timer span", text.timer);
    setAttr("#answer-input", "aria-label", text.answer);
    setText("#submit-answer", text.submit);

    setAttr("#start-screen", "aria-label", copy.appLabel);
    setAttr("#start-screen .menu-actions", "aria-label", text.actions);
    setAttr("#leaderboard-open", "aria-label", text.openLeaderboard);
    setAttr("#leaderboard-open", "title", text.leaderboardHall);
    setAttr("#menu-settings-button", "aria-label", text.openSettings);
    setAttr("#menu-settings-button", "title", text.settingsTitleAttr);
    setAttr(".menu-logo", "aria-label", text.logoLabel);
    setAttr(".menu-hero", "aria-label", text.heroLabel);
    setAttr(".character-options", "aria-label", text.characterChoice);
    for (const card of els.homeCharacterCards) {
      const input = card.querySelector("input[name='character']");
      const badge = card.querySelector(".character-name-badge");
      if (input && badge) {
        badge.textContent = characterLabel(input.value);
      }
    }
    setAttr(".world-ribbon", "aria-label", text.worldsLabel);
    const worldLabels = [copy.levels.ice, copy.levels.lava, copy.levels.ancient, copy.levels.diamond];
    Array.from(document.querySelectorAll(".world-ribbon span")).forEach((item, index) => {
      item.textContent = worldLabels[index] || item.textContent;
    });
    setAttr(".home-player-card", "aria-label", text.player);
    setText(".home-player-card .home-mini-label", text.player);
    setAttr(".menu-best-card", "aria-label", text.openProgress);
    setText(".menu-best-card .menu-best-copy span", text.personalBest);
    setAttr(".home-progress-card", "aria-label", text.leaderboardHall);
    setText(".home-progress-card .menu-panel-title", text.leaderboardHall);
    replaceLabelWithStrong(
      document.querySelector(".home-progress-card > span:not(.home-side-icon):not(.menu-panel-title)"),
      text.categoryBest,
      els.menuPersonalBest
    );
    setText("#menu-leaderboard-link", text.leaderboardHall);
    setText("#start-button .arcade-play-label", text.playNow);
    setAttr(".home-bottom-nav", "aria-label", text.mainNav);
    setText("#home-nav-game strong", text.navGame);
    setText("#home-nav-characters strong", text.navCharacters);
    setText("#home-nav-progress strong", text.navProgress);
    setText("#home-nav-champions strong", text.navChampions);

    setAttr("#pregame-panel [data-close-panel]", "aria-label", text.pregameClose);
    setText("#pregame-panel .secondary-kicker", text.pregameKicker);
    setText("#pregame-panel-title", text.pregameTitle);
    setAttr(".pregame-summary-grid", "aria-label", text.pregameChoices);
    setText("#pregame-character-button small", text.character);
    setText("#pregame-mode-button small", text.mode);
    setText("#pregame-difficulty-button small", text.difficulty);
    setText(".pregame-rule-card span:nth-child(1) small", text.scoreMultiplier);
    setText(".pregame-rule-card span:nth-child(2) small", text.importantRule);
    setText("#pregame-start-button", text.startGame);

    setAttr("#mode-panel [data-close-panel]", "aria-label", text.modeClose);
    setText("#mode-panel .secondary-kicker", text.modeKicker);
    setText("#mode-panel-title", text.modeTitle);
    setText("#mode-panel .phase5-sheet-header p", text.modeCopy);
    setText("#mode-panel legend", text.modeLegend);
    setAttr("#mode-panel .mode-options", "aria-label", text.mode);
    updateModeOptionCopy();

    setAttr("#difficulty-panel [data-close-panel]", "aria-label", text.difficultyClose);
    setText("#difficulty-panel .secondary-kicker", text.difficultyKicker);
    setText("#difficulty-panel-title", text.difficultyTitle);
    setText("#difficulty-panel .phase5-sheet-header p", text.difficultyCopy);
    setText("#difficulty-panel legend", text.difficultyLegend);
    setAttr("#difficulty-panel .difficulty-options", "aria-label", text.difficulty);
    updateDifficultyOptionCopy();

    setAttr("#settings-panel [data-close-panel]", "aria-label", text.settingsClose);
    setText("#settings-panel .secondary-kicker", text.settingsKicker);
    setText("#settings-panel-title", text.settingsTitle);
    setText("#settings-panel .phase5-sheet-header p", text.settingsCopy);
    setText("label[for='player-name-input']", text.nickname);
    els.playerNameInput?.setAttribute("placeholder", text.nicknamePlaceholder);
    setText(".settings-game-card > strong", text.game);
    setAttr("#character-control-button", "aria-label", text.openCharacterGallery);
    setText("#character-control-button small", text.character);
    setText("#mode-control-button small", text.mode);
    setText("#difficulty-control-button small", text.difficulty);
    setText("#pregame-open-button", text.pregameReview);
    setAttr(".settings-language", "aria-label", text.languageChoice);
    setText(".settings-language legend", text.language);
    const languageLabels = document.querySelectorAll(".settings-language label span");
    if (languageLabels[0]) {
      languageLabels[0].textContent = text.hebrew;
    }
    if (languageLabels[1]) {
      languageLabels[1].textContent = text.english;
    }
    setAttr(".settings-control-mode", "aria-label", text.controlMode);
    setText(".settings-control-mode legend", text.controlMode);
    const controlLabels = document.querySelectorAll(".settings-control-mode label span");
    if (controlLabels[0]) {
      controlLabels[0].textContent = text.swipe;
    }
    if (controlLabels[1]) {
      controlLabels[1].textContent = text.joystick;
    }
    setText("#settings-save-button", text.saveNickname);

    setAttr("#progress-panel [data-close-panel]", "aria-label", text.progressClose);
    setText("#progress-panel .secondary-kicker", text.progressKicker);
    setText("#progress-panel-title", text.progressTitle);
    setText("#progress-panel-copy", text.progressCopy);
    setText(".progress-real-grid span:nth-child(1) small", text.unlockedDifficulties);
    setText(".progress-real-grid span:nth-child(2) small", text.currentCategoryBest);

    setText("#pause-screen .secondary-kicker", text.pauseSafe);
    setText("#pause-title", text.pauseTitle);
    setAttr(".pause-mission-card", "aria-label", text.gameStatePaused);
    setText(".pause-mission-card span:nth-child(1) small", text.mission);
    setText(".pause-mission-card span:nth-child(2) small", text.pauseProgress);
    setButtonLabel(els.pauseResumeButton, text.resume);
    setButtonLabel(els.pauseRetryButton, text.retry);
    setButtonLabel(els.pauseMenuButton, text.backToMenu);
    setText("#pause-settings-title", text.pauseSettings);
    setText("label[for='pause-player-name-input']", text.pauseNickname);
    setText("#pause-save-name-button", text.save);

    updateSoundButton();
    updatePauseButton();
  }

  function getRequiredEnemyCount() {
    const difficulty = getDifficultySettings();
    const level = getCurrentLevel();
    const arcadeBonus = state.mode === "arcade"
      ? Math.min(6, Math.floor(state.correctAnswers / CONFIG.answersPerLevel))
      : 0;
    return (difficulty.enemyCount || CONFIG.minEnemies) + (level.enemyCountBonus || 0) + arcadeBonus;
  }

  function getArcadeWave() {
    return Math.floor(state.correctAnswers / CONFIG.answersPerLevel) + 1;
  }

  function getArcadePressureMultiplier() {
    if (state.mode !== "arcade") {
      return 1;
    }
    const difficulty = getDifficultySettings();
    return 1 + Math.min(0.85, (getArcadeWave() - 1) * 0.045 * (difficulty.progressionSpeed || 1));
  }

  function getAdaptiveQuestionChance() {
    const difficulty = getDifficultySettings();
    return Number.isFinite(difficulty.adaptiveQuestionChance)
      ? difficulty.adaptiveQuestionChance
      : CONFIG.adaptiveQuestionChance;
  }

  function loadFactStats() {
    try {
      const parsed = JSON.parse(storage.getMigrated(
        CONFIG.storageKeys.factStats,
        CONFIG.legacyStorageKeys.factStats,
        "{}"
      ));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => {
        return value && Number.isFinite(value.wrong) && Number.isFinite(value.correct);
      }));
    } catch {
      return {};
    }
  }

  function saveFactStats() {
    storage.set(CONFIG.storageKeys.factStats, JSON.stringify(state.factStats));
  }

  const initialMode = normalizeGameMode(storage.get(CONFIG.storageKeys.mode, localSave.settings.selectedMode));
  const savedDifficulty = normalizeDifficulty(storage.getMigrated(
    CONFIG.storageKeys.difficulty,
    CONFIG.legacyStorageKeys.difficulty,
    localSave.settings.selectedDifficulty
  ));
  const initialDifficulty = SYSTEMS.isDifficultyUnlocked(localSave, savedDifficulty) ? savedDifficulty : "normal";
  const initialBestScore = Math.max(
    SYSTEMS.getPersonalBest(localSave, initialMode, initialDifficulty),
    Number(storage.getMigrated(
      CONFIG.storageKeys.bestScore,
      CONFIG.legacyStorageKeys.bestScore,
      "0"
    )) || 0
  );

  const state = {
    phase: "start",
    save: localSave,
    mode: initialMode,
    clock: 0,
    lastTime: 0,
    maze: [],
    reachable: new Set(),
    reachableList: [],
    collectibles: new Map(),
    mazeScatterDecor: [],
    mazeScatterSignature: null,
    mazeScatterSeed: null,
    player: null,
    enemies: [],
    boss: null,
    bossIntro: null,
    finalBossExplosion: null,
    hazards: [],
    nextHazardAt: 0,
    particles: [],
    floatingTexts: [],
    arcadeRewardBanner: null,
    pendingSpawns: [],
    backdropStars: [],
    nextPowerCollectibleAt: 0,
    arcadeBonus: createArcadeBonusState(),
    levelIndex: 0,
    levelBanner: null,
    score: 0,
    scoreState: SYSTEMS.createScoreState(),
    combo: 0,
    comboState: SYSTEMS.createComboState(),
    lives: CONFIG.initialLives,
    correctAnswers: 0,
    incorrectAnswers: 0,
    mathStats: SYSTEMS.createMathStats(),
    bestScore: initialBestScore,
    playerName: SYSTEMS.safeNickname(storage.get(CONFIG.storageKeys.nickname, localSave.player.nickname)),
    characterId: normalizeCharacterId(storage.get(CONFIG.storageKeys.character, localSave.settings.selectedCharacter)),
    playerId: getOrCreatePlayerId(),
    difficulty: initialDifficulty,
    controlMode: normalizeControlMode(storage.get(CONFIG.storageKeys.controlMode, localSave.settings.controlMode)),
    language: normalizeLanguage(storage.get(CONFIG.storageKeys.language, localSave.settings.language || "he")),
    timeLimitEnabled: true,
    factStats: loadFactStats(),
    recentQuestionKeys: [],
    mission: null,
    question: null,
    questionStartedAt: null,
    questionTimeRemaining: null,
    questionDeadline: null,
    questionFeedbackTimerId: null,
    currentEnemyId: null,
    questionSource: null,
    answerLocked: false,
    nextEnemyId: 1,
    soundEnabled: storage.getMigrated(
      CONFIG.storageKeys.sound,
      CONFIG.legacyStorageKeys.sound,
      "on"
    ) !== "off",
    audioContext: null,
    shake: 0,
    fireworkTimer: 0,
    leaderboardLoading: false,
    scorePublishing: false,
    publicLeaderboard: {
      status: "localOnly",
      promise: null,
      checked: false
    },
    sessionStartedAt: null,
    hitsTaken: 0,
    finalResult: null,
    victoryEndTimerId: null,
    latestLeaderboardEntryId: null,
    visualVerificationMode: false,
    lastFocusBeforeLeaderboard: null,
    lastFocusBeforePause: null,
    lastFocusBeforeMenuSheet: null,
    lastFocusBeforeHeroGallery: null,
    heroGalleryCharacterId: null,
    heroGallerySwipeStart: null,
    heroGalleryReactionTimerId: null,
    heroGalleryReactionToken: 0,
    homeCharacterReactionTimerId: null,
    homeCharacterIdleTimerId: null,
    homeCharacterReactionToken: 0,
    homeCharacterSelectionGuardUntil: 0,
    hudSnapshot: {
      score: null,
      combo: null,
      comboMultiplierPct: null,
      lives: null,
      missionKey: null,
      missionProgress: null,
      progressPercent: null,
      correctAnswers: null
    }
  };
  const hudFeedbackTimers = new WeakMap();

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function centerOfCell(x, y) {
    return {
      x: x * TILE + TILE / 2,
      y: y * TILE + TILE / 2
    };
  }

  function toCell(x, y) {
    return {
      x: Math.floor(x / TILE),
      y: Math.floor(y / TILE)
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distanceCells(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function motionSystem() {
    return window.KaflulMotionSystem || null;
  }

  function playUiMotion(element, eventName, options = {}) {
    return motionSystem()?.play?.(element, eventName, options) || { ok: false, duration: 0 };
  }

  function showWithMotion(element, eventName = "screenEnter", options = {}) {
    if (!element) {
      return;
    }
    const motion = motionSystem();
    if (motion?.show) {
      motion.show(element, eventName, options);
      return;
    }
    element.hidden = false;
  }

  function hideWithMotion(element, eventName = "screenExit", options = {}) {
    if (!element) {
      return;
    }
    const motion = motionSystem();
    if (motion?.hideAfter) {
      motion.hideAfter(element, eventName, options);
      return;
    }
    element.hidden = true;
  }

  function syncUiSoundController() {
    window.KaflulUiSound?.setEnabled?.(state.soundEnabled);
  }

  function playUiSound(eventName, options = {}) {
    const controller = window.KaflulUiSound;
    if (!controller?.play) {
      return { ok: false, reason: "missing-controller" };
    }
    controller.setEnabled?.(state.soundEnabled);
    return controller.play(eventName, options);
  }

  function resizeCanvas() {
    updateViewportProfile();
    const rect = canvas.getBoundingClientRect();
    const ratioLimit = MOBILE_RUNTIME.mode === "phone-portrait"
      ? 1.25
      : (MOBILE_RUNTIME.reducedEffects ? 1.5 : 2);
    const ratio = Math.min(window.devicePixelRatio || 1, ratioLimit);
    const cssWidth = Math.max(1, rect.width || WIDTH);
    const cssHeight = Math.max(1, rect.height || HEIGHT);
    const pixelWidth = Math.max(1, Math.round(cssWidth * ratio));
    const pixelHeight = Math.max(1, Math.round(cssHeight * ratio));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    if (MOBILE_RUNTIME.mode === "phone-portrait") {
      const coverScale = Math.max(pixelWidth / WIDTH, pixelHeight / HEIGHT);
      const offsetX = (pixelWidth - WIDTH * coverScale) / 2;
      const offsetY = (pixelHeight - HEIGHT * coverScale) / 2;
      MOBILE_RUNTIME.projectionWidth = pixelWidth / coverScale;
      MOBILE_RUNTIME.projectionHeight = pixelHeight / coverScale;
      ctx.setTransform(coverScale, 0, 0, coverScale, offsetX, offsetY);
    } else {
      MOBILE_RUNTIME.projectionWidth = WIDTH;
      MOBILE_RUNTIME.projectionHeight = HEIGHT;
      ctx.setTransform(pixelWidth / WIDTH, 0, 0, pixelHeight / HEIGHT, 0, 0);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = MOBILE_RUNTIME.mode === "phone-portrait" || MOBILE_RUNTIME.reducedEffects ? "medium" : "high";
  }

  function updateViewportProfile() {
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const portrait = window.innerHeight >= window.innerWidth;
    let mode = "desktop";
    let zoom = 1;

    if (portrait && window.innerWidth <= 600) {
      mode = "phone-portrait";
      zoom = 1;
    } else if (coarse && !portrait && window.innerHeight <= 700) {
      mode = "phone-landscape";
      zoom = 1;
    } else if (coarse) {
      mode = "tablet";
      zoom = 1;
    }

    MOBILE_RUNTIME.coarse = coarse;
    MOBILE_RUNTIME.mode = mode;
    MOBILE_RUNTIME.zoom = zoom;
    MOBILE_RUNTIME.reducedEffects = prefersReducedMotion || (coarse && (window.innerWidth < 900 || window.devicePixelRatio > 2));
    MOBILE_RUNTIME.phonePortrait = mode === "phone-portrait";
    MOBILE_RUNTIME.compactPortrait = mode === "phone-portrait" && (window.innerWidth <= 370 || window.innerHeight <= 680);
    MOBILE_RUNTIME.visualProfileKey = MOBILE_RUNTIME.reducedEffects
      ? "reduced"
      : MOBILE_RUNTIME.compactPortrait
      ? "compact-phone"
      : MOBILE_RUNTIME.phonePortrait
      ? "phone"
      : "desktop";
    document.documentElement.dataset.gameViewport = mode;
    document.documentElement.classList.toggle("mobile-low-effects", MOBILE_RUNTIME.reducedEffects);
  }

  function isPhonePortraitView() {
    return MOBILE_RUNTIME.phonePortrait || (window.innerWidth <= 600 && window.innerHeight >= window.innerWidth);
  }

  function getMazeMobileVisualProfile() {
    return MAZE_VISUAL_PROFILES[MOBILE_RUNTIME.visualProfileKey]
      || MAZE_VISUAL_PROFILES[MOBILE_RUNTIME.compactPortrait ? "compact-phone" : MOBILE_RUNTIME.phonePortrait ? "phone" : "desktop"]
      || MAZE_VISUAL_PROFILES.desktop;
  }

  function updateCamera(dt) {
    const targetZoom = MOBILE_RUNTIME.zoom;
    const zoomEase = dt > 0 ? 1 - Math.exp(-dt * 10) : 1;
    CAMERA.zoom += (targetZoom - CAMERA.zoom) * zoomEase;

    const player = state.player;
    let targetX = player?.x ?? WIDTH / 2;
    let targetY = player?.y ?? HEIGHT / 2;
    if (state.finalBossExplosion && state.phase === "victory") {
      targetX = state.finalBossExplosion.x;
      targetY = state.finalBossExplosion.y;
    } else if (state.boss && player && state.phase === "playing") {
      if (state.bossIntro || state.boss.spawnProgress < 0.95) {
        targetX = state.boss.x;
        targetY = state.boss.y;
      } else {
        targetX = player.x * 0.42 + state.boss.x * 0.58;
        targetY = player.y * 0.42 + state.boss.y * 0.58;
      }
    }
    const visibleWidth = (MOBILE_RUNTIME.projectionWidth || WIDTH) / CAMERA.zoom;
    const visibleHeight = (MOBILE_RUNTIME.projectionHeight || HEIGHT) / CAMERA.zoom;
    const minX = visibleWidth / 2;
    const maxX = WIDTH - visibleWidth / 2;
    const minY = visibleHeight / 2;
    const maxY = HEIGHT - visibleHeight / 2;
    const clampedX = clamp(targetX, Math.min(minX, maxX), Math.max(minX, maxX));
    const clampedY = clamp(targetY, Math.min(minY, maxY), Math.max(minY, maxY));
    const followEase = dt > 0 ? 1 - Math.exp(-dt * 7.5) : 1;

    CAMERA.x += (clampedX - CAMERA.x) * followEase;
    CAMERA.y += (clampedY - CAMERA.y) * followEase;
  }

  function applyCameraTransform(renderContext) {
    const croppedProjection = (MOBILE_RUNTIME.projectionWidth || WIDTH) < WIDTH - 1
      || (MOBILE_RUNTIME.projectionHeight || HEIGHT) < HEIGHT - 1;
    if (CAMERA.zoom <= 1.001 && !croppedProjection) {
      return;
    }
    renderContext.translate(WIDTH / 2, HEIGHT / 2);
    renderContext.scale(CAMERA.zoom, CAMERA.zoom);
    renderContext.translate(-CAMERA.x, -CAMERA.y);
  }

  function createMaze(levelIndex = 0) {
    const maze = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    const setCell = (x, y, value) => {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
        maze[y][x] = value;
      }
    };

    const addBlock = (x, y, w, h) => {
      for (let cy = y; cy < y + h; cy += 1) {
        for (let cx = x; cx < x + w; cx += 1) {
          setCell(cx, cy, 1);
        }
      }
    };

    const addMirrorBlock = (x, y, w, h) => {
      addBlock(x, y, w, h);
      const mirrorX = COLS - x - w;
      if (mirrorX !== x) {
        addBlock(mirrorX, y, w, h);
      }
    };

    const addWallPath = (points, thickness = 2) => {
      for (let index = 0; index < points.length - 1; index += 1) {
        const [x1, y1] = points[index];
        const [x2, y2] = points[index + 1];
        if (x1 === x2) {
          addBlock(x1, Math.min(y1, y2), thickness, Math.abs(y2 - y1) + thickness);
        } else {
          addBlock(Math.min(x1, x2), y1, Math.abs(x2 - x1) + thickness, thickness);
        }
      }
    };

    const clearRect = (x, y, w, h) => {
      for (let cy = y; cy < y + h; cy += 1) {
        for (let cx = x; cx < x + w; cx += 1) {
          if (cx > 0 && cx < COLS - 1 && cy > 0 && cy < ROWS - 1) {
            maze[cy][cx] = 0;
          }
        }
      }
    };

    const sealOuterWalls = () => {
      for (let x = 0; x < COLS; x += 1) {
        setCell(x, 0, 1);
        setCell(x, ROWS - 1, 1);
      }
      for (let y = 0; y < ROWS; y += 1) {
        setCell(0, y, 1);
        setCell(COLS - 1, y, 1);
      }
    };

    const addCentralPlaza = () => {
      addBlock(CENTER_CELL.x - 5, CENTER_CELL.y - 3, 4, 2);
      addBlock(CENTER_CELL.x + 2, CENTER_CELL.y - 3, 4, 2);
      addBlock(CENTER_CELL.x - 5, CENTER_CELL.y + 3, 4, 2);
      addBlock(CENTER_CELL.x + 2, CENTER_CELL.y + 3, 4, 2);
      addBlock(CENTER_CELL.x - 6, CENTER_CELL.y - 1, 2, 3);
      addBlock(CENTER_CELL.x + 5, CENTER_CELL.y - 1, 2, 3);
    };

    const addClassicLoopSkeleton = () => {
      addBlock(0, 0, COLS, 2);
      addBlock(0, ROWS - 2, COLS, 2);
      addBlock(0, 0, 2, ROWS);
      addBlock(COLS - 2, 0, 2, ROWS);

      addMirrorBlock(4, 4, 8, 2);
      addMirrorBlock(15, 4, 3, 4);
      addMirrorBlock(4, 8, 3, 5);
      addMirrorBlock(9, 9, 7, 2);
      addMirrorBlock(4, 15, 8, 2);
      addMirrorBlock(13, 14, 3, 6);
      addMirrorBlock(4, 21, 10, 2);
      addMirrorBlock(7, 25, 8, 2);
      addBlock(CENTER_CELL.x - 2, 6, 4, 4);
      addBlock(CENTER_CELL.x - 2, ROWS - 10, 4, 4);
      addCentralPlaza();
    };

    const addIceArena = () => {
      addClassicLoopSkeleton();
      addMirrorBlock(7, 6, 3, 2);
      addMirrorBlock(6, 18, 5, 2);
      addBlock(CENTER_CELL.x - 1, 10, 2, 3);
      addBlock(CENTER_CELL.x - 1, 18, 2, 3);
      addMirrorBlock(17, 23, 2, 3);
      clearRect(3, 12, 7, 2);
      clearRect(COLS - 10, 12, 7, 2);
    };

    const addLavaArena = () => {
      addClassicLoopSkeleton();
      addMirrorBlock(5, 5, 10, 2);
      addMirrorBlock(5, 12, 2, 6);
      addMirrorBlock(9, 18, 9, 2);
      addMirrorBlock(4, 24, 6, 2);
      addBlock(CENTER_CELL.x - 8, 8, 3, 5);
      addBlock(CENTER_CELL.x + 6, 8, 3, 5);
      addBlock(CENTER_CELL.x - 8, 20, 3, 5);
      addBlock(CENTER_CELL.x + 6, 20, 3, 5);
      clearRect(CENTER_CELL.x - 2, 4, 4, 22);
      clearRect(4, CENTER_CELL.y - 1, COLS - 8, 3);
    };

    const addAncientArena = () => {
      addClassicLoopSkeleton();
      addMirrorBlock(5, 5, 5, 5);
      addMirrorBlock(12, 7, 4, 2);
      addMirrorBlock(5, 19, 5, 5);
      addMirrorBlock(12, 22, 4, 2);
      addBlock(18, 4, 4, 2);
      addBlock(18, 24, 4, 2);
      addBlock(10, 13, 4, 4);
      addBlock(26, 13, 4, 4);
      clearRect(3, 10, 34, 2);
      clearRect(3, 18, 34, 2);
      clearRect(CENTER_CELL.x - 2, 3, 4, 24);
    };

    const addDiamondArena = () => {
      addClassicLoopSkeleton();
      addMirrorBlock(5, 6, 5, 2);
      addMirrorBlock(8, 8, 5, 2);
      addMirrorBlock(11, 10, 5, 2);
      addMirrorBlock(5, 19, 5, 2);
      addMirrorBlock(8, 21, 5, 2);
      addMirrorBlock(11, 23, 5, 2);
      addBlock(CENTER_CELL.x - 1, 5, 2, 7);
      addBlock(CENTER_CELL.x - 1, 19, 2, 6);
      addBlock(CENTER_CELL.x - 7, CENTER_CELL.y - 1, 4, 2);
      addBlock(CENTER_CELL.x + 4, CENTER_CELL.y - 1, 4, 2);
      clearRect(4, 13, 7, 4);
      clearRect(COLS - 11, 13, 7, 4);
    };

    addBlock(0, 0, COLS, 2);
    addBlock(0, ROWS - 2, COLS, 2);
    addBlock(0, 0, 2, ROWS);
    addBlock(COLS - 2, 0, 2, ROWS);

    const pattern = levelIndex % CONFIG.levels.length;
    if (pattern === 1) {
      addLavaArena();
    } else if (pattern === 2) {
      addAncientArena();
    } else if (pattern === 3) {
      addDiamondArena();
    } else {
      addIceArena();
    }

    clearRect(PLAYER_START.x - 3, PLAYER_START.y - 3, 7, 5);
    clearRect(CENTER_CELL.x - 3, CENTER_CELL.y - 3, 7, 7);
    sealOuterWalls();

    return maze;
  }

  function addReferenceMazePattern(levelIndex, addBlock, mirrorBlock) {
    const pattern = levelIndex % CONFIG.levels.length;

    if (pattern === 0) {
      addBlock(4, 4, 11, 2);
      addBlock(13, 4, 2, 7);
      addBlock(5, 10, 10, 2);
      addBlock(21, 4, 2, 8);
      addBlock(23, 10, 9, 2);
      addBlock(31, 4, 3, 8);
      addBlock(4, 15, 10, 2);
      addBlock(14, 15, 2, 6);
      addBlock(22, 15, 11, 2);
      addBlock(22, 17, 2, 5);
      addBlock(5, 23, 8, 2);
      addBlock(25, 23, 9, 2);
      return;
    }

    if (pattern === 1) {
      addBlock(4, 4, 21, 2);
      addBlock(23, 4, 2, 7);
      addBlock(9, 10, 16, 2);
      addBlock(7, 10, 2, 8);
      addBlock(7, 17, 18, 2);
      addBlock(23, 17, 2, 5);
      addBlock(14, 23, 11, 2);
      addBlock(29, 6, 6, 2);
      addBlock(31, 12, 4, 2);
      addBlock(4, 23, 6, 2);
      return;
    }

    if (pattern === 2) {
      addBlock(4, 4, 10, 2);
      addBlock(4, 6, 2, 7);
      addBlock(11, 10, 13, 2);
      addBlock(22, 5, 2, 7);
      addBlock(26, 4, 9, 2);
      addBlock(30, 6, 2, 7);
      addBlock(5, 16, 13, 2);
      addBlock(18, 16, 2, 6);
      addBlock(24, 16, 10, 2);
      addBlock(8, 23, 9, 2);
      addBlock(22, 23, 9, 2);
      return;
    }

    addBlock(5, 4, 18, 2);
    addBlock(21, 4, 2, 6);
    addBlock(23, 9, 11, 2);
    addBlock(32, 9, 2, 6);
    addBlock(6, 10, 11, 2);
    addBlock(6, 12, 2, 6);
    addBlock(13, 17, 13, 2);
    addBlock(24, 17, 2, 5);
    addBlock(28, 22, 7, 2);
    addBlock(6, 23, 9, 2);
    addBlock(17, 7, 2, 4);
  }

  function carveReferencePath(maze, points, radius = 1) {
    for (let i = 0; i < points.length - 1; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const dx = Math.sign(x2 - x1);
      const dy = Math.sign(y2 - y1);
      let x = x1;
      let y = y1;
      clearZone(maze, x, y, radius);
      while (x !== x2 || y !== y2) {
        if (x !== x2) {
          x += dx;
        }
        if (y !== y2) {
          y += dy;
        }
        clearZone(maze, x, y, radius);
      }
    }
  }

  function clearZone(maze, cx, cy, radius) {
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if (x > 0 && x < COLS - 1 && y > 0 && y < ROWS - 1) {
          maze[y][x] = 0;
        }
      }
    }
  }

  function isWallCell(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) {
      return true;
    }

    return state.maze[y][x] === 1;
  }

  function isWalkableCell(x, y) {
    return !isWallCell(x, y);
  }

  function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function circleHitsWall(x, y, radius) {
    const left = Math.floor((x - radius) / TILE);
    const right = Math.floor((x + radius) / TILE);
    const top = Math.floor((y - radius) / TILE);
    const bottom = Math.floor((y + radius) / TILE);

    for (let cy = top; cy <= bottom; cy += 1) {
      for (let cx = left; cx <= right; cx += 1) {
        if (isWallCell(cx, cy)) {
          const rx = cx * TILE;
          const ry = cy * TILE;
          if (circleRectCollision(x, y, radius, rx, ry, TILE, TILE)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function computeReachable(start) {
    const reachable = new Set();
    const queue = [start];
    reachable.add(cellKey(start.x, start.y));

    for (let i = 0; i < queue.length; i += 1) {
      const cell = queue[i];
      for (const dir of DIR_NAMES) {
        const next = {
          x: cell.x + DIRS[dir].x,
          y: cell.y + DIRS[dir].y
        };
        const key = cellKey(next.x, next.y);
        if (!reachable.has(key) && isWalkableCell(next.x, next.y)) {
          reachable.add(key);
          queue.push(next);
        }
      }
    }

    return {
      reachable,
      list: queue
    };
  }

  function seedCollectibles() {
    state.collectibles.clear();
    for (const cell of state.reachableList) {
      const nearPlayer = distanceCells(cell, PLAYER_START) <= 2;
      const nearCenter = distanceCells(cell, CENTER_CELL) <= 2;
      if (nearPlayer || nearCenter) {
        continue;
      }

      if (isReferenceCollectibleLane(cell)) {
        const pos = centerOfCell(cell.x, cell.y);
        state.collectibles.set(cellKey(cell.x, cell.y), {
          x: pos.x,
          y: pos.y,
          phase: Math.random() * Math.PI * 2,
          radius: Math.random() < 0.08 ? 4.5 : 2.6,
          value: Math.random() < 0.08 ? 30 : 10
        });
      }
    }
    seedPowerCollectible();
    seedArcadeBonusCollectibles();
  }

  function isReferenceCollectibleLane(cell) {
    const { x, y } = cell;
    const pattern = state.levelIndex % CONFIG.levels.length;
    const laneOffset = pattern % 2;
    const spaced = ((x + y * 2 + laneOffset) % 3) === 0;
    if (!spaced) {
      return false;
    }

    const openLeft = isWalkableCell(x - 1, y);
    const openRight = isWalkableCell(x + 1, y);
    const openUp = isWalkableCell(x, y - 1);
    const openDown = isWalkableCell(x, y + 1);
    const openCount = [openLeft, openRight, openUp, openDown].filter(Boolean).length;
    const cleanLane = (openLeft && openRight) || (openUp && openDown) || openCount >= 3;
    if (!cleanLane || openCount <= 1) {
      return false;
    }

    const centerLane = Math.abs(x - CENTER_CELL.x) <= 1
      || Math.abs(y - CENTER_CELL.y) <= 1
      || Math.abs(y - PLAYER_START.y) <= 1;
    if (centerLane && ((x + y + pattern) % 2) === 0) {
      return true;
    }

    const stageRhythm = pattern === 0 ? 5 : pattern === 1 ? 6 : pattern === 2 ? 7 : 5;
    const seededSkip = ((x * 19 + y * 23 + pattern * 31) % stageRhythm) === 0;
    return !seededSkip || openCount >= 3;
  }

  function refillCollectibles() {
    if (state.collectibles.size > 48) {
      seedBossChallengeCollectible();
      seedPowerCollectible();
      return;
    }

    const playerCell = toCell(state.player.x, state.player.y);
    const candidates = shuffle(state.reachableList).filter((cell) => {
      const key = cellKey(cell.x, cell.y);
      return !state.collectibles.has(key) && distanceCells(cell, playerCell) > 3 && distanceCells(cell, CENTER_CELL) > 2;
    });

    for (const cell of candidates.filter(isReferenceCollectibleLane).slice(0, 42)) {
      const pos = centerOfCell(cell.x, cell.y);
      state.collectibles.set(cellKey(cell.x, cell.y), {
        x: pos.x,
        y: pos.y,
        phase: Math.random() * Math.PI * 2,
        radius: Math.random() < 0.1 ? 4.5 : 2.6,
        value: Math.random() < 0.1 ? 30 : 10
      });
    }
    seedBossChallengeCollectible();
    seedPowerCollectible();
  }

  function hasCollectibleKind(kind) {
    for (const collectible of state.collectibles.values()) {
      if (collectible.kind === kind) {
        return true;
      }
    }
    return false;
  }

  function addSpecialCollectible(kind, options = {}) {
    if (hasCollectibleKind(kind)) {
      return false;
    }

    const playerCell = state.player ? toCell(state.player.x, state.player.y) : PLAYER_START;
    const minPlayerDistance = options.minPlayerDistance ?? 5;
    const minCenterDistance = options.minCenterDistance ?? 4;
    const candidates = state.reachableList
      .filter((cell) => {
        const key = cellKey(cell.x, cell.y);
        return !state.collectibles.has(key)
          && distanceCells(cell, playerCell) >= minPlayerDistance
          && distanceCells(cell, CENTER_CELL) >= minCenterDistance;
      })
      .map((cell) => {
        const playerDistance = distanceCells(cell, playerCell);
        const centerDistance = distanceCells(cell, CENTER_CELL);
        const targetDistance = options.preferNearPlayer
          ? Math.abs(playerDistance - (options.targetPlayerDistance || 8))
          : -playerDistance;
        return {
          cell,
          score: targetDistance - centerDistance * 0.18 + Math.random() * 1.5
        };
      })
      .sort((a, b) => a.score - b.score);

    const selected = candidates[0]?.cell;
    if (!selected) {
      return false;
    }

    const pos = centerOfCell(selected.x, selected.y);
    const isBossCore = kind === "boss-core";
    state.collectibles.set(cellKey(selected.x, selected.y), {
      x: pos.x,
      y: pos.y,
      phase: Math.random() * Math.PI * 2,
      radius: isBossCore ? 7.6 : 6.5,
      value: 0,
      kind
    });
    return true;
  }

  function seedPowerCollectible() {
    if (state.boss || state.phase === "question" || state.clock < state.nextPowerCollectibleAt) {
      return;
    }
    addSpecialCollectible("power", {
      minPlayerDistance: 7,
      minCenterDistance: 4,
      targetPlayerDistance: 13
    });
  }

  function createArcadeBonusState() {
    return {
      levelIndex: -1,
      collectedLetters: [],
      letterHeartAwarded: false,
      keysCollected: 0,
      chestOpened: false,
      chestReward: null,
      chestOpenedAt: 0
    };
  }

  function resetArcadeBonusLevelState(options = {}) {
    state.arcadeBonus.levelIndex = state.levelIndex;
    state.arcadeBonus.collectedLetters = [];
    state.arcadeBonus.letterHeartAwarded = false;
    if (options.resetChest !== false) {
      state.arcadeBonus.keysCollected = 0;
      state.arcadeBonus.chestOpened = false;
      state.arcadeBonus.chestReward = null;
      state.arcadeBonus.chestOpenedAt = 0;
    }
  }

  function getArcadeChestCell() {
    return { x: CENTER_CELL.x + 3, y: CENTER_CELL.y + 3 };
  }

  function getArcadeBonusProtectedCells() {
    const chest = getArcadeChestCell();
    return [
      PLAYER_START,
      chest,
      { x: chest.x - 2, y: chest.y },
      { x: chest.x + 2, y: chest.y },
      { x: chest.x, y: chest.y - 2 },
      { x: chest.x, y: chest.y + 2 }
    ];
  }

  function isArcadeBonusPlacementCell(cell, selected = [], options = {}) {
    const key = cellKey(cell.x, cell.y);
    const playerCell = state.player ? toCell(state.player.x, state.player.y) : PLAYER_START;
    const minPlayerDistance = options.minPlayerDistance ?? 6;
    const minCenterDistance = options.minCenterDistance ?? 5;
    const minSpacing = options.minSpacing ?? 5;
    if (!state.reachable.has(key) || state.collectibles.has(key)) {
      return false;
    }
    if (distanceCells(cell, playerCell) < minPlayerDistance || distanceCells(cell, CENTER_CELL) < minCenterDistance) {
      return false;
    }
    for (const protectedCell of getArcadeBonusProtectedCells()) {
      if (distanceCells(cell, protectedCell) < 3) {
        return false;
      }
    }
    return selected.every((candidate) => distanceCells(cell, candidate) >= minSpacing);
  }

  function placeArcadeBonusItems(items, options = {}) {
    const selected = [];
    const candidates = shuffle(state.reachableList).filter((cell) => isArcadeBonusPlacementCell(cell, selected, options));

    for (const item of items) {
      const cell = candidates.find((candidate) => isArcadeBonusPlacementCell(candidate, selected, options));
      if (!cell) {
        break;
      }
      selected.push(cell);
      const pos = centerOfCell(cell.x, cell.y);
      state.collectibles.set(cellKey(cell.x, cell.y), {
        x: pos.x,
        y: pos.y,
        phase: Math.random() * Math.PI * 2,
        radius: item.radius,
        value: item.value,
        kind: item.kind,
        letter: item.letter || null,
        letterIndex: item.letterIndex ?? null
      });
    }

    return selected.length;
  }

  function seedArcadeBonusCollectibles(options = {}) {
    resetArcadeBonusLevelState({
      resetChest: options.resetChest
    });

    placeArcadeBonusItems(CONFIG.arcadeBonus.letters.map((letter, index) => ({
      kind: "bonus-letter",
      letter,
      letterIndex: index,
      radius: 8.2,
      value: CONFIG.arcadeBonus.letterScoreValue
    })), {
      minPlayerDistance: 6,
      minCenterDistance: 5,
      minSpacing: 6
    });

    if (state.arcadeBonus.chestOpened) {
      return;
    }

    const remainingKeys = Math.max(0, CONFIG.arcadeBonus.keysRequired - state.arcadeBonus.keysCollected);
    placeArcadeBonusItems(Array.from({ length: remainingKeys }, () => ({
      kind: "bonus-key",
      radius: 7.4,
      value: CONFIG.arcadeBonus.keyScoreValue
    })), {
      minPlayerDistance: 7,
      minCenterDistance: 5,
      minSpacing: 7
    });
  }

  function seedBossChallengeCollectible() {
    if (!state.boss || state.phase === "question") {
      return;
    }
    addSpecialCollectible("boss-core", {
      minPlayerDistance: 5,
      minCenterDistance: 6,
      preferNearPlayer: true,
      targetPlayerDistance: 9
    });
  }

  function createPlayer() {
    const pos = centerOfCell(PLAYER_START.x, PLAYER_START.y);
    return {
      x: pos.x,
      y: pos.y,
      radius: 10.2,
      speed: CONFIG.speed.player,
      direction: "right",
      desiredDirection: "right",
      directionRequestTime: 0,
      visualPulse: 0.25,
      eatAnimation: 0,
      eatDirection: "right",
      eatEffect: null,
      blinkTimer: 1.4 + Math.random() * 2.2,
      blinkDuration: 0,
      hitAnimation: 0,
      invulnerable: 0,
      questionAnimation: 0,
      rewardAnimation: 0,
      turnAnimation: 0,
      turnDirection: "right",
      walkCycle: 0,
      lastMoveDistance: 0,
      trail: []
    };
  }

  function createEnemy(index) {
    const cell = chooseEnemySpawnCell(index);
    const pos = centerOfCell(cell.x, cell.y);
    const direction = randomItem(DIR_NAMES);
    const difficulty = getDifficultySettings();
    const level = getCurrentLevel();
    const enemyColors = level.enemyColors || ENEMY_COLORS;
    const speedTier = Math.min(
      CONFIG.speed.enemyTierMax,
      Math.floor(state.correctAnswers / CONFIG.speed.enemyTierEveryAnswers) * CONFIG.speed.enemyTierStep
    );
    const speed = (
      CONFIG.speed.enemyBase +
      speedTier +
      (index % 4) * CONFIG.speed.enemyIndexStep
    ) * difficulty.enemySpeedMultiplier * (level.enemySpeedMultiplier || 1) * getArcadePressureMultiplier();

    return {
      id: state.nextEnemyId,
      x: pos.x,
      y: pos.y,
      radius: 10.4,
      speed,
      direction,
      color: enemyColors[index % enemyColors.length],
      visualStyle: level.enemyVisualStyle || "neutral",
      visualVariant: index % 4,
      scatter: scatterCornerFor(index),
      roamTarget: chooseEnemyRoamCell(index, cell),
      roamTargetCooldown: 0.8 + Math.random() * 2.6,
      personality: index % 4,
      pathCooldown: 0,
      spawnFlash: 0.8,
      wobble: Math.random() * Math.PI * 2,
      expressionOffset: index * 0.47 + Math.random() * 0.8
    };
  }

  function scatterCornerFor(index) {
    const corners = [
      { x: 2, y: 2 },
      { x: COLS - 3, y: 2 },
      { x: 2, y: ROWS - 3 },
      { x: COLS - 3, y: ROWS - 3 }
    ];
    return corners[index % corners.length];
  }

  function chooseEnemySpawnCell(index) {
    const playerCell = state.player ? toCell(state.player.x, state.player.y) : PLAYER_START;
    const centerOptions = [
      CENTER_CELL,
      { x: CENTER_CELL.x - 2, y: CENTER_CELL.y },
      { x: CENTER_CELL.x + 2, y: CENTER_CELL.y },
      { x: CENTER_CELL.x, y: CENTER_CELL.y - 2 },
      { x: CENTER_CELL.x, y: CENTER_CELL.y + 2 }
    ];

    const corner = scatterCornerFor(index);
    const ambushOptions = AMBUSH_CELLS.slice(index % AMBUSH_CELLS.length)
      .concat(AMBUSH_CELLS.slice(0, index % AMBUSH_CELLS.length));
    const closeButFair = ambushOptions.filter((cell) => {
      const distance = distanceCells(cell, playerCell);
      return state.reachable.has(cellKey(cell.x, cell.y)) && distance >= 7 && distance <= 15;
    });
    const ordered = shuffle(closeButFair.concat(centerOptions, [corner])).filter((cell) => {
      return state.reachable.has(cellKey(cell.x, cell.y)) && distanceCells(cell, playerCell) > 6;
    });

    if (ordered.length > 0) {
      return ordered[0];
    }

    const farCells = state.reachableList.filter((cell) => distanceCells(cell, playerCell) > 10);
    return randomItem(farCells.length ? farCells : state.reachableList);
  }

  function chooseEnemyRoamCell(index = 0, fromCell = null) {
    const playerCell = state.player ? toCell(state.player.x, state.player.y) : PLAYER_START;
    const baseCell = fromCell || scatterCornerFor(index);
    const candidates = state.reachableList.filter((cell) => {
      const playerDistance = distanceCells(cell, playerCell);
      const baseDistance = distanceCells(cell, baseCell);
      return playerDistance >= 7
        && baseDistance >= 5
        && distanceCells(cell, CENTER_CELL) >= 3;
    });

    if (candidates.length) {
      return randomItem(candidates);
    }

    return scatterCornerFor(index);
  }

  function scheduleEnemySpawn(delay) {
    state.pendingSpawns.push({
      delay,
      index: state.nextEnemyId
    });
  }

  function ensureEnemyCount() {
    if (state.boss) {
      return;
    }

    const minEnemies = getRequiredEnemyCount();
    const totalIncoming = state.enemies.length + state.pendingSpawns.length;
    for (let i = totalIncoming; i < minEnemies; i += 1) {
      scheduleEnemySpawn(0.25 + i * 0.08);
    }
  }

  function spawnEnemy(index) {
    const enemy = createEnemy(index);
    state.nextEnemyId += 1;
    state.enemies.push(enemy);
    addBurst(enemy.x, enemy.y, enemy.color, 18, 90);
  }

  function getStageQuestionNumber() {
    return (state.correctAnswers % CONFIG.answersPerLevel) + 1;
  }

  function isFinalQuestionInStage() {
    return getStageQuestionNumber() === CONFIG.answersPerLevel;
  }

  function getBossConfigForCurrentLevel() {
    const level = getCurrentLevel();
    return BOSS_CONFIG[level.bossKey] || null;
  }

  function shouldStartBossChallenge() {
    return state.phase === "playing"
      && !state.boss
      && isFinalQuestionInStage()
      && Boolean(getBossConfigForCurrentLevel());
  }

  function startBossChallenge() {
    const bossDefinition = getBossConfigForCurrentLevel();
    if (!bossDefinition || state.boss) {
      return;
    }
    const bossKey = getCurrentLevel().bossKey || "stage1";

    for (const enemy of state.enemies) {
      addBurst(enemy.x, enemy.y, enemy.color, 14, 105);
    }

    state.enemies = [];
    state.pendingSpawns = [];
    for (const [key, collectible] of state.collectibles) {
      if (collectible.kind === "power") {
        state.collectibles.delete(key);
      }
    }

    const pos = centerOfCell(CENTER_CELL.x, CENTER_CELL.y);
    const difficulty = getDifficultySettings();
    const speed = CONFIG.speed.enemyBase
      * difficulty.enemySpeedMultiplier
      * (getCurrentLevel().enemySpeedMultiplier || 1)
      * bossDefinition.speedMultiplier
      * getArcadePressureMultiplier();

    state.boss = {
      id: `boss-${state.levelIndex}-${state.correctAnswers}`,
      type: "boss",
      configKey: bossKey,
      name: bossDefinition.name,
      title: bossDefinition.title,
      definition: bossDefinition,
      x: pos.x,
      y: pos.y,
      radius: 9.6,
      collisionRadius: bossDefinition.collisionRadius,
      speed,
      direction: "down",
      turnDirection: "down",
      color: bossDefinition.accent,
      pathCooldown: 0,
      spawnProgress: 0,
      wobble: 0,
      stuckTime: 0,
      walkCycle: 0,
      lastMoveDistance: 0,
      turnAnimation: 0,
      trail: []
    };
    state.bossIntro = { life: 1.15, maxLife: 1.15 };
    state.shake = Math.max(state.shake, 0.42);
    if (state.player) {
      state.player.invulnerable = Math.max(state.player.invulnerable, 0.9);
    }

    addBurst(pos.x, pos.y, bossDefinition.accent, 66, 185);
    addFloatingText(pos.x, pos.y - 50, `${bossDefinition.name} התעורר`, bossDefinition.accent);
    seedBossChallengeCollectible();
    playTone(128, 0.18, "sawtooth", 0.042);
    playTone(242, 0.12, "triangle", 0.035);
  }

  function enterLevel(levelIndex, options = {}) {
    state.levelIndex = clamp(levelIndex, 0, CONFIG.levels.length - 1);
    state.maze = createMaze(state.levelIndex);
    const reachability = computeReachable(PLAYER_START);
    state.reachable = reachability.reachable;
    state.reachableList = reachability.list;
    state.player = createPlayer();
    state.enemies = [];
    state.boss = null;
    state.bossIntro = null;
    state.finalBossExplosion = null;
    state.hazards = [];
    state.nextHazardAt = state.clock + 6 + Math.random() * 4;
    state.pendingSpawns = [];
    state.mazeScatterDecor = [];
    state.mazeScatterSignature = null;
    state.mazeScatterSeed = null;
    state.particles = [];
    state.floatingTexts = [];
    state.arcadeRewardBanner = null;
    state.nextPowerCollectibleAt = 0;
    seedCollectibles();
    seedBackdrop();

    if (!state.visualVerificationMode) {
      const minEnemies = getRequiredEnemyCount();
      for (let i = 0; i < minEnemies; i += 1) {
        spawnEnemy(i);
      }
    }

    prepareMazeScatterDecor(true);

    if (options.announce) {
      state.player.invulnerable = 2.4;
      showLevelBanner(options.awardedLife);
      playUiMotion(stage, "worldTransition");
      addBurst(state.player.x, state.player.y, getCurrentLevel().accent, 42, 145);
      if (options.awardedLife) {
        addFloatingText(state.player.x, state.player.y - 28, "+חיים", "#ff5f9f");
      }
    }

    updateHud();
  }

  function setupGame() {
    clearQuestionFeedbackTimer();
    state.clock = 0;
    state.lastTime = performance.now();
    state.levelIndex = 0;
    state.levelBanner = null;
    state.scoreState = SYSTEMS.createScoreState();
    state.comboState = SYSTEMS.createComboState();
    state.score = 0;
    state.combo = 0;
    state.lives = getDifficultySettings().initialLives || CONFIG.initialLives;
    state.correctAnswers = 0;
    state.incorrectAnswers = 0;
    state.mathStats = SYSTEMS.createMathStats();
    state.recentQuestionKeys = [];
    state.question = null;
    state.questionStartedAt = null;
    state.questionTimeRemaining = null;
    state.questionDeadline = null;
    state.currentEnemyId = null;
    state.questionSource = null;
    state.boss = null;
    state.bossIntro = null;
    state.finalBossExplosion = null;
    state.hazards = [];
    state.nextHazardAt = 0;
    state.answerLocked = false;
    state.nextEnemyId = 1;
    state.shake = 0;
    state.fireworkTimer = 0;
    state.nextPowerCollectibleAt = 0;
    state.arcadeRewardBanner = null;
    state.arcadeBonus = createArcadeBonusState();
    if (state.victoryEndTimerId) {
      window.clearTimeout(state.victoryEndTimerId);
      state.victoryEndTimerId = null;
    }
    state.sessionStartedAt = performance.now();
    state.hitsTaken = 0;
    state.finalResult = null;
    state.latestLeaderboardEntryId = null;
    resetHudSnapshot();
    assignMission();
    enterLevel(0);

    updateHud();
    if (state.phase === "playing") {
      els.answerInput.blur();
      stage.focus({ preventScroll: true });
    }
  }

  function seedBackdrop() {
    const phonePortrait = isPhonePortraitView();
    const decorationCount = phonePortrait
      ? (MOBILE_RUNTIME.reducedEffects ? 8 : 14)
      : MOBILE_RUNTIME.coarse
      ? (MOBILE_RUNTIME.reducedEffects ? 18 : 34)
      : (MOBILE_RUNTIME.reducedEffects ? 32 : 58);
    state.backdropStars = Array.from({ length: decorationCount }, (_, index) => ({
      x: (index * 137.31) % WIDTH,
      y: (index * 91.77) % HEIGHT,
      size: 0.6 + ((index * 17) % 10) / 13,
      phase: (index * 0.73) % (Math.PI * 2)
    }));
  }

  function getMazeScatterImportantCells() {
    const cells = [
      CENTER_CELL,
      { x: CENTER_CELL.x - 2, y: CENTER_CELL.y },
      { x: CENTER_CELL.x + 2, y: CENTER_CELL.y },
      { x: CENTER_CELL.x, y: CENTER_CELL.y - 2 },
      { x: CENTER_CELL.x, y: CENTER_CELL.y + 2 },
      { x: 18, y: 24 },
      { x: 20, y: 24 },
      { x: 22, y: 24 },
      { x: 18, y: 27 },
      { x: 20, y: 27 },
      { x: 22, y: 27 }
    ];

    for (let index = 0; index < 4; index += 1) {
      cells.push(scatterCornerFor(index));
    }

    for (const cell of AMBUSH_CELLS) {
      cells.push(cell);
    }

    return cells;
  }

  function getMazeScatterCollectibleCells() {
    return Array.from(state.collectibles.values()).map((collectible) => toCell(collectible.x, collectible.y));
  }

  function getMazeScatterSignature() {
    if (!MAZE_DECOR_SYSTEM || !state.maze.length) {
      return null;
    }
    const worldId = getMazeWorldKey();
    const mazeSignature = MAZE_DECOR_SYSTEM.createMazeSignature?.(state.maze) || "no-maze";
    const phoneKey = isPhonePortraitView() ? "phone" : "wide";
    const effectsKey = MOBILE_RUNTIME.reducedEffects ? "reduced" : "full";
    const visualProfile = getMazeMobileVisualProfile();
    return `${worldId}:${state.levelIndex}:${mazeSignature}:${phoneKey}:${effectsKey}:${visualProfile.key}:${visualProfile.decorDensityScale}`;
  }

  function prepareMazeScatterDecor(force = false) {
    if (!MAZE_DECOR_SYSTEM || !state.maze.length) {
      state.mazeScatterDecor = [];
      state.mazeScatterSignature = null;
      state.mazeScatterSeed = null;
      return;
    }

    const signature = getMazeScatterSignature();
    if (!force && signature && signature === state.mazeScatterSignature) {
      return;
    }

    const result = MAZE_DECOR_SYSTEM.generateScatter({
      maze: state.maze,
      worldId: getMazeWorldKey(),
      levelIndex: state.levelIndex,
      cols: COLS,
      rows: ROWS,
      playerStart: PLAYER_START,
      enemyStartCells: [],
      importantCells: getMazeScatterImportantCells(),
      collectibleCells: [],
      densityScale: MAZE_SCATTER_DENSITY_SCALE * getMazeMobileVisualProfile().decorDensityScale,
      phonePortrait: isPhonePortraitView(),
      reducedEffects: MOBILE_RUNTIME.reducedEffects
    });

    state.mazeScatterDecor = result.items || [];
    state.mazeScatterSignature = signature || result.signature;
    state.mazeScatterSeed = result.seed;
  }

  function showLevelBanner(awardedLife = false) {
    const level = getCurrentLevel();
    const nextGoal = Math.min(CONFIG.targetCorrect, (state.levelIndex + 1) * CONFIG.answersPerLevel);
    state.levelBanner = {
      title: level.intro,
      subtitle: awardedLife
        ? `עוד עולם נפתח, וקיבלת חיים. היעד הבא: ${nextGoal} תשובות`
        : `היעד הבא: ${nextGoal} תשובות נכונות`,
      color: level.accent,
      life: 2.25,
      maxLife: 2.25
    };
    playMissionSound();
  }

  function updateLevelBanner(dt) {
    if (!state.levelBanner) {
      return;
    }

    state.levelBanner.life -= dt;
    if (state.levelBanner.life <= 0) {
      state.levelBanner = null;
    }
  }

  function normalizePlayerName(value) {
    return SYSTEMS.validateNickname(value);
  }

  function persistSave() {
    state.save.player.nickname = SYSTEMS.safeNickname(state.playerName || els.playerNameInput.value || state.save.player.nickname);
    state.save.settings.selectedCharacter = state.characterId;
    state.save.settings.selectedDifficulty = state.difficulty;
    state.save.settings.selectedMode = state.mode;
    state.save.settings.soundEnabled = state.soundEnabled;
    state.save.settings.timeLimitEnabled = state.timeLimitEnabled;
    state.save.settings.controlMode = state.controlMode;
    state.save.settings.language = state.language;
    SYSTEMS.persistSave(window.localStorage, state.save, { key: CONFIG.storageKeys.save });
  }

  function updateBestScorePreview() {
    state.bestScore = getPersonalBestForSelection();
    if (els.bestScore) {
      els.bestScore.textContent = numberFormat.format(state.bestScore);
    }
    if (els.menuPersonalBest) {
      els.menuPersonalBest.textContent = numberFormat.format(state.bestScore);
    }
  }

  function characterLabel(characterId = state.characterId) {
    const normalized = normalizeCharacterId(characterId);
    return getUiCopy().characters[normalized] || PLAYER_CHARACTERS[normalized]?.name || "ביפלי";
  }

  function scoreMultiplierLabel(difficulty = getDifficultySettings()) {
    const multiplier = Math.max(0, Number(difficulty.scoreMultiplierPct) || 100) / 100;
    return `×${Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(1)}`;
  }

  function modeRuleText(modeId = state.mode) {
    return modeCopy(modeId).rule;
  }

  function difficultyRuleText(difficulty = getDifficultySettings()) {
    const runtime = getUiCopy().runtime;
    return state.language === "en"
      ? `${difficulty.answerTimeLimit} ${runtime.secondsPerQuestion} · ${difficulty.initialLives} ${runtime.lives}`
      : `${difficulty.answerTimeLimit} ${runtime.secondsPerQuestion} · ${difficulty.initialLives} ${runtime.lives}`;
  }

  function getUnlockedDifficultyLabels() {
    const unlocked = state.save.unlockedDifficulties || [];
    return unlocked
      .map((difficultyId) => difficultyLabel(difficultyId))
      .filter(Boolean)
      .join(", ");
  }

  function updatePregamePanel() {
    const mode = getModeSettings();
    const difficulty = getDifficultySettings();
    if (els.pregameCharacterLabel) {
      els.pregameCharacterLabel.textContent = characterLabel();
    }
    if (els.pregameModeLabel) {
      els.pregameModeLabel.textContent = modeLabel(mode.id);
    }
    if (els.pregameDifficultyLabel) {
      els.pregameDifficultyLabel.textContent = `${difficultyLabel(difficulty.id)} ${scoreMultiplierLabel(difficulty)}`;
    }
    if (els.pregameMultiplierLabel) {
      els.pregameMultiplierLabel.textContent = scoreMultiplierLabel(difficulty);
    }
    if (els.pregameRuleCopy) {
      els.pregameRuleCopy.textContent = modeRuleText(mode.id);
    }
    if (els.pregameImportantRule) {
      els.pregameImportantRule.textContent = difficultyRuleText(difficulty);
    }
  }

  function updateProgressPanel() {
    if (els.progressUnlockedDifficulties) {
      els.progressUnlockedDifficulties.textContent = getUnlockedDifficultyLabels() || difficultyLabel("normal");
    }
    if (els.progressCurrentBest) {
      els.progressCurrentBest.textContent = numberFormat.format(getPersonalBestForSelection());
    }
    if (!els.progressBestList) {
      return;
    }

    const bests = Object.values(state.save.personalBests || {})
      .filter((entry) => entry && Number(entry.score) > 0)
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 8);

    els.progressBestList.replaceChildren();
    if (!bests.length) {
      const empty = document.createElement("li");
      empty.className = "progress-empty";
      empty.textContent = uiRuntime("noSavedScores");
      els.progressBestList.append(empty);
      return;
    }

    bests.forEach((entry) => {
      const item = document.createElement("li");
      const title = document.createElement("span");
      const score = document.createElement("strong");
      const detail = document.createElement("small");
      title.textContent = `${modeLabel(entry.mode)} · ${difficultyLabel(entry.difficulty)}`;
      score.textContent = numberFormat.format(entry.score);
      detail.textContent = formatTemplate(uiRuntime("progressDetail"), {
        stage: entry.reachedStage || 1,
        accuracy: entry.accuracy || 0,
        combo: entry.maxCombo || 0
      });
      item.append(title, score, detail);
      els.progressBestList.append(item);
    });
  }

  function updateDifficultyLockCopy() {
    const lockedLegendary = els.difficultyInputs.find((input) => input.value === "legendary");
    const copy = lockedLegendary?.closest("label")?.querySelector(".difficulty-lock-copy");
    if (!copy) {
      return;
    }
    copy.textContent = SYSTEMS.isDifficultyUnlocked(state.save, "legendary")
      ? uiRuntime("unlocked")
      : uiRuntime("lockedLegendary");
  }

  function updatePlayerGreeting() {
    if (!els.playerGreeting) {
      return;
    }
    els.playerGreeting.textContent = SYSTEMS.safeNickname(state.playerName || state.save.player.nickname);
  }

  function updateMenuLeaderboardPreview() {
    if (!els.menuRankValue && !els.menuNextRank && !els.menuPersonalBest) {
      return;
    }

    const mode = state.mode;
    const difficulty = state.difficulty;
    const personalBest = getPersonalBestForSelection(mode, difficulty);
    const entries = SYSTEMS.getLeaderboardEntries(state.save, {
      mode,
      difficulty,
      limit: CONFIG.leaderboard.limit
    });
    const playerEntryIndex = entries.findIndex((entry) => (
      entry.playerId === state.playerId
      || (entry.nickname === state.playerName && entry.score === personalBest)
      || entry.id === state.latestLeaderboardEntryId
    ));
    const playerEntry = playerEntryIndex >= 0 ? entries[playerEntryIndex] : null;
    const rank = playerEntryIndex >= 0 ? playerEntryIndex + 1 : null;

    if (els.menuPersonalBest) {
      els.menuPersonalBest.textContent = numberFormat.format(personalBest);
    }
    if (els.menuRankValue) {
      els.menuRankValue.textContent = rank ? String(rank) : "חדש";
    }
    if (!els.menuNextRank) {
      return;
    }

    if (!entries.length) {
      els.menuNextRank.textContent = uiRuntime("noCategoryRank");
      return;
    }
    if (!playerEntry) {
      els.menuNextRank.textContent = personalBest > 0
        ? uiRuntime("saveRoundForRank")
        : uiRuntime("firstRoundRank");
      return;
    }
    if (rank === 1) {
      els.menuNextRank.textContent = uiRuntime("categoryLeader");
      return;
    }

    const nextScore = entries[playerEntryIndex - 1]?.score || playerEntry.score;
    const needed = Math.max(1, nextScore - playerEntry.score + 1);
    els.menuNextRank.textContent = formatTemplate(uiRuntime("pointsToRank"), {
      points: numberFormat.format(needed),
      rank: rank - 1
    });
  }

  function getHeroGalleryCopy(characterId) {
    const normalized = normalizeCharacterId(characterId);
    return HERO_GALLERY_COPY[normalized] || HERO_GALLERY_COPY.bifly;
  }

  function getCharacterReactionLine(characterId, reaction = "idle") {
    const normalized = normalizeCharacterId(characterId);
    const reactions = CHARACTER_REACTIONS[normalized] || CHARACTER_REACTIONS.bifly;
    return reactions[reaction] || reactions.idle;
  }

  function getCharacterExpressionSource(characterId, reaction = "idle") {
    const normalized = normalizeCharacterId(characterId);
    const character = PLAYER_CHARACTERS[normalized] || PLAYER_CHARACTERS.bifly;
    const sources = character.expressionSources || character.spriteSources || {};
    const normalizedReaction = reaction === "tap"
      ? "blink"
      : reaction === "defeat"
        ? "hit"
        : reaction;
    return sources[normalizedReaction] || sources.idle || character.spriteSources?.idle || "";
  }

  function syncHomeCharacterReactions(activeReaction = "idle") {
    for (const card of els.homeCharacterCards || []) {
      const input = card.querySelector("input[name='character']");
      const characterId = normalizeCharacterId(input?.value || "bifly");
      const characterCard = card.querySelector(".character-card");
      const characterImage = card.querySelector("img[data-character-state]");
      const isSelected = characterId === state.characterId;
      const renderReaction = isSelected ? activeReaction : "idle";
      card.classList.toggle("is-character-live", isSelected);
      if (characterCard) {
        characterCard.dataset.reaction = renderReaction;
        characterCard.dataset.characterLine = getCharacterReactionLine(
          characterId,
          renderReaction
        );
      }
      if (characterImage) {
        characterImage.src = getCharacterExpressionSource(characterId, renderReaction);
        characterImage.dataset.characterState = renderReaction;
        characterImage.dataset.assetPipeline = "character-sheet";
      }
    }
  }

  function playHomeCharacterReaction(characterId = state.characterId, reaction = "selected", options = {}) {
    const normalized = normalizeCharacterId(characterId);
    window.clearTimeout(state.homeCharacterReactionTimerId);
    state.homeCharacterReactionToken += 1;
    const reactionToken = state.homeCharacterReactionToken;
    for (const card of els.homeCharacterCards || []) {
      const input = card.querySelector("input[name='character']");
      const characterCard = card.querySelector(".character-card");
      const characterImage = card.querySelector("img[data-character-state]");
      const isTarget = normalizeCharacterId(input?.value || "bifly") === normalized;
      card.classList.toggle("is-character-reacting", isTarget);
      if (characterCard && isTarget) {
        characterCard.dataset.reaction = reaction;
        characterCard.dataset.characterLine = getCharacterReactionLine(normalized, reaction);
      }
      if (characterImage && isTarget) {
        characterImage.src = getCharacterExpressionSource(normalized, reaction);
        characterImage.dataset.characterState = reaction;
        characterImage.dataset.assetPipeline = "character-sheet";
      }
    }
    const duration = Math.max(260, Number(options.duration) || (reaction === "blink" ? 520 : 1500));
    state.homeCharacterReactionTimerId = window.setTimeout(() => {
      if (reactionToken !== state.homeCharacterReactionToken) {
        return;
      }
      for (const card of els.homeCharacterCards || []) {
        card.classList.remove("is-character-reacting");
      }
      syncHomeCharacterReactions("idle");
      state.homeCharacterReactionTimerId = null;
    }, duration);
  }

  function scheduleHomeCharacterIdleActing() {
    window.clearTimeout(state.homeCharacterIdleTimerId);
    const delay = 2800 + Math.random() * 2600;
    state.homeCharacterIdleTimerId = window.setTimeout(() => {
      if (state.phase === "start" && !document.hidden) {
        playHomeCharacterReaction(state.characterId, "blink", { duration: 460 });
      }
      scheduleHomeCharacterIdleActing();
    }, delay);
  }

  function getCharacterStoredBest(characterId) {
    const normalized = normalizeCharacterId(characterId);
    const entries = Array.isArray(state.save?.leaderboardEntries) ? state.save.leaderboardEntries : [];
    return entries.reduce((best, entry) => {
      if (normalizeCharacterId(entry?.selectedCharacter || entry?.characterId) !== normalized) {
        return best;
      }
      return Math.max(best, Math.max(0, Math.floor(Number(entry.score) || 0)));
    }, 0);
  }

  function heroGalleryStatusText(characterId) {
    const name = characterLabel(characterId);
    return characterId === state.characterId
      ? `${name} נבחר למשחק.`
      : `אפשר לבחור את ${name} למשחק הבא.`;
  }

  function renderHeroGalleryCharacter(renderState = "idle") {
    if (!els.heroGallery || !els.heroAnimationMount) {
      return;
    }

    const characterId = normalizeCharacterId(state.heroGalleryCharacterId || state.characterId);
    const copy = getHeroGalleryCopy(characterId);
    const name = characterLabel(characterId);
    const adapter = window.KaflulCharacterAnimationAdapter;
    const resolved = adapter?.render(els.heroAnimationMount, {
      characterId,
      state: renderState,
      alt: ""
    });
    const supportedStates = adapter?.getSupportedStates(characterId, "static-png") || ["idle"];
    const missingStates = adapter?.getMissingStates(characterId, "static-png") || [];
    const characterBest = getCharacterStoredBest(characterId);
    const isSelected = characterId === state.characterId;

    els.heroGallery.dataset.galleryCharacter = characterId;
    els.heroGalleryCard?.setAttribute("data-preview-character", characterId);
    els.heroGalleryCard?.setAttribute("data-reaction", renderState);
    els.heroGalleryCard?.setAttribute("data-character-line", getCharacterReactionLine(characterId, renderState));
    if (els.heroGalleryName) els.heroGalleryName.textContent = name;
    if (els.heroGalleryDescription) els.heroGalleryDescription.textContent = copy.description;
    if (els.heroGalleryStyle) els.heroGalleryStyle.textContent = copy.style;
    if (els.heroGalleryBest) {
      els.heroGalleryBest.textContent = characterBest > 0
        ? `שיא שמור: ${numberFormat.format(characterBest)}`
        : "אין עדיין שיא לדמות הזאת";
    }
    if (els.heroGalleryStatus) els.heroGalleryStatus.textContent = heroGalleryStatusText(characterId);
    if (els.heroGalleryAssetNote) {
      const renderedState = resolved?.renderedState || "idle";
      const fallbackText = resolved?.usedFallback ? " · fallback סטטי" : "";
      const missingCount = missingStates.length;
      els.heroGalleryAssetNote.textContent = `${copy.assetNote} מצב מוצג: ${renderedState}. חסרים ${missingCount} מצבי אנימציה${fallbackText}`;
    }
    if (els.heroGallerySelect) {
      els.heroGallerySelect.setAttribute("aria-pressed", isSelected ? "true" : "false");
      els.heroGallerySelect.dataset.selected = isSelected ? "true" : "false";
    }
    if (els.heroGallerySelectLabel) {
      els.heroGallerySelectLabel.textContent = isSelected ? `${name} נבחר` : `בחר את ${name}`;
    }
    if (els.heroAnimationMount) {
      els.heroAnimationMount.dataset.supportedStates = supportedStates.join(" ");
    }
  }

  function browseHeroGallery(offset) {
    const current = normalizeCharacterId(state.heroGalleryCharacterId || state.characterId);
    const currentIndex = HERO_GALLERY_ORDER.indexOf(current);
    const nextIndex = (currentIndex + offset + HERO_GALLERY_ORDER.length) % HERO_GALLERY_ORDER.length;
    state.heroGalleryCharacterId = HERO_GALLERY_ORDER[nextIndex];
    renderHeroGalleryCharacter("idle");
    playUiMotion(els.heroGalleryCard, "tabChange");
    playUiSound("tabChange");
    window.setTimeout(() => els.heroGallerySelect?.focus({ preventScroll: true }), 0);
  }

  function closeHeroGallery(options = {}) {
    if (!els.heroGallery || els.heroGallery.hidden) {
      return;
    }
    const { restoreFocus = true } = options;
    hideWithMotion(els.heroGallery, "screenExit");
    els.playerForm.classList.remove("hero-gallery-open");
    els.characterControlButton?.setAttribute("aria-expanded", "false");
    playUiSound("panelClose");
    if (state.heroGalleryReactionTimerId) {
      window.clearTimeout(state.heroGalleryReactionTimerId);
      state.heroGalleryReactionTimerId = null;
    }
    state.heroGalleryReactionToken += 1;
    state.heroGallerySwipeStart = null;
    setHomeNavActive(els.homeNavGame);
    if (restoreFocus && state.lastFocusBeforeHeroGallery instanceof HTMLElement) {
      state.lastFocusBeforeHeroGallery.focus({ preventScroll: true });
    }
    state.lastFocusBeforeHeroGallery = null;
  }

  function openHeroGallery(characterId = state.characterId, trigger = document.activeElement) {
    if (!els.heroGallery) {
      focusSelectedCharacter();
      return;
    }
    closeMenuSheets({ restoreFocus: false, sound: false });
    state.lastFocusBeforeHeroGallery = trigger;
    state.heroGalleryCharacterId = normalizeCharacterId(characterId);
    showWithMotion(els.heroGallery, "screenEnter");
    els.playerForm.classList.add("hero-gallery-open");
    els.characterControlButton?.setAttribute("aria-expanded", "true");
    setHomeNavActive(els.homeNavCharacters);
    renderHeroGalleryCharacter("idle");
    playUiSound("panelOpen");
    window.setTimeout(() => els.heroGallerySelect?.focus({ preventScroll: true }), 0);
  }

  function confirmHeroGallerySelection() {
    const characterId = normalizeCharacterId(state.heroGalleryCharacterId || state.characterId);
    const selectedChanged = characterId !== state.characterId;
    setCharacter(characterId);
    els.heroGalleryCard?.classList.add("is-confirming");
    renderHeroGalleryCharacter("selected");
    playUiMotion(els.heroGalleryCard, "characterSelect", {
      particles: selectedChanged ? { count: 8, color: "var(--kf-color-gold, #ffd84a)" } : false
    });
    playUiSound("characterSelected");
    window.setTimeout(() => {
      els.heroGalleryCard?.classList.remove("is-confirming");
      renderHeroGalleryCharacter("idle");
    }, 620);
  }

  function reactToHeroGalleryTap() {
    if (!els.heroGalleryCard) {
      return;
    }
    els.heroGalleryCard.classList.remove("is-reacting");
    void els.heroGalleryCard.offsetWidth;
    els.heroGalleryCard.classList.add("is-reacting");
    renderHeroGalleryCharacter("tap");
    playUiMotion(els.heroGalleryCard, "characterTap");
    if (state.heroGalleryReactionTimerId) {
      window.clearTimeout(state.heroGalleryReactionTimerId);
    }
    state.heroGalleryReactionToken += 1;
    const reactionToken = state.heroGalleryReactionToken;
    state.heroGalleryReactionTimerId = window.setTimeout(() => {
      if (reactionToken !== state.heroGalleryReactionToken) {
        return;
      }
      els.heroGalleryCard?.classList.remove("is-reacting");
      renderHeroGalleryCharacter("idle");
      state.heroGalleryReactionTimerId = null;
    }, 1500);
  }

  function handleHeroGalleryKeydown(event) {
    if (!els.heroGallery || els.heroGallery.hidden) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      browseHeroGallery(1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      browseHeroGallery(-1);
    } else if (event.key === "Enter" || event.key === " ") {
      const interactiveTarget = event.target?.closest?.("button, input, select, textarea, a");
      if (!interactiveTarget || interactiveTarget === els.heroGallerySelect) {
        event.preventDefault();
        confirmHeroGallerySelection();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeHeroGallery();
    }
  }

  function handleHeroGalleryPointerDown(event) {
    if (!els.heroGallery || els.heroGallery.hidden) {
      return;
    }
    state.heroGallerySwipeStart = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now()
    };
  }

  function handleHeroGalleryPointerUp(event) {
    const start = state.heroGallerySwipeStart;
    state.heroGallerySwipeStart = null;
    if (!start || !els.heroGallery || els.heroGallery.hidden) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = performance.now() - start.time;
    if (elapsed > 900 || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) {
      return;
    }
    browseHeroGallery(dx < 0 ? 1 : -1);
  }

  function handleHeroGalleryTouchStart(event) {
    const touch = event.changedTouches?.[0];
    if (!touch) {
      return;
    }
    handleHeroGalleryPointerDown({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  }

  function handleHeroGalleryTouchEnd(event) {
    const touch = event.changedTouches?.[0];
    if (!touch) {
      return;
    }
    handleHeroGalleryPointerUp({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  }

  function syncMenuSummary() {
    const mode = getModeSettings();
    const difficulty = getDifficultySettings();
    if (els.selectedModeLabel) {
      els.selectedModeLabel.textContent = modeLabel(mode.id);
    }
    if (els.selectedDifficultyLabel) {
      els.selectedDifficultyLabel.textContent = difficultyLabel(difficulty.id);
    }
    if (els.homeDifficultyLabel) {
      els.homeDifficultyLabel.textContent = `${difficultyLabel(difficulty.id)} ${scoreMultiplierLabel(difficulty)}`;
    }
    if (els.homeModeLabel) {
      els.homeModeLabel.textContent = modeLabel(mode.id);
    }
    if (els.selectedCharacterLabel) {
      els.selectedCharacterLabel.textContent = characterLabel();
    }
    if (els.menuSelectionSummary) {
      els.menuSelectionSummary.textContent = "";
      els.menuSelectionSummary.hidden = true;
    }
    if (els.settingsSelectionSummary) {
      els.settingsSelectionSummary.textContent = `${characterLabel()} · ${difficultyLabel(difficulty.id)} ${scoreMultiplierLabel(difficulty)} · ${modeLabel(mode.id)}`;
    }
    updatePlayerGreeting();
    updateBestScorePreview();
    updateMenuLeaderboardPreview();
    updatePregamePanel();
    updateProgressPanel();
    updatePauseScreen();
  }

  function getSelectedMode() {
    const selected = els.modeInputs.find((input) => input.checked);
    return normalizeGameMode(selected?.value || state.mode);
  }

  function setMode(value, persist = true) {
    state.mode = normalizeGameMode(value);
    if (persist) {
      storage.set(CONFIG.storageKeys.mode, state.mode);
      persistSave();
    }
    syncModeInputs();
    syncTimeLimitToggle();
    syncMenuSummary();
  }

  function syncModeInputs() {
    for (const input of els.modeInputs) {
      input.checked = input.value === state.mode;
    }
  }

  function getSelectedCharacterId() {
    const selected = els.characterInputs.find((input) => input.checked);
    return normalizeCharacterId(selected?.value || state.characterId);
  }

  function setCharacter(value, persist = true) {
    const nextCharacterId = normalizeCharacterId(value);
    const changed = state.characterId !== nextCharacterId;
    state.characterId = nextCharacterId;
    if (persist && changed) {
      storage.set(CONFIG.storageKeys.character, state.characterId);
      persistSave();
    }
    document.documentElement.dataset.character = state.characterId;
    syncCharacterInputs();
    syncMenuSummary();
    syncHomeCharacterReactions("idle");
    if (changed && persist) {
      playHomeCharacterReaction(state.characterId, "selected");
    }
    if (els.heroGallery && !els.heroGallery.hidden) {
      state.heroGalleryCharacterId = state.characterId;
      renderHeroGalleryCharacter(changed ? "selected" : "idle");
    }
  }

  function syncCharacterInputs() {
    for (const input of els.characterInputs) {
      input.checked = input.value === state.characterId;
    }
  }

  function getSelectedDifficulty() {
    const selected = els.difficultyInputs.find((input) => input.checked);
    return normalizeDifficulty(selected?.value || state.difficulty);
  }

  function setDifficulty(value, persist = true) {
    const nextDifficulty = normalizeDifficulty(value);
    state.difficulty = SYSTEMS.isDifficultyUnlocked(state.save, nextDifficulty) ? nextDifficulty : "normal";
    state.timeLimitEnabled = true;
    if (persist) {
      storage.set(CONFIG.storageKeys.difficulty, state.difficulty);
      persistSave();
    }
    syncDifficultyInputs();
    syncMenuSummary();
  }

  function syncDifficultyInputs() {
    for (const input of els.difficultyInputs) {
      const isLocked = input.value === "legendary" && !SYSTEMS.isDifficultyUnlocked(state.save, "legendary");
      input.disabled = isLocked;
      input.closest("label")?.classList.toggle("difficulty-locked", isLocked);
      input.closest("label")?.setAttribute("title", isLocked ? SYSTEMS.LEGENDARY_UNLOCK_RULE.label : "");
      input.checked = input.value === state.difficulty;
    }
    updateDifficultyLockCopy();
  }

  function setControlMode(value, persist = true) {
    const nextMode = normalizeControlMode(value);
    const changed = state.controlMode !== nextMode;
    state.controlMode = nextMode;
    if (persist) {
      storage.set(CONFIG.storageKeys.controlMode, state.controlMode);
      persistSave();
    }
    syncControlModeInputs();
    applyControlModeClasses();
    if (changed && nextMode === "swipe") {
      resetJoystick();
    }
  }

  function syncControlModeInputs() {
    for (const input of els.controlModeInputs) {
      input.checked = normalizeControlMode(input.value) === state.controlMode;
    }
  }

  function applyControlModeClasses() {
    const root = document.documentElement;
    root.classList.toggle("control-joystick", state.controlMode === "joystick");
    root.classList.toggle("control-swipe", state.controlMode === "swipe");
    root.dataset.controlMode = state.controlMode;
    window.dispatchEvent(new CustomEvent("kaflul:control-mode-change", {
      detail: { controlMode: state.controlMode }
    }));
  }

  function setLanguage(value, persist = true) {
    state.language = normalizeLanguage(value);
    if (persist) {
      storage.set(CONFIG.storageKeys.language, state.language);
      persistSave();
    }
    syncLanguageInputs();
    applyLanguageCopy();
    syncTimeLimitToggle();
    syncMenuSummary();
    if (state.phase !== "start" || state.mission) {
      updateHud();
    }
    if (!els.questionDialog.hidden) {
      updateQuestionLanguageCopy();
      updateQuestionTimerDisplay();
    }
  }

  function syncLanguageInputs() {
    for (const input of els.languageInputs) {
      input.checked = normalizeLanguage(input.value) === state.language;
    }
  }

  function setHomeNavActive(activeButton) {
    for (const button of els.homeNavButtons) {
      if (button === activeButton) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    }
  }

  function pulseHomeElement(element) {
    if (!element) {
      return;
    }
    element.classList.remove("home-focus-pulse");
    // Reflow intentionally restarts the short focus pulse for repeated taps.
    void element.offsetWidth;
    element.classList.add("home-focus-pulse");
    window.setTimeout(() => element.classList.remove("home-focus-pulse"), 520);
  }

  function focusSelectedCharacter() {
    const selectedInput = els.characterInputs.find((input) => input.checked) || els.characterInputs[0];
    const selectedLabel = selectedInput?.closest(".menu-character");
    selectedInput?.focus({ preventScroll: true });
    pulseHomeElement(selectedLabel);
    setHomeNavActive(els.homeNavCharacters);
  }

  function focusHomeProgress() {
    openProgressPanel(els.homeNavProgress || els.homeProgressButton || els.homeProgressCard);
  }

  function focusHomeGameAction() {
    setHomeNavActive(els.homeNavGame);
    pulseHomeElement(els.startButton);
    els.startButton?.focus({ preventScroll: true });
  }

  function setTimeLimitEnabled(enabled, persist = true) {
    state.timeLimitEnabled = Boolean(enabled);
    if (persist) {
      storage.set(CONFIG.storageKeys.timeLimit, state.timeLimitEnabled ? "on" : "off");
      persistSave();
    }
    syncTimeLimitToggle();
  }

  function toggleTimeLimit() {
    setTimeLimitEnabled(!state.timeLimitEnabled);
  }

  function syncTimeLimitToggle() {
    if (!els.timeLimitToggle || !els.timeLimitState) {
      return;
    }

    const enabled = state.timeLimitEnabled;
    els.timeLimitToggle.setAttribute("aria-pressed", String(enabled));
    els.timeLimitToggle.setAttribute(
      "aria-label",
      enabled
        ? (state.language === "en" ? "Turn off the question timer" : "בטל הגבלת זמן לכל תרגיל")
        : (state.language === "en" ? "Turn on the question timer" : "הפעל הגבלת זמן של 25 שניות לכל תרגיל")
    );
    els.timeLimitState.textContent = state.mode === "arcade"
      ? `${getQuestionTimeLimit()} ${uiRuntime("arcadeSeconds")}`
      : (enabled ? `${getQuestionTimeLimit()} ${uiRuntime("secondsPerQuestion")}` : uiRuntime("noTimeLimit"));
  }

  function getMenuSheetTriggers(sheet) {
    if (sheet === els.pregamePanel) {
      return [els.pregameOpenButton, els.homeNavGame, els.startButton].filter(Boolean);
    }
    if (sheet === els.modePanel) {
      return [els.modeControlButton, els.homeModeButton, els.pregameModeButton].filter(Boolean);
    }
    if (sheet === els.difficultyPanel) {
      return [els.difficultyControlButton, els.homeDifficultyButton, els.pregameDifficultyButton].filter(Boolean);
    }
    if (sheet === els.settingsPanel) {
      return [els.profileControlButton, els.menuSettingsButton].filter(Boolean);
    }
    if (sheet === els.progressPanel) {
      return [els.homeNavProgress, els.homeProgressButton, els.homeProgressCard].filter(Boolean);
    }
    return [];
  }

  function getMenuSheetTrigger(sheet) {
    return getMenuSheetTriggers(sheet)[0] || null;
  }

  const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  function getFocusableElements(container) {
    return Array.from(container?.querySelectorAll?.(FOCUSABLE_SELECTOR) || [])
      .filter((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }
        if (element.matches("input[type='radio']")) {
          return true;
        }
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
      });
  }

  function trapFocus(container, event) {
    if (event.key !== "Tab") {
      return;
    }
    const focusable = getFocusableElements(container);
    if (!focusable.length) {
      event.preventDefault();
      container?.focus?.({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const currentIndex = focusable.indexOf(document.activeElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex === -1 || document.activeElement === last ? 0 : currentIndex + 1);
    event.preventDefault();
    focusable[nextIndex].focus({ preventScroll: true });
  }

  function closeMenuSheets(options = {}) {
    const { restoreFocus = true, sound = true } = options;
    let closedAnySheet = false;
    for (const sheet of els.menuSheets) {
      const wasOpen = !sheet.hidden;
      if (wasOpen) {
        closedAnySheet = true;
        hideWithMotion(sheet, "sheetClose");
      } else {
        sheet.hidden = true;
      }
      for (const trigger of getMenuSheetTriggers(sheet)) {
        trigger.setAttribute("aria-expanded", "false");
      }
    }
    if (closedAnySheet && sound) {
      playUiSound("panelClose");
    }
    if (restoreFocus && state.lastFocusBeforeMenuSheet instanceof HTMLElement) {
      state.lastFocusBeforeMenuSheet.focus({ preventScroll: true });
    }
    state.lastFocusBeforeMenuSheet = null;
  }

  function focusMenuSheet(sheet) {
    const target = sheet.querySelector("[data-close-panel]")
      || sheet.querySelector("input:checked:not(:disabled)")
      || sheet.querySelector("input:not(:disabled)")
      || sheet.querySelector("button:not([data-close-panel])")
      || sheet;
    target?.focus({ preventScroll: true });
    window.setTimeout(() => target?.focus({ preventScroll: true }), 30);
  }

  function openMenuSheet(sheet, trigger) {
    if (!sheet) {
      return;
    }
    if (sheet === els.pregamePanel) {
      updatePregamePanel();
    }
    if (sheet === els.progressPanel) {
      updateProgressPanel();
    }
    state.lastFocusBeforeMenuSheet = trigger || document.activeElement;
    closeMenuSheets({ restoreFocus: false, sound: false });
    showWithMotion(sheet, "sheetOpen");
    for (const sheetTrigger of new Set([...getMenuSheetTriggers(sheet), trigger].filter(Boolean))) {
      sheetTrigger.setAttribute("aria-expanded", "true");
    }
    playUiSound("panelOpen");
    focusMenuSheet(sheet);
  }

  function openPregamePanel(trigger = els.pregameOpenButton) {
    closeHeroGallery({ restoreFocus: false });
    setHomeNavActive(els.homeNavGame);
    openMenuSheet(els.pregamePanel, trigger);
  }

  function openProgressPanel(trigger = els.homeNavProgress) {
    closeHeroGallery({ restoreFocus: false });
    setHomeNavActive(els.homeNavProgress);
    openMenuSheet(els.progressPanel, trigger);
  }

  function saveNicknameFromSettings() {
    const nickname = normalizePlayerName(els.playerNameInput.value);
    if (!nickname.ok) {
      els.nameError.textContent = nickname.error;
      els.playerNameInput.focus();
      return;
    }

    state.playerName = nickname.value;
    state.save.player.nickname = nickname.value;
    storage.set(CONFIG.storageKeys.nickname, nickname.value);
    persistSave();
    els.nameError.textContent = "";
    syncMenuSummary();
    closeMenuSheets();
  }

  function saveNicknameFromPause() {
    if (!els.pauseNameInput) {
      return;
    }
    const nickname = normalizePlayerName(els.pauseNameInput.value);
    if (!nickname.ok) {
      els.nameError.textContent = nickname.error;
      els.pauseNameInput.focus({ preventScroll: true });
      return;
    }

    state.playerName = nickname.value;
    state.save.player.nickname = nickname.value;
    storage.set(CONFIG.storageKeys.nickname, nickname.value);
    persistSave();
    els.playerNameInput.value = nickname.value;
    els.nameError.textContent = "";
    syncMenuSummary();
    updatePauseScreen();
    playUiMotion(els.pauseSaveNameButton, "badgeAppearance");
    playUiSound("notification");
  }

  function setLeaderboardStatus(message, isError = false) {
    if (!els.leaderboardStatus) {
      return;
    }

    els.leaderboardStatus.textContent = message;
    els.leaderboardStatus.style.color = isError ? "var(--red)" : "";
    if (els.leaderboardErrorState) {
      els.leaderboardErrorState.hidden = !isError;
    }
    if (isError && els.leaderboardEmptyState) {
      els.leaderboardEmptyState.hidden = true;
    }
  }

  function getPublicLeaderboardUi(eligible = false) {
    return SYSTEMS.getPublicLeaderboardUiState(state.publicLeaderboard.status, eligible);
  }

  function syncPublicLeaderboardUi(eligible = false) {
    const uiState = getPublicLeaderboardUi(eligible);

    if (els.leaderboardCopy) {
      els.leaderboardCopy.textContent = uiState.leaderboardCopy;
    }
    if (els.leaderboardPublicChip) {
      els.leaderboardPublicChip.textContent = uiState.publicChipText;
      els.leaderboardPublicChip.classList.toggle("is-unavailable", !uiState.publicAvailable);
    }

    if (els.publishScoreTitle) {
      els.publishScoreTitle.textContent = uiState.title;
    }
    if (els.publishScoreCopy) {
      els.publishScoreCopy.textContent = uiState.copy;
    }
    if (els.publishScoreButton) {
      els.publishScoreButton.disabled = uiState.buttonDisabled;
      els.publishScoreButton.textContent = uiState.buttonText;
    }
    if (els.publishScoreStatus) {
      els.publishScoreStatus.textContent = uiState.statusText;
      els.publishScoreStatus.style.color = uiState.publicAvailable ? "" : "var(--phase5-muted, #91a2ba)";
    }
    if (els.publishScorePanel) {
      els.publishScorePanel.hidden = uiState.panelHidden;
      els.publishScorePanel.classList.toggle("is-disabled", !uiState.publicAvailable);
    }
  }

  function setPublicLeaderboardStatus(status) {
    state.publicLeaderboard.status = status === "available" || status === "checking" ? status : "localOnly";
    state.publicLeaderboard.checked = state.publicLeaderboard.status !== "checking";
    syncPublicLeaderboardUi(state.phase === "ended" && state.correctAnswers >= CONFIG.leaderboard.minimumCorrectAnswers);
  }

  function checkPublicLeaderboardCapability() {
    if (state.publicLeaderboard.status === "available") {
      return Promise.resolve(true);
    }
    if (state.publicLeaderboard.checked && state.publicLeaderboard.status === "localOnly") {
      return Promise.resolve(false);
    }
    if (state.publicLeaderboard.promise) {
      return state.publicLeaderboard.promise;
    }

    setPublicLeaderboardStatus("checking");
    state.publicLeaderboard.promise = leaderboardRequest({
      method: "GET",
      endpoint: `${CONFIG.leaderboard.endpoint}?capability=1`
    })
      .then((payload) => {
        const isAvailable = payload?.publicAvailable === true || Array.isArray(payload?.scores);
        setPublicLeaderboardStatus(isAvailable ? "available" : "localOnly");
        return isAvailable;
      })
      .catch(() => {
        setPublicLeaderboardStatus("localOnly");
        return false;
      })
      .finally(() => {
        state.publicLeaderboard.promise = null;
      });

    return state.publicLeaderboard.promise;
  }

  function modeLabel(modeId) {
    return modeCopy(modeId).shortLabel;
  }

  function difficultyLabel(difficultyId) {
    return difficultyCopy(difficultyId).label;
  }

  function openLeaderboard() {
    if (!els.leaderboardDialog) {
      return;
    }

    state.lastFocusBeforeLeaderboard = document.activeElement;
    if (els.leaderboardModeFilter && !els.leaderboardModeFilter.value) {
      els.leaderboardModeFilter.value = state.mode;
    }
    if (els.leaderboardDifficultyFilter && !els.leaderboardDifficultyFilter.value) {
      els.leaderboardDifficultyFilter.value = state.difficulty;
    }
    showWithMotion(els.leaderboardDialog, "modalOpen");
    playUiSound("panelOpen");
    loadLeaderboard();
    window.setTimeout(() => els.leaderboardClose?.focus(), 0);
  }

  function closeLeaderboard() {
    if (!els.leaderboardDialog || els.leaderboardDialog.hidden) {
      return;
    }

    hideWithMotion(els.leaderboardDialog, "modalClose");
    playUiSound("panelClose");
    const focusTarget = state.lastFocusBeforeLeaderboard instanceof HTMLElement
      ? state.lastFocusBeforeLeaderboard
      : els.leaderboardOpen;
    focusTarget?.focus();
  }

  function renderLeaderboard(scores) {
    if (!els.leaderboardList) {
      return;
    }

    els.leaderboardList.replaceChildren();
    if (!Array.isArray(scores) || scores.length === 0) {
      const empty = document.createElement("li");
      empty.className = "leaderboard-placeholder";
      empty.textContent = "עדיין אין שיאים. אפשר להיות הראשון בטבלה.";
      els.leaderboardList.append(empty);
      if (els.leaderboardEmptyState) {
        els.leaderboardEmptyState.hidden = false;
      }
      return;
    }
    if (els.leaderboardEmptyState) {
      els.leaderboardEmptyState.hidden = true;
    }

    scores.slice(0, CONFIG.leaderboard.limit).forEach((entry, index) => {
      const item = document.createElement("li");
      const rank = document.createElement("span");
      const player = document.createElement("span");
      const details = document.createElement("small");
      const score = document.createElement("strong");
      const entryModeLabel = modeLabel(entry.mode || entry.gameMode);
      const entryDifficultyLabel = difficultyLabel(entry.difficulty);
      const stageLabel = (entry.mode || entry.gameMode) === "adventure" ? "שלב" : "גל";

      item.classList.toggle("is-current-player", entry.id === state.latestLeaderboardEntryId || entry.playerId === state.playerId);
      rank.className = "leaderboard-rank";
      rank.textContent = String(index + 1);
      player.className = "leaderboard-player";
      player.textContent = entry.nickname || entry.playerName;
      details.textContent = `${entryModeLabel} · ${entryDifficultyLabel} · ${stageLabel} ${entry.reachedStage || entry.levelReached || 1} · רצף ${entry.maxCombo || 0} · דיוק ${entry.accuracy || 0}%`;
      score.className = "leaderboard-score";
      score.textContent = numberFormat.format(entry.score);

      player.append(details);
      item.append(rank, player, score);
      els.leaderboardList.append(item);
    });
  }

  async function leaderboardRequest(options = {}) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CONFIG.leaderboard.requestTimeoutMs);
    const endpoint = options.endpoint || CONFIG.leaderboard.endpoint;
    const { endpoint: _endpoint, ...requestOptions } = options;

    try {
      const response = await fetch(endpoint, {
        ...requestOptions,
        headers: {
          Accept: "application/json",
          ...(requestOptions.headers || {})
        },
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(payload?.message || "Leaderboard request failed");
        error.code = payload?.code || "leaderboard_request_failed";
        throw error;
      }
      return payload;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function toRemoteDifficulty(difficultyId) {
    return {
      beginner: "easy",
      normal: "medium",
      advanced: "hard",
      expert: "veryHard",
      legendary: "veryHard"
    }[normalizeDifficulty(difficultyId)] || "medium";
  }

  async function loadLeaderboard() {
    if (!els.leaderboardList || state.leaderboardLoading) {
      return;
    }

    state.leaderboardLoading = true;
    if (els.leaderboardRefresh) {
      els.leaderboardRefresh.disabled = true;
    }
    if (els.leaderboardErrorState) {
      els.leaderboardErrorState.hidden = true;
    }
    setLeaderboardStatus("מרענן את הטבלה המקומית...");

    try {
      const entries = SYSTEMS.getLeaderboardEntries(state.save, {
        mode: els.leaderboardModeFilter?.value || "all",
        difficulty: els.leaderboardDifficultyFilter?.value || "all",
        limit: CONFIG.leaderboard.limit
      });
      renderLeaderboard(entries);
      setLeaderboardStatus(entries.length ? "הטבלה המקומית מעודכנת." : "עדיין אין שיאים בקטגוריה הזאת.");
    } catch {
      renderLeaderboard([]);
      setLeaderboardStatus("לא הצלחנו לרענן את הטבלה כרגע.", true);
    } finally {
      state.leaderboardLoading = false;
      if (els.leaderboardRefresh) {
        els.leaderboardRefresh.disabled = false;
      }
    }
  }

  function updatePublishScorePanel() {
    if (!els.publishScorePanel || !els.publishScoreButton || !els.publishScoreStatus) {
      return;
    }

    const eligible = state.correctAnswers >= CONFIG.leaderboard.minimumCorrectAnswers;
    syncPublicLeaderboardUi(eligible);
    if (eligible && state.publicLeaderboard.status === "localOnly") {
      checkPublicLeaderboardCapability();
    }
  }

  async function publishScore() {
    if (
      state.scorePublishing
      || state.phase !== "ended"
      || state.correctAnswers < CONFIG.leaderboard.minimumCorrectAnswers
    ) {
      return;
    }
    if (state.publicLeaderboard.status !== "available") {
      syncPublicLeaderboardUi(true);
      return;
    }

    state.scorePublishing = true;
    els.publishScoreButton.disabled = true;
    els.publishScoreButton.textContent = "מפרסם...";
    els.publishScoreStatus.textContent = "שומר את השיא בטבלה הציבורית...";
    els.publishScoreStatus.style.color = "";

    try {
      const payload = await leaderboardRequest({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId: state.playerId,
          playerName: state.playerName,
          score: state.score,
          correctAnswers: state.correctAnswers,
          levelReached: getLevelIndexForAnswers(state.correctAnswers) + 1,
          difficulty: toRemoteDifficulty(state.difficulty),
          timeLimitEnabled: state.timeLimitEnabled
        })
      });

      els.publishScoreButton.textContent = "השיא פורסם";
      els.publishScoreStatus.textContent = payload?.improved === false
        ? "השיא הקודם שלך בטבלה עדיין גבוה יותר."
        : "השיא נשמר בהצלחה באלוף האלופים.";
      els.publishScoreStatus.style.color = "var(--green)";
      await loadLeaderboard();
    } catch (error) {
      els.publishScoreButton.disabled = false;
      els.publishScoreButton.textContent = "נסה לפרסם שוב";
      if (error?.code === "leaderboard_not_configured") {
        setPublicLeaderboardStatus("localOnly");
        els.publishScoreStatus.textContent = SYSTEMS.PUBLIC_LEADERBOARD_LOCAL_ONLY_MESSAGE;
      } else if (error?.code === "rate_limited") {
        els.publishScoreStatus.textContent = "כבר ניסית לפרסם עכשיו. חכה כמה שניות ונסה שוב.";
      } else {
        els.publishScoreStatus.textContent = "לא הצלחנו לפרסם את השיא כרגע.";
      }
      els.publishScoreStatus.style.color = "var(--red)";
    } finally {
      state.scorePublishing = false;
    }
  }

  const PHASE_TO_GAME_STATE = {
    start: "mainMenu",
    playing: "playing",
    victory: "playing",
    question: "question",
    paused: "paused",
    ended: "results"
  };

  function setPhase(nextPhase, options = {}) {
    const fromState = PHASE_TO_GAME_STATE[state.phase] || state.phase;
    const toState = PHASE_TO_GAME_STATE[nextPhase] || nextPhase;
    if (!options.force && !SYSTEMS.canTransition(fromState, toState)) {
      console.warn(`Invalid game phase transition ignored by audit: ${fromState} -> ${toState}`);
    }
    state.phase = nextPhase;
    document.documentElement.dataset.gameState = toState;
  }

  const MAZE_THEME_PREVIEW_WORLDS = [
    { worldId: "ice", levelIndex: 0, label: "Ice" },
    { worldId: "lava", levelIndex: 1, label: "Lava" },
    { worldId: "ancient", levelIndex: 2, label: "Ancient" },
    { worldId: "diamond", levelIndex: 3, label: "Diamond" }
  ];

  function isLocalDebugHost() {
    const localHostnames = new Set(["127.0.0.1", "localhost"]);
    return localHostnames.has(window.location.hostname);
  }

  function isLocalVerificationRun() {
    return isLocalDebugHost()
      && new URLSearchParams(window.location.search).has("verify");
  }

  function isMazeThemePreviewRun() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("debugMazeThemes");
    return isLocalDebugHost() && params.has("debugMazeThemes") && value !== "false";
  }

  function getInitialMazeThemePreviewWorld() {
    const params = new URLSearchParams(window.location.search);
    const requestedWorld = params.get("previewWorld") || params.get("debugMazeThemes");
    const byWorld = MAZE_THEME_PREVIEW_WORLDS.find((item) => item.worldId === requestedWorld);
    if (byWorld) {
      return byWorld;
    }

    const requestedLevel = Number(params.get("previewLevel") || params.get("verifyLevel"));
    if (Number.isFinite(requestedLevel)) {
      return MAZE_THEME_PREVIEW_WORLDS.find((item) => item.levelIndex === requestedLevel)
        || MAZE_THEME_PREVIEW_WORLDS[0];
    }

    return MAZE_THEME_PREVIEW_WORLDS[0];
  }

  function hideMazeThemePreviewOverlays() {
    els.startScreen.hidden = true;
    els.startScreen.classList.remove("screen-visible");
    els.endScreen.hidden = true;
    els.questionDialog.hidden = true;
    els.leaderboardDialog.hidden = true;
    if (els.publishScorePanel) {
      els.publishScorePanel.hidden = true;
    }
    hidePauseScreen({ restoreFocus: false, sound: false });
  }

  function installMazeThemePreviewMode(runtime) {
    if (!isMazeThemePreviewRun()) {
      return;
    }

    state.visualVerificationMode = true;
    document.documentElement.dataset.mazeThemePreview = "true";

    const panel = document.createElement("aside");
    panel.setAttribute("aria-label", "Maze theme preview");
    Object.assign(panel.style, {
      position: "fixed",
      zIndex: "90",
      insetInlineStart: "max(8px, env(safe-area-inset-left))",
      top: "calc(env(safe-area-inset-top, 0px) + 82px)",
      maxWidth: "min(92vw, 360px)",
      padding: "8px",
      border: "1px solid rgba(154, 233, 255, 0.35)",
      borderRadius: "14px",
      background: "linear-gradient(180deg, rgba(7, 13, 31, 0.88), rgba(2, 5, 15, 0.78))",
      boxShadow: "0 14px 38px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
      backdropFilter: "blur(12px)",
      color: "#eafcff",
      font: "700 12px Assistant, system-ui, sans-serif",
      direction: "ltr",
      pointerEvents: "auto",
      userSelect: "none"
    });

    const title = document.createElement("div");
    title.textContent = "Maze Theme Preview";
    Object.assign(title.style, {
      margin: "0 0 6px",
      opacity: "0.78",
      letterSpacing: "0.02em",
      textTransform: "uppercase"
    });
    panel.append(title);

    const buttonRow = document.createElement("div");
    Object.assign(buttonRow.style, {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px"
    });
    panel.append(buttonRow);

    const status = document.createElement("div");
    Object.assign(status.style, {
      marginTop: "6px",
      color: "#9ef7ff",
      fontWeight: "800"
    });
    panel.append(status);

    const buttons = new Map();

    function syncPreviewButtons(activeWorldId) {
      for (const item of MAZE_THEME_PREVIEW_WORLDS) {
        const button = buttons.get(item.worldId);
        const active = item.worldId === activeWorldId;
        button.setAttribute("aria-pressed", String(active));
        Object.assign(button.style, {
          color: active ? "#03111e" : "#eafcff",
          background: active
            ? "linear-gradient(180deg, #9ef7ff, #46d2ff)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05))",
          borderColor: active ? "rgba(255, 255, 255, 0.78)" : "rgba(154, 233, 255, 0.26)",
          boxShadow: active
            ? "0 0 18px rgba(88, 225, 255, 0.45)"
            : "inset 0 1px 0 rgba(255, 255, 255, 0.12)"
        });
      }
    }

    function showPreviewWorld(item) {
      state.visualVerificationMode = true;
      const snapshot = runtime.forceLevelForVerification(item.levelIndex);
      state.lives = 99;
      state.enemies = [];
      state.boss = null;
      state.pendingSpawns = [];
      hideMazeThemePreviewOverlays();
      setPhase("playing", { force: true });
      updatePauseButton();
      updateHud();
      syncPreviewButtons(item.worldId);
      status.textContent = `${item.label} · ${getCurrentLevel().name}`;
      document.documentElement.dataset.mazeThemePreviewWorld = item.worldId;
      stage.focus({ preventScroll: true });
      return snapshot;
    }

    for (const item of MAZE_THEME_PREVIEW_WORLDS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.setAttribute("aria-pressed", "false");
      Object.assign(button.style, {
        minWidth: "62px",
        height: "34px",
        padding: "0 10px",
        border: "1px solid rgba(154, 233, 255, 0.26)",
        borderRadius: "11px",
        font: "800 12px Assistant, system-ui, sans-serif",
        cursor: "pointer"
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        showPreviewWorld(item);
      });
      buttons.set(item.worldId, button);
      buttonRow.append(button);
    }

    window.addEventListener("keydown", (event) => {
      if (!isMazeThemePreviewRun() || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const shortcutIndex = Number(event.key) - 1;
      const item = MAZE_THEME_PREVIEW_WORLDS[shortcutIndex];
      if (!item) {
        return;
      }
      event.preventDefault();
      showPreviewWorld(item);
    });

    window.__mathMazeThemePreview = {
      showWorld: (worldId) => {
        const item = MAZE_THEME_PREVIEW_WORLDS.find((option) => option.worldId === worldId)
          || MAZE_THEME_PREVIEW_WORLDS[0];
        return showPreviewWorld(item);
      },
      showLevel: (levelIndex) => {
        const item = MAZE_THEME_PREVIEW_WORLDS.find((option) => option.levelIndex === Number(levelIndex))
          || MAZE_THEME_PREVIEW_WORLDS[0];
        return showPreviewWorld(item);
      }
    };

    document.body.append(panel);
    window.setTimeout(() => showPreviewWorld(getInitialMazeThemePreviewWorld()), 80);
  }

  function installVerificationHooks() {
    if (!isLocalVerificationRun() && !isMazeThemePreviewRun()) {
      return;
    }

    const runtime = window.__mathMazeRuntime = window.__mathMazeRuntime || {
      errors: [],
      startedAt: performance.now(),
      startTransitions: 0
    };

    runtime.openQuestionForVerification = () => {
      if (state.phase === "question" && state.question) {
        return {
          answer: state.question.answer,
          text: state.question.text
        };
      }

      if (state.phase !== "playing") {
        return null;
      }

      if (state.boss) {
        openQuestion(state.boss);
        return {
          answer: state.question?.answer,
          text: state.question?.text
        };
      }

      if (state.enemies.length === 0) {
        spawnEnemy(state.nextEnemyId);
      }

      const enemy = state.enemies[0];
      if (!enemy) {
        return null;
      }

      openQuestion(enemy);
      return {
        answer: state.question?.answer,
        text: state.question?.text
      };
    };

    runtime.extendQuestionFeedbackDelayForVerification = (delayMs = 1200) => {
      const requestedDelay = Math.max(300, Number(delayMs) || 1200);
      const delay = Math.max(2200, Math.min(3200, requestedDelay));
      CONFIG.questionFeedbackDelay.correct = delay;
      CONFIG.questionFeedbackDelay.wrong = delay;
      return { ...CONFIG.questionFeedbackDelay };
    };

    runtime.getPlayerSnapshot = () => state.player ? {
      x: state.player.x,
      y: state.player.y,
      direction: state.player.direction,
      desiredDirection: state.player.desiredDirection,
      phase: state.phase,
      controlMode: state.controlMode
    } : null;

    runtime.forceLevelForVerification = (levelIndex = 0) => {
      const index = clamp(Math.floor(Number(levelIndex) || 0), 0, CONFIG.levels.length - 1);
      if (state.phase === "start") {
        setupGame();
        setPhase("playing");
      }
      state.correctAnswers = index * CONFIG.answersPerLevel;
      state.mathStats.correctAnswers = state.correctAnswers;
      state.mathStats.totalQuestions = Math.max(state.mathStats.totalQuestions, state.correctAnswers);
      enterLevel(index, { announce: false });
      updateHud();
      return {
        levelIndex: state.levelIndex,
        world: getCurrentLevel().enemyVisualStyle,
        phase: state.phase,
        referenceLoaded: Boolean(getMazeWorldSheet())
      };
    };

    runtime.forceEnvironmentHazardForVerification = () => {
      const definition = getCurrentLevel().hazard;
      if (!definition || state.phase !== "playing") {
        return null;
      }

      const origin = chooseVerificationHazardOrigin(definition.type) || chooseHazardOrigin();
      const cells = origin ? buildHazardCells(definition.type, origin) : [];
      if (!origin || cells.length === 0) {
        return null;
      }

      state.hazards = [{
        id: `verification-hazard-${state.levelIndex}`,
        type: definition.type,
        label: definition.label,
        warning: definition.warning,
        activeText: definition.activeText,
        hitText: definition.hitText,
        color: definition.color || getCurrentLevel().accent,
        cells,
        age: (definition.telegraph || 1.5) + 0.35,
        telegraph: definition.telegraph || 1.5,
        duration: definition.duration || 24,
        phase: 0,
        hitCooldown: 0
      }];
      state.nextHazardAt = Number.POSITIVE_INFINITY;
      return {
        levelIndex: state.levelIndex,
        type: definition.type,
        origin,
        cells
      };
    };

    runtime.forceArcadeBonusForVerification = (mode = "closed") => {
      if (state.phase === "start") {
        setupGame();
        setPhase("playing");
      }
      for (const [key, collectible] of state.collectibles) {
        if (collectible.kind === "bonus-letter" || collectible.kind === "bonus-key") {
          state.collectibles.delete(key);
        }
      }
      state.arcadeBonus.keysCollected = mode === "closed" ? 0 : CONFIG.arcadeBonus.keysRequired;
      state.arcadeBonus.chestOpened = mode === "opened";
      state.arcadeBonus.chestReward = mode === "opened" ? "verification" : null;
      state.arcadeBonus.chestOpenedAt = mode === "opened" ? state.clock : 0;
      seedArcadeBonusCollectibles({ resetChest: false });
      updateHud();
      return {
        levelIndex: state.levelIndex,
        mode,
        keysCollected: state.arcadeBonus.keysCollected,
        chestOpened: state.arcadeBonus.chestOpened,
        letters: state.arcadeBonus.collectedLetters,
        bonusItems: Array.from(state.collectibles.values())
          .filter((collectible) => collectible.kind === "bonus-letter" || collectible.kind === "bonus-key")
          .map((collectible) => ({
            kind: collectible.kind,
            letter: collectible.letter || null,
            cell: toCell(collectible.x, collectible.y)
          }))
      };
    };

    runtime.forceArcadeRewardBannerForVerification = (reward = "shield") => {
      if (state.phase === "start") {
        setupGame();
        setPhase("playing");
      }
      const normalizedReward = ["heart", "shield", "score"].includes(reward) ? reward : "shield";
      showArcadeRewardBanner(normalizedReward, {
        score: CONFIG.arcadeBonus.chestScoreValue,
        duration: 3.2
      });
      return {
        reward: normalizedReward,
        banner: state.arcadeRewardBanner
      };
    };

    runtime.forceBossChallenge = () => {
      if (state.phase !== "playing" || !state.player) {
        return null;
      }

      const stageBase = Math.floor(state.correctAnswers / CONFIG.answersPerLevel) * CONFIG.answersPerLevel;
      state.correctAnswers = stageBase + CONFIG.answersPerLevel - 1;
      state.mathStats.correctAnswers = state.correctAnswers;
      state.mathStats.totalQuestions = Math.max(state.mathStats.totalQuestions, state.correctAnswers);
      updateHud();
      if (!state.boss) {
        startBossChallenge();
      }
      return runtime.getBossSnapshot();
    };

    runtime.getBossSnapshot = () => state.boss ? {
      id: state.boss.id,
      name: state.boss.name,
      x: state.boss.x,
      y: state.boss.y,
      direction: state.boss.direction,
      moving: (state.boss.lastMoveDistance || 0) > 0.04,
      walkCycle: state.boss.walkCycle || 0,
      lastMoveDistance: state.boss.lastMoveDistance || 0,
      actorSheetReady: isImageReady(GAME_ASSETS.bossActorSheet),
      spawnProgress: state.boss.spawnProgress,
      phase: state.phase,
      enemyCount: state.enemies.length
    } : null;

    runtime.getMazeScatterSnapshot = () => {
      prepareMazeScatterDecor();
      const byLayer = {};
      const byType = {};
      for (const item of state.mazeScatterDecor) {
        byLayer[item.layer] = (byLayer[item.layer] || 0) + 1;
        byType[item.type] = (byType[item.type] || 0) + 1;
      }
      return {
        count: state.mazeScatterDecor.length,
        signature: state.mazeScatterSignature,
        seed: state.mazeScatterSeed,
        world: getMazeWorldKey(),
        levelIndex: state.levelIndex,
        byLayer,
        byType,
        sample: state.mazeScatterDecor.slice(0, 10).map((item) => ({
          id: item.id,
          x: item.x,
          y: item.y,
          layer: item.layer,
          type: item.type
        }))
      };
    };

    runtime.getMazeTilesetSnapshot = () => {
      const world = getMazeWorldKey();
      const tilesetState = getMazeOptionalTilesetState(world);
      const loadedTileset = getLoadedMazeTileset(getCurrentLevel());
      return {
        world,
        mode: tilesetState?.mode || "unavailable",
        imageStatus: tilesetState?.imageStatus || "unavailable",
        metadataStatus: tilesetState?.metadataStatus || "unavailable",
        imageSrc: tilesetState?.imageSrc || null,
        metadataSrc: tilesetState?.metadataSrc || null,
        fallbackMode: loadedTileset ? "image-tileset" : "procedural",
        availableRoles: loadedTileset
          ? Object.keys(loadedTileset.definition.crops || {})
          : []
      };
    };

    runtime.openBossQuestionForVerification = () => {
      if (!state.boss) {
        runtime.forceBossChallenge();
      }
      if (!state.boss) {
        return null;
      }
      openQuestion(state.boss);
      return {
        answer: state.question?.answer,
        text: state.question?.text,
        status: els.questionStatus.textContent
      };
    };

    runtime.forceChampionTrophyForVerification = (playerName = "אלוף כפלול") => {
      if (state.phase === "start") {
        setupGame();
      }
      state.visualVerificationMode = true;
      setMode("adventure", false);
      state.playerName = SYSTEMS.safeNickname(playerName) || "אלוף כפלול";
      state.correctAnswers = CONFIG.targetCorrect;
      state.incorrectAnswers = 3;
      state.mathStats.correctAnswers = CONFIG.targetCorrect;
      state.mathStats.incorrectAnswers = 3;
      state.mathStats.totalQuestions = CONFIG.targetCorrect + 3;
      state.mathStats.totalAnswerTimeMs = 176000;
      state.mathStats.fastestAnswerMs = 1800;
      state.comboState.max = Math.max(state.comboState.max, 18);
      state.lives = Math.max(state.lives, 4);
      awardScore({ type: "correctAnswer", enemyDefeated: true, responseMs: 1800, timeLimitMs: 25000, questionMode: getDifficultySettings().questionMode });
      awardScore({ type: "stageComplete", mode: "adventure" });
      els.startScreen.hidden = true;
      els.startScreen.classList.remove("screen-visible");
      showEndScreen(true);
      return {
        phase: state.phase,
        finalResult: state.finalResult,
        trophyVisible: !els.winnerTrophy.hidden,
        shareVisible: Boolean(els.trophyShareButton && !els.trophyShareButton.hidden)
      };
    };

    runtime.forceFinalBossQuestionForVerification = (playerName = "אלוף כפלול") => {
      if (state.phase === "start") {
        setupGame();
      }
      setMode("adventure", false);
      state.playerName = SYSTEMS.safeNickname(playerName) || "אלוף כפלול";
      state.visualVerificationMode = false;
      state.lives = Math.max(state.lives, 4);
      els.startScreen.hidden = true;
      els.startScreen.classList.remove("screen-visible");
      els.endScreen.hidden = true;
      els.questionDialog.hidden = true;
      hidePauseScreen({ restoreFocus: false, sound: false });
      enterLevel(CONFIG.levels.length - 1, { announce: false });
      state.correctAnswers = CONFIG.targetCorrect - 1;
      state.mathStats.correctAnswers = CONFIG.targetCorrect - 1;
      state.mathStats.totalQuestions = Math.max(state.mathStats.totalQuestions, CONFIG.targetCorrect - 1);
      state.enemies = [];
      state.pendingSpawns = [];
      startBossChallenge();
      if (!state.boss) {
        return null;
      }
      openQuestion(state.boss);
      return {
        answer: state.question?.answer,
        boss: state.boss.name,
        phase: state.phase,
        correctAnswers: state.correctAnswers,
        levelIndex: state.levelIndex
      };
    };

    runtime.getQuestionFeedbackResult = () => els.questionDialog.dataset.answerResult || null;

    const verificationParams = new URLSearchParams(window.location.search);
    if (verificationParams.has("verifyLevel")) {
      state.visualVerificationMode = true;
      window.setTimeout(() => {
        const levelIndex = Number(verificationParams.get("verifyLevel"));
        runtime.forceLevelForVerification(levelIndex);
        state.lives = 99;
        els.startScreen.hidden = true;
        els.startScreen.classList.remove("screen-visible");
        els.endScreen.hidden = true;
        els.questionDialog.hidden = true;
        hidePauseScreen({ restoreFocus: false, sound: false });
        updatePauseButton();
        stage.focus({ preventScroll: true });
      }, 80);
    }

    installMazeThemePreviewMode(runtime);
  }

  function startGame(event) {
    event?.preventDefault();
    if (state.phase === "playing" || state.phase === "question") {
      return;
    }

    const playerName = normalizePlayerName(els.playerNameInput.value);

    if (!playerName.ok) {
      els.nameError.textContent = playerName.error;
      els.playerNameInput.focus();
      return;
    }

    state.playerName = playerName.value;
    state.save.player.nickname = state.playerName;
    state.timeLimitEnabled = true;
    setMode(getSelectedMode());
    setCharacter(getSelectedCharacterId());
    setDifficulty(getSelectedDifficulty());
    persistSave();
    closeMenuSheets({ restoreFocus: false, sound: false });
    hidePauseScreen();
    els.nameError.textContent = "";
    setupGame();
    setPhase("playing");
    els.startScreen.hidden = true;
    els.startScreen.classList.remove("screen-visible");
    els.endScreen.hidden = true;
    els.leaderboardDialog.hidden = true;
    if (els.publishScorePanel) {
      els.publishScorePanel.hidden = true;
    }
    updatePauseButton();
    stage.focus({ preventScroll: true });
    resumeAudio();
    playUiMotion(stage, "screenEnter");
    playUiSound("notification");
  }

  function showStartScreen() {
    setPhase("start", { force: true });
    state.playerName = SYSTEMS.safeNickname(state.save.player.nickname);
    if (state.victoryEndTimerId) {
      window.clearTimeout(state.victoryEndTimerId);
      state.victoryEndTimerId = null;
    }
    state.finalBossExplosion = null;
    els.endScreen.hidden = true;
    els.endScreen.classList.remove("final-trophy-screen");
    renderVictoryConfetti(false);
    if (els.trophyShareButton) {
      els.trophyShareButton.hidden = true;
    }
    if (els.trophyShareStatus) {
      els.trophyShareStatus.textContent = "";
    }
    els.questionDialog.hidden = true;
    hidePauseScreen();
    showWithMotion(els.startScreen, "screenEnter");
    els.startScreen.classList.add("screen-visible");
    els.winnerTrophy.hidden = true;
    if (els.newRecordBadge) {
      els.newRecordBadge.hidden = true;
    }
    els.playerNameInput.value = state.playerName;
    els.nameError.textContent = "";
    updatePauseButton();
    syncModeInputs();
    syncCharacterInputs();
    syncDifficultyInputs();
    syncTimeLimitToggle();
    syncMenuSummary();
    closeHeroGallery({ restoreFocus: false });
    closeMenuSheets({ restoreFocus: false, sound: false });
    setupGame();
    focusPlayerNameWhenUseful();
  }

  function retryGame() {
    const nickname = SYSTEMS.safeNickname(state.playerName || state.save.player.nickname);
    els.playerNameInput.value = nickname;
    startGame();
  }

  function updatePauseScreen() {
    if (!els.pauseScreen) {
      return;
    }
    const mode = getModeSettings();
    const difficulty = getDifficultySettings();
    const level = getCurrentLevel();
    const missionProgress = getMissionProgress();
    const missionTarget = state.mission?.target || 0;
    if (els.pauseSummary) {
      els.pauseSummary.textContent = `${modeLabel(mode.id)} · ${difficultyLabel(difficulty.id)} ${scoreMultiplierLabel(difficulty)} · ${levelLabel(level)}`;
    }
    if (els.pauseMissionTitle) {
      els.pauseMissionTitle.textContent = missionLabel();
    }
    if (els.pauseMissionProgress) {
      els.pauseMissionProgress.textContent = missionTarget
        ? `${Math.min(missionProgress, missionTarget)}/${missionTarget}`
        : "-";
    }
    if (els.pauseNameInput && document.activeElement !== els.pauseNameInput) {
      els.pauseNameInput.value = SYSTEMS.safeNickname(state.playerName || state.save.player.nickname);
    }
  }

  function showPauseScreen() {
    if (!els.pauseScreen) {
      return;
    }
    state.lastFocusBeforePause = document.activeElement;
    updatePauseScreen();
    showWithMotion(els.pauseScreen, "modalOpen");
    playUiSound("panelOpen");
    window.setTimeout(() => els.pauseResumeButton?.focus({ preventScroll: true }), 0);
  }

  function hidePauseScreen(options = {}) {
    if (!els.pauseScreen) {
      return;
    }
    const { restoreFocus = false } = options;
    const wasOpen = !els.pauseScreen.hidden;
    hideWithMotion(els.pauseScreen, "modalClose");
    if (wasOpen && options.sound !== false) {
      playUiSound("panelClose");
    }
    if (restoreFocus && state.lastFocusBeforePause instanceof HTMLElement) {
      state.lastFocusBeforePause.focus({ preventScroll: true });
    }
    state.lastFocusBeforePause = null;
  }

  function togglePause() {
    if (state.phase === "playing") {
      setPhase("paused");
      resetJoystick();
      updatePauseButton();
      showPauseScreen();
      return;
    }

    if (state.phase === "paused") {
      setPhase("playing");
      updatePauseButton();
      hidePauseScreen({ restoreFocus: true });
      state.lastTime = performance.now();
    }
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    storage.set(CONFIG.storageKeys.sound, state.soundEnabled ? "on" : "off");
    persistSave();
    updateSoundButton();
    if (state.soundEnabled) {
      resumeAudio();
      playUiSound("notification", { fromGesture: true });
    }
  }

  function updateSoundButton() {
    const label = state.soundEnabled ? uiRuntime("soundOn") : uiRuntime("soundOff");
    const icon = state.soundEnabled ? "sound-on" : "sound-off";
    const fallback = state.soundEnabled ? uiRuntime("sound") : uiRuntime("quiet");
    setIconButton(els.sound, icon, label, fallback, state.soundEnabled ? uiRuntime("sound") : uiRuntime("quiet"));
    setIconButton(els.menuSound, icon, label, fallback);
    setIconButton(els.settingsSoundButton, icon, label, fallback, label);
    setIconButton(els.pauseSoundButton, icon, label, fallback, state.soundEnabled ? uiRuntime("sound") : uiRuntime("quiet"));
    syncUiSoundController();
    if (els.settingsSoundLabel) {
      els.settingsSoundLabel.textContent = label;
    }
    if (els.pauseSoundLabel) {
      els.pauseSoundLabel.textContent = state.soundEnabled ? uiRuntime("sound") : uiRuntime("quiet");
    }
  }

  function updatePauseButton() {
    const paused = state.phase === "paused";
    setIconButton(
      els.pause,
      paused ? "play" : "pause",
      paused ? uiRuntime("resumeGame") : uiRuntime("pause"),
      paused ? uiStatic("resume") : uiRuntime("pause")
    );
  }

  function setIconButton(button, icon, label, fallbackText, visibleLabel = label) {
    if (!button) {
      return;
    }

    button.dataset.icon = icon;
    button.setAttribute("aria-label", label);
    const labelSlot = button.querySelector("[data-icon-label]");
    if (labelSlot) {
      labelSlot.textContent = visibleLabel;
    }

    const use = button.querySelector("use");
    if (use) {
      use.setAttribute("href", `${CONFIG.iconSprite}#${icon}`);
      return;
    }

    button.textContent = fallbackText;
  }

  function resumeAudio() {
    if (!state.soundEnabled) {
      return;
    }

    if (!state.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      state.audioContext = new AudioContextClass();
    }

    if (state.audioContext.state === "suspended") {
      state.audioContext.resume();
    }
  }

  function playTone(frequency, duration, type = "sine", gainValue = 0.035) {
    if (!state.soundEnabled || !state.audioContext) {
      return;
    }

    const now = state.audioContext.currentTime;
    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(state.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playCorrectSound() {
    playTone(520, 0.08, "triangle", 0.04);
    setTimeout(() => playTone(740, 0.09, "triangle", 0.035), 55);
  }

  function playMissionSound() {
    playTone(660, 0.07, "triangle", 0.035);
    setTimeout(() => playTone(880, 0.08, "triangle", 0.03), 60);
    setTimeout(() => playTone(990, 0.09, "triangle", 0.025), 120);
  }

  function playWrongSound() {
    playTone(160, 0.16, "sawtooth", 0.035);
  }

  function setDirection(direction) {
    if (!DIRS[direction] || !state.player || state.phase !== "playing") {
      return;
    }

    state.player.desiredDirection = direction;
    state.player.directionRequestTime = state.clock;
    tryApplyPlayerDirection(state.player, direction);
  }

  function awardScore(event, options = {}) {
    const comboMultiplierPct = options.comboMultiplierPct ?? state.comboState.multiplierPct ?? 100;
    const award = SYSTEMS.applyScoreEvent(state.scoreState, event, {
      difficulty: getDifficultySettings(),
      comboMultiplierPct
    });
    state.score = state.scoreState.total;
    return award;
  }

  function applyCombo(eventName) {
    SYSTEMS.applyComboEvent(state.comboState, eventName, getDifficultySettings());
    state.combo = state.comboState.count;
    return state.comboState;
  }

  function formatSeconds(ms) {
    if (!ms) {
      return "0.0ש׳";
    }
    return `${(ms / 1000).toFixed(1)}ש׳`;
  }

  function resetHudSnapshot() {
    state.hudSnapshot = {
      score: null,
      combo: null,
      comboMultiplierPct: null,
      lives: null,
      missionKey: null,
      missionProgress: null,
      progressPercent: null,
      correctAnswers: null
    };
  }

  function createHudSvgIcon(symbolId) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("ui-icon");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `${CONFIG.iconSprite}#${symbolId}`);
    svg.append(use);
    return svg;
  }

  function renderLivesHud() {
    if (!els.lives) {
      return;
    }

    els.lives.replaceChildren();
    els.lives.setAttribute("aria-label", `${state.lives} ${uiRuntime("lives")}`);
    const count = Math.max(0, state.lives);
    if (count === 0) {
      els.lives.textContent = "0";
      return;
    }

    const visibleLifeIcons = Math.min(count, 5);
    for (let index = 0; index < visibleLifeIcons; index += 1) {
      const icon = document.createElement("span");
      icon.className = "hud-life-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.append(createHudSvgIcon("lives"));
      els.lives.append(icon);
    }

    if (count > visibleLifeIcons) {
      const overflow = document.createElement("span");
      overflow.className = "hud-life-overflow";
      overflow.setAttribute("aria-hidden", "true");
      overflow.textContent = `+${count - visibleLifeIcons}`;
      els.lives.append(overflow);
    }
  }

  function getHudMissionKey() {
    if (!state.mission) {
      return "none";
    }
    return `${state.mission.type}:${state.mission.target}:${state.mission.startScore}`;
  }

  const HUD_MOTION_EVENT_BY_CLASS = {
    "hud-score-change": "scoreCountUp",
    "hud-combo-milestone": "comboMilestone",
    "hud-life-loss": "lifeLost",
    "hud-life-gain": "badgeAppearance",
    "hud-mission-progress": "badgeAppearance",
    "hud-mission-reset": "lockedFeedback",
    "hud-mission-complete": "missionComplete",
    "hud-progress-complete": "worldTransition",
    "progress-pulse": "badgeAppearance",
    "metric-pulse": "badgeAppearance",
    "life-hit": "lifeLost"
  };

  function animateHudFeedback(element, className, message, duration = 920) {
    if (!element) {
      return;
    }

    if (message) {
      element.dataset.hudFeedback = message;
    }
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    playUiMotion(element, HUD_MOTION_EVENT_BY_CLASS[className] || "badgeAppearance");

    const previousTimer = hudFeedbackTimers.get(element);
    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    const timerId = window.setTimeout(() => {
      element.classList.remove(className);
      if (message && element.dataset.hudFeedback === message) {
        delete element.dataset.hudFeedback;
      }
      hudFeedbackTimers.delete(element);
    }, duration);
    hudFeedbackTimers.set(element, timerId);
  }

  function syncHudFeedback(progressPercent, missionProgress) {
    const snapshot = state.hudSnapshot || {};
    const scoreMetric = els.score?.closest(".metric");
    const comboMetric = els.combo?.closest(".metric");
    const livesMetric = els.lives?.closest(".metric");
    const missionKey = getHudMissionKey();
    const comboMultiplierPct = state.comboState.multiplierPct || 100;

    if (snapshot.score !== null && state.score !== snapshot.score) {
      const delta = state.score - snapshot.score;
      animateHudFeedback(scoreMetric, "hud-score-change", delta > 0 ? `+${numberFormat.format(delta)}` : numberFormat.format(delta));
    }

    if (snapshot.combo !== null && state.combo > snapshot.combo) {
      if (state.combo >= 3 && (state.combo % 5 === 0 || comboMultiplierPct > (snapshot.comboMultiplierPct || 100))) {
        animateHudFeedback(comboMetric, "hud-combo-milestone", `${uiRuntime("combo")} ${state.combo}`);
      } else {
        animateHudFeedback(comboMetric, "metric-pulse", "");
      }
    }

    if (snapshot.lives !== null && state.lives !== snapshot.lives) {
      animateHudFeedback(
        livesMetric,
        state.lives < snapshot.lives ? "hud-life-loss" : "hud-life-gain",
        state.lives < snapshot.lives ? uiRuntime("lifeMinus") : uiRuntime("lifePlus")
      );
    }

    if (snapshot.progressPercent !== null && progressPercent !== snapshot.progressPercent) {
      const wrappedProgress = state.correctAnswers > (snapshot.correctAnswers || 0) && progressPercent < snapshot.progressPercent;
      animateHudFeedback(els.progressWrap, wrappedProgress ? "hud-progress-complete" : "progress-pulse", wrappedProgress ? uiRuntime("newWave") : "");
    }

    if (
      snapshot.missionKey === missionKey
      && snapshot.missionProgress !== null
      && missionProgress !== snapshot.missionProgress
    ) {
      const missionDelta = missionProgress - snapshot.missionProgress;
      animateHudFeedback(
        els.missionCard,
        missionDelta >= 0 ? "hud-mission-progress" : "hud-mission-reset",
        missionDelta >= 0 ? uiRuntime("missionPlus") : uiRuntime("missionReset")
      );
    }

    state.hudSnapshot = {
      score: state.score,
      combo: state.combo,
      comboMultiplierPct,
      lives: state.lives,
      missionKey,
      missionProgress,
      progressPercent,
      correctAnswers: state.correctAnswers
    };
  }

  function updateHud() {
    const arcadeWave = getArcadeWave();
    const progressTarget = state.mode === "arcade" ? CONFIG.answersPerLevel : CONFIG.targetCorrect;
    const progressStageLabel = state.mode === "arcade"
      ? `${uiRuntime("wave")} ${arcadeWave}`
      : `${uiRuntime("stage")} ${state.levelIndex + 1}`;
    const progressValue = state.mode === "arcade"
      ? state.correctAnswers % CONFIG.answersPerLevel
      : state.correctAnswers;
    const progressPercent = progressTarget > 0 ? progressValue / progressTarget * 100 : 0;
    const missionProgress = getMissionProgress();

    els.correct.textContent = progressValue;
    els.targetCorrect.textContent = `/${progressTarget}`;
    if (els.hudStageLabel) {
      els.hudStageLabel.textContent = progressStageLabel;
    }
    els.score.textContent = numberFormat.format(state.score);
    els.combo.textContent = state.comboState.multiplierPct > 100
      ? `${state.combo} · ×${(state.comboState.multiplierPct / 100).toFixed(1)}`
      : String(state.combo);
    renderLivesHud();
    const boundedProgress = Math.min(100, progressPercent);
    els.progress.style.width = `${boundedProgress}%`;
    if (els.progressWrap) {
      els.progressWrap.setAttribute("aria-valuenow", String(Math.round(boundedProgress)));
      els.progressWrap.setAttribute("aria-valuetext", formatTemplate(uiRuntime("progressAria"), {
        stage: progressStageLabel,
        value: progressValue,
        target: progressTarget
      }));
    }
    els.bestScore.textContent = numberFormat.format(state.bestScore);
    updateMissionHud();
    syncHudFeedback(boundedProgress, missionProgress);
  }

  function updateMissionHud() {
    if (!state.mission) {
      els.missionTitle.textContent = uiRuntime("missionComing");
      els.missionProgress.textContent = "";
      return;
    }

    const progress = getMissionProgress();
    const label = missionLabel();
    els.missionTitle.textContent = label;
    els.missionProgress.textContent = `${Math.min(progress, state.mission.target)}/${state.mission.target}`;
    els.missionCard.setAttribute("aria-label", formatTemplate(uiRuntime("missionAria"), {
      label,
      progress,
      target: state.mission.target
    }));
  }

  function assignMission() {
    const previousType = state.mission?.type;
    const pool = CONFIG.missions.filter((mission) => mission.type !== previousType);
    const template = randomItem(pool.length ? pool : CONFIG.missions);
    state.mission = {
      ...template,
      progress: 0,
      startScore: state.score
    };
  }

  function getMissionProgress() {
    if (!state.mission) {
      return 0;
    }

    if (state.mission.type === "combo") {
      return state.combo;
    }

    if (state.mission.type === "score") {
      return Math.max(0, state.score - state.mission.startScore);
    }

    return state.mission.progress;
  }

  function updateMission(eventName, amount = 1) {
    if (!state.mission) {
      return;
    }

    if (
      (eventName === "score" && state.mission.type === "score") ||
      (eventName === "correctAnswer" && state.mission.type === "combo")
    ) {
      pulseElement(els.missionCard, "metric-pulse");
      if (getMissionProgress() >= state.mission.target) {
        completeMission();
      }
      return;
    }

    const before = getMissionProgress();

    if (eventName === "wrongAnswer" && state.mission.type === "safeCorrect") {
      state.mission.progress = 0;
    }

    if (eventName === "correctAnswer" && (state.mission.type === "correct" || state.mission.type === "safeCorrect")) {
      state.mission.progress += amount;
    }

    if (eventName === "enemyDefeated" && state.mission.type === "enemies") {
      state.mission.progress += amount;
    }

    const after = getMissionProgress();
    if (after !== before) {
      pulseElement(els.missionCard, "metric-pulse");
    }

    if (after >= state.mission.target) {
      completeMission();
    }
  }

  function completeMission() {
    const award = awardScore({ type: "mission", value: CONFIG.missionBonus });
    playMissionSound();
    pulseElement(els.missionCard, "metric-pulse");
    animateHudFeedback(els.missionCard, "hud-mission-complete", "משימה הושלמה", 1200);
    playUiMotion(els.missionCard, "missionComplete", {
      particles: { count: 8, color: "var(--kf-color-green, #67f08b)" }
    });
    pulseElement(els.progressWrap, "progress-pulse");

    if (state.player) {
      addFloatingText(state.player.x, state.player.y - 34, `משימה +${award.total}`, "#67f08b");
      addBurst(state.player.x, state.player.y, "#67f08b", 18, 110);
    }

    assignMission();
    updateHud();
  }

  function pulseElement(element, className) {
    if (!element) {
      return;
    }

    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function update(dt) {
    state.clock += dt;
    state.shake = Math.max(0, state.shake - dt);
    updateCamera(dt);

    if (state.phase === "playing") {
      updatePlaying(dt);
    } else {
      if (state.phase === "question") {
        updateQuestionTimer();
      }
      updateAmbient(dt);
    }

    updateLevelBanner(dt);
    updateArcadeRewardBanner(dt);
  }

  function updatePlaying(dt) {
    if (state.visualVerificationMode) {
      updatePlayerVisualState(state.player, dt);
      updateParticles(dt);
      updateFloatingTexts(dt);
      return;
    }

    if (shouldStartBossChallenge()) {
      startBossChallenge();
    }

    updateEnvironmentHazards(dt);

    if (!state.boss) {
      updateSpawns(dt);
    }

    updatePlayer(dt);
    collectItems();
    if (state.boss) {
      updateBoss(dt);
    } else {
      updateEnemies(dt);
    }
    checkEnvironmentHazardCollision();
    if (state.phase === "playing") {
      checkEnemyCollision();
    }
    refillCollectibles();
    updateParticles(dt);
    updateFloatingTexts(dt);
    if (!state.boss) {
      ensureEnemyCount();
    }
  }

  function updateAmbient(dt) {
    if (state.player) {
      state.player.visualPulse = 0.24 + Math.abs(Math.sin(state.clock * 8)) * 0.32;
      updatePlayerVisualState(state.player, dt);
    }

    if (state.phase === "ended") {
      updateFireworks(dt);
    }

    updateFinalBossExplosion(dt);
    updateParticles(dt);
    updateFloatingTexts(dt);
  }

  function updateSpawns(dt) {
    for (let i = state.pendingSpawns.length - 1; i >= 0; i -= 1) {
      const pending = state.pendingSpawns[i];
      pending.delay -= dt;
      if (pending.delay <= 0) {
        spawnEnemy(pending.index);
        state.pendingSpawns.splice(i, 1);
      }
    }
  }

  function scheduleNextEnvironmentHazard(multiplier = 1) {
    const hazard = getCurrentLevel().hazard;
    if (!hazard) {
      state.nextHazardAt = Number.POSITIVE_INFINITY;
      return;
    }

    const minDelay = (hazard.intervalMin || 18) * multiplier;
    const maxDelay = (hazard.intervalMax || 30) * multiplier;
    state.nextHazardAt = state.clock + minDelay + Math.random() * Math.max(1, maxDelay - minDelay);
  }

  function updateEnvironmentHazards(dt) {
    let expired = false;
    for (const hazard of state.hazards) {
      hazard.age += dt;
      hazard.hitCooldown = Math.max(0, (hazard.hitCooldown || 0) - dt);
    }
    state.hazards = state.hazards.filter((hazard) => {
      const alive = hazard.age < hazard.telegraph + hazard.duration;
      expired = expired || !alive;
      return alive;
    });

    if (expired) {
      scheduleNextEnvironmentHazard();
    }

    if (state.hazards.length === 0 && state.clock >= state.nextHazardAt) {
      spawnEnvironmentHazard();
    }
  }

  function spawnEnvironmentHazard() {
    const definition = getCurrentLevel().hazard;
    if (!definition || !state.player) {
      scheduleNextEnvironmentHazard(1.2);
      return;
    }

    const origin = chooseHazardOrigin();
    const cells = origin ? buildHazardCells(definition.type, origin) : [];
    if (cells.length < 3) {
      scheduleNextEnvironmentHazard(0.45);
      return;
    }

    const center = centerOfCell(origin.x, origin.y);
    state.hazards.push({
      id: `hazard-${state.levelIndex}-${Math.round(state.clock * 1000)}`,
      type: definition.type,
      label: definition.label,
      warning: definition.warning,
      activeText: definition.activeText,
      hitText: definition.hitText,
      color: definition.color || getCurrentLevel().accent,
      cells,
      age: 0,
      telegraph: definition.telegraph || 1.5,
      duration: definition.duration || 24,
      phase: Math.random() * Math.PI * 2,
      hitCooldown: 0
    });
    state.nextHazardAt = Number.POSITIVE_INFINITY;
    addFloatingText(center.x, center.y - 18, definition.warning, definition.color || getCurrentLevel().accent);
    addBurst(center.x, center.y, definition.color || getCurrentLevel().accent, 16, 82);
    playTone(definition.type === "lava-spill" ? 118 : 210, 0.1, "triangle", 0.022);
  }

  function chooseHazardOrigin() {
    const playerCell = state.player ? toCell(state.player.x, state.player.y) : PLAYER_START;
    const candidates = shuffle(state.reachableList).filter((cell) => {
      return distanceCells(cell, playerCell) >= 7
        && distanceCells(cell, PLAYER_START) >= 6
        && distanceCells(cell, CENTER_CELL) >= 4
        && isWalkableCell(cell.x, cell.y);
    });
    return candidates[0] || null;
  }

  function chooseVerificationHazardOrigin(type) {
    const playerCell = state.player ? toCell(state.player.x, state.player.y) : PLAYER_START;
    const offsets = [
      { x: 4, y: -3 },
      { x: -4, y: -3 },
      { x: 4, y: 3 },
      { x: -4, y: 3 },
      { x: 5, y: -2 },
      { x: -5, y: -2 },
      { x: 5, y: 2 },
      { x: -5, y: 2 },
      { x: 0, y: -5 },
      { x: 0, y: 5 },
      { x: 5, y: -1 },
      { x: -5, y: 1 }
    ];

    for (const offset of offsets) {
      const origin = {
        x: clamp(playerCell.x + offset.x, 1, COLS - 2),
        y: clamp(playerCell.y + offset.y, 1, ROWS - 2)
      };
      if (!isWalkableCell(origin.x, origin.y)) {
        continue;
      }
      const cells = buildHazardCells(type, origin);
      if (cells.length >= 3 && cells.every((cell) => distanceCells(cell, playerCell) >= 3)) {
        return origin;
      }
    }

    return null;
  }

  function buildHazardCells(type, origin) {
    if (type === "lava-spill") {
      return buildHazardLine(origin, randomItem([{ x: 1, y: 0 }, { x: 0, y: 1 }]), 9);
    }

    if (type === "crystal-burst") {
      return buildHazardLine(origin, randomItem([{ x: 1, y: 0 }, { x: 0, y: 1 }]), 11);
    }

    if (type === "rune-trap") {
      return buildHazardPattern(origin, [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: -2, y: 0 },
        { x: 0, y: 2 },
        { x: 0, y: -2 },
        { x: 1, y: 1 },
        { x: -1, y: -1 }
      ]);
    }

    return buildHazardPattern(origin, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 }
    ]);
  }

  function buildHazardLine(origin, direction, maxCells) {
    const cells = [origin];
    for (const sign of [1, -1]) {
      for (let step = 1; step <= maxCells; step += 1) {
        const cell = {
          x: origin.x + direction.x * step * sign,
          y: origin.y + direction.y * step * sign
        };
        if (!isWalkableCell(cell.x, cell.y)) {
          break;
        }
        cells.push(cell);
        if (cells.length >= maxCells) {
          return uniqueCells(cells);
        }
      }
    }
    return uniqueCells(cells);
  }

  function buildHazardPattern(origin, offsets) {
    return uniqueCells(offsets
      .map((offset) => ({ x: origin.x + offset.x, y: origin.y + offset.y }))
      .filter((cell) => isWalkableCell(cell.x, cell.y)));
  }

  function uniqueCells(cells) {
    const seen = new Set();
    return cells.filter((cell) => {
      const key = cellKey(cell.x, cell.y);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function updatePlayer(dt) {
    const player = state.player;
    const beforeX = player.x;
    const beforeY = player.y;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.visualPulse = 0.24 + Math.abs(Math.sin(state.clock * 10)) * 0.34;
    updatePlayerVisualState(player, dt);

    const hasFreshDirection = state.clock - player.directionRequestTime <= INPUT_BUFFER_SECONDS;

    if (hasFreshDirection) {
      tryApplyPlayerDirection(player, player.desiredDirection);
    }

    const moved = moveActor(player, player.direction, player.speed * dt);

    if (!moved && hasFreshDirection && tryApplyPlayerDirection(player, player.desiredDirection)) {
      moveActor(player, player.direction, player.speed * dt);
    }

    player.lastMoveDistance = Math.hypot(player.x - beforeX, player.y - beforeY);
    if (player.lastMoveDistance > 0.04) {
      player.walkCycle = (player.walkCycle + player.lastMoveDistance * 0.18) % (Math.PI * 2);
    } else {
      player.walkCycle = (player.walkCycle + dt * 1.15) % (Math.PI * 2);
    }

    player.trail.unshift({ x: player.x, y: player.y, life: 0.34, direction: player.direction });
    player.trail = player.trail.filter((point) => {
      point.life -= dt;
      return point.life > 0;
    }).slice(0, 14);
  }

  function updatePlayerVisualState(player, dt) {
    player.eatAnimation = Math.max(0, player.eatAnimation - dt);
    player.blinkTimer -= dt;
    player.blinkDuration = Math.max(0, player.blinkDuration - dt);
    if (player.blinkTimer <= 0) {
      player.blinkDuration = 0.12;
      player.blinkTimer = 2.4 + Math.random() * 3.8;
    }
    if (player.eatEffect) {
      player.eatEffect.life -= dt;
      if (player.eatEffect.life <= 0) {
        player.eatEffect = null;
      }
    }
    player.hitAnimation = Math.max(0, (player.hitAnimation || 0) - dt);
    player.questionAnimation = Math.max(0, (player.questionAnimation || 0) - dt);
    player.rewardAnimation = Math.max(0, (player.rewardAnimation || 0) - dt);
    player.turnAnimation = Math.max(0, (player.turnAnimation || 0) - dt);
  }

  function tryApplyPlayerDirection(player, direction) {
    if (!DIRS[direction] || direction === "none") {
      return false;
    }

    const turnPosition = getPlayerTurnPosition(player, direction);
    if (!turnPosition) {
      return false;
    }

    const vector = DIRS[direction];
    const nextX = turnPosition.x + vector.x * TURN_LOOKAHEAD;
    const nextY = turnPosition.y + vector.y * TURN_LOOKAHEAD;

    if (circleHitsWall(nextX, nextY, player.radius)) {
      return false;
    }

    const changedDirection = player.direction !== direction;
    player.x = turnPosition.x;
    player.y = turnPosition.y;
    player.direction = direction;
    if (changedDirection) {
      player.turnAnimation = 0.18;
      player.turnDirection = direction;
    }
    return true;
  }

  function getPlayerTurnPosition(player, direction) {
    const vector = DIRS[direction];
    const turnPosition = { x: player.x, y: player.y };

    if (vector.x !== 0) {
      const laneY = nearestLaneCenter(player.y);
      if (Math.abs(player.y - laneY) > TURN_SNAP_DISTANCE) {
        return null;
      }
      turnPosition.y = laneY;
    }

    if (vector.y !== 0) {
      const laneX = nearestLaneCenter(player.x);
      if (Math.abs(player.x - laneX) > TURN_SNAP_DISTANCE) {
        return null;
      }
      turnPosition.x = laneX;
    }

    return turnPosition;
  }

  function nearestLaneCenter(value) {
    return Math.round((value - TILE / 2) / TILE) * TILE + TILE / 2;
  }

  function canMove(actor, direction, distance) {
    const vector = DIRS[direction];
    if (!vector) {
      return false;
    }

    const aligned = alignedPosition(actor, direction);
    return !circleHitsWall(aligned.x + vector.x * distance, aligned.y + vector.y * distance, actor.radius);
  }

  function moveActor(actor, direction, distance) {
    const vector = DIRS[direction];
    if (!vector || direction === "none") {
      return false;
    }

    const aligned = alignedPosition(actor, direction);
    actor.x = aligned.x;
    actor.y = aligned.y;

    let moved = false;
    let remaining = distance;
    const step = TILE / 5;

    while (remaining > 0) {
      const amount = Math.min(step, remaining);
      const nextX = actor.x + vector.x * amount;
      const nextY = actor.y + vector.y * amount;

      if (circleHitsWall(nextX, nextY, actor.radius)) {
        return moved;
      }

      actor.x = nextX;
      actor.y = nextY;
      remaining -= amount;
      moved = true;
    }

    return moved;
  }

  function alignedPosition(actor, direction) {
    const vector = DIRS[direction];
    const result = { x: actor.x, y: actor.y };
    const cell = toCell(actor.x, actor.y);
    const center = centerOfCell(cell.x, cell.y);
    const snapDistance = 4.8;

    if (vector.x !== 0 && Math.abs(actor.y - center.y) < snapDistance) {
      result.y = center.y;
    }

    if (vector.y !== 0 && Math.abs(actor.x - center.x) < snapDistance) {
      result.x = center.x;
    }

    return result;
  }

  function collectItems() {
    const player = state.player;
    let collected = 0;

    for (const [key, collectible] of state.collectibles) {
      const dx = collectible.x - player.x;
      const dy = collectible.y - player.y;
      const hitRadius = player.radius + collectible.radius + 1.4;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        state.collectibles.delete(key);
        if (collectible.kind === "power") {
          state.nextPowerCollectibleAt = state.clock + 14;
          player.eatAnimation = GAME_THEME.player.eatAnimationDuration;
          player.eatDirection = player.direction;
          player.eatEffect = {
            x: collectible.x,
            y: collectible.y,
            value: 0,
            color: "#9ef7ff",
            life: GAME_THEME.player.eatAnimationDuration,
            maxLife: GAME_THEME.player.eatAnimationDuration
          };
          addBurst(collectible.x, collectible.y, "#9ef7ff", 20, 96);
          addFloatingText(collectible.x, collectible.y - 20, "פתית כוח", "#9ef7ff");
          playTone(760, 0.06, "triangle", 0.02);
          openQuestion(null, { source: "reward" });
          return;
        }
        if (collectible.kind === "boss-core") {
          player.eatAnimation = GAME_THEME.player.eatAnimationDuration;
          player.eatDirection = player.direction;
          addBurst(collectible.x, collectible.y, "#c7a6ff", 30, 130);
          addFloatingText(collectible.x, collectible.y - 22, "ליבת הבוס", "#c7a6ff");
          playTone(360, 0.1, "triangle", 0.03);
          if (state.boss) {
            openQuestion(state.boss);
          }
          return;
        }
        if (collectible.kind === "bonus-letter") {
          collectArcadeBonusLetter(collectible);
          collected += 1;
          continue;
        }
        if (collectible.kind === "bonus-key") {
          collectArcadeBonusKey(collectible);
          collected += 1;
          continue;
        }
        const award = awardScore({
          type: "collectible",
          value: collectible.value
        });
        collected += 1;
        player.eatAnimation = GAME_THEME.player.eatAnimationDuration;
        player.eatDirection = player.direction;
        player.eatEffect = {
          x: collectible.x,
          y: collectible.y,
          value: collectible.value,
          color: collectible.value > 10
            ? getCurrentLevel().bonusCollectibleColor
            : getCurrentLevel().collectibleColor,
          life: GAME_THEME.player.eatAnimationDuration,
          maxLife: GAME_THEME.player.eatAnimationDuration
        };
        if (collectible.value > 10) {
          player.rewardAnimation = Math.max(player.rewardAnimation || 0, 0.42);
          addBurst(collectible.x, collectible.y, "#ffd84a", 12, 70);
          addFloatingText(collectible.x, collectible.y - 12, `+${award.total}`, "#ffd84a");
        } else if (Math.random() < 0.2) {
          addBurst(collectible.x, collectible.y, "#f7fbff", 4, 42);
        }
      }
    }

    if (collected > 0) {
      playTone(620 + Math.min(collected, 4) * 40, 0.035, "square", 0.012);
      updateMission("score");
      updateHud();
    }

    tryOpenArcadeBonusChest();
  }

  function collectArcadeBonusLetter(collectible) {
    const player = state.player;
    const letter = collectible.letter || "?";
    const award = awardScore({
      type: "collectible",
      value: collectible.value || CONFIG.arcadeBonus.letterScoreValue
    });
    if (!state.arcadeBonus.collectedLetters.includes(letter)) {
      state.arcadeBonus.collectedLetters.push(letter);
    }

    player.eatAnimation = GAME_THEME.player.eatAnimationDuration;
    player.eatDirection = player.direction;
    player.rewardAnimation = Math.max(player.rewardAnimation || 0, 0.38);
    addBurst(collectible.x, collectible.y, "#ffd84a", 18, 90);
    addFloatingText(collectible.x, collectible.y - 18, `${letter} +${award.total}`, "#ffd84a");
    playTone(760 + state.arcadeBonus.collectedLetters.length * 70, 0.06, "triangle", 0.022);

    const completedWord = CONFIG.arcadeBonus.letters.every((target) => state.arcadeBonus.collectedLetters.includes(target));
    if (completedWord && !state.arcadeBonus.letterHeartAwarded) {
      state.arcadeBonus.letterHeartAwarded = true;
      state.lives += 1;
      state.shake = Math.max(state.shake, 0.12);
      player.rewardAnimation = 1.05;
      addBurst(player.x, player.y, "#ff5f9f", 44, 150);
      addFloatingText(player.x, player.y - 46, "כפל הושלם!", "#ffd84a");
      addFloatingText(player.x, player.y - 28, "+לב", "#ff5f9f");
      playTone(880, 0.12, "triangle", 0.04);
      window.setTimeout(() => playTone(1160, 0.11, "triangle", 0.035), 90);
    }

    updateMission("score");
    updateHud();
  }

  function collectArcadeBonusKey(collectible) {
    const player = state.player;
    const award = awardScore({
      type: "collectible",
      value: collectible.value || CONFIG.arcadeBonus.keyScoreValue
    });
    state.arcadeBonus.keysCollected = clamp(
      state.arcadeBonus.keysCollected + 1,
      0,
      CONFIG.arcadeBonus.keysRequired
    );

    player.eatAnimation = GAME_THEME.player.eatAnimationDuration;
    player.eatDirection = player.direction;
    player.rewardAnimation = Math.max(player.rewardAnimation || 0, 0.44);
    addBurst(collectible.x, collectible.y, "#ffd84a", 20, 100);
    addFloatingText(
      collectible.x,
      collectible.y - 20,
      `מפתח ${state.arcadeBonus.keysCollected}/${CONFIG.arcadeBonus.keysRequired}`,
      "#ffd84a"
    );
    addFloatingText(collectible.x, collectible.y - 4, `+${award.total}`, "#fff7c6");
    playTone(620 + state.arcadeBonus.keysCollected * 95, 0.08, "square", 0.018);

    if (state.arcadeBonus.keysCollected >= CONFIG.arcadeBonus.keysRequired && !state.arcadeBonus.chestOpened) {
      const chest = centerOfCell(getArcadeChestCell().x, getArcadeChestCell().y);
      addBurst(chest.x, chest.y, "#ffd84a", 30, 130);
      addFloatingText(chest.x, chest.y - 28, "התיבה מוכנה!", "#ffd84a");
      playTone(980, 0.12, "triangle", 0.03);
    }

    updateMission("score");
    updateHud();
  }

  function tryOpenArcadeBonusChest() {
    const player = state.player;
    if (!player || state.arcadeBonus.chestOpened || state.arcadeBonus.keysCollected < CONFIG.arcadeBonus.keysRequired) {
      return false;
    }

    const chestCell = getArcadeChestCell();
    const chest = centerOfCell(chestCell.x, chestCell.y);
    const dx = chest.x - player.x;
    const dy = chest.y - player.y;
    const touchRadius = player.radius + TILE * 0.56;
    if (dx * dx + dy * dy > touchRadius * touchRadius) {
      return false;
    }

    const reward = randomItem(["heart", "shield", "score"]);
    state.arcadeBonus.chestOpened = true;
    state.arcadeBonus.chestReward = reward;
    state.arcadeBonus.chestOpenedAt = state.clock;
    state.shake = Math.max(state.shake, 0.18);
    player.rewardAnimation = 1.05;

    addBurst(chest.x, chest.y, "#ffd84a", 56, 175);
    addFloatingText(chest.x, chest.y - 44, "התיבה נפתחה!", "#ffd84a");
    playTone(420, 0.08, "triangle", 0.028);
    window.setTimeout(() => playTone(760, 0.1, "triangle", 0.033), 90);
    window.setTimeout(() => playTone(1080, 0.12, "triangle", 0.04), 190);

    if (reward === "heart") {
      state.lives += 1;
      addFloatingText(chest.x, chest.y - 24, "+לב", "#ff5f9f");
      showArcadeRewardBanner("heart");
      addBurst(player.x, player.y, "#ff5f9f", 28, 120);
    } else if (reward === "shield") {
      player.invulnerable = Math.max(player.invulnerable || 0, CONFIG.arcadeBonus.chestShieldSeconds);
      addFloatingText(chest.x, chest.y - 24, "מגן זהב!", "#9ef7ff");
      showArcadeRewardBanner("shield");
      addBurst(player.x, player.y, "#9ef7ff", 34, 135);
    } else {
      const award = awardScore({
        type: "collectible",
        value: CONFIG.arcadeBonus.chestScoreValue
      });
      addFloatingText(chest.x, chest.y - 24, `אוצר +${award.total}`, "#fff7c6");
      showArcadeRewardBanner("score", {
        score: award.total
      });
      updateMission("score");
    }

    updateHud();
    return true;
  }

  function getArcadeRewardPresentation(reward, options = {}) {
    if (reward === "heart") {
      return {
        title: "קיבלת מתנה!",
        label: "לב נוסף",
        detail: "עוד הזדמנות להמשיך במבוך",
        color: "#ff5f9f",
        accent: "#ffd1e3"
      };
    }

    if (reward === "shield") {
      return {
        title: "קיבלת מתנה!",
        label: "מגן זהב",
        detail: `${CONFIG.arcadeBonus.chestShieldSeconds} שניות של הגנה`,
        color: "#9ef7ff",
        accent: "#fff7c6"
      };
    }

    const score = Number.isFinite(options.score) ? options.score : CONFIG.arcadeBonus.chestScoreValue;
    return {
      title: "קיבלת מתנה!",
      label: "אוצר נקודות",
      detail: `+${score} נקודות`,
      color: "#ffd84a",
      accent: "#fff7c6"
    };
  }

  function showArcadeRewardBanner(reward, options = {}) {
    const presentation = getArcadeRewardPresentation(reward, options);
    const duration = options.duration || 2.45;
    state.arcadeRewardBanner = {
      reward,
      ...presentation,
      life: duration,
      maxLife: duration
    };
  }

  function updateEnemies(dt) {
    const playerCell = toCell(state.player.x, state.player.y);
    for (const enemy of state.enemies) {
      enemy.pathCooldown -= dt;
      enemy.roamTargetCooldown = Math.max(0, (enemy.roamTargetCooldown || 0) - dt);
      enemy.spawnFlash = Math.max(0, enemy.spawnFlash - dt);
      enemy.wobble += dt * 4;

      const beforeX = enemy.x;
      const beforeY = enemy.y;
      const cell = toCell(enemy.x, enemy.y);
      const center = centerOfCell(cell.x, cell.y);
      const centerTolerance = Math.max(2.6, enemy.speed * dt + 0.8);
      const nearCenter = Math.abs(enemy.x - center.x) <= centerTolerance
        && Math.abs(enemy.y - center.y) <= centerTolerance;
      const blocked = !canMove(enemy, enemy.direction, Math.max(3.2, enemy.speed * dt + 1));

      // Choose a route only at a lane center or when a wall blocks movement.
      // Re-routing in the middle of a corridor could wedge enemies on phones
      // where frame intervals are larger and less consistent.
      // Do not snap back to the same cell center on every animation frame.
      // On phones an enemy moves only about 1-2 logical pixels per frame, so the
      // old unconditional nearCenter branch continuously reset its position and
      // made it look frozen. The cooldown now lets it leave the intersection.
      if (blocked || (nearCenter && enemy.pathCooldown <= 0)) {
        enemy.x = center.x;
        enemy.y = center.y;
        enemy.direction = findNextDirection(
          cell,
          getEnemyTarget(enemy, playerCell),
          enemy.direction
        );
        enemy.pathCooldown = Math.max(0.12, (TILE * 0.55) / Math.max(enemy.speed, 1));
      }

      moveActor(enemy, enemy.direction, enemy.speed * dt);

      let movedDistance = Math.hypot(enemy.x - beforeX, enemy.y - beforeY);
      if (movedDistance < 0.05) {
        const stuckCell = toCell(enemy.x, enemy.y);
        const stuckCenter = centerOfCell(stuckCell.x, stuckCell.y);
        enemy.x = stuckCenter.x;
        enemy.y = stuckCenter.y;
        enemy.direction = findNextDirection(
          stuckCell,
          getEnemyTarget(enemy, playerCell),
          enemy.direction
        );
        moveActor(enemy, enemy.direction, Math.max(1.5, enemy.speed * dt));
        movedDistance = Math.hypot(enemy.x - stuckCenter.x, enemy.y - stuckCenter.y);
      }

      enemy.stuckTime = movedDistance < 0.05 ? (enemy.stuckTime || 0) + dt : 0;
      if (enemy.stuckTime > 0.35) {
        const stuckCell = toCell(enemy.x, enemy.y);
        const stuckCenter = centerOfCell(stuckCell.x, stuckCell.y);
        enemy.x = stuckCenter.x;
        enemy.y = stuckCenter.y;
        enemy.direction = findNextDirection(
          stuckCell,
          getEnemyTarget(enemy, playerCell),
          OPPOSITE[enemy.direction] || enemy.direction
        );
        enemy.pathCooldown = 0;
        enemy.stuckTime = 0;
      }
    }
  }

  function setBossDirection(boss, direction) {
    if (!boss || !DIRS[direction] || direction === "none") {
      return;
    }
    if (boss.direction !== direction) {
      boss.turnDirection = direction;
      boss.turnAnimation = Math.max(boss.turnAnimation || 0, 0.22);
    }
    boss.direction = direction;
  }

  function updateBoss(dt) {
    const boss = state.boss;
    if (!boss || !state.player) {
      return;
    }

    boss.spawnProgress = clamp(boss.spawnProgress + dt * 0.82, 0, 1);
    boss.wobble += dt * 3.15;
    boss.turnAnimation = Math.max(0, (boss.turnAnimation || 0) - dt);
    if (state.bossIntro) {
      state.bossIntro.life -= dt;
      if (state.bossIntro.life <= 0) {
        state.bossIntro = null;
      }
    }

    if (boss.spawnProgress < 0.78) {
      boss.lastMoveDistance = 0;
      boss.walkCycle = ((boss.walkCycle || 0) + dt * 1.35) % (Math.PI * 2);
      boss.trail = (boss.trail || []).filter((point) => {
        point.life -= dt;
        return point.life > 0;
      });
      return;
    }

    const playerCell = toCell(state.player.x, state.player.y);
    const beforeX = boss.x;
    const beforeY = boss.y;
    const cell = toCell(boss.x, boss.y);
    const center = centerOfCell(cell.x, cell.y);
    boss.pathCooldown -= dt;

    const centerTolerance = Math.max(2.8, boss.speed * dt + 0.9);
    const nearCenter = Math.abs(boss.x - center.x) <= centerTolerance
      && Math.abs(boss.y - center.y) <= centerTolerance;
    const blocked = !canMove(boss, boss.direction, Math.max(3.2, boss.speed * dt + 1));

    if (blocked || (nearCenter && boss.pathCooldown <= 0)) {
      boss.x = center.x;
      boss.y = center.y;
      setBossDirection(boss, findNextDirection(cell, normalizeTargetCell(playerCell), boss.direction));
      boss.pathCooldown = Math.max(0.1, (TILE * 0.48) / Math.max(boss.speed, 1));
    }

    moveActor(boss, boss.direction, boss.speed * dt);

    let movedDistance = Math.hypot(boss.x - beforeX, boss.y - beforeY);
    boss.stuckTime = movedDistance < 0.05 ? (boss.stuckTime || 0) + dt : 0;
    if (boss.stuckTime > 0.32) {
      const stuckCell = toCell(boss.x, boss.y);
      const stuckCenter = centerOfCell(stuckCell.x, stuckCell.y);
      boss.x = stuckCenter.x;
      boss.y = stuckCenter.y;
      setBossDirection(boss, findNextDirection(
        stuckCell,
        normalizeTargetCell(playerCell),
        OPPOSITE[boss.direction] || boss.direction
      ));
      boss.pathCooldown = 0;
      boss.stuckTime = 0;
      movedDistance = Math.hypot(boss.x - beforeX, boss.y - beforeY);
    }

    boss.lastMoveDistance = movedDistance;
    if (movedDistance > 0.04) {
      boss.walkCycle = ((boss.walkCycle || 0) + movedDistance * 0.16) % (Math.PI * 2);
      boss.trail = boss.trail || [];
      boss.trail.unshift({ x: beforeX, y: beforeY, life: 0.42, direction: boss.direction });
    } else {
      boss.walkCycle = ((boss.walkCycle || 0) + dt * 1.15) % (Math.PI * 2);
    }
    boss.trail = (boss.trail || []).filter((point) => {
      point.life -= dt;
      return point.life > 0;
    }).slice(0, 10);
  }

  function getEnemyTarget(enemy, playerCell) {
    const player = state.player;
    const enemyCell = toCell(enemy.x, enemy.y);
    const distanceToPlayer = distanceCells(enemyCell, playerCell);
    const chaseDistance = MOBILE_RUNTIME.coarse ? 6 : 7;
    const alertDistance = MOBILE_RUNTIME.coarse ? 9 : 10;

    if (player.invulnerable > 0) {
      return normalizeTargetCell(enemy.scatter);
    }

    if (distanceToPlayer > alertDistance) {
      return getEnemyRoamTarget(enemy, enemyCell);
    }

    if (distanceToPlayer > chaseDistance) {
      if (enemy.personality === 0 || enemy.personality === 3) {
        return getEnemyRoamTarget(enemy, enemyCell);
      }
      const playerDir = DIRS[player.direction] || DIRS.right;
      return normalizeTargetCell({
        x: playerCell.x + playerDir.x * 2,
        y: playerCell.y + playerDir.y * 2
      });
    }

    const playerDir = DIRS[player.direction] || DIRS.right;
    const cycle = state.clock % 24;
    const aggression = getDifficultySettings().enemyAiAggressiveness || 1;
    const scatterWindow = !MOBILE_RUNTIME.coarse && state.clock > 10 && cycle > 18 + clamp((aggression - 1) * 5, 0, 4);

    if (scatterWindow) {
      return normalizeTargetCell(enemy.scatter);
    }

    if (enemy.personality === 1) {
      return normalizeTargetCell({
        x: playerCell.x + playerDir.x * Math.round(3 + aggression),
        y: playerCell.y + playerDir.y * Math.round(3 + aggression)
      });
    }

    if (enemy.personality === 2) {
      const side = state.clock % 6 < 3 ? { x: playerDir.y, y: -playerDir.x } : { x: -playerDir.y, y: playerDir.x };
      return normalizeTargetCell({
        x: playerCell.x + side.x * 5,
        y: playerCell.y + side.y * 5
      });
    }

    if (!MOBILE_RUNTIME.coarse
      && enemy.personality === 3
      && distanceToPlayer < 5) {
      return normalizeTargetCell(enemy.scatter);
    }

    return normalizeTargetCell(playerCell);
  }

  function getEnemyRoamTarget(enemy, enemyCell) {
    if (!enemy.roamTarget
      || enemy.roamTargetCooldown <= 0
      || distanceCells(enemyCell, enemy.roamTarget) <= 1
      || !state.reachable.has(cellKey(enemy.roamTarget.x, enemy.roamTarget.y))) {
      enemy.roamTarget = chooseEnemyRoamCell(enemy.id || enemy.personality || 0, enemyCell);
      enemy.roamTargetCooldown = 3.2 + Math.random() * 4.2;
    }

    return normalizeTargetCell(enemy.roamTarget);
  }

  function normalizeTargetCell(cell) {
    const clampedCell = {
      x: clamp(cell.x, 1, COLS - 2),
      y: clamp(cell.y, 1, ROWS - 2)
    };

    if (state.reachable.has(cellKey(clampedCell.x, clampedCell.y))) {
      return clampedCell;
    }

    let best = PLAYER_START;
    let bestDistance = Infinity;
    for (const reachable of state.reachableList) {
      const dx = reachable.x - clampedCell.x;
      const dy = reachable.y - clampedCell.y;
      const d = dx * dx + dy * dy;
      if (d < bestDistance) {
        best = reachable;
        bestDistance = d;
      }
    }

    return best;
  }

  function findNextDirection(start, target, currentDirection) {
    const options = DIR_NAMES.filter((dir) => {
      const next = {
        x: start.x + DIRS[dir].x,
        y: start.y + DIRS[dir].y
      };
      return state.reachable.has(cellKey(next.x, next.y));
    });

    if (options.length === 0) {
      return OPPOSITE[currentDirection] || "right";
    }

    const withoutReverse = options.filter((dir) => dir !== OPPOSITE[currentDirection]);
    const candidateMoves = MOBILE_RUNTIME.coarse
      ? options
      : (withoutReverse.length > 0 ? withoutReverse : options);
    const firstMoves = MOBILE_RUNTIME.coarse ? candidateMoves : shuffle(candidateMoves);
    const visited = new Set([cellKey(start.x, start.y)]);
    const queue = [];

    for (const dir of firstMoves) {
      const next = {
        x: start.x + DIRS[dir].x,
        y: start.y + DIRS[dir].y
      };
      const key = cellKey(next.x, next.y);
      visited.add(key);
      queue.push({ cell: next, first: dir });
    }

    let fallback = firstMoves[0];
    let fallbackScore = Infinity;

    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i];
      const score = distanceCells(item.cell, target);
      if (score < fallbackScore) {
        fallback = item.first;
        fallbackScore = score;
      }

      if (item.cell.x === target.x && item.cell.y === target.y) {
        return item.first;
      }

      for (const dir of DIR_NAMES) {
        const next = {
          x: item.cell.x + DIRS[dir].x,
          y: item.cell.y + DIRS[dir].y
        };
        const key = cellKey(next.x, next.y);
        if (!visited.has(key) && state.reachable.has(key)) {
          visited.add(key);
          queue.push({ cell: next, first: item.first });
        }
      }
    }

    return fallback;
  }

  function checkEnemyCollision() {
    if (state.player.invulnerable > 0 || state.phase !== "playing") {
      return;
    }

    const player = state.player;
    if (state.boss && state.boss.spawnProgress >= 0.86) {
      const dx = state.boss.x - player.x;
      const dy = state.boss.y - player.y;
      const radius = (state.boss.collisionRadius || state.boss.radius) + player.radius - 2;
      if (dx * dx + dy * dy < radius * radius) {
        openQuestion(state.boss);
        return;
      }
    }

    const enemy = state.enemies.find((candidate) => {
      const dx = candidate.x - player.x;
      const dy = candidate.y - player.y;
      const radius = candidate.radius + player.radius - 1.5;
      return dx * dx + dy * dy < radius * radius;
    });

    if (enemy) {
      openQuestion(enemy);
    }
  }

  function checkEnvironmentHazardCollision() {
    if (!state.player || state.player.invulnerable > 0 || state.phase !== "playing") {
      return;
    }

    for (const hazard of state.hazards) {
      if (!isHazardActive(hazard) || hazard.hitCooldown > 0) {
        continue;
      }
      if (playerTouchesHazard(hazard)) {
        applyEnvironmentHazardHit(hazard);
        return;
      }
    }
  }

  function isHazardActive(hazard) {
    return hazard.age >= hazard.telegraph;
  }

  function playerTouchesHazard(hazard) {
    const player = state.player;
    const radius = player.radius * 0.78;
    for (const cell of hazard.cells) {
      const inset = TILE * 0.18;
      if (circleRectCollision(
        player.x,
        player.y,
        radius,
        cell.x * TILE + inset,
        cell.y * TILE + inset,
        TILE - inset * 2,
        TILE - inset * 2
      )) {
        return true;
      }
    }
    return false;
  }

  function applyEnvironmentHazardHit(hazard) {
    hazard.hitCooldown = 1.5;
    state.lives -= 1;
    state.hitsTaken += 1;
    applyCombo("lifeLost");
    updateMission("wrongAnswer");
    state.shake = 0.32;
    playWrongSound();
    pulseElement(stage, "stage-hit");
    pulseElement(els.lives.closest(".metric"), "life-hit");
    const player = state.player;
    const color = hazard.color || getCurrentLevel().accent;
    addBurst(player.x, player.y, color, 30, 140);
    addFloatingText(player.x, player.y - 44, hazard.hitText || "זהירות!", "#ffd84a");
    addFloatingText(player.x, player.y - 26, "-חיים", "#ff4c5f");

    if (state.lives <= 0) {
      showEndScreen(false);
      return;
    }

    resetPositionsAfterHit();
    state.player.invulnerable = 2.8;
    updateHud();
  }

  function generateQuestion() {
    const difficulty = getDifficultySettings();
    const reviewQuestion = Math.random() < getAdaptiveQuestionChance() ? createReviewQuestion(difficulty) : null;
    const question = reviewQuestion || createRandomQuestion();
    rememberQuestionKey(question.key);
    return question;
  }

  function generateRewardQuestion() {
    const difficulty = getDifficultySettings();
    let pair;
    if (difficulty.questionMode === "table") {
      pair = { a: randomInt(1, 8), b: randomInt(1, 8) };
    } else if (difficulty.questionMode === "filteredTable") {
      pair = { a: randomInt(2, 9), b: randomInt(2, 8) };
    } else {
      pair = { a: randomInt(11, 24), b: randomInt(2, 6) };
    }

    for (let attempt = 0; attempt < 8 && hasRecentQuestion(factKey(pair.a, pair.b)); attempt += 1) {
      pair = difficulty.questionMode === "table"
        ? { a: randomInt(1, 8), b: randomInt(1, 8) }
        : { a: randomInt(2, 12), b: randomInt(2, 6) };
    }

    const question = makeMultiplicationQuestion(pair.a, pair.b);
    rememberQuestionKey(question.key);
    return {
      ...question,
      reward: true
    };
  }

  function generatePeakQuestion() {
    const question = createHardestQuestion(getDifficultySettings());
    rememberQuestionKey(question.key);
    return {
      ...question,
      peak: true
    };
  }

  function createRandomQuestion() {
    const difficulty = getDifficultySettings();
    let { a, b } = createFactorPair(difficulty);

    for (let attempt = 0; attempt < 12 && hasRecentQuestion(factKey(a, b)); attempt += 1) {
      ({ a, b } = createFactorPair(difficulty));
    }

    return makeMultiplicationQuestion(a, b);
  }

  function createHardestQuestion(difficulty) {
    if (difficulty.questionMode === "table") {
      return makeMultiplicationQuestion(9, 9);
    }

    if (difficulty.questionMode === "filteredTable") {
      return makeMultiplicationQuestion(9, 8);
    }

    if (difficulty.questionMode === "twoByOne") {
      return makeMultiplicationQuestion(97, 9);
    }

    if (difficulty.questionMode === "legendary") {
      return makeMultiplicationQuestion(99, 98);
    }

    return makeMultiplicationQuestion(98, 97);
  }

  function createFactorPair(difficulty) {
    if (difficulty.questionMode === "table") {
      return {
        a: randomInt(1, 10),
        b: randomInt(1, 10)
      };
    }

    if (difficulty.questionMode === "filteredTable") {
      return {
        a: randomItem(NON_EASY_FACTORS),
        b: randomItem(NON_EASY_FACTORS)
      };
    }

    if (difficulty.questionMode === "twoByOne") {
      return {
        a: randomInt(11, 99),
        b: randomItem(NON_EASY_FACTORS)
      };
    }

    if (difficulty.questionMode === "legendary") {
      return {
        a: randomInt(12, 99),
        b: randomInt(12, 99)
      };
    }

    return {
      a: randomInt(11, 99),
      b: randomInt(11, 99)
    };
  }

  function createReviewQuestion(difficulty) {
    const candidates = Object.entries(state.factStats)
      .map(([key, stats]) => ({
        key,
        factors: parseFactKey(key),
        stats,
        weight: Math.max(0, stats.wrong * 2 - stats.correct)
      }))
      .filter((candidate) => {
        return candidate.factors
          && candidate.weight > 0
          && !hasRecentQuestion(candidate.key)
          && isFactAllowedForDifficulty(candidate.factors.a, candidate.factors.b, difficulty);
      });

    if (candidates.length === 0) {
      return null;
    }

    const candidate = weightedRandom(candidates);
    const factors = candidate.factors;

    return makeMultiplicationQuestion(factors.a, factors.b);
  }

  function isFactAllowedForDifficulty(a, b, difficulty) {
    if (difficulty.questionMode === "table") {
      return isBetween(a, 1, 10) && isBetween(b, 1, 10);
    }

    if (difficulty.questionMode === "filteredTable") {
      return NON_EASY_FACTORS.includes(a) && NON_EASY_FACTORS.includes(b);
    }

    if (difficulty.questionMode === "twoByOne") {
      return isBetween(a, 11, 99) && NON_EASY_FACTORS.includes(b);
    }

    if (difficulty.questionMode === "legendary") {
      return isBetween(a, 12, 99) && isBetween(b, 12, 99);
    }

    return isBetween(a, 11, 99) && isBetween(b, 11, 99);
  }

  function isBetween(value, min, max) {
    return value >= min && value <= max;
  }

  function makeMultiplicationQuestion(a, b) {
    return {
      key: factKey(a, b),
      text: formatQuestion(a, "×", b),
      answer: a * b
    };
  }

  function formatQuestion(left, operator, right) {
    return `${LTR_ISOLATE_START}${left} ${operator} ${right} = ?${LTR_ISOLATE_END}`;
  }

  function factKey(a, b) {
    return `${a}×${b}`;
  }

  function parseFactKey(key) {
    const match = /^(\d+)×(\d+)$/.exec(key);
    if (!match) {
      return null;
    }

    return {
      a: Number(match[1]),
      b: Number(match[2])
    };
  }

  function hasRecentQuestion(key) {
    return state.recentQuestionKeys.includes(key);
  }

  function rememberQuestionKey(key) {
    state.recentQuestionKeys.unshift(key);
    state.recentQuestionKeys = state.recentQuestionKeys.slice(0, CONFIG.recentQuestionMemory);
  }

  function weightedRandom(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.random() * total;

    for (const item of items) {
      cursor -= item.weight;
      if (cursor <= 0) {
        return item;
      }
    }

    return items[items.length - 1];
  }

  function recordFactResult(question, correct) {
    if (!question?.key) {
      return;
    }

    const stats = state.factStats[question.key] || { wrong: 0, correct: 0 };
    if (correct) {
      stats.correct += 1;
    } else {
      stats.wrong += 1;
    }

    state.factStats[question.key] = stats;
    saveFactStats();
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function positiveFeedback() {
    return randomItem(uiRuntime("positiveFeedback", CONFIG.positiveFeedback) || CONFIG.positiveFeedback);
  }

  function supportFeedback() {
    return randomItem(uiRuntime("supportFeedback", CONFIG.supportFeedback) || CONFIG.supportFeedback);
  }

  function timeExpiredFeedback(answer) {
    return {
      title: uiRuntime("question.timeoutTitle"),
      message: uiRuntime("question.timeoutNote"),
      answer
    };
  }

  function clearQuestionFeedback() {
    els.questionFeedback.replaceChildren();
    els.questionFeedback.style.color = "";
    delete els.questionFeedback.dataset.feedbackResult;
  }

  function appendFeedbackPart(className, text) {
    const part = document.createElement("span");
    part.className = className;
    part.textContent = text;
    els.questionFeedback.append(part);
    return part;
  }

  function renderQuestionFeedback(result, details = {}) {
    clearQuestionFeedback();
    els.questionFeedback.dataset.feedbackResult = result;

    if (result === "correct") {
      appendFeedbackPart("question-feedback-mark", uiRuntime("question.correctMark"));
      appendFeedbackPart("question-feedback-title", details.title || positiveFeedback());
      appendFeedbackPart("question-feedback-note", details.message || uiRuntime("question.correctDefault"));
      return;
    }

    appendFeedbackPart("question-feedback-title", details.title || supportFeedback());
    appendFeedbackPart("question-feedback-note", details.message || uiRuntime("question.wrongDefault"));

    if (Number.isFinite(details.answer)) {
      const answerWrap = document.createElement("span");
      answerWrap.className = "question-feedback-answer-wrap";

      const label = document.createElement("span");
      label.className = "question-feedback-answer-label";
      label.textContent = uiRuntime("question.correctAnswer");

      const answerValue = document.createElement("strong");
      answerValue.className = "question-feedback-answer";
      answerValue.dir = "ltr";
      answerValue.textContent = String(details.answer);

      answerWrap.append(label, answerValue);
      els.questionFeedback.append(answerWrap);
    }
  }

  function syncQuestionFeedbackDiagnostics(result = null) {
    if (!window.__mathMazeRuntime) {
      return;
    }

    window.__mathMazeRuntime.questionFeedbackResult = result;
  }

  function resetQuestionFeedbackState() {
    els.questionDialog.classList.remove(
      "question-result-correct",
      "question-result-wrong",
      "question-result-timeout"
    );
    delete els.questionDialog.dataset.answerResult;
    clearQuestionFeedback();
    syncQuestionFeedbackDiagnostics(null);
  }

  function setQuestionFeedbackState(result) {
    resetQuestionFeedbackState();
    els.questionDialog.dataset.answerResult = result;
    els.questionDialog.classList.add(`question-result-${result}`);
    syncQuestionFeedbackDiagnostics(result);
  }

  function getQuestionStatusText(enemy, isBossQuestion, isRewardQuestion, isPeakQuestion) {
    const questionCopy = getUiCopy().runtime.question;
    if (isBossQuestion) {
      const bossTitle = state.language === "en" ? "Boss" : (enemy?.title || "בוס");
      return `${bossTitle} · ${questionCopy.bossSuffix}`;
    }
    if (isRewardQuestion) {
      return questionCopy.rewardStatus;
    }
    return isPeakQuestion ? questionCopy.transitionStatus : questionCopy.enemyStatus;
  }

  function updateQuestionLanguageCopy() {
    if (!els.questionDialog || els.questionDialog.hidden) {
      return;
    }

    const isBossQuestion = state.questionSource === "boss";
    const isRewardQuestion = state.questionSource === "reward";
    const currentEnemy = state.enemies.find((enemy) => enemy.id === state.currentEnemyId) || state.boss;
    els.questionStatus.textContent = getQuestionStatusText(
      currentEnemy,
      isBossQuestion,
      isRewardQuestion,
      !isBossQuestion && !isRewardQuestion && isFinalQuestionInStage()
    );
    setText("#question-timer span", uiStatic("timer"));
    setAttr("#answer-input", "aria-label", uiStatic("answer"));
    setText("#submit-answer", uiStatic("submit"));
  }

  function openQuestion(enemy, options = {}) {
    clearQuestionFeedbackTimer();
    resetQuestionFeedbackState();
    setPhase("question");
    resetJoystick();
    const isBossQuestion = enemy?.type === "boss";
    const isRewardQuestion = options.source === "reward";
    const isPeakQuestion = isBossQuestion || isFinalQuestionInStage();
    state.question = isRewardQuestion
      ? generateRewardQuestion()
      : (isPeakQuestion ? generatePeakQuestion() : generateQuestion());
    state.questionStartedAt = performance.now();
    state.currentEnemyId = enemy?.id || null;
    state.questionSource = isRewardQuestion ? "reward" : (isBossQuestion ? "boss" : "enemy");
    if (state.player) {
      state.player.questionAnimation = 0.38;
    }
    state.answerLocked = false;
    els.questionDialog.classList.toggle("question-boss", isBossQuestion);
    els.questionDialog.classList.toggle("question-reward", isRewardQuestion);
    els.questionStatus.textContent = getQuestionStatusText(enemy, isBossQuestion, isRewardQuestion, isPeakQuestion);
    els.questionTitle.dir = "ltr";
    els.questionTitle.textContent = state.question.text;
    clearQuestionFeedback();
    els.answerInput.value = "";
    els.answerInput.disabled = false;
    els.submitAnswer.disabled = false;
    els.questionDialog.hidden = false;
    startQuestionTimer();
    playTone(310, 0.08, "triangle", 0.035);
    setTimeout(() => els.answerInput.focus(), 30);
  }

  function startQuestionTimer() {
    if (!isQuestionTimerEnabled()) {
      state.questionTimeRemaining = null;
      state.questionDeadline = null;
      updateQuestionTimerDisplay();
      return;
    }

    state.questionDeadline = performance.now() + getQuestionTimeLimit() * 1000;
    state.questionTimeRemaining = getQuestionTimeRemaining();
    updateQuestionTimerDisplay();
  }

  function isQuestionTimerEnabled() {
    return getQuestionTimeLimit() > 0;
  }

  function getQuestionTimeLimit() {
    return getDifficultySettings().answerTimeLimit || CONFIG.questionTimeLimit;
  }

  function updateQuestionTimer() {
    if (!isQuestionTimerEnabled() || state.answerLocked || !state.question || state.questionDeadline === null) {
      return;
    }

    state.questionTimeRemaining = getQuestionTimeRemaining();
    updateQuestionTimerDisplay();

    if (state.questionTimeRemaining <= 0) {
      expireQuestionTimer();
    }
  }

  function suspendQuestionTimer() {
    if (
      state.phase !== "question"
      || !isQuestionTimerEnabled()
      || state.answerLocked
      || state.questionDeadline === null
    ) {
      return;
    }

    state.questionTimeRemaining = getQuestionTimeRemaining();
    state.questionDeadline = null;
  }

  function resumeQuestionTimer() {
    if (
      state.phase !== "question"
      || !isQuestionTimerEnabled()
      || state.answerLocked
      || state.questionDeadline !== null
      || state.questionTimeRemaining === null
    ) {
      return;
    }

    if (state.questionTimeRemaining <= 0) {
      expireQuestionTimer();
      return;
    }

    state.questionDeadline = performance.now() + state.questionTimeRemaining * 1000;
    updateQuestionTimerDisplay();
  }

  function getQuestionTimeRemaining() {
    if (state.questionDeadline === null) {
      return null;
    }

    return Math.max(0, (state.questionDeadline - performance.now()) / 1000);
  }

  function updateQuestionTimerDisplay() {
    if (!els.questionTimer || !els.questionTime) {
      return;
    }

    const hasTimer = isQuestionTimerEnabled() && state.questionDeadline !== null && state.questionTimeRemaining !== null;
    els.questionTimer.hidden = !hasTimer;
    if (!hasTimer) {
      return;
    }

    const seconds = Math.ceil(state.questionTimeRemaining);
    els.questionTime.textContent = String(seconds);
    els.questionTimer.classList.toggle("question-timer-low", seconds <= 5);
  }

  function expireQuestionTimer() {
    if (state.answerLocked || !state.question) {
      return;
    }

    state.answerLocked = true;
    els.answerInput.disabled = true;
    els.submitAnswer.disabled = true;
    if (state.questionSource !== "reward") {
      recordFactResult(state.question, false);
      SYSTEMS.recordMathAnswer(state.mathStats, {
        correct: false,
        responseMs: getQuestionTimeLimit() * 1000
      });
      state.incorrectAnswers = state.mathStats.incorrectAnswers;
    }
    state.questionDeadline = null;
    setQuestionFeedbackState("timeout");
    renderQuestionFeedback("timeout", state.questionSource === "reward"
      ? {
        title: uiRuntime("question.rewardTimeoutTitle"),
        message: uiRuntime("question.rewardTimeoutNote"),
        answer: state.question.answer
      }
      : timeExpiredFeedback(state.question.answer));
    scheduleQuestionFinish(false, {
      responseMs: getQuestionTimeLimit() * 1000,
      timedOut: true
    });
  }

  function clearQuestionFeedbackTimer() {
    if (!state.questionFeedbackTimerId) {
      return;
    }

    clearTimeout(state.questionFeedbackTimerId);
    state.questionFeedbackTimerId = null;
  }

  function scheduleQuestionFinish(correct, answerContext = {}) {
    clearQuestionFeedbackTimer();
    state.questionFeedbackTimerId = setTimeout(
      () => finishQuestion(correct, answerContext),
      correct ? CONFIG.questionFeedbackDelay.correct : CONFIG.questionFeedbackDelay.wrong
    );
  }

  function startFinalBossVictorySequence(bossSnapshot, award) {
    if (state.victoryEndTimerId) {
      window.clearTimeout(state.victoryEndTimerId);
    }

    const accent = bossSnapshot.accent || "#55ffd6";
    state.finalBossExplosion = {
      x: bossSnapshot.x,
      y: bossSnapshot.y,
      accent,
      life: 1.15,
      maxLife: 1.15
    };
    state.boss = null;
    state.bossIntro = null;
    state.pendingSpawns = [];
    state.currentEnemyId = null;
    state.question = null;
    state.questionSource = null;
    state.shake = Math.max(state.shake, 0.92);
    setPhase("victory", { force: true });
    resetJoystick();
    updatePauseButton();

    addBurst(bossSnapshot.x, bossSnapshot.y, "#fff7c6", 124, 420);
    addBurst(bossSnapshot.x, bossSnapshot.y, accent, 96, 340);
    addBurst(bossSnapshot.x, bossSnapshot.y, "#ff5fd7", 72, 290);
    addFloatingText(bossSnapshot.x, bossSnapshot.y - 74, "הבוס האחרון נעלם!", "#fff7c6");
    addFloatingText(bossSnapshot.x, bossSnapshot.y - 48, `+${award.total}`, "#ffd84a");
    playTone(180, 0.16, "sawtooth", 0.04);
    window.setTimeout(() => playTone(520, 0.13, "triangle", 0.045), 130);
    window.setTimeout(() => playTone(880, 0.16, "triangle", 0.05), 310);

    state.victoryEndTimerId = window.setTimeout(() => {
      state.victoryEndTimerId = null;
      showEndScreen(true);
    }, 1180);
  }

  function finishQuestion(correct, answerContext = {}) {
    state.questionFeedbackTimerId = null;
    state.questionTimeRemaining = null;
    state.questionDeadline = null;
    updateQuestionTimerDisplay();
    els.questionDialog.hidden = true;
    resetQuestionFeedbackState();
    els.questionDialog.classList.remove("question-boss");
    els.questionDialog.classList.remove("question-reward");
    state.answerLocked = false;
    els.answerInput.disabled = false;
    els.submitAnswer.disabled = false;

    if (correct) {
      applyCorrectAnswer(answerContext);
    } else {
      applyWrongAnswer(answerContext);
    }

    updateHud();
  }

  function applyCorrectAnswer(answerContext = {}) {
    if (state.questionSource === "reward") {
      grantRewardPower(answerContext);
      return;
    }

    const boss = state.boss && state.boss.id === state.currentEnemyId ? state.boss : null;
    const enemy = state.enemies.find((candidate) => candidate.id === state.currentEnemyId);
    const defeatedTarget = boss || enemy;
    const previousLevelIndex = state.levelIndex;
    state.correctAnswers = state.mathStats.correctAnswers;
    applyCombo("success");
    const award = awardScore({
      type: "correctAnswer",
      responseMs: answerContext.responseMs,
      timeLimitMs: isQuestionTimerEnabled() ? getQuestionTimeLimit() * 1000 : 0,
      questionMode: getDifficultySettings().questionMode,
      enemyDefeated: Boolean(defeatedTarget)
    });
    state.shake = 0.07;
    playCorrectSound();
    pulseElement(els.progressWrap, "progress-pulse");
    pulseElement(els.combo.closest(".metric"), "metric-pulse");

    let defeatedBossSnapshot = null;
    if (boss) {
      defeatedBossSnapshot = {
        x: boss.x,
        y: boss.y,
        accent: boss.color || boss.definition?.accent || getCurrentLevel().accent,
        configKey: boss.configKey,
        levelBossKey: getCurrentLevel().bossKey
      };
      state.shake = Math.max(state.shake, 0.5);
      addBurst(boss.x, boss.y, boss.color, 82, 225);
      addFloatingText(boss.x, boss.y - 46, `הבוס נשבר +${award.total}`, "#c7a6ff");
      state.boss = null;
      state.bossIntro = null;
      updateMission("enemyDefeated");
      playTone(540, 0.15, "triangle", 0.045);
    } else if (enemy) {
      addBurst(enemy.x, enemy.y, enemy.color, 36, 150);
      addFloatingText(enemy.x, enemy.y - 24, `+${award.total}`, "#67f08b");
      state.enemies = state.enemies.filter((candidate) => candidate.id !== enemy.id);
      scheduleEnemySpawn(0.9);
      updateMission("enemyDefeated");
    }

    if (state.player) {
      addFloatingText(state.player.x, state.player.y - 44, positiveFeedback(), getCurrentLevel().accent);
    }

    updateMission("correctAnswer");

    const awardedLife = state.correctAnswers % CONFIG.answersPerLevel === 0;
    if (awardedLife) {
      const stageAward = awardScore({
        type: "stageComplete",
        mode: state.mode
      });
      state.lives += 1;
      addFloatingText(state.player.x, state.player.y - 28, `גל +${stageAward.total}`, "#ffd84a");
      addFloatingText(state.player.x, state.player.y - 10, "+חיים", "#ff5f9f");
      playTone(880, 0.12, "triangle", 0.04);
    }

    if (state.mode === "adventure" && state.correctAnswers >= CONFIG.targetCorrect) {
      if (boss && defeatedBossSnapshot.levelBossKey === "stage4") {
        startFinalBossVictorySequence(defeatedBossSnapshot, award);
        return;
      }
      showEndScreen(true);
      return;
    }

    const nextLevelIndex = getLevelIndexForAnswers(state.correctAnswers);
    setPhase("playing");
    state.currentEnemyId = null;
    state.question = null;
    state.questionSource = null;

    if (nextLevelIndex !== previousLevelIndex) {
      enterLevel(nextLevelIndex, { announce: true, awardedLife });
      return;
    }

    ensureEnemyCount();
  }

  function grantRewardPower(answerContext = {}) {
    const player = state.player;
    const award = awardScore({
      type: "collectible",
      value: CONFIG.rewardPower.scoreValue
    });
    applyCombo("success");
    state.shake = 0.08;
    playCorrectSound();
    if (player) {
      player.invulnerable = Math.max(player.invulnerable || 0, CONFIG.rewardPower.durationSeconds);
      player.rewardAnimation = 1.05;
      addBurst(player.x, player.y, "#9ef7ff", 34, 145);
      addFloatingText(player.x, player.y - 46, `כוח קרח ${CONFIG.rewardPower.durationSeconds} שניות`, "#9ef7ff");
      addFloatingText(player.x, player.y - 28, `+${award.total}`, "#ffd84a");
    }
    for (const enemy of state.enemies) {
      enemy.pathCooldown = 0;
      enemy.spawnFlash = Math.max(enemy.spawnFlash || 0, 0.45);
    }
    updateMission("score");
    setPhase("playing");
    state.currentEnemyId = null;
    state.questionSource = null;
    state.question = null;
    updateHud();
  }

  function applyWrongAnswer() {
    if (state.questionSource === "reward") {
      if (state.player) {
        addFloatingText(state.player.x, state.player.y - 38, "לא נורא, ממשיכים", "#9ef7ff");
      }
      playTone(260, 0.08, "triangle", 0.018);
      setPhase("playing");
      state.currentEnemyId = null;
      state.questionSource = null;
      state.question = null;
      return;
    }

    state.lives -= 1;
    state.incorrectAnswers = state.mathStats.incorrectAnswers;
    state.hitsTaken += 1;
    applyCombo("lifeLost");
    state.shake = 0.28;
    playWrongSound();
    updateMission("wrongAnswer");
    pulseElement(stage, "stage-hit");
    pulseElement(els.lives.closest(".metric"), "life-hit");
    addBurst(state.player.x, state.player.y, "#ff4c5f", 26, 130);
    addFloatingText(state.player.x, state.player.y - 44, "מנסים שוב", "#ffd84a");
    addFloatingText(state.player.x, state.player.y - 26, "-חיים", "#ff4c5f");

    if (state.lives <= 0) {
      showEndScreen(false);
      return;
    }

    resetPositionsAfterHit();
    state.player.invulnerable = 2.6;
    setPhase("playing");
    state.currentEnemyId = null;
    state.questionSource = null;
    state.question = null;
  }

  function resetPositionsAfterHit() {
    const playerPos = centerOfCell(PLAYER_START.x, PLAYER_START.y);
    state.player.x = playerPos.x;
    state.player.y = playerPos.y;
    state.player.direction = "right";
    state.player.desiredDirection = "right";
    state.player.directionRequestTime = state.clock;
    state.player.eatAnimation = 0;
    state.player.eatEffect = null;
    state.player.hitAnimation = 0.48;
    state.player.questionAnimation = 0;
    state.player.turnAnimation = 0;
    state.player.trail = [];

    if (state.boss) {
      const bossPos = centerOfCell(CENTER_CELL.x, CENTER_CELL.y);
      state.boss.x = bossPos.x;
      state.boss.y = bossPos.y;
      state.boss.direction = "down";
      state.boss.turnDirection = "down";
      state.boss.pathCooldown = 0;
      state.boss.spawnProgress = 1;
      state.boss.stuckTime = 0;
      state.boss.walkCycle = 0;
      state.boss.lastMoveDistance = 0;
      state.boss.turnAnimation = 0;
      state.boss.trail = [];
      state.bossIntro = null;
      addBurst(bossPos.x, bossPos.y, state.boss.color, 34, 145);
      return;
    }

    state.enemies.forEach((enemy, index) => {
      const cell = chooseEnemySpawnCell(index);
      const pos = centerOfCell(cell.x, cell.y);
      enemy.x = pos.x;
      enemy.y = pos.y;
      enemy.direction = randomItem(DIR_NAMES);
      enemy.pathCooldown = 0;
      enemy.roamTarget = chooseEnemyRoamCell(index, cell);
      enemy.roamTargetCooldown = 1.2 + Math.random() * 2.8;
      enemy.spawnFlash = 0.8;
    });
  }

  function applyFinalScoreBonuses(won) {
    const accuracy = SYSTEMS.getAccuracy(state.mathStats);
    if (state.lives > 0) {
      awardScore({ type: "lifeRemaining", count: state.lives }, { comboMultiplierPct: 100 });
    }
    if (state.hitsTaken === 0 && state.mathStats.totalQuestions > 0) {
      awardScore({ type: "noHitBonus" }, { comboMultiplierPct: 100 });
    }
    if (state.mathStats.totalQuestions >= 5) {
      awardScore({ type: "accuracyBonus", accuracy }, { comboMultiplierPct: 100 });
    }
    if (won && state.sessionStartedAt) {
      const elapsedSeconds = Math.max(0, (performance.now() - state.sessionStartedAt) / 1000);
      const timeBonus = Math.max(0, Math.floor(SYSTEMS.SCORE_CONFIG.timeBonusMax - elapsedSeconds * 6));
      awardScore({ type: "timeBonus", value: timeBonus }, { comboMultiplierPct: 100 });
    }
  }

  function finalizeSession(won) {
    if (state.finalResult) {
      return state.finalResult;
    }

    applyFinalScoreBonuses(won);

    const mode = state.mode;
    const difficulty = state.difficulty;
    const accuracy = SYSTEMS.getAccuracy(state.mathStats);
    const averageAnswerTimeMs = SYSTEMS.getAverageAnswerTime(state.mathStats);
    const reachedStage = mode === "arcade" ? getArcadeWave() : getLevelIndexForAnswers(state.correctAnswers) + 1;
    const previousBest = getPersonalBestForSelection(mode, difficulty);
    const score = state.scoreState.total;
    const resultDate = new Date().toISOString();

    const bestResult = SYSTEMS.recordPersonalBest(state.save, {
      mode,
      difficulty,
      score,
      reachedStage,
      maxCombo: state.comboState.max,
      accuracy,
      date: resultDate
    });
    const newRecord = score > previousBest;

    const entry = SYSTEMS.createLeaderboardEntry({
      playerId: state.playerId,
      nickname: state.playerName || state.save.player.nickname,
      score,
      mode,
      difficulty,
      reachedStage,
      selectedCharacter: state.characterId,
      maxCombo: state.comboState.max,
      accuracy,
      date: resultDate,
      gameVersion: SYSTEMS.GAME_VERSION
    });
    const leaderboardResult = SYSTEMS.addLocalLeaderboardEntry(state.save, entry, {
      limit: CONFIG.leaderboard.limit
    });
    state.latestLeaderboardEntryId = leaderboardResult.entry?.id || null;

    const completionKey = `${mode}:${difficulty}`;
    const previousCompletion = state.save.completedLevels[completionKey] || { reachedStage: 0, won: false };
    state.save.completedLevels[completionKey] = {
      reachedStage: Math.max(previousCompletion.reachedStage || 0, reachedStage),
      won: previousCompletion.won || won,
      updatedAt: resultDate
    };

    const unlocksLegendary = SYSTEMS.shouldUnlockLegendary(state.save, {
      mode,
      difficulty,
      won,
      score
    });
    if (unlocksLegendary) {
      SYSTEMS.unlockDifficulty(state.save, "legendary");
      playMissionSound();
    }

    state.save.player.nickname = state.playerName || state.save.player.nickname;
    state.save.settings.selectedMode = mode;
    state.save.settings.selectedDifficulty = difficulty;
    state.save.settings.selectedCharacter = state.characterId;
    SYSTEMS.persistSave(window.localStorage, state.save, { key: CONFIG.storageKeys.save });

    if (newRecord) {
      state.bestScore = score;
      storage.set(CONFIG.storageKeys.bestScore, String(score));
      els.bestScore.textContent = numberFormat.format(score);
    } else {
      state.bestScore = Math.max(previousBest, bestResult.current);
    }

    state.finalResult = {
      won,
      score,
      previousBest,
      newRecord,
      leaderboardRank: leaderboardResult.rank,
      scoreToNextRank: leaderboardResult.scoreToNextRank,
      mode,
      difficulty,
      reachedStage,
      correctAnswers: state.mathStats.correctAnswers,
      incorrectAnswers: state.mathStats.incorrectAnswers,
      totalQuestions: state.mathStats.totalQuestions,
      accuracy,
      averageAnswerTimeMs,
      fastestAnswerMs: state.mathStats.fastestAnswerMs,
      maxCombo: state.comboState.max,
      remainingLives: state.lives,
      breakdown: { ...state.scoreState.breakdown },
      unlocksLegendary
    };

    return state.finalResult;
  }

  function renderScoreBreakdown(breakdown) {
    if (!els.scoreBreakdownList) {
      return;
    }

    const rows = [
      [uiRuntime("scoreBreakdown.gameplay"), breakdown.gameplay],
      [uiRuntime("scoreBreakdown.math"), breakdown.math],
      [uiRuntime("scoreBreakdown.speed"), breakdown.speed],
      [uiRuntime("scoreBreakdown.enemy"), breakdown.enemy],
      [uiRuntime("scoreBreakdown.mission"), breakdown.mission],
      [uiRuntime("scoreBreakdown.completion"), breakdown.completion],
      [uiRuntime("scoreBreakdown.lives"), breakdown.lives],
      [uiRuntime("scoreBreakdown.noHit"), breakdown.noHit],
      [uiRuntime("scoreBreakdown.accuracy"), breakdown.accuracy],
      [uiRuntime("scoreBreakdown.time"), breakdown.time],
      [`${uiRuntime("scoreBreakdown.difficulty")} ×${(getDifficultySettings().scoreMultiplierPct / 100).toFixed(1)}`, breakdown.difficulty],
      [uiRuntime("scoreBreakdown.combo"), breakdown.combo]
    ];

    els.scoreBreakdownList.replaceChildren();
    rows.forEach(([label, value]) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const amount = document.createElement("strong");
      name.textContent = label;
      amount.textContent = numberFormat.format(Math.max(0, Math.floor(value || 0)));
      item.append(name, amount);
      els.scoreBreakdownList.append(item);
    });
  }

  function isChampionResult(result) {
    return Boolean(result?.won && result.mode === "adventure" && result.correctAnswers >= CONFIG.targetCorrect);
  }

  function renderVictoryConfetti(active) {
    if (!els.victoryConfetti) {
      return;
    }

    if (!active) {
      els.victoryConfetti.replaceChildren();
      return;
    }

    const colors = ["#ffd84a", "#55ffd6", "#ff5fd7", "#9d7cff", "#67f08b", "#fff7c6", "#ff9f1c"];
    const shapes = ["rect", "ribbon", "circle", "diamond", "star"];
    const count = MOBILE_RUNTIME.reducedEffects ? 46 : 92;
    const burstCount = MOBILE_RUNTIME.reducedEffects ? 5 : 10;
    const streamerCount = MOBILE_RUNTIME.reducedEffects ? 5 : 12;
    els.victoryConfetti.replaceChildren();
    for (let index = 0; index < count; index += 1) {
      const piece = document.createElement("i");
      piece.dataset.shape = shapes[index % shapes.length];
      piece.style.setProperty("left", `${2 + Math.random() * 96}%`);
      piece.style.setProperty("--confetti-color", colors[index % colors.length]);
      piece.style.setProperty("--confetti-w", `${5 + Math.random() * 10}px`);
      piece.style.setProperty("--confetti-h", `${8 + Math.random() * 22}px`);
      piece.style.setProperty("--confetti-drift", `${-130 + Math.random() * 260}px`);
      piece.style.setProperty("--confetti-start-rotate", `${Math.random() * 220}deg`);
      piece.style.setProperty("--confetti-rotate", `${520 + Math.random() * 980}deg`);
      piece.style.setProperty("--confetti-delay", `${Math.random() * -4.2}s`);
      piece.style.setProperty("--confetti-duration", `${3.1 + Math.random() * 2.8}s`);
      piece.style.setProperty("--confetti-opacity", `${0.72 + Math.random() * 0.25}`);
      els.victoryConfetti.append(piece);
    }
    for (let index = 0; index < burstCount; index += 1) {
      const burst = document.createElement("b");
      const side = index % 2 === 0 ? 0.32 : 0.68;
      burst.style.setProperty("--burst-x", `${(side + (Math.random() - 0.5) * 0.28) * 100}%`);
      burst.style.setProperty("--burst-y", `${14 + Math.random() * 34}%`);
      burst.style.setProperty("--burst-color", colors[(index * 2) % colors.length]);
      burst.style.setProperty("--burst-delay", `${Math.random() * -1.8}s`);
      burst.style.setProperty("--burst-scale", `${0.82 + Math.random() * 0.72}`);
      els.victoryConfetti.append(burst);
    }
    for (let index = 0; index < streamerCount; index += 1) {
      const streamer = document.createElement("em");
      streamer.style.setProperty("left", `${5 + Math.random() * 90}%`);
      streamer.style.setProperty("--confetti-color", colors[(index * 3) % colors.length]);
      streamer.style.setProperty("--confetti-drift", `${-90 + Math.random() * 180}px`);
      streamer.style.setProperty("--confetti-delay", `${Math.random() * -3.5}s`);
      streamer.style.setProperty("--confetti-duration", `${4.2 + Math.random() * 2.2}s`);
      streamer.style.setProperty("--streamer-rotate", `${220 + Math.random() * 620}deg`);
      els.victoryConfetti.append(streamer);
    }
  }

  function drawRoundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function createSeededRandom(seed) {
    let value = seed % 2147483647;
    if (value <= 0) {
      value += 2147483646;
    }
    return () => {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function drawShareConfettiPiece(context, x, y, width, height, color, rotation, shape) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = Math.max(2, width * 0.22);
    context.shadowColor = `${color}66`;
    context.shadowBlur = 10;
    if (shape === "circle") {
      context.beginPath();
      context.ellipse(0, 0, width * 0.5, width * 0.5, 0, 0, Math.PI * 2);
      context.fill();
    } else if (shape === "diamond") {
      context.beginPath();
      context.moveTo(0, -height * 0.55);
      context.lineTo(width * 0.52, 0);
      context.lineTo(0, height * 0.55);
      context.lineTo(-width * 0.52, 0);
      context.closePath();
      context.fill();
    } else if (shape === "streamer") {
      context.beginPath();
      context.arc(0, 0, width, -Math.PI * 0.1, Math.PI * 1.18);
      context.stroke();
    } else {
      drawRoundedRect(context, -width / 2, -height / 2, width, height, Math.min(8, width * 0.4));
      context.fill();
    }
    context.restore();
  }

  function drawShareConfetti(context, width, height, layer = "back") {
    const random = createSeededRandom(layer === "front" ? 20260707 : 20260706);
    const colors = ["#ffd84a", "#55ffd6", "#ff5fd7", "#9d7cff", "#67f08b", "#fff7c6", "#ff9f1c"];
    const shapes = ["rect", "circle", "diamond", "streamer"];
    const count = layer === "front" ? 42 : 92;
    context.save();
    context.globalAlpha = layer === "front" ? 0.94 : 0.78;
    for (let index = 0; index < count; index += 1) {
      const sideBand = layer === "front" && index % 3 !== 0;
      const x = sideBand
        ? (random() < 0.5 ? 42 + random() * 160 : width - 202 + random() * 160)
        : 34 + random() * (width - 68);
      const yLimit = layer === "front" ? 930 : 1190;
      const y = 52 + random() * yLimit;
      if (layer === "front" && y > 760 && x > 210 && x < width - 210) {
        continue;
      }
      const pieceWidth = 10 + random() * (layer === "front" ? 20 : 28);
      const pieceHeight = 8 + random() * (layer === "front" ? 26 : 34);
      drawShareConfettiPiece(
        context,
        x,
        y,
        pieceWidth,
        pieceHeight,
        colors[index % colors.length],
        random() * Math.PI * 2,
        shapes[index % shapes.length],
      );
    }

    for (let index = 0; index < (layer === "front" ? 6 : 10); index += 1) {
      const centerX = index % 2 === 0 ? 210 + random() * 170 : width - 380 + random() * 170;
      const centerY = 240 + random() * 460;
      const color = colors[(index * 2) % colors.length];
      context.save();
      context.translate(centerX, centerY);
      context.rotate(random() * Math.PI);
      context.strokeStyle = color;
      context.lineWidth = 7;
      context.shadowColor = `${color}88`;
      context.shadowBlur = 14;
      context.beginPath();
      context.arc(0, 0, 48 + random() * 42, -Math.PI * 0.16, Math.PI * 1.22);
      context.stroke();
      context.restore();
    }
    context.restore();
  }

  function drawShareTrophy(context, x, y, size, playerName = "") {
    context.save();
    context.translate(x, y);
    context.shadowColor = "rgba(255, 216, 74, 0.55)";
    context.shadowBlur = size * 0.18;

    const ground = context.createRadialGradient(0, size * 0.57, size * 0.03, 0, size * 0.57, size * 0.46);
    ground.addColorStop(0, "rgba(255, 216, 74, 0.34)");
    ground.addColorStop(0.55, "rgba(85, 255, 214, 0.14)");
    ground.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = ground;
    context.beginPath();
    context.ellipse(0, size * 0.58, size * 0.54, size * 0.17, 0, 0, Math.PI * 2);
    context.fill();

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = size * 0.12;
    context.strokeStyle = "rgba(109, 55, 0, 0.92)";
    context.beginPath();
    context.ellipse(-size * 0.33, -size * 0.1, size * 0.22, size * 0.24, -0.12, Math.PI * 0.58, Math.PI * 1.5);
    context.stroke();
    context.beginPath();
    context.ellipse(size * 0.33, -size * 0.1, size * 0.22, size * 0.24, 0.12, Math.PI * 1.5, Math.PI * 2.42);
    context.stroke();
    context.lineWidth = size * 0.07;
    context.strokeStyle = "#ffe88c";
    context.beginPath();
    context.ellipse(-size * 0.33, -size * 0.1, size * 0.22, size * 0.24, -0.12, Math.PI * 0.58, Math.PI * 1.5);
    context.stroke();
    context.beginPath();
    context.ellipse(size * 0.33, -size * 0.1, size * 0.22, size * 0.24, 0.12, Math.PI * 1.5, Math.PI * 2.42);
    context.stroke();

    const cupGradient = context.createLinearGradient(-size * 0.36, -size * 0.4, size * 0.38, size * 0.24);
    cupGradient.addColorStop(0, "#7c3d00");
    cupGradient.addColorStop(0.16, "#f0a91f");
    cupGradient.addColorStop(0.38, "#fff2a8");
    cupGradient.addColorStop(0.6, "#ffcf3a");
    cupGradient.addColorStop(0.82, "#a85a08");
    cupGradient.addColorStop(1, "#5f2c00");

    context.beginPath();
    context.moveTo(-size * 0.33, -size * 0.38);
    context.bezierCurveTo(-size * 0.31, -size * 0.18, -size * 0.24, size * 0.12, -size * 0.1, size * 0.22);
    context.quadraticCurveTo(0, size * 0.3, size * 0.1, size * 0.22);
    context.bezierCurveTo(size * 0.24, size * 0.12, size * 0.31, -size * 0.18, size * 0.33, -size * 0.38);
    context.quadraticCurveTo(0, -size * 0.48, -size * 0.33, -size * 0.38);
    context.closePath();
    context.fillStyle = cupGradient;
    context.fill();
    context.lineWidth = size * 0.025;
    context.strokeStyle = "#fff3b8";
    context.stroke();

    const rimGradient = context.createLinearGradient(-size * 0.34, -size * 0.48, size * 0.34, -size * 0.35);
    rimGradient.addColorStop(0, "#8a4300");
    rimGradient.addColorStop(0.32, "#ffd84a");
    rimGradient.addColorStop(0.53, "#fff8c8");
    rimGradient.addColorStop(0.78, "#f4ad22");
    rimGradient.addColorStop(1, "#693000");
    drawRoundedRect(context, -size * 0.35, -size * 0.47, size * 0.7, size * 0.13, size * 0.06);
    context.fillStyle = rimGradient;
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.55)";
    context.lineWidth = size * 0.012;
    context.stroke();

    context.save();
    context.direction = "rtl";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowBlur = size * 0.035;
    context.shadowColor = "rgba(0, 0, 0, 0.45)";
    context.fillStyle = "#6c3500";
    context.font = `900 ${Math.round(size * 0.15)}px Assistant, Arial, sans-serif`;
    context.fillText("כפלול", 0, -size * 0.09);
    context.fillStyle = "#fff1a6";
    context.fillText("כפלול", 0, -size * 0.105);
    context.restore();

    context.globalCompositeOperation = "screen";
    context.strokeStyle = "rgba(255, 255, 255, 0.58)";
    context.lineWidth = size * 0.026;
    context.beginPath();
    context.moveTo(-size * 0.16, -size * 0.34);
    context.bezierCurveTo(-size * 0.24, -size * 0.11, -size * 0.16, size * 0.1, -size * 0.04, size * 0.18);
    context.stroke();
    context.globalCompositeOperation = "source-over";

    const stemGradient = context.createLinearGradient(-size * 0.09, size * 0.2, size * 0.09, size * 0.48);
    stemGradient.addColorStop(0, "#fff0a5");
    stemGradient.addColorStop(0.45, "#d6810c");
    stemGradient.addColorStop(1, "#7e3a00");
    drawRoundedRect(context, -size * 0.08, size * 0.2, size * 0.16, size * 0.28, size * 0.035);
    context.fillStyle = stemGradient;
    context.fill();

    const baseGradient = context.createLinearGradient(-size * 0.33, size * 0.43, size * 0.33, size * 0.65);
    baseGradient.addColorStop(0, "#ffe37c");
    baseGradient.addColorStop(0.28, "#c67209");
    baseGradient.addColorStop(0.74, "#663106");
    baseGradient.addColorStop(1, "#211105");
    drawRoundedRect(context, -size * 0.34, size * 0.43, size * 0.68, size * 0.18, size * 0.045);
    context.fillStyle = baseGradient;
    context.fill();
    context.strokeStyle = "rgba(255, 233, 128, 0.7)";
    context.lineWidth = size * 0.014;
    context.stroke();

    drawRoundedRect(context, -size * 0.26, size * 0.48, size * 0.52, size * 0.07, size * 0.025);
    context.fillStyle = "rgba(28, 13, 4, 0.52)";
    context.fill();
    context.save();
    context.direction = "rtl";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowBlur = 0;
    context.fillStyle = "#fff3b4";
    context.font = `900 ${Math.round(size * 0.062)}px Assistant, Arial, sans-serif`;
    context.fillText(playerName, 0, size * 0.515, size * 0.46);
    context.restore();

    context.restore();
  }

  function drawCenteredLines(context, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
        continue;
      }
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
    if (current && lines.length < maxLines) {
      lines.push(current);
    }
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
    return lines.length * lineHeight;
  }

  async function loadShareImage(source) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = source;
    });
  }

  async function createTrophyShareBlob(result) {
    const width = 1080;
    const height = 1600;
    const shareCanvas = document.createElement("canvas");
    shareCanvas.width = width;
    shareCanvas.height = height;
    const context = shareCanvas.getContext("2d");
    const playerName = state.playerName || state.save.player.nickname || "אלוף כפלול";

    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#142067");
    background.addColorStop(0.48, "#071334");
    background.addColorStop(1, "#040711");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(85, 255, 214, 0.14)";
    context.beginPath();
    context.arc(180, 330, 260, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255, 95, 215, 0.16)";
    context.beginPath();
    context.arc(920, 420, 250, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255, 216, 74, 0.18)";
    context.beginPath();
    context.arc(540, 260, 300, 0, Math.PI * 2);
    context.fill();
    drawShareConfetti(context, width, height, "back");

    const logo = await loadShareImage("assets/kaflul-logo-official.png");
    if (logo) {
      const logoWidth = 420;
      const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
      context.drawImage(logo, (width - logoWidth) / 2, 86, logoWidth, logoHeight);
    } else {
      context.fillStyle = "#fff7c6";
      context.font = "900 92px Assistant, Arial, sans-serif";
      context.textAlign = "center";
      context.fillText("כפלול", width / 2, 178);
    }

    const trophyArt = await loadShareImage("assets/generated/kaflul-champion-trophy-v2.png");
    if (trophyArt) {
      const trophySize = 560;
      const trophyX = (width - trophySize) / 2;
      const trophyY = 256;
      context.save();
      context.shadowColor = "rgba(255, 216, 74, 0.46)";
      context.shadowBlur = 42;
      context.drawImage(trophyArt, trophyX, trophyY, trophySize, trophySize);
      context.restore();

      context.save();
      context.direction = "rtl";
      context.textAlign = "center";
      context.textBaseline = "middle";
      const logoCenterX = width / 2;
      const logoCenterY = trophyY + trophySize * 0.356;
      const plaqueGradient = context.createRadialGradient(
        logoCenterX - trophySize * 0.018,
        logoCenterY - trophySize * 0.018,
        trophySize * 0.012,
        logoCenterX,
        logoCenterY,
        trophySize * 0.128
      );
      plaqueGradient.addColorStop(0, "#fff0a4");
      plaqueGradient.addColorStop(0.45, "#d9840d");
      plaqueGradient.addColorStop(0.78, "#9c4c02");
      plaqueGradient.addColorStop(1, "#693000");

      context.shadowColor = "rgba(74, 31, 0, 0.54)";
      context.shadowBlur = 16;
      context.fillStyle = plaqueGradient;
      context.beginPath();
      context.ellipse(logoCenterX, logoCenterY, trophySize * 0.138, trophySize * 0.043, 0, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.lineWidth = 5;
      context.strokeStyle = "rgba(255, 237, 139, 0.62)";
      context.stroke();

      context.shadowColor = "rgba(74, 31, 0, 0.72)";
      context.shadowBlur = 12;
      context.strokeStyle = "rgba(76, 32, 0, 0.62)";
      context.lineWidth = 6;
      context.fillStyle = "#ffdc3f";
      context.font = "900 58px Assistant, Arial, sans-serif";
      context.strokeText("כפלול", logoCenterX, logoCenterY + trophySize * 0.004, trophySize * 0.292);
      context.fillText("כפלול", logoCenterX, logoCenterY + trophySize * 0.004, trophySize * 0.292);

      context.shadowColor = "rgba(0, 0, 0, 0.72)";
      context.shadowBlur = 10;
      context.fillStyle = "#ffe99b";
      context.font = "900 31px Assistant, Arial, sans-serif";
      context.fillText(playerName, width / 2 + trophySize * 0.002, trophyY + trophySize * 0.786, trophySize * 0.42);
      context.restore();
    } else {
      drawShareTrophy(context, width / 2, 510, 360, playerName);
    }
    drawShareConfetti(context, width, height, "front");

    context.direction = "rtl";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillStyle = "#fff7c6";
    context.shadowColor = "rgba(0, 0, 0, 0.55)";
    context.shadowBlur = 18;
    context.font = "900 74px Assistant, Arial, sans-serif";
    drawCenteredLines(context, `כל הכבוד ${playerName}`, width / 2, 845, 900, 82, 2);

    context.fillStyle = "#ffffff";
    context.font = "900 64px Assistant, Arial, sans-serif";
    drawCenteredLines(context, "אתה אלוף הכפל של כפלול!!", width / 2, 1000, 900, 72, 2);

    context.shadowBlur = 0;
    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    drawRoundedRect(context, 140, 1110, 800, 210, 34);
    context.fill();
    context.strokeStyle = "rgba(255, 216, 74, 0.42)";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "#86fff1";
    context.font = "900 42px Assistant, Arial, sans-serif";
    context.fillText(`נכונות: ${result.correctAnswers}/${CONFIG.targetCorrect}`, width / 2, 1150);
    context.fillStyle = "#ffd84a";
    context.fillText(`ניקוד: ${numberFormat.format(result.score)}`, width / 2, 1220);
    context.fillStyle = "#eefcff";
    context.font = "800 34px Assistant, Arial, sans-serif";
    context.fillText("סיימתי את משחק הכפל של כפלול", width / 2, 1378);

    return new Promise((resolve) => {
      shareCanvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
    });
  }

  function downloadShareBlob(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kaflul-trophy.png";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareTrophyResult() {
    const result = state.finalResult;
    if (!isChampionResult(result)) {
      return;
    }

    if (els.trophyShareStatus) {
      els.trophyShareStatus.textContent = "מכינים תמונת גביע...";
    }

    try {
      const blob = await createTrophyShareBlob(result);
      if (!blob) {
        throw new Error("Could not create trophy image");
      }

      const file = new File([blob], "kaflul-trophy.png", { type: "image/png" });
      const shareData = {
        title: "אלוף הכפל של כפלול",
        text: `${state.playerName || "שחקן"} סיים את כפלול וקיבל גביע!`,
        files: [file]
      };

      if (navigator.canShare?.(shareData) && navigator.share) {
        await navigator.share(shareData);
        if (els.trophyShareStatus) {
          els.trophyShareStatus.textContent = "התמונה מוכנה לשיתוף.";
        }
        return;
      }

      downloadShareBlob(blob);
      if (els.trophyShareStatus) {
        els.trophyShareStatus.textContent = "התמונה נשמרה, אפשר לשתף אותה.";
      }
    } catch {
      if (els.trophyShareStatus) {
        els.trophyShareStatus.textContent = "לא הצלחנו לפתוח שיתוף, נסו שוב.";
      }
    }
  }

  function renderResults(result) {
    const playerName = state.playerName || "שחקן";
    const champion = isChampionResult(result);
    els.endScreen.classList.toggle("final-trophy-screen", champion);
    renderVictoryConfetti(champion);
    if (els.trophyShareButton) {
      els.trophyShareButton.hidden = !champion;
    }
    if (els.trophyShareStatus) {
      els.trophyShareStatus.textContent = "";
    }
    if (els.trophyEngravedName) {
      els.trophyEngravedName.textContent = playerName;
    }
    els.winnerTrophy.hidden = !(result.won || result.newRecord);
    if (els.newRecordBadge) {
      els.newRecordBadge.hidden = champion || !result.newRecord;
    }
    els.endKicker.textContent = champion
      ? "ניצחת את הבוס הרביעי"
      : (result.newRecord ? `שיא חדש, ${playerName}` : (result.won ? `כל הכבוד ${playerName}` : "עוד סיבוב"));
    els.endTitle.textContent = champion
      ? `כל הכבוד ${playerName}, אתה אלוף הכפל של כפלול!!`
      : (result.won
      ? `${playerName} ניצח!`
      : (state.mode === "arcade" ? "המרדף נגמר" : "המשחק נגמר"));
    els.endCopy.textContent = champion
      ? "ענית על 100 תשובות, ניצחת את כל הבוסים וקיבלת את גביע האלופים."
      : (result.unlocksLegendary
      ? "פתחת את רמת אגדי. עכשיו מתחיל המבחן האמיתי."
      : (state.mode === "arcade"
        ? `הגעת לגל ${result.reachedStage} ושמרת שיא מקומי בהיכל.`
        : (result.won ? "השלמת את מסלול ההרפתקה." : "לא נורא, חוזרים חזקים יותר.")));
    els.finalScore.textContent = numberFormat.format(result.score);
    els.previousBest.textContent = numberFormat.format(result.previousBest);
    els.leaderboardRank.textContent = result.leaderboardRank ? `#${result.leaderboardRank}` : "-";
    els.nextRankScore.textContent = result.scoreToNextRank === 0
      ? "בפסגה"
      : (result.scoreToNextRank ? `+${numberFormat.format(result.scoreToNextRank)}` : "-");
    els.resultMode.textContent = modeLabel(result.mode);
    els.resultDifficulty.textContent = difficultyLabel(result.difficulty);
    els.resultStageLabel.firstChild.textContent = result.mode === "arcade" ? "גל " : "שלב ";
    els.resultStage.textContent = result.reachedStage;
    els.finalCorrect.textContent = result.correctAnswers;
    els.finalIncorrect.textContent = result.incorrectAnswers;
    els.finalAccuracy.textContent = `${result.accuracy}%`;
    els.averageAnswerTime.textContent = formatSeconds(result.averageAnswerTimeMs);
    els.maxCombo.textContent = result.maxCombo;
    els.remainingLives.textContent = result.remainingLives;
    renderScoreBreakdown(result.breakdown);
  }

  function showEndScreen(won) {
    const result = finalizeSession(won);
    setPhase("ended");
    resetJoystick();
    state.currentEnemyId = null;
    state.questionSource = null;
    state.question = null;
    state.boss = null;
    state.bossIntro = null;
    state.finalBossExplosion = null;
    els.questionDialog.hidden = true;
    hidePauseScreen();
    renderResults(result);
    els.endScreen.hidden = false;
    playUiMotion(els.endScreen, "screenEnter");

    updatePublishScorePanel();
    window.setTimeout(() => els.retryButton?.focus({ preventScroll: true }), 0);

    if (won || result.newRecord) {
      playUiSound(result.newRecord ? "newRecord" : "reward");
      const resultsMotionTarget = els.endScreen.querySelector(".results-panel") || els.endScreen;
      playUiMotion(resultsMotionTarget, result.newRecord ? "newRecord" : "reward", {
        particles: result.newRecord ? { count: 10, color: "var(--kf-color-gold, #ffd84a)" } : { count: 8 }
      });
      state.fireworkTimer = 0;
      for (let i = 0; i < 7; i += 1) {
        spawnFirework(90 + i * 120, 90 + Math.random() * 210);
      }
    }
  }

  function updateFireworks(dt) {
    if (MOBILE_RUNTIME.reducedEffects) {
      return;
    }
    state.fireworkTimer -= dt;
    if (state.fireworkTimer <= 0) {
      spawnFirework(80 + Math.random() * (WIDTH - 160), 80 + Math.random() * 260);
      state.fireworkTimer = 0.28 + Math.random() * 0.35;
    }
  }

  function addBurst(x, y, color, count, speed) {
    const maxBurstCount = MOBILE_RUNTIME.reducedEffects ? 12 : 42;
    const effectiveCount = Math.min(maxBurstCount, MOBILE_RUNTIME.reducedEffects ? Math.max(3, Math.ceil(count * 0.45)) : count);
    for (let i = 0; i < effectiveCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.9);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color,
        radius: 1.4 + Math.random() * 2.8,
        life: 0.45 + Math.random() * 0.45,
        maxLife: 0.9
      });
    }
  }

  function spawnFirework(x, y) {
    const level = getCurrentLevel();
    const color = randomItem([level.accent, level.bonusCollectibleColor, "#ffd84a", "#67f08b", "#ff5f9f"]);
    addBurst(x, y, color, 58, 210);
    playTone(560 + Math.random() * 260, 0.08, "triangle", 0.018);
  }

  function updateFinalBossExplosion(dt) {
    if (!state.finalBossExplosion) {
      return;
    }

    state.finalBossExplosion.life -= dt;
    if (state.finalBossExplosion.life <= 0) {
      state.finalBossExplosion = null;
    }
  }

  function drawFinalBossExplosion() {
    const explosion = state.finalBossExplosion;
    if (!explosion) {
      return;
    }

    const progress = 1 - clamp(explosion.life / explosion.maxLife, 0, 1);
    const pulse = Math.sin(progress * Math.PI);
    ctx.save();
    ctx.translate(explosion.x, explosion.y);
    ctx.globalCompositeOperation = "lighter";

    const flashRadius = 40 + progress * 190;
    const flash = ctx.createRadialGradient(0, 0, 4, 0, 0, flashRadius);
    flash.addColorStop(0, `rgba(255, 255, 255, ${0.72 * (1 - progress)})`);
    flash.addColorStop(0.22, `rgba(255, 216, 74, ${0.58 * pulse})`);
    flash.addColorStop(0.55, `rgba(85, 255, 214, ${0.36 * (1 - progress * 0.42)})`);
    flash.addColorStop(1, "rgba(255, 95, 215, 0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(0, 0, flashRadius, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < 3; ring += 1) {
      const radius = 34 + progress * (95 + ring * 45);
      ctx.globalAlpha = Math.max(0, (1 - progress) * (0.72 - ring * 0.14));
      ctx.strokeStyle = ring === 0 ? "#fff7c6" : (ring === 1 ? explosion.accent : "#ff5fd7");
      ctx.lineWidth = 7 - ring * 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const shardCount = MOBILE_RUNTIME.reducedEffects ? 8 : 16;
    for (let index = 0; index < shardCount; index += 1) {
      const angle = (index / shardCount) * Math.PI * 2 + progress * 1.4;
      const distance = 30 + progress * (92 + (index % 4) * 24);
      const size = 9 + (index % 3) * 4;
      ctx.globalAlpha = Math.max(0, 1 - progress * 0.88);
      ctx.fillStyle = index % 2 === 0 ? "#fff7c6" : explosion.accent;
      ctx.save();
      ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
      ctx.rotate(angle + progress * 4);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.55, size * 0.4);
      ctx.lineTo(-size * 0.55, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function addFloatingText(x, y, text, color) {
    state.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 0.9,
      maxLife: 0.9
    });
  }

  function updateParticles(dt) {
    state.particles = state.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      return particle.life > 0;
    });
  }

  function updateFloatingTexts(dt) {
    state.floatingTexts = state.floatingTexts.filter((item) => {
      item.life -= dt;
      item.y -= 28 * dt;
      return item.life > 0;
    });
  }

  function updateArcadeRewardBanner(dt) {
    if (!state.arcadeRewardBanner) {
      return;
    }

    state.arcadeRewardBanner.life -= dt;
    if (state.arcadeRewardBanner.life <= 0) {
      state.arcadeRewardBanner = null;
    }
  }

  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    if (state.shake > 0) {
      const amount = state.shake * 12;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }
    applyCameraTransform(ctx);
    drawBackdrop();
    const usingReferenceMazeArt = drawReferenceMazeBoard();
    if (!usingReferenceMazeArt) {
      drawCorridorBase();
      drawMazeFloor();
      drawMazeLaneDepth();
      drawMaze();
      drawMazeSetPieces();
    }
    drawEnvironmentHazards();
    if (!usingReferenceMazeArt) {
      drawArenaLandmarks();
    }
    drawCollectibles();
    drawFirstMazeQuestionGateOverlays();
    drawPlayerCharacter(ctx, state.player);
    drawEnemies();
    drawBoss();
    drawFinalBossExplosion();
    drawParticles();
    drawFloatingTexts();
    drawArenaVignette();
    ctx.restore();

    drawArcadeRewardBanner();
    drawLevelBanner();
    if (state.phase === "paused") {
      drawPaused();
    }
  }

  function getMazeMaterial(level = getCurrentLevel()) {
    const theme = getMazeThemeForLevel(level);
    return theme?.runtime?.material || MAZE_MATERIALS[level.enemyVisualStyle] || MAZE_MATERIALS.ice;
  }

  function getMazeRenderTheme(level = getCurrentLevel()) {
    const theme = getMazeThemeForLevel(level);
    return theme?.runtime?.renderTheme || MAZE_WORLD_RENDER_THEMES[level.enemyVisualStyle] || MAZE_WORLD_RENDER_THEMES.ice;
  }

  function getMazeWorldKey(level = getCurrentLevel()) {
    return level.enemyVisualStyle || "ice";
  }

  function getMazeThemeForLevel(level = getCurrentLevel()) {
    return MAZE_THEME_SYSTEM?.getMazeTheme?.(getMazeWorldKey(level)) || null;
  }

  function getMazeWorldSheet(level = getCurrentLevel()) {
    const worldKey = getMazeWorldKey(level);
    const definition = MAZE_WORLD_SHEETS[worldKey];
    const image = GAME_ASSETS.mazeWorlds[worldKey];
    if (!definition || !image || !image.complete || image.naturalWidth <= 0) {
      return null;
    }
    return { definition, image, worldKey };
  }

  function resolveMazeTilesetAssetPath(source, fallbackBaseUrl = window.location.href) {
    if (!source || typeof source !== "string") {
      return null;
    }
    try {
      return new URL(source, fallbackBaseUrl).toString();
    } catch {
      return source;
    }
  }

  function createDefaultMazeTilesetCrops(tileSize = MAZE_TILE_ATLAS_SIZE) {
    const roles = MAZE_TILE_KEYS.concat(MAZE_TILESET_EXTRA_ROLES);
    return Object.fromEntries(roles.map((role, index) => [
      role,
      {
        x: index * tileSize,
        y: 0,
        w: tileSize,
        h: tileSize
      }
    ]));
  }

  function normalizeMazeTilesetCrop(crop, tileSize = MAZE_TILE_ATLAS_SIZE) {
    if (!crop || typeof crop !== "object") {
      return null;
    }
    const x = Number(crop.x ?? crop.left ?? 0);
    const y = Number(crop.y ?? crop.top ?? 0);
    const w = Number(crop.w ?? crop.width ?? tileSize);
    const h = Number(crop.h ?? crop.height ?? tileSize);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
      return null;
    }
    return { x, y, w, h };
  }

  function findMazeTilesetCrop(metadata, role, tileSize) {
    if (!metadata || typeof metadata !== "object") {
      return null;
    }

    const aliases = MAZE_TILESET_ROLE_ALIASES[role] || [role];
    const sources = [
      metadata.crops,
      metadata.tiles,
      metadata.tileMap,
      metadata.roles,
      metadata
    ].filter((source) => source && typeof source === "object");

    for (const source of sources) {
      for (const alias of aliases) {
        const crop = normalizeMazeTilesetCrop(source[alias], tileSize);
        if (crop) {
          return crop;
        }
      }
    }

    return null;
  }

  function normalizeMazeTilesetMetadata(rawMetadata = null) {
    const hasMetadata = rawMetadata && typeof rawMetadata === "object";
    const tileSize = clamp(Number(rawMetadata?.tileSize || rawMetadata?.tile_size || MAZE_TILE_ATLAS_SIZE), 8, 512);
    const crops = hasMetadata ? {} : createDefaultMazeTilesetCrops(tileSize);
    for (const role of MAZE_TILE_KEYS.concat(MAZE_TILESET_EXTRA_ROLES)) {
      const crop = findMazeTilesetCrop(rawMetadata, role, tileSize);
      if (crop) {
        crops[role] = crop;
      }
    }

    return {
      tileSize,
      atlas: rawMetadata?.atlas || rawMetadata?.source || rawMetadata?.image || rawMetadata?.imageSrc || null,
      crops,
      hasMetadata: Boolean(hasMetadata)
    };
  }

  function markMazeTilesetImageMissing(tilesetState, imageSrc) {
    if (!tilesetState) {
      return;
    }
    tilesetState.image = null;
    tilesetState.imageSrc = imageSrc || tilesetState.imageSrc;
    tilesetState.imageStatus = "missing";
    tilesetState.revision += 1;
    mazeTileAtlasCache.clear();
    mazeStaticBoardCache.clear();
  }

  function loadMazeTilesetImage(tilesetState, imageSrc) {
    if (!tilesetState || !imageSrc) {
      return;
    }

    if (tilesetState.imageSrc === imageSrc
      && (tilesetState.imageStatus === "loading" || tilesetState.imageStatus === "loaded")) {
      return;
    }

    const image = new Image();
    image.decoding = "async";
    tilesetState.image = image;
    tilesetState.imageSrc = imageSrc;
    tilesetState.imageStatus = "loading";
    image.onload = () => {
      tilesetState.imageStatus = image.naturalWidth > 0 ? "loaded" : "missing";
      tilesetState.revision += 1;
      mazeTileAtlasCache.clear();
      mazeStaticBoardCache.clear();
    };
    image.onerror = () => {
      tilesetState.imageStatus = "missing";
      tilesetState.revision += 1;
      mazeTileAtlasCache.clear();
      mazeStaticBoardCache.clear();
    };
    image.src = imageSrc;
  }

  function requestMazeTilesetImage(tilesetState, imageSrc) {
    if (!tilesetState || !imageSrc) {
      return;
    }

    if (tilesetState.imageSrc === imageSrc
      && (tilesetState.imageStatus === "checking"
        || tilesetState.imageStatus === "loading"
        || tilesetState.imageStatus === "loaded")) {
      return;
    }

    if (typeof fetch !== "function") {
      loadMazeTilesetImage(tilesetState, imageSrc);
      return;
    }

    tilesetState.image = null;
    tilesetState.imageSrc = imageSrc;
    tilesetState.imageStatus = "checking";
    fetch(imageSrc, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (response.ok) {
          loadMazeTilesetImage(tilesetState, imageSrc);
          return;
        }
        markMazeTilesetImageMissing(tilesetState, imageSrc);
      })
      .catch(() => {
        markMazeTilesetImageMissing(tilesetState, imageSrc);
      });
  }

  function requestMazeTilesetMetadata(tilesetState) {
    if (!tilesetState || tilesetState.metadataStatus !== "idle") {
      return;
    }

    if (typeof fetch !== "function") {
      tilesetState.metadataStatus = "unavailable";
      tilesetState.definition = normalizeMazeTilesetMetadata(null);
      return;
    }

    tilesetState.metadataStatus = "loading";
    fetch(tilesetState.metadataSrc, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((metadata) => {
        tilesetState.definition = normalizeMazeTilesetMetadata(metadata);
        tilesetState.metadataStatus = metadata ? "loaded" : "missing";
        tilesetState.revision += 1;
        const metadataBaseUrl = resolveMazeTilesetAssetPath(tilesetState.metadataSrc);
        const atlasSrc = resolveMazeTilesetAssetPath(tilesetState.definition.atlas, metadataBaseUrl)
          || tilesetState.defaultImageSrc;
        if (atlasSrc && atlasSrc !== tilesetState.imageSrc) {
          requestMazeTilesetImage(tilesetState, atlasSrc);
        }
        mazeTileAtlasCache.clear();
        mazeStaticBoardCache.clear();
      })
      .catch(() => {
        tilesetState.metadataStatus = "missing";
        tilesetState.definition = normalizeMazeTilesetMetadata(null);
        tilesetState.revision += 1;
        mazeTileAtlasCache.clear();
        mazeStaticBoardCache.clear();
      });
  }

  function getMazeOptionalTilesetState(worldKey) {
    const config = MAZE_OPTIONAL_TILESETS[worldKey];
    if (!config) {
      return null;
    }

    if (mazeOptionalTilesetCache.has(worldKey)) {
      return mazeOptionalTilesetCache.get(worldKey);
    }

    const defaultImageSrc = resolveMazeTilesetAssetPath(config.imageSrc);
    const metadataSrc = resolveMazeTilesetAssetPath(config.metadataSrc);
    const mode = config.mode || "procedural";
    const tilesetState = {
      worldKey,
      mode,
      defaultImageSrc,
      metadataSrc,
      image: null,
      imageSrc: null,
      imageStatus: mode === "procedural" ? "disabled" : "idle",
      metadataStatus: mode === "procedural" ? "disabled" : "idle",
      definition: normalizeMazeTilesetMetadata(null),
      revision: 0
    };
    mazeOptionalTilesetCache.set(worldKey, tilesetState);
    if (mode === "image" || mode === "hybrid") {
      requestMazeTilesetImage(tilesetState, defaultImageSrc);
      requestMazeTilesetMetadata(tilesetState);
    }
    return tilesetState;
  }

  function getLoadedMazeTileset(level = getCurrentLevel()) {
    const worldKey = getMazeWorldKey(level);
    const tilesetState = getMazeOptionalTilesetState(worldKey);
    const image = tilesetState?.image;
    if (!tilesetState
      || tilesetState.imageStatus !== "loaded"
      || !image
      || !image.complete
      || image.naturalWidth <= 0) {
      return null;
    }

    return {
      worldKey,
      image,
      definition: tilesetState.definition || normalizeMazeTilesetMetadata(null),
      cacheKey: `${worldKey}:${tilesetState.imageSrc}:${tilesetState.metadataStatus}:${tilesetState.revision}:${MAZE_OPTIONAL_TILESET_VERSION}`
    };
  }

  function getMazeTilesetCrop(tileset, role) {
    return tileset?.definition?.crops?.[role] || null;
  }

  function drawMazeTilesetAtlasTile(renderContext, tileset, role, x, y, size) {
    const crop = getMazeTilesetCrop(tileset, role);
    if (!tileset || !crop) {
      return false;
    }

    renderContext.save();
    renderContext.imageSmoothingEnabled = true;
    renderContext.imageSmoothingQuality = "high";
    renderContext.drawImage(tileset.image, crop.x, crop.y, crop.w, crop.h, x, y, size, size);
    renderContext.restore();
    return true;
  }

  function drawReferenceMazeBoard() {
    const level = getCurrentLevel();
    const atlas = getMazeAutotileAtlas(level);
    if (!atlas) {
      return false;
    }

    drawAutotileMazeBoard(level, atlas);
    return true;
  }

  function getMazeAutotileTheme(level = getCurrentLevel()) {
    const worldKey = getMazeWorldKey(level);
    const theme = getMazeThemeForLevel(level);
    return theme?.runtime?.autotileTheme || MAZE_AUTOTILE_THEMES[worldKey] || MAZE_AUTOTILE_THEMES.ice;
  }

  function getMazeAutotileAtlas(level = getCurrentLevel()) {
    const theme = getMazeAutotileTheme(level);
    const tileset = getLoadedMazeTileset(level);
    const sheet = null;
    const cacheKey = tileset
      ? `${theme.world}:tileset:${tileset.cacheKey}`
      : `${theme.world}:procedural:${MAZE_PROCEDURAL_ART_VERSION}`;
    if (mazeTileAtlasCache.has(cacheKey)) {
      return mazeTileAtlasCache.get(cacheKey);
    }

    const tileSize = MAZE_TILE_ATLAS_SIZE;
    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = tileSize * MAZE_TILE_KEYS.length;
    atlasCanvas.height = tileSize;
    const atlasContext = atlasCanvas.getContext("2d");
    if (!atlasContext) {
      return null;
    }

    atlasContext.imageSmoothingEnabled = true;
    atlasContext.imageSmoothingQuality = "high";
    for (let index = 0; index < MAZE_TILE_KEYS.length; index += 1) {
      const key = MAZE_TILE_KEYS[index];
      const x = index * tileSize;
      atlasContext.clearRect(x, 0, tileSize, tileSize);
      if (drawMazeTilesetAtlasTile(atlasContext, tileset, key, x, 0, tileSize)) {
        continue;
      }
      if (key === "floor" || key === "floorAlt") {
        drawAtlasFloorTile(atlasContext, theme, sheet, x, 0, tileSize, key === "floorAlt");
      } else if (key === "wall" || key === "wallAlt") {
        drawAtlasWallTile(atlasContext, theme, sheet, x, 0, tileSize, key === "wallAlt");
      } else if (key.startsWith("edge")) {
        drawAtlasEdgeTile(atlasContext, theme, x, 0, tileSize, key);
      } else if (key.startsWith("corner")) {
        drawAtlasCornerTile(atlasContext, theme, x, 0, tileSize, key);
      } else {
        drawAtlasDecorTile(atlasContext, theme, sheet, x, 0, tileSize, key);
      }
    }

    const atlas = {
      canvas: atlasCanvas,
      tileSize,
      theme,
      sheet,
      tileset,
      keyToIndex: Object.fromEntries(MAZE_TILE_KEYS.map((key, index) => [key, index]))
    };
    mazeTileAtlasCache.set(cacheKey, atlas);
    return atlas;
  }

  function drawAtlasReferenceTexture(renderContext, sheet, cropName, x, y, width, height, options = {}) {
    if (!sheet) {
      return false;
    }
    const texture = getMazeWorldCropCanvas(sheet, cropName);
    if (!texture) {
      return false;
    }

    const scale = Math.max(0.25, options.patternScale || 1);
    const sourceWidth = Math.max(4, Math.min(texture.width, Math.ceil(width / scale)));
    const sourceHeight = Math.max(4, Math.min(texture.height, Math.ceil(height / scale)));
    const spanX = Math.max(1, texture.width - sourceWidth);
    const spanY = Math.max(1, texture.height - sourceHeight);
    const sourceX = Math.floor(Math.abs(options.offsetX || 0) % spanX);
    const sourceY = Math.floor(Math.abs(options.offsetY || 0) % spanY);

    renderContext.save();
    renderContext.globalAlpha *= options.alpha ?? 1;
    if (options.blend) {
      renderContext.globalCompositeOperation = options.blend;
    }
    renderContext.imageSmoothingEnabled = true;
    renderContext.imageSmoothingQuality = "high";
    renderContext.drawImage(texture, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    renderContext.restore();
    return true;
  }

  function mazeCellNoise(x, y, salt = 0) {
    let value = Math.imul(x + 1, 374761393)
      ^ Math.imul(y + 1, 668265263)
      ^ Math.imul((state.levelIndex || 0) + 1, 224682251)
      ^ Math.imul(salt + 1, 326648991);
    value ^= value >>> 13;
    value = Math.imul(value, 1274126177);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967295;
  }

  function getMazeProceduralVisuals(theme) {
    if (getMazeProceduralVisuals.cache) {
      return getMazeProceduralVisuals.cache[theme.motif] || getMazeProceduralVisuals.cache.ice;
    }

    const byMotif = {
      ice: {
        floorPanel: "rgba(210, 249, 255, 0.1)",
        floorDetail: "rgba(219, 253, 255, 0.3)",
        floorGlow: "rgba(109, 231, 255, 0.13)",
        wallSeam: "rgba(242, 255, 255, 0.36)",
        wallInset: "rgba(28, 104, 138, 0.32)",
        wallRim: "rgba(242, 255, 255, 0.72)",
        wallAccent: "rgba(130, 238, 255, 0.54)",
        sideShade: "rgba(5, 40, 70, 0.58)",
        ambient: "rgba(123, 231, 255, 0.08)"
      },
      lava: {
        floorPanel: "rgba(255, 150, 58, 0.08)",
        floorDetail: "rgba(255, 127, 32, 0.34)",
        floorGlow: "rgba(255, 88, 20, 0.11)",
        wallSeam: "rgba(255, 114, 31, 0.36)",
        wallInset: "rgba(22, 10, 8, 0.48)",
        wallRim: "rgba(255, 180, 80, 0.58)",
        wallAccent: "rgba(255, 96, 22, 0.62)",
        sideShade: "rgba(0, 0, 0, 0.64)",
        ambient: "rgba(255, 86, 20, 0.08)"
      },
      ancient: {
        floorPanel: "rgba(255, 231, 177, 0.1)",
        floorDetail: "rgba(47, 224, 199, 0.26)",
        floorGlow: "rgba(226, 190, 116, 0.08)",
        wallSeam: "rgba(255, 236, 184, 0.34)",
        wallInset: "rgba(75, 54, 27, 0.34)",
        wallRim: "rgba(255, 232, 178, 0.55)",
        wallAccent: "rgba(41, 220, 198, 0.46)",
        sideShade: "rgba(55, 38, 18, 0.56)",
        ambient: "rgba(232, 195, 113, 0.07)"
      },
      diamond: {
        floorPanel: "rgba(166, 243, 255, 0.11)",
        floorDetail: "rgba(255, 118, 229, 0.26)",
        floorGlow: "rgba(104, 226, 255, 0.1)",
        wallSeam: "rgba(248, 255, 255, 0.42)",
        wallInset: "rgba(45, 40, 142, 0.36)",
        wallRim: "rgba(245, 252, 255, 0.74)",
        wallAccent: "rgba(255, 112, 223, 0.52)",
        sideShade: "rgba(14, 15, 70, 0.6)",
        ambient: "rgba(178, 112, 255, 0.08)"
      }
    };
    getMazeProceduralVisuals.cache = byMotif;
    return byMotif[theme.motif] || byMotif.ice;
  }

  function drawAtlasFloorTile(renderContext, theme, sheet, x, y, size, alternate = false) {
    const visuals = getMazeProceduralVisuals(theme);
    const gradient = renderContext.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, alternate ? theme.floorAlt[1] : theme.floor[1]);
    gradient.addColorStop(0.46, alternate ? theme.floorAlt[0] : theme.floor[0]);
    gradient.addColorStop(1, alternate ? theme.floorAlt[2] : theme.floor[2]);
    renderContext.fillStyle = gradient;
    renderContext.fillRect(x, y, size, size);
    drawAtlasReferenceTexture(renderContext, sheet, alternate ? "floorAccentTexture" : "floorTexture", x, y, size, size, {
      alpha: alternate ? 0.72 : 0.58,
      blend: theme.motif === "lava" ? "screen" : "overlay",
      patternScale: alternate ? 0.72 : 0.86,
      offsetX: alternate ? size * 0.47 : size * 0.13,
      offsetY: alternate ? size * 0.23 : size * 0.31
    });

    renderContext.save();
    renderContext.globalCompositeOperation = "overlay";
    renderContext.globalAlpha = alternate ? 0.22 : 0.15;
    renderContext.strokeStyle = visuals.floorPanel;
    renderContext.lineWidth = Math.max(1, size * 0.016);
    renderContext.strokeRect(x + size * 0.08, y + size * 0.08, size * 0.84, size * 0.84);
    renderContext.globalAlpha *= 0.65;
    renderContext.beginPath();
    renderContext.moveTo(x + size * 0.08, y + size * 0.52);
    renderContext.lineTo(x + size * 0.92, y + size * 0.48);
    renderContext.moveTo(x + size * 0.48, y + size * 0.08);
    renderContext.lineTo(x + size * 0.52, y + size * 0.92);
    renderContext.stroke();
    renderContext.restore();

    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.globalAlpha = theme.motif === "ice" ? 0.2 : 0.16;
    renderContext.strokeStyle = visuals.floorDetail || theme.floorVein;
    renderContext.lineWidth = Math.max(1, size * 0.02);
    renderContext.lineCap = "round";
    if (theme.motif === "ice") {
      renderContext.beginPath();
      renderContext.moveTo(x + size * 0.18, y + size * 0.72);
      renderContext.lineTo(x + size * 0.38, y + size * 0.52);
      renderContext.lineTo(x + size * 0.56, y + size * 0.58);
      renderContext.moveTo(x + size * 0.38, y + size * 0.52);
      renderContext.lineTo(x + size * 0.32, y + size * 0.3);
      renderContext.stroke();
    } else if (theme.motif === "lava") {
      renderContext.shadowColor = theme.accent;
      renderContext.shadowBlur = size * 0.12;
      renderContext.beginPath();
      renderContext.moveTo(x + size * 0.12, y + size * 0.62);
      renderContext.bezierCurveTo(x + size * 0.34, y + size * 0.5, x + size * 0.52, y + size * 0.74, x + size * 0.84, y + size * 0.48);
      renderContext.moveTo(x + size * 0.22, y + size * 0.24);
      renderContext.lineTo(x + size * 0.38, y + size * 0.34);
      renderContext.lineTo(x + size * 0.5, y + size * 0.26);
      renderContext.stroke();
    } else if (theme.motif === "ancient") {
      renderContext.globalAlpha = 0.15;
      renderContext.strokeRect(x + size * 0.16, y + size * 0.16, size * 0.68, size * 0.68);
      renderContext.beginPath();
      renderContext.moveTo(x + size * 0.3, y + size * 0.5);
      renderContext.lineTo(x + size * 0.5, y + size * 0.32);
      renderContext.lineTo(x + size * 0.7, y + size * 0.5);
      renderContext.stroke();
    } else {
      renderContext.beginPath();
      renderContext.moveTo(x + size * 0.18, y + size * 0.55);
      renderContext.lineTo(x + size * 0.46, y + size * 0.24);
      renderContext.lineTo(x + size * 0.78, y + size * 0.52);
      renderContext.lineTo(x + size * 0.48, y + size * 0.82);
      renderContext.closePath();
      renderContext.moveTo(x + size * 0.24, y + size * 0.28);
      renderContext.lineTo(x + size * 0.76, y + size * 0.72);
      renderContext.stroke();
    }
    renderContext.restore();

    const glow = renderContext.createRadialGradient(
      x + size * 0.56,
      y + size * 0.42,
      0,
      x + size * 0.56,
      y + size * 0.42,
      size * 0.7
    );
    glow.addColorStop(0, visuals.floorGlow || theme.floorGlow);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    renderContext.fillStyle = glow;
    renderContext.fillRect(x, y, size, size);
  }

  function drawAtlasWallTile(renderContext, theme, sheet, x, y, size, alternate = false) {
    const visuals = getMazeProceduralVisuals(theme);
    const gradient = renderContext.createLinearGradient(x, y, x + size, y + size);
    const stops = alternate ? theme.wallAlt : theme.wall;
    gradient.addColorStop(0, stops[1]);
    gradient.addColorStop(0.46, stops[0]);
    gradient.addColorStop(1, stops[2]);
    renderContext.fillStyle = gradient;
    renderContext.fillRect(x, y, size, size);
    drawAtlasReferenceTexture(renderContext, sheet, alternate ? "wallFaceTexture" : "wallTexture", x, y, size, size, {
      alpha: alternate ? 0.74 : 0.82,
      blend: theme.motif === "lava" ? "screen" : "overlay",
      patternScale: alternate ? 0.58 : 0.68,
      offsetX: alternate ? size * 0.35 : size * 0.12,
      offsetY: alternate ? size * 0.18 : size * 0.26
    });

    renderContext.save();
    renderContext.globalCompositeOperation = "multiply";
    renderContext.globalAlpha = 0.2;
    renderContext.fillStyle = visuals.wallInset;
    renderContext.fillRect(x + size * 0.1, y + size * 0.12, size * 0.8, size * 0.76);
    renderContext.restore();

    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.globalAlpha = 0.24;
    renderContext.strokeStyle = visuals.wallSeam || theme.rim;
    renderContext.lineWidth = size * 0.024;
    renderContext.beginPath();
    if (theme.motif === "ice") {
      renderContext.moveTo(x + size * 0.08, y + size * 0.28);
      renderContext.lineTo(x + size * 0.36, y + size * 0.12);
      renderContext.lineTo(x + size * 0.6, y + size * 0.3);
      renderContext.lineTo(x + size * 0.86, y + size * 0.2);
      renderContext.moveTo(x + size * 0.24, y + size * 0.72);
      renderContext.lineTo(x + size * 0.5, y + size * 0.48);
      renderContext.lineTo(x + size * 0.72, y + size * 0.66);
    } else if (theme.motif === "lava") {
      renderContext.strokeStyle = visuals.wallAccent;
      renderContext.shadowColor = theme.accent;
      renderContext.shadowBlur = size * 0.14;
      renderContext.moveTo(x + size * 0.1, y + size * 0.38);
      renderContext.lineTo(x + size * 0.32, y + size * 0.5);
      renderContext.lineTo(x + size * 0.27, y + size * 0.72);
      renderContext.moveTo(x + size * 0.56, y + size * 0.16);
      renderContext.lineTo(x + size * 0.68, y + size * 0.42);
      renderContext.lineTo(x + size * 0.86, y + size * 0.52);
    } else if (theme.motif === "ancient") {
      renderContext.strokeRect(x + size * 0.16, y + size * 0.18, size * 0.68, size * 0.6);
      renderContext.moveTo(x + size * 0.28, y + size * 0.48);
      renderContext.lineTo(x + size * 0.5, y + size * 0.3);
      renderContext.lineTo(x + size * 0.72, y + size * 0.48);
      renderContext.moveTo(x + size * 0.5, y + size * 0.3);
      renderContext.lineTo(x + size * 0.5, y + size * 0.7);
    } else {
      renderContext.moveTo(x + size * 0.08, y + size * 0.56);
      renderContext.lineTo(x + size * 0.34, y + size * 0.18);
      renderContext.lineTo(x + size * 0.68, y + size * 0.24);
      renderContext.lineTo(x + size * 0.9, y + size * 0.62);
      renderContext.lineTo(x + size * 0.54, y + size * 0.86);
      renderContext.closePath();
    }
    renderContext.stroke();
    renderContext.restore();

    const cap = renderContext.createLinearGradient(x, y, x, y + size * 0.55);
    cap.addColorStop(0, "rgba(255, 255, 255, 0.48)");
    cap.addColorStop(0.38, "rgba(255, 255, 255, 0.18)");
    cap.addColorStop(1, "rgba(255, 255, 255, 0)");
    renderContext.fillStyle = cap;
    renderContext.fillRect(x + size * 0.04, y + size * 0.04, size * 0.92, size * 0.42);

    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.globalAlpha = 0.28;
    renderContext.strokeStyle = visuals.wallRim;
    renderContext.lineWidth = Math.max(1, size * 0.018);
    renderContext.strokeRect(x + size * 0.06, y + size * 0.06, size * 0.88, size * 0.88);
    renderContext.restore();
  }

  function drawAtlasEdgeTile(renderContext, theme, x, y, size, key) {
    const visuals = getMazeProceduralVisuals(theme);
    renderContext.clearRect(x, y, size, size);
    renderContext.save();
    const edgeWidth = size * 0.22;
    const shadowWidth = size * 0.16;
    const isHorizontal = key === "edgeN" || key === "edgeS";
    const edgeGradient = isHorizontal
      ? renderContext.createLinearGradient(x, key === "edgeN" ? y : y + size, x, key === "edgeN" ? y + edgeWidth : y + size - edgeWidth)
      : renderContext.createLinearGradient(key === "edgeW" ? x : x + size, y, key === "edgeW" ? x + edgeWidth : x + size - edgeWidth, y);
    edgeGradient.addColorStop(0, theme.rim);
    edgeGradient.addColorStop(0.45, theme.wall[1]);
    edgeGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    renderContext.globalAlpha = 0.86;
    renderContext.fillStyle = edgeGradient;
    if (key === "edgeN") {
      renderContext.fillRect(x, y, size, edgeWidth);
    } else if (key === "edgeS") {
      renderContext.fillStyle = theme.wallSide;
      renderContext.globalAlpha = 0.9;
      renderContext.fillRect(x, y + size - edgeWidth, size, edgeWidth);
      renderContext.globalAlpha = 0.34;
      renderContext.fillStyle = theme.rim;
      renderContext.fillRect(x, y + size - edgeWidth, size, size * 0.035);
    } else if (key === "edgeW") {
      renderContext.fillRect(x, y, edgeWidth, size);
    } else {
      renderContext.fillStyle = "rgba(0, 0, 0, 0.2)";
      renderContext.globalAlpha = 0.42;
      renderContext.fillRect(x + size - shadowWidth, y + size * 0.04, shadowWidth, size * 0.92);
      renderContext.globalAlpha = 0.42;
      renderContext.fillStyle = visuals.wallRim || theme.rim;
      renderContext.fillRect(x + size - edgeWidth * 0.22, y + size * 0.06, edgeWidth * 0.18, size * 0.88);
    }

    renderContext.globalCompositeOperation = "screen";
    renderContext.globalAlpha = 0.22;
    renderContext.fillStyle = visuals.wallAccent || theme.accent;
    if (key === "edgeN") {
      renderContext.fillRect(x + size * 0.08, y + size * 0.04, size * 0.84, size * 0.035);
    } else if (key === "edgeS") {
      renderContext.fillRect(x + size * 0.08, y + size * 0.79, size * 0.84, size * 0.035);
    } else if (key === "edgeW") {
      renderContext.fillRect(x + size * 0.04, y + size * 0.08, size * 0.035, size * 0.84);
    } else {
      renderContext.fillRect(x + size * 0.79, y + size * 0.08, size * 0.035, size * 0.84);
    }
    renderContext.restore();
  }

  function drawAtlasCornerTile(renderContext, theme, x, y, size, key) {
    renderContext.clearRect(x, y, size, size);
    renderContext.save();
    renderContext.globalAlpha = 0.72;
    renderContext.fillStyle = theme.rim;
    renderContext.strokeStyle = theme.rim;
    renderContext.lineWidth = size * 0.035;
    renderContext.lineCap = "round";
    const r = size * 0.23;
    renderContext.beginPath();
    if (key === "cornerNE") {
      renderContext.arc(x + size - r, y + r, r * 0.75, Math.PI * 1.5, Math.PI * 2);
    } else if (key === "cornerSE") {
      renderContext.arc(x + size - r, y + size - r, r * 0.75, 0, Math.PI * 0.5);
    } else if (key === "cornerSW") {
      renderContext.arc(x + r, y + size - r, r * 0.75, Math.PI * 0.5, Math.PI);
    } else {
      renderContext.arc(x + r, y + r, r * 0.75, Math.PI, Math.PI * 1.5);
    }
    renderContext.stroke();
    renderContext.restore();
  }

  function drawAtlasDecorTile(renderContext, theme, sheet, x, y, size, key) {
    renderContext.clearRect(x, y, size, size);
    if (sheet) {
      const spriteList = sheet.definition.decorSprites || [];
      const spriteCrop = spriteList[key === "decorB" ? 1 : 0];
      const sprite = getTransparentMazeWorldSprite(sheet, spriteCrop);
      if (sprite) {
        renderContext.save();
        renderContext.globalAlpha = 0.82;
        renderContext.imageSmoothingEnabled = true;
        renderContext.imageSmoothingQuality = "high";
        const drawSize = size * (theme.motif === "ancient" ? 0.88 : 0.98);
        renderContext.drawImage(sprite, x + (size - drawSize) / 2, y + (size - drawSize) / 2, drawSize, drawSize);
        renderContext.restore();
        return;
      }
    }
    renderContext.save();
    renderContext.globalAlpha = 0.85;
    renderContext.strokeStyle = theme.decor;
    renderContext.fillStyle = theme.decor;
    renderContext.lineWidth = size * 0.025;
    renderContext.shadowColor = theme.accent;
    renderContext.shadowBlur = size * 0.12;
    if (theme.motif === "ice") {
      renderContext.beginPath();
      renderContext.moveTo(x + size * 0.5, y + size * 0.18);
      renderContext.lineTo(x + size * 0.64, y + size * 0.56);
      renderContext.lineTo(x + size * 0.5, y + size * 0.82);
      renderContext.lineTo(x + size * 0.36, y + size * 0.56);
      renderContext.closePath();
      renderContext.stroke();
      if (key === "decorB") {
        renderContext.beginPath();
        renderContext.moveTo(x + size * 0.24, y + size * 0.66);
        renderContext.lineTo(x + size * 0.76, y + size * 0.34);
        renderContext.stroke();
      }
    } else if (theme.motif === "lava") {
      renderContext.beginPath();
      renderContext.arc(x + size * 0.5, y + size * 0.54, size * 0.18, 0, Math.PI * 2);
      renderContext.fill();
    } else if (theme.motif === "ancient") {
      renderContext.strokeRect(x + size * 0.32, y + size * 0.24, size * 0.36, size * 0.52);
      renderContext.beginPath();
      renderContext.moveTo(x + size * 0.38, y + size * 0.5);
      renderContext.lineTo(x + size * 0.5, y + size * 0.36);
      renderContext.lineTo(x + size * 0.62, y + size * 0.5);
      renderContext.stroke();
    } else {
      renderContext.beginPath();
      renderContext.moveTo(x + size * 0.5, y + size * 0.16);
      renderContext.lineTo(x + size * 0.78, y + size * 0.5);
      renderContext.lineTo(x + size * 0.5, y + size * 0.84);
      renderContext.lineTo(x + size * 0.22, y + size * 0.5);
      renderContext.closePath();
      renderContext.stroke();
    }
    renderContext.restore();
  }

  function withMazeRenderContext(renderContext, draw) {
    const previousContext = ctx;
    ctx = renderContext;
    try {
      draw();
    } finally {
      ctx = previousContext;
    }
  }

  function getMazeStaticBoardCacheKey(level, atlas, visualProfile) {
    const mazeSignature = MAZE_DECOR_SYSTEM?.createMazeSignature?.(state.maze) || "no-maze-signature";
    return [
      MAZE_STATIC_BOARD_CACHE_VERSION,
      atlas.cacheKey,
      getMazeWorldKey(level),
      state.levelIndex,
      mazeSignature,
      state.mazeScatterSignature || "no-scatter",
      visualProfile.key,
      WIDTH,
      HEIGHT
    ].join(":");
  }

  function drawAutotileStaticMazeLayers(level, atlas, visualProfile) {
    const enhancedMazeArt = isFirstPlayableMazeVisualLevel(level);
    drawAutotileWorldBase(atlas.theme, visualProfile);
    drawAutotileScatterDecorLayer(atlas, "behind", visualProfile);
    drawAutotileFloorLayer(atlas, visualProfile);
    drawAutotileFloorDetailLayer(atlas, visualProfile);
    drawAutotileWorldIdentityLayer(level, atlas.theme, visualProfile);
    drawAutotileLaneRibbonLayer(atlas, visualProfile);
    if (!enhancedMazeArt) {
      drawAutotileScatterDecorLayer(atlas, "floor", visualProfile);
    }
    if (enhancedMazeArt) {
      drawFirstMazeFloorPolishLayer(atlas, visualProfile);
    }
    drawAutotilePathContactShadows(atlas.theme, visualProfile);
    drawAutotileWallLayer(atlas, visualProfile);
    drawAutotileWallRimLightLayer(atlas, visualProfile);
    if (!enhancedMazeArt) {
      drawAutotileDecorationLayer(atlas, visualProfile);
    }
    drawAutotileSetPiecesLayer(level, visualProfile);
    if (enhancedMazeArt) {
      drawFirstMazeWallDepthLayer(level, atlas, visualProfile);
    }
    drawAutotileStaticLightingLayer(atlas.theme, visualProfile);
    if (enhancedMazeArt) {
      drawFirstMazeGoalCueLayer(level, visualProfile);
      drawFirstMazeLandmarkLayer(level, visualProfile);
    }
  }

  const PLAYABLE_MAZE_ART_STYLES = {
    ice: {
      world: "ice",
      floorStops: ["rgba(33, 52, 78, 0.98)", "rgba(22, 36, 58, 0.98)", "rgba(11, 22, 41, 0.98)"],
      floorLine: "rgba(255, 232, 150, 0.42)",
      floorRunGlow: "rgba(117, 237, 211, 0.52)",
      floorContactShadow: "rgba(1, 5, 15, 0.78)",
      floorDots: ["255, 211, 99", "120, 237, 206", "255, 132, 151"],
      wallPalettes: [
        { topA: "#fff07a", topB: "#ffb84f", sideA: "#e07735", sideB: "#8f3f27", rim: "rgba(255, 250, 194, 0.96)" },
        { topA: "#8df2d1", topB: "#28c6a7", sideA: "#158f86", sideB: "#0b4f5a", rim: "rgba(213, 255, 242, 0.92)" },
        { topA: "#ff9d94", topB: "#ee586f", sideA: "#b33d57", sideB: "#67233c", rim: "rgba(255, 226, 219, 0.9)" },
        { topA: "#9ec8ff", topB: "#5b7ff0", sideA: "#3454af", sideB: "#20306d", rim: "rgba(224, 238, 255, 0.9)" }
      ],
      wallStroke: "rgba(36, 23, 34, 0.9)",
      wallDetail: "rgba(55, 31, 37, 0.72)",
      wallFaceDown: ["rgba(118, 69, 48, 0.28)", "rgba(0, 0, 0, 0.88)"],
      wallFaceSide: ["rgba(85, 42, 42, 0.26)", "rgba(0, 0, 0, 0.78)"],
      cornerFill: "rgba(255, 244, 170, 0.9)",
      cornerStroke: "rgba(255, 144, 93, 0.86)",
      goal: {
        shape: "star",
        base: ["rgba(77, 40, 22, 0.92)", "rgba(42, 31, 34, 0.78)", "rgba(4, 8, 18, 0)"],
        halo: ["rgba(255, 243, 141, 0.58)", "rgba(255, 158, 89, 0.4)", "rgba(255, 158, 89, 0)"],
        stroke: "rgba(255, 239, 105, 0.96)",
        shadow: "#ffcf4f",
        fill: "rgba(255, 198, 72, 0.94)",
        outline: "rgba(86, 42, 35, 0.85)",
        text: "rgba(63, 34, 42, 0.92)",
        chevron: "rgba(255, 232, 122, 0.82)",
        glyph: "×"
      },
      landmarkFills: ["rgba(255, 219, 92, 0.82)", "rgba(122, 238, 202, 0.78)", "rgba(255, 132, 151, 0.76)"],
      landmarks: [
        { cell: { x: 7, y: 12 }, type: "sum-token", scale: 1 },
        { cell: { x: 32, y: 12 }, type: "star-token", scale: 0.95 },
        { cell: { x: 19, y: 24 }, type: "arrow-token", scale: 0.9 }
      ],
      gate: {
        locked: { color: "rgba(255, 219, 92, 0.92)", fill: "rgba(79, 44, 48, 0.74)", glow: "rgba(255, 176, 80, 0.42)", glyph: "×" },
        active: { color: "rgba(255, 243, 112, 0.98)", fill: "rgba(103, 55, 35, 0.88)", glow: "rgba(255, 211, 92, 0.62)", glyph: "?" },
        success: { color: "rgba(112, 241, 169, 0.98)", fill: "rgba(30, 87, 65, 0.86)", glow: "rgba(103, 240, 139, 0.58)", glyph: "+" },
        wrong: { color: "rgba(255, 105, 126, 0.98)", fill: "rgba(109, 35, 55, 0.88)", glow: "rgba(255, 76, 95, 0.58)", glyph: "!" }
      }
    },
    lava: {
      world: "lava",
      floorStops: ["rgba(42, 22, 20, 0.98)", "rgba(26, 14, 16, 0.98)", "rgba(10, 8, 10, 0.98)"],
      floorLine: "rgba(255, 131, 70, 0.38)",
      floorRunGlow: "rgba(255, 102, 44, 0.48)",
      floorContactShadow: "rgba(6, 2, 2, 0.84)",
      floorDots: ["255, 143, 54", "255, 212, 96", "111, 66, 54"],
      wallPalettes: [
        { topA: "#ffcc55", topB: "#f06b23", sideA: "#a93122", sideB: "#42120f", rim: "rgba(255, 237, 156, 0.95)" },
        { topA: "#58545b", topB: "#28242a", sideA: "#181419", sideB: "#060506", rim: "rgba(255, 125, 66, 0.82)" },
        { topA: "#ff846a", topB: "#c72f2e", sideA: "#76151e", sideB: "#2c0710", rim: "rgba(255, 207, 126, 0.9)" },
        { topA: "#ffd166", topB: "#b7501d", sideA: "#8b2d17", sideB: "#31100c", rim: "rgba(255, 245, 184, 0.9)" }
      ],
      wallStroke: "rgba(41, 16, 14, 0.96)",
      wallDetail: "rgba(255, 119, 54, 0.44)",
      wallFaceDown: ["rgba(255, 97, 35, 0.22)", "rgba(0, 0, 0, 0.9)"],
      wallFaceSide: ["rgba(255, 80, 30, 0.2)", "rgba(0, 0, 0, 0.82)"],
      cornerFill: "rgba(255, 197, 88, 0.92)",
      cornerStroke: "rgba(255, 78, 44, 0.86)",
      goal: {
        shape: "flame",
        base: ["rgba(75, 20, 12, 0.94)", "rgba(40, 16, 14, 0.8)", "rgba(6, 4, 5, 0)"],
        halo: ["rgba(255, 117, 45, 0.64)", "rgba(255, 195, 70, 0.38)", "rgba(255, 93, 35, 0)"],
        stroke: "rgba(255, 197, 86, 0.96)",
        shadow: "#ff762d",
        fill: "rgba(255, 104, 37, 0.94)",
        outline: "rgba(61, 18, 10, 0.88)",
        text: "rgba(48, 14, 10, 0.94)",
        chevron: "rgba(255, 167, 67, 0.86)",
        glyph: "×"
      },
      landmarkFills: ["rgba(255, 119, 54, 0.82)", "rgba(255, 205, 96, 0.76)", "rgba(76, 69, 73, 0.78)"],
      landmarks: [
        { cell: { x: 7, y: 12 }, type: "flame-token", scale: 1 },
        { cell: { x: 30, y: 17 }, type: "gear-token", scale: 0.95 },
        { cell: { x: 18, y: 24 }, type: "arrow-token", scale: 0.9 }
      ],
      gate: {
        locked: { color: "rgba(255, 152, 74, 0.92)", fill: "rgba(78, 27, 18, 0.78)", glow: "rgba(255, 92, 35, 0.44)", glyph: "×" },
        active: { color: "rgba(255, 216, 94, 0.98)", fill: "rgba(108, 38, 16, 0.9)", glow: "rgba(255, 112, 38, 0.66)", glyph: "?" },
        success: { color: "rgba(133, 255, 173, 0.98)", fill: "rgba(28, 88, 57, 0.86)", glow: "rgba(105, 245, 144, 0.58)", glyph: "+" },
        wrong: { color: "rgba(255, 76, 76, 0.98)", fill: "rgba(104, 20, 30, 0.9)", glow: "rgba(255, 55, 45, 0.62)", glyph: "!" }
      }
    },
    ancient: {
      world: "ancient",
      floorStops: ["rgba(44, 37, 23, 0.98)", "rgba(28, 28, 21, 0.98)", "rgba(11, 20, 17, 0.98)"],
      floorLine: "rgba(222, 190, 118, 0.34)",
      floorRunGlow: "rgba(39, 224, 195, 0.38)",
      floorContactShadow: "rgba(4, 9, 8, 0.8)",
      floorDots: ["222, 190, 118", "39, 224, 195", "135, 177, 89"],
      wallPalettes: [
        { topA: "#f0d58a", topB: "#b58a47", sideA: "#806238", sideB: "#382b1b", rim: "rgba(255, 240, 186, 0.9)" },
        { topA: "#43ddc7", topB: "#168f82", sideA: "#0e635f", sideB: "#063334", rim: "rgba(193, 255, 239, 0.88)" },
        { topA: "#c4ad74", topB: "#80643f", sideA: "#5a4630", sideB: "#241d16", rim: "rgba(245, 229, 173, 0.86)" },
        { topA: "#95c86a", topB: "#517f45", sideA: "#31583b", sideB: "#142a20", rim: "rgba(216, 244, 158, 0.82)" }
      ],
      wallStroke: "rgba(39, 27, 18, 0.92)",
      wallDetail: "rgba(48, 100, 84, 0.48)",
      wallFaceDown: ["rgba(93, 68, 38, 0.24)", "rgba(0, 0, 0, 0.84)"],
      wallFaceSide: ["rgba(24, 107, 94, 0.18)", "rgba(0, 0, 0, 0.76)"],
      cornerFill: "rgba(244, 223, 157, 0.9)",
      cornerStroke: "rgba(39, 224, 195, 0.72)",
      goal: {
        shape: "tablet",
        base: ["rgba(35, 45, 31, 0.94)", "rgba(24, 34, 28, 0.82)", "rgba(5, 11, 9, 0)"],
        halo: ["rgba(39, 224, 195, 0.52)", "rgba(232, 200, 119, 0.32)", "rgba(39, 224, 195, 0)"],
        stroke: "rgba(72, 240, 210, 0.92)",
        shadow: "#27e0c3",
        fill: "rgba(214, 181, 103, 0.92)",
        outline: "rgba(44, 35, 21, 0.88)",
        text: "rgba(29, 35, 25, 0.94)",
        chevron: "rgba(91, 239, 211, 0.82)",
        glyph: "×"
      },
      landmarkFills: ["rgba(220, 187, 111, 0.8)", "rgba(62, 220, 190, 0.74)", "rgba(144, 184, 91, 0.74)"],
      landmarks: [
        { cell: { x: 8, y: 11 }, type: "tablet-token", scale: 1 },
        { cell: { x: 30, y: 14 }, type: "column-token", scale: 0.96 },
        { cell: { x: 19, y: 24 }, type: "rune-token", scale: 0.9 }
      ],
      gate: {
        locked: { color: "rgba(222, 190, 118, 0.92)", fill: "rgba(55, 43, 28, 0.78)", glow: "rgba(222, 190, 118, 0.38)", glyph: "×" },
        active: { color: "rgba(84, 244, 215, 0.98)", fill: "rgba(28, 80, 70, 0.9)", glow: "rgba(39, 224, 195, 0.62)", glyph: "?" },
        success: { color: "rgba(156, 240, 119, 0.98)", fill: "rgba(48, 91, 43, 0.86)", glow: "rgba(137, 231, 101, 0.58)", glyph: "+" },
        wrong: { color: "rgba(255, 104, 112, 0.98)", fill: "rgba(101, 36, 45, 0.88)", glow: "rgba(255, 82, 94, 0.58)", glyph: "!" }
      }
    },
    diamond: {
      world: "diamond",
      floorStops: ["rgba(20, 25, 62, 0.98)", "rgba(12, 17, 43, 0.98)", "rgba(7, 7, 21, 0.98)"],
      floorLine: "rgba(126, 255, 232, 0.34)",
      floorRunGlow: "rgba(255, 95, 215, 0.36)",
      floorContactShadow: "rgba(2, 4, 16, 0.84)",
      floorDots: ["126, 255, 232", "255, 95, 215", "176, 108, 255"],
      wallPalettes: [
        { topA: "#8ffff0", topB: "#33c9ff", sideA: "#256bd1", sideB: "#17316e", rim: "rgba(226, 255, 255, 0.92)" },
        { topA: "#ff9cf1", topB: "#d957ff", sideA: "#8336d0", sideB: "#321b78", rim: "rgba(255, 226, 255, 0.88)" },
        { topA: "#b58cff", topB: "#6d69ff", sideA: "#3b40b8", sideB: "#1b2565", rim: "rgba(233, 228, 255, 0.86)" },
        { topA: "#fff3a1", topB: "#55ffd6", sideA: "#21a0b0", sideB: "#12445c", rim: "rgba(255, 255, 226, 0.9)" }
      ],
      wallStroke: "rgba(14, 18, 51, 0.92)",
      wallDetail: "rgba(255, 116, 229, 0.48)",
      wallFaceDown: ["rgba(85, 255, 214, 0.2)", "rgba(0, 0, 0, 0.88)"],
      wallFaceSide: ["rgba(255, 95, 215, 0.18)", "rgba(0, 0, 0, 0.78)"],
      cornerFill: "rgba(226, 255, 255, 0.9)",
      cornerStroke: "rgba(255, 95, 215, 0.72)",
      goal: {
        shape: "diamond",
        base: ["rgba(28, 32, 82, 0.94)", "rgba(18, 22, 58, 0.82)", "rgba(5, 5, 18, 0)"],
        halo: ["rgba(85, 255, 214, 0.54)", "rgba(255, 95, 215, 0.34)", "rgba(85, 255, 214, 0)"],
        stroke: "rgba(126, 255, 232, 0.96)",
        shadow: "#55ffd6",
        fill: "rgba(140, 245, 255, 0.9)",
        outline: "rgba(26, 26, 76, 0.88)",
        text: "rgba(28, 20, 74, 0.94)",
        chevron: "rgba(255, 115, 224, 0.82)",
        glyph: "×"
      },
      landmarkFills: ["rgba(126, 255, 232, 0.78)", "rgba(255, 95, 215, 0.72)", "rgba(176, 108, 255, 0.76)"],
      landmarks: [
        { cell: { x: 8, y: 12 }, type: "crystal-token", scale: 1 },
        { cell: { x: 30, y: 15 }, type: "spark-token", scale: 0.95 },
        { cell: { x: 19, y: 24 }, type: "crown-token", scale: 0.9 }
      ],
      gate: {
        locked: { color: "rgba(126, 255, 232, 0.9)", fill: "rgba(28, 34, 75, 0.78)", glow: "rgba(85, 255, 214, 0.38)", glyph: "×" },
        active: { color: "rgba(255, 115, 224, 0.98)", fill: "rgba(55, 38, 105, 0.9)", glow: "rgba(255, 95, 215, 0.62)", glyph: "?" },
        success: { color: "rgba(132, 255, 186, 0.98)", fill: "rgba(29, 83, 68, 0.86)", glow: "rgba(101, 245, 160, 0.58)", glyph: "+" },
        wrong: { color: "rgba(255, 103, 146, 0.98)", fill: "rgba(97, 31, 67, 0.88)", glow: "rgba(255, 74, 125, 0.58)", glyph: "!" }
      }
    }
  };

  function getPlayableMazeArtStyle(level = getCurrentLevel()) {
    return PLAYABLE_MAZE_ART_STYLES[getMazeWorldKey(level)] || null;
  }

  function isFirstPlayableMazeVisualLevel(level = getCurrentLevel()) {
    return Boolean(getPlayableMazeArtStyle(level));
  }

  function firstMazeToyPalette(x, y, style = getPlayableMazeArtStyle()) {
    const palettes = style?.wallPalettes || PLAYABLE_MAZE_ART_STYLES.ice.wallPalettes;
    return palettes[Math.floor(mazeCellNoise(x, y, 411) * palettes.length) % palettes.length];
  }

  function firstMazeFloorDotColor(seed, alpha, style = getPlayableMazeArtStyle()) {
    const colors = style?.floorDots || PLAYABLE_MAZE_ART_STYLES.ice.floorDots;
    const color = colors[Math.floor(seed * colors.length) % colors.length];
    return `rgba(${color}, ${alpha})`;
  }

  function drawFirstMazeFloorPolishLayer(atlas, visualProfile = getMazeMobileVisualProfile()) {
    const style = getPlayableMazeArtStyle();
    if (!style) {
      return;
    }
    const phonePortrait = isPhonePortraitView();
    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    for (let y = 1; y < ROWS - 1; y += 1) {
      let x = 1;
      while (x < COLS - 1) {
        if (state.maze[y][x] === 1) {
          x += 1;
          continue;
        }
        const start = x;
        while (x < COLS - 1 && state.maze[y][x] !== 1) {
          x += 1;
        }
        const px = start * TILE;
        const py = y * TILE;
        const width = (x - start) * TILE;
        const runGradient = ctx.createLinearGradient(px, py, px, py + TILE);
        runGradient.addColorStop(0, style.floorStops[0]);
        runGradient.addColorStop(0.48, style.floorStops[1]);
        runGradient.addColorStop(1, style.floorStops[2]);
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = runGradient;
        roundedRect(px + 1.5, py + 1.5, Math.max(1, width - 3), TILE - 3, 5);
        ctx.fill();

        ctx.globalAlpha = 0.34 * visualProfile.textureAlphaScale;
        ctx.strokeStyle = style.floorLine;
        ctx.lineWidth = phonePortrait ? 0.8 : 1;
        ctx.beginPath();
        ctx.moveTo(px + 5, py + TILE * 0.2);
        ctx.lineTo(px + width - 5, py + TILE * 0.2);
        ctx.stroke();
      }
    }

    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        const nearWall = isWallCell(x - 1, y)
          || isWallCell(x + 1, y)
          || isWallCell(x, y - 1)
          || isWallCell(x, y + 1);
        if (nearWall) {
          ctx.globalCompositeOperation = "multiply";
          ctx.globalAlpha = 0.46 * visualProfile.wallShadowScale;
          ctx.fillStyle = style.floorContactShadow;
          roundedRect(px + 2.5, py + 2.5, TILE - 5, TILE - 5, 5);
          ctx.fill();
        }
      }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let y = 2; y < ROWS - 2; y += phonePortrait ? 3 : 2) {
      for (let x = 2; x < COLS - 2; x += phonePortrait ? 3 : 2) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        const seed = mazeCellNoise(x, y, 509);
        if (seed < 0.42) {
          ctx.globalAlpha = (phonePortrait ? 0.18 : 0.24) * visualProfile.textureAlphaScale;
          ctx.fillStyle = firstMazeFloorDotColor(seed, 0.72, style);
          ctx.beginPath();
          ctx.arc(px + TILE * (0.28 + seed * 0.35), py + TILE * (0.32 + seed * 0.24), phonePortrait ? 1.25 : 1.55, 0, Math.PI * 2);
          ctx.fill();
        } else if (seed > 0.86) {
          ctx.globalAlpha = (phonePortrait ? 0.16 : 0.22) * visualProfile.textureAlphaScale;
          ctx.strokeStyle = firstMazeFloorDotColor(seed, 0.7, style);
          ctx.lineWidth = phonePortrait ? 1 : 1.2;
          const cx = px + TILE * 0.52;
          const cy = py + TILE * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx - TILE * 0.16, cy);
          ctx.lineTo(cx + TILE * 0.16, cy);
          ctx.moveTo(cx, cy - TILE * 0.16);
          ctx.lineTo(cx, cy + TILE * 0.16);
          ctx.stroke();
        }
      }
    }

    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = (phonePortrait ? 0.28 : 0.34) * visualProfile.glowScale;
    ctx.strokeStyle = style.floorRunGlow;
    ctx.lineWidth = phonePortrait ? 1.1 : 1.35;
    for (let y = 3; y < ROWS - 3; y += 5) {
      for (let x = 3; x < COLS - 4; x += 3) {
        if (state.maze[y][x] === 1 || state.maze[y][x + 1] === 1) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE + TILE * 0.5;
        ctx.beginPath();
        ctx.moveTo(px + TILE * 0.2, py);
        ctx.lineTo(px + TILE * 1.55, py);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawFirstMazeWallDepthLayer(level, atlas, visualProfile = getMazeMobileVisualProfile()) {
    const style = getPlayableMazeArtStyle(level);
    if (!style) {
      return;
    }
    const phonePortrait = isPhonePortraitView();
    const sideDepth = phonePortrait ? 8 : 11;
    const bevel = phonePortrait ? 4 : 5.5;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let y = 0; y < ROWS; y += 1) {
      let x = 0;
      while (x < COLS) {
        if (!isWallCell(x, y)) {
          x += 1;
          continue;
        }
        const start = x;
        while (x < COLS && isWallCell(x, y)) {
          x += 1;
        }
        const px = start * TILE;
        const py = y * TILE;
        const width = (x - start) * TILE;
        const palette = firstMazeToyPalette(start, y, style);
        const capRadius = Math.min(phonePortrait ? 9 : 12, Math.max(6, width * 0.08));

        ctx.globalAlpha = 0.55 * visualProfile.wallShadowScale;
        ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
        roundedRect(px + 2.5, py + sideDepth * 0.72, Math.max(1, width - 5), TILE + sideDepth * 0.78, capRadius);
        ctx.fill();

        const side = ctx.createLinearGradient(px, py + TILE * 0.45, px, py + TILE + sideDepth);
        side.addColorStop(0, palette.sideA);
        side.addColorStop(1, palette.sideB);
        ctx.globalAlpha = 0.98;
        ctx.fillStyle = side;
        roundedRect(px + 1.8, py + TILE * 0.42, Math.max(1, width - 3.6), TILE * 0.62 + sideDepth, capRadius);
        ctx.fill();

        const cap = ctx.createLinearGradient(px, py, px, py + TILE * 0.86);
        cap.addColorStop(0, palette.topA);
        cap.addColorStop(0.58, palette.topB);
        cap.addColorStop(1, palette.sideA);
        ctx.globalAlpha = 1;
        ctx.fillStyle = cap;
        roundedRect(px + 1.4, py + 1.2, Math.max(1, width - 2.8), TILE * 0.86, capRadius);
        ctx.fill();

        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = style.wallStroke;
        ctx.lineWidth = phonePortrait ? 1.9 : 2.5;
        roundedRect(px + 1.2, py + 1, Math.max(1, width - 2.4), TILE + sideDepth * 0.45, capRadius);
        ctx.stroke();

        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.68 * visualProfile.rimAlphaScale;
        ctx.strokeStyle = palette.rim;
        ctx.lineWidth = phonePortrait ? 1.5 : 2;
        ctx.beginPath();
        ctx.moveTo(px + bevel, py + bevel);
        ctx.lineTo(px + width - bevel, py + bevel);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";

        ctx.globalAlpha = 0.34;
        ctx.strokeStyle = style.wallDetail;
        ctx.lineWidth = phonePortrait ? 1 : 1.25;
        for (let seam = start + 1; seam < x; seam += 2) {
          const sx = seam * TILE + (mazeCellNoise(seam, y, 610) - 0.5) * 3;
          ctx.beginPath();
          ctx.moveTo(sx, py + 5);
          ctx.lineTo(sx - 2, py + TILE * 0.78);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!isWallCell(x, y)) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        const openDown = !isWallCell(x, y + 1);
        const openRight = !isWallCell(x + 1, y);
        const openLeft = !isWallCell(x - 1, y);

        if (openDown) {
          const face = ctx.createLinearGradient(px, py + TILE - sideDepth, px, py + TILE + sideDepth);
          face.addColorStop(0, style.wallFaceDown[0]);
          face.addColorStop(1, style.wallFaceDown[1]);
          ctx.globalAlpha = 1 * visualProfile.wallShadowScale;
          ctx.fillStyle = face;
          roundedRect(px + 2, py + TILE - sideDepth * 0.2, TILE - 4, sideDepth + 6, 4);
          ctx.fill();
        }

        if (openRight) {
          const face = ctx.createLinearGradient(px + TILE - sideDepth, py, px + TILE + sideDepth, py);
          face.addColorStop(0, style.wallFaceSide[0]);
          face.addColorStop(1, style.wallFaceSide[1]);
          ctx.globalAlpha = 0.86 * visualProfile.wallShadowScale;
          ctx.fillStyle = face;
          roundedRect(px + TILE - sideDepth * 0.2, py + 2, sideDepth + 5, TILE - 4, 4);
          ctx.fill();
        }

        if (openLeft && !openRight && mazeCellNoise(x, y, 83) < 0.2) {
          ctx.globalAlpha = 0.16 * visualProfile.wallShadowScale;
          ctx.fillStyle = "rgba(0, 7, 16, 0.8)";
          roundedRect(px - 1.5, py + 3, 5, TILE - 6, 3);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!isWallCell(x, y)) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        const openUp = !isWallCell(x, y - 1);
        const openRight = !isWallCell(x + 1, y);
        const openDown = !isWallCell(x, y + 1);
        const openLeft = !isWallCell(x - 1, y);
        const palette = firstMazeToyPalette(x, y, style);

        ctx.globalAlpha = 0.78 * visualProfile.rimAlphaScale;
        ctx.strokeStyle = palette.rim;
        ctx.lineWidth = phonePortrait ? 1.55 : 2.05;
        ctx.beginPath();
        if (openUp) {
          ctx.moveTo(px + bevel, py + bevel * 0.55);
          ctx.lineTo(px + TILE - bevel, py + bevel * 0.55);
        }
        if (openLeft) {
          ctx.moveTo(px + bevel * 0.55, py + bevel);
          ctx.lineTo(px + bevel * 0.55, py + TILE - bevel);
        }
        ctx.stroke();

        ctx.globalAlpha = 0.84 * visualProfile.wallShadowScale;
        ctx.strokeStyle = "rgba(30, 17, 26, 0.95)";
        ctx.lineWidth = phonePortrait ? 1.9 : 2.55;
        ctx.beginPath();
        if (openDown) {
          ctx.moveTo(px + bevel, py + TILE - bevel * 0.45);
          ctx.lineTo(px + TILE - bevel, py + TILE - bevel * 0.45);
        }
        if (openRight) {
          ctx.moveTo(px + TILE - bevel * 0.45, py + bevel);
          ctx.lineTo(px + TILE - bevel * 0.45, py + TILE - bevel);
        }
        ctx.stroke();

        if ((openUp && openLeft) || (openUp && openRight) || (openDown && openLeft) || (openDown && openRight)) {
          drawFirstMazeCornerCap(px, py, { openUp, openRight, openDown, openLeft }, visualProfile, style);
        }
      }
    }
    ctx.restore();
  }

  function drawFirstMazeCornerCap(px, py, openings, visualProfile, style = getPlayableMazeArtStyle()) {
    const size = isPhonePortraitView() ? 6 : 8;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.5 * visualProfile.rimAlphaScale;
    ctx.fillStyle = style?.cornerFill || "rgba(255, 244, 170, 0.9)";

    const points = [];
    if (openings.openUp && openings.openLeft) points.push([px + 3, py + 3]);
    if (openings.openUp && openings.openRight) points.push([px + TILE - 3, py + 3]);
    if (openings.openDown && openings.openLeft) points.push([px + 3, py + TILE - 3]);
    if (openings.openDown && openings.openRight) points.push([px + TILE - 3, py + TILE - 3]);

    for (const [cx, cy] of points) {
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha *= 0.72;
      ctx.strokeStyle = style?.cornerStroke || "rgba(255, 144, 93, 0.86)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha /= 0.72;
    }
    ctx.restore();
  }

  function drawFirstMazeGoalCueLayer(level, visualProfile = getMazeMobileVisualProfile()) {
    const style = getPlayableMazeArtStyle(level);
    if (!style) {
      return;
    }
    const goal = style.goal;
    const center = centerOfCell(CENTER_CELL.x, CENTER_CELL.y);
    const phonePortrait = isPhonePortraitView();
    const pulse = 1 + Math.sin(state.clock * 2.2) * 0.045;
    const radius = (phonePortrait ? 54 : 68) * pulse;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.92;
    const base = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius * 0.95);
    base.addColorStop(0, goal.base[0]);
    base.addColorStop(0.55, goal.base[1]);
    base.addColorStop(1, goal.base[2]);
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "screen";
    const halo = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius * 1.36);
    halo.addColorStop(0, goal.halo[0]);
    halo.addColorStop(0.42, goal.halo[1]);
    halo.addColorStop(1, goal.halo[2]);
    ctx.globalAlpha = 1 * visualProfile.glowScale;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 1.36, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.96 * visualProfile.rimAlphaScale;
    ctx.strokeStyle = goal.stroke;
    ctx.lineWidth = phonePortrait ? 3.6 : 4.8;
    ctx.shadowColor = goal.shadow;
    ctx.shadowBlur = (phonePortrait ? 14 : 22) * visualProfile.glowScale;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = goal.fill;
    ctx.strokeStyle = goal.outline;
    ctx.lineWidth = phonePortrait ? 1.4 : 1.8;
    if (goal.shape === "flame") {
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - radius * 0.42);
      ctx.bezierCurveTo(center.x + radius * 0.34, center.y - radius * 0.24, center.x + radius * 0.22, center.y + radius * 0.14, center.x, center.y + radius * 0.36);
      ctx.bezierCurveTo(center.x - radius * 0.3, center.y + radius * 0.1, center.x - radius * 0.26, center.y - radius * 0.26, center.x, center.y - radius * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.46;
      ctx.fillStyle = "rgba(255, 241, 155, 0.82)";
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - radius * 0.2);
      ctx.bezierCurveTo(center.x + radius * 0.16, center.y - radius * 0.04, center.x + radius * 0.1, center.y + radius * 0.18, center.x - radius * 0.02, center.y + radius * 0.27);
      ctx.bezierCurveTo(center.x - radius * 0.12, center.y + radius * 0.08, center.x - radius * 0.08, center.y - radius * 0.1, center.x, center.y - radius * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.96;
    } else if (goal.shape === "tablet") {
      roundedRect(center.x - radius * 0.34, center.y - radius * 0.36, radius * 0.68, radius * 0.72, phonePortrait ? 8 : 11);
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = goal.stroke;
      ctx.lineWidth = phonePortrait ? 1.2 : 1.6;
      for (let line = -1; line <= 1; line += 1) {
        ctx.beginPath();
        ctx.moveTo(center.x - radius * 0.18, center.y + line * radius * 0.13);
        ctx.lineTo(center.x + radius * 0.18, center.y + line * radius * 0.13);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.96;
    } else if (goal.shape === "diamond") {
      drawDiamond(center.x, center.y, radius * 0.36);
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.58;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
      ctx.lineWidth = phonePortrait ? 1.1 : 1.5;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - radius * 0.36);
      ctx.lineTo(center.x, center.y + radius * 0.36);
      ctx.moveTo(center.x - radius * 0.3, center.y);
      ctx.lineTo(center.x + radius * 0.3, center.y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.96;
    } else {
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const pointRadius = point % 2 === 0 ? radius * 0.34 : radius * 0.18;
        const px = center.x + Math.cos(angle) * pointRadius;
        const py = center.y + Math.sin(angle) * pointRadius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = phonePortrait ? 1.6 : 2.2;
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(center.x + Math.cos(angle) * radius * 0.46, center.y + Math.sin(angle) * radius * 0.46);
      ctx.lineTo(center.x + Math.cos(angle) * radius * 0.78, center.y + Math.sin(angle) * radius * 0.78);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = goal.text;
    ctx.font = `900 ${phonePortrait ? 31 : 39}px Fredoka, Assistant, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(goal.glyph || "×", center.x, center.y + (phonePortrait ? 1 : 2));

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.66 * visualProfile.glowScale;
    ctx.strokeStyle = goal.chevron;
    ctx.lineWidth = phonePortrait ? 1.8 : 2.3;
    const chevrons = [
      { x: center.x, y: center.y + TILE * 2.4, rotation: -Math.PI / 2 },
      { x: center.x - TILE * 2.4, y: center.y, rotation: 0 },
      { x: center.x + TILE * 2.4, y: center.y, rotation: Math.PI }
    ];
    for (const item of chevrons) {
      drawFirstMazeChevron(item.x, item.y, item.rotation, phonePortrait ? 11 : 14);
    }
    ctx.restore();
  }

  function drawFirstMazeChevron(x, y, rotation, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.68);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size * 0.68);
    ctx.stroke();
    ctx.restore();
  }

  function drawFirstMazeLandmarkLayer(level, visualProfile = getMazeMobileVisualProfile()) {
    const style = getPlayableMazeArtStyle(level);
    if (!style) {
      return;
    }
    const landmarks = style.landmarks;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let index = 0; index < landmarks.length; index += 1) {
      const landmark = landmarks[index];
      const cell = findNearestFirstMazeWalkableCell(landmark.cell, 4);
      if (!cell) {
        continue;
      }
      const center = centerOfCell(cell.x, cell.y);
      drawFirstMazeLandmark(center.x, center.y, landmark.type, landmark.scale, index, visualProfile, style);
    }
    ctx.restore();
  }

  function findNearestFirstMazeWalkableCell(target, maxRadius = 5) {
    if (!isWallCell(target.x, target.y)) {
      return target;
    }
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
            continue;
          }
          const cell = { x: target.x + dx, y: target.y + dy };
          if (!isWallCell(cell.x, cell.y)) {
            return cell;
          }
        }
      }
    }
    return null;
  }

  function drawFirstMazeLandmark(x, y, type, scale, index, visualProfile, style = getPlayableMazeArtStyle()) {
    const phonePortrait = isPhonePortraitView();
    const size = (phonePortrait ? 16 : 21) * scale;
    const fills = style?.landmarkFills || PLAYABLE_MAZE_ART_STYLES.ice.landmarkFills;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = (phonePortrait ? 0.66 : 0.78) * visualProfile.scatterAlphaScale;
    ctx.shadowColor = style?.goal?.shadow || "#ffd35c";
    ctx.shadowBlur = (phonePortrait ? 4 : 8) * visualProfile.glowScale;
    ctx.strokeStyle = "rgba(48, 28, 38, 0.78)";
    ctx.fillStyle = fills[index % fills.length];
    ctx.lineWidth = phonePortrait ? 1.4 : 1.8;

    if (type === "sum-token") {
      roundedRect(-size * 0.58, -size * 0.46, size * 1.16, size * 0.92, 6);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(54, 34, 42, 0.86)";
      ctx.lineWidth = phonePortrait ? 2 : 2.4;
      ctx.beginPath();
      ctx.moveTo(-size * 0.28, 0);
      ctx.lineTo(size * 0.28, 0);
      ctx.moveTo(0, -size * 0.28);
      ctx.lineTo(0, size * 0.28);
      ctx.stroke();
    } else if (type === "star-token") {
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const pointRadius = point % 2 === 0 ? size * 0.62 : size * 0.28;
        const px = Math.cos(angle) * pointRadius;
        const py = Math.sin(angle) * pointRadius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === "arrow-token") {
      roundedRect(-size * 0.6, -size * 0.38, size * 1.2, size * 0.76, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(49, 29, 42, 0.88)";
      ctx.beginPath();
      ctx.moveTo(size * 0.34, 0);
      ctx.lineTo(-size * 0.1, -size * 0.25);
      ctx.lineTo(-size * 0.1, size * 0.25);
      ctx.closePath();
      ctx.fill();
    } else if (type === "flame-token") {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.68);
      ctx.bezierCurveTo(size * 0.44, -size * 0.3, size * 0.32, size * 0.42, 0, size * 0.62);
      ctx.bezierCurveTo(-size * 0.42, size * 0.28, -size * 0.34, -size * 0.28, 0, -size * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha *= 0.62;
      ctx.fillStyle = "rgba(255, 229, 132, 0.82)";
      ctx.beginPath();
      ctx.ellipse(0, size * 0.12, size * 0.18, size * 0.32, 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "gear-token") {
      for (let spoke = 0; spoke < 8; spoke += 1) {
        ctx.save();
        ctx.rotate((spoke * Math.PI) / 4);
        roundedRect(-size * 0.08, -size * 0.72, size * 0.16, size * 0.32, 3);
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(38, 26, 24, 0.78)";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "tablet-token" || type === "rune-token") {
      roundedRect(-size * 0.52, -size * 0.56, size * 1.04, size * 1.12, 7);
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = style?.goal?.stroke || "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = phonePortrait ? 1.2 : 1.5;
      ctx.beginPath();
      if (type === "rune-token") {
        ctx.moveTo(-size * 0.28, size * 0.18);
        ctx.lineTo(0, -size * 0.22);
        ctx.lineTo(size * 0.28, size * 0.18);
        ctx.moveTo(0, -size * 0.22);
        ctx.lineTo(0, size * 0.34);
      } else {
        ctx.moveTo(-size * 0.25, -size * 0.15);
        ctx.lineTo(size * 0.25, -size * 0.15);
        ctx.moveTo(-size * 0.18, size * 0.1);
        ctx.lineTo(size * 0.18, size * 0.1);
      }
      ctx.stroke();
    } else if (type === "column-token") {
      roundedRect(-size * 0.5, -size * 0.5, size, size * 0.18, 4);
      ctx.fill();
      roundedRect(-size * 0.42, size * 0.34, size * 0.84, size * 0.18, 4);
      ctx.fill();
      for (let column = -1; column <= 1; column += 1) {
        roundedRect(column * size * 0.24 - size * 0.055, -size * 0.34, size * 0.11, size * 0.68, 3);
        ctx.fill();
      }
      ctx.strokeRect(-size * 0.5, -size * 0.5, size, size);
    } else if (type === "crystal-token") {
      drawDiamond(0, 0, size * 0.58);
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.76)";
      ctx.lineWidth = phonePortrait ? 1 : 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.58);
      ctx.lineTo(0, size * 0.58);
      ctx.moveTo(-size * 0.46, 0);
      ctx.lineTo(size * 0.46, 0);
      ctx.stroke();
    } else if (type === "spark-token") {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.72);
      ctx.lineTo(size * 0.16, -size * 0.16);
      ctx.lineTo(size * 0.72, 0);
      ctx.lineTo(size * 0.16, size * 0.16);
      ctx.lineTo(0, size * 0.72);
      ctx.lineTo(-size * 0.16, size * 0.16);
      ctx.lineTo(-size * 0.72, 0);
      ctx.lineTo(-size * 0.16, -size * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === "crown-token") {
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, size * 0.28);
      ctx.lineTo(-size * 0.42, -size * 0.34);
      ctx.lineTo(-size * 0.12, size * 0.02);
      ctx.lineTo(0, -size * 0.48);
      ctx.lineTo(size * 0.12, size * 0.02);
      ctx.lineTo(size * 0.42, -size * 0.34);
      ctx.lineTo(size * 0.55, size * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFirstMazeQuestionGateOverlays() {
    const style = getPlayableMazeArtStyle();
    if (!style || state.phase === "start") {
      return;
    }
    const actors = [];
    if (state.boss) {
      actors.push(state.boss);
    }
    for (const enemy of state.enemies) {
      actors.push(enemy);
    }
    if (!actors.length) {
      return;
    }

    ctx.save();
    for (let index = 0; index < actors.length; index += 1) {
      const actor = actors[index];
      const gateState = getFirstMazeQuestionGateState(actor);
      const lockedAlpha = MOBILE_RUNTIME.phonePortrait ? 0.34 : 0.42;
      const alpha = gateState === "locked" ? lockedAlpha : 0.86;
      drawFirstMazeQuestionGateMarker(actor.x, actor.y, actor.radius, gateState, index, alpha, style);
    }
    ctx.restore();
  }

  function getFirstMazeQuestionGateState(actor) {
    const active = state.phase === "question" && state.currentEnemyId === actor.id;
    if (!active) {
      return "locked";
    }
    const result = els.questionDialog?.dataset?.answerResult;
    if (result === "correct") {
      return "success";
    }
    if (result === "wrong" || result === "timeout") {
      return "wrong";
    }
    return "active";
  }

  function drawFirstMazeQuestionGateMarker(x, y, actorRadius, gateState, index, alpha, style = getPlayableMazeArtStyle()) {
    const phonePortrait = isPhonePortraitView();
    const baseRadius = Math.max(phonePortrait ? 17 : 20, actorRadius * (phonePortrait ? 1.85 : 2.05));
    const pulse = gateState === "locked" ? 0 : Math.sin(state.clock * 5 + index) * 2.4;
    const radius = baseRadius + pulse;
    const fallbackGate = {
      locked: { color: "rgba(255, 219, 92, 0.92)", fill: "rgba(79, 44, 48, 0.74)", glow: "rgba(255, 176, 80, 0.42)", glyph: "×" },
      active: { color: "rgba(255, 243, 112, 0.98)", fill: "rgba(103, 55, 35, 0.88)", glow: "rgba(255, 211, 92, 0.62)", glyph: "?" },
      success: { color: "rgba(112, 241, 169, 0.98)", fill: "rgba(30, 87, 65, 0.86)", glow: "rgba(103, 240, 139, 0.58)", glyph: "+" },
      wrong: { color: "rgba(255, 105, 126, 0.98)", fill: "rgba(109, 35, 55, 0.88)", glow: "rgba(255, 76, 95, 0.58)", glyph: "!" }
    };
    const palette = (style?.gate || fallbackGate)[gateState] || null;
    if (!palette) {
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = gateState === "locked" ? (phonePortrait ? 3 : 5) : (phonePortrait ? 10 : 16);

    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.24);
    halo.addColorStop(0, palette.glow);
    halo.addColorStop(0.58, "rgba(255, 255, 255, 0)");
    halo.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = palette.fill;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = palette.color;
    ctx.lineWidth = gateState === "locked" ? (phonePortrait ? 1.7 : 2.1) : (phonePortrait ? 2.5 : 3.2);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth *= 0.72;
    for (let mark = 0; mark < 4; mark += 1) {
      const angle = mark * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.54, Math.sin(angle) * radius * 0.54);
      ctx.lineTo(Math.cos(angle) * radius * 0.86, Math.sin(angle) * radius * 0.86);
      ctx.stroke();
    }

    ctx.fillStyle = palette.color;
    ctx.font = `800 ${gateState === "locked" ? (phonePortrait ? 11 : 13) : (phonePortrait ? 15 : 18)}px Fredoka, Assistant, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(palette.glyph, 0, phonePortrait ? -1 : 0);
    ctx.restore();
  }

  function getAutotileStaticMazeBoard(level, atlas, visualProfile) {
    const cacheKey = getMazeStaticBoardCacheKey(level, atlas, visualProfile);
    if (mazeStaticBoardCache.has(cacheKey)) {
      return mazeStaticBoardCache.get(cacheKey);
    }

    const boardCanvas = document.createElement("canvas");
    boardCanvas.width = WIDTH;
    boardCanvas.height = HEIGHT;
    const boardContext = boardCanvas.getContext("2d");
    if (!boardContext) {
      return null;
    }

    boardContext.imageSmoothingEnabled = true;
    boardContext.imageSmoothingQuality = isPhonePortraitView() || MOBILE_RUNTIME.reducedEffects ? "medium" : "high";
    withMazeRenderContext(boardContext, () => drawAutotileStaticMazeLayers(level, atlas, visualProfile));

    const cacheEntry = {
      canvas: boardCanvas,
      cacheKey,
      profileKey: visualProfile.key
    };
    mazeStaticBoardCache.set(cacheKey, cacheEntry);
    if (mazeStaticBoardCache.size > 16) {
      const oldestKey = mazeStaticBoardCache.keys().next().value;
      mazeStaticBoardCache.delete(oldestKey);
    }
    return cacheEntry;
  }

  function drawAutotileMazeBoard(level, atlas) {
    const visualProfile = getMazeMobileVisualProfile();
    prepareMazeScatterDecor();
    const staticBoard = getAutotileStaticMazeBoard(level, atlas, visualProfile);
    if (staticBoard) {
      ctx.drawImage(staticBoard.canvas, 0, 0, WIDTH, HEIGHT);
    } else {
      drawAutotileStaticMazeLayers(level, atlas, visualProfile);
    }
    drawAutotileAmbientLayer(level, atlas.theme, visualProfile);
  }

  function drawAtlasTile(atlas, key, x, y, width = TILE, height = TILE, alpha = 1) {
    const index = atlas.keyToIndex[key];
    if (index === undefined) {
      return;
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = isPhonePortraitView() || MOBILE_RUNTIME.reducedEffects ? "medium" : "high";
    ctx.drawImage(
      atlas.canvas,
      index * atlas.tileSize,
      0,
      atlas.tileSize,
      atlas.tileSize,
      x,
      y,
      width,
      height
    );
    ctx.restore();
  }

  function drawAutotileWorldBase(theme, visualProfile = getMazeMobileVisualProfile()) {
    const visuals = getMazeProceduralVisuals(theme);
    ctx.save();
    const base = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    base.addColorStop(0, theme.base[0]);
    base.addColorStop(0.56, theme.base[1]);
    base.addColorStop(1, theme.base[2]);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const light = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.45, HEIGHT * 0.06, WIDTH * 0.5, HEIGHT * 0.5, HEIGHT * 0.8);
    light.addColorStop(0, theme.hazardWash);
    light.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = (isPhonePortraitView() ? 0.2 : 0.28) * visualProfile.ambientAlphaScale;
    ctx.fillStyle = visuals.ambient;
    for (let i = 0; i < visualProfile.worldLightColumns; i += 1) {
      const x = (i * 137 + state.levelIndex * 59) % WIDTH;
      ctx.fillRect(x, 0, 1.2, HEIGHT);
    }

    ctx.globalCompositeOperation = "multiply";
    const depth = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    depth.addColorStop(0, "rgba(0, 0, 0, 0.12)");
    depth.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    depth.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = depth;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  function drawAutotileFloorLayer(atlas, visualProfile = getMazeMobileVisualProfile()) {
    const theme = atlas.theme;
    const visuals = getMazeProceduralVisuals(theme);
    ctx.save();
    for (let y = 0; y < ROWS; y += 1) {
      let x = 0;
      while (x < COLS) {
        if (state.maze[y][x] === 1) {
          x += 1;
          continue;
        }
        const start = x;
        while (x < COLS && state.maze[y][x] !== 1) {
          x += 1;
        }
        const px = start * TILE;
        const py = y * TILE;
        const width = (x - start) * TILE;
        const gradient = ctx.createLinearGradient(px, py, px + width, py + TILE);
        gradient.addColorStop(0, theme.floor[0]);
        gradient.addColorStop(0.5, theme.floor[1]);
        gradient.addColorStop(1, theme.floor[2]);
        ctx.fillStyle = gradient;
        ctx.fillRect(px, py, width, TILE);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = (isPhonePortraitView() ? 0.1 : 0.16) * visualProfile.glowScale;
        const sheen = ctx.createLinearGradient(px, py, px, py + TILE);
        sheen.addColorStop(0, visuals.floorGlow);
        sheen.addColorStop(0.42, "rgba(255, 255, 255, 0)");
        sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = sheen;
        ctx.fillRect(px, py, width, TILE);
        ctx.restore();
        if (atlas.sheet) {
          drawMazeWorldTextureRect(atlas.sheet, (y + start + state.levelIndex) % 4 === 0 ? "floorAccentTexture" : "floorTexture", px, py, width, TILE, {
            alpha: (atlas.theme.motif === "ice" ? 0.34 : 0.26) * visualProfile.textureAlphaScale,
            blend: atlas.theme.motif === "lava" ? "screen" : "overlay",
            patternScale: 0.74,
            offsetX: start * 19 + y * 7,
            offsetY: y * 23
          });
        }
      }
    }

    ctx.globalCompositeOperation = "screen";
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        const seed = (x * 17 + y * 31 + state.levelIndex * 7) % 19;
        if (seed === 0) {
          drawAtlasTile(atlas, "floorAlt", x * TILE, y * TILE, TILE, TILE, visualProfile.floorAltAlpha);
        }
      }
    }
    ctx.restore();
  }

  function drawAutotileFloorDetailLayer(atlas, visualProfile = getMazeMobileVisualProfile()) {
    const theme = atlas.theme;
    const visuals = getMazeProceduralVisuals(theme);
    const phonePortrait = isPhonePortraitView();
    const detailThreshold = (phonePortrait ? 0.08 : 0.15) * visualProfile.floorDetailThresholdScale;
    const detailStep = Math.max(1, visualProfile.floorDetailStep);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let y = 1; y < ROWS - 1; y += detailStep) {
      for (let x = 1; x < COLS - 1; x += detailStep) {
        if (state.maze[y][x] === 1 || state.collectibles.has(cellKey(x, y))) {
          continue;
        }
        const seed = mazeCellNoise(x, y, 5);
        if (seed > detailThreshold) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        const alpha = (phonePortrait ? 0.14 : 0.2) * visualProfile.glowScale;
        ctx.globalAlpha = alpha * (1 - seed * 0.35);
        ctx.strokeStyle = visuals.floorDetail;
        ctx.fillStyle = visuals.floorDetail;
        ctx.lineWidth = phonePortrait ? 1 : 1.25;

        if (theme.motif === "ice") {
          ctx.beginPath();
          ctx.moveTo(px + TILE * 0.22, py + TILE * 0.66);
          ctx.lineTo(px + TILE * 0.46, py + TILE * 0.43);
          ctx.lineTo(px + TILE * 0.72, py + TILE * 0.5);
          if (seed < 0.04) {
            ctx.moveTo(px + TILE * 0.46, py + TILE * 0.43);
            ctx.lineTo(px + TILE * 0.4, py + TILE * 0.24);
          }
          ctx.stroke();
        } else if (theme.motif === "lava") {
          ctx.shadowColor = theme.accent;
          ctx.shadowBlur = (phonePortrait ? 3 : 5) * visualProfile.glowScale;
          ctx.beginPath();
          ctx.moveTo(px + TILE * 0.12, py + TILE * 0.55);
          ctx.quadraticCurveTo(px + TILE * 0.42, py + TILE * 0.38, px + TILE * 0.84, py + TILE * 0.6);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (theme.motif === "ancient") {
          ctx.globalAlpha *= 0.8;
          ctx.strokeRect(px + TILE * 0.2, py + TILE * 0.2, TILE * 0.6, TILE * 0.6);
          if (seed < 0.05) {
            ctx.beginPath();
            ctx.moveTo(px + TILE * 0.36, py + TILE * 0.52);
            ctx.lineTo(px + TILE * 0.5, py + TILE * 0.36);
            ctx.lineTo(px + TILE * 0.64, py + TILE * 0.52);
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(px + TILE * 0.5, py + TILE * 0.16);
          ctx.lineTo(px + TILE * 0.82, py + TILE * 0.5);
          ctx.lineTo(px + TILE * 0.5, py + TILE * 0.84);
          ctx.lineTo(px + TILE * 0.18, py + TILE * 0.5);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawAutotileWorldIdentityLayer(level, theme, visualProfile = getMazeMobileVisualProfile()) {
    const phonePortrait = isPhonePortraitView();
    const center = centerOfCell(CENTER_CELL.x, CENTER_CELL.y);
    const radius = phonePortrait ? 62 : 82;
    const alpha = (phonePortrait ? 0.11 : 0.16) * visualProfile.glowScale;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = theme.accent;
    ctx.fillStyle = theme.accent;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = (phonePortrait ? 8 : 14) * visualProfile.glowScale;
    ctx.lineWidth = phonePortrait ? 1.5 : 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.translate(center.x, center.y);

    if (theme.motif === "ice") {
      for (let arm = 0; arm < 6; arm += 1) {
        ctx.save();
        ctx.rotate(arm * Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(radius * 0.12, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();
        for (const mark of [0.42, 0.68, 0.86]) {
          const armX = radius * mark;
          ctx.beginPath();
          ctx.moveTo(armX, 0);
          ctx.lineTo(armX - radius * 0.13, -radius * 0.1);
          ctx.moveTo(armX, 0);
          ctx.lineTo(armX - radius * 0.13, radius * 0.1);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (theme.motif === "lava") {
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.28 + ring * 0.21), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let vent = 0; vent < 8; vent += 1) {
        const angle = vent * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.22, Math.sin(angle) * radius * 0.22);
        ctx.lineTo(Math.cos(angle) * radius * 0.84, Math.sin(angle) * radius * 0.84);
        ctx.stroke();
      }
    } else if (theme.motif === "ancient") {
      for (let ring = 0; ring < 2; ring += 1) {
        const size = radius * (0.68 + ring * 0.34);
        roundedRect(-size / 2, -size / 2, size, size, 5);
        ctx.stroke();
      }
      for (let side = 0; side < 4; side += 1) {
        ctx.save();
        ctx.rotate(side * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.86);
        ctx.lineTo(radius * 0.12, -radius * 0.58);
        ctx.lineTo(-radius * 0.12, -radius * 0.58);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.rotate(Math.PI / 4);
      for (let layer = 0; layer < 3; layer += 1) {
        const size = radius * (0.42 + layer * 0.22);
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.72, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.72, 0);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.86, 0);
      ctx.lineTo(radius * 0.86, 0);
      ctx.moveTo(0, -radius * 0.86);
      ctx.lineTo(0, radius * 0.86);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAutotileLaneRibbonLayer(atlas, visualProfile = getMazeMobileVisualProfile()) {
    const theme = atlas.theme;
    const visuals = getMazeProceduralVisuals(theme);
    const phonePortrait = isPhonePortraitView();
    const centerInset = TILE / 2;
    const glowWidth = phonePortrait ? 7 : 8.5;
    const lineWidth = phonePortrait ? 2.1 : 2.6;
    const glowAlpha = (phonePortrait ? 0.1 : 0.14) * visualProfile.glowScale;
    const lineAlpha = (phonePortrait ? 0.18 : 0.24) * visualProfile.glowScale;
    const nodeAlpha = (phonePortrait ? 0.18 : 0.26) * visualProfile.glowScale;
    const laneColor = theme.motif === "lava"
      ? "rgba(255, 117, 30, 0.78)"
      : theme.motif === "ancient"
      ? "rgba(45, 226, 200, 0.7)"
      : theme.motif === "diamond"
      ? "rgba(255, 124, 231, 0.72)"
      : "rgba(176, 247, 255, 0.78)";

    const strokeConnections = (width, alpha, color) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let y = 1; y < ROWS - 1; y += 1) {
        for (let x = 1; x < COLS - 1; x += 1) {
          if (state.maze[y][x] === 1) {
            continue;
          }
          const nearWall = isWallCell(x - 1, y)
            || isWallCell(x + 1, y)
            || isWallCell(x, y - 1)
            || isWallCell(x, y + 1);
          if (!nearWall) {
            continue;
          }
          const cx = x * TILE + centerInset;
          const cy = y * TILE + centerInset;
          if (!isWallCell(x + 1, y) && (nearWall || isWallCell(x + 2, y))) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + TILE, cy);
          }
          if (!isWallCell(x, y + 1) && (nearWall || isWallCell(x, y + 2))) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, cy + TILE);
          }
        }
      }
      ctx.stroke();
    };

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = (phonePortrait ? 4 : 7) * visualProfile.glowScale;
    strokeConnections(glowWidth, glowAlpha, theme.floorGlow || visuals.floorGlow);
    ctx.shadowBlur = (phonePortrait ? 2 : 4) * visualProfile.glowScale;
    strokeConnections(lineWidth, lineAlpha, laneColor);

    ctx.shadowBlur = 0;
    ctx.fillStyle = laneColor;
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        const openCount = [
          !isWallCell(x - 1, y),
          !isWallCell(x + 1, y),
          !isWallCell(x, y - 1),
          !isWallCell(x, y + 1)
        ].filter(Boolean).length;
        const nearWall = isWallCell(x - 1, y)
          || isWallCell(x + 1, y)
          || isWallCell(x, y - 1)
          || isWallCell(x, y + 1);
        if (!nearWall || (openCount < 3 && ((x * 17 + y * 11 + state.levelIndex) % 13) !== 0)) {
          continue;
        }
        ctx.globalAlpha = nodeAlpha * (openCount >= 3 ? 1 : 0.54);
        ctx.beginPath();
        ctx.arc(x * TILE + centerInset, y * TILE + centerInset, openCount >= 3 ? 2.8 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawAutotilePathContactShadows(theme, visualProfile = getMazeMobileVisualProfile()) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = theme.innerShadow;
    ctx.globalAlpha = (isPhonePortraitView() ? 0.44 : 0.54) * visualProfile.wallShadowScale;
    const edge = isPhonePortraitView() ? 4 : 5;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        if (isWallCell(x, y - 1)) ctx.fillRect(px, py, TILE, edge);
        if (isWallCell(x, y + 1)) ctx.fillRect(px, py + TILE - edge, TILE, edge);
        if (isWallCell(x - 1, y)) ctx.fillRect(px, py, edge, TILE);
        if (isWallCell(x + 1, y)) ctx.fillRect(px + TILE - edge, py, edge, TILE);
      }
    }
    ctx.restore();
  }

  function drawAutotileWallLayer(atlas, visualProfile = getMazeMobileVisualProfile()) {
    const theme = atlas.theme;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.55 * visualProfile.wallShadowScale;
    ctx.fillStyle = theme.wallShadow;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!isWallCell(x, y)) continue;
        const hasOpenSouth = !isWallCell(x, y + 1);
        const hasOpenEast = !isWallCell(x + 1, y);
        if (hasOpenSouth || hasOpenEast) {
          ctx.fillRect(x * TILE + 2.5, y * TILE + 4.5, TILE, TILE);
        }
      }
    }
    ctx.restore();

    drawAutotileWallMasses(atlas, visualProfile);
    drawAutotileWallMaterialDetailLayer(atlas, visualProfile);

    ctx.save();
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!isWallCell(x, y)) continue;
        drawAutotileWallCell(atlas, x, y);
      }
    }
    ctx.restore();
  }

  function drawAutotileWallMasses(atlas, visualProfile = getMazeMobileVisualProfile()) {
    const theme = atlas.theme;
    const visuals = getMazeProceduralVisuals(theme);
    ctx.save();
    for (let y = 0; y < ROWS; y += 1) {
      let x = 0;
      while (x < COLS) {
        if (!isWallCell(x, y)) {
          x += 1;
          continue;
        }
        const start = x;
        while (x < COLS && isWallCell(x, y)) {
          x += 1;
        }
        const px = start * TILE;
        const py = y * TILE;
        const width = (x - start) * TILE;
        const radius = Math.min(TILE * 0.42, Math.max(5, width * 0.16));
        const wallBodyHeight = TILE + (isPhonePortraitView() ? 3 : 4);
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.28 * visualProfile.wallShadowScale;
        ctx.fillStyle = theme.wallShadow;
        roundedRect(px + 2.5, py + 5.5, Math.max(1, width - 1), wallBodyHeight, radius);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        const sideGradient = ctx.createLinearGradient(px, py + TILE * 0.44, px, py + wallBodyHeight);
        sideGradient.addColorStop(0, theme.wallSide);
        sideGradient.addColorStop(1, theme.wallShadow);
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = sideGradient;
        roundedRect(px + 0.5, py + TILE * 0.34, Math.max(1, width - 1), TILE * 0.66 + 4, radius);
        ctx.fill();
        ctx.restore();

        const gradient = ctx.createLinearGradient(px, py, px + width, py + TILE);
        gradient.addColorStop(0, theme.wall[0]);
        gradient.addColorStop(0.35, theme.wall[1]);
        gradient.addColorStop(1, theme.wall[2]);
        ctx.fillStyle = gradient;
        roundedRect(px + 1, py + 1, Math.max(1, width - 2), TILE * 0.92, radius);
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = visuals.wallInset;
        roundedRect(px + 3, py + TILE * 0.56, Math.max(1, width - 6), TILE * 0.3, Math.max(3, radius * 0.55));
        ctx.fill();
        ctx.restore();
        if (atlas.sheet) {
          drawMazeWorldTextureRect(atlas.sheet, "wallTexture", px, py, width, TILE, {
            alpha: (theme.motif === "ice" ? 0.48 : 0.36) * visualProfile.textureAlphaScale,
            blend: theme.motif === "lava" ? "screen" : "overlay",
            patternScale: 0.58,
            offsetX: start * 31 + y * 11,
            offsetY: y * 17
          });
        }

        const cap = ctx.createLinearGradient(px, py, px, py + TILE * 0.56);
        cap.addColorStop(0, "rgba(255, 255, 255, 0.28)");
        cap.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = cap;
        roundedRect(px + 2, py + 2, Math.max(1, width - 4), TILE * 0.42, Math.max(3, radius * 0.58));
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    }

    ctx.globalCompositeOperation = "overlay";
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (!isWallCell(x, y)) {
          continue;
        }
        const exposed = !isWallCell(x, y - 1) || !isWallCell(x + 1, y) || !isWallCell(x, y + 1) || !isWallCell(x - 1, y);
        const seed = (x * 43 + y * 37 + state.levelIndex * 11) % 23;
        if (exposed && seed === 0) {
          drawAtlasTile(atlas, "wallAlt", x * TILE, y * TILE, TILE, TILE, visualProfile.wallAltAlpha);
        }
      }
    }
    ctx.restore();
  }

  function drawAutotileWallMaterialDetailLayer(atlas, visualProfile = getMazeMobileVisualProfile()) {
    const theme = atlas.theme;
    const visuals = getMazeProceduralVisuals(theme);
    const phonePortrait = isPhonePortraitView();
    const detailThreshold = (phonePortrait ? 0.12 : 0.2) * visualProfile.wallDetailThresholdScale;
    const detailStep = Math.max(1, visualProfile.wallDetailStep);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let y = 1; y < ROWS - 1; y += detailStep) {
      for (let x = 1; x < COLS - 1; x += detailStep) {
        if (!isWallCell(x, y)) {
          continue;
        }
        const exposed = !isWallCell(x, y - 1) || !isWallCell(x + 1, y) || !isWallCell(x, y + 1) || !isWallCell(x - 1, y);
        const seed = mazeCellNoise(x, y, 11);
        if (!exposed || seed > detailThreshold) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        ctx.globalAlpha = (phonePortrait ? 0.16 : 0.24) * visualProfile.glowScale;
        ctx.strokeStyle = seed < 0.055 ? visuals.wallAccent : visuals.wallSeam;
        ctx.fillStyle = visuals.wallAccent;
        ctx.lineWidth = phonePortrait ? 1 : 1.25;

        if (theme.motif === "ice") {
          ctx.beginPath();
          ctx.moveTo(px + TILE * 0.16, py + TILE * 0.3);
          ctx.lineTo(px + TILE * 0.42, py + TILE * 0.16);
          ctx.lineTo(px + TILE * 0.68, py + TILE * 0.34);
          ctx.moveTo(px + TILE * 0.3, py + TILE * 0.78);
          ctx.lineTo(px + TILE * 0.54, py + TILE * 0.54);
          ctx.lineTo(px + TILE * 0.78, py + TILE * 0.68);
          ctx.stroke();
        } else if (theme.motif === "lava") {
          ctx.shadowColor = theme.accent;
          ctx.shadowBlur = (phonePortrait ? 4 : 7) * visualProfile.glowScale;
          ctx.beginPath();
          ctx.moveTo(px + TILE * 0.12, py + TILE * 0.38);
          ctx.lineTo(px + TILE * 0.36, py + TILE * 0.5);
          ctx.lineTo(px + TILE * 0.3, py + TILE * 0.72);
          if (seed < 0.05) {
            ctx.moveTo(px + TILE * 0.58, py + TILE * 0.18);
            ctx.lineTo(px + TILE * 0.7, py + TILE * 0.44);
            ctx.lineTo(px + TILE * 0.86, py + TILE * 0.54);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (theme.motif === "ancient") {
          ctx.globalAlpha *= 0.82;
          ctx.strokeRect(px + TILE * 0.18, py + TILE * 0.18, TILE * 0.64, TILE * 0.58);
          if (seed < 0.06) {
            ctx.beginPath();
            ctx.moveTo(px + TILE * 0.34, py + TILE * 0.5);
            ctx.lineTo(px + TILE * 0.5, py + TILE * 0.34);
            ctx.lineTo(px + TILE * 0.66, py + TILE * 0.5);
            ctx.lineTo(px + TILE * 0.5, py + TILE * 0.66);
            ctx.closePath();
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(px + TILE * 0.12, py + TILE * 0.55);
          ctx.lineTo(px + TILE * 0.36, py + TILE * 0.18);
          ctx.lineTo(px + TILE * 0.7, py + TILE * 0.24);
          ctx.lineTo(px + TILE * 0.88, py + TILE * 0.62);
          ctx.lineTo(px + TILE * 0.54, py + TILE * 0.84);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawAutotileWallCell(atlas, x, y) {
    const px = x * TILE;
    const py = y * TILE;
    const openUp = !isWallCell(x, y - 1);
    const openRight = !isWallCell(x + 1, y);
    const openDown = !isWallCell(x, y + 1);
    const openLeft = !isWallCell(x - 1, y);

    if (openUp) drawAtlasTile(atlas, "edgeN", px, py);
    if (openRight) drawAtlasTile(atlas, "edgeE", px, py);
    if (openDown) drawAtlasTile(atlas, "edgeS", px, py);
    if (openLeft) drawAtlasTile(atlas, "edgeW", px, py);

    if (openUp && openRight) drawAtlasTile(atlas, "cornerNE", px, py);
    if (openRight && openDown) drawAtlasTile(atlas, "cornerSE", px, py);
    if (openDown && openLeft) drawAtlasTile(atlas, "cornerSW", px, py);
    if (openLeft && openUp) drawAtlasTile(atlas, "cornerNW", px, py);
  }

  function drawAutotileWallRimLightLayer(atlas, visualProfile = getMazeMobileVisualProfile()) {
    const theme = atlas.theme;
    const visuals = getMazeProceduralVisuals(theme);
    const phonePortrait = isPhonePortraitView();
    const rimWidth = phonePortrait ? 1.25 : 1.6;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = visuals.wallRim;
    ctx.lineWidth = rimWidth;
    ctx.lineCap = "round";
    ctx.globalAlpha = (phonePortrait ? 0.32 : 0.42) * visualProfile.rimAlphaScale;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!isWallCell(x, y)) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        const openUp = !isWallCell(x, y - 1);
        const openRight = !isWallCell(x + 1, y);
        const openDown = !isWallCell(x, y + 1);
        const openLeft = !isWallCell(x - 1, y);
        ctx.beginPath();
        if (openUp) {
          ctx.moveTo(px + 3, py + 2);
          ctx.lineTo(px + TILE - 3, py + 2);
        }
        if (openRight) {
          ctx.moveTo(px + TILE - 2, py + 3);
          ctx.lineTo(px + TILE - 2, py + TILE - 3);
        }
        if (openDown) {
          ctx.moveTo(px + 3, py + TILE - 2);
          ctx.lineTo(px + TILE - 3, py + TILE - 2);
        }
        if (openLeft) {
          ctx.moveTo(px + 2, py + 3);
          ctx.lineTo(px + 2, py + TILE - 3);
        }
        ctx.stroke();
      }
    }

    ctx.globalAlpha = (phonePortrait ? 0.12 : 0.18) * visualProfile.rimAlphaScale;
    ctx.strokeStyle = visuals.wallAccent;
    ctx.lineWidth = Math.max(1, rimWidth * 0.72);
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (!isWallCell(x, y) || mazeCellNoise(x, y, 17) > 0.12) {
          continue;
        }
        const exposed = !isWallCell(x, y - 1) || !isWallCell(x + 1, y) || !isWallCell(x, y + 1) || !isWallCell(x - 1, y);
        if (!exposed) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        ctx.beginPath();
        ctx.moveTo(px + TILE * 0.24, py + TILE * 0.18);
        ctx.lineTo(px + TILE * 0.72, py + TILE * 0.18);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function shouldSkipMazeScatterDecorItem(item) {
    if (!item) {
      return true;
    }

    if (state.collectibles.has(cellKey(item.x, item.y))) {
      return true;
    }

    const itemCell = { x: item.x, y: item.y };
    if (state.player && distanceCells(itemCell, toCell(state.player.x, state.player.y)) <= 0) {
      return true;
    }

    for (const enemy of state.enemies) {
      if (distanceCells(itemCell, toCell(enemy.x, enemy.y)) <= 0) {
        return true;
      }
    }

    if (state.phase === "question" && state.currentEnemyId) {
      const activeBoss = state.boss && state.boss.id === state.currentEnemyId ? state.boss : null;
      const activeEnemy = state.enemies.find((enemy) => enemy.id === state.currentEnemyId);
      const activeActor = activeBoss || activeEnemy;
      if (activeActor && distanceCells(itemCell, toCell(activeActor.x, activeActor.y)) <= 1) {
        return true;
      }
    }

    if (state.boss && distanceCells(itemCell, toCell(state.boss.x, state.boss.y)) <= 1) {
      return true;
    }

    return false;
  }

  function drawAutotileScatterDecorLayer(atlas, layer, visualProfile = getMazeMobileVisualProfile()) {
    const items = state.mazeScatterDecor || [];
    if (!items.length) {
      return false;
    }

    const theme = atlas.theme;
    const visuals = getMazeProceduralVisuals(theme);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const item of items) {
      if (item.layer !== layer || shouldSkipMazeScatterDecorItem(item)) {
        continue;
      }
      drawMazeScatterDecorItem(item, theme, visuals, visualProfile);
    }
    ctx.restore();
    return true;
  }

  function drawMazeScatterDecorItem(item, theme, visuals, visualProfile = getMazeMobileVisualProfile()) {
    const cx = item.x * TILE + item.offsetX * TILE;
    const cy = item.y * TILE + item.offsetY * TILE;
    const size = TILE * item.scale;
    const alpha = item.alpha * (isPhonePortraitView() ? 0.82 : 1) * visualProfile.scatterAlphaScale;

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = item.layer === "behind" ? "screen" : "source-over";
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = item.layer === "floor" ? 0 : (isPhonePortraitView() ? 2 : 4) * visualProfile.scatterShadowScale;

    if (theme.motif === "ice") {
      drawIceScatterDecor(item, cx, cy, size, visuals);
    } else if (theme.motif === "lava") {
      drawLavaScatterDecor(item, cx, cy, size, visuals);
    } else if (theme.motif === "ancient") {
      drawAncientScatterDecor(item, cx, cy, size, visuals);
    } else {
      drawDiamondScatterDecor(item, cx, cy, size, visuals);
    }

    ctx.restore();
  }

  function drawIceScatterDecor(item, cx, cy, size, visuals) {
    ctx.strokeStyle = visuals.wallRim;
    ctx.fillStyle = visuals.wallAccent;
    ctx.lineWidth = Math.max(0.75, size * 0.08);

    if (item.type === "frost-sparkle") {
      ctx.globalCompositeOperation = "screen";
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.25, cy);
      ctx.lineTo(cx + size * 0.25, cy);
      ctx.moveTo(cx, cy - size * 0.25);
      ctx.lineTo(cx, cy + size * 0.25);
      ctx.stroke();
      return;
    }

    if (item.type === "snow-pile" || item.type === "frost-haze") {
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = item.type === "frost-haze" ? "rgba(190, 246, 255, 0.18)" : "rgba(230, 253, 255, 0.62)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + size * 0.18, size * 0.42, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.globalCompositeOperation = "screen";
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.48);
    ctx.lineTo(cx + size * 0.34, cy + size * 0.08);
    ctx.lineTo(cx + size * 0.06, cy + size * 0.42);
    ctx.lineTo(cx - size * 0.28, cy + size * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha *= 0.72;
    ctx.stroke();
  }

  function drawLavaScatterDecor(item, cx, cy, size, visuals) {
    ctx.strokeStyle = visuals.wallAccent;
    ctx.fillStyle = visuals.wallAccent;
    ctx.lineWidth = Math.max(0.8, size * 0.08);

    if (item.type === "ember-crack") {
      ctx.globalCompositeOperation = "screen";
      ctx.shadowBlur = isPhonePortraitView() ? 3 : 6;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.42, cy + size * 0.1);
      ctx.lineTo(cx - size * 0.12, cy - size * 0.08);
      ctx.lineTo(cx + size * 0.16, cy + size * 0.05);
      ctx.lineTo(cx + size * 0.42, cy - size * 0.16);
      ctx.stroke();
      return;
    }

    if (item.type === "smoke-vent" || item.type === "ash-smudge") {
      ctx.globalCompositeOperation = "multiply";
      ctx.shadowBlur = 0;
      ctx.fillStyle = item.type === "ash-smudge" ? "rgba(0, 0, 0, 0.34)" : "rgba(14, 10, 8, 0.58)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 0.4, size * 0.18, -0.15, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(30, 24, 21, 0.76)";
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.4, cy + size * 0.22);
    ctx.lineTo(cx - size * 0.12, cy - size * 0.32);
    ctx.lineTo(cx + size * 0.36, cy - size * 0.18);
    ctx.lineTo(cx + size * 0.28, cy + size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha *= 0.62;
    ctx.strokeStyle = visuals.wallAccent;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.04, cy - size * 0.18);
    ctx.lineTo(cx + size * 0.14, cy + size * 0.14);
    ctx.stroke();
  }

  function drawAncientScatterDecor(item, cx, cy, size, visuals) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = visuals.wallRim;
    ctx.fillStyle = "rgba(210, 179, 112, 0.58)";
    ctx.lineWidth = Math.max(0.75, size * 0.07);

    if (item.type === "tiny-rune") {
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = visuals.wallAccent;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.22, cy + size * 0.12);
      ctx.lineTo(cx, cy - size * 0.16);
      ctx.lineTo(cx + size * 0.22, cy + size * 0.12);
      ctx.stroke();
      return;
    }

    if (item.type === "jar") {
      ctx.beginPath();
      ctx.ellipse(cx, cy + size * 0.05, size * 0.24, size * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha *= 0.58;
      ctx.stroke();
      return;
    }

    if (item.type === "small-plant") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(72, 128, 70, 0.58)";
      ctx.beginPath();
      ctx.moveTo(cx, cy + size * 0.24);
      ctx.quadraticCurveTo(cx - size * 0.24, cy - size * 0.08, cx - size * 0.42, cy - size * 0.12);
      ctx.moveTo(cx, cy + size * 0.24);
      ctx.quadraticCurveTo(cx + size * 0.2, cy - size * 0.06, cx + size * 0.38, cy - size * 0.02);
      ctx.stroke();
      return;
    }

    if (item.type === "sand-dust") {
      ctx.fillStyle = "rgba(236, 205, 143, 0.26)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 0.46, size * 0.18, 0.12, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.fillRect(cx - size * 0.28, cy - size * 0.24, size * 0.56, size * 0.48);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha *= 0.72;
    ctx.strokeStyle = visuals.wallAccent;
    ctx.strokeRect(cx - size * 0.2, cy - size * 0.16, size * 0.4, size * 0.3);
  }

  function drawDiamondScatterDecor(item, cx, cy, size, visuals) {
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = item.variant % 2 === 0 ? visuals.wallAccent : visuals.wallRim;
    ctx.fillStyle = item.variant % 2 === 0 ? "rgba(255, 116, 229, 0.32)" : "rgba(150, 244, 255, 0.38)";
    ctx.lineWidth = Math.max(0.75, size * 0.07);

    if (item.type === "prism-spark" || item.type === "crystal-haze") {
      ctx.globalAlpha *= item.type === "crystal-haze" ? 0.55 : 1;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.28, cy);
      ctx.lineTo(cx + size * 0.28, cy);
      ctx.moveTo(cx, cy - size * 0.28);
      ctx.lineTo(cx, cy + size * 0.28);
      ctx.stroke();
      return;
    }

    if (item.type === "gem-chip") {
      drawDiamond(cx, cy, size * 0.28);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.48);
    ctx.lineTo(cx + size * 0.36, cy - size * 0.06);
    ctx.lineTo(cx + size * 0.18, cy + size * 0.44);
    ctx.lineTo(cx - size * 0.34, cy + size * 0.28);
    ctx.lineTo(cx - size * 0.26, cy - size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha *= 0.78;
    ctx.stroke();
  }

  function drawAutotileDecorationLayer(atlas, visualProfile = getMazeMobileVisualProfile()) {
    if (drawAutotileScatterDecorLayer(atlas, "wall", visualProfile)) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const density = Math.round((atlas.theme.motif === "ice" ? 47 : 61) / Math.max(0.34, visualProfile.decorDensityScale));
    const step = MOBILE_RUNTIME.compactPortrait || MOBILE_RUNTIME.reducedEffects ? 2 : 1;
    for (let y = 1; y < ROWS - 1; y += step) {
      for (let x = 1; x < COLS - 1; x += step) {
        if (!isWallCell(x, y)) {
          continue;
        }
        const isolatedForGameplay = !isWallCell(x, y + 1) && !isWallCell(x, y - 1);
        const seed = (x * 71 + y * 53 + state.levelIndex * 29) % density;
        if (isolatedForGameplay || seed !== 0) {
          continue;
        }
        const scale = atlas.theme.motif === "ice" ? 0.74 : 0.62;
        const size = TILE * scale;
        const offset = (TILE - size) / 2;
        drawAtlasTile(atlas, (x + y) % 2 === 0 ? "decorA" : "decorB", x * TILE + offset, y * TILE + offset, size, size, 0.42 * visualProfile.scatterAlphaScale);
      }
    }
    ctx.restore();
  }

  function drawAutotileSetPiecesLayer(level, visualProfile = getMazeMobileVisualProfile()) {
    const material = getMazeMaterial(level);
    const phonePortrait = isPhonePortraitView();
    const alpha = (phonePortrait ? 0.42 : 0.58) * visualProfile.scatterAlphaScale;
    const scale = phonePortrait ? 0.72 : 0.88;
    const props = [
      { x: 4.4, y: 5.2, scale: 0.9 },
      { x: 35.4, y: 5.2, scale: 0.82 },
      { x: 5.2, y: 22.8, scale: 0.74 },
      { x: 34.7, y: 22.4, scale: 0.82 },
      { x: 10.3, y: 13.2, scale: 0.56 },
      { x: 29.6, y: 17.8, scale: 0.58 }
    ];

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "source-over";
    for (let index = 0; index < props.length; index += 1) {
      const prop = props[index];
      const cell = { x: Math.round(prop.x), y: Math.round(prop.y) };
      if (distanceCells(cell, PLAYER_START) <= 4 || distanceCells(cell, CENTER_CELL) <= 3) {
        continue;
      }
      drawWorldSetPiece(prop.x * TILE, prop.y * TILE, prop.scale * scale, level, material, index);
    }
    ctx.restore();
  }

  function drawAutotileStaticLightingLayer(theme, visualProfile = getMazeMobileVisualProfile()) {
    ctx.save();
    const vignette = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.48, HEIGHT * 0.24, WIDTH * 0.5, HEIGHT * 0.5, HEIGHT * 0.86);
    vignette.addColorStop(0, "rgba(255, 255, 255, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = (isPhonePortraitView() ? 0.48 : 0.58) * visualProfile.wallShadowScale;
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  function drawAutotileAmbientLayer(level, theme, visualProfile = getMazeMobileVisualProfile()) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = theme.particle;
    ctx.globalAlpha = (isPhonePortraitView() ? 0.18 : 0.24) * visualProfile.ambientAlphaScale;
    const baseCount = isPhonePortraitView() ? 16 : 34;
    const count = Math.max(6, Math.round(baseCount * visualProfile.ambientParticleScale));
    for (let i = 0; i < count; i += 1) {
      const x = (i * 173 + state.levelIndex * 41) % WIDTH;
      const speed = theme.motif === "lava" ? -14 : 8;
      const y = (i * 97 + state.clock * speed) % HEIGHT;
      const drawY = y < 0 ? y + HEIGHT : y;
      const radius = 0.7 + (i % 4) * 0.22;
      ctx.beginPath();
      ctx.arc(x + Math.sin(state.clock * 0.45 + i) * 3, drawY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMazeBaseFloorLayer(level, renderTheme) {
    ctx.save();
    const base = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    base.addColorStop(0, renderTheme.baseStops[0]);
    base.addColorStop(0.5, renderTheme.baseStops[1]);
    base.addColorStop(1, renderTheme.baseStops[2]);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = isPhonePortraitView() ? 0.05 : 0.08;
    ctx.strokeStyle = renderTheme.pathLine;
    ctx.lineWidth = 1;
    const step = TILE * 4;
    for (let x = 0; x <= WIDTH; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(WIDTH, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMazeWalkablePathLayer(sheet, level, renderTheme) {
    ctx.save();
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        drawMazeWalkableCell(sheet, level, renderTheme, x, y);
      }
    }
    drawMazePathMotifs(level, renderTheme);
    ctx.restore();
  }

  function drawMazeWalkableCell(sheet, level, renderTheme, x, y) {
    const px = x * TILE;
    const py = y * TILE;
    const seed = deterministic01(x, y, state.levelIndex);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = renderTheme.pathTop;
    ctx.fillRect(px, py, TILE, TILE);

    if (seed > 0.72) {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = renderTheme.pathMid;
      ctx.fillRect(px, py, TILE, TILE);
    }

    drawMazeWorldTextureRect(sheet, "floorTexture", px, py, TILE, TILE, {
      alpha: renderTheme.pathTextureAlpha,
      blend: "overlay",
      patternScale: 0.95,
      offsetX: x * 17,
      offsetY: y * 13
    });

    if ((x * 7 + y * 11 + state.levelIndex * 5) % 17 === 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = renderTheme.pathAccentAlpha * (0.55 + seed * 0.45);
      ctx.fillStyle = renderTheme.pathFacet;
      ctx.beginPath();
      ctx.moveTo(px + TILE * 0.18, py + TILE * 0.24);
      ctx.lineTo(px + TILE * 0.82, py + TILE * 0.12);
      ctx.lineTo(px + TILE * 0.64, py + TILE * 0.72);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawMazePathMotifs(level, renderTheme) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        const seed = (x * 31 + y * 19 + state.levelIndex * 13) % 29;
        if (seed > 0) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        ctx.globalAlpha = isPhonePortraitView() ? 0.045 : 0.07;
        ctx.strokeStyle = renderTheme.pathLine;
        ctx.lineWidth = 0.8;
        if (renderTheme.motif === "ice") {
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 8);
          ctx.lineTo(px + 15, py + 14);
          ctx.lineTo(px + 10, py + 20);
          ctx.stroke();
        } else if (renderTheme.motif === "lava") {
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 16);
          ctx.lineTo(px + 12, py + 9);
          ctx.lineTo(px + 20, py + 16);
          ctx.stroke();
        } else if (renderTheme.motif === "ancient") {
          ctx.strokeRect(px + 7, py + 7, TILE - 14, TILE - 14);
        } else {
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 9);
          ctx.lineTo(px + 13, py + 5);
          ctx.lineTo(px + 20, py + 15);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawMazeContactShadowLayer(renderTheme) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        drawMazeContactShadowStrip(px, py, x, y, renderTheme);
      }
    }
    ctx.restore();
  }

  function drawMazeContactShadowStrip(px, py, x, y, renderTheme) {
    const shadowSize = isPhonePortraitView() ? 4.5 : 5.5;
    ctx.fillStyle = renderTheme.contactShadow;
    ctx.globalAlpha = 0.72;
    if (isWallCell(x, y - 1)) {
      ctx.fillRect(px, py, TILE, shadowSize);
    }
    if (isWallCell(x, y + 1)) {
      ctx.fillRect(px, py + TILE - shadowSize, TILE, shadowSize);
    }
    if (isWallCell(x - 1, y)) {
      ctx.fillRect(px, py, shadowSize, TILE);
    }
    if (isWallCell(x + 1, y)) {
      ctx.fillRect(px + TILE - shadowSize, py, shadowSize, TILE);
    }
  }

  function drawMazeRaisedWallLayer(sheet, level, renderTheme) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    drawMazeWallDropShadows(renderTheme);
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }
        drawMazeRaisedWallCell(sheet, level, renderTheme, x, y);
      }
    }
    ctx.restore();
  }

  function drawMazeWallDropShadows(renderTheme) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = renderTheme.wallShadow;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        if (!isWallCell(x, y + 1) || !isWallCell(x + 1, y)) {
          ctx.fillRect(px + 2.5, py + 4.5, TILE, TILE);
        }
      }
    }
    ctx.restore();
  }

  function drawMazeRaisedWallCell(sheet, level, renderTheme, x, y) {
    const px = x * TILE;
    const py = y * TILE;
    const openUp = !isWallCell(x, y - 1);
    const openDown = !isWallCell(x, y + 1);
    const openLeft = !isWallCell(x - 1, y);
    const openRight = !isWallCell(x + 1, y);
    const hasOpenEdge = openUp || openDown || openLeft || openRight;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = renderTheme.wallTop;
    ctx.fillRect(px, py, TILE, TILE);

    drawMazeWorldTextureRect(sheet, "wallTexture", px, py, TILE, TILE, {
      alpha: hasOpenEdge ? renderTheme.wallTextureAlpha : renderTheme.wallTextureAlpha * 0.5,
      blend: renderTheme.motif === "lava" ? "screen" : "overlay",
      patternScale: 0.72,
      offsetX: x * 9,
      offsetY: y * 7
    });

    if (openDown) {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.74;
      ctx.fillStyle = renderTheme.wallSide;
      ctx.fillRect(px, py + TILE - renderTheme.sideDepth, TILE, renderTheme.sideDepth + 1);
      drawMazeWorldTextureRect(sheet, "wallFaceTexture", px, py + TILE - renderTheme.sideDepth, TILE, renderTheme.sideDepth + 1, {
        alpha: renderTheme.wallFaceTextureAlpha,
        blend: "multiply",
        patternScale: 0.8,
        offsetX: x * 5,
        offsetY: y * 11
      });
    }

    if (openRight) {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = renderTheme.wallSide;
      ctx.fillRect(px + TILE - 4, py + 2, 4, TILE - (openDown ? renderTheme.sideDepth : 3));
    }

    if (openLeft || openUp) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = renderTheme.wallTopLight;
      if (openLeft) {
        ctx.fillRect(px + 1, py + 2, 2.5, TILE - 4);
      }
      if (openUp) {
        ctx.fillRect(px + 2, py + 1, TILE - 4, 2.5);
      }
    }

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = openUp ? 0.46 : 0.025;
    const shine = ctx.createLinearGradient(px, py, px, py + TILE * 0.5);
    shine.addColorStop(0, renderTheme.wallTopLight);
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = shine;
    ctx.fillRect(px + 1, py + 1, TILE - 2, TILE * 0.42);

    drawMazeWallMaterialMotif(level, renderTheme, x, y, hasOpenEdge);
    ctx.restore();
  }

  function drawMazeWallMaterialMotif(level, renderTheme, x, y, hasOpenEdge) {
    if (!hasOpenEdge) {
      return;
    }
    const px = x * TILE;
    const py = y * TILE;
    const seed = (x * 41 + y * 23 + state.levelIndex * 17) % 17;
    if (seed > 4) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = renderTheme.crack;
    ctx.fillStyle = renderTheme.crack;
    ctx.lineWidth = renderTheme.motif === "lava" ? 1.25 : 0.85;
    ctx.lineCap = "round";
    ctx.globalAlpha = renderTheme.motif === "ice" ? 0.42 : 0.32;

    if (renderTheme.motif === "ice") {
      ctx.beginPath();
      ctx.moveTo(px + 5, py + 7);
      ctx.lineTo(px + 14, py + 12);
      ctx.lineTo(px + 10, py + 19);
      ctx.moveTo(px + 14, py + 12);
      ctx.lineTo(px + 21, py + 10);
      ctx.stroke();
    } else if (renderTheme.motif === "lava") {
      ctx.shadowColor = renderTheme.crack;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 8);
      ctx.lineTo(px + 12, py + 13);
      ctx.lineTo(px + 8, py + 20);
      ctx.stroke();
    } else if (renderTheme.motif === "ancient") {
      ctx.globalAlpha = 0.24;
      ctx.strokeRect(px + 6, py + 6, TILE - 12, TILE - 13);
      ctx.beginPath();
      ctx.moveTo(px + 9, py + 15);
      ctx.lineTo(px + 15, py + 9);
      ctx.lineTo(px + 19, py + 15);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.34;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 9);
      ctx.lineTo(px + 13, py + 4);
      ctx.lineTo(px + 21, py + 13);
      ctx.lineTo(px + 12, py + 20);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMazeEdgeBevelLayer(level, renderTheme) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = renderTheme.wallRim;
    ctx.lineCap = "round";
    ctx.lineWidth = isPhonePortraitView() ? 1.35 : 1.65;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }
        drawMazeWallEdgeBevel(x, y, renderTheme);
      }
    }
    ctx.restore();
  }

  function drawMazeWallEdgeBevel(x, y, renderTheme) {
    const px = x * TILE;
    const py = y * TILE;
    const inset = 1.1;
    const openUp = !isWallCell(x, y - 1);
    const openDown = !isWallCell(x, y + 1);
    const openLeft = !isWallCell(x - 1, y);
    const openRight = !isWallCell(x + 1, y);

    ctx.globalAlpha = openUp ? 0.7 : 0.46;
    ctx.beginPath();
    if (openUp) {
      ctx.moveTo(px + inset, py + inset);
      ctx.lineTo(px + TILE - inset, py + inset);
    }
    if (openLeft) {
      ctx.moveTo(px + inset, py + inset);
      ctx.lineTo(px + inset, py + TILE - inset);
    }
    if (openRight) {
      ctx.moveTo(px + TILE - inset, py + inset);
      ctx.lineTo(px + TILE - inset, py + TILE - inset);
    }
    if (openDown) {
      ctx.moveTo(px + inset, py + TILE - inset);
      ctx.lineTo(px + TILE - inset, py + TILE - inset);
    }
    ctx.stroke();

    if (openDown) {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = renderTheme.wallShadow;
      ctx.fillRect(px + 1, py + TILE - 2.5, TILE - 2, 3.5);
      ctx.globalCompositeOperation = "screen";
    }
  }

  function drawMazeWorldDecorationLayer(level, renderTheme) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let y = 2; y < ROWS - 2; y += 1) {
      for (let x = 2; x < COLS - 2; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }
        const seed = (x * 67 + y * 37 + state.levelIndex * 11) % 53;
        const density = renderTheme.motif === "ice" ? 5 : 2;
        if (seed > density || (!isWallCell(x, y + 1) && !isWallCell(x, y - 1))) {
          continue;
        }
        drawMazeWorldSmallDecoration(level, renderTheme, x, y, seed);
      }
    }
    ctx.restore();
  }

  function drawMazeWorldSmallDecoration(level, renderTheme, x, y, seed) {
    const px = x * TILE + TILE * (0.35 + deterministic01(x, y, seed) * 0.3);
    const py = y * TILE + TILE * (0.28 + deterministic01(x, y, seed + 2) * 0.25);
    ctx.save();
    ctx.globalAlpha = isPhonePortraitView() ? 0.18 : 0.24;
    ctx.strokeStyle = renderTheme.decor;
    ctx.fillStyle = renderTheme.decor;
    ctx.lineWidth = 1;
    if (renderTheme.motif === "ice") {
      ctx.globalAlpha = isPhonePortraitView() ? 0.2 : 0.28;
      ctx.beginPath();
      ctx.moveTo(px, py - 5);
      ctx.lineTo(px + 4, py + 5);
      ctx.lineTo(px - 4, py + 5);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha *= 0.72;
      ctx.beginPath();
      ctx.moveTo(px - 5, py + 4);
      ctx.lineTo(px + 5, py - 4);
      ctx.stroke();
    } else if (renderTheme.motif === "lava") {
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (renderTheme.motif === "ancient") {
      ctx.strokeRect(px - 3, py - 4, 6, 8);
    } else {
      drawDiamond(px, py, 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMazeAmbientEffectLayer(level, renderTheme) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.48, HEIGHT * 0.1, WIDTH * 0.5, HEIGHT * 0.5, HEIGHT * 0.78);
    glow.addColorStop(0, renderTheme.ambient);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.globalAlpha = isPhonePortraitView() ? 0.55 : 0.7;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalAlpha = isPhonePortraitView() ? 0.14 : 0.2;
    ctx.fillStyle = renderTheme.dust;
    const count = isPhonePortraitView() ? 34 : 56;
    for (let index = 0; index < count; index += 1) {
      const x = (index * 137 + state.levelIndex * 31) % WIDTH;
      const drift = Math.sin(state.clock * 0.45 + index) * 5;
      const y = (index * 83 + state.clock * (level.decor === "embers" ? -10 : 5)) % HEIGHT;
      const size = 0.8 + (index % 5) * 0.28;
      ctx.beginPath();
      ctx.arc(x + drift, y < 0 ? y + HEIGHT : y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawReferenceTileFloor(sheet, level) {
    const material = getMazeMaterial(level);
    ctx.save();
    const base = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    base.addColorStop(0, material.floorStops[0]);
    base.addColorStop(0.52, material.floorStops[1]);
    base.addColorStop(1, material.floorStops[2]);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        const floorGradient = ctx.createLinearGradient(px, py, px + TILE, py + TILE);
        floorGradient.addColorStop(0, material.floorStops[0]);
        floorGradient.addColorStop(0.72, material.floorStops[0]);
        floorGradient.addColorStop(1, material.floorStops[1]);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.86;
        ctx.fillStyle = floorGradient;
        ctx.fillRect(px, py, TILE, TILE);

        drawMazeWorldTextureRect(sheet, "floorTexture", px, py, TILE, TILE, {
          alpha: 0.1,
          blend: "overlay",
          patternScale: 0.82,
          offsetX: x * 11,
          offsetY: y * 7
        });
      }
    }

    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.075;
    ctx.strokeStyle = "rgba(1, 8, 15, 0.82)";
    ctx.lineWidth = 1;
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        if (!isWallCell(x + 1, y)) {
          ctx.beginPath();
          ctx.moveTo(px + TILE - 0.5, py + 4);
          ctx.lineTo(px + TILE - 0.5, py + TILE - 4);
          ctx.stroke();
        }
        if (!isWallCell(x, y + 1)) {
          ctx.beginPath();
          ctx.moveTo(px + 4, py + TILE - 0.5);
          ctx.lineTo(px + TILE - 4, py + TILE - 0.5);
          ctx.stroke();
        }
      }
    }

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = isPhonePortraitView() ? 0.07 : 0.12;
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1 || ((x * 13 + y * 17 + state.levelIndex * 19) % 11) !== 0) {
          continue;
        }
        const size = 10 + deterministic01(x, y, state.levelIndex) * 8;
        drawMazeWorldTextureRect(sheet, "floorAccentTexture", x * TILE + 4, y * TILE + 4, size, size, {
          alpha: 0.2,
          patternScale: 0.5,
          offsetX: x * 9,
          offsetY: y * 9
        });
      }
    }

    ctx.restore();
  }

  function drawReferenceTileWalls(sheet, level) {
    const material = getMazeMaterial(level);

    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = material.shadow || "rgba(0, 0, 0, 0.38)";
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }
        ctx.fillRect(x * TILE + 3, y * TILE + 5, TILE, TILE);
      }
    }

    ctx.globalAlpha = 1;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }
        drawReferenceTileWallCell(sheet, level, x, y);
      }
    }

    ctx.restore();
  }

  function drawReferenceTileWallCell(sheet, level, x, y) {
    const material = getMazeMaterial(level);
    const px = x * TILE;
    const py = y * TILE;
    const seed = x * 41 + y * 23 + state.levelIndex * 29;
    const openUp = !isWallCell(x, y - 1);
    const openDown = !isWallCell(x, y + 1);
    const openLeft = !isWallCell(x - 1, y);
    const openRight = !isWallCell(x + 1, y);
    const hasOpenEdge = openUp || openDown || openLeft || openRight;
    const sideDepth = openDown ? 7.5 : 4.5;

    ctx.save();

    if (openDown || openRight) {
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = material.shadow || "rgba(0, 0, 0, 0.42)";
      ctx.fillRect(px + (openRight ? 3 : 1), py + (openDown ? 5 : 2), TILE, TILE);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = material.wallStops[1] || material.accent || "#68e7ff";
    if (level.enemyVisualStyle === "lava") {
      ctx.fillStyle = "#8a3b25";
    } else if (level.enemyVisualStyle === "ancient") {
      ctx.fillStyle = "#b99a5e";
    } else if (level.enemyVisualStyle === "diamond") {
      ctx.fillStyle = "#72caee";
    }
    ctx.fillRect(px, py, TILE, TILE);

    drawMazeWorldTextureRect(sheet, "wallTexture", px, py, TILE, TILE, {
      alpha: hasOpenEdge ? 0.18 : 0.08,
      blend: level.enemyVisualStyle === "lava" ? "screen" : "overlay",
      patternScale: 0.88,
      offsetX: x * 7,
      offsetY: y * 5
    });

    if (hasOpenEdge) {
      const rim = ctx.createLinearGradient(px, py, px, py + TILE);
      rim.addColorStop(0, material.wallStops[2] || material.wallCap);
      rim.addColorStop(0.48, "rgba(255, 255, 255, 0)");
      rim.addColorStop(1, material.wallStops[0] || material.wallSide);
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = rim;
      ctx.fillRect(px, py, TILE, TILE);
    }

    if (openDown) {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.48;
      ctx.fillStyle = material.wallSide || "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(px, py + TILE - sideDepth, TILE, sideDepth);
      drawMazeWorldTextureRect(sheet, "wallFaceTexture", px, py + TILE - sideDepth, TILE, sideDepth, {
        alpha: 0.2,
        blend: "multiply",
        patternScale: 0.85,
        offsetX: x * 3,
        offsetY: y * 13
      });
    }

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = openUp ? 0.46 : 0.045;
    const cap = ctx.createLinearGradient(px, py, px, py + TILE * 0.42);
    cap.addColorStop(0, material.wallCap || "rgba(255, 255, 255, 0.5)");
    cap.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = cap;
    ctx.fillRect(px + 1, py + 1, TILE - 2, TILE * 0.42);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = isPhonePortraitView() ? 0.58 : 0.68;
    ctx.strokeStyle = material.wallStroke || "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = openUp || openLeft || openRight || openDown ? 1.55 : 0.7;
    ctx.beginPath();
    if (openUp) {
      ctx.moveTo(px + 1, py + 1.2);
      ctx.lineTo(px + TILE - 1, py + 1.2);
    }
    if (openLeft) {
      ctx.moveTo(px + 1.2, py + 1);
      ctx.lineTo(px + 1.2, py + TILE - 1);
    }
    if (openRight) {
      ctx.moveTo(px + TILE - 1.2, py + 1);
      ctx.lineTo(px + TILE - 1.2, py + TILE - 1);
    }
    if (openDown) {
      ctx.moveTo(px + 1, py + TILE - 1.2);
      ctx.lineTo(px + TILE - 1, py + TILE - 1.2);
    }
    ctx.stroke();

    ctx.globalAlpha = level.enemyVisualStyle === "lava"
      ? (hasOpenEdge ? 0.32 : 0.16)
      : hasOpenEdge
      ? (isPhonePortraitView() ? 0.12 : 0.18)
      : 0.04;
    ctx.strokeStyle = material.seam || material.accent;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    if (level.enemyVisualStyle === "lava") {
      ctx.moveTo(px + 5, py + 7);
      ctx.lineTo(px + 10 + deterministic01(x, y, 1) * 7, py + 12);
      ctx.lineTo(px + 7, py + 19);
    } else if (level.enemyVisualStyle === "ancient") {
      ctx.strokeRect(px + 6, py + 6, TILE - 12, TILE - 13);
    } else if (level.enemyVisualStyle === "diamond") {
      ctx.moveTo(px + 4, py + 8);
      ctx.lineTo(px + 15, py + 4);
      ctx.lineTo(px + TILE - 5, py + 15);
    } else {
      ctx.moveTo(px + 6, py + 7);
      ctx.lineTo(px + 17, py + 12);
      ctx.moveTo(px + 12, py + 5);
      ctx.lineTo(px + 15, py + 18);
    }
    ctx.stroke();

    if (seed % 13 === 0) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = material.decoration || material.accent;
      if (level.enemyVisualStyle === "lava") {
        ctx.beginPath();
        ctx.arc(px + 8 + deterministic01(x, y, 4) * 8, py + 9, 2.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawDiamond(px + 8 + deterministic01(x, y, 4) * 8, py + 9, 3);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawReferenceTileDecor(sheet, level, layer) {
    const sprites = layer === "behind" ? sheet.definition.decorSprites : sheet.definition.obstacleSprites;
    if (!sprites?.length) {
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (let y = 2; y < ROWS - 2; y += 1) {
      for (let x = 2; x < COLS - 2; x += 1) {
        const seed = x * 97 + y * 53 + state.levelIndex * 31 + (layer === "behind" ? 0 : 11);
        if (state.maze[y][x] === 1 || seed % (layer === "behind" ? 61 : 73) !== 0) {
          continue;
        }
        const nearWall = isWallCell(x - 1, y) || isWallCell(x + 1, y) || isWallCell(x, y - 1) || isWallCell(x, y + 1);
        const awayFromPlayer = distanceCells({ x, y }, PLAYER_START) > 5;
        const awayFromCenter = distanceCells({ x, y }, CENTER_CELL) > 4;
        if (!nearWall || !awayFromPlayer || !awayFromCenter) {
          continue;
        }
        const sprite = sprites[seed % sprites.length];
        const image = getTransparentMazeWorldSprite(sheet, sprite);
        if (!image) {
          continue;
        }
        const scale = layer === "behind" ? 0.34 : 0.42;
        const drawW = sprite.w * scale;
        const drawH = sprite.h * scale;
        const drawX = x * TILE + TILE / 2 - drawW / 2 + (deterministic01(x, y, 2) - 0.5) * 8;
        const drawY = y * TILE + TILE / 2 - drawH * 0.72;
        ctx.globalAlpha = layer === "behind" ? 0.46 : 0.68;
        ctx.globalCompositeOperation = layer === "behind" ? "screen" : "source-over";
        ctx.drawImage(image, drawX, drawY, drawW, drawH);
      }
    }
    if (layer === "front") {
      drawReferenceFixedSetPieces(sheet, level);
    }
    ctx.restore();
  }

  function drawReferenceFixedSetPieces(sheet, level) {
    const sprites = sheet.definition.obstacleSprites?.length
      ? sheet.definition.obstacleSprites
      : sheet.definition.decorSprites;
    if (!sprites?.length) {
      return;
    }

    const placements = [
      { sprite: 0, x: 3.2, y: 25.8, scale: 0.76, alpha: 0.72 },
      { sprite: 1, x: 35.4, y: 25.3, scale: 0.78, alpha: 0.66 },
      { sprite: 2, x: 4.5, y: 6.2, scale: 0.56, alpha: 0.46 },
      { sprite: 3, x: 35.0, y: 6.8, scale: 0.6, alpha: 0.48 },
      { sprite: 4, x: 6.6, y: 15.5, scale: 0.46, alpha: 0.38 },
      { sprite: 5, x: 33.0, y: 16.2, scale: 0.5, alpha: 0.4 },
      { sprite: 1, x: 18.1, y: 4.0, scale: 0.48, alpha: 0.34 },
      { sprite: 0, x: 22.3, y: 23.2, scale: 0.42, alpha: 0.34 }
    ];

    for (const placement of placements) {
      const sprite = sprites[placement.sprite % sprites.length];
      const image = getTransparentMazeWorldSprite(sheet, sprite);
      if (!image) {
        continue;
      }

      const drawW = sprite.w * placement.scale;
      const drawH = sprite.h * placement.scale;
      const x = placement.x * TILE - drawW / 2;
      const y = placement.y * TILE - drawH;

      ctx.save();
      ctx.globalCompositeOperation = level.enemyVisualStyle === "lava" ? "screen" : "source-over";
      ctx.globalAlpha = placement.alpha;
      ctx.shadowColor = getMazeMaterial(level).accent || level.accent || "#ffffff";
      ctx.shadowBlur = level.enemyVisualStyle === "ancient" ? 4 : 10;
      ctx.drawImage(image, x, y, drawW, drawH);
      ctx.restore();
    }
  }

  function drawReferenceTileLighting(sheet, level) {
    const material = getMazeMaterial(level);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.12;
    ctx.globalCompositeOperation = "screen";
    const levelGlow = ctx.createRadialGradient(WIDTH * 0.52, HEIGHT * 0.52, HEIGHT * 0.08, WIDTH * 0.52, HEIGHT * 0.52, HEIGHT * 0.72);
    levelGlow.addColorStop(0, material.accent || level.accent || "#ffffff");
    levelGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = levelGlow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = isPhonePortraitView() ? 0.12 : 0.08;
    ctx.fillStyle = "#06101b";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  function deterministic01(x, y, salt = 0) {
    const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
    return value - Math.floor(value);
  }

  function addGradientStops(gradient, stops) {
    const safeStops = stops && stops.length ? stops : ["#06101c", "#12263a", "#040811"];
    if (safeStops.length === 1) {
      gradient.addColorStop(0, safeStops[0]);
      gradient.addColorStop(1, safeStops[0]);
      return gradient;
    }
    safeStops.forEach((color, index) => {
      gradient.addColorStop(index / (safeStops.length - 1), color);
    });
    return gradient;
  }

  function drawBackdrop() {
    const level = getCurrentLevel();
    const phonePortrait = isPhonePortraitView();
    const material = getMazeMaterial(level);
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    const stops = level.backgroundStops || ["#02050c", "#061020", "#02040a"];
    gradient.addColorStop(0, stops[0]);
    gradient.addColorStop(0.55, stops[1]);
    gradient.addColorStop(1, stops[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.globalAlpha = phonePortrait ? 0.016 : 0.085;
    ctx.strokeStyle = level.gridColor || "rgba(104, 231, 255, 0.08)";
    ctx.lineWidth = 1;
    const gridStep = phonePortrait ? TILE * 6 : TILE * 2;
    for (let x = 0; x <= WIDTH; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();

    drawMazeWorldBackdropDetails(level, material, phonePortrait);

    ctx.save();
    const focus = ctx.createRadialGradient(
      WIDTH * 0.5,
      HEIGHT * 0.48,
      HEIGHT * 0.16,
      WIDTH * 0.5,
      HEIGHT * 0.5,
      HEIGHT * 0.82
    );
    focus.addColorStop(0, "rgba(255, 255, 255, 0.04)");
    focus.addColorStop(0.45, "rgba(0, 0, 0, 0)");
    focus.addColorStop(1, "rgba(0, 0, 0, 0.42)");
    ctx.fillStyle = focus;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();

    const decorationStep = phonePortrait ? 2 : (MOBILE_RUNTIME.reducedEffects ? 2 : 1);
    for (let index = 0; index < state.backdropStars.length; index += decorationStep) {
      drawLevelDecoration(state.backdropStars[index], level);
    }
  }

  function drawMazeWorldBackdropDetails(level, material, phonePortrait) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const horizon = ctx.createLinearGradient(0, HEIGHT * 0.18, 0, HEIGHT * 0.92);
    horizon.addColorStop(0, "rgba(255, 255, 255, 0)");
    horizon.addColorStop(0.48, `${material.floorLine.replace(/[\d.]+\)$/u, "0.09)")}`);
    horizon.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = horizon;
    ctx.globalAlpha = phonePortrait ? 0.42 : 0.56;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const edgeAlpha = phonePortrait ? 0.1 : 0.16;
    ctx.globalAlpha = edgeAlpha;
    for (let i = 0; i < 7; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = side < 0 ? 10 + i * 9 : WIDTH - 22 - i * 7;
      const baseY = HEIGHT * (0.28 + deterministic01(i, state.levelIndex, 4) * 0.56);
      drawWorldOutcrop(baseX, baseY, level, material, side, phonePortrait);
    }

    ctx.restore();
  }

  function drawWorldOutcrop(x, y, level, material, side, phonePortrait) {
    const scale = phonePortrait ? 0.78 : 1;
    const height = (34 + deterministic01(x, y, 2) * 44) * scale;
    const width = (16 + deterministic01(x, y, 5) * 18) * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(side, 1);
    ctx.fillStyle = material.wallStops[0];
    ctx.strokeStyle = material.wallStroke;
    ctx.lineWidth = 1;

    if (level.enemyVisualStyle === "ice" || level.enemyVisualStyle === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, height * 0.45);
      ctx.lineTo(width * 0.48, -height * 0.5);
      ctx.lineTo(width, height * 0.42);
      ctx.lineTo(width * 0.55, height * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha *= 0.64;
      ctx.fillStyle = level.enemyVisualStyle === "diamond" ? material.accent2 : material.wallCap;
      ctx.beginPath();
      ctx.moveTo(width * 0.5, -height * 0.44);
      ctx.lineTo(width * 0.68, height * 0.34);
      ctx.lineTo(width * 0.36, height * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (level.enemyVisualStyle === "lava") {
      roundedRect(0, -height * 0.36, width, height, 4);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha *= 0.7;
      ctx.strokeStyle = material.accent2;
      ctx.beginPath();
      ctx.moveTo(width * 0.24, -height * 0.24);
      ctx.lineTo(width * 0.62, height * 0.12);
      ctx.lineTo(width * 0.42, height * 0.5);
      ctx.stroke();
    } else {
      roundedRect(0, -height * 0.28, width * 1.15, height * 0.9, 3);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha *= 0.55;
      ctx.strokeStyle = material.accent;
      ctx.strokeRect(width * 0.24, -height * 0.04, width * 0.45, height * 0.22);
    }

    ctx.restore();
  }

  function drawLevelDecoration(item, level) {
    const phonePortrait = isPhonePortraitView();
    const alpha = phonePortrait
      ? 0.085 + Math.sin(state.clock * 1.35 + item.phase) * 0.035
      : 0.12 + Math.sin(state.clock * 1.8 + item.phase) * 0.07;
    const rgb = level.decorRgb || "255, 255, 255";

    ctx.save();
    ctx.globalAlpha = clamp(alpha, phonePortrait ? 0.035 : 0.05, phonePortrait ? 0.17 : 0.24);
    ctx.strokeStyle = `rgba(${rgb}, 0.9)`;
    ctx.fillStyle = `rgba(${rgb}, 0.9)`;

    if (level.decor === "snow") {
      const radius = item.size * 3.2;
      const fallY = (item.y + state.clock * (10 + item.size * 7)) % HEIGHT;
      const driftX = item.x + Math.sin(state.clock * 0.8 + item.phase) * (phonePortrait ? 5 : 9);
      ctx.translate(driftX, fallY);
      ctx.rotate(item.phase + state.clock * 0.16);
      ctx.lineWidth = phonePortrait ? 1.25 : 1.05;
      for (let i = 0; i < 3; i += 1) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(-radius, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();
      }
    } else if (level.decor === "embers") {
      const y = (item.y - state.clock * 18 * (0.4 + item.size)) % HEIGHT;
      ctx.beginPath();
      ctx.arc(item.x + Math.sin(state.clock + item.phase) * 8, y < 0 ? y + HEIGHT : y, item.size * 1.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (level.decor === "runes") {
      ctx.lineWidth = 1.4;
      ctx.strokeRect(item.x - item.size * 3, item.y - item.size * 3, item.size * 6, item.size * 6);
      ctx.beginPath();
      ctx.moveTo(item.x - item.size * 4, item.y + item.size * 3);
      ctx.lineTo(item.x + item.size * 4, item.y - item.size * 3);
      ctx.stroke();
    } else if (level.decor === "diamonds") {
      drawDiamond(item.x, item.y, item.size * 4.5);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCorridorBase() {
    const level = getCurrentLevel();
    const phonePortrait = isPhonePortraitView();
    const material = getMazeMaterial(level);
    const inset = 0.5;
    const baseAlpha = phonePortrait ? 0.94 : 0.9;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        const seed = x * 17 + y * 29 + state.levelIndex * 41;

        ctx.globalAlpha = baseAlpha;
        if (phonePortrait) {
          ctx.fillStyle = seed % 3 === 0 ? material.floorStops[1] : material.floorStops[0];
        } else {
          const cellGradient = ctx.createLinearGradient(px, py, px + TILE, py + TILE);
          ctx.fillStyle = addGradientStops(cellGradient, material.floorStops);
        }
        roundedRect(px + inset, py + inset, TILE - inset * 2, TILE - inset * 2, 3);
        ctx.fill();

        ctx.fillStyle = material.floorBridge;
        if (!isWallCell(x + 1, y)) {
          ctx.fillRect(px + TILE * 0.5, py + inset, TILE * 0.5 + inset + 1, TILE - inset * 2);
        }
        if (!isWallCell(x, y + 1)) {
          ctx.fillRect(px + inset, py + TILE * 0.5, TILE - inset * 2, TILE * 0.5 + inset + 1);
        }
      }
    }

    ctx.globalAlpha = phonePortrait ? 0.2 : 0.28;
    ctx.strokeStyle = material.floorLine;
    ctx.lineWidth = 1;

    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        if ((x + y + state.levelIndex) % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 5);
          ctx.lineTo(px + TILE - 5, py + 5);
          ctx.stroke();
        }
        if ((x * 3 + y + state.levelIndex) % 4 === 0) {
          ctx.beginPath();
          ctx.moveTo(px + 5, py + TILE - 5);
          ctx.lineTo(px + TILE - 5, py + TILE - 5);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  function drawArenaVignette() {
    const phonePortrait = isPhonePortraitView();
    ctx.save();
    const vignette = ctx.createRadialGradient(
      WIDTH * 0.5,
      HEIGHT * 0.52,
      HEIGHT * 0.2,
      WIDTH * 0.5,
      HEIGHT * 0.52,
      HEIGHT * 0.88
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.62, "rgba(0, 0, 0, 0.02)");
    vignette.addColorStop(1, phonePortrait ? "rgba(0, 0, 0, 0.38)" : "rgba(0, 0, 0, 0.3)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalCompositeOperation = "screen";
    const topLight = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.42);
    topLight.addColorStop(0, "rgba(255, 255, 255, 0.045)");
    topLight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = topLight;
    ctx.fillRect(0, 0, WIDTH, HEIGHT * 0.42);
    ctx.restore();
  }

  function drawMazeFloor() {
    const level = getCurrentLevel();
    const phonePortrait = isPhonePortraitView();
    const material = getMazeMaterial(level);
    const tileInset = phonePortrait ? 6 : 5;
    const tileAlpha = phonePortrait ? 0.026 : 0.05;
    const lineAlpha = phonePortrait ? 0.055 : 0.095;
    const nodeAlpha = phonePortrait ? 0.08 : 0.12;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        const centerX = px + TILE / 2;
        const centerY = py + TILE / 2;

        ctx.globalAlpha = tileAlpha;
        ctx.fillStyle = material.floorTile;
        roundedRect(px + tileInset, py + tileInset, TILE - tileInset * 2, TILE - tileInset * 2, phonePortrait ? 7 : 6);
        ctx.fill();

        ctx.globalAlpha = lineAlpha;
        ctx.strokeStyle = material.floorLine;
        ctx.lineWidth = phonePortrait ? 2.2 : 1.7;

        if (!isWallCell(x + 1, y)) {
          ctx.beginPath();
          ctx.moveTo(centerX + TILE * 0.16, centerY);
          ctx.lineTo(centerX + TILE * 0.84, centerY);
          ctx.stroke();
        }

        if (!isWallCell(x, y + 1)) {
          ctx.beginPath();
          ctx.moveTo(centerX, centerY + TILE * 0.16);
          ctx.lineTo(centerX, centerY + TILE * 0.84);
          ctx.stroke();
        }

        const openCount = [
          !isWallCell(x - 1, y),
          !isWallCell(x + 1, y),
          !isWallCell(x, y - 1),
          !isWallCell(x, y + 1)
        ].filter(Boolean).length;

        if (openCount >= 3 || ((x * 13 + y * 7 + state.levelIndex) % 17) === 0) {
          ctx.globalAlpha = nodeAlpha;
          ctx.fillStyle = material.floorNode || level.accent || "#68e7ff";
          ctx.beginPath();
          ctx.arc(centerX, centerY, phonePortrait ? 2.2 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }

        drawFloorMaterialMotif(x, y, level, material, phonePortrait);
      }
    }

    drawMazeWorldEmblem(level, material, phonePortrait);
    ctx.restore();
  }

  function drawFloorMaterialMotif(cellX, cellY, level, material, phonePortrait) {
    const seed = cellX * 31 + cellY * 17 + state.levelIndex * 13;
    const centerX = cellX * TILE + TILE / 2;
    const centerY = cellY * TILE + TILE / 2;
    const rareModulo = phonePortrait ? 13 : 9;
    const commonModulo = phonePortrait ? 7 : 5;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (level.enemyVisualStyle === "ice") {
      if (seed % commonModulo !== 0) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = phonePortrait ? 0.2 : 0.28;
      ctx.strokeStyle = material.seam;
      ctx.lineWidth = phonePortrait ? 1.15 : 1.35;
      ctx.beginPath();
      ctx.moveTo(centerX - 6, centerY - 2);
      ctx.lineTo(centerX + 6, centerY + 2);
      ctx.moveTo(centerX - 2, centerY - 6);
      ctx.lineTo(centerX + 2, centerY + 6);
      if (seed % 3 === 0) {
        ctx.moveTo(centerX + 2, centerY - 1);
        ctx.lineTo(centerX + 7, centerY - 5);
      }
      ctx.stroke();
    } else if (level.enemyVisualStyle === "lava") {
      if (seed % commonModulo !== 0) {
        ctx.restore();
        return;
      }
      const flow = Math.sin(state.clock * 1.6 + seed);
      ctx.globalAlpha = phonePortrait ? 0.22 : 0.32;
      ctx.strokeStyle = material.seam;
      ctx.lineWidth = phonePortrait ? 1.35 : 1.65;
      ctx.beginPath();
      ctx.moveTo(centerX - 8, centerY + flow * 2);
      ctx.quadraticCurveTo(centerX - 1, centerY - 5, centerX + 8, centerY + flow * -2);
      ctx.stroke();
      if (seed % rareModulo === 0) {
        ctx.globalAlpha = phonePortrait ? 0.16 : 0.24;
        ctx.fillStyle = material.accent2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (level.enemyVisualStyle === "ancient") {
      if (seed % rareModulo !== 0) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = phonePortrait ? 0.18 : 0.26;
      ctx.strokeStyle = seed % 2 === 0 ? material.accent : material.accent2;
      ctx.lineWidth = phonePortrait ? 1.05 : 1.25;
      ctx.beginPath();
      ctx.moveTo(centerX - 5, centerY + 4);
      ctx.lineTo(centerX, centerY - 5);
      ctx.lineTo(centerX + 5, centerY + 4);
      ctx.moveTo(centerX, centerY - 2);
      ctx.lineTo(centerX, centerY + 5);
      ctx.stroke();
    } else {
      if (seed % commonModulo !== 0) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = phonePortrait ? 0.18 : 0.28;
      ctx.strokeStyle = seed % 2 === 0 ? material.accent : material.accent2;
      ctx.lineWidth = phonePortrait ? 1.05 : 1.25;
      ctx.beginPath();
      ctx.moveTo(centerX - 8, centerY - 5);
      ctx.lineTo(centerX + 5, centerY + 6);
      ctx.moveTo(centerX + 2, centerY - 7);
      ctx.lineTo(centerX + 8, centerY - 1);
      ctx.stroke();
      if (seed % rareModulo === 0) {
        ctx.fillStyle = material.decoration;
        drawDiamond(centerX, centerY, 3.2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawMazeWorldEmblem(level, material, phonePortrait) {
    const center = centerOfCell(CENTER_CELL.x, CENTER_CELL.y);
    const radius = phonePortrait ? 74 : 96;
    const pulse = 0.86 + Math.sin(state.clock * 1.7) * 0.08;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = phonePortrait ? 0.13 : 0.18;
    ctx.strokeStyle = material.portal || level.accent || "#9ef7ff";
    ctx.fillStyle = material.portal || level.accent || "#9ef7ff";
    ctx.lineWidth = phonePortrait ? 2 : 2.5;
    ctx.lineCap = "round";
    ctx.translate(center.x, center.y);

    if (level.enemyVisualStyle === "ice") {
      ctx.rotate(Math.sin(state.clock * 0.35) * 0.025);
      for (let arm = 0; arm < 6; arm += 1) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * arm);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * pulse, 0);
        ctx.stroke();
        for (const offset of [0.42, 0.66, 0.86]) {
          const armX = radius * offset * pulse;
          ctx.beginPath();
          ctx.moveTo(armX, 0);
          ctx.lineTo(armX - radius * 0.15, -radius * 0.11);
          ctx.moveTo(armX, 0);
          ctx.lineTo(armX - radius * 0.15, radius * 0.11);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (level.enemyVisualStyle === "lava") {
      ctx.globalAlpha = phonePortrait ? 0.15 : 0.22;
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.28 + ring * 0.22) * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha *= 0.78;
      for (let vent = 0; vent < 7; vent += 1) {
        const angle = vent * (Math.PI * 2 / 7) + state.clock * 0.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.18, Math.sin(angle) * radius * 0.18);
        ctx.lineTo(Math.cos(angle) * radius * 0.78, Math.sin(angle) * radius * 0.78);
        ctx.stroke();
      }
    } else if (level.enemyVisualStyle === "ancient") {
      ctx.rotate(Math.PI / 4);
      for (let ring = 0; ring < 2; ring += 1) {
        roundedRect(-radius * (0.34 + ring * 0.2), -radius * (0.34 + ring * 0.2), radius * (0.68 + ring * 0.4), radius * (0.68 + ring * 0.4), 4);
        ctx.stroke();
      }
      ctx.rotate(-Math.PI / 4);
      for (let side = 0; side < 4; side += 1) {
        ctx.save();
        ctx.rotate(side * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.82);
        ctx.lineTo(radius * 0.12, -radius * 0.58);
        ctx.lineTo(-radius * 0.12, -radius * 0.58);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.rotate(state.clock * 0.05);
      for (let layer = 0; layer < 3; layer += 1) {
        ctx.beginPath();
        ctx.moveTo(0, -radius * (0.25 + layer * 0.17));
        ctx.lineTo(radius * (0.22 + layer * 0.16), 0);
        ctx.lineTo(0, radius * (0.25 + layer * 0.17));
        ctx.lineTo(-radius * (0.22 + layer * 0.16), 0);
        ctx.closePath();
        ctx.stroke();
      }
      for (let beam = 0; beam < 4; beam += 1) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.72, 0);
        ctx.lineTo(radius * 0.72, 0);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = phonePortrait ? 0.08 : 0.11;
    ctx.lineWidth = phonePortrait ? 5 : 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.45, radius * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawIceArenaSigil(level, phonePortrait) {
    if (level.enemyVisualStyle !== "ice") {
      return;
    }

    const center = centerOfCell(CENTER_CELL.x, CENTER_CELL.y);
    const radius = phonePortrait ? 92 : 116;
    const branch = radius * 0.18;
    const pulse = 0.82 + Math.sin(state.clock * 1.6) * 0.08;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = phonePortrait ? 0.16 : 0.2;
    ctx.strokeStyle = level.accent || "#9ef7ff";
    ctx.lineWidth = phonePortrait ? 2 : 2.6;
    ctx.lineCap = "round";
    ctx.translate(center.x, center.y);
    ctx.rotate(Math.sin(state.clock * 0.35) * 0.025);

    for (let arm = 0; arm < 6; arm += 1) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * arm);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius * pulse, 0);
      ctx.stroke();

      for (const offset of [0.38, 0.62, 0.82]) {
        const armX = radius * offset * pulse;
        ctx.beginPath();
        ctx.moveTo(armX, 0);
        ctx.lineTo(armX - branch, -branch * 0.74);
        ctx.moveTo(armX, 0);
        ctx.lineTo(armX - branch, branch * 0.74);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.globalAlpha = phonePortrait ? 0.08 : 0.11;
    ctx.lineWidth = phonePortrait ? 5 : 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawMazeLaneDepth() {
    const level = getCurrentLevel();
    const phonePortrait = isPhonePortraitView();
    const material = getMazeMaterial(level);

    const centerAlpha = phonePortrait ? 0.018 : 0.04;
    const nodeAlpha = phonePortrait ? 0.035 : 0.06;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = centerAlpha;
    ctx.strokeStyle = material.floorLine;
    ctx.lineWidth = phonePortrait ? 1.15 : 1.45;

    for (let y = 1; y < ROWS - 1; y += 1) {
      let segmentStart = null;
      for (let x = 1; x < COLS; x += 1) {
        const isCorridor = x < COLS - 1
          && state.maze[y][x] !== 1
          && !isWallCell(x - 1, y)
          && !isWallCell(x + 1, y);
        if (isCorridor && segmentStart === null) {
          segmentStart = x;
        }
        if ((!isCorridor || x === COLS - 1) && segmentStart !== null) {
          const segmentEnd = x - 1;
          if (segmentEnd - segmentStart >= 2) {
            const startX = segmentStart * TILE + TILE * 0.28;
            const endX = segmentEnd * TILE + TILE * 0.72;
            const centerY = y * TILE + TILE / 2;
            ctx.beginPath();
            ctx.moveTo(startX, centerY);
            ctx.lineTo(endX, centerY);
            ctx.stroke();
          }
          segmentStart = null;
        }
      }
    }

    for (let x = 1; x < COLS - 1; x += 1) {
      let segmentStart = null;
      for (let y = 1; y < ROWS; y += 1) {
        const isCorridor = y < ROWS - 1
          && state.maze[y][x] !== 1
          && !isWallCell(x, y - 1)
          && !isWallCell(x, y + 1);
        if (isCorridor && segmentStart === null) {
          segmentStart = y;
        }
        if ((!isCorridor || y === ROWS - 1) && segmentStart !== null) {
          const segmentEnd = y - 1;
          if (segmentEnd - segmentStart >= 2) {
            const centerX = x * TILE + TILE / 2;
            const startY = segmentStart * TILE + TILE * 0.28;
            const endY = segmentEnd * TILE + TILE * 0.72;
            ctx.beginPath();
            ctx.moveTo(centerX, startY);
            ctx.lineTo(centerX, endY);
            ctx.stroke();
          }
          segmentStart = null;
        }
      }
    }

    ctx.globalAlpha = nodeAlpha;
    ctx.fillStyle = material.floorNode || level.accent || "#68e7ff";
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.maze[y][x] === 1 || ((x * 5 + y * 3 + state.levelIndex) % 6) !== 0) {
          continue;
        }
        const openLeft = !isWallCell(x - 1, y);
        const openRight = !isWallCell(x + 1, y);
        const openUp = !isWallCell(x, y - 1);
        const openDown = !isWallCell(x, y + 1);
        if ((openLeft || openRight) && (openUp || openDown)) {
          ctx.beginPath();
          ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawMaze() {
    const level = getCurrentLevel();
    const phonePortrait = isPhonePortraitView();
    const material = getMazeMaterial(level);
    ctx.save();

    ctx.save();
    ctx.globalAlpha = phonePortrait ? 0.42 : 0.34;
    ctx.fillStyle = material.shadow || "rgba(0, 0, 0, 0.34)";
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        ctx.fillRect(px + 2, py + 3, TILE, TILE);
      }
    }
    ctx.restore();

    ctx.shadowColor = level.wallGlow || material.accent || "rgba(66, 217, 255, 0.65)";
    ctx.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 3 : (phonePortrait ? 7 : 10);

    const wallGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = addGradientStops(wallGradient, material.wallStops || level.wallStops);
    ctx.globalAlpha = phonePortrait ? 0.88 : 0.95;

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        ctx.fillRect(px - 0.45, py - 0.45, TILE + 0.9, TILE + 0.9);
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = phonePortrait ? 0.32 : 0.24;
    ctx.fillStyle = material.wallSide || "#02101f";
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        roundedRect(px + 4, py + TILE * 0.56, TILE - 8, TILE * 0.34, phonePortrait ? 3 : 4);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = phonePortrait ? 0.16 : 0.24;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] !== 1) {
          continue;
        }

        const px = x * TILE;
        const py = y * TILE;
        if (phonePortrait) {
          ctx.fillStyle = material.wallCap || "rgba(230, 252, 255, 0.16)";
        } else {
          const cap = ctx.createLinearGradient(px, py + 2, px, py + TILE - 2);
          cap.addColorStop(0, material.wallCap || "rgba(255, 255, 255, 0.46)");
          cap.addColorStop(0.4, "rgba(255, 255, 255, 0.08)");
          cap.addColorStop(1, "rgba(0, 0, 0, 0.28)");
          ctx.fillStyle = cap;
        }
        roundedRect(px + 3.8, py + 3.8, TILE - 7.6, TILE - 7.6, phonePortrait ? 3 : 4);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = phonePortrait ? 0.24 : 0.32;
    const topWash = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    topWash.addColorStop(0, material.wallCap || "rgba(255, 255, 255, 0.42)");
    topWash.addColorStop(0.4, "rgba(255, 255, 255, 0.04)");
    topWash.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = topWash;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] === 1 && !isWallCell(x, y - 1)) {
          roundedRect(x * TILE + 3, y * TILE + 2.5, TILE - 6, phonePortrait ? 3 : 4, 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] === 1) {
          drawReferenceWallTile(x, y, level, material, phonePortrait);
        }
      }
    }

    ctx.strokeStyle = material.wallStroke || level.wallStroke || "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = phonePortrait ? 1.9 : (MOBILE_RUNTIME.coarse ? 1.55 : 1.25);
    ctx.lineCap = "round";
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.maze[y][x] === 1) {
          drawWallEdgeHighlights(x, y, level);
          drawWallMotif(x, y, level);
        }
      }
    }

    ctx.restore();
  }

  function drawReferenceWallTile(cellX, cellY, level, material, phonePortrait) {
    const px = cellX * TILE;
    const py = cellY * TILE;
    const seed = cellX * 37 + cellY * 19 + state.levelIndex * 23;
    const chip = deterministic01(cellX, cellY, state.levelIndex);
    const topInset = phonePortrait ? 1.4 : 1.2;
    const sideDepth = phonePortrait ? 5.8 : 6.2;

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.fillStyle = material.wallSide;
    ctx.fillRect(px + 1, py + 3, TILE - 2, TILE - 4);

    const top = ctx.createLinearGradient(px, py, px + TILE, py + TILE);
    top.addColorStop(0, material.wallStops[2] || material.wallCap);
    top.addColorStop(0.45, material.wallStops[1] || material.wallCap);
    top.addColorStop(1, material.wallStops[0] || material.wallSide);
    ctx.fillStyle = top;
    ctx.fillRect(px + topInset, py + topInset, TILE - topInset * 2, TILE - sideDepth);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = phonePortrait ? 0.18 : 0.24;
    ctx.fillStyle = material.wallCap;
    ctx.fillRect(px + topInset + 1, py + topInset + 1, TILE - topInset * 2 - 2, Math.max(3, TILE * 0.22));

    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#06101a";
    ctx.fillRect(px + topInset, py + TILE - sideDepth, TILE - topInset * 2, sideDepth - 1);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = phonePortrait ? 0.26 : 0.34;
    ctx.strokeStyle = material.wallStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 2.5);
    ctx.lineTo(px + TILE - 3, py + 2.5);
    ctx.moveTo(px + 3, py + 3);
    ctx.lineTo(px + 3, py + TILE - sideDepth);
    ctx.stroke();

    ctx.globalAlpha = phonePortrait ? 0.16 : 0.22;
    ctx.strokeStyle = "rgba(4, 17, 27, 0.9)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(px + TILE - 1.5, py + 4);
    ctx.lineTo(px + TILE - 1.5, py + TILE - 2);
    ctx.moveTo(px + 3, py + TILE - 1.5);
    ctx.lineTo(px + TILE - 3, py + TILE - 1.5);
    ctx.stroke();

    if (level.enemyVisualStyle === "diamond") {
      ctx.globalAlpha = phonePortrait ? 0.2 : 0.32;
      ctx.strokeStyle = seed % 2 === 0 ? material.accent : material.accent2;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 7 + chip * 3);
      ctx.lineTo(px + TILE - 5, py + 5);
      ctx.lineTo(px + 13, py + TILE - 7);
      ctx.stroke();
    } else if (level.enemyVisualStyle === "ancient") {
      ctx.globalAlpha = phonePortrait ? 0.16 : 0.26;
      ctx.strokeStyle = seed % 2 === 0 ? material.accent2 : material.accent;
      ctx.strokeRect(px + 6, py + 6, TILE - 12, TILE - sideDepth - 7);
    } else if (level.enemyVisualStyle === "lava") {
      ctx.globalAlpha = phonePortrait ? 0.22 : 0.34;
      ctx.strokeStyle = material.seam;
      ctx.beginPath();
      ctx.moveTo(px + 5, py + 9);
      ctx.lineTo(px + 11 + chip * 5, py + 14);
      ctx.lineTo(px + 8, py + 20);
      if (seed % 4 === 0) {
        ctx.moveTo(px + 16, py + 5);
        ctx.lineTo(px + 20, py + 12);
      }
      ctx.stroke();
    } else {
      ctx.globalAlpha = phonePortrait ? 0.18 : 0.28;
      ctx.strokeStyle = material.seam;
      ctx.beginPath();
      ctx.moveTo(px + 6, py + 7 + chip * 2);
      ctx.lineTo(px + 17, py + 11);
      ctx.moveTo(px + 12, py + 5);
      ctx.lineTo(px + 15, py + 19);
      ctx.stroke();
    }

    if (seed % (phonePortrait ? 17 : 11) === 0) {
      ctx.globalAlpha = phonePortrait ? 0.18 : 0.26;
      ctx.fillStyle = material.decoration;
      if (level.enemyVisualStyle === "lava") {
        ctx.beginPath();
        ctx.arc(px + 10 + chip * 6, py + 10, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawDiamond(px + 10 + chip * 6, py + 10, 3);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawMazeSetPieces() {
    const level = getCurrentLevel();
    const material = getMazeMaterial(level);
    const phonePortrait = isPhonePortraitView();
    const props = [
      { x: 4.2, y: 4.2, scale: 1.15 },
      { x: 35.1, y: 4.7, scale: 1 },
      { x: 5.2, y: 25.2, scale: 0.92 },
      { x: 34.8, y: 25.2, scale: 1.1 },
      { x: 18.5, y: 5.4, scale: 0.72 },
      { x: 25.4, y: 20.4, scale: 0.78 }
    ];

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let index = 0; index < props.length; index += 1) {
      const prop = props[index];
      const x = prop.x * TILE;
      const y = prop.y * TILE;
      drawWorldSetPiece(x, y, prop.scale * (phonePortrait ? 0.82 : 1), level, material, index);
    }
    drawReferencePortal(33.8 * TILE, 7.4 * TILE, level, material, phonePortrait);
    ctx.restore();
  }

  function drawReferencePortal(x, y, level, material, phonePortrait) {
    const scale = phonePortrait ? 0.88 : 1;
    const pulse = 1 + Math.sin(state.clock * 2.4) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = material.portal || material.accent;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.76;
    ctx.strokeStyle = material.wallStroke;
    ctx.lineWidth = 3;

    if (level.enemyVisualStyle === "ancient") {
      ctx.fillStyle = material.wallSide;
      roundedRect(-18, -28, 36, 56, 5);
      ctx.fill();
      ctx.stroke();
    } else if (level.enemyVisualStyle === "lava") {
      ctx.fillStyle = "#1d1512";
      roundedRect(-20, -28, 40, 56, 6);
      ctx.fill();
      ctx.stroke();
    } else if (level.enemyVisualStyle === "diamond") {
      ctx.fillStyle = material.wallSide;
      drawDiamond(0, 0, 34);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = material.wallSide;
      roundedRect(-18, -30, 36, 60, 5);
      ctx.fill();
      ctx.stroke();
    }

    const swirl = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 * pulse);
    swirl.addColorStop(0, "#ffffff");
    swirl.addColorStop(0.45, material.portal || material.accent);
    swirl.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = swirl;
    ctx.beginPath();
    ctx.arc(0, 0, 21 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(0, 0, 15 * pulse, state.clock * 1.5, state.clock * 1.5 + Math.PI * 1.35);
    ctx.stroke();
    ctx.restore();
  }

  function drawWorldSetPiece(x, y, scale, level, material, index) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (level.enemyVisualStyle === "ice") {
      drawIceSetPiece(material, index);
    } else if (level.enemyVisualStyle === "lava") {
      drawLavaSetPiece(material, index);
    } else if (level.enemyVisualStyle === "ancient") {
      drawAncientSetPiece(material, index);
    } else {
      drawDiamondSetPiece(material, index);
    }

    ctx.restore();
  }

  function drawIceSetPiece(material, index) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = material.accent;
    ctx.shadowBlur = 12;
    for (let i = 0; i < 4; i += 1) {
      const offset = (i - 1.5) * 8;
      const height = 20 + deterministic01(index, i, 7) * 20;
      const width = 7 + deterministic01(index, i, 11) * 5;
      ctx.globalAlpha = 0.72 - i * 0.06;
      const crystal = ctx.createLinearGradient(offset - width, -height, offset + width, 8);
      crystal.addColorStop(0, "#ecffff");
      crystal.addColorStop(0.45, material.accent);
      crystal.addColorStop(1, "#1277a5");
      ctx.fillStyle = crystal;
      ctx.strokeStyle = "rgba(241, 255, 255, 0.74)";
      ctx.beginPath();
      ctx.moveTo(offset, -height);
      ctx.lineTo(offset + width, 8);
      ctx.lineTo(offset - width, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#e9ffff";
    ctx.beginPath();
    ctx.ellipse(0, 10, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLavaSetPiece(material, index) {
    ctx.save();
    ctx.fillStyle = "#1d1715";
    ctx.strokeStyle = "rgba(255, 132, 40, 0.55)";
    ctx.lineWidth = 1.2;
    roundedRect(-17, -20, 34, 35, 5);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = material.accent2;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = material.seam;
    for (let i = 0; i < 3; i += 1) {
      const x = -10 + i * 9 + deterministic01(index, i, 3) * 4;
      ctx.beginPath();
      ctx.moveTo(x, -14);
      ctx.lineTo(x + 4, -3);
      ctx.lineTo(x - 2, 11);
      ctx.stroke();
    }
    ctx.fillStyle = material.accent;
    ctx.beginPath();
    ctx.arc(0, 13, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAncientSetPiece(material, index) {
    ctx.save();
    const tilt = (deterministic01(index, 2, 5) - 0.5) * 0.2;
    ctx.rotate(tilt);
    const stone = ctx.createLinearGradient(-14, -22, 14, 18);
    stone.addColorStop(0, material.wallCap);
    stone.addColorStop(0.6, material.wallStops[1]);
    stone.addColorStop(1, material.wallSide);
    ctx.fillStyle = stone;
    ctx.strokeStyle = material.wallStroke;
    roundedRect(-13, -24, 26, 42, 4);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = material.accent;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(0, -17);
    ctx.lineTo(6, -8);
    ctx.moveTo(0, -13);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawDiamondSetPiece(material, index) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = index % 2 === 0 ? material.accent : material.accent2;
    ctx.shadowBlur = 14;
    for (let i = 0; i < 4; i += 1) {
      const offset = (i - 1.5) * 9;
      const height = 18 + deterministic01(index, i, 9) * 18;
      ctx.globalAlpha = 0.72;
      const facet = ctx.createLinearGradient(offset - 8, -height, offset + 8, 12);
      facet.addColorStop(0, "#ffffff");
      facet.addColorStop(0.5, i % 2 === 0 ? material.accent : material.accent2);
      facet.addColorStop(1, "#4930c7");
      ctx.fillStyle = facet;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.68)";
      drawDiamond(offset, -height * 0.25, height * 0.56);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawArenaLandmarks() {
    const level = getCurrentLevel();
    const material = getMazeMaterial(level);
    const landmarks = [
      { cell: PLAYER_START, color: getPlayerTheme().glowColor, radius: 15, pulse: 0.16 },
      { cell: CENTER_CELL, color: level.accent || "#ffd84a", radius: 20, pulse: 0.2 }
    ];

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    drawThemedSpawnPad(centerOfCell(PLAYER_START.x, PLAYER_START.y), material);
    drawThemedCenterPortal(centerOfCell(CENTER_CELL.x, CENTER_CELL.y), level, material);

    for (const landmark of landmarks) {
      const pos = centerOfCell(landmark.cell.x, landmark.cell.y);
      const pulse = 1 + Math.sin(state.clock * 2.2 + landmark.radius) * landmark.pulse;
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = landmark.color;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, landmark.radius * pulse, landmark.radius * 0.42 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = landmark.color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, landmark.radius * 1.15 * pulse, landmark.radius * 0.5 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawThemedSpawnPad(pos, material) {
    const pulse = 1 + Math.sin(state.clock * 2.4) * 0.08;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = getPlayerTheme().glowColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 3, 24 * pulse, 9 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = material.accent;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 3, 18 * pulse, 6 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawThemedCenterPortal(pos, level, material) {
    const pulse = 1 + Math.sin(state.clock * 2.1) * 0.08;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = material.portal || level.accent;
    ctx.fillStyle = material.portal || level.accent;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = material.portal || level.accent;
    ctx.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 4 : 10;

    if (level.enemyVisualStyle === "ancient") {
      roundedRect(-20 * pulse, -24 * pulse, 40 * pulse, 48 * pulse, 5);
      ctx.stroke();
      ctx.globalAlpha *= 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, 11 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    } else if (level.enemyVisualStyle === "lava") {
      ctx.beginPath();
      ctx.arc(0, 0, 19 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.7;
      ctx.beginPath();
      ctx.moveTo(-12 * pulse, 12 * pulse);
      ctx.quadraticCurveTo(0, -18 * pulse, 12 * pulse, 12 * pulse);
      ctx.stroke();
    } else if (level.enemyVisualStyle === "diamond") {
      drawDiamond(0, 0, 24 * pulse);
      ctx.stroke();
      ctx.globalAlpha *= 0.6;
      drawDiamond(0, 0, 12 * pulse);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 18 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawWallEdgeHighlights(cellX, cellY, level) {
    const material = getMazeMaterial(level);
    const px = cellX * TILE;
    const py = cellY * TILE;
    const inset = 3.5;
    const glowInset = MOBILE_RUNTIME.coarse ? 1.5 : 2.5;
    const accentAlpha = MOBILE_RUNTIME.coarse ? 0.24 : 0.3;

    ctx.save();
    ctx.strokeStyle = material.wallStroke || level.wallStroke || "rgba(255, 255, 255, 0.28)";
    if (!isWallCell(cellX, cellY - 1)) {
      ctx.beginPath();
      ctx.moveTo(px + inset, py + glowInset);
      ctx.lineTo(px + TILE - inset, py + glowInset);
      ctx.stroke();
    }
    if (!isWallCell(cellX, cellY + 1)) {
      ctx.beginPath();
      ctx.moveTo(px + inset, py + TILE - glowInset);
      ctx.lineTo(px + TILE - inset, py + TILE - glowInset);
      ctx.stroke();
    }
    if (!isWallCell(cellX - 1, cellY)) {
      ctx.beginPath();
      ctx.moveTo(px + glowInset, py + inset);
      ctx.lineTo(px + glowInset, py + TILE - inset);
      ctx.stroke();
    }
    if (!isWallCell(cellX + 1, cellY)) {
      ctx.beginPath();
      ctx.moveTo(px + TILE - glowInset, py + inset);
      ctx.lineTo(px + TILE - glowInset, py + TILE - inset);
      ctx.stroke();
    }

    ctx.globalAlpha = accentAlpha;
    ctx.strokeStyle = material.seam || level.accent || "#9ef7ff";
    ctx.lineWidth = 0.75;
    if (!isWallCell(cellX, cellY - 1) && !isWallCell(cellX - 1, cellY)) {
      ctx.beginPath();
      ctx.moveTo(px + 6, py + 6);
      ctx.lineTo(px + 12, py + 6);
      ctx.moveTo(px + 6, py + 6);
      ctx.lineTo(px + 6, py + 12);
      ctx.stroke();
    }
    if (!isWallCell(cellX, cellY + 1) && !isWallCell(cellX + 1, cellY)) {
      ctx.beginPath();
      ctx.moveTo(px + TILE - 6, py + TILE - 6);
      ctx.lineTo(px + TILE - 12, py + TILE - 6);
      ctx.moveTo(px + TILE - 6, py + TILE - 6);
      ctx.lineTo(px + TILE - 6, py + TILE - 12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWallMotif(cellX, cellY, level) {
    const material = getMazeMaterial(level);
    const phonePortrait = isPhonePortraitView();
    const motifSeed = cellX * 7 + cellY * 11 + state.levelIndex * 5;
    const x = cellX * TILE + TILE / 2;
    const y = cellY * TILE + TILE / 2;
    const px = cellX * TILE;
    const py = cellY * TILE;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (level.enemyVisualStyle === "ice") {
      if (motifSeed % (phonePortrait ? 5 : 4) !== 0) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = phonePortrait ? 0.28 : 0.38;
      ctx.strokeStyle = material.seam;
      ctx.lineWidth = phonePortrait ? 1.05 : 1.25;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 4);
      ctx.lineTo(x + 6, y + 3);
      ctx.moveTo(x - 2, y - 7);
      ctx.lineTo(x + 2, y + 6);
      ctx.moveTo(x + 2.5, y - 2);
      ctx.lineTo(x + 8, y - 6);
      ctx.stroke();

      if (motifSeed % 17 === 0) {
        ctx.globalAlpha *= 0.8;
        ctx.fillStyle = material.decoration;
        drawDiamond(x + 3, y - 1, 3.2);
        ctx.fill();
      }
    } else if (level.enemyVisualStyle === "lava") {
      if (motifSeed % (phonePortrait ? 4 : 3) !== 0) {
        ctx.restore();
        return;
      }
      const pulse = 0.75 + Math.sin(state.clock * 2.2 + motifSeed) * 0.25;
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = (phonePortrait ? 0.28 : 0.42) * pulse;
      ctx.strokeStyle = material.seam;
      ctx.lineWidth = phonePortrait ? 1.2 : 1.45;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 8);
      ctx.lineTo(px + 10, py + 13);
      ctx.lineTo(px + 7, py + 20);
      ctx.moveTo(px + 13, py + 4);
      ctx.lineTo(px + 19, py + 12);
      ctx.stroke();

      if (motifSeed % 9 === 0) {
        ctx.globalAlpha = phonePortrait ? 0.18 : 0.26;
        ctx.fillStyle = material.accent2;
        ctx.beginPath();
        ctx.arc(x + 3, y + 2, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (level.enemyVisualStyle === "ancient") {
      if (motifSeed % (phonePortrait ? 6 : 4) !== 0) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = phonePortrait ? 0.22 : 0.32;
      ctx.strokeStyle = motifSeed % 3 === 0 ? material.accent : material.accent2;
      ctx.lineWidth = phonePortrait ? 0.95 : 1.15;
      roundedRect(px + 5, py + 5, TILE - 10, TILE - 10, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 5);
      ctx.lineTo(x, y - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x, y - 1);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
    } else {
      if (motifSeed % (phonePortrait ? 5 : 3) !== 0) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = phonePortrait ? 0.24 : 0.36;
      ctx.strokeStyle = motifSeed % 2 === 0 ? material.accent : material.accent2;
      ctx.fillStyle = motifSeed % 2 === 0 ? material.accent : material.accent2;
      ctx.lineWidth = phonePortrait ? 1 : 1.15;
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 5);
      ctx.lineTo(px + TILE - 4, py + 3);
      ctx.lineTo(px + 13, py + TILE - 4);
      ctx.closePath();
      ctx.stroke();
      if (motifSeed % 11 === 0) {
        ctx.globalAlpha *= 0.8;
        drawDiamond(x, y, 4.5);
        ctx.fill();
      }
    }

    if (!phonePortrait && motifSeed % 23 === 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = material.wallCap;
      ctx.lineWidth = 0.8;
      drawDiamond(x, y, 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawArcadeBonusLetterCollectible(collectible, radius) {
    const pulse = 0.88 + Math.sin(state.clock * 4.2 + collectible.phase) * 0.08;
    const size = Math.max(radius * 2.5, isPhonePortraitView() ? 22 : 20) * pulse;
    const x = collectible.x;
    const y = collectible.y;
    const level = getCurrentLevel();

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowColor = "#ffd84a";
    ctx.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 4 : 12;
    const medal = ctx.createRadialGradient(x - size * 0.18, y - size * 0.22, 1, x, y, size * 0.68);
    medal.addColorStop(0, "#fff7c6");
    medal.addColorStop(0.44, "#ffd84a");
    medal.addColorStop(1, level.accent || "#9ef7ff");
    ctx.fillStyle = medal;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#432b05";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.47, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.font = `900 ${Math.round(size * 0.58)}px Assistant, system-ui, sans-serif`;
    ctx.fillText(collectible.letter || "?", x, y + size * 0.015);
    ctx.restore();
  }

  function drawArcadeBonusKeyCollectible(collectible, radius) {
    const x = collectible.x;
    const y = collectible.y + Math.sin(state.clock * 4 + collectible.phase) * 1.1;
    const scale = Math.max(radius / 7.2, isPhonePortraitView() ? 1.04 : 1);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(state.clock * 2.8 + collectible.phase) * 0.12);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowColor = "#ffd84a";
    ctx.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 4 : 11;

    const metal = ctx.createLinearGradient(-11, -8, 13, 8);
    metal.addColorStop(0, "#fff7c6");
    metal.addColorStop(0.44, "#ffd84a");
    metal.addColorStop(1, "#b56b00");
    ctx.strokeStyle = metal;
    ctx.fillStyle = metal;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(-7, -1, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1, -1);
    ctx.lineTo(12, -1);
    ctx.lineTo(12, 5);
    ctx.moveTo(6, -1);
    ctx.lineTo(6, 4);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(-7, -1, 3.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawArcadeBonusChest() {
    if (!state.player) {
      return;
    }

    const chestCell = getArcadeChestCell();
    if (!state.reachable.has(cellKey(chestCell.x, chestCell.y))) {
      return;
    }

    const pos = centerOfCell(chestCell.x, chestCell.y);
    const ready = !state.arcadeBonus.chestOpened && state.arcadeBonus.keysCollected >= CONFIG.arcadeBonus.keysRequired;
    const opened = state.arcadeBonus.chestOpened;
    const openProgress = opened
      ? clamp((state.clock - (state.arcadeBonus.chestOpenedAt || state.clock)) / 0.42, 0, 1)
      : 0;
    const pulse = ready ? 1 + Math.sin(state.clock * 5.6) * 0.05 : 1;
    const chestShouldFaceLeft = chestCell.x >= CENTER_CELL.x;
    const closedSprite = chestShouldFaceLeft ? GAME_ASSETS.arcadeChest.closed : GAME_ASSETS.arcadeChest.closedRight;
    const openSprite = chestShouldFaceLeft ? GAME_ASSETS.arcadeChest.open : GAME_ASSETS.arcadeChest.openRight;
    const spriteReady = isImageReady(closedSprite) && isImageReady(openSprite);

    if (!spriteReady) {
      drawArcadeBonusChestFallback(pos, ready, opened, pulse);
      return;
    }

    const baseSize = TILE * (opened ? 2.55 : 2.38) * pulse;
    const bob = ready
      ? Math.sin(state.clock * 6.2) * 1.3
      : Math.sin(state.clock * 2.2) * 0.55;
    const shine = ready || opened;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + TILE * 0.6, baseSize * 0.32, TILE * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (shine) {
      ctx.globalCompositeOperation = "screen";
      const auraSize = opened ? baseSize * 0.7 : baseSize * 0.58;
      const aura = ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, auraSize);
      aura.addColorStop(0, opened ? "rgba(255, 244, 170, 0.6)" : "rgba(255, 216, 74, 0.4)");
      aura.addColorStop(0.55, "rgba(255, 186, 45, 0.18)");
      aura.addColorStop(1, "rgba(255, 216, 74, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, auraSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = opened ? "rgba(255, 247, 198, 0.62)" : "rgba(255, 216, 74, 0.5)";
      ctx.lineWidth = opened ? 1.5 : 1.2;
      ctx.globalAlpha = 0.5 + Math.sin(state.clock * 5.8) * 0.12;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + TILE * 0.05, baseSize * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      for (let i = 0; i < 5; i += 1) {
        const angle = state.clock * 1.35 + i * 1.34;
        const sparkleRadius = baseSize * (0.32 + (i % 2) * 0.12);
        const sx = pos.x + Math.cos(angle) * sparkleRadius;
        const sy = pos.y - TILE * 0.1 + Math.sin(angle * 1.16) * sparkleRadius * 0.45;
        ctx.fillStyle = i % 2 ? "#fff7c6" : "#9ef7ff";
        ctx.globalAlpha = 0.36 + Math.sin(state.clock * 4.8 + i) * 0.16;
        drawDiamond(sx, sy, opened ? 3.1 : 2.5);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    const drawChestSprite = (image, alpha, scale, lift, rotation) => {
      const size = baseSize * scale;
      ctx.save();
      ctx.translate(pos.x, pos.y + bob + lift);
      ctx.rotate(rotation);
      ctx.globalAlpha = alpha;
      ctx.drawImage(image, -size / 2, -size * 0.62, size, size);
      ctx.restore();
    };

    if (opened && openProgress < 1) {
      drawChestSprite(closedSprite, 1 - openProgress, 1 + openProgress * 0.12, -openProgress * 5, -openProgress * 0.08);
    }
    drawChestSprite(
      opened ? openSprite : closedSprite,
      opened ? Math.max(0.18, openProgress) : 1,
      opened ? 1 + (1 - openProgress) * 0.08 : 1,
      opened ? -2 : 0,
      opened ? (1 - openProgress) * 0.06 : 0
    );
    ctx.restore();
  }

  function drawArcadeBonusChestFallback(pos, ready, opened, pulse) {
    const width = TILE * (opened ? 1.34 : 1.18) * pulse;
    const height = TILE * 0.8 * pulse;
    const x = pos.x - width / 2;
    const y = pos.y - height * 0.46;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowColor = ready || opened ? "#ffd84a" : "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = ready ? 18 : opened ? 12 : 5;

    ctx.globalAlpha = 0.36;
    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    ctx.beginPath();
    ctx.ellipse(pos.x, y + height * 0.92, width * 0.46, height * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (opened) {
      ctx.globalCompositeOperation = "screen";
      const light = ctx.createRadialGradient(pos.x, y + height * 0.2, 1, pos.x, y + height * 0.24, width * 0.8);
      light.addColorStop(0, "rgba(255, 247, 198, 0.72)");
      light.addColorStop(0.45, "rgba(255, 216, 74, 0.28)");
      light.addColorStop(1, "rgba(255, 216, 74, 0)");
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(pos.x, y + height * 0.25, width * 0.74, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    const base = ctx.createLinearGradient(x, y + height * 0.28, x, y + height);
    base.addColorStop(0, "#b45f1d");
    base.addColorStop(0.52, "#6b3514");
    base.addColorStop(1, "#281507");
    ctx.fillStyle = base;
    roundedRect(x, y + height * 0.34, width, height * 0.58, 6);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffd84a";
    roundedRect(x + 1, y + height * 0.34 + 1, width - 2, height * 0.58 - 2, 5);
    ctx.stroke();

    const lidGradient = ctx.createLinearGradient(x, y, x, y + height * 0.44);
    lidGradient.addColorStop(0, "#ffe08a");
    lidGradient.addColorStop(0.45, "#c97724");
    lidGradient.addColorStop(1, "#52250e");
    ctx.fillStyle = lidGradient;
    if (opened) {
      ctx.save();
      ctx.translate(pos.x, y + height * 0.33);
      ctx.rotate(-0.45);
      roundedRect(-width * 0.49, -height * 0.24, width * 0.98, height * 0.28, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      roundedRect(x + 1.4, y + height * 0.13, width - 2.8, height * 0.35, 7);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = ready ? "#fff7c6" : "#ffd84a";
    roundedRect(pos.x - width * 0.13, y + height * 0.49, width * 0.26, height * 0.23, 3.5);
    ctx.fill();
    ctx.strokeStyle = "#2a1807";
    ctx.lineWidth = 1.2;
    roundedRect(pos.x - width * 0.13, y + height * 0.49, width * 0.26, height * 0.23, 3.5);
    ctx.stroke();

    if (!opened) {
      ctx.fillStyle = "#2a1807";
      ctx.beginPath();
      ctx.arc(pos.x, y + height * 0.59, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(pos.x - 0.8, y + height * 0.6, 1.6, 4.2);
    }

    if (ready) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.5 + Math.sin(state.clock * 6) * 0.16;
      ctx.strokeStyle = "#fff7c6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, width * 0.58, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawCollectibles() {
    const level = getCurrentLevel();
    const phonePortrait = isPhonePortraitView();
    const sheet = getMazeWorldSheet(level);
    ctx.save();
    ctx.shadowColor = level.bonusCollectibleColor || "rgba(255, 216, 74, 0.6)";
    ctx.shadowBlur = phonePortrait ? 3 : 8;
    for (const collectible of state.collectibles.values()) {
      const pulse = phonePortrait ? 1 : 1 + Math.sin(state.clock * 5 + collectible.phase) * 0.18;
      const radius = collectible.radius * pulse;
      if (collectible.kind === "bonus-letter") {
        drawArcadeBonusLetterCollectible(collectible, radius);
        continue;
      }
      if (collectible.kind === "bonus-key") {
        drawArcadeBonusKeyCollectible(collectible, radius);
        continue;
      }
      if (collectible.kind === "power") {
        if (sheet) {
          drawReferenceCollectibleSprite(collectible.x, collectible.y, Math.max(15, radius * 3.4), sheet, true, collectible.phase, { reducedMotion: phonePortrait });
        } else {
          drawPowerSnowflakeCollectible(collectible.x, collectible.y, radius, collectible.phase);
        }
        continue;
      }
      if (collectible.kind === "boss-core") {
        drawBossCoreCollectible(collectible.x, collectible.y, radius, collectible.phase);
        continue;
      }
      const gemRadius = collectible.value > 10
        ? Math.max(radius * 1.12, phonePortrait ? 4.6 : 4.4)
        : Math.max(radius * 0.82, phonePortrait ? 3.1 : 3.4);
      ctx.fillStyle = collectible.value > 10 ? level.bonusCollectibleColor : level.collectibleColor;

      if (sheet && collectible.value > 10) {
        drawReferenceCollectibleSprite(
          collectible.x,
          collectible.y,
          gemRadius * (collectible.value > 10 ? 3.25 : 2.55),
          sheet,
          collectible.value > 10,
          collectible.phase,
          { reducedMotion: phonePortrait }
        );
        continue;
      }

      if (collectible.value > 10) {
        ctx.globalAlpha = 0.92;
        drawPlusSymbol(collectible.x, collectible.y, gemRadius + 2, state.clock + collectible.phase);
        ctx.globalAlpha = 0.52;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        drawDiamond(collectible.x, collectible.y, gemRadius + 3);
        ctx.stroke();
      } else {
        ctx.globalAlpha = phonePortrait ? 0.78 : 0.9;
        const gemGradient = ctx.createRadialGradient(
          collectible.x - gemRadius * 0.25,
          collectible.y - gemRadius * 0.35,
          1,
          collectible.x,
          collectible.y,
          gemRadius * 1.5
        );
        gemGradient.addColorStop(0, "#ffffff");
        gemGradient.addColorStop(0.42, level.collectibleColor);
        gemGradient.addColorStop(1, level.accent || level.collectibleColor);
        ctx.fillStyle = gemGradient;
        ctx.beginPath();
        ctx.arc(collectible.x, collectible.y, gemRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = phonePortrait ? 0.28 : 0.38;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = phonePortrait ? 0.7 : 0.9;
        ctx.beginPath();
        ctx.arc(collectible.x, collectible.y, gemRadius * 1.18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    drawArcadeBonusChest();
    ctx.restore();
  }

  function drawEnvironmentHazards() {
    if (!state.hazards.length) {
      return;
    }

    ctx.save();
    for (const hazard of state.hazards) {
      const active = isHazardActive(hazard);
      const telegraphProgress = active ? 1 : clamp(hazard.age / Math.max(0.1, hazard.telegraph), 0, 1);
      const remaining = Math.max(0, hazard.telegraph + hazard.duration - hazard.age);
      const pulse = 0.72 + Math.sin(state.clock * (active ? 7 : 4) + hazard.phase) * 0.18;
      for (let index = 0; index < hazard.cells.length; index += 1) {
        drawHazardCell(hazard, hazard.cells[index], index, {
          active,
          telegraphProgress,
          remaining,
          pulse
        });
      }
    }
    ctx.restore();
  }

  function drawHazardCell(hazard, cell, index, visual) {
    const px = cell.x * TILE;
    const py = cell.y * TILE;
    const inset = visual.active ? 1.6 : 3.2;
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;
    const palette = getHazardVisualPalette(hazard);
    const materialAlpha = visual.active
      ? 1
      : 0.42 + visual.telegraphProgress * 0.42;
    const revealScale = visual.active ? 1.02 : 0.82 + visual.telegraphProgress * 0.18;
    const bob = visual.active && !MOBILE_RUNTIME.reducedEffects
      ? Math.sin(state.clock * 5.4 + index * 0.85 + hazard.phase) * 0.45
      : (1 - visual.telegraphProgress) * 2.4;

    ctx.save();
    drawHazardDangerPlate(px, py, inset, palette, index, visual);

    if (!visual.active) {
      drawHazardTelegraphCue(px, py, inset, palette, visual);
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = materialAlpha;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = visual.active ? 13 : 5;
    ctx.translate(cx, cy + bob);
    ctx.scale(revealScale, revealScale);
    ctx.translate(-cx, -cy);

    if (hazard.type === "lava-spill") {
      drawLavaHazardCell(px, py, inset, hazard, index, visual);
    } else if (hazard.type === "rune-trap") {
      drawRuneHazardCell(px, py, inset, hazard, index, visual);
    } else if (hazard.type === "crystal-burst") {
      drawCrystalHazardCell(cx, cy, hazard, index, visual);
    } else {
      drawIceHazardCell(px, py, inset, hazard, index, visual);
    }

    if (visual.active) {
      ctx.globalAlpha *= 0.86;
      drawHazardElectricArc([
        { x: px + TILE * 0.2, y: py + TILE * 0.34 },
        { x: px + TILE * 0.36, y: py + TILE * 0.22 },
        { x: px + TILE * 0.58, y: py + TILE * 0.32 },
        { x: px + TILE * 0.78, y: py + TILE * 0.22 }
      ], palette.danger || "#ff3d5a", state.clock * 5.8 + index);
      drawHazardElectricArc([
        { x: px + TILE * 0.2, y: py + TILE * 0.78 },
        { x: px + TILE * 0.42, y: py + TILE * 0.9 },
        { x: px + TILE * 0.64, y: py + TILE * 0.76 },
        { x: px + TILE * 0.82, y: py + TILE * 0.86 }
      ], palette.caution || "#ffd84a", state.clock * 4.7 + index * 0.5);
    }
    ctx.restore();

    drawHazardDangerRim(px, py, inset, palette, index, visual);
    ctx.restore();
  }

  function getHazardVisualPalette(hazard) {
    const palettes = {
      "ice-slick": {
        fillA: "rgba(199, 255, 255, 0.52)",
        fillB: "rgba(45, 185, 226, 0.42)",
        fillC: "rgba(11, 55, 88, 0.74)",
        border: "#e8ffff",
        rim: "#9ef7ff",
        highlight: "#ffffff",
        danger: "#ff3d5a",
        caution: "#ffd84a",
        dark: "#0b1324",
        inner: "rgba(158, 247, 255, 0.72)",
        alert: "#dffcff",
        alertDark: "#20354a",
        stripe: "rgba(255, 255, 255, 0.45)",
        stripeDark: "rgba(17, 55, 84, 0.36)",
        glow: "rgba(158, 247, 255, 0.86)"
      },
      "lava-spill": {
        fillA: "rgba(255, 180, 64, 0.5)",
        fillB: "rgba(255, 72, 24, 0.5)",
        fillC: "rgba(84, 6, 3, 0.82)",
        border: "#ffe39a",
        rim: "#ffb340",
        highlight: "#fff0a4",
        danger: "#ff273d",
        caution: "#ffd84a",
        dark: "#180604",
        inner: "rgba(255, 122, 26, 0.78)",
        alert: "#fff3ad",
        alertDark: "#4d1305",
        stripe: "rgba(255, 236, 151, 0.42)",
        stripeDark: "rgba(96, 12, 5, 0.48)",
        glow: "rgba(255, 122, 26, 0.9)"
      },
      "rune-trap": {
        fillA: "rgba(255, 224, 143, 0.42)",
        fillB: "rgba(39, 224, 195, 0.36)",
        fillC: "rgba(34, 27, 17, 0.8)",
        border: "#f4d999",
        rim: "#27e0c3",
        highlight: "#ffe8a3",
        danger: "#ff3d5a",
        caution: "#ffd84a",
        dark: "#161008",
        inner: "rgba(39, 224, 195, 0.7)",
        alert: "#27e0c3",
        alertDark: "#173d39",
        stripe: "rgba(255, 231, 171, 0.36)",
        stripeDark: "rgba(12, 55, 50, 0.44)",
        glow: "rgba(39, 224, 195, 0.82)"
      },
      "crystal-burst": {
        fillA: "rgba(255, 130, 235, 0.4)",
        fillB: "rgba(85, 255, 214, 0.34)",
        fillC: "rgba(18, 19, 72, 0.78)",
        border: "#f8ffff",
        rim: "#55ffd6",
        highlight: "#ffffff",
        danger: "#ff3d5a",
        caution: "#ffd84a",
        dark: "#10143e",
        inner: "rgba(255, 95, 215, 0.72)",
        alert: "#a8fff1",
        alertDark: "#22205a",
        stripe: "rgba(255, 255, 255, 0.36)",
        stripeDark: "rgba(48, 36, 122, 0.46)",
        glow: "rgba(126, 255, 232, 0.84)"
      }
    };

    return palettes[hazard.type] || {
      fillA: "rgba(255, 240, 164, 0.48)",
      fillB: "rgba(255, 122, 26, 0.4)",
      fillC: "rgba(31, 20, 12, 0.78)",
      border: "#fff0a4",
      rim: hazard.color || "#ffd84a",
      highlight: "#ffffff",
      danger: "#ff3d5a",
      caution: "#ffd84a",
      dark: "#130c10",
      inner: hazard.color || "#ffd84a",
      alert: "#fff0a4",
      alertDark: "#2d1600",
      stripe: "rgba(255, 255, 255, 0.35)",
      stripeDark: "rgba(0, 0, 0, 0.32)",
      glow: hazard.color || "#ffd84a"
    };
  }

  function drawHazardDangerPlate(px, py, inset, palette, index, visual) {
    const x = px + 2.2;
    const y = py + 2.8;
    const size = TILE - 4.4;
    const radius = 5.4;
    const alpha = visual.active ? 0.95 : 0.36 + visual.telegraphProgress * 0.36;
    const pulseScale = visual.active ? 1 + visual.pulse * 0.018 : 0.96 + visual.telegraphProgress * 0.04;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.72;
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.beginPath();
    ctx.ellipse(px + TILE / 2, py + TILE * 0.76, TILE * 0.42, TILE * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha;
    ctx.shadowColor = palette.danger || "#ff3d5a";
    ctx.shadowBlur = visual.active ? 11 : 4;
    const plate = ctx.createLinearGradient(x, y, x, y + size);
    plate.addColorStop(0, "#2a2220");
    plate.addColorStop(0.48, palette.dark || "#120d10");
    plate.addColorStop(1, "#040508");
    ctx.fillStyle = plate;
    roundedRect(
      x + (1 - pulseScale) * size * 0.5,
      y + (1 - pulseScale) * size * 0.5,
      size * pulseScale,
      size * pulseScale,
      radius
    );
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = visual.active ? 2.25 : 1.45;
    ctx.strokeStyle = palette.danger || "#ff3d5a";
    roundedRect(x + 0.4, y + 0.4, size - 0.8, size - 0.8, radius);
    ctx.stroke();

    roundedRect(x + 2, y + 2, size - 4, size - 4, Math.max(3, radius - 1));
    ctx.clip();

    ctx.globalAlpha = visual.active ? 0.82 : 0.38 + visual.telegraphProgress * 0.22;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "butt";
    for (let stripe = -size; stripe < size * 2; stripe += 10) {
      ctx.strokeStyle = ((stripe / 10 + index) % 2 === 0)
        ? (palette.caution || "#ffd84a")
        : "rgba(5, 5, 8, 0.95)";
      ctx.beginPath();
      ctx.moveTo(x + stripe, y + size + 1);
      ctx.lineTo(x + stripe + size, y - 1);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.66;
    ctx.fillStyle = "rgba(7, 8, 13, 0.78)";
    roundedRect(x + 5.2, y + 5.2, size - 10.4, size - 10.4, 4);
    ctx.fill();

    ctx.restore();
  }

  function drawHazardCautionStripes(x, y, size, radius, palette, index, visual) {
    ctx.save();
    roundedRect(x + 1, y + 1, size - 2, size - 2, radius);
    ctx.clip();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = visual.active ? 0.36 : 0.18 + visual.telegraphProgress * 0.12;
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = index % 2 === 0 ? palette.stripe : palette.stripeDark;
    for (let offset = -size; offset < size * 2; offset += 9) {
      ctx.beginPath();
      ctx.moveTo(x + offset, y + size);
      ctx.lineTo(x + offset + size, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHazardTelegraphCue(px, py, inset, palette, visual) {
    const x = px + inset + 1.4;
    const y = py + inset + 1.4;
    const size = TILE - (inset + 1.4) * 2;
    const progress = visual.telegraphProgress;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.45 + progress * 0.35;
    ctx.setLineDash([3.5, 3.5]);
    ctx.lineDashOffset = -state.clock * 9;
    ctx.strokeStyle = palette.alert;
    ctx.lineWidth = 1.8;
    roundedRect(x, y, size, size, 6);
    ctx.stroke();
    ctx.restore();
  }

  function drawHazardDangerRim(px, py, inset, palette, index, visual) {
    const x = px + inset + 0.8;
    const y = py + inset + 0.8;
    const size = TILE - (inset + 0.8) * 2;
    const radius = 5.2;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = visual.active ? 0.72 + visual.pulse * 0.18 : 0.26 + visual.telegraphProgress * 0.28;
    ctx.shadowColor = palette.danger || "#ff3d5a";
    ctx.shadowBlur = visual.active ? 14 : 5;
    ctx.strokeStyle = palette.danger || "#ff3d5a";
    ctx.lineWidth = visual.active ? 2.4 : 1.5;
    roundedRect(x, y, size, size, radius);
    ctx.stroke();

    if (visual.active) {
      const corner = 5.5 + Math.sin(state.clock * 6.5 + index) * 1.2;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = palette.caution || "#ffd84a";
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + corner);
      ctx.lineTo(x + 2, y + 2);
      ctx.lineTo(x + corner, y + 2);
      ctx.moveTo(x + size - corner, y + 2);
      ctx.lineTo(x + size - 2, y + 2);
      ctx.lineTo(x + size - 2, y + corner);
      ctx.moveTo(x + 2, y + size - corner);
      ctx.lineTo(x + 2, y + size - 2);
      ctx.lineTo(x + corner, y + size - 2);
      ctx.moveTo(x + size - corner, y + size - 2);
      ctx.lineTo(x + size - 2, y + size - 2);
      ctx.lineTo(x + size - 2, y + size - corner);
      ctx.stroke();

      for (const beacon of [
        [x + 3.3, y + 3.3],
        [x + size - 3.3, y + 3.3],
        [x + 3.3, y + size - 3.3],
        [x + size - 3.3, y + size - 3.3]
      ]) {
        const flicker = 0.75 + Math.sin(state.clock * 8.5 + index) * 0.18;
        ctx.globalAlpha = flicker;
        ctx.fillStyle = palette.danger || "#ff3d5a";
        ctx.beginPath();
        ctx.arc(beacon[0], beacon[1], 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawHazardSpike(cx, baseY, width, height, lean, colors) {
    const tipX = cx + lean;
    const leftX = cx - width / 2;
    const rightX = cx + width / 2;
    const gradient = ctx.createLinearGradient(tipX, baseY - height, cx, baseY);
    gradient.addColorStop(0, colors.top);
    gradient.addColorStop(0.45, colors.mid);
    gradient.addColorStop(1, colors.base);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = colors.lineWidth || 1.2;
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    ctx.lineTo(tipX, baseY - height);
    ctx.lineTo(rightX, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha *= 0.7;
    ctx.strokeStyle = colors.highlight;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(tipX, baseY - height + 2);
    ctx.lineTo(cx - width * 0.12, baseY - height * 0.18);
    ctx.stroke();
    ctx.restore();
  }

  function drawHazardFlame(cx, baseY, radius, phase, colors) {
    const flicker = Math.sin(phase) * radius * 0.12;
    const topY = baseY - radius * (1.85 + Math.sin(phase * 0.73) * 0.16);

    ctx.save();
    ctx.shadowColor = colors.glow || colors.mid;
    ctx.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 5 : 14;
    const outer = ctx.createRadialGradient(cx, baseY - radius * 0.7, 1, cx, baseY - radius * 0.62, radius * 1.5);
    outer.addColorStop(0, colors.hot);
    outer.addColorStop(0.42, colors.mid);
    outer.addColorStop(1, colors.base);
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.66, baseY);
    ctx.bezierCurveTo(cx - radius * 1.08, baseY - radius * 0.72, cx - radius * 0.36 + flicker, baseY - radius * 1.18, cx - radius * 0.08, topY);
    ctx.bezierCurveTo(cx + radius * 0.22, baseY - radius * 1.24, cx + radius * 1.05, baseY - radius * 0.68, cx + radius * 0.62, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha *= 0.86;
    ctx.fillStyle = colors.hot;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.28, baseY - radius * 0.08);
    ctx.bezierCurveTo(cx - radius * 0.45, baseY - radius * 0.54, cx - radius * 0.12, baseY - radius * 0.88, cx + radius * 0.06, baseY - radius * 1.23);
    ctx.bezierCurveTo(cx + radius * 0.18, baseY - radius * 0.88, cx + radius * 0.45, baseY - radius * 0.45, cx + radius * 0.22, baseY - radius * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHazardElectricArc(points, color, phase = 0) {
    if (points.length < 2) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = color;
    ctx.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 4 : 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const midX = (previous.x + current.x) / 2 + Math.sin(phase + index * 1.7) * 2.2;
      const midY = (previous.y + current.y) / 2 + Math.cos(phase + index * 1.4) * 2.2;
      ctx.lineTo(midX, midY);
      ctx.lineTo(current.x, current.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawHazardPebble(cx, cy, radius, color, highlight) {
    const rock = ctx.createRadialGradient(cx - radius * 0.25, cy - radius * 0.35, 1, cx, cy, radius);
    rock.addColorStop(0, highlight);
    rock.addColorStop(1, color);
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 1.12, radius * 0.72, -0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHazardFacetLine(x1, y1, x2, y2, color) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha *= 0.62;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function getHazardObstacleSpriteIndex(type, index, length) {
    const choices = {
      "ice-slick": [0, 0, 2, 0, 3],
      "lava-spill": [1, 1, 0, 1, 2],
      "rune-trap": [0, 0, 3, 0, 2],
      "crystal-burst": [0, 0, 2, 0, 3]
    }[type] || [0];
    return choices[index % choices.length] % Math.max(1, length);
  }

  function drawHazardWorldObstacleSprite(hazard, index, px, py, options = {}) {
    const level = getCurrentLevel();
    const sheet = getMazeWorldSheet(level);
    const sprites = sheet?.definition?.obstacleSprites;
    if (!sprites?.length) {
      return false;
    }

    const sprite = sprites[getHazardObstacleSpriteIndex(hazard.type, index, sprites.length)];
    const image = getTransparentMazeWorldSprite(sheet, sprite);
    if (!image) {
      return false;
    }

    const targetHeight = TILE * (options.height || 1.18);
    const scale = targetHeight / Math.max(1, sprite.h);
    const drawW = sprite.w * scale * (options.widthScale || 1);
    const drawH = sprite.h * scale;
    const drawX = px + TILE / 2 - drawW / 2 + (options.offsetX || 0);
    const drawY = py + TILE * (options.anchorY || 0.98) - drawH + (options.offsetY || 0);

    ctx.save();
    ctx.globalCompositeOperation = options.blend || "source-over";
    ctx.globalAlpha *= options.alpha ?? 0.96;
    ctx.shadowColor = options.glow || hazard.color || getCurrentLevel().accent;
    ctx.shadowBlur = options.shadowBlur ?? (MOBILE_RUNTIME.reducedEffects ? 4 : 10);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    ctx.restore();
    return true;
  }

  function resolveMazeWorldCrop(sheet, cropNameOrCrop) {
    if (!cropNameOrCrop) {
      return null;
    }
    if (typeof cropNameOrCrop === "string") {
      const crop = sheet.definition[cropNameOrCrop];
      return crop ? { ...crop, id: cropNameOrCrop } : null;
    }
    return cropNameOrCrop;
  }

  function getMazeWorldCropCanvas(sheet, cropNameOrCrop, options = {}) {
    const crop = resolveMazeWorldCrop(sheet, cropNameOrCrop);
    if (!crop || !sheet.image.complete || sheet.image.naturalWidth <= 0) {
      return null;
    }

    const transparent = Boolean(options.transparent);
    const cacheKey = `${sheet.worldKey}:${transparent ? "transparent" : "opaque"}:${crop.id || `${crop.x},${crop.y},${crop.w},${crop.h}`}`;
    if (mazeWorldSpriteCache.has(cacheKey)) {
      return mazeWorldSpriteCache.get(cacheKey);
    }

    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = crop.w;
    spriteCanvas.height = crop.h;
    const spriteContext = spriteCanvas.getContext("2d", { willReadFrequently: true });
    if (!spriteContext) {
      return null;
    }

    spriteContext.drawImage(sheet.image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

    if (transparent) {
      const imageData = spriteContext.getImageData(0, 0, crop.w, crop.h);
      const pixels = imageData.data;
      const width = crop.w;
      const height = crop.h;
      const visited = new Uint8Array(width * height);
      const queue = [];

      const isSheetBackground = (pixelIndex) => {
        const red = pixels[pixelIndex];
        const green = pixels[pixelIndex + 1];
        const blue = pixels[pixelIndex + 2];
        const alpha = pixels[pixelIndex + 3];
        const brightest = Math.max(red, green, blue);
        const darkest = Math.min(red, green, blue);
        return alpha > 0 && red > 190 && green > 190 && blue > 190 && brightest - darkest < 58;
      };

      const enqueueBackground = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) {
          return;
        }
        const cellIndex = y * width + x;
        const pixelIndex = cellIndex * 4;
        if (visited[cellIndex] || !isSheetBackground(pixelIndex)) {
          return;
        }
        visited[cellIndex] = 1;
        pixels[pixelIndex + 3] = 0;
        queue.push(cellIndex);
      };

      for (let x = 0; x < width; x += 1) {
        enqueueBackground(x, 0);
        enqueueBackground(x, height - 1);
      }
      for (let y = 0; y < height; y += 1) {
        enqueueBackground(0, y);
        enqueueBackground(width - 1, y);
      }

      for (let head = 0; head < queue.length; head += 1) {
        const cellIndex = queue[head];
        const x = cellIndex % width;
        const y = Math.floor(cellIndex / width);
        enqueueBackground(x + 1, y);
        enqueueBackground(x - 1, y);
        enqueueBackground(x, y + 1);
        enqueueBackground(x, y - 1);
      }

      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const alpha = pixels[index + 3];
        const brightest = Math.max(red, green, blue);
        const darkest = Math.min(red, green, blue);
        if (alpha > 0 && red > 246 && green > 246 && blue > 246 && brightest - darkest < 18) {
          pixels[index + 3] = Math.min(alpha, 96);
        }
      }
      spriteContext.putImageData(imageData, 0, 0);
    }

    mazeWorldSpriteCache.set(cacheKey, spriteCanvas);
    return spriteCanvas;
  }

  function getTransparentMazeWorldSprite(sheet, cropNameOrCrop) {
    return getMazeWorldCropCanvas(sheet, cropNameOrCrop, { transparent: true });
  }

  function drawMazeWorldTextureRect(sheet, cropName, x, y, width, height, options = {}) {
    const texture = getMazeWorldCropCanvas(sheet, cropName);
    if (!texture) {
      return false;
    }

    const scale = Math.max(0.25, options.patternScale || 1);
    const sourceWidth = Math.max(4, Math.min(texture.width, Math.ceil(width / scale)));
    const sourceHeight = Math.max(4, Math.min(texture.height, Math.ceil(height / scale)));
    const spanX = Math.max(1, texture.width - sourceWidth);
    const spanY = Math.max(1, texture.height - sourceHeight);
    const sourceX = Math.floor(Math.abs(options.offsetX || 0) % spanX);
    const sourceY = Math.floor(Math.abs(options.offsetY || 0) % spanY);

    ctx.save();
    ctx.globalAlpha *= options.alpha ?? 1;
    if (options.blend) {
      ctx.globalCompositeOperation = options.blend;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(texture, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    ctx.restore();
    return true;
  }

  function drawReferenceCollectibleSprite(cx, cy, size, sheet, bonus = false, phase = 0, options = {}) {
    const sprite = getTransparentMazeWorldSprite(sheet, bonus ? "bonusCollectible" : "collectible");
    const reducedMotion = Boolean(options.reducedMotion || MOBILE_RUNTIME.reducedEffects);
    const bob = reducedMotion ? 0 : Math.sin(state.clock * 4.2 + phase) * 1.2;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(state.clock * 5 + phase) * 0.08;
    const drawSize = size * pulse;
    if (!sprite) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = bonus ? 0.98 : 0.92;
    ctx.shadowColor = bonus
      ? (getCurrentLevel().bonusCollectibleColor || "#ffffff")
      : (getCurrentLevel().collectibleColor || "#ffffff");
    ctx.shadowBlur = reducedMotion ? (bonus ? 7 : 4) : (bonus ? 16 : 10);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = reducedMotion ? "medium" : "high";
    ctx.drawImage(sprite, cx - drawSize / 2, cy - drawSize / 2 + bob, drawSize, drawSize);
    ctx.restore();
  }

  function drawLavaHazardCell(px, py, inset, hazard, index, visual) {
    const cx = px + TILE / 2;
    const baseY = py + TILE * 0.82;
    const phase = state.clock * 5.8 + index * 0.85 + hazard.phase;

    ctx.save();
    ctx.fillStyle = "rgba(34, 5, 3, 0.95)";
    roundedRect(px + 5.5, py + TILE * 0.63, TILE - 11, TILE * 0.23, 4);
    ctx.fill();

    ctx.strokeStyle = "#ffd84a";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px + 7, py + TILE * 0.61);
    ctx.lineTo(px + TILE - 7, py + TILE * 0.61);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha *= 0.8;
    ctx.fillStyle = "rgba(255, 39, 61, 0.42)";
    ctx.beginPath();
    ctx.ellipse(cx, baseY - TILE * 0.18, TILE * 0.36, TILE * 0.31, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawHazardFlame(cx - TILE * 0.18, baseY, TILE * 0.16, phase, {
      hot: "#fff0a4",
      mid: "#ff8a1a",
      base: "#ff273d",
      glow: "#ff621f"
    });
    drawHazardFlame(cx + TILE * 0.04, baseY + 1, TILE * 0.2, phase + 0.9, {
      hot: "#fff7c7",
      mid: "#ffb340",
      base: "#ff321b",
      glow: "#ff7a1a"
    });
    drawHazardFlame(cx + TILE * 0.24, baseY, TILE * 0.14, phase + 1.8, {
      hot: "#fff0a4",
      mid: "#ff8a1a",
      base: "#ff273d",
      glow: "#ff621f"
    });

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha *= 0.86;
    ctx.strokeStyle = "#ffd84a";
    ctx.lineWidth = 1.1;
    for (let spark = 0; spark < 3; spark += 1) {
      const sx = px + TILE * (0.26 + spark * 0.24);
      const sy = py + TILE * (0.27 + Math.sin(phase + spark) * 0.08);
      ctx.beginPath();
      ctx.moveTo(sx - 2, sy);
      ctx.lineTo(sx + 2, sy);
      ctx.moveTo(sx, sy - 2);
      ctx.lineTo(sx, sy + 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawIceHazardCell(px, py, inset, hazard, index, visual) {
    const cx = px + TILE / 2;
    const baseY = py + TILE * 0.84;
    const sparkle = Math.sin(state.clock * 3 + index + hazard.phase);

    ctx.save();
    const base = ctx.createLinearGradient(px, py + TILE * 0.48, px, py + TILE);
    base.addColorStop(0, "rgba(236, 255, 255, 0.84)");
    base.addColorStop(0.5, "rgba(91, 221, 255, 0.64)");
    base.addColorStop(1, "rgba(18, 80, 122, 0.7)");
    ctx.fillStyle = base;
    roundedRect(px + 3.4, py + TILE * 0.6, TILE - 6.8, TILE * 0.25, 6);
    ctx.fill();

    const iceColors = {
      top: "#ffffff",
      mid: "#99f7ff",
      base: "#1d7da8",
      stroke: "#e8ffff",
      highlight: "#ffffff",
      lineWidth: 1.15
    };
    drawHazardSpike(cx - TILE * 0.24, baseY, TILE * 0.28, TILE * 0.5, -TILE * 0.05, iceColors);
    drawHazardSpike(cx + TILE * 0.02, baseY + 1, TILE * 0.34, TILE * 0.68, TILE * 0.03, iceColors);
    drawHazardSpike(cx + TILE * 0.26, baseY, TILE * 0.25, TILE * 0.46, TILE * 0.05, iceColors);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha *= 0.64;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(px + 7, py + TILE * (0.66 - sparkle * 0.025));
    ctx.quadraticCurveTo(px + TILE * 0.46, py + TILE * 0.56 + sparkle, px + TILE - 8, py + TILE * 0.63 - sparkle * 0.5);
    ctx.moveTo(px + TILE * 0.33, py + TILE * 0.48);
    ctx.lineTo(px + TILE * 0.44, py + TILE * 0.39);
    ctx.lineTo(px + TILE * 0.57, py + TILE * 0.43);
    ctx.stroke();
    ctx.restore();
  }

  function drawRuneHazardCell(px, py, inset, hazard, index, visual) {
    const cx = px + TILE / 2;
    const x = px + 4.4;
    const y = py + 5.2;
    const w = TILE - 8.8;
    const h = TILE - 9.4;

    ctx.save();
    const stone = ctx.createLinearGradient(x, y, x, y + h);
    stone.addColorStop(0, "#d7bf82");
    stone.addColorStop(0.52, "#77623d");
    stone.addColorStop(1, "#292016");
    ctx.fillStyle = stone;
    ctx.strokeStyle = "#f4d999";
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + 1);
    ctx.lineTo(x + w * 0.88, y + 2);
    ctx.lineTo(x + w, y + h * 0.82);
    ctx.lineTo(x + w * 0.08, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(18, 12, 7, 0.42)";
    roundedRect(x + w * 0.19, y + h * 0.19, w * 0.62, h * 0.58, 3.5);
    ctx.fill();

    const spikeColors = {
      top: "#fff0a4",
      mid: "#d49b35",
      base: "#5a3311",
      stroke: "#ffe7ab",
      highlight: "#fff6ce",
      lineWidth: 1
    };
    drawHazardSpike(cx - TILE * 0.23, y + h * 0.94, TILE * 0.2, TILE * 0.36, -1.5, spikeColors);
    drawHazardSpike(cx, y + h * 0.98, TILE * 0.24, TILE * 0.42, 0, spikeColors);
    drawHazardSpike(cx + TILE * 0.23, y + h * 0.94, TILE * 0.2, TILE * 0.36, 1.5, spikeColors);

    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = hazard.color;
    ctx.shadowBlur = visual.active ? 12 : 5;
    ctx.strokeStyle = hazard.color;
    ctx.lineCap = "round";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - TILE * 0.16, y + h * 0.56);
    ctx.lineTo(cx, y + h * 0.34);
    ctx.lineTo(cx + TILE * 0.16, y + h * 0.56);
    ctx.moveTo(cx, y + h * 0.34);
    ctx.lineTo(cx, y + h * 0.72);
    ctx.moveTo(cx - TILE * 0.1, y + h * 0.72);
    ctx.lineTo(cx + TILE * 0.11, y + h * 0.72);
    ctx.stroke();
    ctx.restore();
  }

  function drawCrystalHazardCell(cx, cy, hazard, index, visual) {
    const px = cx - TILE / 2;
    const py = cy - TILE / 2;
    const baseY = cy + TILE * 0.34;
    const cyan = {
      top: "#f9ffff",
      mid: "#55ffd6",
      base: "#1767bd",
      stroke: "#cffff8",
      highlight: "#ffffff",
      lineWidth: 1.1
    };
    const magenta = {
      top: "#ffffff",
      mid: "#ff75df",
      base: "#5831c6",
      stroke: "#ffd6f6",
      highlight: "#ffffff",
      lineWidth: 1.05
    };

    ctx.save();
    ctx.fillStyle = "rgba(6, 13, 45, 0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 1, TILE * 0.34, TILE * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    drawHazardSpike(cx - TILE * 0.24, baseY, TILE * 0.23, TILE * 0.48, -TILE * 0.05, index % 2 === 0 ? magenta : cyan);
    drawHazardSpike(cx + TILE * 0.02, baseY + 1, TILE * 0.32, TILE * 0.68, TILE * 0.02, cyan);
    drawHazardSpike(cx + TILE * 0.25, baseY, TILE * 0.23, TILE * 0.52, TILE * 0.06, index % 2 === 0 ? cyan : magenta);

    drawHazardFacetLine(cx - TILE * 0.06, baseY - TILE * 0.44, cx + TILE * 0.05, baseY - TILE * 0.08, "#ffffff");
    drawHazardFacetLine(cx + TILE * 0.22, baseY - TILE * 0.31, cx + TILE * 0.28, baseY - TILE * 0.07, "#ffffff");
    if (visual.active) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha *= 0.42;
      ctx.strokeStyle = index % 2 === 0 ? "#ff5fd7" : "#55ffd6";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - TILE * 0.4, cy);
      ctx.lineTo(cx + TILE * 0.4, cy);
      ctx.moveTo(cx, cy - TILE * 0.4);
      ctx.lineTo(cx, cy + TILE * 0.34);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPowerSnowflakeCollectible(cx, cy, radius, phase = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.clock * 0.75 + phase);
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = "#9ef7ff";
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.72;
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 3.1);
    halo.addColorStop(0, "rgba(255, 255, 255, 0.65)");
    halo.addColorStop(0.45, "rgba(105, 231, 255, 0.32)");
    halo.addColorStop(1, "rgba(105, 231, 255, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 3.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#e9ffff";
    ctx.lineWidth = Math.max(1.3, radius * 0.24);
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-radius * 1.2, 0);
      ctx.lineTo(radius * 1.2, 0);
      ctx.moveTo(radius * 0.45, -radius * 0.32);
      ctx.lineTo(radius * 0.78, 0);
      ctx.lineTo(radius * 0.45, radius * 0.32);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBossCoreCollectible(cx, cy, radius, phase = 0) {
    ctx.save();
    ctx.translate(cx, cy + Math.sin(state.clock * 3 + phase) * 1.4);
    ctx.rotate(Math.sin(state.clock * 1.4 + phase) * 0.18);
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = "#a66bff";
    ctx.shadowBlur = 18;
    const coreGradient = ctx.createRadialGradient(-radius * 0.35, -radius * 0.45, 1, 0, 0, radius * 1.8);
    coreGradient.addColorStop(0, "#ffffff");
    coreGradient.addColorStop(0.35, "#d4b6ff");
    coreGradient.addColorStop(1, "#6a32e6");
    ctx.fillStyle = coreGradient;
    ctx.globalAlpha = 0.96;
    drawDiamond(0, 0, radius * 1.35);
    ctx.fill();
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = "#f2e8ff";
    ctx.lineWidth = Math.max(1.2, radius * 0.2);
    drawDiamond(0, 0, radius * 1.55);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlusSymbol(cx, cy, radius, rotation = 0) {
    const arm = radius * 0.34;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation * 0.18);
    ctx.fillRect(-arm, -radius, arm * 2, radius * 2);
    ctx.fillRect(-radius, -arm, radius * 2, arm * 2);
    ctx.restore();
  }

  function drawDiamond(cx, cy, radius) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx + radius * 0.82, cy);
    ctx.lineTo(cx, cy + radius);
    ctx.lineTo(cx - radius * 0.82, cy);
    ctx.closePath();
  }

  function getBossSpriteCutout(sprite, definition) {
    if (!isImageReady(sprite) || !definition?.sourceRect) {
      return null;
    }

    const source = definition.sourceRect;
    const cacheKey = [
      definition.id || definition.configKey || "boss",
      sprite.currentSrc || sprite.src || "sprite",
      source.x,
      source.y,
      source.width,
      source.height
    ].join(":");
    if (bossSpriteCutoutCache.has(cacheKey)) {
      return bossSpriteCutoutCache.get(cacheKey);
    }

    const cutout = document.createElement("canvas");
    cutout.width = source.width;
    cutout.height = source.height;
    const renderContext = cutout.getContext("2d", { willReadFrequently: true });
    if (!renderContext) {
      return null;
    }

    renderContext.drawImage(sprite, source.x, source.y, source.width, source.height, 0, 0, source.width, source.height);
    try {
      const imageData = renderContext.getImageData(0, 0, source.width, source.height);
      const data = imageData.data;
      for (let index = 0; index < data.length; index += 4) {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const brightness = (r + g + b) / 3;
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        if (brightness > 244 && spread < 22) {
          data[index + 3] = 0;
        } else if (brightness > 232 && spread < 18) {
          data[index + 3] = Math.round(data[index + 3] * ((244 - brightness) / 12));
        }
      }
      renderContext.putImageData(imageData, 0, 0);
    } catch {
      return null;
    }

    bossSpriteCutoutCache.set(cacheKey, cutout);
    if (bossSpriteCutoutCache.size > 8) {
      const oldestKey = bossSpriteCutoutCache.keys().next().value;
      bossSpriteCutoutCache.delete(oldestKey);
    }
    return cutout;
  }

  function getBossActorFrame(definition, directionName) {
    const actor = definition.actor || {};
    const cellSize = BOSS_ACTOR_SHEET.cellSize;
    const column = BOSS_ACTOR_SHEET.directionColumns[directionName]
      ?? BOSS_ACTOR_SHEET.directionColumns.down;
    return {
      x: column * cellSize,
      y: (actor.row || 0) * cellSize,
      width: cellSize,
      height: cellSize
    };
  }

  function drawBossActorTrail(renderContext, boss, displaySize, definition) {
    if (!boss.trail?.length || MOBILE_RUNTIME.reducedEffects) {
      return;
    }

    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    for (let index = 0; index < boss.trail.length; index += 2) {
      const point = boss.trail[index];
      const lifeRatio = clamp(point.life / 0.42, 0, 1);
      const direction = DIRS[point.direction] || DIRS.none;
      renderContext.globalAlpha = lifeRatio * 0.24;
      renderContext.fillStyle = definition.glow;
      renderContext.beginPath();
      renderContext.ellipse(
        point.x - direction.x * displaySize * 0.18,
        point.y - direction.y * displaySize * 0.18 + displaySize * 0.24,
        displaySize * (0.18 + lifeRatio * 0.16),
        displaySize * (0.045 + lifeRatio * 0.055),
        direction.x !== 0 ? 0 : Math.PI / 2,
        0,
        Math.PI * 2
      );
      renderContext.fill();
    }
    renderContext.restore();
  }

  function drawBossActorBeacon(renderContext, boss, displaySize, definition, introPulse) {
    renderContext.save();
    renderContext.translate(boss.x, boss.y + displaySize * 0.32);
    renderContext.globalCompositeOperation = "screen";
    renderContext.strokeStyle = definition.accent;
    renderContext.lineCap = "round";
    renderContext.lineWidth = Math.max(2, displaySize * 0.035);
    renderContext.globalAlpha = 0.28 + introPulse * 0.34;
    renderContext.beginPath();
    renderContext.ellipse(0, 0, displaySize * (0.46 + introPulse * 0.18), displaySize * 0.13, 0, 0, Math.PI * 2);
    renderContext.stroke();
    renderContext.globalAlpha *= 0.48;
    renderContext.beginPath();
    renderContext.ellipse(0, -displaySize * 0.02, displaySize * 0.62, displaySize * 0.19, 0, Math.PI * 1.06, Math.PI * 1.94);
    renderContext.stroke();
    renderContext.restore();
  }

  function drawBossActorMotionArcs(renderContext, displaySize, definition, direction, moving, footfall) {
    if (!moving || MOBILE_RUNTIME.reducedEffects) {
      return;
    }

    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.lineCap = "round";
    renderContext.lineWidth = Math.max(1.6, displaySize * 0.026);
    for (const side of [-1, 1]) {
      renderContext.globalAlpha = 0.16 + footfall * 0.16;
      renderContext.strokeStyle = side === 1 ? definition.accent : (definition.actor?.motionColor || definition.eyeColor);
      const sideX = direction.y * side * displaySize * 0.22 - direction.x * displaySize * 0.42;
      const sideY = -direction.x * side * displaySize * 0.12 - direction.y * displaySize * 0.28;
      renderContext.beginPath();
      renderContext.moveTo(sideX, sideY + displaySize * 0.12);
      renderContext.quadraticCurveTo(
        sideX - direction.x * displaySize * 0.2,
        sideY - direction.y * displaySize * 0.24,
        sideX - direction.x * displaySize * 0.5,
        sideY - direction.y * displaySize * 0.36
      );
      renderContext.stroke();
    }
    renderContext.restore();
  }

  function drawBossActorStepPads(renderContext, displaySize, definition, direction, walkPhase, moving) {
    const stride = moving ? Math.sin(walkPhase) : Math.sin(state.clock * 2.2) * 0.26;
    const actor = definition.actor || {};
    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.fillStyle = actor.footColor || definition.accent;
    renderContext.strokeStyle = actor.motionColor || definition.accent;
    renderContext.lineWidth = Math.max(1.2, displaySize * 0.018);
    for (const side of [-1, 1]) {
      const step = Math.sin(walkPhase + (side > 0 ? 0 : Math.PI));
      const sideAxisX = direction.y !== 0 ? side * displaySize * 0.19 : side * displaySize * 0.1;
      const sideAxisY = direction.x !== 0 ? side * displaySize * 0.035 : 0;
      const forwardX = direction.x * step * displaySize * 0.1;
      const forwardY = direction.y * step * displaySize * 0.045;
      renderContext.globalAlpha = moving ? 0.28 + Math.max(0, step) * 0.2 : 0.16;
      renderContext.beginPath();
      renderContext.ellipse(
        sideAxisX + forwardX,
        displaySize * 0.32 + sideAxisY + forwardY + Math.abs(stride) * 1.2,
        displaySize * (direction.x !== 0 ? 0.11 : 0.15),
        displaySize * 0.042,
        direction.x !== 0 ? 0.14 * direction.x : 0,
        0,
        Math.PI * 2
      );
      renderContext.fill();
      renderContext.stroke();
    }
    renderContext.restore();
  }

  function drawBossActorCoreCue(renderContext, displaySize, definition, directionName, active) {
    if (directionName === "up") {
      return;
    }

    const actor = definition.actor || {};
    const pulse = active ? 0.5 + Math.abs(Math.sin(state.clock * 8)) * 0.5 : 0.3 + Math.abs(Math.sin(state.clock * 3.2)) * 0.25;
    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.shadowColor = actor.coreColor || definition.eyeColor;
    renderContext.shadowBlur = active ? 16 : 9;
    renderContext.fillStyle = actor.coreColor || definition.eyeColor;
    renderContext.globalAlpha = active ? 0.42 + pulse * 0.34 : 0.18 + pulse * 0.16;
    renderContext.beginPath();
    renderContext.ellipse(0, -displaySize * 0.04, displaySize * 0.075, displaySize * 0.052, 0, 0, Math.PI * 2);
    renderContext.fill();
    renderContext.strokeStyle = "#ffffff";
    renderContext.lineWidth = Math.max(1, displaySize * 0.014);
    renderContext.globalAlpha *= 0.72;
    renderContext.stroke();
    renderContext.restore();
  }

  function drawBossActorQuestionCue(renderContext, boss, displaySize, definition) {
    const active = state.phase === "question" && state.currentEnemyId === boss.id;
    if (!active) {
      return;
    }

    renderContext.save();
    renderContext.translate(0, -displaySize * 0.74);
    renderContext.globalCompositeOperation = "source-over";
    renderContext.shadowColor = definition.glow;
    renderContext.shadowBlur = 14;
    renderContext.fillStyle = "rgba(28, 22, 50, 0.92)";
    renderContext.strokeStyle = definition.eyeColor || definition.accent;
    renderContext.lineWidth = Math.max(1.6, displaySize * 0.024);
    renderContext.beginPath();
    renderContext.arc(0, 0, displaySize * 0.115, 0, Math.PI * 2);
    renderContext.fill();
    renderContext.stroke();
    renderContext.fillStyle = "#ffffff";
    renderContext.font = `700 ${Math.max(13, displaySize * 0.14)}px system-ui, sans-serif`;
    renderContext.textAlign = "center";
    renderContext.textBaseline = "middle";
    renderContext.fillText("?", 0, displaySize * 0.004);
    renderContext.restore();
  }

  function drawBossActorSprite(renderContext, definition, directionName, displaySize) {
    const frame = getBossActorFrame(definition, directionName);
    renderContext.drawImage(
      GAME_ASSETS.bossActorSheet,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      -displaySize / 2,
      -displaySize * 0.62,
      displaySize,
      displaySize
    );
  }

  function drawBossLegacySprite(renderContext, sprite, definition, width, height, progress) {
    const spriteReady = isImageReady(sprite);
    if (!spriteReady || definition.drawFallbackUnderlay) {
      drawTarBossFallback(renderContext, width, height, definition, progress);
    }

    if (!spriteReady) {
      return;
    }

    const source = definition.sourceRect;
    const cutout = getBossSpriteCutout(sprite, definition);
    renderContext.save();
    renderContext.globalCompositeOperation = cutout ? "source-over" : (definition.spriteBlendMode || "multiply");
    renderContext.globalAlpha = cutout ? 1 : (definition.spriteAlpha || 0.92);
    if (cutout) {
      renderContext.drawImage(cutout, -width / 2, -height * 0.72, width, height);
    } else {
      renderContext.drawImage(
        sprite,
        source.x,
        source.y,
        source.width,
        source.height,
        -width / 2,
        -height * 0.72,
        width,
        height
      );
    }
    renderContext.restore();
  }

  function drawBoss() {
    const boss = state.boss;
    if (!boss) {
      return;
    }

    const definition = boss.definition || BOSS_CONFIG.stage1;
    const sprite = GAME_ASSETS.bosses[definition.assetKey || definition.configKey || boss.configKey || "stage1"];
    const progress = clamp(boss.spawnProgress, 0, 1);
    const introPulse = state.bossIntro
      ? clamp(state.bossIntro.life / state.bossIntro.maxLife, 0, 1)
      : 0;
    const directionName = boss.direction || "down";
    const direction = DIRS[directionName] || DIRS.down;
    const chaseScale = state.bossIntro || progress < 0.95 ? 1 : 0.9;
    const actorBaseSize = definition.actor?.size || Math.max(definition.width, definition.height);
    const mobileActorScale = MOBILE_RUNTIME.coarse ? 1.06 : 1;
    const displaySize = actorBaseSize * mobileActorScale * chaseScale * (0.58 + progress * 0.42);
    const width = definition.width * chaseScale * (0.52 + progress * 0.48) * (1 + Math.sin(boss.wobble * 1.4) * 0.025);
    const height = definition.height * chaseScale * (0.48 + progress * 0.52) * (1 + Math.cos(boss.wobble * 1.2) * 0.025);
    const lift = (1 - progress) * 34;
    const moving = (boss.lastMoveDistance || 0) > 0.04 && progress >= 0.78;
    const walkPhase = boss.walkCycle || boss.wobble;
    const footfall = Math.abs(Math.sin(walkPhase));
    const walkBounce = moving ? footfall * 3.8 : Math.sin(boss.wobble * 0.82) * 1.2;
    const turnProgress = boss.turnAnimation > 0 ? clamp(boss.turnAnimation / 0.22, 0, 1) : 0;
    const bob = Math.sin(boss.wobble) * 1.2 - walkBounce;
    const actorSheetReady = isImageReady(GAME_ASSETS.bossActorSheet);

    drawBossActorTrail(ctx, boss, displaySize, definition);
    drawBossActorBeacon(ctx, boss, displaySize, definition, introPulse);
    drawCharacterGroundShadow(ctx, boss.x, boss.y + 3, displaySize, definition.glow, {
      intensity: 0.68 + introPulse * 0.16,
      squash: 1.16 + footfall * 0.22 + Math.abs(direction.x) * 0.16
    });

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.18 + introPulse * 0.28;
    ctx.strokeStyle = definition.accent;
    ctx.lineWidth = Math.max(2.6, displaySize * 0.032);
    ctx.beginPath();
    ctx.ellipse(
      boss.x,
      boss.y + displaySize * 0.31,
      displaySize * (0.46 + introPulse * 0.28),
      displaySize * (0.13 + introPulse * 0.08),
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.translate(boss.x, boss.y - lift + bob);
    const turnDirection = DIRS[boss.turnDirection] || direction;
    const directionLean = direction.x * 0.075 + direction.y * 0.026 + Math.sin(turnProgress * Math.PI) * turnDirection.x * 0.15;
    const walkSquash = moving ? footfall * 0.055 : 0;
    ctx.rotate(directionLean + Math.sin(boss.wobble * 0.45) * 0.02);
    ctx.scale(
      1 + Math.abs(direction.x) * 0.03 + walkSquash,
      1 + Math.abs(direction.y) * 0.025 - walkSquash * 0.45
    );
    ctx.shadowColor = definition.glow;
    ctx.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 11 : 24;

    drawBossActorMotionArcs(ctx, displaySize, definition, direction, moving, footfall);
    drawBossActorStepPads(ctx, displaySize, definition, direction, walkPhase, moving);
    if (actorSheetReady) {
      drawBossActorSprite(ctx, definition, directionName, displaySize);
      drawCharacterRim(ctx, displaySize, definition.accent, {
        intensity: state.bossIntro ? 0.46 : 0.28
      });
      drawBossActorCoreCue(ctx, displaySize, definition, directionName, state.phase === "question" && state.currentEnemyId === boss.id);
    } else {
      drawBossLegacySprite(ctx, sprite, definition, width, height, progress);
    }

    if (!actorSheetReady && definition.overlayDetails !== false) {
      drawBossCracks(ctx, width, height, definition, boss.wobble);
      drawBossEyes(ctx, width, height, definition);
    }
    drawBossActorQuestionCue(ctx, boss, displaySize, definition);
    ctx.restore();
  }

  function drawTarBossFallback(renderContext, width, height, definition, progress) {
    const bodyGradient = renderContext.createRadialGradient(
      -width * 0.16,
      -height * 0.36,
      height * 0.08,
      0,
      -height * 0.18,
      width * 0.62
    );
    bodyGradient.addColorStop(0, "rgba(94, 73, 142, 0.98)");
    bodyGradient.addColorStop(0.48, "rgba(24, 22, 58, 0.99)");
    bodyGradient.addColorStop(1, "rgba(4, 5, 15, 1)");
    renderContext.globalAlpha = 0.98 + progress * 0.02;
    renderContext.fillStyle = bodyGradient;
    renderContext.beginPath();
    renderContext.ellipse(0, -height * 0.13, width * 0.5, height * 0.43, 0, Math.PI, Math.PI * 2);
    renderContext.lineTo(width * 0.44, height * 0.22);
    renderContext.quadraticCurveTo(width * 0.22, height * 0.36, 0, height * 0.3);
    renderContext.quadraticCurveTo(-width * 0.22, height * 0.36, -width * 0.44, height * 0.22);
    renderContext.closePath();
    renderContext.fill();

    renderContext.globalCompositeOperation = "screen";
    renderContext.globalAlpha = 0.48;
    renderContext.strokeStyle = definition.accent;
    renderContext.lineWidth = Math.max(1.8, width * 0.018);
    renderContext.beginPath();
    renderContext.ellipse(0, -height * 0.12, width * 0.49, height * 0.42, 0, Math.PI, Math.PI * 2);
    renderContext.stroke();

    renderContext.globalAlpha = 0.3;
    renderContext.strokeStyle = definition.accent;
    renderContext.lineWidth = 1.8;
    renderContext.beginPath();
    renderContext.ellipse(0, height * 0.18, width * 0.46, height * 0.16, 0, 0, Math.PI * 2);
    renderContext.stroke();
  }

  function drawBossCracks(renderContext, width, height, definition, wobble) {
    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.strokeStyle = definition.accent;
    renderContext.lineWidth = Math.max(1.1, width * 0.012);
    renderContext.lineCap = "round";
    renderContext.shadowColor = definition.glow;
    renderContext.shadowBlur = 12;

    const cracks = [
      [-0.34, -0.42, -0.2, -0.32, -0.1, -0.42],
      [-0.18, -0.5, -0.05, -0.36, 0.08, -0.46],
      [0.06, -0.42, 0.2, -0.34, 0.32, -0.43],
      [-0.42, -0.18, -0.27, -0.14, -0.16, -0.22],
      [0.18, -0.17, 0.3, -0.11, 0.42, -0.2],
      [-0.08, -0.26, 0.03, -0.18, 0.14, -0.28]
    ];

    cracks.forEach((crack, index) => {
      renderContext.globalAlpha = 0.72 + Math.sin(wobble + index) * 0.1;
      renderContext.beginPath();
      renderContext.moveTo(crack[0] * width, crack[1] * height);
      renderContext.lineTo(crack[2] * width, crack[3] * height);
      renderContext.lineTo(crack[4] * width, crack[5] * height);
      renderContext.stroke();
    });
    renderContext.restore();
  }

  function drawBossEyes(renderContext, width, height, definition) {
    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.shadowColor = definition.eyeColor;
    renderContext.shadowBlur = 12;
    renderContext.fillStyle = definition.eyeColor;
    for (const side of [-1, 1]) {
      renderContext.save();
      renderContext.translate(side * width * 0.17, -height * 0.17);
      renderContext.rotate(side * -0.1);
      renderContext.beginPath();
      renderContext.ellipse(0, 0, width * 0.062, height * 0.04, 0, 0, Math.PI * 2);
      renderContext.fill();
      renderContext.restore();
    }
    renderContext.restore();
  }

  function drawPlayerCharacter(renderContext, playerState) {
    if (!playerState) {
      return;
    }

    const theme = getPlayerTheme();
    const playerAssets = getPlayerAssets();
    const expressionAssets = getPlayerExpressionAssets();
    const animation = getPlayerAnimationFrame(playerState);
    const sprite = playerAssets[animation.frame] || expressionAssets[animation.frame] || playerAssets.idle || expressionAssets.idle;
    const spriteReady = isImageReady(sprite);
    const mobileCharacterScale = MOBILE_RUNTIME.coarse ? 1.34 : 1.08;
    const displaySize = playerState.radius * theme.renderScale * mobileCharacterScale;
    renderContext.save();
    drawPlayerTrail(renderContext, playerState, displaySize, theme);

    renderContext.globalAlpha = 1;
    const flicker = playerState.invulnerable > 0 && Math.floor(state.clock * 16) % 2 === 0;
    if (flicker) {
      renderContext.globalAlpha = 0.55;
    }

    const angle = directionAngle(playerState.direction);
    const eatProgress = getPlayerEatProgress(playerState);
    const hitProgress = playerState.hitAnimation > 0 ? clamp(playerState.hitAnimation / 0.48, 0, 1) : 0;
    const rewardProgress = playerState.rewardAnimation > 0 ? clamp(playerState.rewardAnimation / 1.05, 0, 1) : 0;
    const questionProgress = playerState.questionAnimation > 0 ? clamp(playerState.questionAnimation / 0.38, 0, 1) : 0;
    const turnProgress = playerState.turnAnimation > 0 ? clamp(playerState.turnAnimation / 0.18, 0, 1) : 0;
    const hitLift = playerState.invulnerable > 0 ? Math.sin(state.clock * 18) * 1.8 : 0;
    const direction = DIRS[playerState.direction] || DIRS.right;
    const moving = (playerState.lastMoveDistance || 0) > 0.04;
    const walkPhase = playerState.walkCycle || 0;
    const footfall = Math.abs(Math.sin(walkPhase));
    const walkBounce = moving ? footfall * 3.8 : Math.sin(state.clock * 2.6) * 0.8;
    const walkSquash = moving ? footfall * 0.082 : 0;
    const directionLean = direction.x * 0.11 + direction.y * 0.06 + Math.sin(turnProgress * Math.PI) * direction.x * 0.24;
    const horizontalStretch = moving && direction.x !== 0 ? 0.055 + walkSquash : 0;
    const verticalStretch = moving && direction.y !== 0 ? 0.04 + walkSquash * 0.5 : 0;
    const hitSquash = Math.sin(hitProgress * Math.PI) * 0.18;
    const rewardLift = Math.sin((1 - rewardProgress) * Math.PI) * 8;
    const rewardScale = Math.sin((1 - rewardProgress) * Math.PI) * 0.12;
    const questionBrake = Math.sin(questionProgress * Math.PI) * 0.1;
    const pulseScale = 0.96 + playerState.visualPulse * 0.07 + rewardScale - questionBrake * 0.35;
    drawPlayerBeacon(renderContext, playerState.x, playerState.y, displaySize, theme.glowColor, playerState.visualPulse);
    drawCharacterGroundShadow(renderContext, playerState.x, playerState.y, displaySize, theme.glowColor, {
      intensity: playerState.invulnerable > 0 ? 0.72 : 0.52,
      squash: animation.active ? 1.14 : 1 + walkSquash * 1.8 + rewardScale * 2 - hitSquash
    });
    renderContext.translate(playerState.x, playerState.y);
    renderContext.translate(
      direction.x * walkSquash * 7 - direction.x * questionBrake * 8 + Math.sin(hitProgress * Math.PI * 2) * hitProgress * 4,
      -Math.abs(hitLift) - walkBounce - rewardLift + hitSquash * displaySize * 0.12
    );
    renderContext.scale(
      pulseScale * (1 + eatProgress * 0.08 + walkSquash + horizontalStretch + hitSquash + questionBrake),
      pulseScale * (1 - eatProgress * 0.05 - walkSquash * 0.35 + verticalStretch - hitSquash * 0.55 + questionBrake * 0.32)
    );
    if (!animation.active) {
      renderContext.rotate(Math.sin(angle) * 0.045 + directionLean - Math.sin(hitProgress * Math.PI) * 0.18);
    }
    renderContext.shadowColor = theme.glowColor;
    renderContext.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 8 : 15;

    drawPlayerEatEffect(renderContext, playerState, displaySize);
    drawPlayerMotionArcs(renderContext, playerState, displaySize, theme, moving, direction, footfall);

    if (spriteReady) {
      renderContext.save();
      if ((animation.active && playerState.eatDirection === "left") || (!animation.active && playerState.direction === "left")) {
        renderContext.scale(-1, 1);
      }
      renderContext.drawImage(
        sprite,
        -displaySize / 2,
        -displaySize / 2,
        displaySize,
        displaySize
      );
      drawCharacterRim(renderContext, displaySize, theme.glowColor, {
        intensity: animation.active ? 0.46 : 0.3
      });
      drawCharacterActingDetails(renderContext, playerState, displaySize, theme, animation, moving, footfall, {
        hitProgress,
        rewardProgress,
        questionProgress,
        turnProgress
      });
      drawPlayerBlink(renderContext, playerState, displaySize, theme);
      renderContext.restore();
    } else {
      const fallbackSize = playerState.radius * 1.65;
      const bodyGradient = renderContext.createLinearGradient(
        -fallbackSize,
        -fallbackSize,
        fallbackSize,
        fallbackSize
      );
      bodyGradient.addColorStop(0, theme.primaryColor);
      bodyGradient.addColorStop(1, theme.secondaryColor);
      renderContext.fillStyle = bodyGradient;
      renderContext.fillRect(
        -fallbackSize / 2,
        -fallbackSize / 2,
        fallbackSize,
        fallbackSize
      );
    }
    renderContext.restore();
  }

  function drawPlayerTrail(renderContext, playerState, displaySize, theme) {
    if (!playerState.trail.length) {
      return;
    }

    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    for (let index = 0; index < playerState.trail.length; index += MOBILE_RUNTIME.reducedEffects ? 4 : 2) {
      const point = playerState.trail[index];
      const lifeRatio = Math.max(0, point.life / 0.34);
      const radius = displaySize * (0.16 + lifeRatio * 0.18);
      const direction = DIRS[point.direction] || DIRS.none;
      renderContext.globalAlpha = lifeRatio * (MOBILE_RUNTIME.reducedEffects ? 0.12 : 0.22);
      const glow = renderContext.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 1.8);
      glow.addColorStop(0, `rgba(${theme.trailColor}, 0.9)`);
      glow.addColorStop(0.55, `rgba(${theme.trailColor}, 0.22)`);
      glow.addColorStop(1, `rgba(${theme.trailColor}, 0)`);
      renderContext.fillStyle = glow;
      renderContext.beginPath();
      renderContext.ellipse(
        point.x - direction.x * radius * 0.34,
        point.y - direction.y * radius * 0.34,
        radius * (direction.y !== 0 ? 0.72 : 1.34),
        radius * (direction.x !== 0 ? 0.72 : 1.34),
        direction.x !== 0 ? 0 : Math.PI / 2,
        0,
        Math.PI * 2
      );
      renderContext.fill();
    }
    renderContext.restore();
  }

  function drawPlayerMotionArcs(renderContext, playerState, displaySize, theme, moving, direction, footfall) {
    if (!moving || MOBILE_RUNTIME.reducedEffects) {
      return;
    }

    const accent = theme.motionAccent || theme.detailColor || "#ffffff";
    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.lineCap = "round";
    renderContext.lineWidth = Math.max(1.2, displaySize * 0.035);
    for (const side of [-1, 1]) {
      renderContext.globalAlpha = 0.18 + footfall * 0.14;
      renderContext.strokeStyle = side === 1 ? theme.glowColor : accent;
      const sideX = direction.y * side * displaySize * 0.24 - direction.x * displaySize * 0.36;
      const sideY = -direction.x * side * displaySize * 0.24 - direction.y * displaySize * 0.36;
      renderContext.beginPath();
      renderContext.moveTo(sideX, sideY);
      renderContext.quadraticCurveTo(
        sideX - direction.x * displaySize * 0.18,
        sideY - direction.y * displaySize * 0.18 - displaySize * 0.08,
        sideX - direction.x * displaySize * 0.45,
        sideY - direction.y * displaySize * 0.45
      );
      renderContext.stroke();
    }
    renderContext.restore();
  }

  function drawCharacterActingDetails(renderContext, playerState, displaySize, theme, animation, moving, footfall, motion = {}) {
    renderContext.save();
    renderContext.globalCompositeOperation = "screen";

    const shine = renderContext.createRadialGradient(
      -displaySize * 0.16,
      -displaySize * 0.2,
      displaySize * 0.02,
      -displaySize * 0.16,
      -displaySize * 0.2,
      displaySize * 0.34
    );
    shine.addColorStop(0, "rgba(255, 255, 255, 0.36)");
    shine.addColorStop(0.6, "rgba(255, 255, 255, 0.08)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    renderContext.globalAlpha = animation.active ? 0.36 : 0.22;
    renderContext.fillStyle = shine;
    renderContext.beginPath();
    renderContext.ellipse(-displaySize * 0.16, -displaySize * 0.2, displaySize * 0.25, displaySize * 0.16, -0.42, 0, Math.PI * 2);
    renderContext.fill();

    if (moving) {
      renderContext.globalAlpha = 0.22 + footfall * 0.16;
      renderContext.strokeStyle = theme.motionAccent || theme.detailColor || "#ffffff";
      renderContext.lineWidth = Math.max(1.1, displaySize * 0.025);
      renderContext.lineCap = "round";
      for (const side of [-1, 1]) {
        renderContext.beginPath();
        renderContext.moveTo(side * displaySize * 0.26, displaySize * 0.2);
        renderContext.quadraticCurveTo(
          side * displaySize * 0.34,
          displaySize * (0.08 + footfall * 0.05),
          side * displaySize * 0.2,
          displaySize * 0.02
        );
        renderContext.stroke();
      }
    }

    if (motion.turnProgress > 0) {
      renderContext.globalAlpha = Math.sin(motion.turnProgress * Math.PI) * 0.34;
      renderContext.strokeStyle = theme.motionAccent || theme.detailColor || "#ffffff";
      renderContext.lineWidth = Math.max(1.4, displaySize * 0.035);
      renderContext.beginPath();
      renderContext.arc(0, displaySize * 0.06, displaySize * 0.5, Math.PI * 0.15, Math.PI * 0.72);
      renderContext.stroke();
    }

    if (motion.questionProgress > 0) {
      renderContext.globalAlpha = Math.sin(motion.questionProgress * Math.PI) * 0.28;
      renderContext.strokeStyle = "#ffffff";
      renderContext.lineWidth = Math.max(1.2, displaySize * 0.028);
      renderContext.beginPath();
      renderContext.arc(0, -displaySize * 0.48, displaySize * 0.13, -Math.PI * 0.2, Math.PI * 1.22);
      renderContext.stroke();
      renderContext.beginPath();
      renderContext.moveTo(0, -displaySize * 0.25);
      renderContext.lineTo(0, -displaySize * 0.18);
      renderContext.stroke();
    }

    if (motion.rewardProgress > 0) {
      const rewardAlpha = Math.sin((1 - motion.rewardProgress) * Math.PI);
      renderContext.globalAlpha = rewardAlpha * 0.42;
      renderContext.strokeStyle = "#9ef7ff";
      renderContext.lineWidth = Math.max(1.3, displaySize * 0.03);
      for (let ring = 0; ring < 2; ring += 1) {
        renderContext.beginPath();
        renderContext.ellipse(
          0,
          displaySize * (0.32 + ring * 0.08),
          displaySize * (0.44 + ring * 0.18),
          displaySize * (0.12 + ring * 0.05),
          0,
          0,
          Math.PI * 2
        );
        renderContext.stroke();
      }
    }

    if (motion.hitProgress > 0) {
      renderContext.globalAlpha = Math.sin(motion.hitProgress * Math.PI) * 0.32;
      renderContext.strokeStyle = "#ff6b7d";
      renderContext.lineWidth = Math.max(1.4, displaySize * 0.034);
      for (const side of [-1, 1]) {
        renderContext.beginPath();
        renderContext.moveTo(side * displaySize * 0.38, -displaySize * 0.2);
        renderContext.lineTo(side * displaySize * 0.52, -displaySize * 0.34);
        renderContext.moveTo(side * displaySize * 0.42, displaySize * 0.08);
        renderContext.lineTo(side * displaySize * 0.58, displaySize * 0.16);
        renderContext.stroke();
      }
    }

    if (state.characterId === "nabatick") {
      const leafSwing = Math.sin((playerState.walkCycle || state.clock) * 1.15) * (moving ? 0.14 : 0.07);
      renderContext.globalAlpha = 0.24;
      renderContext.strokeStyle = theme.motionAccent || "#fff26a";
      renderContext.lineWidth = Math.max(1, displaySize * 0.02);
      renderContext.beginPath();
      renderContext.ellipse(0, -displaySize * 0.29, displaySize * 0.26, displaySize * 0.07, leafSwing, 0, Math.PI * 2);
      renderContext.stroke();
    }

    renderContext.restore();
  }

  function getPlayerEatProgress(playerState) {
    if (playerState.eatAnimation <= 0) {
      return 0;
    }
    const duration = getPlayerTheme().eatAnimationDuration;
    return clamp(1 - playerState.eatAnimation / duration, 0, 1);
  }

  function drawCharacterGroundShadow(renderContext, x, y, displaySize, color, options = {}) {
    renderContext.save();
    renderContext.translate(x, y + displaySize * 0.36);
    renderContext.scale(options.squash || 1, 1);
    renderContext.globalAlpha = options.intensity || 0.48;
    renderContext.fillStyle = "rgba(0, 0, 0, 0.48)";
    renderContext.beginPath();
    renderContext.ellipse(0, 0, displaySize * 0.34, displaySize * 0.09, 0, 0, Math.PI * 2);
    renderContext.fill();
    renderContext.globalAlpha = (options.intensity || 0.48) * 0.55;
    renderContext.strokeStyle = color;
    renderContext.lineWidth = 1.4;
    renderContext.beginPath();
    renderContext.ellipse(0, -1.5, displaySize * 0.39, displaySize * 0.105, 0, 0, Math.PI * 2);
    renderContext.stroke();
    renderContext.restore();
  }

  function drawPlayerBeacon(renderContext, x, y, displaySize, color, visualPulse = 0) {
    renderContext.save();
    renderContext.translate(x, y + displaySize * 0.34);
    renderContext.globalCompositeOperation = "screen";
    renderContext.globalAlpha = MOBILE_RUNTIME.reducedEffects ? 0.2 : 0.28 + visualPulse * 0.16;
    renderContext.strokeStyle = color;
    renderContext.lineWidth = Math.max(1.5, displaySize * 0.045);
    renderContext.beginPath();
    renderContext.ellipse(0, 0, displaySize * 0.52, displaySize * 0.17, 0, 0, Math.PI * 2);
    renderContext.stroke();
    renderContext.globalAlpha *= 0.58;
    renderContext.beginPath();
    renderContext.ellipse(0, 0, displaySize * 0.68, displaySize * 0.22, 0, Math.PI * 1.08, Math.PI * 1.92);
    renderContext.stroke();
    renderContext.restore();
  }

  function drawCharacterRim(renderContext, displaySize, color, options = {}) {
    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.globalAlpha = options.intensity || 0.28;
    renderContext.strokeStyle = color;
    renderContext.lineWidth = Math.max(1, displaySize * 0.035);
    renderContext.beginPath();
    renderContext.ellipse(0, displaySize * 0.015, displaySize * 0.43, displaySize * 0.39, 0, 0, Math.PI * 2);
    renderContext.stroke();
    renderContext.restore();
  }

  function drawPlayerBlink(renderContext, playerState, displaySize, theme) {
    if (playerState.blinkDuration <= 0 || playerState.eatAnimation > 0) {
      return;
    }

    const blinkProgress = 1 - playerState.blinkDuration / 0.12;
    const blinkAlpha = Math.sin(clamp(blinkProgress, 0, 1) * Math.PI);
    const isNabatick = state.characterId === "nabatick";
    const eyeY = isNabatick ? displaySize * -0.02 : displaySize * -0.1;
    const eyeGap = isNabatick ? displaySize * 0.18 : displaySize * 0.19;
    const eyeWidth = isNabatick ? displaySize * 0.105 : displaySize * 0.12;

    renderContext.save();
    renderContext.globalAlpha = blinkAlpha * 0.9;
    renderContext.strokeStyle = theme.secondaryColor || "#06164f";
    renderContext.lineWidth = Math.max(2.2, displaySize * 0.045);
    renderContext.lineCap = "round";
    for (const side of [-1, 1]) {
      renderContext.beginPath();
      renderContext.moveTo(side * eyeGap - eyeWidth * side, eyeY);
      renderContext.quadraticCurveTo(side * eyeGap, eyeY + displaySize * 0.018, side * eyeGap + eyeWidth * side, eyeY);
      renderContext.stroke();
    }
    renderContext.restore();
  }

  function getPlayerAnimationFrame(playerState) {
    if (playerState.eatAnimation <= 0) {
      const expressionAssets = getPlayerExpressionAssets();
      if ((playerState.rewardAnimation || 0) > 0 && isImageReady(expressionAssets.victory)) {
        return { frame: "victory", active: true };
      }
      if ((playerState.hitAnimation || 0) > 0 && getPlayerAssets().hit) {
        return { frame: "hit", active: true };
      }
      if ((playerState.questionAnimation || 0) > 0 && isImageReady(expressionAssets.tap)) {
        return { frame: "tap", active: false };
      }
      if (playerState.invulnerable > 0 && getPlayerAssets().hit) {
        return { frame: "hit", active: false };
      }
      if (playerState.blinkDuration > 0 && isImageReady(expressionAssets.blink)) {
        return { frame: "blink", active: false };
      }
      if ((playerState.lastMoveDistance || 0) > 0.04) {
        const phase = ((playerState.walkCycle || 0) % (Math.PI * 2)) / (Math.PI * 2);
        if ((phase > 0.08 && phase < 0.2) || (phase > 0.58 && phase < 0.7)) {
          return { frame: isImageReady(expressionAssets.tap) ? "tap" : "eatPrepare", active: false };
        }
        if ((phase > 0.32 && phase < 0.42) && isImageReady(expressionAssets.selected)) {
          return { frame: "selected", active: false };
        }
      }
      return { frame: "idle", active: false };
    }

    const duration = getPlayerTheme().eatAnimationDuration;
    const progress = 1 - playerState.eatAnimation / duration;
    if (progress < 0.28 || progress > 0.82) {
      return { frame: "eatPrepare", active: true };
    }
    return { frame: "eat", active: true };
  }

  function drawPlayerEatEffect(renderContext, playerState, displaySize) {
    const effect = playerState.eatEffect;
    if (!effect) {
      return;
    }

    const progress = 1 - effect.life / effect.maxLife;
    const startDistance = displaySize * 0.78;
    const direction = DIRS[playerState.eatDirection] || DIRS.right;
    const mouthX = playerState.eatDirection === "left"
      ? -displaySize * 0.2
      : displaySize * 0.2;
    const mouthY = 0;
    const startX = direction.x * startDistance;
    const startY = direction.y * startDistance;
    const x = startX + (mouthX - startX) * progress;
    const y = startY + (mouthY - startY) * progress;
    const size = (effect.value > 10 ? 4.6 : 2.8) * (1 - progress * 0.56);

    renderContext.save();
    renderContext.globalAlpha = clamp(1 - progress * 0.76, 0, 1);
    renderContext.fillStyle = effect.color;
    renderContext.shadowColor = effect.color;
    renderContext.shadowBlur = 10;
    if (effect.value > 10) {
      drawPlusAtContext(renderContext, x, y, size);
    } else {
      drawDiamondAtContext(renderContext, x, y, size);
    }
    renderContext.restore();
  }

  function drawDiamondAtContext(renderContext, x, y, radius) {
    renderContext.beginPath();
    renderContext.moveTo(x, y - radius);
    renderContext.lineTo(x + radius * 0.82, y);
    renderContext.lineTo(x, y + radius);
    renderContext.lineTo(x - radius * 0.82, y);
    renderContext.closePath();
    renderContext.fill();
  }

  function drawPlusAtContext(renderContext, x, y, radius) {
    const arm = radius * 0.34;
    renderContext.fillRect(x - arm, y - radius, arm * 2, radius * 2);
    renderContext.fillRect(x - radius, y - arm, radius * 2, arm * 2);
  }

  function isImageReady(image) {
    return image?.complete && image.naturalWidth > 0;
  }

  function directionAngle(direction) {
    if (direction === "left") {
      return Math.PI;
    }
    if (direction === "up") {
      return -Math.PI / 2;
    }
    if (direction === "down") {
      return Math.PI / 2;
    }
    return 0;
  }

  function drawEnemies() {
    state.enemies.forEach((enemy, enemyIndex) => {
      drawEnemyCharacter(ctx, enemy, enemyIndex, {
        clock: state.clock,
        spawning: enemy.spawnFlash > 0
      });
    });
  }

  function drawEnemyCharacter(renderContext, enemy, enemyIndex, enemyState) {
    const variant = enemy.visualVariant ?? enemyIndex % 4;
    const expression = getEnemyExpression(enemy, enemyState);
    const sprite = GAME_ASSETS.enemies[expression] || GAME_ASSETS.enemies.idle;
    const spriteReady = isImageReady(sprite);
    const sizeVariation = [1, 0.94, 1.04, 0.98][variant];
    const mobileCharacterScale = MOBILE_RUNTIME.coarse ? 1.12 : 1;
    const displaySize = enemy.radius * GAME_THEME.enemies.renderScale * sizeVariation * mobileCharacterScale;
    const direction = DIRS[enemy.direction] || DIRS.none;
    const bob = Math.sin(enemy.wobble) * 1.9;
    const stretch = Math.sin(enemy.wobble * 1.6) * 0.035;
    const lean = direction.x * 0.11 + Math.sin(enemy.wobble * 0.55) * 0.035;

    drawCharacterGroundShadow(renderContext, enemy.x, enemy.y, displaySize, enemy.color, {
      intensity: enemyState.spawning ? 0.62 : 0.42,
      squash: 0.86 + Math.abs(direction.x) * 0.18
    });
    renderContext.save();
    renderContext.translate(enemy.x, enemy.y + bob);
    renderContext.rotate(lean);
    renderContext.scale(
      1 + Math.abs(direction.x) * 0.06 + stretch,
      1 + Math.abs(direction.y) * 0.04 - stretch * 0.5
    );
    renderContext.shadowColor = enemy.color;
    renderContext.shadowBlur = MOBILE_RUNTIME.reducedEffects ? 7 : 15;
    drawEnemyAura(renderContext, displaySize, enemy, direction, enemyState);

    if (spriteReady) {
      renderContext.drawImage(
        sprite,
        -displaySize / 2,
        -displaySize / 2,
        displaySize,
        displaySize
      );
      drawCharacterRim(renderContext, displaySize, enemy.color, {
        intensity: enemyState.spawning ? 0.5 : 0.24
      });
    } else {
      renderContext.fillStyle = enemy.color;
      renderContext.beginPath();
      renderContext.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      renderContext.fill();
    }

    if (enemyState.spawning) {
      const progress = clamp(enemy.spawnFlash / 0.8, 0, 1);
      renderContext.globalAlpha = progress * 0.7;
      renderContext.strokeStyle = enemy.color;
      renderContext.lineWidth = 1.4;
      renderContext.beginPath();
      renderContext.arc(
        0,
        0,
        displaySize * (0.52 + (1 - progress) * 0.22),
        0,
        Math.PI * 2
      );
      renderContext.stroke();
    }
    renderContext.restore();
  }

  function drawEnemyAura(renderContext, displaySize, enemy, direction, enemyState) {
    if (MOBILE_RUNTIME.reducedEffects) {
      return;
    }

    renderContext.save();
    renderContext.globalCompositeOperation = "screen";
    renderContext.strokeStyle = enemy.color;
    renderContext.lineWidth = Math.max(1, displaySize * 0.026);
    renderContext.lineCap = "round";
    for (let index = 0; index < 3; index += 1) {
      const phase = enemy.wobble + index * 1.8;
      const side = index - 1;
      const pull = enemyState.spawning ? 0.35 : 0.18;
      renderContext.globalAlpha = 0.13 + Math.sin(phase) * 0.035;
      renderContext.beginPath();
      renderContext.moveTo(
        side * displaySize * 0.16 - direction.x * displaySize * 0.14,
        -displaySize * 0.1 + Math.sin(phase) * displaySize * 0.06
      );
      renderContext.quadraticCurveTo(
        side * displaySize * 0.28 - direction.x * displaySize * pull,
        -displaySize * 0.38 + Math.cos(phase) * displaySize * 0.05,
        side * displaySize * 0.09 - direction.x * displaySize * 0.34,
        -displaySize * 0.52
      );
      renderContext.stroke();
    }
    renderContext.restore();
  }

  function getEnemyExpression(enemy, enemyState) {
    if (enemyState.spawning) {
      return "surprised";
    }

    if (state.player?.invulnerable > 0) {
      return "sad";
    }

    if (state.phase === "question" && state.currentEnemyId === enemy.id) {
      return "surprised";
    }

    if (state.player) {
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      if (dx * dx + dy * dy < (TILE * 5.5) ** 2) {
        return "angry";
      }
    }

    const cycle = Math.floor((enemyState.clock + enemy.expressionOffset) / 0.72) % 6;
    if (cycle === 2 || cycle === 3) {
      return "angry";
    }
    if (cycle === 5) {
      return "surprised";
    }
    return "idle";
  }

  function drawParticles() {
    ctx.save();
    for (const particle of state.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * (0.7 + alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloatingTexts() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 20px Arial, sans-serif";
    for (const item of state.floatingTexts) {
      const alpha = clamp(item.life / item.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = item.color;
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 6;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }

  function drawArcadeRewardBanner() {
    const banner = state.arcadeRewardBanner;
    if (!banner) {
      return;
    }

    const alphaIn = clamp((banner.maxLife - banner.life) / 0.24, 0, 1);
    const alphaOut = clamp(banner.life / 0.4, 0, 1);
    const alpha = Math.min(alphaIn, alphaOut);
    const pulse = Math.sin((banner.maxLife - banner.life) * Math.PI * 2.4);
    const width = Math.min(WIDTH - 140, MOBILE_RUNTIME.phonePortrait ? 560 : 520);
    const height = MOBILE_RUNTIME.phonePortrait ? 118 : 108;
    const x = WIDTH / 2 - width / 2;
    const y = HEIGHT * 0.24 + (1 - alphaIn) * 14;
    const radius = 24;
    const iconX = x + width - 58;
    const iconY = y + height / 2 + 4;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(WIDTH / 2, y + height / 2);
    ctx.scale(0.96 + alphaIn * 0.04 + Math.max(0, pulse) * 0.012, 0.96 + alphaIn * 0.04);
    ctx.translate(-WIDTH / 2, -(y + height / 2));

    ctx.shadowColor = banner.color;
    ctx.shadowBlur = 26;
    const background = ctx.createLinearGradient(x, y, x, y + height);
    background.addColorStop(0, "rgba(10, 20, 44, 0.96)");
    background.addColorStop(0.58, "rgba(8, 13, 31, 0.94)");
    background.addColorStop(1, "rgba(2, 5, 14, 0.98)");
    ctx.fillStyle = background;
    roundRect(ctx, x, y, width, height, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = banner.color;
    roundRect(ctx, x + 2, y + 2, width - 4, height - 4, radius - 2);
    ctx.stroke();

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.26;
    ctx.fillStyle = banner.color;
    roundRect(ctx, x + width * 0.08, y + height - 20, width * 0.84, 8, 4);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;

    drawArcadeRewardBannerIcon(banner.reward, iconX, iconY, banner.color, banner.accent);

    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = banner.accent;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 8;
    ctx.font = "800 20px Arial, sans-serif";
    ctx.fillText(banner.title, WIDTH / 2 - 24, y + 32);

    ctx.fillStyle = banner.color;
    ctx.shadowColor = banner.color;
    ctx.shadowBlur = 18;
    ctx.font = `900 ${MOBILE_RUNTIME.phonePortrait ? 36 : 34}px Arial, sans-serif`;
    ctx.fillText(banner.label, WIDTH / 2 - 24, y + height / 2 + 4);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f7fbff";
    ctx.font = `800 ${MOBILE_RUNTIME.phonePortrait ? 17 : 16}px Arial, sans-serif`;
    ctx.fillText(banner.detail, WIDTH / 2 - 24, y + height - 30);
    ctx.restore();
  }

  function drawArcadeRewardBannerIcon(reward, x, y, color, accent) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;

    if (reward === "heart") {
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.bezierCurveTo(-34, -4, -24, -34, 0, -18);
      ctx.bezierCurveTo(24, -34, 34, -4, 0, 20);
      ctx.fill();
      ctx.stroke();
    } else if (reward === "shield") {
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(30, -22);
      ctx.quadraticCurveTo(25, 18, 0, 34);
      ctx.quadraticCurveTo(-25, 18, -30, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(8, 20, 38, 0.7)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(-2, 11);
      ctx.lineTo(17, -12);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 31, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(8, 20, 38, 0.72)";
      ctx.font = "900 30px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", 0, 1);
    }

    ctx.restore();
  }

  function drawLevelBanner() {
    if (!state.levelBanner) {
      return;
    }

    const banner = state.levelBanner;
    const alpha = clamp(banner.life / banner.maxLife, 0, 1);
    const ease = Math.sin(alpha * Math.PI);
    ctx.save();
    ctx.globalAlpha = clamp(alpha + 0.08, 0, 1);
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
    ctx.fillRect(0, HEIGHT * 0.32, WIDTH, 132);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = banner.color;
    ctx.shadowBlur = 22 * ease;
    ctx.fillStyle = banner.color;
    ctx.font = "700 44px Arial, sans-serif";
    ctx.fillText(banner.title, WIDTH / 2, HEIGHT * 0.32 + 48);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f7fbff";
    ctx.font = "700 20px Arial, sans-serif";
    ctx.fillText(banner.subtitle, WIDTH / 2, HEIGHT * 0.32 + 92);
    ctx.restore();
  }

  function roundRect(renderContext, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    renderContext.beginPath();
    renderContext.moveTo(x + r, y);
    renderContext.lineTo(x + width - r, y);
    renderContext.quadraticCurveTo(x + width, y, x + width, y + r);
    renderContext.lineTo(x + width, y + height - r);
    renderContext.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    renderContext.lineTo(x + r, y + height);
    renderContext.quadraticCurveTo(x, y + height, x, y + height - r);
    renderContext.lineTo(x, y + r);
    renderContext.quadraticCurveTo(x, y, x + r, y);
    renderContext.closePath();
  }

  function drawPaused() {
    const mode = getModeSettings();
    const difficulty = getDifficultySettings();
    const level = getCurrentLevel();
    const missionProgress = getMissionProgress();
    const missionLine = state.mission
      ? `${state.mission.label} · ${Math.min(missionProgress, state.mission.target)}/${state.mission.target}`
      : "משימה חדשה בדרך";

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(2, 6, 18, 0.76)";
    ctx.strokeStyle = "rgba(104, 231, 255, 0.34)";
    ctx.lineWidth = 2;
    roundRect(ctx, WIDTH / 2 - 250, HEIGHT / 2 - 92, 500, 184, 28);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffd84a";
    ctx.shadowColor = "rgba(255, 216, 74, 0.42)";
    ctx.shadowBlur = 18;
    ctx.font = "700 54px Arial, sans-serif";
    ctx.fillText("השהיה", WIDTH / 2, HEIGHT / 2 - 45);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f7fbff";
    ctx.font = "700 24px Arial, sans-serif";
    ctx.fillText(`${mode.shortLabel} · ${difficulty.label} · ${level.name}`, WIDTH / 2, HEIGHT / 2 + 4);
    ctx.fillStyle = "#68e7ff";
    ctx.font = "700 20px Arial, sans-serif";
    ctx.fillText(missionLine, WIDTH / 2, HEIGHT / 2 + 42);
    ctx.fillStyle = "#dce9ff";
    ctx.font = "700 17px Arial, sans-serif";
    ctx.fillText("לחצו רווח, Esc או על כפתור ההמשך", WIDTH / 2, HEIGHT / 2 + 72);
    ctx.restore();
  }

  function shouldSkipGameplayFrame() {
    return state.phase === "start" && !els.startScreen.hidden;
  }

  function gameLoop(now) {
    if (shouldSkipGameplayFrame()) {
      state.lastTime = now;
      requestAnimationFrame(gameLoop);
      return;
    }

    const dt = Math.min(0.033, Math.max(0, (now - state.lastTime) / 1000 || 0));
    state.lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  document.addEventListener("keydown", (event) => {
    if (state.phase === "question") {
      return;
    }

    if (state.phase === "start") {
      if (event.key === "Escape" && els.menuSheets.some((sheet) => !sheet.hidden)) {
        event.preventDefault();
        closeMenuSheets();
      }
      return;
    }

    if (state.phase === "ended") {
      if (event.key === "Escape") {
        event.preventDefault();
        showStartScreen();
      }
      return;
    }

    if (event.key === " " || event.key === "Escape") {
      event.preventDefault();
      togglePause();
      return;
    }

    const direction = KEY_TO_DIR[event.key];
    if (direction) {
      event.preventDefault();
      setDirection(direction);
    }
  });

  function shouldAvoidMobileKeyboard() {
    return window.matchMedia("(hover: none), (pointer: coarse), (max-width: 760px)").matches;
  }

  function focusPlayerNameWhenUseful() {
    if (shouldAvoidMobileKeyboard()) {
      return;
    }

    setTimeout(() => els.startButton?.focus({ preventScroll: true }), 30);
  }

  let joystickPointerId = null;

  function updateJoystick(event) {
    if (!els.joystick || !els.joystickKnob) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const rect = els.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const limit = rect.width * 0.27;
    const knobX = distance > 0 ? dx / distance * Math.min(limit, distance) : 0;
    const knobY = distance > 0 ? dy / distance * Math.min(limit, distance) : 0;

    els.joystickKnob.style.setProperty("--knob-x", `${knobX}px`);
    els.joystickKnob.style.setProperty("--knob-y", `${knobY}px`);

    if (state.phase !== "playing" || distance < JOYSTICK_DEADZONE) {
      return;
    }

    setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }

  function resetJoystick() {
    joystickPointerId = null;
    if (!els.joystick || !els.joystickKnob) {
      return;
    }

    els.joystick.classList.remove("is-active");
    els.joystickKnob.style.setProperty("--knob-x", "0px");
    els.joystickKnob.style.setProperty("--knob-y", "0px");
  }

  if (els.joystick) {
    els.joystick.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      joystickPointerId = event.pointerId;
      els.joystick.setPointerCapture?.(event.pointerId);
      els.joystick.classList.add("is-active");
      updateJoystick(event);
    });

    els.joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== joystickPointerId) {
        return;
      }

      event.stopPropagation();
      updateJoystick(event);
    });

    els.joystick.addEventListener("pointerup", (event) => {
      if (event.pointerId === joystickPointerId) {
        event.stopPropagation();
        resetJoystick();
      }
    });

    els.joystick.addEventListener("pointercancel", resetJoystick);
    els.joystick.addEventListener("lostpointercapture", resetJoystick);
  }

  let pointerStart = null;
  stage.addEventListener("pointerdown", (event) => {
    if (state.phase !== "playing" || event.target.closest("button, input")) {
      return;
    }

    pointerStart = { x: event.clientX, y: event.clientY };
  });

  stage.addEventListener("pointermove", (event) => {
    if (!pointerStart || state.phase !== "playing") {
      return;
    }

    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.hypot(dx, dy) < 28) {
      return;
    }

    setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  stage.addEventListener("pointerup", () => {
    pointerStart = null;
  });

  stage.addEventListener("pointercancel", () => {
    pointerStart = null;
  });

  els.answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.answerLocked || !state.question) {
      return;
    }

    const raw = els.answerInput.value.trim();
    if (raw === "") {
      return;
    }

    const answer = Number(raw);
    const correct = Number.isFinite(answer) && answer === state.question.answer;
    const responseMs = Math.max(0, performance.now() - (state.questionStartedAt || performance.now()));
    state.answerLocked = true;
    els.answerInput.disabled = true;
    els.submitAnswer.disabled = true;
    if (state.questionSource !== "reward") {
      recordFactResult(state.question, correct);
      SYSTEMS.recordMathAnswer(state.mathStats, { correct, responseMs });
      state.correctAnswers = state.mathStats.correctAnswers;
      state.incorrectAnswers = state.mathStats.incorrectAnswers;
    }
    setQuestionFeedbackState(correct ? "correct" : "wrong");
    renderQuestionFeedback(correct ? "correct" : "wrong", correct
      ? {
        title: positiveFeedback(),
        message: state.questionSource === "reward" ? uiRuntime("question.rewardWon") : uiRuntime("question.correctDefault")
      }
      : {
        title: state.questionSource === "reward" ? uiRuntime("question.rewardWrongTitle") : supportFeedback(),
        message: state.questionSource === "reward" ? uiRuntime("question.rewardWrong") : uiRuntime("question.wrongNote"),
        answer: state.question.answer
      });
    scheduleQuestionFinish(correct, { responseMs });
  });

  els.pause.addEventListener("click", togglePause);
  els.sound.addEventListener("click", toggleSound);
  els.menuSound?.addEventListener("click", toggleSound);
  els.playerForm.addEventListener("submit", startGame);
  els.playerNameInput.addEventListener("input", () => {
    els.nameError.textContent = "";
  });
  els.answerInput.addEventListener("input", () => {
    const digitsOnly = els.answerInput.value.replace(/\D/g, "");
    if (els.answerInput.value !== digitsOnly) {
      els.answerInput.value = digitsOnly;
    }
  });
  els.characterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        setCharacter(input.value);
        playHomeCharacterReaction(input.value, "selected");
        state.homeCharacterSelectionGuardUntil = window.performance.now() + 360;
        const characterCard = input.closest(".menu-character")?.querySelector(".character-card");
        playUiMotion(characterCard || input.closest("label"), "characterSelect");
        playUiSound("characterSelected");
      }
    });
  });
  els.homeCharacterCards.forEach((card) => {
    card.addEventListener("click", () => {
      const input = card.querySelector("input[name='character']");
      window.setTimeout(() => {
        if (window.performance.now() < state.homeCharacterSelectionGuardUntil) {
          return;
        }
        if (input?.checked) {
          playHomeCharacterReaction(input.value, "tap");
          playUiMotion(card.querySelector(".character-card") || card, "characterTap");
        }
      }, 0);
    });
  });
  els.modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setMode(input.value);
      playUiMotion(input.closest("label"), "tabChange");
      playUiSound("modeSelected");
      closeMenuSheets();
    });
  });
  els.difficultyInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setDifficulty(input.value);
      playUiMotion(input.closest("label"), "tabChange");
      playUiSound("difficultySelected");
      closeMenuSheets();
    });
  });
  els.controlModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      setControlMode(input.value);
      playUiMotion(input.closest("label"), "tabChange");
      playUiSound("tabChange");
    });
  });
  els.languageInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      setLanguage(input.value);
      playUiMotion(input.closest("label"), "tabChange");
      playUiSound("tabChange");
    });
  });
  els.difficultyPanel?.addEventListener("click", (event) => {
    const label = event.target?.closest?.(".difficulty-options label");
    const input = label?.querySelector?.("input[name='difficulty']");
    if (input?.disabled) {
      event.preventDefault();
      playUiMotion(label, "lockedFeedback");
      playUiSound("lockedAction", { fromGesture: true });
    }
  });
  els.timeLimitToggle?.addEventListener("click", toggleTimeLimit);
  els.characterControlButton?.addEventListener("click", () => openHeroGallery(state.characterId, els.characterControlButton));
  els.pregameOpenButton?.addEventListener("click", () => openPregamePanel(els.pregameOpenButton));
  els.pregameCharacterButton?.addEventListener("click", () => {
    closeMenuSheets({ restoreFocus: false });
    openHeroGallery(state.characterId, els.characterControlButton);
  });
  els.pregameModeButton?.addEventListener("click", () => openMenuSheet(els.modePanel, els.modeControlButton));
  els.pregameDifficultyButton?.addEventListener("click", () => openMenuSheet(els.difficultyPanel, els.difficultyControlButton));
  els.pregameStartButton?.addEventListener("click", startGame);
  els.homeDifficultyButton?.addEventListener("click", () => openMenuSheet(els.difficultyPanel, els.homeDifficultyButton));
  els.homeModeButton?.addEventListener("click", () => openMenuSheet(els.modePanel, els.homeModeButton));
  els.modeControlButton?.addEventListener("click", () => openMenuSheet(els.modePanel, els.modeControlButton));
  els.difficultyControlButton?.addEventListener("click", () => openMenuSheet(els.difficultyPanel, els.difficultyControlButton));
  els.profileControlButton?.addEventListener("click", () => openMenuSheet(els.settingsPanel, els.profileControlButton));
  els.menuSettingsButton?.addEventListener("click", () => openMenuSheet(els.settingsPanel, els.menuSettingsButton));
  els.homeNavGame?.addEventListener("click", () => {
    playUiSound("tabChange");
    focusHomeGameAction();
  });
  els.homeNavCharacters?.addEventListener("click", () => openHeroGallery(state.characterId, els.homeNavCharacters));
  els.homeNavProgress?.addEventListener("click", () => {
    playUiSound("tabChange");
    focusHomeProgress();
  });
  els.homeProgressButton?.addEventListener("click", () => {
    playUiSound("tabChange");
    focusHomeProgress();
  });
  els.homeNavChampions?.addEventListener("click", () => {
    playUiSound("tabChange");
    setHomeNavActive(els.homeNavChampions);
    openLeaderboard();
  });
  els.heroGalleryBack?.addEventListener("click", closeHeroGallery);
  els.heroGalleryHome?.addEventListener("click", closeHeroGallery);
  els.heroGalleryPrev?.addEventListener("click", () => browseHeroGallery(-1));
  els.heroGalleryNext?.addEventListener("click", () => browseHeroGallery(1));
  els.heroGallerySelect?.addEventListener("click", confirmHeroGallerySelection);
  els.heroGalleryArtButton?.addEventListener("click", reactToHeroGalleryTap);
  els.heroGallery?.addEventListener("keydown", handleHeroGalleryKeydown);
  if (window.PointerEvent) {
    els.heroGalleryStage?.addEventListener("pointerdown", handleHeroGalleryPointerDown);
    els.heroGalleryStage?.addEventListener("pointerup", handleHeroGalleryPointerUp);
    els.heroGalleryStage?.addEventListener("pointercancel", () => {
      state.heroGallerySwipeStart = null;
    });
  } else {
    els.heroGalleryStage?.addEventListener("touchstart", handleHeroGalleryTouchStart, { passive: true });
    els.heroGalleryStage?.addEventListener("touchend", handleHeroGalleryTouchEnd, { passive: true });
  }
  els.settingsSaveButton?.addEventListener("click", saveNicknameFromSettings);
  els.settingsSoundButton?.addEventListener("click", toggleSound);
  els.pauseResumeButton?.addEventListener("click", togglePause);
  els.pauseRetryButton?.addEventListener("click", retryGame);
  els.pauseSoundButton?.addEventListener("click", toggleSound);
  els.pauseMenuButton?.addEventListener("click", showStartScreen);
  els.pauseSaveNameButton?.addEventListener("click", saveNicknameFromPause);
  els.trophyShareButton?.addEventListener("click", shareTrophyResult);
  els.panelCloseButtons.forEach((button) => {
    button.addEventListener("click", () => closeMenuSheets());
  });
  els.menuSheets.forEach((sheet) => {
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) {
        closeMenuSheets();
      }
    });
    sheet.addEventListener("keydown", (event) => {
      trapFocus(sheet, event);
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeMenuSheets();
      }
    });
  });
  els.leaderboardOpen?.addEventListener("click", openLeaderboard);
  els.menuLeaderboardLink?.addEventListener("click", openLeaderboard);
  els.leaderboardClose?.addEventListener("click", closeLeaderboard);
  els.leaderboardDialog?.addEventListener("click", (event) => {
    if (event.target === els.leaderboardDialog) {
      closeLeaderboard();
    }
  });
  els.leaderboardDialog?.addEventListener("keydown", (event) => {
    trapFocus(els.leaderboardDialog, event);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeLeaderboard();
    }
  });
  els.pauseScreen?.addEventListener("keydown", (event) => {
    trapFocus(els.pauseScreen, event);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      togglePause();
    }
  });
  els.endScreen?.addEventListener("keydown", (event) => {
    trapFocus(els.endScreen, event);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      showStartScreen();
    }
  });
  els.leaderboardRefresh?.addEventListener("click", () => {
    playUiSound("notification");
    loadLeaderboard();
  });
  els.leaderboardModeFilter?.addEventListener("change", () => {
    playUiSound("tabChange");
    loadLeaderboard();
  });
  els.leaderboardDifficultyFilter?.addEventListener("change", () => {
    playUiSound("tabChange");
    loadLeaderboard();
  });
  els.publishScoreButton?.addEventListener("click", publishScore);
  els.retryButton?.addEventListener("click", retryGame);
  els.endLeaderboardButton?.addEventListener("click", openLeaderboard);
  els.restartButton.addEventListener("click", showStartScreen);
  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(resizeCanvas, 120), { passive: true });
  window.visualViewport?.addEventListener("resize", resizeCanvas, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resizeCanvas).observe(stage);
  }
  window.addEventListener("blur", () => {
    if (state.phase === "playing") {
      togglePause();
    }
  });

  setPhase("start", { force: true });
  resizeCanvas();
  setMode(state.mode, false);
  setCharacter(state.characterId, false);
  syncDifficultyInputs();
  setControlMode(state.controlMode, false);
  setLanguage(state.language, false);
  syncTimeLimitToggle();
  els.playerNameInput.value = state.playerName;
  syncMenuSummary();
  syncPublicLeaderboardUi(false);
  setupGame();
  scheduleHomeCharacterIdleActing();
  installVerificationHooks();
  updateSoundButton();
  focusPlayerNameWhenUseful();
  {
    const runtime = window.__mathMazeRuntime = window.__mathMazeRuntime || {
      errors: [],
      startedAt: performance.now(),
      startTransitions: 0
    };
    runtime.gameReady = true;
    runtime.gameReadyAt = performance.now();
    window.dispatchEvent(new CustomEvent("kaflul:game-ready", {
      detail: {
        phase: state.phase,
        levelIndex: state.levelIndex
      }
    }));
  }
  requestAnimationFrame(gameLoop);
})();
