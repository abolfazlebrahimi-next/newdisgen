/**
 * GLB loading for the browser.
 *
 * The kit models are copied verbatim into public/assets/models/<pack>/ by
 * `npm run assets:sync` (their textures sit in a sibling Textures/ folder, which
 * is exactly how the GLBs reference them).
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export type LoadedModel = {
  key: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

const cache = new Map<string, Promise<LoadedModel>>();
let loader: GLTFLoader | null = null;

function getLoader() {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

export const modelUrl = (key: string) => `/assets/models/${key}.glb`;

export function loadModel(key: string): Promise<LoadedModel> {
  let promise = cache.get(key);
  if (!promise) {
    promise = new Promise<LoadedModel>((resolve, reject) => {
      getLoader().load(
        modelUrl(key),
        (gltf) => {
          const scene = gltf.scene;
          scene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            const material = mesh.material as THREE.Material | THREE.Material[];
            for (const mat of Array.isArray(material) ? material : [material]) {
              const m = mat as THREE.MeshStandardMaterial;
              // the kits ship KHR_materials_unlit → MeshBasicMaterial; keep the
              // flat cartoon look but let vertex colours tint each copy
              m.vertexColors = true;
              if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
              m.side = m.side ?? THREE.FrontSide;
            }
            mesh.frustumCulled = true;
          });
          resolve({ key, scene, animations: gltf.animations ?? [] });
        },
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
    cache.set(key, promise);
  }
  return promise;
}

/** A fresh copy of a loaded model (skinned characters need SkeletonUtils). */
export async function instantiate(key: string): Promise<LoadedModel> {
  const model = await loadModel(key);
  const cloned = cloneSkinned(model.scene) as THREE.Group;
  return { key, scene: cloned, animations: model.animations };
}

export function preload(keys: string[], onProgress?: (done: number, total: number) => void) {
  let done = 0;
  const total = keys.length;
  return Promise.all(
    keys.map((key) =>
      loadModel(key)
        .then((m) => {
          done++;
          onProgress?.(done, total);
          return m;
        })
        .catch(() => {
          done++;
          onProgress?.(done, total);
          return null;
        }),
    ),
  );
}

/** Finds a clip by name fragment ("walk", "idle", "run"). */
export function findClip(animations: THREE.AnimationClip[], fragments: string[]) {
  for (const fragment of fragments) {
    const clip = animations.find((a) => a.name.toLowerCase().includes(fragment));
    if (clip) return clip;
  }
  return null;
}
