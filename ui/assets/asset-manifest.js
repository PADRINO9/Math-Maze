(() => {
  "use strict";

  const manifest = {
    version: "phase3-20260628",
    iconSprite: {
      path: "ui/icons.svg",
      type: "svg-sprite",
      preload: false,
      symbols: [
        "settings",
        "sound-on",
        "sound-off",
        "leaderboard",
        "profile",
        "character",
        "mode",
        "difficulty",
        "back",
        "close",
        "lives",
        "score",
        "combo",
        "mission",
        "world",
        "progress",
        "lock",
        "play",
        "pause",
        "refresh",
        "check",
        "fullscreen"
      ]
    },
    images: {
      logoOfficial: {
        path: "assets/kaflul-logo-official.png",
        type: "image/png",
        dimensions: [1065, 489],
        role: "main-menu-logo",
        preload: true,
        sourceStatus: "user-approved"
      },
      poster: {
        path: "assets/math-maze-poster.png",
        type: "image/png",
        dimensions: [1448, 1086],
        role: "menu-background",
        preload: true,
        sourceStatus: "current-production"
      },
      biflyMenu: {
        path: "assets/bifly-menu.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "character-menu",
        character: "bifly",
        state: "idle",
        preload: true,
        sourceStatus: "current-production"
      },
      biflyPlayer: {
        path: "assets/bifly-player.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "character-gameplay",
        character: "bifly",
        state: "idle",
        preload: true,
        sourceStatus: "current-production"
      },
      biflyEatPrepare: {
        path: "assets/bifly-eat-prepare.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "character-gameplay",
        character: "bifly",
        state: "eat-prepare",
        preload: true,
        sourceStatus: "current-production"
      },
      biflyEat: {
        path: "assets/bifly-eat.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "character-gameplay",
        character: "bifly",
        state: "eat",
        preload: true,
        sourceStatus: "current-production"
      },
      nabatickIdle: {
        path: "assets/nabatick-idle-reference.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "character-menu-gameplay",
        character: "nabatick",
        state: "idle",
        preload: true,
        sourceStatus: "current-production-reference"
      },
      nabatickEatPrepare: {
        path: "assets/nabatick-eat-prepare-reference.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "character-gameplay",
        character: "nabatick",
        state: "eat-prepare",
        preload: true,
        sourceStatus: "current-production-reference"
      },
      nabatickEat: {
        path: "assets/nabatick-eat-reference.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "character-gameplay",
        character: "nabatick",
        state: "eat",
        preload: true,
        sourceStatus: "current-production-reference"
      },
      darkEnemyIdle: {
        path: "assets/dark-enemy.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "enemy",
        state: "idle",
        preload: true,
        sourceStatus: "current-production"
      },
      darkEnemyAngry: {
        path: "assets/dark-enemy-angry.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "enemy",
        state: "angry",
        preload: true,
        sourceStatus: "current-production"
      },
      darkEnemySurprised: {
        path: "assets/dark-enemy-surprised.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "enemy",
        state: "surprised",
        preload: true,
        sourceStatus: "current-production"
      },
      darkEnemySad: {
        path: "assets/dark-enemy-sad.png",
        type: "image/png",
        dimensions: [512, 512],
        role: "enemy",
        state: "sad",
        preload: true,
        sourceStatus: "current-production"
      }
    },
    characterAnimations: {
      recognizedStates: [
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
      ],
      adapterTypes: [
        "static-png",
        "sprite-sheet",
        "layered-png-rig",
        "rive",
        "spine"
      ],
      characters: {
        bifly: {
          id: "bifly",
          displayName: "ביפלי",
          fallbackState: "idle",
          defaultAdapter: "static-png",
          lighting: {
            primary: "#58e8ff",
            secondary: "#ff5bd9",
            glow: "rgba(88, 232, 255, 0.58)"
          },
          adapters: {
            "static-png": {
              sourceStatus: "free-generated-expression-frames-20260630",
              states: {
                idle: {
                  assetId: "biflyExpressionIdle",
                  path: "assets/generated/bifly-expression-idle.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                blink: {
                  assetId: "biflyExpressionBlink",
                  path: "assets/generated/bifly-expression-blink.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                tap: {
                  assetId: "biflyExpressionBlink",
                  path: "assets/generated/bifly-expression-blink.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                selected: {
                  assetId: "biflyExpressionBlink",
                  path: "assets/generated/bifly-expression-blink.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                excited: {
                  assetId: "biflyExpressionVictory",
                  path: "assets/generated/bifly-expression-victory.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                worried: {
                  assetId: "biflyExpressionHit",
                  path: "assets/generated/bifly-expression-hit.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                victory: {
                  assetId: "biflyExpressionVictory",
                  path: "assets/generated/bifly-expression-victory.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                defeat: {
                  assetId: "biflyExpressionHit",
                  path: "assets/generated/bifly-expression-hit.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                eat: {
                  assetId: "biflyExpressionEat",
                  path: "assets/generated/bifly-expression-eat.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                },
                hit: {
                  assetId: "biflyExpressionHit",
                  path: "assets/generated/bifly-expression-hit.png",
                  dimensions: [512, 512],
                  safeArea: [36, 34, 440, 430]
                }
              }
            },
            "sprite-sheet": { states: {} },
            "layered-png-rig": { states: {} },
            rive: { states: {}, runtimeOptional: true },
            spine: { states: {}, runtimeOptional: true }
          }
        },
        nabatick: {
          id: "nabatick",
          displayName: "נבטיק",
          fallbackState: "idle",
          defaultAdapter: "static-png",
          lighting: {
            primary: "#a4f52d",
            secondary: "#ffd84a",
            glow: "rgba(164, 245, 45, 0.62)"
          },
          adapters: {
            "static-png": {
              sourceStatus: "free-generated-expression-frames-20260630",
              states: {
                idle: {
                  assetId: "nabatickExpressionIdle",
                  path: "assets/generated/nabatick-expression-idle.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                blink: {
                  assetId: "nabatickExpressionBlink",
                  path: "assets/generated/nabatick-expression-blink.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                tap: {
                  assetId: "nabatickExpressionBlink",
                  path: "assets/generated/nabatick-expression-blink.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                selected: {
                  assetId: "nabatickExpressionSelected",
                  path: "assets/generated/nabatick-expression-selected.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                excited: {
                  assetId: "nabatickExpressionVictory",
                  path: "assets/generated/nabatick-expression-victory.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                worried: {
                  assetId: "nabatickExpressionHit",
                  path: "assets/generated/nabatick-expression-hit.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                victory: {
                  assetId: "nabatickExpressionVictory",
                  path: "assets/generated/nabatick-expression-victory.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                defeat: {
                  assetId: "nabatickExpressionHit",
                  path: "assets/generated/nabatick-expression-hit.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                eat: {
                  assetId: "nabatickExpressionEat",
                  path: "assets/generated/nabatick-expression-eat.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                },
                hit: {
                  assetId: "nabatickExpressionHit",
                  path: "assets/generated/nabatick-expression-hit.png",
                  dimensions: [512, 512],
                  safeArea: [42, 28, 428, 430]
                }
              }
            },
            "sprite-sheet": { states: {} },
            "layered-png-rig": { states: {} },
            rive: { states: {}, runtimeOptional: true },
            spine: { states: {}, runtimeOptional: true }
          }
        }
      }
    },
    motion: {
      version: "phase6-20260629",
      controller: "ui/motion/motion-system.js",
      stylesheet: "ui/motion/motion.css",
      sourceStatus: "code-generated-css-motion",
      events: [
        "buttonPress",
        "buttonRelease",
        "screenEnter",
        "screenExit",
        "modalOpen",
        "modalClose",
        "sheetOpen",
        "sheetClose",
        "tabChange",
        "characterSelect",
        "characterTap",
        "reward",
        "scoreCountUp",
        "comboMilestone",
        "missionComplete",
        "lifeLost",
        "worldTransition",
        "badgeAppearance",
        "lockedFeedback",
        "newRecord"
      ],
      reducedMotion: "prefers-reduced-motion plus KaflulMotionSystem runtime class",
      particleLimit: 10
    },
    uiSounds: {
      version: "phase6-20260629",
      controller: "ui/sounds/ui-sound-controller.js",
      sourceStatus: "webaudio-generated-no-external-audio-files",
      externalAudioAssets: [],
      events: [
        "buttonPress",
        "primary-play",
        "panelOpen",
        "panelClose",
        "tabChange",
        "characterSelected",
        "modeSelected",
        "difficultySelected",
        "lockedAction",
        "notification",
        "reward",
        "newRecord"
      ],
      respectsMute: true,
      autoplaySafe: true
    },
    legacyCandidates: [
      "assets/nabatick-idle.png",
      "assets/nabatick-eat.png",
      "assets/nabatick-eat-prepare.png",
      "assets/nabatick-idle-front.webp",
      "assets/nabatick-idle-left.webp",
      "assets/nabatick-idle-right.webp",
      "assets/nabatick-eat-open.webp",
      "assets/nabatick-eat-prepare.webp",
      "assets/nabatick-idle-v2.svg",
      "assets/nabatick-eat-v2.svg",
      "assets/nabatick-eat-prepare-v2.svg",
      "assets/nabatick-selection-sheet.svg"
    ]
  };

  globalThis.KAFLUL_ASSET_MANIFEST = Object.freeze(manifest);
})();
