/** Resolves kit asset keys ("urban/wall-a") to real files in the repository. */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Repository root (this file lives in `<root>/scripts/lib`).
 *
 * `fileURLToPath` matters here: on Windows `new URL(...).pathname` is
 * "/C:/Users/.../", and feeding that to `path.resolve` yields the broken
 * "C:\C:\Users\..." — which is what made every `npm run dev` crash with
 * ENOENT before any assets were copied.
 */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PACK_DIRS = {
  urban: "kenney_retro-urban-kit/Models/GLB format",
  td: "kenney_tower-defense-kit/Models/GLB format",
  mini: "kenney_mini-characters/Models/GLB format",
};
export const PACK_TEXTURE_DIRS = {
  urban: "kenney_retro-urban-kit/Models/GLB format/Textures",
  td: "kenney_tower-defense-kit/Models/GLB format/Textures",
  mini: "kenney_mini-characters/Models/GLB format/Textures",
};

export function modelFile(key) {
  const [pack, name] = key.split("/");
  const dir = PACK_DIRS[pack];
  if (!dir) throw new Error("unknown pack in model key: " + key);
  return path.join(REPO_ROOT, dir, name + ".glb");
}

export function textureFile(key) {
  const [pack, name] = key.split("/");
  const dir = PACK_TEXTURE_DIRS[pack];
  return path.join(REPO_ROOT, dir, name + ".png");
}

export function exists(p) {
  return fs.existsSync(p);
}
