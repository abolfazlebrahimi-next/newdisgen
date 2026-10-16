/**
 * Tiny software rasteriser that mimics the three.js setup used by the app
 * (orthographic camera, ambient + single directional light) so a scene can be
 * previewed from the command line. Orthographic projection means UVs and depth
 * interpolate linearly in screen space.
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { loadTexture, sampleTexture } from "./textures.mjs";

const DEG = Math.PI / 180;

export function makeCamera({ elevationDeg, azimuthDeg, distance, target }, aspect, viewSize) {
  const e = elevationDeg * DEG;
  const a = azimuthDeg * DEG;
  const eye = [
    target[0] + distance * Math.cos(e) * Math.sin(a),
    target[1] + distance * Math.sin(e),
    target[2] + distance * Math.cos(e) * Math.cos(a),
  ];
  // three.js convention: camera z axis points from target to eye, camera looks
  // along -z; localX = normalize(cross(up, z)), localY = cross(z, localX).
  const back = [eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]];
  const camZ = normalize(back);
  const upv = [0, 1, 0];
  const x = normalize(cross(upv, camZ));
  const y = cross(camZ, x);
  const halfW = (viewSize * aspect) / 2;
  const halfH = viewSize / 2;
  return { eye, x, y, camZ, halfW, halfH, viewSize };
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize(v) {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export class Renderer {
  constructor(width, height, camera, opts = {}) {
    this.width = width;
    this.height = height;
    this.camera = camera;
    this.color = new Float32Array(width * height * 3);
    this.depth = new Float32Array(width * height).fill(Infinity);
    this.alpha = new Float32Array(width * height).fill(1);
    this.skyTop = opts.skyTop || [0.72, 0.87, 0.97];
    this.skyBottom = opts.skyBottom || [0.98, 0.99, 1.0];
    this.light = normalize(opts.light || [-0.45, 0.78, 0.45]);
    this.ambient = opts.ambient ?? 0.86;
    this.diffuse = opts.diffuse ?? 0.3;
    this.transparent = [];
    // gradient sky background
    for (let py = 0; py < height; py++) {
      const t = py / (height - 1);
      const c = [0, 1, 2].map((i) => this.skyTop[i] * (1 - t) + this.skyBottom[i] * t);
      for (let px = 0; px < width; px++) {
        const o = (py * width + px) * 3;
        this.color[o] = c[0];
        this.color[o + 1] = c[1];
        this.color[o + 2] = c[2];
      }
    }
  }

  project(p) {
    const c = this.camera;
    const rx = p[0] - c.eye[0];
    const ry = p[1] - c.eye[1];
    const rz = p[2] - c.eye[2];
    const sx = dot([rx, ry, rz], c.x);
    const sy = dot([rx, ry, rz], c.y);
    const depth = -dot([rx, ry, rz], c.camZ);
    return [
      ((sx + c.halfW) / (c.halfW * 2)) * this.width,
      ((c.halfH - sy) / (c.halfH * 2)) * this.height,
      depth,
    ];
  }

  /** Draws a triangle soup. Colors are per-vertex-less: tex + tint + flat shading. */
  addTriangle(v0, v1, v2, opts) {
    const cam = this.camera;
    const p0 = this.project(v0);
    const p1 = this.project(v1);
    const p2 = this.project(v2);
    const winding = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]);
    // Back face culling: screen space has y pointing down, so an outward-facing
    // (counter-clockwise in right-handed model space) triangle ends up with a
    // negative screen-space winding.
    if (!opts.doubleSided && winding >= 0) return;
    const uv0 = opts.uv?.[0] || null;
    const uv1 = opts.uv?.[1] || null;
    const uv2 = opts.uv?.[2] || null;
    const item = {
      p0, p1, p2, uv0, uv1, uv2,
      winding: Math.abs(winding),
      color: opts.color || [1, 1, 1],
      tint: opts.tint || [1, 1, 1],
      texture: opts.texture || null,
      alpha: (opts.alpha ?? 1) * (opts.textureAlpha ? 1 : 1),
      flip: winding < 0,
      opaque: (opts.alpha ?? 1) >= 0.999 && !opts.transparent,
      shade: this.shade(opts.normal || [0, 1, 0]),
    };
    if (item.opaque) this.raster(item, true);
    else this.transparent.push(item);
  }

  shade(n) {
    const d = Math.max(0, dot(normalize(n), this.light));
    return Math.min(1, this.ambient + this.diffuse * d);
  }

  flushTransparent() {
    // painter's algorithm back to front
    this.transparent.sort((a, b) => {
      const da = (a.p0[2] + a.p1[2] + a.p2[2]) / 3;
      const db = (b.p0[2] + b.p1[2] + b.p2[2]) / 3;
      return db - da;
    });
    for (const item of this.transparent) this.raster(item, false);
    this.transparent.length = 0;
  }

  raster(t, writeDepth) {
    const W = this.width;
    const H = this.height;
    let x0 = Math.max(0, Math.floor(Math.min(t.p0[0], t.p1[0], t.p2[0])));
    let x1 = Math.min(W - 1, Math.ceil(Math.max(t.p0[0], t.p1[0], t.p2[0])));
    let y0 = Math.max(0, Math.floor(Math.min(t.p0[1], t.p1[1], t.p2[1])));
    let y1 = Math.min(H - 1, Math.ceil(Math.max(t.p0[1], t.p1[1], t.p2[1])));
    if (x1 < x0 || y1 < y0) return;
    const area = t.winding;
    if (area < 1e-9) return;
    const tex = t.texture ? loadTexture(t.texture) : null;
    const sample = [0, 0, 0, 1];
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const x = px + 0.5;
        const y = py + 0.5;
        const w0 = ((t.p1[0] - t.p0[0]) * (y - t.p0[1]) - (x - t.p0[0]) * (t.p1[1] - t.p0[1])) / (t.flip ? -area : area);
        const w1 = ((x - t.p0[0]) * (t.p2[1] - t.p0[1]) - (t.p2[0] - t.p0[0]) * (y - t.p0[1])) / (t.flip ? -area : area);
        if (w0 < 0 || w1 < 0 || w0 + w1 > 1) continue;
        const w2 = 1 - w0 - w1;
        const depth = w2 * t.p0[2] + w1 * t.p1[2] + w0 * t.p2[2];
        const idx = py * W + px;
        if (depth >= this.depth[idx]) continue;
        let r = 1;
        let g = 1;
        let b = 1;
        let a = t.alpha;
        if (tex && t.uv0 && t.uv1 && t.uv2) {
          const u = w2 * t.uv0[0] + w1 * t.uv1[0] + w0 * t.uv2[0];
          const v = w2 * t.uv0[1] + w1 * t.uv1[1] + w0 * t.uv2[1];
          // glTF UVs have their origin at the top-left of the image, which matches
          // the raw top-down texel order, so no V flip is needed.
          sampleTexture(tex, u, v, sample);
          r = sample[0];
          g = sample[1];
          b = sample[2];
          a *= sample[3];
        }
        r *= t.color[0] * t.tint[0] * t.shade;
        g *= t.color[1] * t.tint[1] * t.shade;
        b *= t.color[2] * t.tint[2] * t.shade;
        if (a <= 0.002) continue;
        const o = idx * 3;
        if (a >= 0.999) {
          this.color[o] = r;
          this.color[o + 1] = g;
          this.color[o + 2] = b;
        } else {
          const bg = this.alpha[idx];
          const outA = a + bg * (1 - a);
          this.color[o] = (r * a + this.color[o] * bg * (1 - a)) / (outA || 1);
          this.color[o + 1] = (g * a + this.color[o + 1] * bg * (1 - a)) / (outA || 1);
          this.color[o + 2] = (b * a + this.color[o + 2] * bg * (1 - a)) / (outA || 1);
          this.alpha[idx] = outA;
        }
        if (writeDepth && a >= 0.999) this.depth[idx] = depth;
      }
    }
  }

  save(outFile) {
    const W = this.width;
    const H = this.height;
    const header = Buffer.from(`P6\n${W} ${H}\n255\n`, "ascii");
    const body = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      for (let c = 0; c < 3; c++) {
        const v = Math.max(0, Math.min(1, this.color[i * 3 + c])) * 255;
        body[i * 3 + c] = Math.round(v);
      }
    }
    const ppm = outFile.replace(/\.png$/, ".ppm");
    fs.writeFileSync(ppm, Buffer.concat([header, body]));
    execFileSync("convert", [ppm, outFile]);
    return outFile;
  }
}

export { normalize, cross, dot };
