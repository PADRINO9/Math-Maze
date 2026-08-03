#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tileSize = 216;
const roles = [
  "floor", "floorAlt", "wall", "wallAlt",
  "edgeN", "edgeE", "edgeS", "edgeW",
  "cornerNE", "cornerSE", "cornerSW", "cornerNW",
  "decorA", "decorB"
];

const worlds = {
  ice: {
    floor: ["#071a2d", "#123c5d", "#1d6687"],
    wall: ["#f5feff", "#8ed9ee", "#2f7fa7", "#0c315a"],
    accent: "#dffbff",
    glow: "#72dcff",
    dark: "#04152a"
  },
  lava: {
    floor: ["#080507", "#1d1011", "#3a1b17"],
    wall: ["#5b5558", "#2d272b", "#171318", "#060507"],
    accent: "#ffcb69",
    glow: "#ff531f",
    dark: "#050304"
  },
  ancient: {
    floor: ["#201c14", "#51462f", "#776341"],
    wall: ["#ead89f", "#b2945d", "#765b36", "#30251a"],
    accent: "#ecdbad",
    glow: "#36d9bd",
    dark: "#18140e"
  },
  diamond: {
    floor: ["#080b23", "#1b245c", "#303d92"],
    wall: ["#effdff", "#8bdff3", "#7669d1", "#252264"],
    accent: "#eaffff",
    glow: "#ef82e8",
    dark: "#08091f"
  }
};

const sourceSheets = {
  ice: "Wall-Glass_02-64x64.png",
  lava: "Wall-Stone_02-64x64.png",
  ancient: "Wall-Sand_02-64x64.png",
  diamond: "Wall-Glass_03-64x64.png"
};

function buildMetadata(worldId) {
  return {
    worldId,
    tileSize,
    atlas: "tileset.png",
    tiles: Object.fromEntries(roles.map((role, index) => [role, {
      x: index * tileSize,
      y: 0,
      w: tileSize,
      h: tileSize
    }]))
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: tileSize * roles.length, height: tileSize } });
  for (const [worldId, palette] of Object.entries(worlds)) {
    const sourceBytes = await readFile(path.join(root, "assets", "maze", "source-cc0-sbs", sourceSheets[worldId]));
    const sourceDataUrl = `data:image/png;base64,${sourceBytes.toString("base64")}`;
    const dataUrl = await page.evaluate(async ({ worldId, palette, roles, tileSize, sourceDataUrl }) => {
      const canvas = document.createElement("canvas");
      canvas.width = tileSize * roles.length;
      canvas.height = tileSize;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const sourceImage = new Image();
      sourceImage.src = sourceDataUrl;
      await sourceImage.decode();

      const hash = (text) => {
        let value = 2166136261;
        for (let index = 0; index < text.length; index += 1) {
          value ^= text.charCodeAt(index);
          value = Math.imul(value, 16777619);
        }
        return value >>> 0;
      };
      const randomFactory = (seedText) => {
        let state = hash(seedText) || 1;
        return () => {
          state ^= state << 13;
          state ^= state >>> 17;
          state ^= state << 5;
          return (state >>> 0) / 4294967296;
        };
      };
      const rounded = (context, x, y, width, height, radius) => {
        const r = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + width - r, y);
        context.quadraticCurveTo(x + width, y, x + width, y + r);
        context.lineTo(x + width, y + height - r);
        context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        context.lineTo(x + r, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
      };
      const chamfered = (context, x, y, width, height, cut) => {
        context.beginPath();
        context.moveTo(x + cut, y);
        context.lineTo(x + width - cut, y);
        context.lineTo(x + width, y + cut);
        context.lineTo(x + width, y + height - cut);
        context.lineTo(x + width - cut, y + height);
        context.lineTo(x + cut, y + height);
        context.lineTo(x, y + height - cut);
        context.lineTo(x, y + cut);
        context.closePath();
      };
      const addSurfaceNoise = (context, random, x, y, width, height, light, dark, count = 170) => {
        for (let index = 0; index < count; index += 1) {
          const px = x + random() * width;
          const py = y + random() * height;
          const radius = 0.35 + random() * 1.5;
          context.globalAlpha = 0.025 + random() * 0.09;
          context.fillStyle = random() > 0.46 ? light : dark;
          context.beginPath();
          context.arc(px, py, radius, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      };
      const drawCrack = (context, points, color, width, glow = 0) => {
        context.save();
        context.strokeStyle = color;
        context.lineWidth = width;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.shadowColor = color;
        context.shadowBlur = glow;
        context.beginPath();
        points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
        context.stroke();
        context.restore();
      };

      const drawFloor = (context, ox, alternate, random) => {
        const gradient = context.createLinearGradient(ox, 0, ox + tileSize, tileSize);
        gradient.addColorStop(0, palette.floor[alternate ? 2 : 1]);
        gradient.addColorStop(0.48, palette.floor[0]);
        gradient.addColorStop(1, palette.floor[alternate ? 1 : 2]);
        context.fillStyle = gradient;
        context.fillRect(ox, 0, tileSize, tileSize);
        addSurfaceNoise(context, random, ox, 0, tileSize, tileSize, palette.accent, palette.dark, 260);

        context.save();
        context.translate(ox, 0);
        if (worldId === "ice") {
          context.globalCompositeOperation = "screen";
          context.globalAlpha = 0.26;
          context.strokeStyle = "#c9f6ff";
          context.lineWidth = 2;
          for (let line = 0; line < 4; line += 1) {
            const y = 24 + line * 54 + random() * 10;
            context.beginPath();
            context.moveTo(-12, y);
            context.bezierCurveTo(56, y - 18, 142, y + 15, 228, y - 8);
            context.stroke();
          }
          drawCrack(context, [[38, 38], [84, 73], [67, 111], [118, 151], [104, 198]], "rgba(220,250,255,.5)", 1.5);
        } else if (worldId === "lava") {
          context.globalCompositeOperation = "screen";
          for (let crack = 0; crack < 4; crack += 1) {
            const x = 20 + random() * 170;
            const y = -8 + random() * 80;
            drawCrack(context, [[x, y], [x + 18, y + 42], [x - 2, y + 83], [x + 30, y + 132], [x + 9, 228]], "rgba(255,74,20,.72)", 2.4, 7);
            drawCrack(context, [[x, y], [x + 18, y + 42], [x - 2, y + 83], [x + 30, y + 132], [x + 9, 228]], "rgba(255,205,89,.7)", 0.8, 2);
          }
        } else if (worldId === "ancient") {
          context.globalCompositeOperation = "multiply";
          context.globalAlpha = 0.24;
          context.strokeStyle = "#1c1710";
          context.lineWidth = 3;
          for (let y = 0; y <= tileSize; y += 72) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(tileSize, y);
            context.stroke();
          }
          for (let x = 0; x <= tileSize; x += 72) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, tileSize);
            context.stroke();
          }
          context.globalCompositeOperation = "screen";
          context.globalAlpha = 0.15;
          context.strokeStyle = palette.glow;
          context.strokeRect(58, 58, 100, 100);
        } else {
          context.globalCompositeOperation = "screen";
          context.globalAlpha = 0.2;
          for (let facet = 0; facet < 7; facet += 1) {
            const x = random() * tileSize;
            const y = random() * tileSize;
            context.fillStyle = facet % 2 ? "rgba(119,240,255,.24)" : "rgba(244,130,232,.2)";
            context.beginPath();
            context.moveTo(x, y - 38);
            context.lineTo(x + 44, y + 8);
            context.lineTo(x - 20, y + 42);
            context.closePath();
            context.fill();
          }
        }
        context.restore();
      };

      const drawWall = (context, ox, alternate, random) => {
        context.save();
        context.translate(ox, 0);
        context.shadowColor = "rgba(0,0,0,.72)";
        context.shadowBlur = 18;
        context.shadowOffsetY = 12;
        const shape = worldId === "ancient" ? rounded : chamfered;
        shape(context, 10, 12, tileSize - 20, tileSize - 24, worldId === "diamond" ? 22 : worldId === "ice" ? 14 : 8);
        const side = context.createLinearGradient(0, 88, 0, tileSize - 8);
        side.addColorStop(0, palette.wall[2]);
        side.addColorStop(1, palette.wall[3]);
        context.fillStyle = side;
        context.fill();
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;

        shape(context, 12, 8, tileSize - 24, 146, worldId === "diamond" ? 20 : worldId === "ice" ? 13 : 7);
        const top = context.createLinearGradient(12, 8, tileSize - 12, 154);
        top.addColorStop(0, alternate ? palette.wall[1] : palette.wall[0]);
        top.addColorStop(0.38, palette.wall[1]);
        top.addColorStop(1, palette.wall[2]);
        context.fillStyle = top;
        context.fill();
        context.save();
        shape(context, 12, 8, tileSize - 24, 146, worldId === "diamond" ? 20 : worldId === "ice" ? 13 : 7);
        context.clip();
        addSurfaceNoise(context, random, 12, 8, tileSize - 24, 146, palette.accent, palette.dark, 230);
        context.save();
        context.globalCompositeOperation = worldId === "ice" || worldId === "diamond" ? "overlay" : "multiply";
        context.globalAlpha = worldId === "lava" ? 0.5 : worldId === "ancient" ? 0.34 : 0.42;
        const sourceTileId = 22;
        const sourceX = (sourceTileId % 8) * 64;
        const sourceY = Math.floor(sourceTileId / 8) * 64;
        context.drawImage(sourceImage, sourceX, sourceY, 64, 64, 12, 8, tileSize - 24, 146);
        context.restore();

        if (worldId === "ice") {
          const frost = context.createLinearGradient(0, 8, 0, 62);
          frost.addColorStop(0, "rgba(255,255,255,.9)");
          frost.addColorStop(1, "rgba(210,248,255,0)");
          context.fillStyle = frost;
          context.fillRect(10, 7, tileSize - 20, 70);
          drawCrack(context, [[44, 48], [88, 72], [70, 112], [118, 142]], "rgba(244,255,255,.62)", 2);
        } else if (worldId === "lava") {
          context.globalCompositeOperation = "screen";
          drawCrack(context, [[42, 20], [83, 60], [67, 96], [112, 144]], "rgba(255,75,20,.82)", 4, 12);
          drawCrack(context, [[42, 20], [83, 60], [67, 96], [112, 144]], "rgba(255,205,98,.78)", 1.2, 3);
          drawCrack(context, [[171, 12], [146, 49], [171, 88], [151, 136]], "rgba(255,88,25,.64)", 3, 9);
        } else if (worldId === "ancient") {
          context.globalCompositeOperation = "multiply";
          context.globalAlpha = 0.42;
          context.strokeStyle = "#46351f";
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(12, 78);
          context.lineTo(tileSize - 12, 78);
          context.moveTo(108, 8);
          context.lineTo(108, 78);
          context.moveTo(62, 78);
          context.lineTo(62, 154);
          context.moveTo(166, 78);
          context.lineTo(166, 154);
          context.stroke();
          context.globalCompositeOperation = "screen";
          context.globalAlpha = 0.36;
          context.strokeStyle = palette.glow;
          context.strokeRect(82, 45, 52, 38);
        } else {
          context.globalCompositeOperation = "screen";
          context.globalAlpha = 0.34;
          const facets = [
            [12, 148, 70, 8, 108, 88],
            [70, 8, 168, 14, 108, 88],
            [168, 14, 204, 146, 108, 88],
            [12, 148, 108, 88, 204, 146]
          ];
          for (let index = 0; index < facets.length; index += 1) {
            const points = facets[index];
            context.fillStyle = index % 2 ? "rgba(111,229,255,.28)" : "rgba(222,145,255,.23)";
            context.beginPath();
            context.moveTo(points[0], points[1]);
            context.lineTo(points[2], points[3]);
            context.lineTo(points[4], points[5]);
            context.closePath();
            context.fill();
          }
        }
        context.restore();

        context.globalCompositeOperation = "screen";
        context.globalAlpha = 0.84;
        context.strokeStyle = palette.accent;
        context.lineWidth = 3;
        shape(context, 13.5, 9.5, tileSize - 27, 143, worldId === "diamond" ? 19 : worldId === "ice" ? 12 : 6);
        context.stroke();
        context.restore();
      };

      const drawEdge = (context, ox, role) => {
        context.save();
        context.translate(ox, 0);
        context.globalCompositeOperation = "screen";
        context.strokeStyle = palette.accent;
        context.shadowColor = palette.glow;
        context.shadowBlur = worldId === "lava" ? 8 : 5;
        context.globalAlpha = worldId === "lava" ? 0.78 : 0.7;
        context.lineWidth = worldId === "diamond" ? 6 : 4;
        context.lineCap = "round";
        context.beginPath();
        if (role === "edgeN") { context.moveTo(13, 10); context.lineTo(tileSize - 13, 10); }
        if (role === "edgeE") { context.moveTo(tileSize - 10, 13); context.lineTo(tileSize - 10, tileSize - 13); }
        if (role === "edgeS") { context.moveTo(13, tileSize - 10); context.lineTo(tileSize - 13, tileSize - 10); }
        if (role === "edgeW") { context.moveTo(10, 13); context.lineTo(10, tileSize - 13); }
        context.stroke();
        context.restore();
      };

      const drawCorner = (context, ox, role) => {
        context.save();
        context.translate(ox, 0);
        context.globalCompositeOperation = "screen";
        context.fillStyle = palette.accent;
        context.shadowColor = palette.glow;
        context.shadowBlur = 10;
        context.globalAlpha = 0.72;
        const east = role.endsWith("E");
        const south = role.includes("S");
        const cx = east ? tileSize - 12 : 12;
        const cy = south ? tileSize - 12 : 12;
        context.beginPath();
        context.moveTo(cx, cy - 9);
        context.lineTo(cx + 9, cy);
        context.lineTo(cx, cy + 9);
        context.lineTo(cx - 9, cy);
        context.closePath();
        context.fill();
        context.restore();
      };

      const drawDecor = (context, ox, alternate) => {
        context.save();
        context.translate(ox + tileSize / 2, tileSize / 2);
        context.globalCompositeOperation = "screen";
        context.shadowColor = palette.glow;
        context.shadowBlur = 14;
        context.strokeStyle = palette.accent;
        context.fillStyle = palette.glow;
        context.lineWidth = 4;
        context.globalAlpha = 0.78;
        if (worldId === "ice") {
          for (let arm = 0; arm < 6; arm += 1) {
            context.rotate(Math.PI / 3);
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(0, alternate ? 58 : 44);
            context.stroke();
          }
        } else if (worldId === "lava") {
          context.beginPath();
          context.moveTo(0, -58);
          context.bezierCurveTo(42, -22, 34, 30, 0, 58);
          context.bezierCurveTo(-38, 28, -38, -18, 0, -58);
          context.fill();
        } else if (worldId === "ancient") {
          rounded(context, -48, -58, 96, 116, 10);
          context.stroke();
          context.beginPath();
          context.moveTo(-24, 10);
          context.lineTo(0, -22);
          context.lineTo(24, 10);
          context.stroke();
        } else {
          context.beginPath();
          context.moveTo(0, -62);
          context.lineTo(44, 0);
          context.lineTo(0, 62);
          context.lineTo(-44, 0);
          context.closePath();
          context.fill();
          context.stroke();
        }
        context.restore();
      };

      roles.forEach((role, index) => {
        const ox = index * tileSize;
        const random = randomFactory(`${worldId}:${role}:production-v1`);
        ctx.clearRect(ox, 0, tileSize, tileSize);
        if (role === "floor" || role === "floorAlt") drawFloor(ctx, ox, role === "floorAlt", random);
        else if (role === "wall" || role === "wallAlt") drawWall(ctx, ox, role === "wallAlt", random);
        else if (role.startsWith("edge")) drawEdge(ctx, ox, role);
        else if (role.startsWith("corner")) drawCorner(ctx, ox, role);
        else drawDecor(ctx, ox, role === "decorB");
      });

      return canvas.toDataURL("image/png");
    }, { worldId, palette, roles, tileSize, sourceDataUrl });

    const outputDir = path.join(root, "assets", "maze", worldId);
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "tileset.png"), Buffer.from(dataUrl.split(",")[1], "base64"));
    await writeFile(path.join(outputDir, "tileset.json"), `${JSON.stringify(buildMetadata(worldId), null, 2)}\n`);
    console.log(`[maze-tileset] generated ${worldId}`);
  }
} finally {
  await browser.close();
}
