/**
 * Texture loader for the offline preview renderer.
 * Uses ImageMagick to normalise any PNG into raw RGBA so the renderer does not
 * need a PNG decoder of its own.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CACHE = "/tmp/kenney-texcache";
fs.mkdirSync(CACHE, { recursive: true });
const memory = new Map();

export function loadTexture(file) {
  if (memory.has(file)) return memory.get(file);
  const key = crypto.createHash("sha1").update(file).digest("hex").slice(0, 16);
  const raw = path.join(CACHE, key + ".rgba");
  let meta = null;
  const metaFile = path.join(CACHE, key + ".json");
  if (!fs.existsSync(raw) || !fs.existsSync(metaFile)) {
    const size = execFileSync("identify", ["-format", "%w %h", file]).toString().trim().split(" ").map(Number);
    meta = { width: size[0], height: size[1] };
    execFileSync("convert", [file, "-alpha", "on", "-depth", "8", `RGBA:${raw}`]);
    fs.writeFileSync(metaFile, JSON.stringify(meta));
  } else {
    meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  }
  const data = fs.readFileSync(raw);
  const tex = { data, width: meta.width, height: meta.height };
  memory.set(file, tex);
  return tex;
}

/** Nearest-neighbour sample with repeat wrapping. Returns [r,g,b,a] 0..1 */
export function sampleTexture(tex, u, v, out) {
  let x = Math.floor(((u % 1) + 1) % 1 * tex.width);
  let y = Math.floor(((v % 1) + 1) % 1 * tex.height);
  if (x >= tex.width) x = tex.width - 1;
  if (y >= tex.height) y = tex.height - 1;
  const i = (y * tex.width + x) * 4;
  out[0] = tex.data[i] / 255;
  out[1] = tex.data[i + 1] / 255;
  out[2] = tex.data[i + 2] / 255;
  out[3] = tex.data[i + 3] / 255;
  return out;
}
