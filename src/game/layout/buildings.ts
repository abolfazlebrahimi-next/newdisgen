/**
 * Building generators built from the retro-urban kit pieces.
 *
 * Kit conventions (measured from the GLBs, see scripts/measure-models.mjs):
 *  - one cell is a 1×1×1 cube whose origin sits at its base centre
 *  - "wall-a"/"wall-b" are cells, "*-flat" pieces are 0.1 thick façade panels
 *  - window/door decals are flat panels that stick out towards +Z
 *  - roof pieces are 1×0.5×1 gable segments with the ridge along X
 */
import { TownBuilder, makeRandom } from "./core.ts";
import type { Vec3 } from "./types.ts";

export interface BuildingOptions {
  /** centre of the front-left cell */
  x: number;
  z: number;
  /** footprint in cells */
  w: number;
  d: number;
  floors?: number;
  wall?: string;
  tint?: Vec3;
  /** window decal model, or null for blank façades */
  window?: string | null;
  /** texture applied to window decals so they can be tinted per building */
  door?: string;
  roof?: "gable" | "flat" | "terrace" | "none";
  roofTint?: Vec3;
  /** ridge direction for gable roofs */
  ridge?: "x" | "z";
  /** cell indices (0..w-1) that get a door / garage door on the front */
  doorAt?: number[];
  garageAt?: number[];
  /** cell indices with no windows at all on the front */
  blankFront?: number[];
  /** window decals on the left/right/back façades */
  sideWindows?: boolean;
  backWindows?: boolean;
  /** awning over the front door cells */
  awning?: boolean;
  awningTint?: Vec3;
  /** roof top height override (terrace railings etc.) */
  label?: string;
}

const WINDOW_PANEL = "urban/window-wide-type-a";
const WINDOW_SMALL = "urban/window-small-type-a";

export function building(t: TownBuilder, o: BuildingOptions) {
  const {
    x,
    z,
    w,
    d,
    floors = 1,
    wall = "urban/wall-a",
    tint,
    window = WINDOW_PANEL,
    door = "urban/wall-a-door",
    roof = "gable",
    roofTint,
    ridge = "x",
    doorAt = [],
    garageAt = [],
    blankFront = [],
    sideWindows = true,
    backWindows = true,
    awning = false,
    awningTint,
  } = o;

  const frontZ = z; // front row faces +Z (towards the camera)
  const backZ = z + d - 1;

  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const cx = x + i;
        const cz = frontZ + j;
        const isPerimeter = i === 0 || i === w - 1 || j === 0 || j === d - 1;
        if (!isPerimeter) continue;
        const isFront = j === d - 1;
        const isBack = j === 0;
        let model = wall;
        if (isFront && f === 0) {
          if (garageAt.includes(i)) model = wall.replace(/wall-(a|b)$/, "wall-$1-garage");
          else if (doorAt.includes(i)) model = wall.replace(/wall-(a|b)$/, "wall-$1-door");
        }
        t.model(model, [cx, f, cz], { c: tint });
      }
    }
    // floor slab so upper storeys read as solid
    if (f > 0 || roof !== "none") {
      t.prim("box", [x + (w - 1) / 2, f - 0.05, z + (d - 1) / 2], [0.55, 0.55, 0.58], {
        size: [w, 0.12, d],
        t: "urban/concrete",
        uv: 0.5,
      });
    }
  }

  // façade windows
  if (window) {
    for (let f = 0; f < floors; f++) {
      for (let i = 0; i < w; i++) {
        const frontCell = frontZ + d - 1;
        const isDoor = f === 0 && (doorAt.includes(i) || garageAt.includes(i));
        if (!isDoor && !blankFront.includes(i)) {
          t.model(f === 0 ? WINDOW_SMALL : window, [x + i, f + 0.22, frontCell + 0.5], { c: tint });
        }
        if (backWindows) t.model(f === 0 ? WINDOW_SMALL : window, [x + i, f + 0.22, frontZ - 0.5], { r: 180, c: tint });
      }
      if (sideWindows) {
        for (let j = 0; j < d; j++) {
          const cz = frontZ + j;
          t.model(f === 0 ? WINDOW_SMALL : window, [x - 0.5, f + 0.22, cz], { r: -90, c: tint });
          t.model(f === 0 ? WINDOW_SMALL : window, [x + w - 0.5, f + 0.22, cz], { r: 90, c: tint });
        }
      }
    }
  }

  // awning over the entrance
  if (awning) {
    const cells = doorAt.length ? doorAt : [Math.floor((w - 1) / 2)];
    for (const i of cells) {
      t.model("urban/detail-awning-wide", [x + i, floors - 0.02, frontZ + d - 0.5 + 0.42], {
        r: 180,
        c: awningTint,
        s: [1 / 1.0, 1, 1],
      });
    }
  }

  // roof
  const top = floors;
  if (roof === "gable") {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        // roof segments tile the whole footprint with the ridge running along X
        t.model("urban/wall-a-roof-detailed", [x + i, top, frontZ + j], {
          r: ridge === "x" ? 0 : 90,
          c: roofTint ?? [1.9, 1.7, 1.6],
          s: ridge === "x" ? [1, 1, d / w > 1 ? 1 : 1] : [1, 1, 1],
        });
      }
    }
  } else if (roof === "flat" || roof === "terrace") {
    t.prim("box", [x + (w - 1) / 2, top, z + (d - 1) / 2], roofTint ?? [1.5, 1.5, 1.55], {
      size: [w, 0.18, d],
      t: "urban/roof_plates",
      uv: 0.6,
    });
    if (roof === "terrace") {
      for (let i = 0; i < w; i++) {
        t.model("urban/wall-fence", [x + i, top + 0.18, frontZ + d - 0.55], { c: roofTint });
      }
    }
  }
}

/** Small brick house with a gable roof, chimney and a little garden. */
export function house(
  t: TownBuilder,
  opts: {
    x: number;
    z: number;
    w?: number;
    d?: number;
    floors?: number;
    wall?: string;
    tint?: Vec3;
    roofTint?: Vec3;
    ridge?: "x" | "z";
    awning?: boolean;
    awningTint?: Vec3;
    chimney?: boolean;
    gate?: boolean;
    seed?: number;
  },
) {
  const rand = makeRandom(opts.seed ?? 7);
  const w = opts.w ?? 3;
  const d = opts.d ?? 3;
  const floors = opts.floors ?? 1;
  building(t, {
    x: opts.x,
    z: opts.z,
    w,
    d,
    floors,
    wall: opts.wall ?? "urban/wall-a",
    tint: opts.tint,
    roof: "gable",
    ridge: opts.ridge ?? "x",
    roofTint: opts.roofTint,
    doorAt: [Math.floor(w / 2)],
    awning: opts.awning ?? true,
    awningTint: opts.awningTint ?? [1.05, 0.95, 0.9],
    backWindows: false,
    sideWindows: true,
  });
  if (opts.chimney) {
    t.box([0.35, 0.7 + 0.3 * floors, 0.35], [opts.x + 0.4, floors + 0.45, opts.z + d - 0.6], [0.75, 0.55, 0.5], {
      t: "urban/concrete",
      uv: 1,
    });
  }
  // garden fence along the front
  if (opts.gate !== false) {
    for (let i = 0; i < w; i++) {
      t.model("urban/wall-fence", [opts.x + i, 0, opts.z + d - 0.6 + 1.1], { c: [1, 1, 1] });
    }
  }
  // bushes by the porch
  for (let i = 0; i < 2; i++) {
    const bx = opts.x + (rand() > 0.5 ? -0.4 : w - 0.6);
    t.model("urban/tree-shrub", [bx, 0, opts.z + d - 0.35], { s: 0.8 });
  }
}

/** Red barn with a big braced door, plus optional silo. */
export function barn(t: TownBuilder, opts: { x: number; z: number; w?: number; d?: number; silo?: boolean; tint?: Vec3 }) {
  const w = opts.w ?? 5;
  const d = opts.d ?? 4;
  const tint = opts.tint ?? [1.35, 0.52, 0.42];
  building(t, {
    x: opts.x,
    z: opts.z,
    w,
    d,
    floors: 1,
    wall: "urban/wall-a",
    tint,
    window: null,
    roof: "gable",
    ridge: "x",
    roofTint: [2.3, 1.4, 1.2],
    doorAt: [],
    sideWindows: false,
    backWindows: false,
  });
  // barn door: two dark panels on the front face
  const doorZ = opts.z + d - 0.5 + 0.06;
  t.model("urban/wall-a-door", [opts.x + Math.floor(w / 2) - 0.5, 0, doorZ - 0.5], { c: [0.9, 0.85, 0.75] });
  t.model("urban/wall-a-door", [opts.x + Math.floor(w / 2) + 0.5, 0, doorZ - 0.5], { c: [0.9, 0.85, 0.75] });
  // white trim boxes
  t.box([w + 0.1, 0.14, 0.12], [opts.x + (w - 1) / 2, 0.98, opts.z + d - 0.5 + 0.07], [1.3, 1.3, 1.3]);
  if (opts.silo !== false) {
    const sx = opts.x + w + 0.9;
    t.cyl(0.85, 3.4, [sx, 0, opts.z + 1.4], [1.15, 1.15, 1.15], { t: "urban/metal", uv: 0.8, segments: 18 });
    t.cone(0.95, 0.9, [sx, 3.4, opts.z + 1.4], [1.05, 0.95, 0.6], { t: "urban/metal", uv: 1, segments: 18 });
  }
}

/** Crop field: tilled rows, sprouts, picket fence and a couple of sheep. */
export function cropField(t: TownBuilder, opts: { x: number; z: number; w: number; d: number; fence?: boolean; seed?: number }) {
  const rand = makeRandom(opts.seed ?? 21);
  const { x, z, w, d } = opts;
  // tilled soil
  t.prim("box", [x + (w - 1) / 2, 0.01, z + (d - 1) / 2], [1.6, 1.34, 1.05], {
    size: [w, 0.1, d],
    t: "urban/dirt",
    uv: 0.5,
  });
  // planting rows
  for (let i = 0; i < w; i++) {
    t.box([0.24, 0.06, d], [x + i, 0.06, z + (d - 1) / 2], [1.35, 1.15, 0.9], { anchor: "center" });
  }
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < d; j++) {
      const cx = x + i;
      const cz = z + j;
      const kind = rand();
      if (kind < 0.55) t.model("urban/tree-shrub", [cx + (rand() - 0.5) * 0.25, 0.06, cz + (rand() - 0.5) * 0.25], { s: 0.6 + rand() * 0.25, c: [0.6, 2.0, 0.75] });
      else if (kind < 0.75) t.prim("sphere", [cx, 0.24, cz], [0.9, 1.95, 0.6], { radius: 0.22, s: [1, 1.3, 1] });
      else if (kind < 0.85) t.model("urban/tree-small", [cx, 0.06, cz], { s: 0.75, c: [0.6, 2.0, 0.75] });
    }
  }
  if (opts.fence !== false) {
    for (let i = 0; i <= w; i++) t.model("urban/wall-fence", [x + i - 0.5, 0.06, z - 0.6], { r: 0, c: [0.95, 0.9, 0.85] });
    for (let i = 0; i <= w; i++) t.model("urban/wall-fence", [x + i - 0.5, 0.06, z + d - 0.4], { r: 180, c: [0.95, 0.9, 0.85] });
    for (let j = 0; j < d; j++) {
      t.model("urban/wall-fence", [x - 0.6, 0.06, z + j], { r: 90, c: [0.95, 0.9, 0.85] });
      t.model("urban/wall-fence", [x + w - 0.4, 0.06, z + j], { r: 90, c: [0.95, 0.9, 0.85] });
    }
  }
}

/** One sheep, built from primitives (the kits have no animals). */
export function sheep(t: TownBuilder, x: number, z: number, yaw = 0, scale = 1) {
  const c: Vec3 = [1.05, 1.05, 1.0];
  t.sphere(0.34 * scale, [x, 0.42 * scale, z], c, { r: yaw, s: [1.15, 1, 1.5] });
  t.box([0.24, 0.24, 0.3], [x, 0.36 * scale, z + 0.42 * scale], [0.35, 0.3, 0.3], { r: yaw });
  for (const dx of [-0.17, 0.17]) {
    for (const dz of [-0.22, 0.22]) {
      t.box([0.09, 0.32 * scale, 0.09], [x + dx * scale, 0, z + dz * scale], [0.4, 0.34, 0.32], { r: yaw });
    }
  }
  t.box([0.1, 0.16, 0.06], [x - 0.1 * scale, 0.44 * scale, z + 0.5 * scale], [0.9, 0.8, 0.7], { r: yaw });
  t.box([0.1, 0.16, 0.06], [x + 0.1 * scale, 0.44 * scale, z + 0.5 * scale], [0.9, 0.8, 0.7], { r: yaw });
}

/** Asphalt apron with painted parking bays. */
export function parkingLot(t: TownBuilder, opts: { x: number; z: number; w: number; d: number; bays?: number; tone?: Vec3 }) {
  const { x, z, w, d } = opts;
  t.prim("box", [x + (w - 1) / 2, 0.01, z + (d - 1) / 2], opts.tone ?? [1.25, 1.25, 1.3], {
    size: [w + 0.5, 0.1, d + 0.5],
    t: "urban/asphalt",
    uv: 0.5,
  });
  const bays = opts.bays ?? Math.max(2, Math.round(w / 1.6));
  for (let i = 0; i < bays; i++) {
    const bx = x + (i + 0.5) * ((w + 0.2) / bays);
    t.box([0.08, 0.02, 0.8], [bx, 0.06, z + d - 0.9], [1.25, 1.25, 1.2]);
  }
}
