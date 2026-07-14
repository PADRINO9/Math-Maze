const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const topology = require("../maze-tile-topology");

test("classifies all 16 N/E/S/W masks with stable unique ids", () => {
  assert.equal(topology.CLASSIFICATIONS.length, 16);
  assert.equal(new Set(topology.CLASSIFICATIONS.map((entry) => entry.id)).size, 16);

  for (let mask = 0; mask < 16; mask += 1) {
    const classification = topology.classifyMask(mask);
    assert.equal(classification.mask, mask);
    assert.equal(classification.atlasIndex, mask);
    assert.equal(topology.CLASSIFICATION_BY_ID[classification.id], classification);
  }
});

test("maps masks to canonical families and clockwise rotations", () => {
  assert.deepEqual(
    [1, 2, 4, 8].map((mask) => {
      const tile = topology.classifyMask(mask);
      return [tile.type, tile.rotation];
    }),
    [["end", 0], ["end", 90], ["end", 180], ["end", 270]]
  );
  assert.deepEqual(
    [3, 6, 12, 9].map((mask) => topology.classifyMask(mask).rotation),
    [0, 90, 180, 270]
  );
  assert.deepEqual(
    [7, 14, 13, 11].map((mask) => topology.classifyMask(mask).rotation),
    [0, 90, 180, 270]
  );
});

test("round-trips connection objects through the four-bit mask", () => {
  for (let mask = 0; mask < 16; mask += 1) {
    assert.equal(topology.maskFromConnections(topology.connectionsFromMask(mask)), mask);
  }
  assert.equal(topology.maskFromConnections({ N: true, S: true }), 5);
  assert.equal(topology.classifyMask(5).id, "straight-ns");
});

test("reads cross, corner and outside connectivity from a maze grid", () => {
  const grid = [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0]
  ];

  assert.equal(topology.getMaskAt(grid, 1, 1), 15);
  assert.equal(topology.getMaskAt(grid, 1, 0), 4);
  assert.equal(topology.getMaskAt([[1]], 0, 0), 0);
  assert.equal(topology.getMaskAt([[1]], 0, 0, { outsideIsWall: true }), 15);
});

test("supports custom wall predicates without changing the source grid", () => {
  const grid = [
    ["open", "ice", "open"],
    ["ice", "ice", "open"]
  ];
  const before = JSON.stringify(grid);
  const options = { isWall: (value) => value === "ice" };

  assert.equal(topology.getMaskAt(grid, 1, 1, options), 9);
  const built = topology.buildTopology(grid, options);
  assert.equal(built[0][0], null);
  assert.equal(built[1][1].id, "corner-nw");
  assert.equal(JSON.stringify(grid), before);
});

test("variant selection is deterministic, bounded and spatially varied", () => {
  const first = topology.getVariantIndex({ x: 9, y: 4, mask: 10, seed: "ice-world", variantCount: 5 });
  const second = topology.getVariantIndex({ x: 9, y: 4, mask: 10, seed: "ice-world", variantCount: 5 });
  assert.equal(first, second);
  assert.ok(first >= 0 && first < 5);

  const spatialVariants = new Set();
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      spatialVariants.add(topology.getVariantIndex({ x, y, mask: 10, seed: "ice-world", variantCount: 5 }));
    }
  }
  assert.ok(spatialVariants.size >= 4);
  assert.equal(
    topology.selectVariant(["clean", "cracked", "bubbled"], { x: 2, y: 7, mask: 3, seed: 42 }),
    topology.selectVariant(["clean", "cracked", "bubbled"], { x: 2, y: 7, mask: 3, seed: 42 })
  );
});

test("buildTopology returns renderer descriptors only for wall cells", () => {
  const grid = [
    [1, 1, 0],
    [0, 1, 1]
  ];
  const built = topology.buildTopology(grid, {
    variantSeed: "level-1",
    variantCount: { straight: 3, corner: 2, end: 4, default: 1 }
  });

  assert.equal(built[0][2], null);
  assert.equal(built[1][0], null);
  assert.deepEqual(
    Object.keys(built[0][0]).sort(),
    ["atlasIndex", "connections", "id", "mask", "rotation", "type", "variant", "x", "y"].sort()
  );
  assert.equal(built[0][0].id, "end-e");
  assert.equal(built[0][1].id, "corner-sw");
  assert.ok(built[0][0].variant < 4);
  assert.ok(built[0][1].variant < 2);
});

test("publishes the same API as a standalone browser global", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../maze-tile-topology.js"), "utf8");
  const sandbox = {};
  vm.runInNewContext(source, sandbox, { filename: "maze-tile-topology.js" });

  assert.equal(typeof sandbox.KaflulMazeTileTopology.buildTopology, "function");
  assert.equal(sandbox.KaflulMazeTileTopology.classifyMask(10).id, "straight-ew");
});

test("rejects invalid masks, coordinates, grids and variant counts", () => {
  assert.throws(() => topology.classifyMask(-1), RangeError);
  assert.throws(() => topology.classifyMask(16), RangeError);
  assert.throws(() => topology.getMaskAt([[1]], 0.5, 0), TypeError);
  assert.throws(() => topology.getVariantIndex({ variantCount: 0 }), RangeError);
  assert.throws(() => topology.selectVariant([]), TypeError);
  assert.throws(() => topology.buildTopology("not-a-grid"), TypeError);
  assert.throws(() => topology.buildTopology([[1], null]), TypeError);
});
