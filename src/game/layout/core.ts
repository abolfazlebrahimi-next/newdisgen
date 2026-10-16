/**
 * Small helpers shared by every layout builder: every primitive is positioned
 * by its base centre (y = bottom) which makes putting things on the ground or on
 * top of a wall cell trivial.
 */
import type { PrimPart, ModelPart, Town, Vec3, ActorSpec, LabelSpec, MarkerSpec, PrimKind } from "./types.ts";

export const DEG = Math.PI / 180;

export class TownBuilder {
  town: Town;

  constructor(frame: Town["frame"], ground: Town["ground"]) {
    this.town = { frame, ground, parts: [], actors: [], labels: [], markers: [] };
  }

  model(m: string, p: Vec3, opts: Omit<ModelPart, "m" | "p"> = {}) {
    this.town.parts.push({ m, p: round3(p), ...opts });
    return this;
  }

  prim(k: PrimKind, p: Vec3, c: Vec3 | number, opts: Omit<PrimPart, "k" | "p" | "c"> = {}) {
    const color: Vec3 = typeof c === "number" ? [c, c, c] : c;
    this.town.parts.push({ k, p: round3(p), c: round3(color), ...opts });
    return this;
  }

  box(size: Vec3, p: Vec3, c: Vec3 | number, opts: Omit<PrimPart, "k" | "p" | "c" | "size"> = {}) {
    return this.prim("box", p, c, { size, ...opts });
  }

  cyl(radius: number, height: number, p: Vec3, c: Vec3 | number, opts: Omit<PrimPart, "k" | "p" | "c" | "radius" | "height"> = {}) {
    return this.prim("cylinder", p, c, { radius, height, ...opts });
  }

  cone(radius: number, height: number, p: Vec3, c: Vec3 | number, opts: Omit<PrimPart, "k" | "p" | "c" | "radius" | "height"> = {}) {
    return this.prim("cone", p, c, { radius, height, ...opts });
  }

  sphere(radius: number, p: Vec3, c: Vec3 | number, opts: Omit<PrimPart, "k" | "p" | "c" | "radius"> = {}) {
    return this.prim("sphere", p, c, { radius, ...opts });
  }

  torus(radius: number, tube: number, p: Vec3, c: Vec3 | number, opts: Omit<PrimPart, "k" | "p" | "c" | "radius" | "tube"> = {}) {
    return this.prim("torus", p, c, { radius, tube, ...opts });
  }

  actor(a: ActorSpec) {
    this.town.actors.push(a);
    return this;
  }

  label(l: LabelSpec) {
    this.town.labels.push(l);
    return this;
  }

  marker(m: MarkerSpec) {
    this.town.markers.push(m);
    return this;
  }
}

function round3(v: Vec3): Vec3 {
  return [r(v[0]), r(v[1]), r(v[2])];
}
function r(v: number) {
  return Math.round(v * 1000) / 1000;
}

/** Deterministic pseudo random so the town is identical on every build/refresh. */
export function makeRandom(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const pick = <T,>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length) % list.length];
