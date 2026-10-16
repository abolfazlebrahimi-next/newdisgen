/**
 * Geometry builder shared by the offline preview renderer.
 * The browser build interprets the exact same part spec with real three.js
 * meshes (see src/components/scene/SceneBuilder.tsx) — keep both in sync.
 */
import { normalize } from "./raster.mjs";

const TAU = Math.PI * 2;

export function rotateY([x, y, z], a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}
export function rotateX([x, y, z], a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}
export function rotateZ([x, y, z], a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c, z];
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scaleV(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function solidColor(count, color) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = color[0];
    out[i * 3 + 1] = color[1];
    out[i * 3 + 2] = color[2];
  }
  return out;
}

/** vertex colours for striped wedges (tents, awnings) */
function stripeColors(count, stripes, c1, c2) {
  const out = new Float32Array(count * 3);
  const seg = count / stripes;
  for (let i = 0; i < count; i++) {
    const wedge = Math.floor(i / seg) % 2;
    const c = wedge ? c2 : c1;
    out[i * 3] = c[0];
    out[i * 3 + 1] = c[1];
    out[i * 3 + 2] = c[2];
  }
  return out;
}

export function boxGeometry(size, uvScale = 1) {
  const [w, h, d] = size;
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const faces = [
    { n: [0, 0, 1], corners: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], u: [w, h] },
    { n: [0, 0, -1], corners: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]], u: [w, h] },
    { n: [1, 0, 0], corners: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]], u: [d, h] },
    { n: [-1, 0, 0], corners: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], u: [d, h] },
    { n: [0, 1, 0], corners: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]], u: [w, d] },
    { n: [0, -1, 0], corners: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], u: [w, d] },
  ];
  const positions = [];
  const uvs = [];
  const normals = [];
  const indices = [];
  let v = 0;
  for (const f of faces) {
    for (const c of f.corners) {
      positions.push(c[0], c[1], c[2]);
      normals.push(f.n[0], f.n[1], f.n[2]);
    }
    const su = f.u[0] * uvScale;
    const sv = f.u[1] * uvScale;
    uvs.push(0, 0, su, 0, su, sv, 0, sv);
    indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  }
  return { positions: Float32Array.from(positions), normals: Float32Array.from(normals), uvs: Float32Array.from(uvs), indices: Uint32Array.from(indices) };
}

export function planeGeometry(w, d, uvScale = 1) {
  const x = w / 2;
  const z = d / 2;
  return {
    positions: Float32Array.from([-x, 0, z, x, 0, z, x, 0, -z, -x, 0, -z]),
    normals: Float32Array.from([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
    uvs: Float32Array.from([0, 0, w * uvScale, 0, w * uvScale, d * uvScale, 0, d * uvScale]),
    indices: Uint32Array.from([0, 1, 2, 0, 2, 3]),
  };
}

export function cylinderGeometry(radiusTop, radiusBottom, height, segments = 16, uvScale = 1, stripe = 0) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const y0 = 0;
  const y1 = height;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = t * TAU;
    const cx = Math.cos(a);
    const sz = Math.sin(a);
    const nt = radiusTop - radiusBottom;
    const n = normalize([cx, nt || 0, sz]);
    positions.push(cx * radiusBottom, y0, sz * radiusBottom, cx * radiusTop, y1, sz * radiusTop);
    normals.push(n[0], n[1], n[2], n[0], n[1], n[2]);
    uvs.push(t * TAU * Math.max(radiusTop, radiusBottom) * uvScale, 0, t * TAU * Math.max(radiusTop, radiusBottom) * uvScale, height * uvScale);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const cap = (radius, y, up) => {
    if (radius <= 0) return;
    const center = positions.length / 3;
    positions.push(0, y, 0);
    normals.push(0, up ? 1 : -1, 0);
    uvs.push(0.5, 0.5);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * TAU;
      positions.push(Math.cos(a) * radius, y, Math.sin(a) * radius);
      normals.push(0, up ? 1 : -1, 0);
      uvs.push(Math.cos(a) * 0.5 + 0.5, Math.sin(a) * 0.5 + 0.5);
    }
    for (let i = 0; i < segments; i++) {
      const a = center + 1 + i;
      if (up) indices.push(center, a, a + 1);
      else indices.push(center, a + 1, a);
    }
  };
  cap(radiusTop, y1, true);
  cap(radiusBottom, y0, false);
  const geo = { positions: Float32Array.from(positions), normals: Float32Array.from(normals), uvs: Float32Array.from(uvs), indices: Uint32Array.from(indices) };
  if (stripe > 0) {
    // one alternating wedge per column of the side wall
    geo.wedge = new Uint16Array(positions.length / 3);
    for (let i = 0; i <= segments; i++) geo.wedge[i * 2] = geo.wedge[i * 2 + 1] = Math.floor((i / segments) * stripe) % stripe;
  }
  return geo;
}

export function sphereGeometry(radius, segments = 16, rings = 12) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let ry = 0; ry <= rings; ry++) {
    const v = ry / rings;
    const phi = v * Math.PI;
    for (let rx = 0; rx <= segments; rx++) {
      const u = rx / segments;
      const theta = u * TAU;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      positions.push(nx * radius, ny * radius, nz * radius);
      normals.push(nx, ny, nz);
      uvs.push(u, v);
    }
  }
  for (let ry = 0; ry < rings; ry++) {
    for (let rx = 0; rx < segments; rx++) {
      const a = ry * (segments + 1) + rx;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { positions: Float32Array.from(positions), normals: Float32Array.from(normals), uvs: Float32Array.from(uvs), indices: Uint32Array.from(indices) };
}

export function torusGeometry(radius, tube, radialSegments = 12, tubularSegments = 32) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= radialSegments; j++) {
    for (let i = 0; i <= tubularSegments; i++) {
      const u = (i / tubularSegments) * TAU;
      const v = (j / radialSegments) * TAU;
      const cx = radius * Math.cos(u);
      const cz = radius * Math.sin(u);
      const x = (radius + tube * Math.cos(v)) * Math.cos(u);
      const y = tube * Math.sin(v);
      const z = (radius + tube * Math.cos(v)) * Math.sin(u);
      positions.push(x, y, z);
      const n = normalize([x - cx, y, z - cz]);
      normals.push(n[0], n[1], n[2]);
      uvs.push(i / tubularSegments, j / radialSegments);
    }
  }
  for (let j = 1; j <= radialSegments; j++) {
    for (let i = 1; i <= tubularSegments; i++) {
      const a = (tubularSegments + 1) * j + i - 1;
      const b = (tubularSegments + 1) * (j - 1) + i - 1;
      const c = (tubularSegments + 1) * (j - 1) + i;
      const d = (tubularSegments + 1) * j + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  return { positions: Float32Array.from(positions), normals: Float32Array.from(normals), uvs: Float32Array.from(uvs), indices: Uint32Array.from(indices) };
}

export function circleGeometry(radius, segments = 20) {
  const positions = [0, 0, 0];
  const normals = [0, 1, 0];
  const uvs = [0.5, 0.5];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TAU;
    positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    normals.push(0, 1, 0);
    uvs.push(Math.cos(a) * 0.5 + 0.5, Math.sin(a) * 0.5 + 0.5);
  }
  for (let i = 0; i < segments; i++) indices.push(0, i + 1, i + 2);
  return { positions: Float32Array.from(positions), normals: Float32Array.from(normals), uvs: Float32Array.from(uvs), indices: Uint32Array.from(indices) };
}

export function primitiveGeometry(part) {
  switch (part.kind) {
    case "box":
      return boxGeometry(part.size, part.texScale ?? 1);
    case "plane":
      return planeGeometry(part.size[0], part.size[1], part.texScale ?? 1);
    case "cylinder":
    case "cone":
      return cylinderGeometry(
        part.kind === "cone" ? 0 : (part.radiusTop ?? part.radius),
        part.radiusBottom ?? part.radius,
        part.height,
        part.segments ?? 16,
        part.texScale ?? 1,
        part.stripe ?? 0,
      );
    case "sphere":
      return sphereGeometry(part.radius, part.segments ?? 16, part.rings ?? 12);
    case "torus":
      return torusGeometry(part.radius, part.tube, part.radialSegments ?? 12, part.tubularSegments ?? 32);
    case "circle":
      return circleGeometry(part.radius, part.segments ?? 20);
    default:
      return null;
  }
}

/** Pushes a parent transform (actor group) onto the renderer. */
export function pushTransform(renderer, frame) {
  if (!renderer._stack) renderer._stack = [];
  renderer._stack.push(frame);
}

export function popTransform(renderer) {
  if (renderer._stack) renderer._stack.pop();
}

function applyStack(renderer, point, isNormal) {
  const stack = renderer._stack;
  if (!stack || !stack.length) return point;
  let p = point;
  for (const frame of stack) {
    const scale = frame.scale === undefined ? [1, 1, 1] : typeof frame.scale === "number" ? [frame.scale, frame.scale, frame.scale] : frame.scale;
    let v = isNormal ? p : [p[0] * scale[0], p[1] * scale[1], p[2] * scale[2]];
    v = rotateZ(v, frame.rotZ || 0);
    v = rotateX(v, frame.rotX || 0);
    v = rotateY(v, frame.rotY || 0);
    p = [v[0] + (frame.pos[0] || 0), v[1] + (frame.pos[1] || 0), v[2] + (frame.pos[2] || 0)];
  }
  return p;
}

/** Applies part transform to local geometry -> world-space triangle list. */
export function emitGeometry(renderer, geometry, part, opts = {}) {
  const pos = part.pos;
  const scale = part.scale === undefined ? [1, 1, 1] : typeof part.scale === "number" ? [part.scale, part.scale, part.scale] : part.scale;
  const rotX = part.rotX || 0;
  const rotY = part.rotY || 0;
  const rotZ = part.rotZ || 0;
  const anchorY = part.anchor === "center" ? -((part.height ?? (part.size ? part.size[1] : 0)) / 2) : 0;
  const world = new Float32Array(geometry.positions.length);
  const worldNormals = new Float32Array(geometry.normals.length);
  const rotate = (v) => {
    let r = rotateZ(v, rotZ);
    r = rotateX(r, rotX);
    r = rotateY(r, rotY);
    return r;
  };
  const rotateN = (v) => {
    let r = rotateZ(v, rotZ);
    r = rotateX(r, rotX);
    r = rotateY(r, rotY);
    return r;
  };
  for (let i = 0; i < geometry.positions.length; i += 3) {
    const p = [geometry.positions[i] * scale[0], (geometry.positions[i + 1] + anchorY) * scale[1], geometry.positions[i + 2] * scale[2]];
    const w = applyStack(renderer, add(rotate(p), pos), false);
    world[i] = w[0];
    world[i + 1] = w[1];
    world[i + 2] = w[2];
    const n = applyStack(renderer, rotateN([geometry.normals[i], geometry.normals[i + 1], geometry.normals[i + 2]]), true);
    worldNormals[i] = n[0];
    worldNormals[i + 1] = n[1];
    worldNormals[i + 2] = n[2];
  }
  const idx = geometry.indices;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3;
    const b = idx[t + 1] * 3;
    const c = idx[t + 2] * 3;
    const v0 = [world[a], world[a + 1], world[a + 2]];
    const v1 = [world[b], world[b + 1], world[b + 2]];
    const v2 = [world[c], world[c + 1], world[c + 2]];
    const uv = geometry.uvs
      ? [
          [geometry.uvs[idx[t] * 2], geometry.uvs[idx[t] * 2 + 1]],
          [geometry.uvs[idx[t + 1] * 2], geometry.uvs[idx[t + 1] * 2 + 1]],
          [geometry.uvs[idx[t + 2] * 2], geometry.uvs[idx[t + 2] * 2 + 1]],
        ]
      : null;
    // flat normal from the first vertex is fine for the primitives we generate
    const normal = [worldNormals[a], worldNormals[a + 1], worldNormals[a + 2]];
    let color = part.color || [1, 1, 1];
    if (part.stripe && geometry.wedge) {
      const wedge = geometry.wedge[idx[t]];
      color = wedge % 2 === 0 ? color : (part.stripeColor || color);
    }
    renderer.addTriangle(v0, v1, v2, {
      normal,
      uv,
      color,
      tint: part.tint || [1, 1, 1],
      texture: opts.texture || null,
      alpha: part.alpha ?? 1,
      doubleSided: opts.doubleSided ?? part.doubleSided ?? false,
      transparent: (part.alpha ?? 1) < 0.999 || !!opts.transparent,
    });
  }
}
