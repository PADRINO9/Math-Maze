#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "art-src", "maze", "ice", "v3");
const outputRoot = path.join(root, "assets", "maze", "ice", "v3");
const blenderScript = path.join(sourceRoot, "generate_ice_v3_blender.py");
const packerScript = path.join(root, "tools", "pack_ice_v3_runtime.py");
const localBlender = path.join(root, ".tools", "blender-4.5.11", "Blender.app", "Contents", "MacOS", "Blender");
const bundledPython = "/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

const blender = process.env.BLENDER || (existsSync(localBlender) ? localBlender : "blender");
const python = process.env.PYTHON || (existsSync(bundledPython) ? bundledPython : "python3");
const packOnly = process.argv.includes("--pack-only");

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  if (result.error) {
    throw new Error(`${label} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

if (!packOnly) {
  run(blender, ["--background", "--factory-startup", "--python", blenderScript], "Blender ice-v3 render");
}
run(python, [packerScript], "Ice-v3 atlas packer");

const atlasPath = path.join(outputRoot, "tileset.png");
const manifestPath = path.join(outputRoot, "tileset.json");
const provenancePath = path.join(outputRoot, "provenance.json");
const [atlasBytes, manifestBytes, provenanceBytes] = await Promise.all([
  readFile(atlasPath),
  readFile(manifestPath),
  readFile(provenancePath)
]);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const provenance = JSON.parse(provenanceBytes.toString("utf8"));
const requiredRoles = [
  ...Array.from({ length: 16 }, (_, mask) => `wallMask${mask}`),
  ...Array.from({ length: 4 }, (_, variant) => `floor${variant}`),
  ...Array.from({ length: 3 }, (_, variant) => `collectible${variant}`),
  "bonusCollectible",
  "powerCollectible"
];
const missingRoles = requiredRoles.filter((role) => !manifest.tiles?.[role]);
const atlasSha256 = sha256(atlasBytes);
const manifestSha256 = sha256(manifestBytes);

if (manifest.schemaVersion !== 3 || manifest.renderer !== "modular-v3") {
  throw new Error(`Unexpected runtime contract: ${JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    renderer: manifest.renderer
  })}`);
}
if (missingRoles.length) {
  throw new Error(`Runtime atlas is missing roles: ${missingRoles.join(", ")}`);
}
if (provenance.atlasSha256 !== atlasSha256 || provenance.manifestSha256 !== manifestSha256) {
  throw new Error("Runtime atlas provenance hashes do not match the generated files.");
}

console.log(JSON.stringify({
  ok: true,
  packOnly,
  atlas: path.relative(root, atlasPath),
  manifest: path.relative(root, manifestPath),
  renderer: manifest.renderer,
  schemaVersion: manifest.schemaVersion,
  requiredRoleCount: requiredRoles.length,
  atlasSha256,
  manifestSha256
}, null, 2));
