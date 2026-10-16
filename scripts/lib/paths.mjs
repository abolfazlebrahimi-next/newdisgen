/** Resolves kit asset keys ("urban/wall-a") to real files in the repository. */
import path from "node:path";
import fs from "node:fs";

export const REPO_ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
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
