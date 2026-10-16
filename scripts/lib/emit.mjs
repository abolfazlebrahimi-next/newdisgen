/** Emits layout parts (kit models or primitives) into the software renderer. */
import { primitiveGeometry, emitGeometry } from "./build.mjs";
import { emitModel, loadModel } from "./models.mjs";
import { textureFile } from "./paths.mjs";

const DEG = Math.PI / 180;
const modelWarn = new Set();

/**
 * Layout parts use short keys (p/r/s/c) — translate them to the field names the
 * geometry builder expects and convert degrees to radians.
 */
export function toLibPart(part) {
  return {
    ...part,
    kind: part.kind ?? part.k,
    pos: part.p ?? [0, 0, 0],
    scale: part.s ?? 1,
    color: part.c ?? [1, 1, 1],
    stripeColor: part.c2,
    alpha: part.a ?? 1,
    rotX: (part.rx ?? 0) * DEG,
    rotY: (part.r ?? 0) * DEG,
    rotZ: (part.rz ?? 0) * DEG,
    doubleSided: part.ds,
    texScale: part.uv ?? 1,
  };
}

export function resolveTexture(key) {
  if (!key) return null;
  const [pack, name] = key.split("/");
  try {
    return textureFile(pack + "/" + name);
  } catch {
    return null;
  }
}

export function emitPart(renderer, rawPart) {
  const part = toLibPart(rawPart);
  if (part.m) {
    try {
      emitModel(renderer, part.m, part);
    } catch (err) {
      if (!modelWarn.has(part.m)) {
        modelWarn.add(part.m);
        console.warn("model failed:", part.m, err.message);
      }
    }
    return;
  }
  const geometry = primitiveGeometry(part);
  if (!geometry) return;
  emitGeometry(renderer, geometry, part, {
    texture: resolveTexture(part.t),
    transparent: part.alpha < 1,
  });
}

export function loadModelChecked(key) {
  try {
    loadModel(key);
    return true;
  } catch {
    if (!modelWarn.has(key)) {
      modelWarn.add(key);
      console.warn("missing model:", key);
    }
    return false;
  }
}
