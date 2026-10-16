/** Model cache + GLB emitter for the offline renderer. */
import { flattenGlb } from "./gltf.mjs";
import { emitGeometry } from "./build.mjs";
import { modelFile, textureFile } from "./paths.mjs";

const cache = new Map();

export function loadModel(key) {
  if (cache.has(key)) return cache.get(key);
  const file = modelFile(key);
  const { primitives } = flattenGlb(file);
  const pack = key.split("/")[0];
  const resolved = primitives.map((p) => ({
    ...p,
    texturePath: p.texture
      ? textureFile(pack + "/" + p.texture.replace(/^Textures\//, "").replace(/\.png$/, ""))
      : null,
  }));
  const model = { primitives: resolved, key };
  cache.set(key, model);
  return model;
}

function applyTexTransform(uvs, t) {
  if (!uvs) return null;
  if (!t) return uvs;
  const off = t.offset || [0, 0];
  const sc = t.scale || [1, 1];
  const out = new Float32Array(uvs.length);
  for (let i = 0; i < uvs.length; i += 2) {
    out[i] = uvs[i] * sc[0] + off[0];
    out[i + 1] = uvs[i + 1] * sc[1] + off[1];
  }
  return out;
}

export function emitModel(renderer, key, part) {
  const model = loadModel(key);
  for (const prim of model.primitives) {
    const geometry = {
      positions: prim.vertices,
      normals: prim.normals,
      uvs: applyTexTransform(prim.uvs, prim.texTransform),
      indices: prim.indices,
    };
    const base = prim.baseColor || [1, 1, 1, 1];
    const tint = part.color || [1, 1, 1];
    emitGeometry(
      renderer,
      geometry,
      { ...part, color: [base[0] * tint[0], base[1] * tint[1], base[2] * tint[2]], alpha: (part.alpha ?? 1) * base[3] },
      {
        texture: prim.texturePath,
        doubleSided: prim.doubleSided,
        transparent: prim.alphaMode === "BLEND" || (part.alpha ?? 1) < 0.999,
      },
    );
  }
}
