/**
 * Reports axis-aligned size of every model in the kits (POSITION accessors only,
 * node transforms applied) — used to place building parts precisely.
 *
 *   node scripts/measure-models.mjs [packFilter]
 */
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, PACK_DIRS } from "./lib/paths.mjs";
import { flattenGlb } from "./lib/gltf.mjs";

const filter = process.argv[2];
const out = {};
for (const [pack, dir] of Object.entries(PACK_DIRS)) {
  if (filter && pack !== filter) continue;
  const abs = path.join(REPO_ROOT, dir);
  for (const f of fs.readdirSync(abs).filter((f) => f.endsWith(".glb"))) {
    try {
      const { primitives } = flattenGlb(path.join(abs, f));
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (const p of primitives) {
        for (let i = 0; i < p.vertices.length; i += 3) {
          for (let c = 0; c < 3; c++) {
            min[c] = Math.min(min[c], p.vertices[i + c]);
            max[c] = Math.max(max[c], p.vertices[i + c]);
          }
        }
      }
      const r = (v) => Math.round(v * 1000) / 1000;
      out[pack + "/" + path.basename(f, ".glb")] = { min: min.map(r), max: max.map(r), size: [r(max[0] - min[0]), r(max[1] - min[1]), r(max[2] - min[2])] };
    } catch (err) {
      out[pack + "/" + path.basename(f, ".glb")] = "ERR " + err.message;
    }
  }
}
fs.mkdirSync("tmp-render", { recursive: true });
fs.writeFileSync("tmp-render/measure.json", JSON.stringify(out, null, 1));
console.log("models measured:", Object.keys(out).length, "-> tmp-render/measure.json");
