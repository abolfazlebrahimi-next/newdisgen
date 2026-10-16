/**
 * Minimal glTF/GLB reader used by the offline preview renderer.
 * Supports what the Kenney kits use: binary GLB, one buffer, float positions,
 * float/ubyte/ushort texcoords, ubyte/ushort/uint indices, node transforms and
 * KHR_texture_transform on the base color texture.
 */
import fs from "node:fs";

const COMPONENT = {
  5120: { array: Int8Array, size: 1 },
  5121: { array: Uint8Array, size: 1 },
  5122: { array: Int16Array, size: 2 },
  5123: { array: Uint16Array, size: 2 },
  5125: { array: Uint32Array, size: 4 },
  5126: { array: Float32Array, size: 4 },
};

const TYPE_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a glb: " + file);
  const total = buf.readUInt32LE(8);
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < total) {
    const len = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString("utf8"));
    else if (type === 0x004e4942) bin = data;
    offset += 8 + len + ((4 - (len % 4)) % 4);
  }
  if (!json) throw new Error("missing json chunk: " + file);
  return { json, bin: bin ?? new Uint8Array(0) };
}

export function readAccessor(gltf, bin, index) {
  const acc = gltf.accessors[index];
  const view = gltf.bufferViews[acc.bufferView];
  const { array: Arr, size } = COMPONENT[acc.componentType];
  const count = TYPE_COUNT[acc.type];
  const stride = view.byteStride || size * count;
  const base = (view.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Float32Array(acc.count * count);
  const view8 = new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < count; c++) {
      const at = base + i * stride + c * size;
      let v;
      if (acc.componentType === 5126) v = new DataView(bin.buffer, bin.byteOffset + at, 4).getFloat32(0, true);
      else if (acc.componentType === 5121) v = view8[at];
      else if (acc.componentType === 5123) v = new DataView(bin.buffer, bin.byteOffset + at, 2).getUint16(0, true);
      else if (acc.componentType === 5125) v = new DataView(bin.buffer, bin.byteOffset + at, 4).getUint32(0, true);
      else v = new Arr(bin.buffer, bin.byteOffset + at, 1)[0];
      if (acc.normalized) v /= acc.componentType === 5121 ? 255 : 65535;
      out[i * count + c] = v;
    }
  }
  return { values: out, count: acc.count, itemSize: count, array: out };
}

const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function nodeMatrix(node) {
  if (node.matrix) return node.matrix.slice();
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const s = node.scale || [1, 1, 1];
  const [x, y, z, w] = r;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

export function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

export function transformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

/** Flattens a glb into an array of primitives in model space (node transforms applied). */
export function flattenGlb(file) {
  const { json, bin } = readGlb(file);
  const primitives = [];
  const textures = [];

  const imageFor = (texIndex) => {
    if (texIndex === undefined) return null;
    const tex = json.textures[texIndex];
    const img = json.images[tex.source];
    if (!img || !img.uri) return null;
    if (!textures.includes(img.uri)) textures.push(img.uri);
    return img.uri;
  };

  const walk = (nodeIndex, parent) => {
    const node = json.nodes[nodeIndex];
    const world = multiply(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      for (const prim of json.meshes[node.mesh].primitives) {
        const pos = readAccessor(json, bin, prim.attributes.POSITION);
        const normal = prim.attributes.NORMAL !== undefined ? readAccessor(json, bin, prim.attributes.NORMAL) : null;
        const uv = prim.attributes.TEXCOORD_0 !== undefined ? readAccessor(json, bin, prim.attributes.TEXCOORD_0) : null;
        const idx = prim.indices !== undefined ? readAccessor(json, bin, prim.indices) : null;
        const mat = prim.material !== undefined ? json.materials[prim.material] : {};
        const pbr = mat.pbrMetallicRoughness || {};
        const texInfo = pbr.baseColorTexture;
        const texTransform = texInfo?.extensions?.KHR_texture_transform || null;
        const vertices = new Float32Array(pos.count * 3);
        const normals = normal ? new Float32Array(normal.count * 3) : null;
        for (let i = 0; i < pos.count; i++) {
          const p = transformPoint(world, [pos.values[i * 3], pos.values[i * 3 + 1], pos.values[i * 3 + 2]]);
          vertices[i * 3] = p[0];
          vertices[i * 3 + 1] = p[1];
          vertices[i * 3 + 2] = p[2];
          if (normals) {
            // node transforms in these kits only rotate/translate, so rotating the
            // normal with the upper 3x3 is enough
            const n = transformPoint([world[0], world[1], world[2], 0, world[4], world[5], world[6], 0, world[8], world[9], world[10], 0, 0, 0, 0, 1],
              [normal.values[i * 3], normal.values[i * 3 + 1], normal.values[i * 3 + 2]]);
            normals[i * 3] = n[0];
            normals[i * 3 + 1] = n[1];
            normals[i * 3 + 2] = n[2];
          }
        }
        primitives.push({
          vertices,
          normals,
          uvs: uv ? uv.values : null,
          indices: idx ? idx.values : null,
          texture: imageFor(texInfo?.index),
          baseColor: pbr.baseColorFactor || [1, 1, 1, 1],
          texTransform,
          doubleSided: !!mat.doubleSided,
          alphaMode: mat.alphaMode || "OPAQUE",
          name: (mat.name || "") + "|" + file.split("/").pop(),
        });
      }
    }
    for (const child of node.children || []) walk(child, world);
  };

  const scene = json.scenes[json.scene || 0];
  for (const n of scene.nodes) walk(n, identity());
  return { primitives, textures };
}
