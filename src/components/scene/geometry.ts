/**
 * Browser-side geometry builder.
 *
 * Mirrors scripts/lib/build.mjs (used by the offline preview renderer): layout
 * parts are turned into three.js geometry, tints are baked into vertex colours and
 * everything static is merged per texture so the whole town renders in a couple
 * of dozen draw calls.
 */
import * as THREE from "three";
import type { Part, PrimPart, Vec3 } from "@/game/layout/types";
import type { LoadedModel } from "./assets";

export const DEG = Math.PI / 180;

export type GeometrySpec = {
  geometry: THREE.BufferGeometry;
  /** vertices of alternating wedges for striped primitives */
  wedge?: Uint16Array;
};

/* ------------------------------------------------------------ primitives */

export function boxGeometry(size: Vec3, uvScale = 1): GeometrySpec {
  return { geometry: new THREE.BoxGeometry(size[0], size[1], size[2]).translate(0, size[1] / 2, 0).scale(1, 1, 1) };
}

export function planeGeometry(w: number, d: number, uvScale = 1): GeometrySpec {
  return { geometry: new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2) };
}

export function cylinderGeometry(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments = 16,
  stripe = 0,
): GeometrySpec {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false);
  geometry.translate(0, height / 2, 0);
  let wedge: Uint16Array | undefined;
  if (stripe > 0) {
    // tag the side-wall vertices by wedge so the caller can bake striped colours
    const count = geometry.attributes.position.count;
    wedge = new Uint16Array(count);
    const sideVerts = (segments + 1) * 2; // the caps follow afterwards
    for (let i = 0; i < Math.min(sideVerts, count); i++) {
      wedge[i] = Math.floor((Math.floor(i / 2) / segments) * stripe) % stripe;
    }
  }
  return { geometry, wedge };
}

export function sphereGeometry(radius: number, segments = 16, rings = 12): GeometrySpec {
  return { geometry: new THREE.SphereGeometry(radius, segments, rings).translate(0, radius, 0) };
}

export function torusGeometry(radius: number, tube: number, radialSegments = 12, tubularSegments = 32): GeometrySpec {
  return { geometry: new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments) };
}

export function circleGeometry(radius: number, segments = 20): GeometrySpec {
  return { geometry: new THREE.CircleGeometry(radius, segments).rotateX(-Math.PI / 2) };
}

export function primitiveGeometry(part: PrimPart): GeometrySpec | null {
  switch (part.k) {
    case "box":
      return boxGeometry(part.size ?? [1, 1, 1], part.uv ?? 1);
    case "plane":
      return planeGeometry(part.size?.[0] ?? 1, part.size?.[1] ?? 1, part.uv ?? 1);
    case "cylinder":
      return cylinderGeometry(part.radiusTop ?? part.radius ?? 0.5, part.radiusBottom ?? part.radius ?? 0.5, part.height ?? 1, part.segments ?? 16, part.stripe ?? 0);
    case "cone":
      return cylinderGeometry(0, part.radiusBottom ?? part.radius ?? 0.5, part.height ?? 1, part.segments ?? 16, part.stripe ?? 0);
    case "sphere":
      return sphereGeometry(part.radius ?? 0.5, part.segments ?? 16, part.rings ?? 12);
    case "torus":
      return torusGeometry(part.radius ?? 0.5, part.tube ?? 0.1, part.radialSegments ?? 12, part.segments ?? 32);
    case "circle":
      return circleGeometry(part.radius ?? 0.5, part.segments ?? 20);
    default:
      return null;
  }
}

/* -------------------------------------------------------------- transform */

export function partMatrix(part: Part): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const isPrim = !("m" in part) || !part.m;
  const prim = part as PrimPart;
  const anchor = prim.anchor === "center" ? -(prim.height ?? (prim.size ? prim.size[1] : 0)) / 2 : 0;
  m.compose(
    new THREE.Vector3(part.p[0], part.p[1] + anchor, part.p[2]),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(((prim.rx ?? 0) * Math.PI) / 180, ((part.r ?? 0) * Math.PI) / 180, ((prim.rz ?? 0) * Math.PI) / 180, "YXZ"),
    ),
    (() => {
      const s = part.s ?? 1;
      return typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(s[0], s[1], s[2]);
    })(),
  );
  void isPrim;
  return m;
}

/** Bakes a tint (and optional stripe colours) into a geometry's colour attribute. */
export function paintGeometry(spec: GeometrySpec, color: Vec3, stripeColor?: Vec3): THREE.BufferGeometry {
  const geo = spec.geometry;
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const c = spec.wedge && stripeColor && spec.wedge[i] % 2 === 1 ? stripeColor : color;
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** Keeps only the attributes the town material needs (exact same set per bucket). */
export function stripAttributes(geometry: THREE.BufferGeometry) {
  for (const key of Object.keys(geometry.attributes)) {
    if (key !== "position" && key !== "normal" && key !== "uv" && key !== "color") geometry.deleteAttribute(key);
  }
  if (!geometry.attributes.uv) {
    geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
  }
  if (!geometry.attributes.color) {
    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3).fill(1);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  geometry.morphAttributes = {};
  return geometry;
}

/**
 * Flattens a loaded GLB (node transforms applied) into one entry per primitive.
 *
 * A model can use several textures (e.g. "urban/wall-a" uses wall_lines.png and
 * concrete.png), so each primitive keeps its own texture key and is merged into
 * the matching bucket instead of mixing atlases on one mesh.
 */
export function modelToGeometries(model: LoadedModel, part: Part): { geometry: THREE.BufferGeometry; textureKey: string | null }[] {
  const tint = (part as { c?: [number, number, number] }).c ?? [1, 1, 1];
  const matrix = partMatrix(part);
  model.scene.updateMatrixWorld(true);
  const out: { geometry: THREE.BufferGeometry; textureKey: string | null }[] = [];
  model.scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry.clone();
    stripAttributes(geo);
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const map = (mat?.map as THREE.Texture | null) ?? null;
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tint[0];
      colors[i * 3 + 1] = tint[1];
      colors[i * 3 + 2] = tint[2];
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const world = new THREE.Matrix4().multiplyMatrices(matrix, child.matrixWorld);
    geo.applyMatrix4(world);
    out.push({ geometry: geo, textureKey: map ? textureKeyOf(map) || null : null });
  });
  return out;
}

/** "/assets/models/urban/Textures/grass.png" → "urban/grass" */
export function textureKeyOf(map: THREE.Texture) {
  const src = (map.source?.data as { src?: string } | undefined)?.src ?? map.name ?? "";
  const match = src.match(/models\/([a-z]+)\/Textures\/([a-zA-Z0-9_\-]+)\.png/);
  if (match) return `${match[1]}/${match[2]}`;
  const plain = src.match(/([a-zA-Z0-9_\-]+)\.png/);
  return plain ? plain[1] : "";
}
