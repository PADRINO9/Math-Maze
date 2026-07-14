import { realpath } from "node:fs/promises";
import path from "node:path";

function isOutside(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === ".."
    || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath);
}

export async function resolveStaticFile(rootPath, urlPath, options = {}) {
  const indexFile = options.indexFile || "index.html";
  const decodedPath = decodeURIComponent(urlPath === "/" ? `/${indexFile}` : urlPath);
  const relativePath = decodedPath.replace(/^[/\\]+/, "");
  const segments = relativePath.split(/[/\\]+/).filter(Boolean);

  if (!relativePath || segments.some((segment) => segment.startsWith("."))) {
    throw new Error("Static path is not public");
  }

  const realRoot = await realpath(rootPath);
  const realCandidate = await realpath(path.resolve(realRoot, relativePath));
  if (isOutside(realRoot, realCandidate)) {
    throw new Error("Static path escapes root");
  }

  return realCandidate;
}
