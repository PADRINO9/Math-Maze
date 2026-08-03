const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projection = require("../maze-axonometric-projection");

test("calibrates the shared maze camera to the supplied 3/4 reference angle", () => {
  assert.equal(projection.CAMERA.azimuthDegrees, 10);
  assert.equal(projection.CAMERA.elevationDegrees, 56);
  assert.equal(projection.CAMERA.tiltFromVerticalDegrees, 34);
});

test("projects wall height proportionally without moving gameplay coordinates", () => {
  const small = projection.computeProjection(20);
  const large = projection.computeProjection(40);
  assert.ok(Math.abs(small.southDepth * 2 - large.southDepth) < 1e-10);
  assert.ok(small.southDepth > small.eastDepth);
  assert.ok(small.southDepth > 5 && small.southDepth < 6);
  assert.equal(small.elevationDegrees + small.tiltFromVerticalDegrees, 90);
});

test("supports deterministic camera overrides and rejects invalid inputs", () => {
  const custom = projection.computeProjection(32, {
    elevationDegrees: 60,
    wallHeightInTiles: 0.6,
    eastFaceBias: 0.25
  });
  assert.ok(Math.abs(custom.southDepth - 9.6) < 1e-10);
  assert.ok(Math.abs(custom.eastDepth - 2.4) < 1e-10);
  assert.throws(() => projection.computeProjection(0), RangeError);
  assert.throws(() => projection.computeProjection(20, { elevationDegrees: 90 }), RangeError);
});

test("publishes the same API as a standalone browser global", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../maze-axonometric-projection.js"), "utf8");
  const sandbox = {};
  vm.runInNewContext(source, sandbox, { filename: "maze-axonometric-projection.js" });
  assert.equal(typeof sandbox.KaflulMazeAxonometric.computeProjection, "function");
  assert.equal(sandbox.KaflulMazeAxonometric.CAMERA.azimuthDegrees, 10);
});
