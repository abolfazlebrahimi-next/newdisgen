/**
 * Cartoon sky: gradient dome, fluffy cloud billboards and a ring of far-away
 * hills, so the horizon reads like the reference art instead of empty fog.
 */
import * as THREE from "three";

function gradientTexture(stops: [number, string][]) {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cloudTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const blobs: [number, number, number][] = [
    [0.34, 0.58, 0.20],
    [0.52, 0.48, 0.24],
    [0.7, 0.58, 0.19],
    [0.44, 0.66, 0.17],
    [0.6, 0.68, 0.16],
  ];
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  for (const [cx, cy, r] of blobs) {
    ctx.beginPath();
    ctx.arc(cx * size, cy * size, r * size, 0, Math.PI * 2);
    ctx.fill();
  }
  // soft shading at the bottom of the puffs
  ctx.globalCompositeOperation = "source-atop";
  const shade = ctx.createLinearGradient(0, size * 0.4, 0, size * 0.85);
  shade.addColorStop(0, "rgba(214,236,250,0)");
  shade.addColorStop(1, "rgba(196,224,244,0.85)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildSky(scene: THREE.Scene) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.MeshBasicMaterial({
      map: gradientTexture([
        [0, "#4fb3e8"],
        [0.45, "#8fd3f0"],
        [0.72, "#c8e9f8"],
        [1, "#eaf7fd"],
      ]),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  dome.position.y = 40;
  scene.add(dome);

  // cloud billboards
  const texture = cloudTexture();
  const clouds = new THREE.Group();
  const rand = mulberry(9137);
  for (let i = 0; i < 16; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9, depthWrite: false, fog: false }),
    );
    const scale = 12 + rand() * 16;
    sprite.scale.set(scale, scale * 0.62, 1);
    sprite.position.set(-90 + rand() * 180, 22 + rand() * 18, -60 - rand() * 60);
    clouds.add(sprite);
  }
  scene.add(clouds);

  // distant hills
  const hillMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#79c46a"), fog: false });
  const hillMaterialFar = new THREE.MeshBasicMaterial({ color: new THREE.Color("#a4d98f"), fog: false });
  const hills = new THREE.Group();
  for (let i = 0; i < 26; i++) {
    const far = i % 2 === 0;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), far ? hillMaterialFar : hillMaterial);
    const radius = (far ? 16 : 11) + rand() * 8;
    mesh.scale.set(radius, radius * (0.34 + rand() * 0.16), radius);
    mesh.position.set(-120 + rand() * 240, far ? -2 : -1, -95 - rand() * 40);
    hills.add(mesh);
  }
  scene.add(hills);

  return { dome, clouds, hills };
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
