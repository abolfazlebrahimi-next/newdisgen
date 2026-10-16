/**
 * Layout data model for the LOCO town.
 *
 * The whole town is described as a flat list of "parts" (kit models plus a few
 * primitive shapes used for things the kits do not contain — rides, crops,
 * sheep…), a list of moving actors (characters, vehicles) and screen-space
 * anchors (Persian building signs, quest markers).
 *
 * Only plain data lives here: the browser build turns it into three.js objects
 * (src/components/scene/SceneBuilder.tsx) and the offline preview renderer
 * (scripts/render.mjs) draws it with the tiny software rasteriser, so both
 * always show the same town.
 */

export type Vec3 = [number, number, number];

export interface ModelPart {
  /** "<pack>/<model-name>" — e.g. "urban/wall-a" */
  m: string;
  /** base-centre position */
  p: Vec3;
  /** yaw, degrees */
  r?: number;
  /** uniform scale or per-axis scale */
  s?: number | Vec3;
  /** multiplicative tint */
  c?: Vec3;
  /** rotation group id used by the runtime to animate several parts together */
  g?: string;
}

export type PrimKind = "box" | "plane" | "cylinder" | "cone" | "sphere" | "torus" | "circle";

export interface PrimPart {
  k: PrimKind;
  /** kinematic/animation group (e.g. "ferris-rotor") or undefined for static */
  g?: string;
  p: Vec3;
  /** box size */
  size?: Vec3;
  /** cylinder / cone / sphere / torus radius */
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  /** cylinder / cone height */
  height?: number;
  /** torus tube */
  tube?: number;
  segments?: number;
  rings?: number;
  radialSegments?: number;
  /** yaw / pitch / roll, degrees */
  r?: number;
  rx?: number;
  rz?: number;
  s?: number | Vec3;
  /** colour, values may exceed 1 for a bright cartoon tint */
  c: Vec3;
  /** secondary colour used by `stripe` to alternate wedges */
  c2?: Vec3;
  /** number of alternating wedges (striped tent roofs, awnings, funnels) */
  stripe?: number;
  /** "base" (default) keeps the pivot on the ground, "center" centres it */
  anchor?: "base" | "center";
  /** texture key "<pack>/<texture-name>" */
  t?: string;
  /** texture repeats per world unit */
  uv?: number;
  a?: number;
  ds?: boolean;
  /** flat shading colour only, no lighting boost */
  unlit?: boolean;
}

export type Part = ModelPart | PrimPart;

export interface ActorSpec {
  id: string;
  /** character or vehicle model key */
  m: string;
  kind: "walker" | "vehicle";
  scale?: number;
  /** closed loop of [x, y, z] waypoints (y is the walking/driving height) */
  path: [number, number, number][];
  /** optional sub-parts placed relative to the actor origin (coaster train…) */
  parts?: Part[];
  /** units per second */
  speed: number;
  /** 0..1 offset along the path */
  phase: number;
  /** animation clip to play when available */
  clip?: string;
  /** pitch the body along the path (coaster train) */
  pitch?: boolean;
}

export interface LabelSpec {
  id: string;
  text: string;
  /** world position of the sign */
  at: Vec3;
  /** sign width in world units */
  w: number;
  tone?: "sign" | "brand";
}

export interface MarkerSpec {
  id: string;
  at: Vec3;
  kind: "quest" | "shop" | "info";
  text?: string;
}

export interface Town {
  ground: { size: [number, number]; texture: string; tint?: Vec3 };
  parts: Part[];
  actors: ActorSpec[];
  labels: LabelSpec[];
  markers: MarkerSpec[];
  /** camera framing hint: world half-extents that must always be visible */
  frame: { width: number; height: number };
}
