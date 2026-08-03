import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gameSource = await readFile(path.join(root, "game.js"), "utf8");

const EXPECTED = Object.freeze({
  baselineId: "world1-sun-garden-approved-v2",
  authoredBoardSrc: "assets/maze/world1/sun-garden/board-v3.png",
  authoredBoardSha256: "f114291caf2ccf0f62db575be3809b750439d61fa07db65fbf086c3c8cd7bd63",
  navigationVersion: "world1-canonical-semantic-layout-v6",
  topologySha256: "9d34bb2e464b860aed3361acc096955719edc3efc27f6c11234d13a0f41ef1b4",
  rows: 30,
  cols: 40,
  walkableCellCount: 585,
  chestCell: { x: 23, y: 18 },
  actorScale: {
    playerPhone: 0.9,
    playerWide: 0.88,
    enemyPhone: 0.72,
    enemyWide: 0.7
  },
  gameplayZoom: {
    desktop: 1.06,
    phonePortrait: 1.05,
    phoneLandscape: 1.07,
    tablet: 1.05
  }
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function extractMazeRows() {
  const block = gameSource.match(
    /const WORLD_ONE_GAMEPLAY_MAZE_ROWS = Object\.freeze\(\[([\s\S]*?)\n  \]\);/
  );
  assert.ok(block, "world one canonical maze rows must remain declared");
  return Array.from(block[1].matchAll(/"([#.]+)"/g), (match) => match[1]);
}

test("approved world one art and gameplay topology remain locked", async () => {
  const rows = extractMazeRows();
  const boardBytes = await readFile(path.join(root, EXPECTED.authoredBoardSrc));

  assert.equal(rows.length, EXPECTED.rows);
  assert.ok(rows.every((row) => row.length === EXPECTED.cols));
  assert.equal(
    rows.reduce((count, row) => count + Array.from(row).filter((cell) => cell === ".").length, 0),
    EXPECTED.walkableCellCount
  );
  assert.equal(sha256(rows.join("\n")), EXPECTED.topologySha256);
  assert.equal(sha256(boardBytes), EXPECTED.authoredBoardSha256);
});

test("approved world one identity, chest, and actor scale remain locked", () => {
  const baselineBlock = gameSource.match(
    /const WORLD_ONE_RELEASE_BASELINE = Object\.freeze\(\{([\s\S]*?)\n  \}\);/
  );
  assert.ok(baselineBlock, "world one release baseline must remain declared");
  assert.match(baselineBlock[1], new RegExp(`id: "${EXPECTED.baselineId}"`));
  assert.match(baselineBlock[1], /locked: true/);
  assert.match(baselineBlock[1], new RegExp(`authoredBoardSrc: "${EXPECTED.authoredBoardSrc.replaceAll("/", "\\/")}"`));
  assert.match(baselineBlock[1], new RegExp(`navigationVersion: "${EXPECTED.navigationVersion}"`));
  assert.match(
    baselineBlock[1],
    new RegExp(`chestCell: Object\\.freeze\\(\\{ x: ${EXPECTED.chestCell.x}, y: ${EXPECTED.chestCell.y} \\}\\)`)
  );
  for (const [name, value] of Object.entries(EXPECTED.actorScale)) {
    assert.match(baselineBlock[1], new RegExp(`${name}: ${value}`));
  }
  for (const [name, value] of Object.entries(EXPECTED.gameplayZoom)) {
    assert.match(baselineBlock[1], new RegExp(`${name}: ${value}`));
  }
  assert.match(
    gameSource,
    /const WORLD_ONE_AUTHORED_ACTOR_SCALE = WORLD_ONE_RELEASE_BASELINE\.actorScale;/
  );
  assert.match(
    gameSource,
    /return \{ \.\.\.WORLD_ONE_RELEASE_BASELINE\.chestCell \};/
  );
  assert.match(
    gameSource,
    /let zoom = WORLD_ONE_RELEASE_BASELINE\.gameplayZoom\.desktop;/
  );
});

test("regular ghosts omit the redundant question badge while the boss cue remains", () => {
  const overlayBlock = gameSource.match(
    /function drawFirstMazeQuestionGateOverlays\(\) \{([\s\S]*?)\n  \}/
  );
  assert.ok(overlayBlock, "question cue overlay must remain declared");
  assert.match(overlayBlock[1], /const actors = state\.boss \? \[state\.boss\] : \[\];/);
  assert.doesNotMatch(overlayBlock[1], /state\.enemies/);

  const bossCueBlock = gameSource.match(
    /function drawBossActorQuestionCue\([\s\S]*?\n  \}/
  );
  assert.ok(bossCueBlock, "boss question cue must remain declared");
  assert.match(bossCueBlock[0], /fillText\("\?"/);
});
