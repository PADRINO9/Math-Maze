import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync
} from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(rootDir, "dist", "android-www");

const rootFiles = [
  "index.html",
  "app.webmanifest",
  "styles.css",
  "arcade-foundation.css",
  "leaderboard.css",
  "main-menu.css",
  "kaflul-systems.js",
  "maze-theme-system.js",
  "maze-decor-system.js",
  "maze-tile-topology.js",
  "maze-axonometric-projection.js",
  "game.js",
  "maze-enhancements.js",
  "mobile-enhancements.js",
  "mobile-screen-state.js",
  "mobile-question-state.js",
  "mobile-native-answer.js",
  "poster-loader.js"
];

const directories = [
  "assets",
  "ui"
];

const excludedBundlePatterns = [
  /^assets\/blender\//,
  /^assets\/generated\/blender\//,
  /^assets\/generated\/blender-preview\//,
  /^assets\/generated\/(?:bifly|nabatick)-expression-sheet(?:-source)?\.png$/,
  /^assets\/generated\/expression-frames-preview\.jpg$/,
  /^assets\/generated\/kaflul-(?:arcade-chests-v1-source|champion-trophy-source-v2)\.png$/,
  // Authoring/reference images are kept in the repository but are not loaded
  // by the production runtime. Excluding them keeps the installable APK below
  // Telegram's 50 MiB Bot API limit without reducing playable asset quality.
  /^assets\/maze\/world1\/sun-garden\/board-v1\.png$/,
  /^assets\/maze\/ice\/v3\/contact-sheet\.png$/,
  /^assets\/maze\/ice\/v3\/validation-failure\.json$/,
  /^assets\/bosses\/stage-[1-4]-boss\.png$/,
  /^assets\/bosses\/tar-heavy-boss-sheet\.jpg$/,
  /^assets\/reference\/(?:bifly-character-sheet|nabatick-character-sheet)\.jpg$/,
  /^assets\/reference\/boss-actor-animation-reference\.png$/,
  /^assets\/poster-parts\//,
  /^assets\/maze\/README\.md$/
];

function fail(message) {
  console.error(`[android:webdir] ${message}`);
  process.exit(1);
}

function copyProjectFile(relativePath) {
  const source = join(rootDir, relativePath);
  if (!existsSync(source)) {
    fail(`missing source file: ${relativePath}`);
  }

  const destination = join(outDir, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
}

function copyProjectDirectory(relativePath) {
  const source = join(rootDir, relativePath);
  if (!existsSync(source)) {
    fail(`missing source directory: ${relativePath}`);
  }

  cpSync(source, join(outDir, relativePath), { recursive: true });
}

function listFiles(startDir) {
  const entries = [];
  const stack = [startDir];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile()) {
        entries.push(absolute);
      }
    }
  }

  return entries;
}

function cleanAssetReference(rawReference) {
  const reference = rawReference.trim().replace(/^["']|["']$/g, "");
  if (
    reference === ""
    || reference.startsWith("#")
    || reference.startsWith("data:")
    || reference.startsWith("http:")
    || reference.startsWith("https:")
    || reference.startsWith("mailto:")
    || reference.startsWith("tel:")
  ) {
    return null;
  }

  return reference.split("#")[0].split("?")[0];
}

function resolveBundleReference(ownerFile, rawReference) {
  const cleaned = cleanAssetReference(rawReference);
  if (!cleaned) return null;

  const normalizedReference = cleaned.startsWith("/")
    ? cleaned.slice(1)
    : relative(outDir, resolve(dirname(ownerFile), cleaned));

  if (normalizedReference.startsWith("..")) {
    return null;
  }

  return normalize(normalizedReference);
}

function collectHtmlReferences(file) {
  const html = readFileSync(file, "utf8");
  const references = [];
  const attributePattern = /\b(?:href|src)=["']([^"']+)["']/g;
  let match;

  while ((match = attributePattern.exec(html)) !== null) {
    references.push(match[1]);
  }

  return references;
}

function collectCssReferences(file) {
  const css = readFileSync(file, "utf8");
  const references = [];
  const urlPattern = /url\(([^)]+)\)/g;
  let match;

  while ((match = urlPattern.exec(css)) !== null) {
    references.push(match[1]);
  }

  return references;
}

function verifyReferences() {
  const missing = [];
  const files = listFiles(outDir);

  for (const file of files) {
    const extension = extname(file);
    const references = extension === ".html"
      ? collectHtmlReferences(file)
      : extension === ".css"
        ? collectCssReferences(file)
        : [];

    for (const reference of references) {
      const relativeReference = resolveBundleReference(file, reference);
      if (!relativeReference) continue;

      const target = join(outDir, relativeReference);
      if (!existsSync(target)) {
        missing.push({
          owner: relative(outDir, file),
          reference,
          target: relativeReference
        });
      }
    }
  }

  if (missing.length > 0) {
    fail(`missing bundled references:\n${JSON.stringify(missing, null, 2)}`);
  }
}

function pruneExcludedBundleFiles() {
  for (const file of listFiles(outDir)) {
    const relativeFile = relative(outDir, file).replaceAll("\\", "/");
    if (excludedBundlePatterns.some((pattern) => pattern.test(relativeFile))) {
      rmSync(file, { force: true });
    }
  }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const file of rootFiles) {
  copyProjectFile(file);
}

for (const directory of directories) {
  copyProjectDirectory(directory);
}

pruneExcludedBundleFiles();
verifyReferences();

const copiedFileCount = listFiles(outDir).length;
console.log(`[android:webdir] prepared ${relative(rootDir, outDir)} with ${copiedFileCount} files`);
