/**
 * The LOCO town — one function that composes the whole map.
 *
 * World axes: +x → east (screen right), +z → south (screen towards the camera),
 * +y → up. The camera sits south of the town looking north.
 *
 *   z ≈ -18 ┌───────────────────────────────────────────────────────────────┐
 *           │  horizon trees · hills                                        │
 *   z ≈ -14 │  roller coaster   ferris wheel      hospital      farm         │
 *   z ≈ -1.5│==================== main street (3 tiles) =====================│
 *   z ≈  2  │  park       garage · gym      fire station     shops           │
 *   z ≈  6  │  houses · construction site      houses · market               │
 *   z ≈ 12  │  park with fountain                                            │
 *           └───────────────────────────────────────────────────────────────┘
 */
import { TownBuilder, makeRandom, DEG } from "./core.ts";
import type { Town, Vec3 } from "./types.ts";
import { PAINT as P } from "./palette.ts";
import { building, house, barn, cropField, sheep, parkingLot } from "./buildings.ts";
import { car, trafficLight, bench, streetLamp, fenceRun, truck, balloons, pond, tree, bush, streetKit, hydrant, bin, busStop, type CarOptions } from "./props.ts";
import { ferrisWheel, rollerCoaster, circusTent, carousel, kiosk } from "./rides.ts";

/* ---------------------------------------------------------------- streets */

const ROAD_HALF = 1.5; // asphalt half width (3 tiles wide)
const WALK_W = 1.5; // pavement width
const CROSS_X = 4; // centre of the crossing street

/** Asphalt strip helper: fills a rectangle with 2×1 road tiles. */
function roadStrip(t: TownBuilder, x0: number, x1: number, z0: number, z1: number, along: "x" | "z", model = "urban/road-asphalt-center") {
  if (along === "x") {
    for (let z = z0; z < z1; z++) {
      for (let x = x0; x < x1; x += 2) {
        t.model("urban/road-asphalt-straight", [x + 1, 0, z + 0.5], { r: 90, c: P.asphalt });
      }
    }
  } else {
    for (let x = x0; x < x1; x++) {
      for (let z = z0; z < z1; z += 2) {
        t.model("urban/road-asphalt-straight", [x + 0.5, 0, z + 1], { c: P.asphalt });
      }
    }
  }
}

function pavementRun(t: TownBuilder, x0: number, x1: number, z0: number, z1: number) {
  for (let x = x0; x < x1; x++) {
    for (let z = z0; z < z1; z++) t.model("urban/road-asphalt-pavement", [x + 0.5, 0, z + 0.5], { c: P.pavement });
  }
}

export function buildTown(): Town {
  const t = new TownBuilder({ width: 62, height: 34 }, { size: [92, 66], texture: "urban/grass", tint: P.grass });
  const rand = makeRandom(20261016);

  ground(t);
  roads(t);
  amusementPark(t);
  hospital(t);
  farm(t);
  frontRow(t);
  backRow(t);
  plaza(t);
  middleBlock(t);
  playground(t);
  greenery(t, rand);
  crowd(t, rand);
  traffic(t);

  return t.town;
}

/* ---------------------------------------------------------------- ground */

function ground(t: TownBuilder) {
  // grass patches for tonal variation
  const patches: [number, number, number, number, Vec3][] = [
    [-20, -8, 20, 16, P.grassAlt],
    [14, -9, 26, 16, [2.0, 2.25, 1.7]],
    [0, 8, 30, 12, P.grassAlt],
    [-30, 12, 20, 10, [1.7, 2.1, 1.65]],
  ];
  for (const [x, z, w, d, c] of patches) {
    t.prim("box", [x, 0.01, z], c, { size: [w, 0.05, d], t: "urban/grass", uv: 0.5 });
  }
  // packed-dirt park floor and farm lanes
  t.prim("box", [-20, 0.03, -8.6], P.dirt, { size: [17, 0.06, 12], t: "urban/dirt", uv: 0.3 });
    t.prim("box", [-11.4, 0.035, -4.2], P.dirt, { size: [3.2, 0.06, 6], t: "urban/dirt", uv: 0.3 });
  t.prim("box", [17, 0.03, -6], P.dirt, { size: [14, 0.06, 2.6], t: "urban/dirt", uv: 0.4 });
  t.prim("box", [-13.6, 0.03, 11.4], [1.95, 1.8, 1.5], { size: [13, 0.06, 8.5], t: "urban/tiles", uv: 0.3 });
}

/* ----------------------------------------------------------------- roads */

function roads(t: TownBuilder) {
  const X0 = -31;
  const X1 = 31;
  // main street
  roadStrip(t, X0, X1, -ROAD_HALF, ROAD_HALF, "x");
  // crossing street
  roadStrip(t, CROSS_X - ROAD_HALF, CROSS_X + ROAD_HALF, -19, 19, "z");
  // pavements (one tile wide, like the reference art)
  pavementRun(t, X0, X1, ROAD_HALF, ROAD_HALF + 1);
  pavementRun(t, X0, X1, -ROAD_HALF - 1, -ROAD_HALF);
  pavementRun(t, CROSS_X + ROAD_HALF, CROSS_X + ROAD_HALF + 1, -19, 19);
  pavementRun(t, CROSS_X - ROAD_HALF - 1, CROSS_X - ROAD_HALF, -19, 19);
  // intersection corners
  for (const [x, z, r] of [
    [CROSS_X - ROAD_HALF - 1, ROAD_HALF + 1, 0],
    [CROSS_X + ROAD_HALF, ROAD_HALF + 1, 90],
    [CROSS_X - ROAD_HALF - 1, -ROAD_HALF - 1, 0],
    [CROSS_X + ROAD_HALF, -ROAD_HALF - 1, 90],
  ] as [number, number, number][]) {
    t.model("urban/road-asphalt-corner", [x, 0, z], { r, c: P.pavement });
  }
  // zebra crossings
  for (const cx of [-15, 0, 13.5]) {
    for (let i = 0; i < 5; i++) {
      t.box([0.42, 0.02, ROAD_HALF * 2 - 0.2], [cx + i * 0.62, 0.07, 0], [2.3, 2.3, 2.2]);
    }
  }
  for (const cz of [-8.5, 0, 8.5]) {
    for (let i = 0; i < 5; i++) {
      t.box([ROAD_HALF * 2 - 0.2, 0.02, 0.42], [CROSS_X, 0.07, cz + i * 0.62], [2.3, 2.3, 2.2]);
    }
  }
  // centre dashes
  for (let x = X0 + 1; x < X1; x += 3) t.box([1.4, 0.02, 0.11], [x, 0.065, 0], [1.5, 1.5, 1.45]);
  for (let z = -18; z < 19; z += 3) {
    if (Math.abs(z) < 3) continue;
    t.box([0.11, 0.02, 1.4], [CROSS_X, 0.065, z + 1.5], [1.5, 1.5, 1.45]);
  }
  // kerb stones along the asphalt edge
  for (let x = X0; x < X1; x++) {
    if (Math.abs(x - CROSS_X) < ROAD_HALF + WALK_W) continue;
    t.box([1, 0.1, 0.12], [x + 0.5, 0, ROAD_HALF + 0.05], [1.5, 1.5, 1.45], { anchor: "center" });
    t.box([1, 0.1, 0.12], [x + 0.5, 0, -ROAD_HALF - 0.05], [1.5, 1.5, 1.45], { anchor: "center" });
  }
  // road furniture
  streetKit(t, -29, ROAD_HALF + WALK_W - 0.5, 9, 180);
  streetKit(t, 8, ROAD_HALF + WALK_W - 0.5, 6, 180);
  streetKit(t, -29, -ROAD_HALF - WALK_W + 0.5, 6, 0);
  for (const z of [-15, -11, -5, 6, 11, 15]) streetLamp(t, CROSS_X + ROAD_HALF + WALK_W - 0.5, z, 90, z % 2 === 0);
  trafficLight(t, CROSS_X - ROAD_HALF - 1.2, ROAD_HALF + 1.2, 0);
  trafficLight(t, CROSS_X + ROAD_HALF + 1.2, -ROAD_HALF - 1.2, 180);
  for (const [x, z] of [
    [-9.2, ROAD_HALF + 0.8],
    [16.4, -ROAD_HALF - 0.8],
    [-24, -ROAD_HALF - 0.8],
  ] as [number, number][]) {
    hydrant(t, x, z, 0);
  }
  bin(t, -20.5, ROAD_HALF + WALK_W - 0.8, 0);
  bin(t, 11.5, -ROAD_HALF - WALK_W + 0.8, 180);
  busStop(t, 20.5, ROAD_HALF + WALK_W - 0.9, 180);
  // patched asphalt, manholes, puddles
  t.model("urban/road-asphalt-damaged", [-2.5, 0.02, ROAD_HALF - 0.5], { r: 90, c: P.asphalt });
  t.model("urban/road-asphalt-damaged", [22.5, 0.02, -ROAD_HALF + 0.5], { r: -90, c: P.asphalt });
  for (const [x, z] of [
    [-9.2, 0.3],
    [16.8, -0.6],
    [25.4, 0.4],
  ] as [number, number][]) {
    t.prim("circle", [x, 0.07, z], [0.5, 0.52, 0.58], { radius: 0.3, segments: 14 });
  }
  t.prim("circle", [-6.2, 0.075, 0.9], [0.75, 0.85, 1.0], { radius: 0.8, segments: 18 });
  t.prim("circle", [7.4, 0.075, -1.0], [0.75, 0.85, 1.0], { radius: 0.55, segments: 16 });
}

/* --------------------------------------------------------- amusement park */

function amusementPark(t: TownBuilder) {
  const track = rollerCoaster(t, { x: -22, z: -12.5, rx: 6.6, rz: 3.8, height: 4.6 });
  ferrisWheel(t, { x: -13.4, z: -12.2, radius: 4.3, hubHeight: 5.4, cabins: 8 });
  circusTent(t, { x: -20.4, z: -5.8, radius: 2.3, height: 2.1 });
  carousel(t, { x: -14.2, z: -5.4, radius: 2.1, horses: 6 });
  kiosk(t, { x: -10.2, z: -9.8, yaw: 0, tint: [2.0, 1.7, 1.6] });
  kiosk(t, { x: -24.4, z: -3.4, yaw: 180, tint: [1.7, 2.0, 1.7] });
  kiosk(t, { x: -10.4, z: -14.4, yaw: 0, tint: [1.9, 1.6, 2.0] });
  balloons(t, -9.2, -4.4, 5);
  balloons(t, -11.4, -13.2, 9);
  balloons(t, -24.6, -6.6, 15);
  // entrance gate: two towers, an arch and a sign
  for (const gx of [-13.2, 0, -9.6]) {
    t.box([0.6, 2.4, 0.6], [gx, 1.2, -2.6], [2.0, 0.8, 0.75], { anchor: "center" });
    t.cone(0.5, 0.7, [gx, 2.4, -2.6], P.yellow, { segments: 8 });
  }
  t.box([4.4, 0.4, 0.5], [-11.4, 2.9, -2.6], P.yellow, { anchor: "center" });
  t.label({ id: "park", text: "شهربازی", at: [-11.4, 2.55, -2.3], w: 3.2, tone: "sign" });
  // park fences + benches + lights
  fenceRun(t, -27.5, -2.0, 13, P.wood);
  fenceRun(t, -8.4, -2.0, 5, P.wood);
  for (let i = 0; i < 4; i++) bench(t, -18.6 + i * 1.7, -2.4, 0);
  streetLamp(t, -9.8, -2.2, 90, true);
  streetLamp(t, -25.5, -2.2, -90, true);
  streetLamp(t, -18.6, -2.0, 0, false);
  streetLamp(t, -19.4, -16.4, 0, false);
  for (let i = 0; i < 3; i++) t.model("urban/detail-barrier-strong-type-a", [-15.4 + i * 1.2, 0, -1.4], { c: P.yellow });

  // the coaster train itself: three little cars that follow the loop
  const trainParts = [0, 1, 2].flatMap((i) => {
    const off = -1.45 * i;
    const body: Vec3 = [2.1, 0.5, 0.62];
    return [
      { k: "box" as const, p: [0, 0.62, off] as Vec3, c: body, size: [1.0, 0.5, 1.2] as Vec3, anchor: "center" as const },
      { k: "box" as const, p: [0, 0.95, off] as Vec3, c: [0.35, 0.5, 0.8] as Vec3, size: [0.84, 0.22, 1.05] as Vec3, anchor: "center" as const },
      { k: "box" as const, p: [0, 0.3, off] as Vec3, c: [0.35, 0.35, 0.4] as Vec3, size: [1.05, 0.16, 1.25] as Vec3, anchor: "center" as const },
    ];
  });
  t.actor({
    id: "coaster-train",
    m: "__group__",
    kind: "vehicle",
    speed: 4.2,
    phase: 0.12,
    pitch: true,
    path: track,
    parts: trainParts,
  });
}

/* --------------------------------------------------------------- hospital */

function hospital(t: TownBuilder) {
  const x = -7.5;
  const z = -9.5;
  // main block: white walls, blue base band, flat roof with roof-top plant
  building(t, {
    x,
    z,
    w: 7,
    d: 4,
    floors: 2,
    wall: "urban/wall-a",
    tint: [1.8, 1.9, 2.0],
    roof: "flat",
    roofTint: [1.55, 1.7, 1.8],
    doorAt: [3],
    sideWindows: true,
    backWindows: true,
    window: "urban/window-wide-type-a",
  });
  // blue base band + white panel joints so the façade does not read as one slab
  t.box([7.3, 0.42, 0.16], [x + 3, 0.42, z + 3.6], P.blue, { anchor: "center" });
  t.box([7.3, 0.42, 0.16], [x + 3, 2.42, z + 3.6], P.cyan, { anchor: "center" });
  for (let i = 1; i < 7; i++) {
    t.box([0.1, 2.0, 0.14], [x - 0.5 + i, 1.0, z + 3.62], [1.35, 1.45, 1.55], { anchor: "center" });
  }
  // entrance portico (narrower, so the façade cross stays visible)
  t.box([2.8, 0.22, 2.2], [x + 3, 2.16, z + 4.6], [1.85, 1.9, 1.95], { anchor: "center" });
  t.box([3.0, 0.26, 0.36], [x + 3, 2.36, z + 5.6], P.cyan, { anchor: "center" });
  for (const dx of [-1.2, 1.2]) t.box([0.24, 2.16, 0.24], [x + 3 + dx, 1.08, z + 5.2], [1.85, 1.9, 1.95], { anchor: "center" });
  t.model("urban/wall-steps-type-a", [x + 3, 0.02, z + 4.4], { c: P.white, s: [1.8, 1, 1] });
  t.box([1.8, 0.5, 0.14], [x + 3, 1.1, z + 3.66], [0.55, 0.8, 1.05], { anchor: "center" });
  // big cyan cross on the façade (the hospital's landmark) + red emergency panel
  t.box([2.6, 0.7, 0.2], [x + 3, 2.75, z + 3.68], P.cyan, { anchor: "center" });
  t.box([0.7, 2.6, 0.2], [x + 3, 2.75, z + 3.68], P.cyan, { anchor: "center" });
  t.box([1.5, 0.62, 0.16], [x + 0.15, 1.6, z + 3.66], [2.4, 0.6, 0.55], { anchor: "center" });
  // roof: plant, water tank, helipad marking and a cross pylon
  t.box([1.5, 0.7, 1.5], [x + 1.2, 2.35, z + 1.2], [1.75, 1.8, 1.85], { anchor: "center", t: "urban/metal", uv: 0.5 });
  t.box([1.0, 1.0, 1.0], [x + 5.2, 2.5, z + 2.4], [1.7, 1.75, 1.8], { anchor: "center", t: "urban/metal", uv: 0.5 });
  t.cyl(0.42, 0.5, [x + 3.4, 2.24, z + 3.0], P.cyan, { segments: 12 });
  t.prim("circle", [x + 2.0, 2.28, z + 0.9], [1.85, 1.9, 1.95], { radius: 0.9, segments: 18 });
  t.box([0.18, 1.4, 0.18], [x + 6.3, 2.3, z + 3.2], [1.7, 1.75, 1.8], { anchor: "center" });
  t.box([1.1, 0.32, 0.12], [x + 6.3, 3.5, z + 3.2], P.cyan, { anchor: "center" });
  t.box([0.32, 1.1, 0.12], [x + 6.3, 3.5, z + 3.2], P.cyan, { anchor: "center" });
  // apron, ambulance lane and parked cars
  parkingLot(t, { x: x - 1, z: z + 4.8, w: 9, d: 2.2, bays: 4, tone: [1.5, 1.5, 1.55] });
  t.box([1.6, 0.08, 3.2], [x + 3, 0.09, z + 5.6], [1.6, 1.7, 1.95], { anchor: "center" });
  for (let i = 0; i < 6; i++) t.box([1.6, 0.02, 0.16], [x + 3, 0.12, z + 4.6 + i * 0.5], [2.2, 2.2, 2.1]);
  car(t, x + 1.0, z + 6.2, { color: [1.95, 1.95, 2.0], kind: "ambulance", yaw: 90 });
  car(t, x + 6.6, z + 5.8, { color: [1.0, 1.5, 2.3], yaw: 90 });
  car(t, x + 8.8, z + 5.8, { color: [2.1, 1.15, 1.1], yaw: 90 });
  t.model("urban/tree-large", [x - 1.8, 0, z - 0.8], { s: 1.25, c: P.tree });
  t.model("urban/tree-large", [x + 8.8, 0, z - 0.6], { s: 1.2, c: P.tree });
  t.model("urban/tree-shrub", [x - 1.6, 0, z + 3.4], { s: 1.2, c: [0.5, 1.6, 0.7] });
  t.model("urban/tree-shrub", [x + 8.6, 0, z + 3.4], { s: 1.25, c: [0.5, 1.6, 0.7] });
  streetLamp(t, x - 2.4, z + 3.0, 0, false);
  streetLamp(t, x + 8.6, z + 3.0, 0, false);
  t.label({ id: "hospital", text: "بیمارستان لینا", at: [x + 3, 4.55, z + 3.64], w: 6.6, tone: "sign" });
  t.marker({ id: "hospital-info", at: [x + 6.9, 5.1, z + 3.6], kind: "info", text: "بیمارستان" });
}

/* ------------------------------------------------------------------- farm */

function farm(t: TownBuilder) {
  cropField(t, { x: 9, z: -14, w: 9, d: 9 });
  cropField(t, { x: 10, z: -3.6, w: 6, d: 2.2, fence: true, seed: 44 });
  barn(t, { x: 19.5, z: -13, w: 5, d: 4, silo: true });
  // hay bales + a cart
  for (const [hx, hz] of [
    [17.6, -7.2],
    [18.8, -6.6],
    [26.2, -9.0],
    [27.0, -8.4],
  ] as [number, number][]) {
    t.cyl(0.75, 1.0, [hx, 0, hz], [2.0, 1.6, 0.9], { segments: 14, t: "urban/planks", uv: 0.5 });
    t.cone(0.85, 0.5, [hx, 1.0, hz], P.wood, { segments: 14, t: "urban/planks", uv: 0.5 });
  }
  t.box([1.6, 0.3, 1.0], [23.6, 0.55, -4.6], P.wood, { anchor: "center", t: "urban/planks", uv: 0.5 });
  for (const dx of [-0.6, 0, 0.6]) {
    for (const dz of [-0.4, 0, 0.4]) t.prim("torus", [23.6 + dx, 0.3, -4.6 + dz], [0.35, 0.32, 0.3], { radius: 0.3, tube: 0.08, rx: 90, segments: 10, radialSegments: 8 });
  }
  // sheep paddock
  fenceRun(t, 6.6, -15.4, 13, [1.5, 1.5, 1.45]);
  const spots: [number, number][] = [
    [16.4, -11.4],
    [17.2, -10.6],
    [16.6, -9.6],
    [20.6, -7.0],
    [21.4, -7.6],
    [25.0, -6.4],
    [25.8, -7.0],
    [24.4, -11.6],
    [25.2, -12.0],
  ];
  spots.forEach(([x, z], i) => sheep(t, x, z, (i * 37) % 360, 0.95 + (i % 3) * 0.06));
  truck(t, 22.4, -3.6, 90, "urban/truck-green-cargo", [1.5, 1.6, 1.5]);
  truck(t, 22.4, -1.8, 90, "urban/truck-grey-cargo", [1.5, 1.5, 1.55]);
  for (let i = 0; i < 4; i++) t.model("urban/detail-barrier-type-a", [16.0 + i * 0.9, 0, -2.6], { c: P.yellow });
  t.model("urban/tree-park-large", [8.0, 0, -6.6], { s: 1.25, c: P.tree });
  t.model("urban/tree-park-pine-large", [11.8, 0, -1.6], { s: 1.2, c: P.treePine });
  t.model("urban/tree-large", [28.4, 0, -14], { s: 1.3, c: P.treePine });
  t.label({ id: "farm", text: "مزرعه", at: [13, 2.9, -10], w: 3.4, tone: "sign" });
  t.label({ id: "barn", text: "انبار", at: [21.8, 2.2, -9.1], w: 2.6, tone: "sign" });
}

/* ------------------------------------------------------- street front row */

function frontRow(t: TownBuilder) {
  /* ---- mechanic's garage (مکانیک) ---- */
  const gx = -21;
  const gz = 3.4;
  building(t, {
    x: gx,
    z: gz,
    w: 6,
    d: 3,
    floors: 1,
    wall: "urban/wall-a",
    tint: P.white,
    roof: "flat",
    roofTint: P.roofRed,
    garageAt: [1, 2, 4],
    sideWindows: false,
    backWindows: false,
    window: "urban/window-small-type-a",
  });
  t.box([6.1, 0.34, 3.05], [gx + 2.5, 1.05, gz + 1], P.roofRed, { anchor: "center", t: "urban/concrete", uv: 0.4 });
  t.box([2.6, 0.9, 0.22], [gx + 2.5, 1.5, gz + 2.86], [2.3, 1.85, 0.8], { anchor: "center", t: "urban/concrete", uv: 0.6 });
  t.label({ id: "garage", text: "مکانیک", at: [gx + 2.5, 1.5, gz + 2.86], w: 2.4, tone: "sign" });
  parkingLot(t, { x: gx - 0.5, z: gz + 3.4, w: 7, d: 2.6, bays: 3, tone: [1.4, 1.42, 1.5] });
  car(t, gx + 0.6, gz + 4.4, { color: [2.1, 1.25, 0.8], yaw: 90 });
  car(t, gx + 3.6, gz + 4.4, { color: [0.9, 1.5, 2.1], yaw: 90 });
  car(t, gx + 5.2, gz + 1.4, { color: [2.1, 2.0, 0.8], yaw: 0, scale: 0.95 });
  for (const dx of [-0.6, 0, 0.6]) t.box([0.14, 0.55, 0.14], [gx + 5.2 + dx * 0.7, 0.28, gz + 1.4], [1.7, 1.72, 1.8], { anchor: "center" });
  // tyres stacked against the wall
  for (const [tx, tz] of [
    [gx - 0.9, gz + 0.7],
    [gx - 0.9, gz + 1.6],
    [gx - 0.9, gz + 0.7],
  ] as [number, number][]) {
    t.prim("torus", [tx, 0.4, tz], [0.3, 0.3, 0.32], { radius: 0.3, tube: 0.12, rx: 90, segments: 12, radialSegments: 8 });
  }
  t.prim("torus", [gx - 0.9, 0.15, gz + 0.7], [0.3, 0.3, 0.32], { radius: 0.3, tube: 0.12, rx: 90, segments: 12, radialSegments: 8 });
  for (let i = 0; i < 3; i++) {
    const cx = gx + 6.4;
    const cz = gz + 4.6 - i * 0.75;
    t.cone(0.18, 0.5, [cx, 0.06, cz], [2.2, 0.85, 0.35], { segments: 10 });
    t.box([0.36, 0.07, 0.36], [cx, 0.06, cz], [2.1, 0.8, 0.3], { anchor: "center" });
  }

  /* ---- gym (باشگاه) ---- */
  const yx = -13.5;
  const yz = 3.4;
  building(t, {
    x: yx,
    z: yz,
    w: 5,
    d: 3,
    floors: 1,
    wall: "urban/wall-b",
    tint: [1.9, 1.45, 1.1],
    roof: "terrace",
    roofTint: [1.95, 1.3, 0.95],
    doorAt: [1, 0, 3],
    awning: true,
    awningTint: [2.1, 1.25, 0.8],
    sideWindows: true,
    backWindows: false,
  });
  t.box([4.0, 0.9, 0.22], [yx + 2, 1.5, yz + 2.86], [2.25, 1.5, 0.85], { anchor: "center", t: "urban/concrete", uv: 0.6 });
  t.label({ id: "gym", text: "باشگاه", at: [yx + 2, 1.5, yz + 2.86], w: 2.6, tone: "sign" });
  // outdoor gym: barbells and a bench press
  for (let i = 0; i < 2; i++) {
    const dx = yx + 0.7 + i * 2.6;
    const dz = yz + 4.6;
    for (const off of [-0.5, 0, 0.5]) t.prim("cylinder", [dx + off, 0.16, dz], [0.55, 0.58, 0.62], { radius: 0.34, height: 0.32, rz: 90, segments: 12 });
    t.box([1.1, 0.14, 0.14], [dx, 0.26, dz], [1.6, 1.65, 1.7], { anchor: "center" });
    t.box([0.9, 0.16, 0.4], [dx, 0.1, dz + 0.5], [1.6, 1.3, 0.9], { anchor: "center", t: "urban/planks", uv: 0.6 });
  }
  for (let i = 0; i < 3; i++) t.model("urban/detail-bench", [yx + 0.2 + i * 1.8, 0, yz + 3.9], { c: [1.6, 1.5, 1.4] });

  /* ---- fire & police station ---- */
  const px = 6.5;
  const pz = 3.4;
  building(t, {
    x: px,
    z: pz,
    w: 6,
    d: 3,
    floors: 1,
    wall: "urban/wall-a",
    tint: [1.35, 1.6, 2.1],
    roof: "flat",
    roofTint: [1.0, 1.3, 2.0],
    doorAt: [2],
    sideWindows: true,
    backWindows: false,
  });
  t.box([6.1, 0.36, 3.05], [px + 2.5, 1.06, pz + 1], [0.85, 1.15, 1.85], { anchor: "center", t: "urban/concrete", uv: 0.4 });
  // beacon + gold shield badge
  t.cyl(0.28, 0.42, [px + 2, 1.3, pz + 1.5], [2.3, 0.65, 0.6], { segments: 12 });
  t.sphere(0.3, [px + 2, 1.72, pz + 1.5], [2.3, 0.7, 0.65]);
  t.prim("circle", [px + 2.5, 1.55, pz + 2.58], P.yellow, { radius: 0.62, segments: 20 });
  t.box([1.25, 0.28, 0.08], [px + 2.5, 1.55, pz + 2.62], [1.75, 1.35, 0.35], { anchor: "center" });
  t.label({ id: "police", text: "کلانتری", at: [px + 1.2, 2.15, pz + 2.62], w: 2.4, tone: "sign" });
  parkingLot(t, { x: px - 0.5, z: pz + 3.6, w: 7, d: 2.2, bays: 3, tone: [1.4, 1.42, 1.5] });
  car(t, px + 0.7, pz + 4.7, { color: [1.2, 1.4, 2.2], kind: "police", yaw: 90 });
  car(t, px + 3.6, pz + 4.7, { color: [1.7, 1.75, 2.0], yaw: 90 });
  trafficLight(t, px + 7.4, pz + 2.6, 90);
  for (let i = 0; i < 6; i++) t.model("urban/detail-barrier-strong-type-a", [px + 6.4, 0, pz + 3.4 - i * 0.75], { r: 90, c: P.white });
  t.marker({ id: "police-quest", at: [px + 5.4, 3.0, pz + 3.6], kind: "quest", text: "مأموریت" });

  /* ---- shops row ---- */
  const sx = 15.5;
  const sz = 3.4;
  building(t, {
    x: sx,
    z: sz,
    w: 4,
    d: 3,
    floors: 1,
    wall: "urban/wall-b",
    tint: [1.6, 1.9, 1.5],
    roof: "gable",
    roofTint: [1.9, 1.3, 1.2],
    doorAt: [0, 0, 3],
    awning: true,
    awningTint: [2.1, 0.9, 0.8],
    sideWindows: true,
    backWindows: false,
  });
  building(t, {
    x: sx + 5,
    z: sz,
    w: 4,
    d: 3,
    floors: 1,
    wall: "urban/wall-a",
    tint: [1.75, 1.6, 2.0],
    roof: "gable",
    roofTint: [1.2, 1.35, 2.0],
    doorAt: [1, 0, 2],
    awning: true,
    awningTint: [1.1, 1.5, 2.1],
    sideWindows: true,
    backWindows: false,
  });
  building(t, {
    x: sx + 10,
    z: sz,
    w: 3,
    d: 3,
    floors: 2,
    wall: "urban/wall-b",
    tint: [1.9, 1.75, 1.4],
    roof: "flat",
    roofTint: [1.8, 1.5, 1.1],
    doorAt: [1],
    sideWindows: true,
    backWindows: false,
  });
  t.box([2.6, 0.8, 0.22], [sx + 1.5, 1.5, sz + 2.86], [2.25, 1.6, 0.9], { anchor: "center", t: "urban/concrete", uv: 0.6 });
  t.label({ id: "shops", text: "فروشگاه", at: [sx + 1.5, 1.5, sz + 2.86], w: 2.2, tone: "sign" });
  t.box([2.4, 0.8, 0.22], [sx + 6.5, 1.5, sz + 2.86], [1.85, 1.95, 2.15], { anchor: "center", t: "urban/concrete", uv: 0.6 });
  t.label({ id: "cafe", text: "کافه", at: [sx + 6.5, 1.5, sz + 2.86], w: 2.0, tone: "sign" });
  t.marker({ id: "shop-marker", at: [sx + 6.5, 2.6, sz + 3.4], kind: "shop", text: "فروشگاه" });
  // kerbside café tables + awnings
  for (let i = 0; i < 3; i++) {
    const cx = sx + 0.6 + i * 2.6;
    t.cyl(0.12, 0.75, [cx, 0, sz + 3.9], [1.6, 1.55, 1.5], { segments: 8 });
    t.cyl(0.55, 0.1, [cx, 0.75, sz + 3.9], [2.0, 1.75, 1.4], { segments: 14 });
    for (const [ox, oz] of [
      [-0.9, 0],
      [0.9, 0],
    ] as [number, number][]) {
      t.cyl(0.12, 0.5, [cx + ox, 0, sz + 3.9 + oz], [1.5, 1.5, 1.55], { segments: 8 });
      t.cyl(0.3, 0.08, [cx + ox, 0.5, sz + 3.9 + oz], [1.9, 1.6, 1.2], { segments: 12 });
    }
  }
  for (let i = 0; i < 12; i++) t.model("urban/road-asphalt-pavement", [sx - 2 + i, 0, 2.4], { c: P.pavement });
}

/* ------------------------------------------------- central residential lane */

function middleBlock(t: TownBuilder) {
  // a paved lane between the two block rows with gardens either side
  for (let x = -8; x < 13; x++) t.model("urban/road-asphalt-pavement", [x, 0, 8.5], { c: P.pavement });
  // small houses facing the lane
  house(t, { x: -7.6, z: 6.6, w: 3, d: 2, floors: 1, wall: "urban/wall-a", tint: [1.75, 1.6, 1.4], awning: false, awningTint: [2.0, 1.2, 1.1], gate: false });
  house(t, { x: -3.4, z: 6.6, w: 3, d: 2, floors: 2, wall: "urban/wall-b", tint: [1.6, 1.7, 1.5], awning: false, gate: false });
  house(t, { x: 1.0, z: 6.6, w: 3, d: 2, floors: 1, wall: "urban/wall-a", tint: [1.85, 1.5, 1.45], awning: false, awningTint: [1.2, 1.6, 2.0], gate: false });
  // garden plots with fences in front of them
  fenceRun(t, -8.4, 9.6, 9, [1.5, 1.45, 1.35]);
  fenceRun(t, 1.6, 9.6, 5, [1.5, 1.45, 1.35]);
  for (let i = 0; i < 8; i++) {
    const gx = -8 + i * 1.05;
    t.model("urban/tree-shrub", [gx, 0, 10.6], { s: 0.8, c: [0.6, 1.7, 0.7] });
  }
  for (let i = 0; i < 6; i++) {
    t.model("urban/tree-shrub", [2.4 + i * 1.05, 0, 10.6], { s: 0.75, c: [0.55, 1.65, 0.75] });
  }
  // cars parked along the lane
  car(t, -5.4, 8.6, { color: [2.0, 1.5, 1.2], yaw: 90 });
  car(t, -0.6, 8.6, { color: [1.2, 1.7, 2.0], kind: "taxi", yaw: 90 });
  // trees + lamps behind the lane
  for (let i = 0; i < 5; i++) tree(t, -6.5 + i * 4.2, 12.6, makeRandom(120 + i), 0.95);
  for (let i = 0; i < 4; i++) {
    const bx = -5 + i * 4.4;
    streetLamp(t, bx, 9.2, 180, i % 2 === 0);
    bench(t, bx + 1.5, 9.9, 180);
  }
  // little green square with a playground sandbox
  t.prim("box", [6.4, 0.03, 13.6], [1.95, 1.8, 1.5], { size: [8, 0.06, 5], t: "urban/tiles", uv: 0.4 });
  t.cyl(1.2, 0.2, [5.0, 0.08, 13.4], [1.9, 1.7, 1.1], { segments: 16 });
  t.prim("circle", [5.0, 0.22, 13.4], [2.2, 1.9, 1.1], { radius: 1.0, segments: 16 });
  for (const dx of [-0.7, 0.7]) {
    t.cyl(0.1, 0.55, [9.6 + dx, 0, 13.0], [1.5, 1.55, 1.6], { segments: 8 });
    t.box([0.6, 0.36, 0.3], [9.6 + dx, 0.6, 13.0], dx < 0 ? [2.1, 0.8, 0.5] : [0.9, 1.6, 2.1], { anchor: "center" });
  }
  for (let i = 0; i < 3; i++) t.model("urban/detail-bench", [7.4, 0, 15.4], { r: 0, c: [1.6, 1.5, 1.45] });
  t.model("urban/detail-dumpster-closed", [12.2, 0, 9.4], { c: [1.4, 1.6, 1.3] });
  t.model("urban/detail-dumpster-open", [12.2, 0, 10.6], { r: 180, c: [1.5, 1.6, 1.2] });
}

/* --------------------------------------------------------------- back row */

function backRow(t: TownBuilder) {
  // wooden houses behind the shops
  house(t, { x: 8.2, z: 9.6, w: 3, d: 3, floors: 1, wall: "urban/wall-a", tint: [1.8, 1.5, 1.3], awning: true, awningTint: [2.1, 1.2, 1.0] });
  house(t, { x: 12.6, z: 10.6, w: 4, d: 3, floors: 2, wall: "urban/wall-b", tint: [1.7, 1.5, 1.35], awning: true, awningTint: [1.2, 1.6, 2.0] });
  house(t, { x: 18.4, z: 10.2, w: 3, d: 3, floors: 1, wall: "urban/wall-a", tint: [1.85, 1.6, 1.35], awning: true, awningTint: [2.0, 1.6, 0.9] });
  house(t, { x: 23.6, z: 11.2, w: 3, d: 3, floors: 1, wall: "urban/wall-b", tint: [1.6, 1.65, 1.5], awning: true, awningTint: [1.6, 1.9, 1.4] });
  // a construction site between them
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      t.model("urban/scaffolding-poles", [6.0 + i, 0, 8.2 + j], { c: P.metal });
      t.model("urban/scaffolding-structure", [6.0 + i, 0.9 + j, 8.2], { c: P.metal });
      t.model("urban/scaffolding-floor", [6.0 + i, 1.8 + j, 9.2], { c: P.wood });
    }
  }
  t.model("urban/detail-bricks-type-a", [8.6, 0, 8.4], { s: 1.3 });
  t.model("urban/detail-bricks-type-b", [9.8, 0.24, 8.6], { s: 1.25 });
  t.model("urban/pallet", [7.2, 0, 8.6], { c: P.wood });
  t.model("urban/planks", [8.2, 0, 7.6], { r: 20, c: P.wood });
  t.model("urban/detail-block", [10.6, 0, 7.8], { s: 1.2 });
  t.model("urban/detail-dumpster-open", [5.4, 0, 7.4], { r: -90, c: [1.5, 1.6, 1.3] });
  truck(t, 9.4, 6.8, 180, "urban/truck-grey");
  for (let i = 0; i < 4; i++) t.model("urban/detail-barrier-strong-type-a", [4.6 + i * 1.2, 0, 6.4], { c: P.yellow });
  // back street houses (south edge)
  house(t, { x: -27.6, z: 18.4, w: 3, d: 3, floors: 1, wall: "urban/wall-b", tint: [1.7, 1.6, 1.45], awning: true, awningTint: [1.9, 1.4, 1.1] });
  house(t, { x: -22.4, z: 19.0, w: 3, d: 3, floors: 2, wall: "urban/wall-a", tint: [1.75, 1.55, 1.35], awning: true, awningTint: [1.2, 1.7, 2.0] });
  house(t, { x: 9.6, z: 18.6, w: 3, d: 3, floors: 1, wall: "urban/wall-a", tint: [1.8, 1.6, 1.4], awning: true, awningTint: [2.0, 1.4, 1.2] });
  house(t, { x: 15.4, z: 19.2, w: 4, d: 3, floors: 2, wall: "urban/wall-b", tint: [1.65, 1.7, 1.5], awning: true, awningTint: [1.5, 2.0, 1.4] });
  house(t, { x: 22.4, z: 18.4, w: 3, d: 3, floors: 1, wall: "urban/wall-a", tint: [1.85, 1.6, 1.5], awning: true, awningTint: [2.0, 1.2, 1.4] });
  // parked cars along both kerbs
  for (const [x, z, color, kind] of [
    [-27.4, 2.6, [2.0, 1.2, 1.1], "car"],
    [-17.6, 2.6, [1.1, 1.6, 2.1], "car"],
    [-6.4, 2.6, [2.0, 1.9, 0.9], "taxi"],
    [2.6, 2.6, [1.6, 1.6, 1.9], "car"],
    [12.4, 2.6, [2.0, 1.3, 1.5], "car"],
    [26.4, 2.6, [1.2, 1.9, 1.4], "car"],
    [-13.4, -2.4, [1.9, 1.7, 0.8], "car"],
    [-2.6, -2.4, [1.3, 1.5, 2.0], "police"],
    [19.4, -2.4, [2.0, 1.5, 1.2], "car"],
    [28.4, -2.4, [1.5, 1.8, 1.6], "car"],
  ] as [number, number, Vec3, CarOptions["kind"]][]) {
    car(t, x, z, { color, kind });
  }
  // more houses on the west side
  house(t, { x: -28.5, z: 7.4, w: 3, d: 3, floors: 2, wall: "urban/wall-a", tint: [1.75, 1.5, 1.4], awning: true, awningTint: [2.0, 1.1, 1.0] });
  house(t, { x: -28.5, z: 12.6, w: 3, d: 3, floors: 1, wall: "urban/wall-b", tint: [1.7, 1.6, 1.3], awning: true, awningTint: [1.3, 1.8, 1.5] });
  house(t, { x: -23.4, z: 13.0, w: 4, d: 3, floors: 2, wall: "urban/wall-a", tint: [1.6, 1.7, 1.6], awning: true, awningTint: [1.6, 1.2, 2.0] });
}

/* ----------------------------------------------------------------- plaza */

function plaza(t: TownBuilder) {
  pond(t, -13.6, 11.6, 2.2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 360;
    bench(t, -13.6 + Math.cos(a * DEG) * 3.4, 11.6 + Math.sin(a * DEG) * 3.4, 0);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 360;
    t.model("urban/tree-shrub", [-13.6 + Math.cos(a * DEG) * 5.0, 0, 11.6 + Math.sin(a * DEG) * 5.0], { s: 1.0, c: [0.5, 1.7, 0.7] });
  }
  for (let i = 0; i < 6; i++) t.model("urban/road-asphalt-pavement", [-18.6 + i, 0, 5.4], { c: P.pavement });
  // market stalls
  kiosk(t, { x: 20.4, z: 10.4, yaw: 0, tint: [1.9, 1.6, 1.8] });
  kiosk(t, { x: 23.6, z: 10.4, yaw: 0, tint: [1.6, 1.9, 1.6] });
  balloons(t, 22.0, 8.6, 12);
  truck(t, 26.4, 5.6, 0, "urban/truck-green", [1.5, 1.6, 1.5]);
  car(t, 17.6, 5.9, { color: [2.1, 1.1, 0.9], kind: "taxi", yaw: 0 });
  car(t, 25.4, 12.2, { color: [1.3, 1.8, 1.5], yaw: 90 });
  car(t, 3.4, 16.4, { color: [2.0, 1.4, 1.2], yaw: 0 });
}

/* ------------------------------------------------------------ playground */

function playground(t: TownBuilder) {
  const x = -20.5;
  const z = 15.6;
  t.prim("box", [x, 0.03, z], [1.95, 1.8, 1.5], { size: [9, 0.06, 6.5], t: "urban/tiles", uv: 0.4 });
  // sandpit
  t.cyl(1.7, 0.22, [x - 2.4, 0.08, z - 1.2], [1.9, 1.65, 1.0], { segments: 18 });
  t.prim("circle", [x - 2.4, 0.24, z - 1.2], [2.2, 1.85, 1.05], { radius: 1.45, segments: 18 });
  // slide
  t.box([0.9, 1.6, 0.9], [x + 1.4, 0.8, z - 1.7], [2.1, 1.1, 0.85], { anchor: "center" });
  t.box([0.9, 0.12, 0.9], [x + 1.4, 1.66, z - 1.7], [2.2, 1.15, 0.5], { anchor: "center" });
  t.box([0.7, 0.16, 2.2], [x + 1.4, 0.75, z - 0.4], [1.5, 1.9, 2.1], { anchor: "center", rx: 32 });
  // swing frame
  for (const dx of [-1.1, 0, 1.1]) t.cyl(0.1, 2.2, [x + dx, 0, z + 1.4], [1.75, 1.8, 1.85], { segments: 8 });
  t.box([2.6, 0.14, 0.14], [x, 2.2, z + 1.4], [1.75, 1.8, 1.85], { anchor: "center" });
  for (const dx of [-0.5, 0, 0.5]) {
    t.box([0.06, 1.3, 0.06], [x + dx, 0.9, z + 1.4], [1.6, 1.65, 1.7], { anchor: "center" });
    t.box([0.5, 0.08, 0.24], [x + dx, 1.5, z + 1.4], [2.2, 0.6, 0.5], { anchor: "center" });
  }
  // seesaw
  t.box([0.24, 0.5, 0.24], [x + 3.4, 0.25, z + 1.2], [1.5, 1.55, 1.6], { anchor: "center" });
  t.box([2.6, 0.14, 0.36], [x + 3.4, 0.55, z + 1.2], [2.1, 0.7, 0.6], { anchor: "center", rx: 10 });
  // spring riders
  for (const dx of [-0.9, 0, 1.0]) {
    t.cyl(0.1, 0.5, [x + dx, 0, z + 2.6], [1.5, 1.55, 1.6], { segments: 8 });
    t.box([0.8, 0.4, 0.36], [x + dx, 0.6, z + 2.6], dx < 0 ? [2.2, 0.8, 0.5] : [0.9, 1.7, 2.1], { anchor: "center" });
  }
  for (let i = 0; i < 4; i++) t.model("urban/detail-bench", [x - 3.6, 0, z - 2.2 + i * 1.6], { r: 90, c: [1.6, 1.5, 1.45] });
  tree(t, x + 4.6, z - 2.4, makeRandom(77), 1.05);
}

/* -------------------------------------------------------------- greenery */

function greenery(t: TownBuilder, rand: () => number) {
  for (let i = 0; i < 10; i++) {
    const x = -28 + i * 6.2;
    if (x > -6 && x < 11) continue;
    tree(t, x, -3.4, rand, 0.9);
  }
  for (let i = 0; i < 9; i++) tree(t, -28 + i * 7, 3.6, rand, 0.85);
  for (let i = 0; i < 14; i++) bush(t, -3.4 + i * 1.15, 2.2, rand, 0.8);
  for (let i = 0; i < 8; i++) bush(t, 11.6 + i * 1.2, 2.2, rand, 0.75);
  for (let i = 0; i < 30; i++) {
    tree(t, -32 + i * 2.3 + (rand() - 0.5) * 1.3, -18.5 - rand() * 2, rand, 1.2 + rand() * 0.4);
  }
  for (let i = 0; i < 16; i++) {
    tree(t, -31.5 + rand() * 5, 9 + rand() * 8, rand, 1.0);
    tree(t, 28.5 + rand() * 2.5, -17 + rand() * 13, rand, 1.05);
  }
  for (const [x, z] of [
    [-9, -17.4],
    [-3.5, -18],
    [7.5, -18],
    [30, -17.5],
    [-26, -18.5],
  ] as [number, number][]) {
    t.prim("sphere", [x, -1.1, z], [2.0, 2.35, 1.85], { radius: 2.6, s: [1, 0.5, 1], segments: 18, rings: 10, t: "urban/grass", uv: 0.5 });
  }
  // flower beds along the main street
  for (let i = 0; i < 20; i++) {
    const x = -28 + i * 3;
    if (Math.abs(x - CROSS_X) < 3) continue;
    t.model("urban/tree-shrub", [x, 0, 2.9], { s: 0.6, c: [0.55, 1.75, 0.7] });
  }
}

/* ----------------------------------------------------------- pedestrians */

function crowd(t: TownBuilder, rand: () => number) {
  const CHARACTERS = [
    "mini/character-female-a",
    "mini/character-female-b",
    "mini/character-female-c",
    "mini/character-female-d",
    "mini/character-female-e",
    "mini/character-male-a",
    "mini/character-male-b",
    "mini/character-male-c",
    "mini/character-male-d",
    "mini/character-male-e",
    "mini/character-male-f",
  ];
  const loops: [number, number, number][][] = [
    [
      [-29, 0, 1.9],
      [29, 0, 1.9],
      [29, 0, -1.9],
      [-29, 0, -1.9],
    ],
    [
      [2.4, 0, -17],
      [2.4, 0, 17],
      [5.6, 0, 17],
      [5.6, 0, -17],
    ],
    [
      [-8.4, 0, 1.1],
      [-8.4, 0, -4.2],
      [-1.4, 0, -4.2],
      [-1.4, 0, 1.1],
    ],
    [
      [-27, 0, -2.6],
      [-10.4, 0, -2.6],
      [-10.4, 0, -9.4],
      [-19.5, 0, -9.4],
      [-19.5, 0, -2.2],
    ],
    [
      [13.4, 0, 2.6],
      [27.4, 0, 2.6],
      [27.4, 0, 8.6],
      [13.4, 0, 8.6],
    ],
    [
      [7.4, 0, -3.4],
      [28.4, 0, -3.4],
      [28.4, 0, -6.4],
      [7.4, 0, -6.4],
    ],
    [
      [-19.6, 0, 7.6],
      [-8.6, 0, 7.6],
      [-8.6, 0, 14.6],
      [-19.6, 0, 14.6],
    ],
    [
      [-30, 0, 5.2],
      [-25, 0, 5.2],
      [-25, 0, 9.6],
      [-30, 0, 9.6],
    ],
    [
      [6.6, 0, 7.6],
      [13.6, 0, 7.6],
      [13.6, 0, 13.6],
      [6.6, 0, 13.6],
    ],
  ];
  let i = 0;
  for (const loop of loops) {
    const count = 5 + Math.floor(rand() * 4);
    for (let k = 0; k < count; k++) {
      t.actor({
        id: `walker-${i}`,
        m: CHARACTERS[i % CHARACTERS.length],
        kind: "walker",
        scale: 0.78 + rand() * 0.18,
        speed: 0.45 + rand() * 0.55,
        phase: (k / count + rand() * 0.12) % 1,
        path: loop.map(([x, z]) => [x, 0, z] as [number, number, number]),
        clip: rand() > 0.45 ? "walk" : "idle",
      });
      i++;
    }
  }
  // two people in the wheelchairs from the pack
  t.actor({
    id: "wheelchair-1",
    m: "mini/wheelchair",
    kind: "walker",
    scale: 0.85,
    speed: 0.36,
    phase: 0.2,
    path: [
      [-24, 0, 1.9],
      [18, 0, 1.9],
      [18, 0, -1.9],
      [-24, 0, -1.9],
    ],
  });
  // people standing about, some with the accessibility props
  const standers: [string, number, number, number, string?][] = [
    ["mini/character-female-c", -6.4, 1.2, 160, "mini/aid-cane"],
    ["mini/character-male-e", 12.6, 1.3, 200, "mini/aid-sunglasses"],
    ["mini/character-male-b", -16.4, -2.2, 30],
    ["mini/character-female-e", 4.8, -8.6, 240],
    ["mini/character-male-d", 19.4, 3.0, 300, "mini/aid-mask"],
    ["mini/character-female-b", -13.6, 8.0, 20],
    ["mini/character-male-a", 23.0, 6.4, 190],
  ];
  for (const [model, x, z, yaw, aid] of standers) {
    t.model(model, [x, 0, z], { s: 0.8, r: yaw });
    if (aid) t.model(aid, [x, 0, z], { s: 0.8, r: yaw });
  }
}

/* --------------------------------------------------------------- traffic */

function traffic(t: TownBuilder) {
  const lane = ROAD_HALF - 0.55;
  const vehicles: { m: string; tint?: Vec3; speed: number; phase: number; path: [number, number, number][] }[] = [
    {
      m: "urban/truck-green",
      tint: [1.6, 1.7, 1.6],
      speed: 1.9,
      phase: 0.05,
      path: [
        [-34, 0, lane],
        [34, 0, lane],
        [34, 0, -lane],
        [-34, 0, -lane],
      ],
    },
    {
      m: "urban/truck-grey",
      tint: [1.6, 1.6, 1.7],
      speed: 2.2,
      phase: 0.38,
      path: [
        [-34, 0, lane],
        [34, 0, lane],
        [34, 0, -lane],
        [-34, 0, -lane],
      ],
    },
    {
      m: "urban/truck-flat",
      tint: [1.7, 1.6, 1.5],
      speed: 1.7,
      phase: 0.72,
      path: [
        [CROSS_X - 0.95, 0, -21],
        [CROSS_X - 0.95, 0, 21],
        [CROSS_X + 0.95, 0, 21],
        [CROSS_X + 0.95, 0, -21],
      ],
    },
    {
      m: "urban/truck-green-cargo",
      tint: [1.6, 1.8, 1.6],
      speed: 2.0,
      phase: 0.21,
      path: [
        [CROSS_X - 0.95, 0, -21],
        [CROSS_X - 0.95, 0, 21],
        [CROSS_X + 0.95, 0, 21],
        [CROSS_X + 0.95, 0, -21],
      ],
    },
  ];
  vehicles.forEach((v, i) =>
    t.actor({ id: `vehicle-${i}`, m: v.m, kind: "vehicle", scale: 1, speed: v.speed, phase: v.phase, path: v.path, parts: [] }),
  );
}
