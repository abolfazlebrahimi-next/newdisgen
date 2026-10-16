/**
 * Renders a grid of kit models from the exact camera the app uses, so model
 * orientation/size can be checked without a browser.
 *
 *   node scripts/piece-sheet.mjs urban/wall-a urban/wall-a-window ...
 */
import fs from "node:fs";
import { Renderer, makeCamera } from "./lib/raster.mjs";
import { emitModel, loadModel } from "./lib/models.mjs";
import { emitGeometry, boxGeometry } from "./lib/build.mjs";
import { textureFile } from "./lib/paths.mjs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const cols = Number(process.env.SHEET_COLS || 6);
const cell = Number(process.env.SHEET_CELL || 5);
const out = process.env.SHEET_OUT || "tmp-render/piece-sheet.png";
const elevation = Number(process.env.SHEET_ELEV || 62);
const azimuth = Number(process.env.SHEET_AZIM || 0);

const keys = args;
const rows = Math.ceil(keys.length / cols);
const W = 1500;
const H = Math.max(400, Math.round((W * rows * cell) / (cols * cell * 1.75)));

const worldW = cols * cell;
const worldH = rows * cell * 0.9;
const viewSize = Math.max(worldH, worldW / (W / H));
const camera = makeCamera({ elevationDeg: elevation, azimuthDeg: azimuth, distance: 120, target: [0, 0, 0] }, W / H, viewSize);

const r = new Renderer(W, H, camera, {});
// ground grid
const tileTex = textureFile("urban/grass");
for (let i = 0; i < cols; i++) {
  for (let j = 0; j < rows; j++) {
    emitGeometry(
      r,
      boxGeometry([cell - 0.05, 0.1, cell - 0.05], 1 / 2),
      { pos: [(i - (cols - 1) / 2) * cell, -0.1, (j - (rows - 1) / 2) * cell], color: [1, 1, 1] },
      { texture: tileTex },
    );
  }
}

const labels = [];
keys.forEach((key, i) => {
  const cx = i % cols;
  const cy = Math.floor(i / cols);
  try {
    loadModel(key);
  } catch (err) {
    console.error("FAILED", key, err.message);
    return;
  }
  const pos = [(cx - (cols - 1) / 2) * cell, 0, (cy - (rows - 1) / 2) * cell];
  emitModel(r, key, { pos, rotY: 0 });
  labels.push({ key, x: cx, y: cy });
  // axis marker: red cube on +x, blue on +z side of each cell
  emitGeometry(r, boxGeometry([0.25, 0.25, 0.25]), { pos: [pos[0] + 1.9, 0.15, pos[2]], color: [1, 0.1, 0.1] }, {});
  emitGeometry(r, boxGeometry([0.25, 0.25, 0.25]), { pos: [pos[0], 0.15, pos[2] + 1.9], color: [0.1, 0.3, 1] }, {});
});

r.flushTransparent();
fs.mkdirSync(out.slice(0, out.lastIndexOf("/")) || ".", { recursive: true });
r.save(out);

// annotate with ImageMagick using a font that exists on this machine
const labelArgs = [];
const font = execFileSync("bash", ["-lc", "fc-list 2>/dev/null | head -1 || true"]).toString().trim();
for (const l of labels) {
  const px = Math.round(((l.x + 0.5) / cols) * W);
  const py = Math.round(((l.y + 0.06) / rows) * H);
  labelArgs.push("-annotate", "+" + px + "+" + py, l.key.replace("urban/", ""));
}
console.log("cells:", cols + "x" + rows, "->", out);
if (labels.length) {
  try {
    execFileSync("convert", [out, "-gravity", "northwest", "-pointsize", "11", "-fill", "white", "-stroke", "black", "-strokewidth", "2", ...labelArgs, out]);
  } catch (e) {
    console.log("(labels skipped:", e.message.split("\n")[0], ")");
  }
}
