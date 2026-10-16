/**
 * Camera rig: a fixed-angle orthographic camera fitted to the town bounds.
 *
 * The offline preview renderer (scripts/render.mjs) uses exactly the same maths,
 * so what `npm run preview:render` prints is what the browser shows.
 */
import * as THREE from "three";

export const DEFAULT_ELEVATION = 46;
export const DEFAULT_AZIMUTH = 0;

export type ScreenAnchor = {
  id: string;
  text?: string;
  kind?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
  visible: boolean;
};

export type CameraRig = {
  camera: THREE.OrthographicCamera;
  target: THREE.Vector3;
  viewSize: number;
  baseViewSize: number;
  setZoom: (zoom: number) => void;
  resize: (width: number, height: number) => void;
  project: (point: THREE.Vector3, width: number, height: number) => { x: number; y: number; scale: number; visible: boolean };
};

/** Fits the camera so the whole town is visible, matching the offline renderer. */
export function makeCameraRig(
  frame: { width: number; height: number },
  aspect: number,
  opts: { elevation?: number; azimuth?: number; target?: [number, number, number] } = {},
): CameraRig {
  const elevation = ((opts.elevation ?? DEFAULT_ELEVATION) * Math.PI) / 180;
  const azimuth = ((opts.azimuth ?? DEFAULT_AZIMUTH) * Math.PI) / 180;
  const target = new THREE.Vector3(...(opts.target ?? [0, 2.4, 0.6]));
  const distance = 260;

  const dir = new THREE.Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  );
  const eye = target.clone().addScaledVector(dir, distance);

  // project the four top corners of the town box to size the ortho frustum
  const halfW = frame.width / 2;
  const halfD = frame.height / 2;
  const corners = [
    [-halfW, 0, -halfD],
    [halfW, 0, -halfD],
    [-halfW, 8.5, -halfD],
    [halfW, 8.5, -halfD],
    [-halfW, 0, halfD],
    [halfW, 0, halfD],
  ];
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 800);
  camera.position.copy(eye);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);

  const inv = new THREE.Matrix4().copy(camera.matrixWorldInverse);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    const p = new THREE.Vector3(...(c as [number, number, number])).applyMatrix4(inv);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const margin = 1.04;
  const viewSize = Math.max((maxY - minY) * margin, ((maxX - minX) * margin) / aspect);

  const rig: CameraRig = {
    camera,
    target,
    viewSize,
    baseViewSize: viewSize,
    setZoom(zoom: number) {
      rig.viewSize = rig.baseViewSize / zoom;
      applyFrustum();
    },
    resize(width: number, height: number) {
      void width;
      void height;
      applyFrustum();
    },
    project(point, width, height) {
      const p = point.clone().project(camera);
      return {
        x: (p.x * 0.5 + 0.5) * width,
        y: (-p.y * 0.5 + 0.5) * height,
        scale: 1,
        visible: p.z > -1 && p.z < 1,
      };
    },
  };

  function applyFrustum() {
    const aspect = camera.userData.aspect ?? 1.6;
    const h = rig.viewSize / 2;
    const w = (rig.viewSize * aspect) / 2;
    camera.left = -w;
    camera.right = w;
    camera.top = h;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
  }

  camera.userData.aspect = aspect;
  camera.position.copy(eye);
  camera.lookAt(target);
  applyFrustum();
  rig.baseViewSize = viewSize;
  rig.viewSize = viewSize;
  applyFrustum();
  return rig;
}
