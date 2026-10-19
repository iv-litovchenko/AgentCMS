/* =====================================================================
   ГОЛОСТОЛ-МАСТЕРСКАЯ — собрать броню из деталей руками (three.js)
   ===================================================================== */
(() => {
const sec = JV.addTab('table', 'Голостол ✦', `
  <div class="max-w-4xl mb-3"><div class="h2">ГОЛОСТОЛ · МАСТЕРСКАЯ</div>
    <p class="m-0 text-[14px] text-jv-text">Как в сцене, где Тони проектирует костюм над столом: детали брони лежат вокруг, <b>перетащите каждую мышкой</b> на светящийся силуэт — она защёлкнется. Тяните пустое место, чтобы вращать стол, колёсиком — зум, клик по детали — паспорт. Жесты: 🖐 разобрать, ✊ собрать, 👈👉 вращать.</p></div>
  <div class="grid grid-cols-1 xl:grid-cols-4 gap-3">
    <div class="xl:col-span-3 jv-tile !p-0 relative overflow-hidden" style="height:min(78vh,640px);background:radial-gradient(ellipse at 50% 80%,rgba(0,212,255,.22),rgba(2,8,14,.97) 62%)">
      <div id="ttWrap" class="absolute inset-0 cursor-grab"></div>
      <div class="absolute inset-0 pointer-events-none" style="background:repeating-linear-gradient(0deg,rgba(0,212,255,.04) 0 1px,transparent 1px 3px)"></div>
      <div class="absolute left-4 top-3 pointer-events-none"><div class="font-hud text-jv-cyan tracking-[.3em] text-[13px]">MARK 86 · СБОРКА</div><div id="ttProg" class="jv-sub mt-1">загрузка three.js…</div></div>
      <div class="absolute right-3 top-3 flex flex-wrap gap-1.5 justify-end">
        <button id="ttAuto" class="jv-btn">🦾 СОБРАТЬ НА МНЕ</button><button id="ttBlow" class="jv-btn !border-jv-gold !text-jv-gold !bg-jv-gold/10">💥 РАЗОБРАТЬ</button><button id="ttScan" class="jv-btn !border-jv-green !text-jv-green !bg-jv-green/10">📡 СКАН</button></div>
      <div id="ttDone" class="absolute left-1/2 top-14 -translate-x-1/2 hidden text-center pointer-events-none"><div class="font-hud text-[28px] text-white tracking-[.2em]" style="text-shadow:0 0 30px #ffb547">MARK 86 ГОТОВ</div><div class="jv-sub mt-2">все системы в норме</div></div>
    </div>
    <div class="flex flex-col gap-3">
      <div class="jv-tile"><div class="jv-label mb-2">Детали</div><div id="ttList" class="space-y-1"></div></div>
      <div class="jv-tile flex-1"><div class="jv-label mb-2">Паспорт детали</div><div id="ttInfo" class="text-[13px] leading-relaxed"><span class="jv-sub">кликните деталь</span></div></div>
    </div>
  </div>`, 'holo');

const PARTS = [
  ['helmet', 'Шлем', 'Титан-золотой сплав, HUD-проектор, 2 камеры', 1.9, [0, 2.55, 0]],
  ['chest', 'Нагрудник + реактор', 'Палладиевый дуговой реактор 8 ГДж, наноботы', 7.4, [0, 1.65, 0]],
  ['pelvis', 'Пояс', 'Стабилизаторы, запас наноботов', 3.1, [0, .9, 0]],
  ['shL', 'Наплечник Л', 'Микроракеты ×4', 1.2, [-.66, 2.12, 0]], ['shR', 'Наплечник П', 'Микроракеты ×4', 1.2, [.66, 2.12, 0]],
  ['armL', 'Рука Л + репульсор', 'Репульсор 4.2 кН, перчатка с тактильным откликом', 2.6, [-.74, 1.35, 0]], ['armR', 'Рука П + репульсор', 'Репульсор 4.2 кН, лазерный резак', 2.6, [.74, 1.35, 0]],
  ['legL', 'Нога Л', 'Тяговые двигатели в ботинке', 4.8, [-.24, -.15, 0]], ['legR', 'Нога П', 'Тяговые двигатели в ботинке', 4.8, [.24, -.15, 0]],
];
let T, R, scene, cam, stage, parts = [], ghosts = [], raf, started = false, assembled = new Set(), scanY = -9, autoRun = false;
$('#ttList').innerHTML = PARTS.map(p => `<div class="flex items-center gap-2 text-[12.5px]" data-tl="${p[0]}"><span class="w-2.5 h-2.5 rounded-full border border-solid border-jv-mute"></span><span class="flex-1">${p[1]}</span><span class="jv-sub">${p[3]} кг</span></div>`).join('');

function geo(id) {
  const g = new T.Group(), m = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending }), w = c => new T.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: .85, depthWrite: false, blending: T.AdditiveBlending });
  const add = (gm, x = 0, y = 0, z = 0) => { [m(0xff4d5e, .16), w(0xffb547)].forEach(mt => { const o = new T.Mesh(gm, mt); o.position.set(x, y, z); g.add(o) }) };
  if (id === 'helmet') { add(new T.BoxGeometry(.44, .52, .46, 3, 3, 3)); add(new T.BoxGeometry(.3, .07, .02), 0, .05, .24) }
  if (id === 'chest') { add(new T.BoxGeometry(1, 1.2, .52, 3, 3, 2)); const r = new T.Mesh(new T.TorusGeometry(.14, .035, 8, 28), new T.MeshBasicMaterial({ color: 0xffffff })); r.position.set(0, .15, .28); r.userData.core = true; g.add(r) }
  if (id === 'pelvis') add(new T.BoxGeometry(.8, .35, .46, 2, 1, 1));
  if (id.startsWith('sh')) add(new T.SphereGeometry(.2, 10, 8));
  if (id.startsWith('arm')) { add(new T.CylinderGeometry(.14, .13, .8, 10), 0, .38); add(new T.CylinderGeometry(.13, .11, .75, 10), 0, -.4); add(new T.CylinderGeometry(.07, .07, .02, 16), 0, -.79) }
  if (id.startsWith('leg')) { add(new T.CylinderGeometry(.19, .16, .95, 10), 0, .45); add(new T.CylinderGeometry(.15, .13, .95, 10), 0, -.5); add(new T.BoxGeometry(.25, .13, .42), 0, -1, .08) }
  return g;
}
function init() {
  if (started) return; started = true;
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js').then(() => {
    T = THREE; const wrap = $('#ttWrap'); let W = wrap.clientWidth, H = wrap.clientHeight;
    R = new T.WebGLRenderer({ antialias: true, alpha: true }); R.setPixelRatio(devicePixelRatio); R.setSize(W, H); wrap.append(R.domElement);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(42, W / H, .1, 100); cam.position.set(0, 2.2, 8.5); cam.lookAt(0, .8, 0);
    stage = new T.Group(); scene.add(stage);
    const grid = new T.PolarGridHelper(3.4, 16, 6, 64, 0x00d4ff, 0x00506a); grid.position.y = -1.25; grid.material.transparent = true; grid.material.opacity = .45; stage.add(grid);
    const beam = new T.Mesh(new T.CylinderGeometry(1.3, 1.3, 4.4, 40, 1, true), new T.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: .04, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); beam.position.y = .95; stage.add(beam);
    const sp = new T.Mesh(new T.PlaneGeometry(3, 3), new T.MeshBasicMaterial({ color: 0x3dffa8, transparent: true, opacity: .14, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); sp.rotation.x = -Math.PI / 2; sp.visible = false; stage.add(sp);
    PARTS.forEach(([id, n, d, kg, tgt], i) => {
      const gh = geo(id); gh.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.color.set(0x00d4ff); o.material.opacity = .12 } }); gh.position.set(...tgt); stage.add(gh); ghosts.push(gh);
      const p = geo(id); const a = i / PARTS.length * Math.PI * 2 + .3; p.userData = { id, n, d, kg, tgt: new T.Vector3(...tgt), home: new T.Vector3(Math.cos(a) * 2.7, -.75 + (i % 3) * .25, Math.sin(a) * 2.7 * .55 + .4) };
      p.position.copy(p.userData.home); p.rotation.y = a; stage.add(p); parts.push(p);
    });
    // взаимодействие
    const rc = new T.Raycaster(), mv = new T.Vector2(), plane = new T.Plane(), hit = new T.Vector3(), off = new T.Vector3(); let drag = null, orbit = null, moved = 0, vy = 0;
    const ndc = e => { const r = wrap.getBoundingClientRect(); mv.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(mv, cam) };
    const pick = () => { const h = rc.intersectObjects(parts, true)[0]; if (!h) return null; let o = h.object; while (o && !parts.includes(o)) o = o.parent; return o };
    wrap.onpointerdown = e => { ndc(e); moved = 0; const p = pick(); wrap.setPointerCapture(e.pointerId); if (p) { drag = p; assembled.delete(p.userData.id); const wp = p.getWorldPosition(new T.Vector3()); plane.setFromNormalAndCoplanarPoint(cam.getWorldDirection(new T.Vector3()).negate(), wp); rc.ray.intersectPlane(plane, hit); off.copy(wp).sub(hit); info(p); wrap.style.cursor = 'grabbing' } else orbit = { x: e.clientX } };
    wrap.onpointermove = e => { if (drag) { ndc(e); if (rc.ray.intersectPlane(plane, hit)) { const w = hit.add(off); drag.position.copy(stage.worldToLocal(w.clone())); moved++; const dd = drag.position.distanceTo(drag.userData.tgt); ghosts[parts.indexOf(drag)].traverse(o => { if (o.material) o.material.opacity = dd < .55 ? .45 : .12 }) } } else if (orbit) { const dx = e.clientX - orbit.x; orbit.x = e.clientX; stage.rotation.y += dx * .008; vy = dx * .008 } };
    wrap.onpointerup = () => { if (drag) { const p = drag; drag = null; ghosts[parts.indexOf(p)].traverse(o => { if (o.material) o.material.opacity = .12 }); if (p.position.distanceTo(p.userData.tgt) < .55) snap(p); else upd() } orbit = null; wrap.style.cursor = 'grab' };
    wrap.onwheel = e => { e.preventDefault(); cam.position.z = Math.max(4.5, Math.min(14, cam.position.z + e.deltaY * .006)) };
    window.tableGesture = k => { if (k === 'Open_Palm') { blow(); return true } if (k === 'Closed_Fist') { auto(); return true } if (k === 'Swipe_L') { vy = -.15; return true } if (k === 'Swipe_R') { vy = .15; return true } return false };
    new ResizeObserver(() => { W = wrap.clientWidth; H = wrap.clientHeight; if (!W) return; R.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix() }).observe(wrap);
    const t0 = performance.now();
    (function loop() {
      raf = requestAnimationFrame(loop); if (!sec.classList.contains('on')) return; const t = (performance.now() - t0) / 1000;
      if (!orbit) { stage.rotation.y += vy; vy *= .94 }
      parts.forEach(p => { if (p.userData.anim) { const a = p.userData.anim, k = Math.min(1, (performance.now() - a.t0) / a.dur), e = 1 - Math.pow(1 - k, 3); p.position.lerpVectors(a.from, a.to, e); p.rotation.y = a.r0 * (1 - e); if (k >= 1) { p.userData.anim = null; a.done?.() } } else if (!assembled.has(p.userData.id) && p !== drag) p.position.y = p.userData.home.y + Math.sin(t * 1.4 + p.userData.home.x) * .05 + (p.position.distanceTo(p.userData.home) < .01 ? 0 : 0) });
      const full = assembled.size === PARTS.length; parts[1].traverse(o => { if (o.userData.core) o.scale.setScalar(full ? 1.3 + Math.sin(t * 6) * .25 : 1) });
      ghosts.forEach((g, i) => g.visible = !assembled.has(PARTS[i][0]));
      if (scanY > -2) { scanY += .035; sp.visible = true; sp.position.y = scanY; parts.forEach(p => p.traverse(o => { if (o.material?.wireframe) o.material.color.set(Math.abs(p.getWorldPosition(new T.Vector3()).y - scanY) < .25 ? 0x3dffa8 : 0xffb547) })); if (scanY > 3.2) { scanY = -9; sp.visible = false; toast('📡 Скан: 9/9 деталей без дефектов'); } }
      beam.material.opacity = full ? .09 + Math.sin(t * 3) * .03 : .04;
      R.render(scene, cam);
    })();
    upd();
  }).catch(() => $('#ttProg').textContent = 'не удалось загрузить three.js (нужен интернет)');
}
function animTo(p, to, dur, done) { p.userData.anim = { from: p.position.clone(), to: to.clone(), t0: performance.now(), dur, r0: p.rotation.y, done } }
function snap(p) { animTo(p, p.userData.tgt, 260, () => { p.rotation.y = 0 }); assembled.add(p.userData.id); window.sfxClick?.(); upd(); if (assembled.size === PARTS.length) done() }
function upd() { $('#ttProg').textContent = `собрано ${assembled.size} / ${PARTS.length} · масса ${PARTS.filter(p => assembled.has(p[0])).reduce((a, p) => a + p[3], 0).toFixed(1)} кг`; $$('[data-tl]').forEach(r => { const on = assembled.has(r.dataset.tl); r.firstElementChild.style.background = on ? '#3dffa8' : ''; r.firstElementChild.style.borderColor = on ? '#3dffa8' : ''; r.style.color = on ? '#3dffa8' : '' }); $('#ttDone').classList.toggle('hidden', assembled.size !== PARTS.length) }
function info(p) { const u = p.userData; $('#ttInfo').innerHTML = `<b class="text-jv-gold">${u.n}</b><div class="mt-1">${u.d}</div><div class="jv-sub mt-2">масса ${u.kg} кг · ${assembled.has(u.id) ? '✓ установлена' : 'не установлена'}</div>` }
function done() { speak?.('Марк восемьдесят шесть собран. Все системы в норме, сэр.'); toast('🦾 Mark 86 собран'); bus?.('table.done', {}) }
async function auto() { if (!parts.length || autoRun) return; autoRun = true; speak?.('Начинаю сборку.'); const order = ['legL', 'legR', 'pelvis', 'chest', 'armL', 'armR', 'shL', 'shR', 'helmet']; for (const id of order) { const p = parts.find(x => x.userData.id === id); if (assembled.has(id)) continue; animTo(p, p.userData.tgt, 520, () => p.rotation.y = 0); assembled.add(id); upd(); await sleep(330) } autoRun = false; if (assembled.size === PARTS.length) done() }
function blow() { if (!parts.length) return; assembled.clear(); parts.forEach((p, i) => animTo(p, p.userData.home, 600 + i * 40)); upd(); speak?.('Разбираю.') }
$('#ttAuto').onclick = auto; $('#ttBlow').onclick = blow; $('#ttScan').onclick = () => { scanY = -1.3; speak?.('Сканирую.') };
window.sfxClick = () => { try { const a = window._ttCtx ||= new AudioContext(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.frequency.setValueAtTime(1200, t); o.frequency.exponentialRampToValueAtTime(300, t + .08); g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0001, t + .1); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .12) } catch (e) { } };
{ const prev = window.onTab; window.onTab = t => { prev?.(t); if (t === 'table') init() } }
{ const _fg = fireGesture; window.fireGesture = fireGesture = function (k, s) { if (sec.classList.contains('on') && window.tableGesture?.(k)) { glog?.(`${GACT[k]?.e || ''} ${k} → голостол`); return } return _fg(k, s) } }
SKILLS.unshift({ re: /(голостол|мастерск.*брон|собери (костюм|броню|марк|mark))/i, run: () => { goTab('table'); setTimeout(auto, 1500); return 'Открываю голостол и собираю костюм, сэр.' } });
})();
