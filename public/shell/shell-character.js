const PHASE_COLORS = {
  waiting: { ring: 0x7c6cff, head: 0xc4b5fd, pulse: 0.35 },
  listening: { ring: 0xff6b8a, head: 0xffb4c4, pulse: 0.55 },
  thinking: { ring: 0xffd166, head: 0xe8d49a, pulse: 0.5 },
  speaking: { ring: 0x58c4ff, head: 0xb8e4ff, pulse: 0.55 },
  disabled: { ring: 0x5a6088, head: 0x8a90b8, pulse: 0.2 }
};

function phaseColors(phase) {
  return PHASE_COLORS[phase] || PHASE_COLORS.waiting;
}

function buildFallback(viewport) {
  viewport.innerHTML = `
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
  `;
}

export async function initShellCharacter(stageEl) {
  if (!stageEl) return null;

  const viewport = stageEl.querySelector(".shell-character-viewport");
  if (!viewport) return null;

  let three = null;
  try {
    three = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js");
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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
  camera.position.set(0, 0.15, 3.1);
  camera.lookAt(0, 0.05, 0);

  const ambient = new THREE.AmbientLight(0xeef0ff, 0.75);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight(0x7c6cff, 0.65);
  rim.position.set(-2, 1, -2);
  scene.add(ambient, key, rim);

  const group = new THREE.Group();
  scene.add(group);

  const headMat = new THREE.MeshStandardMaterial({
    color: PHASE_COLORS.waiting.head,
    roughness: 0.38,
    metalness: 0.12
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x8b7cf8,
    roughness: 0.48,
    metalness: 0.08
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xeef0ff,
    emissive: PHASE_COLORS.waiting.ring,
    emissiveIntensity: PHASE_COLORS.waiting.pulse,
    roughness: 0.25,
    metalness: 0.35
  });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.9 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 40, 40), headMat);
  head.position.y = 0.38;

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24), bodyMat);
  body.position.y = -0.32;
  body.scale.set(1, 0.82, 0.95);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 20, 96, Math.PI * 1.28), ringMat);
  ring.rotation.x = Math.PI / 2.15;
  ring.rotation.z = -0.35;
  ring.position.y = 0.48;

  const platform = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 48),
    new THREE.MeshBasicMaterial({ color: 0x7c6cff, transparent: true, opacity: 0.18 })
  );
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = -0.82;

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.95, 48),
    new THREE.MeshBasicMaterial({ color: 0x7c6cff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.81;

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), eyeMat);
  leftEye.position.set(-0.16, 0.45, 0.46);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.16;

  group.add(platform, glow, body, head, ring, leftEye, rightEye);

  let width = 0;
  let height = 0;
  let frameId = 0;

  function resize() {
    width = viewport.clientWidth;
    height = viewport.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function applyPhase(phase) {
    const colors = phaseColors(phase);
    headMat.color.setHex(colors.head);
    ringMat.emissive.setHex(colors.ring);
    ringMat.emissiveIntensity = colors.pulse;
  }

  function animate() {
    frameId = requestAnimationFrame(animate);
    const phase = stageEl.dataset.phase || "waiting";
    applyPhase(phase);
    const t = performance.now() * 0.001;
    group.rotation.y = Math.sin(t * 0.55) * 0.42;
    group.position.y = Math.sin(t * 1.15) * 0.045;

    if (phase === "listening") {
      ring.scale.setScalar(1 + Math.sin(t * 7) * 0.06);
      head.scale.setScalar(1 + Math.sin(t * 5) * 0.02);
    } else if (phase === "thinking") {
      ring.rotation.z = -0.35 + t * 1.4;
      ring.scale.setScalar(1);
      head.scale.setScalar(1);
    } else if (phase === "speaking") {
      head.scale.set(1 + Math.sin(t * 9) * 0.03, 1 + Math.sin(t * 9) * 0.05, 1);
      ring.scale.setScalar(1 + Math.sin(t * 4) * 0.03);
    } else {
      ring.scale.setScalar(1);
      head.scale.setScalar(1);
    }

    renderer.render(scene, camera);
  }

  resize();
  animate();

  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null;
  observer?.observe(viewport);

  return () => {
    cancelAnimationFrame(frameId);
    observer?.disconnect();
    renderer.dispose();
    head.geometry.dispose();
    body.geometry.dispose();
    ring.geometry.dispose();
    platform.geometry.dispose();
    glow.geometry.dispose();
    leftEye.geometry.dispose();
    headMat.dispose();
    bodyMat.dispose();
    ringMat.dispose();
    eyeMat.dispose();
  };
}
