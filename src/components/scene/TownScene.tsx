"use client";

/**
 * WebGL town.
 *
 *  - static parts are merged per texture (≈20 draw calls for the whole city)
 *  - rides are kinematic groups driven from the frame loop
 *  - pedestrians/vehicles walk closed paths with the pack's animation clips
 *  - Persian signs and quest markers are DOM overlays projected from 3D (crisp
 *    text at any zoom, and no font atlas to ship)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildTown } from "@/game/layout/town";
import type { ActorSpec, LabelSpec, MarkerSpec, Part, PrimPart } from "@/game/layout/types";
import { instantiate, loadModel, findClip, type LoadedModel } from "./assets";
import { partMatrix, paintGeometry, primitiveGeometry, stripAttributes, modelToGeometries } from "./geometry";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeCameraRig, type CameraRig } from "./camera";
import { buildSky } from "./sky";

type Props = {
  onLandmarkClick?: (id: string) => void;
  onReady?: () => void;
};

type ActorRuntime = {
  spec: ActorSpec;
  group: THREE.Group;
  mixer?: THREE.AnimationMixer;
  length: number;
  offset: number;
};

const CLICK_TARGETS: { id: string; at: [number, number, number]; size: [number, number, number] }[] = [
  { id: "hospital", at: [-4.5, 2, -7.5], size: [11, 6, 9] },
  { id: "police", at: [9.5, 1.5, 5], size: [9, 3.5, 6] },
  { id: "garage", at: [-18, 1.5, 5], size: [8, 3.5, 6] },
  { id: "gym", at: [-11.5, 1.5, 5], size: [6, 3.5, 6] },
  { id: "shops", at: [20, 1.5, 5], size: [12, 3.5, 6] },
  { id: "farm", at: [15, 2, -8], size: [14, 4, 14] },
  { id: "barn", at: [21.5, 2, -11], size: [10, 4, 9] },
  { id: "park", at: [-18, 3, -9], size: [22, 8, 16] },
  { id: "plaza", at: [-13.6, 2, 11.4], size: [14, 5, 10] },
  { id: "playground", at: [-20.5, 1.6, 15.6], size: [12, 3, 9] },
  { id: "market", at: [22.5, 1.6, 10.4], size: [10, 3, 8] },
];

export default function TownScene({ onLandmarkClick, onReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const callbacks = useRef({ onLandmarkClick, onReady });
  callbacks.current = { onLandmarkClick, onReady };

  const town = useMemo(() => buildTown(), []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;

    /* ------------------------------------------------------ renderer + scene */
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color("#d6eefb"), 230, 520);
    buildSky(scene);

    let rig: CameraRig = makeCameraRig(town.frame, mount.clientWidth / Math.max(mount.clientHeight, 1));
    let camera = rig.camera;

    // Lighting is tuned to match the offline preview renderer (scripts/render.mjs):
    // a bright ambient base plus one soft key light keeps the flat cartoon look.
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 0.42);
    sun.position.set(-24, 34, 20);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdff0ff, 0.18);
    fill.position.set(20, 12, -24);
    scene.add(fill);

    /* ------------------------------------------------------------ materials */
    /** "urban/grass" → "/assets/models/urban/Textures/grass.png" */
    const textureUrl = (key: string) => {
      const [pack, ...rest] = key.split("/");
      return `/assets/models/${pack}/Textures/${rest.join("/")}.png`;
    };
    const textureLoader = new THREE.TextureLoader();
    const textures = new Map<string, THREE.Texture>();
    const texture = (key: string) => {
      let tex = textures.get(key);
      if (!tex) {
        tex = textureLoader.load(textureUrl(key));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = 4;
        textures.set(key, tex);
      }
      return tex;
    };
    const materials = new Map<string, THREE.Material>();
    const material = (textureKey: string | null) => {
      const id = textureKey ?? "-";
      let mat = materials.get(id);
      if (!mat) {
        mat = new THREE.MeshLambertMaterial({
          map: textureKey ? texture(textureKey) : undefined,
          vertexColors: true,
          side: THREE.FrontSide,
        });
        materials.set(id, mat);
      }
      return mat;
    };

    /* -------------------------------------------------- geometry resolution */
    const modelPromises = new Map<string, Promise<LoadedModel | null>>();
    const getModel = (key: string) => {
      let promise = modelPromises.get(key);
      if (!promise) {
        promise = loadModel(key).catch(() => null);
        modelPromises.set(key, promise);
      }
      return promise;
    };

    /** Resolves one layout part into world-space geometry entries (one per texture). */
    const resolvePart = async (part: Part): Promise<{ geometry: THREE.BufferGeometry; textureKey: string | null }[]> => {
      const modelKey = (part as { m?: string }).m;
      if (modelKey && modelKey !== "__group__") {
        const model = await getModel(modelKey);
        if (!model) return [];
        return modelToGeometries(model, part);
      }
      const spec = primitiveGeometry(part as PrimPart);
      if (!spec) return [];
      const prim = part as PrimPart;
      paintGeometry(spec, prim.c, prim.c2);
      spec.geometry.applyMatrix4(partMatrix(part));
      stripAttributes(spec.geometry);
      return [{ geometry: spec.geometry, textureKey: prim.t ?? null }];
    };

    /* ------------------------------------------------------- static geometry */
    const labelNodes: { spec: LabelSpec; el: HTMLElement; y: number; natural: number }[] = [];
    const markerNodes: { spec: MarkerSpec; el: HTMLElement }[] = [];

    async function buildStatics() {
      // per-texture buckets, merged at the end → a handful of draw calls
      const buckets = new Map<string, THREE.BufferGeometry[]>();
      const parts = town.parts.filter((p) => !(p as { g?: string }).g);
      const chunk = 60;
      for (let i = 0; i < parts.length; i += chunk) {
        if (disposed) return;
        const resolved = await Promise.all(parts.slice(i, i + chunk).map(resolvePart));
        for (const entries of resolved) {
          for (const entry of entries) {
            const key = entry.textureKey ?? "-";
            const list = buckets.get(key) ?? [];
            list.push(entry.geometry);
            buckets.set(key, list);
          }
        }
      }
      if (disposed) return;
      for (const [key, list] of buckets) {
        const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, material(key === "-" ? null : key));
        mesh.frustumCulled = false;
        scene.add(mesh);
      }
      setLoading(false);
      callbacks.current.onReady?.();
    }

    /* ---------------------------------------------------------------- rides */
    const groups = new Map<string, Part[]>();
    for (const part of town.parts) {
      const g = (part as { g?: string }).g;
      if (!g) continue;
      const list = groups.get(g) ?? [];
      list.push(part);
      groups.set(g, list);
    }
    const animated = new Map<string, THREE.Group>();
    for (const [id, parts] of groups) {
      const pivot = parts
        .reduce((acc, p) => acc.add(new THREE.Vector3(p.p[0], p.p[1], p.p[2])), new THREE.Vector3())
        .divideScalar(parts.length);
      const group = new THREE.Group();
      group.position.copy(pivot);
      scene.add(group);
      animated.set(id, group);
      for (const part of parts) {
        const local: Part = { ...part, p: [part.p[0] - pivot.x, part.p[1] - pivot.y, part.p[2] - pivot.z] } as Part;
        resolvePart(local).then((entries) => {
          if (disposed) return;
          for (const entry of entries) group.add(new THREE.Mesh(entry.geometry, material(entry.textureKey)));
        });
      }
    }

    /* --------------------------------------------------------------- actors */
    const actors: ActorRuntime[] = [];
    const pathLength = (path: [number, number, number][]) => {
      let total = 0;
      for (let i = 0; i < path.length; i++) {
        const a = path[i];
        const b = path[(i + 1) % path.length];
        total += Math.hypot(b[0] - a[0], b[2] - a[2]);
      }
      return total;
    };
    const samplePath = (path: [number, number, number][], distance: number) => {
      const total = pathLength(path);
      let d = ((distance % total) + total) % total;
      for (let i = 0; i < path.length; i++) {
        const a = path[i];
        const b = path[(i + 1) % path.length];
        const seg = Math.hypot(b[0] - a[0], b[2] - a[2]);
        if (d <= seg || i === path.length - 1) {
          const f = seg > 0 ? d / seg : 0;
          return {
            pos: new THREE.Vector3(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f),
            yaw: Math.atan2(b[0] - a[0], b[2] - a[2]),
            pitch: -Math.atan2(b[1] - a[1], seg),
          };
        }
        d -= seg;
      }
      return { pos: new THREE.Vector3(...path[0]), yaw: 0, pitch: 0 };
    };

    async function buildActor(spec: ActorSpec) {
      const group = new THREE.Group();
      scene.add(group);
      const actor: ActorRuntime = { spec, group, length: pathLength(spec.path), offset: spec.phase * pathLength(spec.path) };
      actors.push(actor);

      if (spec.m === "__group__") {
        for (const part of spec.parts ?? []) {
          const entries = await resolvePart(part);
          if (disposed) return;
          for (const entry of entries) group.add(new THREE.Mesh(entry.geometry, material(entry.textureKey)));
        }
        return;
      }

      const model = await instantiate(spec.m).catch(() => null);
      if (!model || disposed) return;
      model.scene.scale.setScalar(spec.scale ?? 1);
      group.add(model.scene);
      // gentle per-character tint variation
      const shade = 0.9 + ((spec.phase * 11) % 1) * 0.25;
      // the packs ship unlit materials — use the same lit material as the town so
      // the crowd matches the buildings, only tinted for variety
      model.scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        const map = src?.map ?? null;
        if (map) {
          map.colorSpace = THREE.SRGBColorSpace;
          map.magFilter = THREE.NearestFilter;
        }
        mesh.material = new THREE.MeshLambertMaterial({
          map,
          color: new THREE.Color(shade, shade, shade),
          side: THREE.FrontSide,
        });
      });
      if (model.animations.length) {
        actor.mixer = new THREE.AnimationMixer(model.scene);
        const preferred =
          spec.m.startsWith("mini/wheelchair")
            ? ["wheelchair-move-forward", "walk"]
            : spec.kind === "walker"
              ? [spec.clip === "idle" ? "idle" : "walk", "walk", "idle"]
              : ["idle"];
        const clip = findClip(model.animations, preferred);
        if (clip) {
          const action = actor.mixer.clipAction(clip);
          action.play();
          action.time = spec.phase * clip.duration * 2;
        }
      }
    }

    /* ------------------------------------------------ labels + markers (DOM) */
    const labelLayer = labelsRef.current;
    if (labelLayer) {
      labelLayer.innerHTML = "";
      for (const spec of town.labels) {
        const el = document.createElement("button");
        el.type = "button";
        el.dataset.kind = spec.tone ?? "sign";
        el.className = "loco-sign";
        el.textContent = spec.text;
        el.style.setProperty("--sign-w", `${spec.w}rem`);
        el.addEventListener("pointerdown", (event) => event.stopPropagation());
        labelLayer.appendChild(el);
        // natural size is measured after layout so the sign can be scaled to span
        // exactly spec.w world units at any zoom / aspect ratio
        labelNodes.push({ spec, el, y: spec.at[1], natural: 0 });
      }
      for (const spec of town.markers) {
        const el = document.createElement("div");
        el.className = "loco-marker";
        el.dataset.kind = spec.kind;
        el.innerHTML =
          spec.kind === "quest"
            ? '<span class="loco-marker-bubble">!</span>'
            : spec.kind === "shop"
              ? '<span class="loco-marker-bubble">🛒</span>'
              : '<span class="loco-marker-bubble">💬</span>';
        labelLayer.appendChild(el);
        markerNodes.push({ spec, el });
      }
    }

    /* ------------------------------------------------------------- interaction */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      let best: { id: string; distance: number } | null = null;
      for (const target of CLICK_TARGETS) {
        const box = new THREE.Box3(
          new THREE.Vector3(target.at[0] - target.size[0] / 2, target.at[1], target.at[2] - target.size[2] / 2),
          new THREE.Vector3(target.at[0] + target.size[0] / 2, target.at[1] + target.size[1], target.at[2] + target.size[2] / 2),
        );
        const hit = raycaster.ray.intersectBox(box, new THREE.Vector3());
        if (hit) {
          const distance = hit.distanceTo(camera.position);
          if (!best || distance < best.distance) best = { id: target.id, distance };
        }
      }
      if (best) callbacks.current.onLandmarkClick?.(best.id);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    let zoom = 1;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom * (1 - Math.sign(event.deltaY) * 0.08), 0.6, 2.4);
      rig.setZoom(zoom);
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    /* ------------------------------------------------------------ frame loop */
    const anchorTemp = new THREE.Vector3();
    const clock = new THREE.Clock();
    let frameHandle = 0;
    let elapsed = 0;
    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 1 / 20);
      elapsed += delta;
      frameHandle = requestAnimationFrame(tick);

      for (const actor of actors) {
        const distance = (actor.offset + elapsed * actor.spec.speed) % actor.length;
        const sample = samplePath(actor.spec.path, distance);
        actor.group.position.copy(sample.pos);
        if (actor.spec.kind === "vehicle") actor.group.position.y += 0.05;
        actor.group.rotation.y = sample.yaw;
        if (actor.spec.pitch) actor.group.rotation.x = sample.pitch;
        actor.mixer?.update(delta * Math.max(0.6, actor.spec.speed));
      }

      const wheel = animated.get("wheel-rotor");
      if (wheel) wheel.rotation.z = -elapsed * 0.2;
      const carouselRotor = animated.get("carousel-rotor");
      if (carouselRotor) carouselRotor.rotation.y = elapsed * 0.32;
      for (let i = 0; i < 8; i++) {
        const cabin = animated.get("wheel-cabin-" + i);
        if (cabin) cabin.rotation.z = elapsed * 0.2; // counter-rotate: cabins stay upright
      }

      const width = mount.clientWidth;
      const height = mount.clientHeight;
      const project = (at: [number, number, number]) => {
        anchorTemp.set(at[0], at[1], at[2]).project(camera);
        return { x: (anchorTemp.x * 0.5 + 0.5) * width, y: (-anchorTemp.y * 0.5 + 0.5) * height };
      };
      // world units → screen pixels, so HTML signs scale with the camera
      const pixelsPerUnit = height / rig.viewSize;
      for (const node of labelNodes) {
        const p = project(node.spec.at);
        if (!node.natural) {
          // first frame: remember the unscaled width of the text
          const measured = node.el.getBoundingClientRect().width / (node.el.dataset.scale ? Number(node.el.dataset.scale) : 1);
          node.natural = measured || node.el.offsetWidth || 1;
        }
        const scale = ((node.spec.w * pixelsPerUnit) / node.natural) * (node.spec.tone === "brand" ? 1.2 : 1);
        node.el.dataset.scale = String(scale);
        node.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      }
      for (const node of markerNodes) {
        const p = project(node.spec.at);
        const bob = Math.sin(elapsed * 2.6 + node.spec.at[0]) * 6;
        node.el.style.transform = `translate3d(${p.x}px, ${p.y + bob}px, 0) translate(-50%, -100%) scale(${pixelsPerUnit / 30})`;
      }

      renderer.render(scene, camera);
    };

    /* --------------------------------------------------------------- lifecycle */
    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const w = mount.clientWidth;
        const h = Math.max(mount.clientHeight, 1);
        renderer.setSize(w, h);
        camera.userData.aspect = w / h;
        rig.resize(w, h);
      });
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(mount);

    // signs are measured against the real font metrics once the webfont is ready
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => {
        for (const node of labelNodes) node.natural = 0;
      });
    }

    let cancelled = false;
    buildStatics().then(() => {
      if (!cancelled && !disposed) setLoading(false);
    });
    for (const spec of town.actors) void buildActor(spec);
    tick();

    return () => {
      cancelled = true;
      disposed = true;
      cancelAnimationFrame(frameHandle);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      if (labelLayer) labelLayer.innerHTML = "";
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose?.();
        }
      });
      for (const mat of materials.values()) mat.dispose();
      for (const tex of textures.values()) tex.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [town]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />
      <div ref={labelsRef} className="loco-label-layer" aria-hidden={false} />
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-gradient-to-b from-sky-300/70 via-sky-200/50 to-amber-100/40 backdrop-blur-[2px]">
          <div className="pop-in rounded-3xl border-4 border-amber-900/80 bg-amber-50 px-8 py-5 text-center shadow-[0_10px_0_rgba(120,72,20,0.35)]">
            <p className="text-2xl font-black text-amber-900">در حال ساختن شهر…</p>
            <p className="mt-1 text-sm font-bold text-amber-700">مدل‌های Kenney در حال بارگذاری است</p>
          </div>
        </div>
      )}
    </div>
  );
}
