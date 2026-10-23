/**
 * Live preview for ```scene3d JSON fences (viz kind scene3d).
 * Lazy-loads three.js from shell vendor (same as Voice shell).
 */

const THREE_MODULE_URL = "/shell/vendor/three.module.js";
const GLTF_LOADER_URL = "/shell/vendor/loaders/GLTFLoader.js";

let threeModulePromise = null;

function loadThreeModule() {
  if (!threeModulePromise) {
    threeModulePromise = import(/* webpackIgnore: true */ THREE_MODULE_URL);
  }
  return threeModulePromise;
}

function parseScene3dSource(raw) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Пустой блок scene3d");
  return JSON.parse(text);
}

function parseColor(value, fallback) {
  const s = String(value || fallback || "#94a3b8").trim();
  return s.startsWith("#") ? parseInt(s.slice(1), 16) : fallback;
}

function fitCameraToGroup(THREE, camera, group, padding = 1.35) {
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) {
    camera.position.set(2.5, 2, 3.5);
    camera.lookAt(0, 0.4, 0);
    return;
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  const fov = (camera.fov * Math.PI) / 180;
  let dist = (maxDim / 2 / Math.tan(fov / 2)) * padding;
  dist = Math.max(dist, 2);
  camera.position.set(center.x + dist * 0.65, center.y + dist * 0.45, center.z + dist * 0.85);
  camera.lookAt(center.x, center.y + size.y * 0.08, center.z);
}

async function buildObject(THREE, GLTFLoader, spec, ctx) {
  const type = String(spec.type || "box").toLowerCase();
  const color = parseColor(spec.color, "#7c6cff");
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: Number(spec.metalness ?? 0.08),
    roughness: Number(spec.roughness ?? 0.72)
  });

  let mesh = null;
  if (type === "sphere") {
    const r = Number(spec.radius ?? 0.5);
    mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat);
  } else if (type === "cylinder") {
    const rt = Number(spec.radiusTop ?? spec.radius ?? 0.4);
    const rb = Number(spec.radiusBottom ?? spec.radius ?? 0.4);
    const h = Number(spec.height ?? 1);
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 24), mat);
  } else if (type === "cone") {
    const r = Number(spec.radius ?? 0.45);
    const h = Number(spec.height ?? 1);
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0, r, h, 24), mat);
  } else if (type === "plane") {
    const size = spec.size || [2, 2];
    const w = Number(size[0] ?? 2);
    const h = Number(size[1] ?? 2);
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.rotation.x = -Math.PI / 2;
  } else if (type === "gltf" || type === "glb") {
    const url = String(spec.url || "").trim();
    if (!url) throw new Error("gltf: нужен url");
    const loader = new GLTFLoader();
    const abs = url.startsWith("http") ? url : ctx.resolveAssetUrl?.(url) || url;
    const gltf = await loader.loadAsync(abs);
    mesh = gltf.scene;
    if (spec.scale != null) {
      const s = Number(spec.scale);
      mesh.scale.setScalar(s);
    }
  } else {
    const size = spec.size || [1, 1, 1];
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(Number(size[0] ?? 1), Number(size[1] ?? 1), Number(size[2] ?? 1)),
      mat
    );
  }

  const pos = spec.position || [0, 0, 0];
  mesh.position.set(Number(pos[0] ?? 0), Number(pos[1] ?? 0), Number(pos[2] ?? 0));
  if (spec.rotation) {
    const rot = spec.rotation;
    mesh.rotation.set(
      ((Number(rot[0] ?? 0) * Math.PI) / 180),
      ((Number(rot[1] ?? 0) * Math.PI) / 180),
      ((Number(rot[2] ?? 0) * Math.PI) / 180)
    );
  }
  if (spec.name) mesh.name = String(spec.name);
  return mesh;
}

function mountScene3dFrame(pre, sourceText) {
  const frame = document.createElement("div");
  frame.className = "scene3d-preview-frame";
  frame.dataset.scene3dMounted = "pending";

  const toolbar = document.createElement("div");
  toolbar.className = "scene3d-preview-toolbar";
  toolbar.innerHTML =
    '<span class="scene3d-preview-badge">3D-сцена</span>' +
    '<span class="scene3d-preview-hint">перетаскивание — вращение · колёсико — масштаб</span>';

  const canvas = document.createElement("canvas");
  canvas.className = "scene3d-preview-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Интерактивная 3D-сцена");

  const errNode = document.createElement("p");
  errNode.className = "scene3d-preview-error hidden";

  frame.append(toolbar, canvas, errNode);
  pre.replaceWith(frame);

  return { frame, canvas, errNode, sourceText };
}

async function initScene3dViewer({ frame, canvas, errNode, sourceText, nodePath }) {
  let spec;
  try {
    spec = parseScene3dSource(sourceText);
  } catch (error) {
    errNode.textContent = error.message || "Неверный JSON в scene3d";
    errNode.classList.remove("hidden");
    frame.dataset.scene3dMounted = "error";
    return;
  }

  const THREE = await loadThreeModule();
  const { GLTFLoader } = await import(/* webpackIgnore: true */ GLTF_LOADER_URL);

  const ctx = {
    resolveAssetUrl(rel) {
      const clean = String(rel || "").replace(/^\/+/, "");
      if (!clean) return clean;
      if (/^https?:\/\//i.test(clean)) return clean;
      if (typeof window.buildApiUrl === "function" && typeof window.getActiveNodeApiPath === "function") {
        const topic = window.getActiveNodeApiPath();
        if (topic) {
          return window.buildApiUrl("/api/external/file", {
            path: topic,
            file: clean.replace(/^awn-storage\//, "")
          });
        }
      }
      return clean;
    }
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f5f9);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
  const rig = new THREE.Group();
  scene.add(rig);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(4, 8, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc4b5fd, 0.35);
  fill.position.set(-5, 2, -3);
  scene.add(fill);

  const objects = Array.isArray(spec.objects) ? spec.objects : [];
  for (const item of objects) {
    try {
      const obj = await buildObject(THREE, GLTFLoader, item, ctx);
      rig.add(obj);
    } catch (error) {
      console.warn("scene3d object skipped:", item, error);
    }
  }

  fitCameraToGroup(THREE, camera, rig);

  let rotY = 0.55;
  let rotX = 0.35;
  let zoom = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function applyRigTransform() {
    rig.rotation.set(rotX, rotY, 0);
    rig.scale.setScalar(zoom);
  }
  applyRigTransform();

  function resize() {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(frame);
  resize();

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX += (e.clientY - lastY) * 0.008;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.clientX;
    lastY = e.clientY;
    applyRigTransform();
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom *= e.deltaY > 0 ? 0.92 : 1.08;
      zoom = Math.max(0.35, Math.min(2.5, zoom));
      applyRigTransform();
    },
    { passive: false }
  );

  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    renderer.render(scene, camera);
  };
  tick();

  frame.dataset.scene3dMounted = "1";
  frame._scene3dDispose = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.dispose();
  };
}

export async function hydrateScene3dPreviewBlocks(rootNode) {
  const root = rootNode instanceof Element ? rootNode : null;
  if (!root) return;

  const blocks = [...root.querySelectorAll("pre > code.language-scene3d")].filter((code) => {
    const pre = code.closest("pre");
    return pre && !pre.closest(".scene3d-preview-frame");
  });

  if (!blocks.length) return;

  const nodePath =
    root.closest("[data-node-path]")?.getAttribute("data-node-path") ||
    (typeof window.getActiveNodeApiPath === "function" ? window.getActiveNodeApiPath() : "") ||
    "";

  for (const code of blocks) {
    const pre = code.closest("pre");
    if (!pre) continue;
    const sourceText = code.textContent || "";
    const mount = mountScene3dFrame(pre, sourceText);
    await initScene3dViewer({ ...mount, nodePath });
  }
}

if (typeof window !== "undefined") {
  window.agentCmsHydrateScene3dPreviewBlocks = hydrateScene3dPreviewBlocks;
}
