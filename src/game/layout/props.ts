/**
 * Street furniture and small props. Everything that the kits do not ship as a
 * model (cars, balloons, ponds, street paint…) is assembled from primitives and
 * uses kit textures where a surface pattern is needed.
 */
import { TownBuilder, makeRandom } from "./core.ts";
import type { Vec3 } from "./types.ts";

export interface CarOptions {
  color: Vec3;
  yaw?: number;
  scale?: number;
  kind?: "car" | "van" | "police" | "taxi" | "ambulance";
}

/** Chunky cartoon car, built from primitives. */
export function car(t: TownBuilder, x: number, z: number, o: CarOptions) {
  const s = o.scale ?? 1;
  const yaw = o.yaw ?? 0;
  const c = o.color;
  const dark: Vec3 = [0.22, 0.22, 0.26];
  const glass: Vec3 = [0.55, 0.75, 0.9];
  // body
  t.box([1.05 * s, 0.36 * s, 1.9 * s], [x, 0.26 * s, z], c, { r: yaw, anchor: "center" });
  // cabin
  t.box([0.9 * s, 0.34 * s, 1.05 * s], [x, 0.6 * s, z - 0.1 * s], c, { r: yaw, anchor: "center" });
  // windows
  t.box([0.92 * s, 0.22 * s, 1.0 * s], [x, 0.62 * s, z - 0.1 * s], glass, { r: yaw, anchor: "center" });
  // wheels
  for (const dx of [-0.53, 0.53]) {
    for (const dz of [-0.62, 0.62]) {
      t.prim("cylinder", [x + dx * s, 0.16 * s, z + dz * s], dark, {
        radius: 0.22 * s,
        height: 0.16 * s,
        rz: 90,
        segments: 10,
      });
    }
  }
  if (o.kind === "police" || o.kind === "ambulance") {
    // light bar / beacon
    t.box([0.5 * s, 0.12 * s, 0.2 * s], [x, 0.82 * s, z - 0.1 * s], o.kind === "police" ? [0.3, 0.5, 1.35] : [1.4, 0.35, 0.35], { r: yaw, anchor: "center" });
    t.box([0.5 * s, 0.12 * s, 0.2 * s], [x + 0.001, 0.82 * s, z - 0.1 * s], o.kind === "police" ? [1.35, 0.35, 0.4] : [1.4, 0.9, 0.9], { r: yaw, anchor: "center", s: [0.55, 1, 1] });
  }
  if (o.kind === "taxi") {
    t.box([0.36 * s, 0.2 * s, 0.5 * s], [x, 0.86 * s, z - 0.1 * s], [1.2, 1.0, 0.4], { r: yaw, anchor: "center" });
  }
  if (o.kind === "ambulance") {
    // red cross on the roof of the box body
    t.box([0.5 * s, 0.5 * s, 0.05], [x, 0.55 * s, z + 0.95 * s], [1.5, 0.3, 0.3], { r: yaw });
    t.box([0.14 * s, 0.14 * s, 0.06], [x, 0.66 * s, z + 0.95 * s], [1.6, 0.5, 0.5], { r: yaw });
  }
}

/** Traffic light on a pole. */
export function trafficLight(t: TownBuilder, x: number, z: number, yaw = 0) {
  t.cyl(0.07, 1.9, [x, 0, z], [0.35, 0.38, 0.42], { segments: 8 });
  t.box([0.3, 0.8, 0.28], [x, 1.9, z], [0.3, 0.32, 0.36], { r: yaw, anchor: "center" });
  t.prim("circle", [x, 2.12, z + 0.16], [1.5, 0.3, 0.3], { radius: 0.08, r: yaw });
}

/** Classic park bench. */
export function bench(t: TownBuilder, x: number, z: number, yaw = 0) {
  t.model("urban/detail-bench", [x, 0, z], { r: yaw });
}

/** Street lamp, optionally with two heads. */
export function streetLamp(t: TownBuilder, x: number, z: number, yaw = 0, twin = false) {
  t.model(twin ? "urban/detail-light-double" : "urban/detail-light-single", [x, 0, z], { r: yaw, s: 1.45, c: [1.1, 1.12, 1.15] });
}

/** Wooden picket fence run along x. */
export function fenceRun(t: TownBuilder, x0: number, z: number, count: number, tint: Vec3 = [1, 1, 1], yaw = 0) {
  for (let i = 0; i < count; i++) t.model("urban/wall-fence", [x0 + i, 0, z], { r: yaw, c: tint });
}

/** Parked truck (kit model) in the given orientation. */
export function truck(t: TownBuilder, x: number, z: number, yaw = 0, model = "urban/truck-green", tint?: Vec3) {
  t.model(model, [x, 0, z], { r: yaw, c: tint });
}

/** Balloon bunch on a stick — pure decoration colour. */
export function balloons(t: TownBuilder, x: number, z: number, seed = 3) {
  const rand = makeRandom(seed);
  const colors: Vec3[] = [
    [1.4, 0.35, 0.4],
    [1.3, 1.1, 0.35],
    [0.4, 0.9, 1.35],
    [0.6, 1.2, 0.6],
    [1.2, 0.6, 1.2],
  ];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + rand();
    const radius = 0.28 + rand() * 0.16;
    t.sphere(0.22 + rand() * 0.06, [x + Math.cos(angle) * radius, 1.5 + rand() * 0.35, z + Math.sin(angle) * radius], colors[i % colors.length]);
  }
  t.box([0.04, 1.5, 0.04], [x, 0, z], [0.5, 0.4, 0.35]);
}

/** Fountain / pond in the park. */
export function pond(t: TownBuilder, x: number, z: number, radius = 2) {
  t.prim("cylinder", [x, 0.04, z], [1.35, 1.4, 1.45], { radius: radius + 0.5, height: 0.22, segments: 24, t: "urban/rock", uv: 0.5 });
  t.prim("circle", [x, 0.27, z], [0.35, 0.95, 1.75], { radius: radius + 0.15, segments: 24 });
  t.prim("circle", [x, 0.29, z], [0.55, 1.3, 2.1], { radius: radius * 0.7, segments: 20 });
  // fountain jet
  t.cyl(0.16, 0.7, [x, 0.3, z], [1.5, 1.85, 2.0], { segments: 10 });
  t.sphere(0.26, [x, 1.05, z], [0.9, 1.6, 2.1], { s: [1, 0.6, 1] });
}

/** Little tree cluster; mixes the kit trees for variety. */
export function tree(t: TownBuilder, x: number, z: number, rand: () => number, scale = 1, tint?: Vec3) {
  const kinds = ["urban/tree-large", "urban/tree-park-large", "urban/tree-pine-large", "urban/tree-pine-small", "urban/tree-park-pine-large"];
  const kind = kinds[Math.floor(rand() * kinds.length) % kinds.length];
  t.model(kind, [x, 0, z], {
    s: scale * (0.85 + rand() * 0.35),
    r: Math.floor(rand() * 4) * 90,
    c: tint ?? [0.55, 1.5, 0.8],
  });
}

/** Bush patch. */
export function bush(t: TownBuilder, x: number, z: number, rand: () => number, scale = 0.8) {
  t.model("urban/tree-shrub", [x, 0, z], { s: scale * (0.8 + rand() * 0.5), c: [0.5, 1.5, 0.7] });
}

/** Lamp post + bench + bin row along a pavement. */
export function streetKit(t: TownBuilder, x: number, z: number, count: number, yaw = 0) {
  const rand = makeRandom(99);
  for (let i = 0; i < count; i++) {
    const px = x + i * 4;
    streetLamp(t, px, z, yaw, i % 2 === 0);
    if (i % 2 === 1) {
      bench(t, px + 1.2, z + 0.15, yaw);
      if (rand() > 0.5) t.model("urban/detail-dumpster-closed", [px + 2.4, 0, z + 0.2], { r: yaw, c: [0.95, 1, 1.05] });
    }
  }
}

/** Fire hydrant. */
export function hydrant(t: TownBuilder, x: number, z: number, yaw = 0) {
  t.cyl(0.16, 0.5, [x, 0, z], [2.1, 0.5, 0.45], { segments: 10 });
  t.cyl(0.22, 0.1, [x, 0.5, z], [2.2, 0.55, 0.5], { segments: 10 });
  t.sphere(0.13, [x, 0.62, z], [2.1, 0.5, 0.45]);
  t.box([0.5, 0.1, 0.12], [x, 0.34, z], [2.1, 0.5, 0.45], { r: yaw, anchor: "center" });
}

/** Litter bin. */
export function bin(t: TownBuilder, x: number, z: number, yaw = 0) {
  t.cyl(0.26, 0.62, [x, 0, z], [1.15, 1.5, 1.1], { segments: 12 });
  t.cyl(0.3, 0.08, [x, 0.62, z], [1.5, 1.55, 1.5], { segments: 12 });
}

/** Bus shelter: glass box with a bench and a sign. */
export function busStop(t: TownBuilder, x: number, z: number, yaw = 0) {
  t.box([2.6, 0.12, 1.2], [x, 2.0, z], [1.6, 1.65, 1.7], { r: yaw, anchor: "center" });
  for (const dx of [-1.2, 1.2]) t.box([0.12, 2.0, 1.2], [x + dx, 0, z], [1.5, 1.55, 1.6], { r: yaw, anchor: "center" });
  t.box([2.6, 2.0, 0.1], [x, 0, z - 0.55], [0.75, 0.9, 1.15], { r: yaw, anchor: "center" });
  t.model("urban/detail-bench", [x, 0, z + 0.15], { r: yaw, c: [1.5, 1.5, 1.45] });
  t.box([0.16, 1.5, 0.16], [x + 1.6, 0, z + 0.4], [1.5, 1.55, 1.6], { anchor: "center" });
  t.box([0.5, 0.7, 0.1], [x + 1.6, 1.5, z + 0.4], [2.1, 1.2, 0.5], { anchor: "center" });
}
