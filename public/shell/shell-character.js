import {
  HERO_CHARACTER_ID,
  PICKER_CHARACTER_MODELS,
  getCharacterModel,
  isFallbackCharacter,
  loadStoredCharacterId,
  saveStoredCharacterId
} from "/shell/shell-character-models.js?v=12";

const THREE_MODULE = "/shell/vendor/three.module.js";
const GLTF_LOADER_MODULE = "/shell/vendor/loaders/GLTFLoader.js";

function showCloudFallback(viewport, canvas) {
  if (!viewport.querySelector(".shell-character-fallback")) {
    viewport.insertAdjacentHTML(
      "beforeend",
      `
    <div class="shell-character-fallback" aria-hidden="true">
      <div class="shell-character-rig">
        <div class="shell-character-platform"></div>
        <svg class="shell-character-ring-svg" viewBox="0 0 64 64" role="presentation">
          <path d="M 46 18 A 20 20 0 1 0 46 46" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" />
        </svg>
        <div class="shell-character-head">
          <span class="shell-character-eye"></span>
          <span class="shell-character-eye"></span>
          <span class="shell-character-mouth"></span>
        </div>
      </div>
    </div>
  `
    );
  }
  if (canvas) canvas.style.display = "none";
}

function hideCloudFallback(viewport, canvas) {
  viewport.querySelector(".shell-character-fallback")?.remove();
  if (canvas) canvas.style.display = "block";
}

function buildFallback(viewport) {
  showCloudFallback(viewport, null);
}

function addStageLights(THREE, scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xfff4e8, 1.15);
  key.position.set(2.2, 3.8, 2.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9aa8ff, 0.55);
  fill.position.set(-2.4, 2.2, -1.8);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x7c6cff, 0.35);
  rim.position.set(0, 1.6, -3.2);
  scene.add(rim);
}

function prepareModelMaterials(THREE, root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.needsUpdate = true;
      }
      if (material.isMeshStandardMaterial && material.userData?.gltfExtensions?.KHR_materials_unlit) {
        material.toneMapped = false;
      }
      if ("metalness" in material && material.metalness > 0.85) material.metalness = 0.35;
      if ("roughness" in material && material.roughness < 0.2) material.roughness = 0.55;
      material.needsUpdate = true;
    }
  });
}
function addStageFloor(THREE, scene) {
  const platform = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 48),
    new THREE.MeshBasicMaterial({ color: 0x7c6cff, transparent: true, opacity: 0.16 })
  );
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = -0.02;
  scene.add(platform);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.88, 48),
    new THREE.MeshBasicMaterial({ color: 0x7c6cff, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.01;
  scene.add(glow);
}

function resolveAction(actions, spec) {
  if (!actions || !spec) return null;
  if (spec.clip && actions[spec.clip]) return actions[spec.clip];
  const firstKey = Object.keys(actions)[0];
  return firstKey ? actions[firstKey] : null;
}

function fitModelToStage(THREE, camera, model, transform = {}) {
  const {
    rotY = 0,
    scale: scaleMul = 1,
    targetHeight = 1.28,
    framePadding = 1.08,
    groundLift = 0.02,
    lookRatio = 0.44,
    zoom = 1
  } = transform;

  model.rotation.set(0, rotY, 0);
  model.position.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(model);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const autoScale = targetHeight / Math.max(initialSize.y, 0.001);
  model.scale.setScalar(autoScale * scaleMul);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -box.min.y + groundLift, -center.z);
  model.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(model);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const lookY = fitted.min.y + fittedSize.y * lookRatio;
  const fovRad = (camera.fov * Math.PI) / 180;
  const zoomFactor = Math.max(Number(zoom) || 1, 0.55);
  const verticalDistance = (fittedSize.y * framePadding) / (Math.tan(fovRad / 2) * zoomFactor);
  const horizontalDistance = verticalDistance / Math.max(camera.aspect, 0.55);
  const distance = Math.max(verticalDistance, horizontalDistance);

  camera.position.set(0, lookY, distance);
  camera.lookAt(0, lookY, 0);
  camera.updateProjectionMatrix();
}

function renderCharacterOptionIcon(model) {
  if (model.iconSvg) {
    return `<img class="shell-character-option-icon-img" src="${model.iconSvg}" width="22" height="22" alt="" aria-hidden="true" />`;
  }
  return `<span class="shell-character-option-icon" aria-hidden="true">${model.icon || ""}</span>`;
}

function renderPicker(pickerEl, activeId, onPick) {
  if (!pickerEl) return;
  pickerEl.replaceChildren();
  for (const model of PICKER_CHARACTER_MODELS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shell-character-option";
    btn.dataset.modelId = model.id;
    btn.title = model.credit;
    btn.setAttribute("aria-label", model.label);
    btn.setAttribute("aria-pressed", model.id === activeId ? "true" : "false");
    btn.innerHTML = `${renderCharacterOptionIcon(model)}<span class="shell-character-option-label">${model.label}</span>`;
    btn.addEventListener("click", () => onPick(model.id));
    pickerEl.appendChild(btn);
  }
}

function updateSelectionUi(pickerEl, avatarEl, activeId) {
  const isCloud = activeId === HERO_CHARACTER_ID;
  avatarEl?.setAttribute("data-character-selected", isCloud ? "1" : "0");
  avatarEl?.setAttribute("aria-pressed", isCloud ? "true" : "false");
  pickerEl?.querySelectorAll(".shell-character-option").forEach((btn) => {
    btn.setAttribute("aria-pressed", !isCloud && btn.dataset.modelId === activeId ? "true" : "false");
  });
}

export async function initShellCharacter(stageEl, avatarEl) {
  if (!stageEl) return null;

  const viewport = stageEl.querySelector(".shell-character-viewport");
  const pickerEl = stageEl.querySelector(".shell-character-picker");
  if (!viewport) return null;

  let activeModelId = loadStoredCharacterId();
  let loadedModelId = "";
  let loadModelFn = null;

  renderPicker(pickerEl, activeModelId, (modelId) => {
    if (loadModelFn) void loadModelFn(modelId);
    else {
      activeModelId = modelId;
      saveStoredCharacterId(modelId);
      updateSelectionUi(pickerEl, avatarEl, modelId);
    }
  });

  if (avatarEl) {
    avatarEl.setAttribute("role", "button");
    avatarEl.setAttribute("tabindex", "0");
    avatarEl.setAttribute("title", "Облачко");
    avatarEl.setAttribute("aria-label", "Облачко");
    avatarEl.removeAttribute("aria-hidden");
    const pickCloud = () => {
      if (loadModelFn) void loadModelFn(HERO_CHARACTER_ID);
      else {
        activeModelId = HERO_CHARACTER_ID;
        saveStoredCharacterId(HERO_CHARACTER_ID);
        updateSelectionUi(pickerEl, avatarEl, HERO_CHARACTER_ID);
      }
    };
    avatarEl.addEventListener("click", pickCloud);
    avatarEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pickCloud();
      }
    });
  }

  updateSelectionUi(pickerEl, avatarEl, activeModelId);

  let THREE = null;
  let GLTFLoader = null;
  try {
    THREE = await import(THREE_MODULE);
    ({ GLTFLoader } = await import(GLTF_LOADER_MODULE));
  } catch {
    buildFallback(viewport);
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "shell-character-canvas";
  viewport.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
  addStageFloor(THREE, scene);
  addStageLights(THREE, scene);

  const rig = new THREE.Group();
  scene.add(rig);

  const clock = new THREE.Clock();
  const loader = new GLTFLoader();

  let mixer = null;
  let actions = {};
  let activeAction = null;
  let activePhase = "";
  let activeModelSpec = getCharacterModel(activeModelId);
  let modelReady = false;
  let loadingModel = false;
  let frameId = 0;
  let currentModelRoot = null;
  let cloudMode = isFallbackCharacter(activeModelSpec);

  function resize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function disposeCurrentModel() {
    for (const action of Object.values(actions)) action.stop();
    actions = {};
    activeAction = null;
    activePhase = "";
    if (mixer) {
      mixer.stopAllAction();
      mixer = null;
    }
    if (currentModelRoot) {
      rig.remove(currentModelRoot);
      currentModelRoot.traverse((node) => {
        if (node.isMesh) {
          node.geometry?.dispose();
          if (Array.isArray(node.material)) node.material.forEach((mat) => mat.dispose());
          else node.material?.dispose();
        }
      });
      currentModelRoot = null;
    }
    modelReady = false;
  }

  function playPhaseAnimation(phase) {
    if (!mixer || !modelReady) return;
    const spec = activeModelSpec.phases[phase] || activeModelSpec.phases.waiting;
    const next = resolveAction(actions, spec);
    if (!next) return;
    const timeScale = Number(spec.timeScale) || 1;
    if (activePhase === phase && activeAction === next && next.getEffectiveTimeScale() === timeScale) return;
    activePhase = phase;
    if (activeAction && activeAction !== next) activeAction.fadeOut(0.2);
    next.reset().setEffectiveTimeScale(timeScale).setLoop(THREE.LoopRepeat).fadeIn(0.2).play();
    if (timeScale === 0) next.paused = true;
    else next.paused = false;
    activeAction = next;
  }

  function loadModel(modelId) {
    if (loadingModel) return Promise.resolve();
    const spec = getCharacterModel(modelId);
    if (modelId === loadedModelId && (modelReady || cloudMode)) return Promise.resolve();

    loadingModel = true;
    disposeCurrentModel();
    activeModelId = modelId;
    loadedModelId = "";
    activeModelSpec = spec;
    cloudMode = isFallbackCharacter(spec);
    saveStoredCharacterId(modelId);
    updateSelectionUi(pickerEl, avatarEl, modelId);

    if (cloudMode) {
      showCloudFallback(viewport, canvas);
      modelReady = false;
      loadedModelId = modelId;
      loadingModel = false;
      return Promise.resolve();
    }

    hideCloudFallback(viewport, canvas);

    return new Promise((resolve) => {
      loader.load(
        spec.file,
        (gltf) => {
          const model = gltf.scene;
          prepareModelMaterials(THREE, model);
          rig.add(model);
          currentModelRoot = model;
          fitModelToStage(THREE, camera, model, spec.transform || {});
          resize();
          if (currentModelRoot) fitModelToStage(THREE, camera, currentModelRoot, spec.transform || {});

          mixer = new THREE.AnimationMixer(model);
          for (const clip of gltf.animations || []) {
            const key = clip.name || "default";
            actions[key] = mixer.clipAction(clip);
          }
          modelReady = true;
          loadedModelId = modelId;
          loadingModel = false;
          playPhaseAnimation(stageEl.dataset.phase || "waiting");
          resolve();
        },
        undefined,
        () => {
          loadingModel = false;
          if (modelId !== "robot") {
            void loadModel("robot");
          } else {
            renderer.dispose();
            buildFallback(viewport);
          }
          resolve();
        }
      );
    });
  }

  function animate() {
    frameId = requestAnimationFrame(animate);
    if (!cloudMode) {
      playPhaseAnimation(stageEl.dataset.phase || "waiting");
      if (mixer) mixer.update(clock.getDelta());
      if (modelReady) {
        const t = performance.now() * 0.001;
        rig.rotation.y = Math.sin(t * 0.45) * 0.12;
      }
      renderer.render(scene, camera);
    }
  }

  loadModelFn = loadModel;

  resize();
  animate();
  void loadModel(activeModelId);

  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null;
  observer?.observe(viewport);

  return () => {
    cancelAnimationFrame(frameId);
    observer?.disconnect();
    disposeCurrentModel();
    renderer.dispose();
  };
}
