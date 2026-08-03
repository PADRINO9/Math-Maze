(() => {
  "use strict";

  const WORLD_IDS = ["ice", "lava", "ancient", "diamond"];
  const SYSTEM_VERSION = "phase6-deterministic-scatter-v1";

  const WORLD_DECOR_CONFIG = {
    ice: {
      density: { floor: 0.036, wall: 0.09, behind: 0.04 },
      mobileScale: 0.72,
      reducedScale: 0.62,
      maxItems: { phone: 56, desktop: 96 },
      floorTypes: ["frost-sparkle", "ice-shard"],
      wallTypes: ["ice-crystal", "snow-pile", "frozen-rock"],
      behindTypes: ["frost-haze"]
    },
    lava: {
      density: { floor: 0.038, wall: 0.11, behind: 0.062 },
      mobileScale: 0.72,
      reducedScale: 0.6,
      maxItems: { phone: 58, desktop: 98 },
      floorTypes: ["ember-crack", "hot-fragment"],
      wallTypes: ["basalt-chip", "smoke-vent", "lava-stone"],
      behindTypes: ["ash-smudge"]
    },
    ancient: {
      density: { floor: 0.034, wall: 0.086, behind: 0.038 },
      mobileScale: 0.7,
      reducedScale: 0.62,
      maxItems: { phone: 54, desktop: 92 },
      floorTypes: ["sand-dust", "tiny-rune"],
      wallTypes: ["broken-column", "jar", "rune-stone", "small-plant"],
      behindTypes: ["temple-chip"]
    },
    diamond: {
      density: { floor: 0.032, wall: 0.084, behind: 0.036 },
      mobileScale: 0.68,
      reducedScale: 0.6,
      maxItems: { phone: 52, desktop: 88 },
      floorTypes: ["prism-spark", "gem-chip"],
      wallTypes: ["crystal-cluster", "prism-stone", "reflective-shard"],
      behindTypes: ["crystal-haze"]
    }
  };

  const scatterCache = new Map();

  function normalizeWorldId(worldId) {
    return WORLD_IDS.includes(worldId) ? worldId : "ice";
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mix(seed, a = 0, b = 0, c = 0, d = 0) {
    let value = seed >>> 0;
    value ^= Math.imul(a + 1, 374761393);
    value ^= Math.imul(b + 1, 668265263);
    value ^= Math.imul(c + 1, 2246822519);
    value ^= Math.imul(d + 1, 3266489917);
    value ^= value >>> 15;
    value = Math.imul(value, 2246822519);
    value ^= value >>> 13;
    value = Math.imul(value, 3266489917);
    value ^= value >>> 16;
    return value >>> 0;
  }

  function noise(seed, x, y, salt = 0, variant = 0) {
    return mix(seed, x, y, salt, variant) / 4294967295;
  }

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function createMazeSignature(maze) {
    let hash = 2166136261;
    for (let y = 0; y < maze.length; y += 1) {
      const row = maze[y] || [];
      for (let x = 0; x < row.length; x += 1) {
        hash ^= row[x] ? 49 : 48;
        hash = Math.imul(hash, 16777619);
      }
      hash ^= 124;
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function isWall(maze, x, y, cols, rows) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) {
      return true;
    }
    return maze[y]?.[x] === 1;
  }

  function isExposedWall(maze, x, y, cols, rows) {
    return isWall(maze, x, y, cols, rows)
      && (!isWall(maze, x, y - 1, cols, rows)
        || !isWall(maze, x + 1, y, cols, rows)
        || !isWall(maze, x, y + 1, cols, rows)
        || !isWall(maze, x - 1, y, cols, rows));
  }

  function openNeighborCount(maze, x, y, cols, rows) {
    return [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y]
    ].reduce((count, cell) => count + (isWall(maze, cell[0], cell[1], cols, rows) ? 0 : 1), 0);
  }

  function addForbiddenCell(set, cell, radius, cols, rows) {
    if (!cell || Number.isNaN(cell.x) || Number.isNaN(cell.y)) {
      return;
    }
    const cx = Math.floor(cell.x);
    const cy = Math.floor(cell.y);
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if (x >= 0 && y >= 0 && x < cols && y < rows) {
          set.add(cellKey(x, y));
        }
      }
    }
  }

  function addForbiddenCells(set, cells, radius, cols, rows) {
    for (const cell of cells || []) {
      addForbiddenCell(set, cell, radius, cols, rows);
    }
  }

  function normalizeCellList(cells) {
    return (cells || [])
      .filter(Boolean)
      .map((cell) => ({ x: Math.floor(cell.x), y: Math.floor(cell.y) }));
  }

  function buildForbiddenSet(options) {
    const {
      cols,
      rows,
      playerStart,
      enemyStartCells = [],
      importantCells = [],
      collectibleCells = []
    } = options;
    const forbidden = new Set();
    addForbiddenCell(forbidden, playerStart, 2, cols, rows);
    addForbiddenCells(forbidden, enemyStartCells, 1, cols, rows);
    addForbiddenCells(forbidden, importantCells, 2, cols, rows);
    addForbiddenCells(forbidden, collectibleCells, 1, cols, rows);
    return forbidden;
  }

  function pickType(types, seed, x, y, salt) {
    if (!types.length) {
      return "decor";
    }
    const index = Math.min(types.length - 1, Math.floor(noise(seed, x, y, salt) * types.length));
    return types[index];
  }

  function makeDecorItem(options) {
    const { worldId, seed, x, y, layer, anchor, type, salt } = options;
    const centered = layer !== "floor";
    const offsetX = centered ? 0.5 + (noise(seed, x, y, salt + 1) - 0.5) * 0.28 : 0.5 + (noise(seed, x, y, salt + 1) - 0.5) * 0.42;
    const offsetY = centered ? 0.5 + (noise(seed, x, y, salt + 2) - 0.5) * 0.22 : 0.5 + (noise(seed, x, y, salt + 2) - 0.5) * 0.38;
    const scale = (layer === "floor" ? 0.38 : layer === "behind" ? 0.62 : 0.58)
      + noise(seed, x, y, salt + 3) * (layer === "floor" ? 0.16 : 0.24);
    const alpha = (layer === "floor" ? 0.22 : layer === "behind" ? 0.16 : 0.34)
      + noise(seed, x, y, salt + 4) * (layer === "floor" ? 0.1 : 0.16);
    const variant = Math.floor(noise(seed, x, y, salt + 5) * 4);

    return {
      id: `${worldId}:${x}:${y}:${layer}:${type}`,
      worldId,
      x,
      y,
      layer,
      anchor,
      type,
      offsetX,
      offsetY,
      scale,
      alpha,
      variant
    };
  }

  function generateScatter(options = {}) {
    const {
      maze = [],
      worldId: rawWorldId = "ice",
      levelIndex = 0,
      cols = 0,
      rows = 0,
      playerStart = null,
      enemyStartCells = [],
      importantCells = [],
      collectibleCells = [],
      densityScale = 1,
      phonePortrait = false,
      reducedEffects = false,
      disabled = false
    } = options;

    const worldId = normalizeWorldId(rawWorldId);
    const config = WORLD_DECOR_CONFIG[worldId];
    const mazeSignature = createMazeSignature(maze);
    const seed = hashString(`${SYSTEM_VERSION}:${worldId}:${levelIndex}:${mazeSignature}`);
    const cacheKey = [
      SYSTEM_VERSION,
      worldId,
      levelIndex,
      mazeSignature,
      phonePortrait ? "phone" : "wide",
      reducedEffects ? "reduced" : "full",
      densityScale.toFixed(2),
      normalizeCellList(enemyStartCells).map((cell) => cellKey(cell.x, cell.y)).join("|"),
      normalizeCellList(collectibleCells).map((cell) => cellKey(cell.x, cell.y)).join("|")
    ].join(":");

    if (disabled || !cols || !rows || !maze.length) {
      return { items: [], signature: cacheKey, seed, mazeSignature };
    }

    if (scatterCache.has(cacheKey)) {
      return scatterCache.get(cacheKey);
    }

    const forbidden = buildForbiddenSet({
      cols,
      rows,
      playerStart,
      enemyStartCells,
      importantCells,
      collectibleCells
    });
    const scale = densityScale
      * (phonePortrait ? config.mobileScale : 1)
      * (reducedEffects ? config.reducedScale : 1);
    const maxItems = phonePortrait ? config.maxItems.phone : config.maxItems.desktop;
    const items = [];

    for (let y = 1; y < rows - 1; y += 1) {
      for (let x = 1; x < cols - 1; x += 1) {
        const key = cellKey(x, y);
        if (forbidden.has(key)) {
          continue;
        }

        const wall = isWall(maze, x, y, cols, rows);
        const exposedWall = wall && isExposedWall(maze, x, y, cols, rows);
        const outerBorder = x <= 2 || y <= 2 || x >= cols - 3 || y >= rows - 3;
        let layer = null;
        let anchor = null;
        let density = 0;
        let types = null;

        if (wall && exposedWall) {
          layer = noise(seed, x, y, 71) < 0.34 ? "behind" : "wall";
          anchor = outerBorder ? "outer-border" : "wall-top";
          density = (layer === "behind" ? config.density.behind : config.density.wall) * scale;
          types = layer === "behind" ? config.behindTypes : config.wallTypes;
        } else if (wall && outerBorder) {
          layer = "behind";
          anchor = "outer-border";
          density = config.density.behind * scale;
          types = config.behindTypes;
        } else if (!wall && openNeighborCount(maze, x, y, cols, rows) >= 2) {
          layer = "floor";
          anchor = "floor-flat";
          density = config.density.floor * scale;
          types = config.floorTypes;
        } else {
          continue;
        }

        const roll = noise(seed, x, y, 17);
        if (roll > density) {
          continue;
        }

        const type = pickType(types, seed, x, y, 31);
        items.push(makeDecorItem({ worldId, seed, x, y, layer, anchor, type, salt: 43 }));
        if (items.length >= maxItems) {
          y = rows;
          break;
        }
      }
    }

    items.sort((a, b) => a.layer.localeCompare(b.layer) || a.y - b.y || a.x - b.x);
    const result = { items, signature: cacheKey, seed, mazeSignature };
    scatterCache.set(cacheKey, result);
    if (scatterCache.size > 24) {
      const firstKey = scatterCache.keys().next().value;
      scatterCache.delete(firstKey);
    }
    return result;
  }

  function getDecorConfig(worldId = "ice") {
    return WORLD_DECOR_CONFIG[normalizeWorldId(worldId)];
  }

  window.KaflulMazeDecorSystem = {
    version: SYSTEM_VERSION,
    getDecorConfig,
    generateScatter,
    createMazeSignature,
    noise
  };
})();
