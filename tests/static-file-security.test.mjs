import assert from "node:assert/strict";
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveStaticFile } from "../tools/static-file-security.mjs";

test("resolveStaticFile serves regular public files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "kaflul-static-"));
  try {
    await writeFile(path.join(root, "index.html"), "ok");
    assert.equal(await resolveStaticFile(root, "/"), await realpath(path.join(root, "index.html")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resolveStaticFile rejects dotfiles, traversal and escaping symlinks", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "kaflul-static-"));
  const root = path.join(parent, "public");
  const outside = path.join(parent, "public-private");
  await mkdir(root);
  await mkdir(outside);
  await writeFile(path.join(root, "index.html"), "ok");
  await writeFile(path.join(root, ".env"), "not-read");
  await writeFile(path.join(outside, "secret.txt"), "not-read");
  await symlink(path.join(outside, "secret.txt"), path.join(root, "linked.txt"));

  try {
    await assert.rejects(resolveStaticFile(root, "/.env"));
    await assert.rejects(resolveStaticFile(root, "/%2e%2e%2fpublic-private/secret.txt"));
    await assert.rejects(resolveStaticFile(root, "/linked.txt"));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
