/**
 * Offline preview of the whole town — renders the exact layout the browser app
 * builds, so the composition can be checked (and iterated on) headlessly.
 *
 *   node scripts/render.mjs [--w 1600] [--h 900] [--elev 55] [--out tmp-render/town.png]
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { Renderer, makeCamera } from "./lib/raster.mjs";
import { emitPart, toLibPart, resolveTexture } from "./lib/emit.mjs";
import { emitGeometry, primitiveGeometry, pushTransform, popTransform } from "./lib/build.mjs";
import { textureFile } from "./lib/paths.mjs";

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const elevationDeg = 0;
const W = arg("w", 1600);
const H = arg("h", 900);
const ELEV = arg("elev", 55);
const AZIM = arg("azim", 0);
const VIEW = arg("view", 34);
const TX = arg("tx", 0);
const TZ = arg("tz", -4.5);
const TY = arg("ty", 3);
const DIST = arg("dist", 200);
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : "tmp-render/town.png";

const { buildTown } = await import("../src/game/layout/town.ts");
const town = buildTown();
console.log("parts:", town.parts.length, "actors:", town.actors.length, "labels:", town.labels.length);

/** Fits the camera to the content bounding box so framing is automatic. */
function fitCamera() {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  const addPoint = (p) => {
    for (let c = 0; c < 3; c++) {
      min[c] = Math.min(min[c], p[c]);
      max[c] = Math.max(max[c], p[c]);
    }
  };
  for (const part of town.parts) {
    if (part.p[2] < -19) continue; // ignore horizon trees for framing
    addPoint([part.p[0], part.p[1] + (part.k ? (part.height ?? 0) : 0), part.p[2]]);
    if (part.k === "box" && part.size) addPoint([part.p[0], part.p[1] + part.size[1], part.p[2]]);
  }
  const center = [0, 1, 2].map((c) => (min[c] + max[c]) / 2);
  center[1] = 2.2;
  const e = elevationDeg => (elevationDeg * Math.PI) / 180;
  const basis = makeCamera({ elevationDeg: ELEV, azimuthDeg: AZIM, distance: 100, target: center }, W / H, 100);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const project = (p) => {
    const dx = p[0] - center[0];
    const dy = p[1] - center[1];
    const dz = p[2] - center[2];
    return [dx * basis.x[0] + dy * basis.x[1] + dz * basis.x[2], dx * basis.y[0] + dy * basis.y[1] + dz * basis.y[2]];
  };
  for (const part of town.parts) {
    if (part.p[2] < -19) continue;
    const h = part.k === "box" && part.size ? part.size[1] : (part.height ?? 0);
    for (const y of [part.p[1], part.p[1] + h]) {
      const [sx, sy] = project([part.p[0], y, part.p[2]]);
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }
  }
  const aspect = W / H;
  const margin = arg("zoom", 0.94);
  const viewSize = Math.max((maxY - minY) * margin, ((maxX - minX) * margin) / aspect);
  const cam = makeCamera({ elevationDeg: ELEV, azimuthDeg: AZIM, distance: DIST, target: center }, aspect, viewSize);
  return { cam, center, viewSize };
}

const fitted = args.includes("--manual")
  ? { cam: makeCamera({ elevationDeg: ELEV, azimuthDeg: AZIM, distance: DIST, target: [TX, TY, TZ] }, W / H, VIEW) }
  : fitCamera();
const camera = fitted.cam;
if (!args.includes("--manual")) console.log("fit -> target", fitted.center.map((v) => v.toFixed(1)).join(","), "viewSize", fitted.viewSize.toFixed(1));
const r = new Renderer(W, H, camera, {});

// ground
const groundGeo = primitiveGeometry({ kind: "plane", size: town.ground.size, texScale: 0.5 });
emitGeometry(r, groundGeo, toLibPart({ p: [0, 0, 0], c: town.ground.tint ?? [1, 1, 1] }), { texture: resolveTexture(town.ground.texture) });

// Animation groups (rides) get a kinematic pose so a still frame still shows
// the wheel/coaster in a readable position.
const ANIM_POSE = {
  "wheel-rotor": 12,
  "carousel-rotor": 25,
};
for (let i = 0; i < 8; i++) ANIM_POSE["wheel-cabin-" + i] = 0;

// static parts, painted far-to-near so the depth buffer does the rest of the work
const sorted = [...town.parts].sort((a, b) => b.p[2] - a.p[2]);
const pivots = groupPivots(town.parts);
for (const part of sorted) {
  const angle = part.g ? ANIM_POSE[part.g] : undefined;
  if (angle) {
    const pivot = pivots[part.g];
    pushTransform(r, { pos: pivot, rotY: (angle * Math.PI) / 180, rotZ: (angle * Math.PI) / 180 });
    // rotate about the group pivot: translate part into pivot space
    emitPart(r, { ...part, p: [part.p[0] - pivot[0], part.p[1] - pivot[1], part.p[2] - pivot[2]] });
    popTransform(r);
  } else {
    emitPart(r, part);
  }
}

function groupPivots(parts) {
  const acc = {};
  for (const part of parts) {
    if (!part.g) continue;
    const p = acc[part.g] || (acc[part.g] = [0, 0, 0, 0]);
    p[0] += part.p[0];
    p[1] += part.p[1];
    p[2] += part.p[2];
    p[3] += 1;
  }
  for (const k of Object.keys(acc)) {
    const p = acc[k];
    acc[k] = [p[0] / p[3], p[1] / p[3], p[2] / p[3]];
  }
  return acc;
}

// actors frozen at their starting phase so the snapshot matches the running app
function pointOnPath(path, u) {
  const n = path.length;
  const total = u * n;
  const i = Math.floor(total) % n;
  const f = total - Math.floor(total);
  const a = path[i];
  const b = path[(i + 1) % n];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
for (const actor of town.actors) {
  const [x, y, z] = pointOnPath(actor.path, actor.phase);
  const ahead = pointOnPath(actor.path, actor.phase + 0.004);
  const yaw = (Math.atan2(ahead[0] - x, ahead[2] - z) * 180) / Math.PI;
  const pitch = actor.pitch ? (-Math.atan2(ahead[1] - y, Math.hypot(ahead[0] - x, ahead[2] - z)) * 180) / Math.PI : 0;
  if (actor.parts?.length) {
    pushTransform(r, {
      pos: [x, y, z],
      rotY: (yaw * Math.PI) / 180,
      rotX: (pitch * Math.PI) / 180,
      scale: actor.scale ?? 1,
    });
    for (const part of actor.parts) emitPart(r, part);
    popTransform(r);
    continue;
  }
  emitPart(r, { m: actor.m, p: [x, y + (actor.kind === "vehicle" ? 0.06 : 0), z], r: yaw, rx: pitch, s: actor.scale ?? 1 });
}

r.flushTransparent();
fs.mkdirSync(OUT.slice(0, OUT.lastIndexOf("/")) || ".", { recursive: true });
r.save(OUT);
execFileSync("convert", [OUT, "-modulate", "102,108", OUT]);
console.log("rendered", OUT, `${W}x${H}`, "elev", ELEV);
