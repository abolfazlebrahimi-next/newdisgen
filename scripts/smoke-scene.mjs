/**
 * Headless smoke test for the browser scene pipeline.
 *
 * It exercises the same code paths TownScene.tsx uses (part resolution, vertex
 * colour baking, matrix composition and the per-texture merge) without WebGL, so
 * attribute mismatches or transform regressions are caught before opening the app.
 *
 *   node --experimental-strip-types scripts/smoke-scene.mjs
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildTown } from "../src/game/layout/town.ts";
import { makeCameraRig } from "../src/components/scene/camera.ts";
import { partMatrix, primitiveGeometry, paintGeometry, stripAttributes } from "../src/components/scene/geometry.ts";

const town = buildTown();
const problems = [];
const buckets = new Map();
let resolved = 0;
let skippedModels = 0;

for (const part of town.parts) {
  const prim = part;
  if (prim.g) continue;
  if (prim.m) {
    // GLB parts need a browser/GLTFLoader; their geometry is verified by
    // scripts/render.mjs, here we only check the transform helper
    partMatrix(part);
    skippedModels++;
    continue;
  }
  const spec = primitiveGeometry(prim);
  if (!spec) {
    problems.push(`no geometry for primitive: ${JSON.stringify(prim).slice(0, 80)}`);
    continue;
  }
  paintGeometry(spec, prim.c, prim.c2);
  spec.geometry.applyMatrix4(partMatrix(part));
  stripAttributes(spec.geometry);
  const key = prim.t ?? "-";
  const list = buckets.get(key) ?? [];
  list.push(spec.geometry);
  buckets.set(key, list);
  resolved++;
}

// every bucket must merge cleanly (same attributes, same index-ness)
let merged = 0;
for (const [key, list] of buckets) {
  const out = list.length === 1 ? list[0] : mergeGeometries(list, false);
  if (!out) problems.push(`merge failed for texture bucket "${key}" (${list.length} parts)`);
  else merged += out.attributes.position.count;
}

// camera rig sanity: the town box must fit the frustum
for (const aspect of [16 / 9, 4 / 3, 1, 9 / 16]) {
  const rig = makeCameraRig(town.frame, aspect);
  const halfWidth = (rig.viewSize * aspect) / 2;
  const halfHeight = rig.viewSize / 2;
  if (!(halfWidth >= town.frame.width / 2)) problems.push(`camera too narrow at aspect ${aspect.toFixed(2)} (${halfWidth.toFixed(1)} < ${town.frame.width / 2})`);
  if (!(halfHeight >= 6)) problems.push(`camera too short at aspect ${aspect.toFixed(2)} (${halfHeight.toFixed(1)})`);
}

console.log(
  `primitives resolved: ${resolved}, GLB parts: ${skippedModels}, merged vertices: ${merged}, buckets: ${buckets.size}, actors: ${town.actors.length}`,
);
const modelKeys = new Set(town.parts.filter((p) => p.m).map((p) => p.m));
console.log(`distinct kit models used: ${modelKeys.size}`);
if (problems.length) {
  console.error("PROBLEMS:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("smoke test OK");
