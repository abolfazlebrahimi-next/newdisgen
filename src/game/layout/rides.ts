/**
 * Amusement-park rides. The Kenney kits do not include rides, so they are
 * assembled from primitives in the same chunky low-poly style, with the parts
 * tagged by animation group (`g`) so the runtime can spin them.
 */
import { TownBuilder, DEG } from "./core.ts";
import type { Vec3 } from "./types.ts";

/**
 * Ferris wheel standing upright in the XY plane at (x, z).
 * Rendered parts: base legs + hub + two rims + spokes + cabins.
 */
export function ferrisWheel(t: TownBuilder, o: { x: number; z: number; radius?: number; hubHeight?: number; cabins?: number; hubTint?: Vec3 }) {
  const R = o.radius ?? 4;
  const hubY = o.hubHeight ?? 4.6;
  const cabins = o.cabins ?? 8;
  const hub: Vec3 = o.hubTint ?? [1.25, 1.05, 0.35];
  const metal: Vec3 = [1.15, 1.17, 1.22];
  const rotor = "wheel-rotor";
  const x = o.x;
  const z = o.z;

  // A-frame legs on both wheel planes
  for (const dz of [-0.75, 0.75]) {
    for (const dx of [-1, 1]) {
      const len = Math.hypot(R * 0.62, hubY);
      const angle = Math.atan2(dx * R * 0.62, hubY) / DEG;
      t.box([0.28, len, 0.28], [x + dx * R * 0.31, hubY / 2, z + dz], metal, { rz: angle, anchor: "center" });
    }
    // cross brace
    t.box([R * 0.85, 0.16, 0.16], [x, 1.5, z + dz], metal, { anchor: "center", r: 0 });
  }
  // hub axle
  t.prim("cylinder", [x, hubY, z], metal, { radius: 0.22, height: 2.1, rx: 90, anchor: "center", segments: 12 });

  // rims (front and back) + spokes, all inside the rotating group
  for (const dz of [-0.62, 0.62]) {
    t.torus(R, 0.11, [x, hubY, z + dz], hub, { rx: 90, g: rotor });
  }
  const spokes = 12;
  for (let i = 0; i < spokes / 2; i++) {
    const a = (i / (spokes / 2)) * 180;
    t.box([R * 2, 0.07, 0.07], [x, hubY, z], metal, { rz: a, anchor: "center", g: rotor });
    t.box([R * 2, 0.07, 0.07], [x, hubY, z + 0.001], metal, { rz: a, anchor: "center", g: rotor, s: [1, 0.99, 0.99] });
  }
  // rim decorations
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * 360;
    t.sphere(0.16, [x + Math.cos(a * DEG) * R, hubY + Math.sin(a * DEG) * R, z + 0.62], [1.3, 0.4, 0.45], { g: rotor });
    t.sphere(0.16, [x + Math.cos(a * DEG) * R, hubY + Math.sin(a * DEG) * R, z - 0.62], [1.3, 0.4, 0.45], { g: rotor });
  }
  // cabins hang from the rim, kept upright by their own group
  const cabinColors: Vec3[] = [
    [2.2, 0.75, 0.8],
    [0.8, 1.45, 2.3],
    [2.2, 1.8, 0.7],
    [0.9, 2.0, 1.2],
  ];
  for (let i = 0; i < cabins; i++) {
    const a = (i / cabins) * 360;
    const cx = x + Math.cos(a * DEG) * R;
    const cy = hubY + Math.sin(a * DEG) * R;
    const g = "wheel-cabin-" + i;
    t.box([0.1, 0.34, 0.1], [cx, cy - 0.34, z], [0.4, 0.4, 0.42], { anchor: "center", g });
    t.box([0.78, 0.62, 1.0], [cx, cy - 0.95, z], cabinColors[i % cabinColors.length], { anchor: "center", g });
    t.box([0.7, 0.3, 0.92], [cx, cy - 0.72, z], [0.75, 0.9, 1.0], { anchor: "center", g, s: [1, 1, 1] });
  }
  return { radius: R, hubY };
}

/**
 * Roller coaster: a closed hilly circuit with rails, cross-ties and pylons,
 * plus the centre positions of the train so it can follow the track.
 */
export function rollerCoaster(
  t: TownBuilder,
  o: { x: number; z: number; rx?: number; rz?: number; height?: number; seed?: number; name?: string },
) {
  const rx = o.rx ?? 6;
  const rz = o.rz ?? 4.2;
  const hill = o.height ?? 3.6;
  const trackTint: Vec3 = [1.35, 0.55, 0.35];
  const tieTint: Vec3 = [1.25, 1.2, 0.95];
  const metal: Vec3 = [1.1, 1.1, 1.15];
  const steps = 108;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const u = (i / steps) * Math.PI * 2;
    // rounded-rectangle circuit with two big hills
    const px = o.x + Math.sin(u) * rx * (0.72 + 0.28 * Math.cos(u * 2));
    const pz = o.z + Math.cos(u) * rz;
    const h = Math.max(0.9, hill * (0.55 + 0.45 * Math.sin(u * 2 + 0.6)) + 0.9 * Math.cos(u * 3));
    pts.push([px, h, pz]);
  }
  // rails + ties
  for (let i = 0; i < steps; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % steps];
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz) / DEG;
    const pitch = Math.atan2(dy, len) / DEG;
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[2] + b[2]) / 2;
    const my = (a[1] + b[1]) / 2;
    const dist = Math.hypot(dx, dy, dz);
    for (const off of [-0.34, 0.34]) {
      t.box([0.1, 0.1, dist * 1.06], [mx + Math.cos(yaw * DEG) * off, my, mz - Math.sin(yaw * DEG) * off], trackTint, {
        r: yaw,
        rx: -pitch,
        anchor: "center",
        g: "coaster-track",
      });
    }
    if (i % 2 === 0) {
      t.box([0.9, 0.09, 0.16], [mx, my - 0.1, mz], tieTint, { r: yaw, anchor: "center", g: "coaster-track" });
    }
    if (i % 6 === 0) {
      // pylon from the track down to the ground
      const gy = 0.05;
      const hgt = Math.max(0.2, my - gy);
      t.box([0.14, hgt, 0.14], [mx, gy, mz], metal, { anchor: "center" });
      const tieLen = Math.hypot(dx, dz) * 2.4;
      t.box([0.1, 0.1, 1], [mx, my - 0.3, mz], metal, { r: yaw, anchor: "center", s: [1, 1, tieLen] });
    }
  }
  return pts;
}

/** Striped circus tent: cylinder wall plus a cone roof. */
export function circusTent(t: TownBuilder, o: { x: number; z: number; radius?: number; height?: number; top?: Vec3; stripe?: Vec3 }) {
  const r = o.radius ?? 2.6;
  const h = o.height ?? 2.2;
  const wall: Vec3 = [1.25, 1.22, 1.12];
  t.prim("cylinder", [o.x, 0, o.z], wall, { radius: r, height: h, segments: 20, t: "urban/planks", uv: 0.35 });
  t.prim("cone", [o.x, h, o.z], o.top ?? [1.35, 0.5, 0.6], {
    radius: r * 1.22,
    height: h * 0.95,
    segments: 20,
    stripe: 10,
    c2: o.stripe ?? [1.3, 1.3, 1.25],
    anchor: "base",
  });
  // flag
  t.box([0.06, 1.2, 0.06], [o.x, h + h * 0.9, o.z], [0.65, 0.6, 0.55], { anchor: "center" });
  t.box([0.5, 0.3, 0.04], [o.x + 0.28, h + h * 0.9 + 0.5, o.z], [1.35, 0.4, 0.45], { anchor: "center" });
  // entrance poles + bunting
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 360;
    t.box([0.1, 0.7, 0.1], [o.x + Math.cos(a * DEG) * (r + 0.5), 0.35, o.z + Math.sin(a * DEG) * (r + 0.5)], [1.2, 1.15, 1.05], { anchor: "center" });
  }
}

/** Carousel with striped canopy and poles, grouped so it can spin. */
export function carousel(t: TownBuilder, o: { x: number; z: number; radius?: number; horses?: number }) {
  const r = o.radius ?? 2.1;
  const horses = o.horses ?? 6;
  const g = "carousel-rotor";
  const wood: Vec3 = [1.15, 0.95, 0.7];
  t.prim("circle", [o.x, 0.04, o.z], [0.55, 0.5, 0.5], { radius: r + 0.7, segments: 26, t: "urban/tiles", uv: 0.5 });
  t.box([r * 1.75, 0.22, r * 1.75], [o.x, 0.28, o.z], [1.2, 0.85, 0.55], { anchor: "center", g, t: "urban/planks", uv: 0.45 });
  t.prim("cylinder", [o.x, 0.2, o.z], wood, { radius: r * 0.45, height: 2.4, segments: 12, g });
  for (let i = 0; i < horses; i++) {
    const a = (i / horses) * 360;
    const px = o.x + Math.cos(a * DEG) * (r * 0.78);
    const pz = o.z + Math.sin(a * DEG) * (r * 0.78);
    t.prim("cylinder", [px, 0.4, pz], [1.3, 1.25, 0.5], { radius: 0.055, height: 1.9, segments: 8, g });
    const c: Vec3 = i % 2 === 0 ? [1.3, 1.25, 1.2] : [1.25, 0.6, 0.55];
    t.box([0.55, 0.42, 0.9], [px, 1.5, pz], c, { anchor: "center", g, r: -a });
    t.box([0.24, 0.34, 0.5], [px + Math.cos(a * DEG) * 0.3, 1.78, pz + Math.sin(a * DEG) * 0.3], c, { anchor: "center", g, r: -a + 25 });
    t.box([0.5, 0.6, 0.12], [px, 1.2, pz], [1.2, 0.5, 0.45], { anchor: "center", g, r: -a });
  }
  // canopy
  t.prim("cone", [o.x, 2.6, o.z], [1.3, 0.45, 0.5], { radius: r * 1.05, height: 0.9, segments: 16, stripe: 12, c2: [1.35, 1.3, 1.2], g });
  t.prim("torus", [o.x, 2.6, o.z], [1.3, 1.28, 1.2], { radius: r * 1.02, tube: 0.1, g });
  t.sphere(0.22, [o.x, 3.5, o.z], [1.35, 1.1, 0.4], { g });
}

/** Fun-house / ticket kiosk: a small striped-roof stall. */
export function kiosk(t: TownBuilder, o: { x: number; z: number; yaw?: number; tint?: Vec3 }) {
  const yaw = o.yaw ?? 0;
  const tint = o.tint ?? [1.25, 1.2, 1.1];
  t.box([2.0, 1.1, 1.4], [o.x, 0.55, o.z], tint, { r: yaw, anchor: "center", t: "urban/planks", uv: 0.5 });
  t.box([2.1, 0.5, 1.5], [o.x, 1.35, o.z], [0.5, 0.4, 0.35], { r: yaw, anchor: "center" });
  t.box([2.3, 0.12, 1.8], [o.x, 1.66, o.z], [1.35, 0.5, 0.5], { r: yaw, anchor: "center" });
  t.box([1.5, 0.2, 0.1], [o.x, 1.1, o.z + 0.72], [1.3, 1.05, 0.4], { r: yaw, anchor: "center" });
}
