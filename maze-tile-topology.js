(function attachMazeTileTopology(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  root.KaflulMazeTileTopology = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMazeTileTopology() {
  "use strict";

  // Contract: connected wall neighbours use N=1, E=2, S=4, W=8.
  // A renderer can address an atlas directly by `mask`, or draw one canonical
  // `type` rotated clockwise by `rotation` degrees.
  const DIRECTION_BITS = Object.freeze({ N: 1, E: 2, S: 4, W: 8 });
  const DIRECTION_OFFSETS = Object.freeze({
    N: Object.freeze({ x: 0, y: -1 }),
    E: Object.freeze({ x: 1, y: 0 }),
    S: Object.freeze({ x: 0, y: 1 }),
    W: Object.freeze({ x: -1, y: 0 })
  });

  const TILE_DEFINITIONS = [
    [0, "isolated", "isolated", 0, ""],
    [1, "end-n", "end", 0, "N"],
    [2, "end-e", "end", 90, "E"],
    [3, "corner-ne", "corner", 0, "NE"],
    [4, "end-s", "end", 180, "S"],
    [5, "straight-ns", "straight", 0, "NS"],
    [6, "corner-es", "corner", 90, "ES"],
    [7, "tee-nes", "tee", 0, "NES"],
    [8, "end-w", "end", 270, "W"],
    [9, "corner-nw", "corner", 270, "NW"],
    [10, "straight-ew", "straight", 90, "EW"],
    [11, "tee-new", "tee", 270, "NEW"],
    [12, "corner-sw", "corner", 180, "SW"],
    [13, "tee-nsw", "tee", 180, "NSW"],
    [14, "tee-esw", "tee", 90, "ESW"],
    [15, "cross-nesw", "cross", 0, "NESW"]
  ];

  const CLASSIFICATIONS = Object.freeze(TILE_DEFINITIONS.map((definition) => Object.freeze({
    mask: definition[0],
    atlasIndex: definition[0],
    id: definition[1],
    type: definition[2],
    rotation: definition[3],
    connections: definition[4]
  })));

  const CLASSIFICATION_BY_ID = Object.freeze(Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [classification.id, classification])
  ));

  function normalizeMask(mask) {
    if (!Number.isInteger(mask) || mask < 0 || mask > 15) {
      throw new RangeError("Maze tile mask must be an integer from 0 to 15.");
    }
    return mask;
  }

  function classifyMask(mask) {
    return CLASSIFICATIONS[normalizeMask(mask)];
  }

  function maskFromConnections(connections = {}) {
    return (connections.N ? DIRECTION_BITS.N : 0)
      | (connections.E ? DIRECTION_BITS.E : 0)
      | (connections.S ? DIRECTION_BITS.S : 0)
      | (connections.W ? DIRECTION_BITS.W : 0);
  }

  function connectionsFromMask(mask) {
    const normalizedMask = normalizeMask(mask);
    return {
      N: Boolean(normalizedMask & DIRECTION_BITS.N),
      E: Boolean(normalizedMask & DIRECTION_BITS.E),
      S: Boolean(normalizedMask & DIRECTION_BITS.S),
      W: Boolean(normalizedMask & DIRECTION_BITS.W)
    };
  }

  function defaultIsWall(value) {
    return value === 1 || value === true;
  }

  function isWallAt(grid, x, y, options) {
    const row = Array.isArray(grid) && y >= 0 && y < grid.length ? grid[y] : null;
    if (!Array.isArray(row) || x < 0 || x >= row.length) {
      return Boolean(options.outsideIsWall);
    }
    return Boolean(options.isWall(row[x], x, y, grid));
  }

  /**
   * Returns the N/E/S/W neighbour mask at a grid coordinate. By default a
   * wall is the value `1` (or `true`) and cells outside the grid are open.
   */
  function getMaskAt(grid, x, y, options = {}) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError("Maze tile coordinates must be integers.");
    }
    const resolvedOptions = {
      isWall: typeof options.isWall === "function" ? options.isWall : defaultIsWall,
      outsideIsWall: options.outsideIsWall === true
    };

    return (isWallAt(grid, x, y - 1, resolvedOptions) ? DIRECTION_BITS.N : 0)
      | (isWallAt(grid, x + 1, y, resolvedOptions) ? DIRECTION_BITS.E : 0)
      | (isWallAt(grid, x, y + 1, resolvedOptions) ? DIRECTION_BITS.S : 0)
      | (isWallAt(grid, x - 1, y, resolvedOptions) ? DIRECTION_BITS.W : 0);
  }

  function seedToUint32(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return Math.trunc(seed) >>> 0;
    }

    const text = String(seed ?? "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mixUint32(hash, value) {
    let mixed = (hash ^ (value >>> 0)) >>> 0;
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
    return (mixed ^ (mixed >>> 16)) >>> 0;
  }

  /**
   * Selects a stable visual variant without Math.random(). The same world
   * seed, channel, coordinates and mask always produce the same index.
   */
  function getVariantIndex({ x = 0, y = 0, mask = 0, seed = 0, channel = 0, variantCount = 1 } = {}) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError("Variant coordinates must be integers.");
    }
    if (!Number.isInteger(variantCount) || variantCount < 1) {
      throw new RangeError("variantCount must be a positive integer.");
    }

    let hash = seedToUint32(seed);
    hash = mixUint32(hash, x);
    hash = mixUint32(hash, y);
    hash = mixUint32(hash, normalizeMask(mask));
    hash = mixUint32(hash, seedToUint32(channel));
    return hash % variantCount;
  }

  function selectVariant(variants, options = {}) {
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new TypeError("variants must be a non-empty array.");
    }
    return variants[getVariantIndex({ ...options, variantCount: variants.length })];
  }

  function resolveVariantCount(specification, classification, x, y) {
    let value = specification;
    if (typeof value === "function") {
      value = value(classification, x, y);
    } else if (value && typeof value === "object") {
      value = value[classification.id] ?? value[classification.type] ?? value.default;
    }
    if (value === undefined) value = 1;
    if (!Number.isInteger(value) || value < 1) {
      throw new RangeError("Resolved tile variant count must be a positive integer.");
    }
    return value;
  }

  /**
   * Returns a renderer-ready descriptor for one coordinate. Gameplay state is
   * never mutated; this module only interprets the supplied wall grid.
   */
  function classifyCell(grid, x, y, options = {}) {
    const mask = getMaskAt(grid, x, y, options);
    const classification = classifyMask(mask);
    const variantCount = resolveVariantCount(options.variantCount, classification, x, y);
    return {
      x,
      y,
      ...classification,
      variant: getVariantIndex({
        x,
        y,
        mask,
        seed: options.variantSeed ?? 0,
        channel: options.variantChannel ?? 0,
        variantCount
      })
    };
  }

  /**
   * Builds a 2D descriptor grid. Open cells are `null`; wall cells contain
   * `{ mask, id, type, rotation, variant, ... }` for direct atlas rendering.
   */
  function buildTopology(grid, options = {}) {
    if (!Array.isArray(grid)) {
      throw new TypeError("Maze grid must be an array of rows.");
    }
    const isWall = typeof options.isWall === "function" ? options.isWall : defaultIsWall;
    return grid.map((row, y) => {
      if (!Array.isArray(row)) {
        throw new TypeError(`Maze grid row ${y} must be an array.`);
      }
      return row.map((value, x) => (
        isWall(value, x, y, grid)
          ? classifyCell(grid, x, y, { ...options, isWall })
          : null
      ));
    });
  }

  return Object.freeze({
    DIRECTION_BITS,
    DIRECTION_OFFSETS,
    CLASSIFICATIONS,
    CLASSIFICATION_BY_ID,
    classifyMask,
    maskFromConnections,
    connectionsFromMask,
    getMaskAt,
    getVariantIndex,
    selectVariant,
    classifyCell,
    buildTopology
  });
});
