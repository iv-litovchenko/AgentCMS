/* =====================================================================
   ГОЛО-HUD — самособирающийся интерфейс: спека → виджеты → хореография
   ===================================================================== */
(() => {
const S = { hdg: 274, pitch: 0, roll: 0, spd: 420, alt: 12400, pwr: 98, rep: 74, shd: 62, t0: performance.now() };
const C = '#00d4ff', C2 = '#5ff3ff', G = '#ffb547', RD = '#ff4d5e', GR = '#3dffa8';
let uid = 0, M = 1, sfxOn = true, actx = null;
const ramp = b => Math.max(0, Math.min(1, (performance.now() - (b._born || 0)) / 1200));
const q = (b, s) => (b._q ||= {})[s] ||= b.querySelector(s);

/* ---------- библиотека виджетов ---------- */
const HW = {};
HW.compass = { n: 'Компас', tag: 'HDG', shape: 'sq', build(b) {
  let s = ''; for (let i = 0; i < 72; i++) { const a = i * 5, big = i % 18 === 0, mid = i % 6 === 0; s += `<line class="d" pathLength="1" x1="100" y1="8" x2="100" y2="${big ? 26 : mid ? 20 : 15}" transform="rotate(${a} 100 100)" stroke="${big ? C2 : C}" stroke-width="${big ? 2 : 1}" stroke-opacity="${big ? 1 : .6}"/>`; if (mid && !big) s += `<text class="a" x="100" y="35" transform="rotate(${a} 100 100)" text-anchor="middle" font-size="8" fill="${C}" fill-opacity=".7">${a / 10}</text>` }
  ['N', 'E', 'S', 'W'].forEach((l, i) => s += `<text class="a" x="100" y="40" transform="rotate(${i * 90} 100 100)" text-anchor="middle" font-size="15" font-weight="700" fill="${i ? C2 : RD}">${l}</text>`);
  b.innerHTML = `<svg viewBox="0 0 200 200"><circle class="d" pathLength="1" cx="100" cy="100" r="92" fill="none" stroke="${C}" stroke-width="1.5"/><circle class="a" cx="100" cy="100" r="58" fill="none" stroke="${C}" stroke-opacity=".35" stroke-dasharray="2 3"/><g data-k="rose">${s}</g>
    <path class="a" d="M100 13 L94 1 L106 1Z" fill="${G}"/><path class="a" d="M100 70 L107 100 L100 94 L93 100Z" fill="${G}"/><text class="a" data-k="v" x="100" y="128" text-anchor="middle" font-size="20" font-weight="700" fill="#fff">000°</text><text class="a" x="100" y="142" text-anchor="middle" font-size="7.5" fill="${C}" letter-spacing="2">КУРС</text></svg>` },
  tick(b) { q(b, '[data-k=rose]').setAttribute('transform', `rotate(${-S.hdg} 100 100)`); q(b, '[data-k=v]').textContent = String(Math.round(((S.hdg % 360) + 360) % 360)).padStart(3, '0') + '°' } };

HW.horizon = { n: 'Авиагоризонт', tag: 'ADI', shape: 'sq', build(b) {
  const id = 'hz' + (++uid); let lad = '', roll = '';
  for (let p = -30; p <= 30; p += 5) { if (!p) continue; const y = 100 - p * 3, w = p % 10 ? 13 : 26; lad += `<line x1="${100 - w}" x2="${100 + w}" y1="${y}" y2="${y}" stroke="#fff" stroke-opacity=".8"/>` + (p % 10 ? '' : `<text x="${100 + w + 4}" y="${y + 3}" font-size="7" fill="#fff">${p}</text><text x="${100 - w - 4}" y="${y + 3}" font-size="7" fill="#fff" text-anchor="end">${p}</text>`) }
  [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].forEach(a => roll += `<line class="d" pathLength="1" x1="100" y1="9" x2="100" y2="${a % 30 ? 15 : 19}" transform="rotate(${a} 100 100)" stroke="${C2}" stroke-width="1.5"/>`);
  b.innerHTML = `<svg viewBox="0 0 200 200"><defs><clipPath id="${id}"><circle cx="100" cy="100" r="80"/></clipPath><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C}" stop-opacity=".38"/><stop offset="1" stop-color="${C}" stop-opacity=".05"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${G}" stop-opacity=".32"/><stop offset="1" stop-color="${G}" stop-opacity=".04"/></linearGradient></defs>
    <g clip-path="url(#${id})" class="a"><g data-k="att"><rect x="-200" y="-300" width="600" height="400" fill="url(#${id}s)"/><rect x="-200" y="100" width="600" height="400" fill="url(#${id}g)"/><line x1="-200" x2="400" y1="100" y2="100" stroke="${C2}" stroke-width="2"/>${lad}</g></g>
    <circle class="d" pathLength="1" cx="100" cy="100" r="80" fill="none" stroke="${C}" stroke-width="2"/>${roll}<path data-k="rp" d="M100 21 L95 30 L105 30Z" fill="${G}"/>
    <path class="d" pathLength="1" d="M56 100 L84 100 L92 110 L100 100 L108 110 L116 100 L144 100" fill="none" stroke="${G}" stroke-width="3"/><circle class="a" cx="100" cy="100" r="2.5" fill="${G}"/>
    <text class="a" data-k="v" x="100" y="197" text-anchor="middle" font-size="9" fill="${C}" letter-spacing="1">P +0.0°  R +0.0°</text></svg>` },
  tick(b) { q(b, '[data-k=att]').setAttribute('transform', `rotate(${-S.roll} 100 100) translate(0 ${S.pitch * 3})`); q(b, '[data-k=rp]').setAttribute('transform', `rotate(${-S.roll} 100 100)`); q(b, '[data-k=v]').textContent = `P ${S.pitch >= 0 ? '+' : ''}${S.pitch.toFixed(1)}°   R ${S.roll >= 0 ? '+' : ''}${S.roll.toFixed(1)}°` } };

const tape = (n, tag, key, step, lab, px, max, col) => ({ n, tag, shape: 'tall', build(b) {
  const id = 'tp' + (++uid); let s = ''; for (let v = 0; v <= max; v += step) { const y = -v * px; s += `<line x1="${v % lab ? 52 : 44}" x2="62" y1="${y}" y2="${y}" stroke="${col}" stroke-width="${v % lab ? 1 : 1.6}"/>` + (v % lab ? '' : `<text x="41" y="${y + 3}" text-anchor="end" font-size="8.5" fill="${col}">${v}</text>`) }
  b.innerHTML = `<svg viewBox="0 0 70 240" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="${id}"><rect x="0" y="10" width="70" height="222"/></clipPath></defs>
    <line class="d" pathLength="1" x1="62" y1="10" x2="62" y2="232" stroke="${col}" stroke-width="1.5"/><g clip-path="url(#${id})" class="a"><g data-k="tp">${s}</g></g>
    <path class="d" pathLength="1" d="M1 108 H54 L63 120 L54 132 H1 Z" fill="rgba(0,10,16,.92)" stroke="${col}" stroke-width="1.5"/><text data-k="v" class="a" x="28" y="124.5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">0</text><text class="a" x="35" y="6" text-anchor="middle" font-size="7" fill="${col}" letter-spacing="1">${tag}</text></svg>` },
  tick(b) { const v = S[key] * (b._born ? Math.min(1, .2 + ramp(b) * .8) : 1); q(b, '[data-k=tp]').setAttribute('transform', `translate(0 ${120 + v * px})`); q(b, '[data-k=v]').textContent = Math.round(v) } });
HW.speed = tape('Скорость', 'KT', 'spd', 10, 50, 2, 1200, C2);
HW.alt = tape('Высота', 'FT', 'alt', 100, 500, .2, 30000, G);

HW.radar = { n: 'Радар', tag: '360°', shape: 'sq', build(b) {
  const id = 'rd' + (++uid); b._bl = Array.from({ length: 8 }, (_, i) => ({ a: Math.random() * 360, r: 20 + Math.random() * 66, k: i === 2 }));
  b.innerHTML = `<svg viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${GR}" stop-opacity="0"/><stop offset="1" stop-color="${GR}" stop-opacity=".5"/></linearGradient></defs>
    ${[90, 66, 42, 18].map(r => `<circle class="d" pathLength="1" cx="100" cy="100" r="${r}" fill="none" stroke="${GR}" stroke-opacity=".5"/>`).join('')}
    <line class="d" pathLength="1" x1="10" y1="100" x2="190" y2="100" stroke="${GR}" stroke-opacity=".3"/><line class="d" pathLength="1" x1="100" y1="10" x2="100" y2="190" stroke="${GR}" stroke-opacity=".3"/>
    <g data-k="sw" class="a"><path d="M100 100 L36.4 36.4 A90 90 0 0 1 100 10 Z" fill="url(#${id})"/><line x1="100" y1="100" x2="100" y2="10" stroke="${GR}" stroke-width="2"/></g>
    ${b._bl.map((p, i) => { const x = 100 + Math.sin(p.a * Math.PI / 180) * p.r, y = 100 - Math.cos(p.a * Math.PI / 180) * p.r; return `<g data-b="${i}" opacity="0"><circle cx="${x}" cy="${y}" r="${p.k ? 3.5 : 2.6}" fill="${p.k ? RD : GR}"/>${p.k ? `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${RD}"/><text x="${x + 10}" y="${y + 3}" font-size="7" fill="${RD}">ЦЕЛЬ 2.4 км</text>` : ''}</g>` }).join('')}</svg>` },
  tick(b, t) { const a = (t * 80) % 360; q(b, '[data-k=sw]').setAttribute('transform', `rotate(${a} 100 100)`); b._bl.forEach((p, i) => { const d = ((a - p.a) % 360 + 360) % 360; q(b, `[data-b="${i}"]`).setAttribute('opacity', Math.max(0, 1 - d / 300).toFixed(2)) }) } };

HW.power = { n: 'Энергия', tag: 'ARC', shape: 'wide', build(b) {
  const g = (cx, lab, col, k) => `<circle class="a" cx="${cx}" cy="56" r="33" fill="none" stroke="${col}" stroke-opacity=".15" stroke-width="7" pathLength="100" stroke-dasharray="75 100" transform="rotate(135 ${cx} 56)"/><circle data-g="${k}" cx="${cx}" cy="56" r="33" fill="none" stroke="${col}" stroke-width="7" pathLength="100" stroke-dasharray="0 100" transform="rotate(135 ${cx} 56)" style="filter:drop-shadow(0 0 4px ${col})"/><text class="a" data-v="${k}" x="${cx}" y="61" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">0</text><text class="a" x="${cx}" y="102" text-anchor="middle" font-size="7.5" fill="${col}" letter-spacing="1.5">${lab}</text>`;
  b.innerHTML = `<svg viewBox="0 0 240 108">${g(40, 'РЕАКТОР', C2, 'pwr')}${g(120, 'РЕПУЛЬС.', G, 'rep')}${g(200, 'ЩИТ', GR, 'shd')}</svg>` },
  tick(b) { const r = ramp(b); ['pwr', 'rep', 'shd'].forEach(k => { const v = S[k] * r; q(b, `[data-g=${k}]`).setAttribute('stroke-dasharray', `${(v * .75).toFixed(1)} 100`); q(b, `[data-v=${k}]`).textContent = Math.round(v) + '%' }) } };

HW.systems = { n: 'Системы', tag: 'SYS', shape: 'sq', build(b) {
  b._L = [['Наноботы', 94], ['Стабилизаторы', 88], ['Связь', 72], ['Навигация', 99], ['Сенсоры', 81], ['Оружие', 0]];
  b.innerHTML = `<div class="hsys">${b._L.map(([n], i) => `<div class="a hrow"><span>${n}</span><i><b data-s="${i}" style="width:0"></b></i><em data-sv="${i}">—</em></div>`).join('')}</div>` },
  tick(b, t) { const r = ramp(b); b._L.forEach(([n, v], i) => { const val = v ? Math.max(0, Math.min(100, v + Math.sin(t * .7 + i) * 3)) : 0; q(b, `[data-s="${i}"]`).style.width = val * r + '%'; q(b, `[data-sv="${i}"]`).textContent = v ? Math.round(val * r) + '%' : 'OFF' }) } };

HW.timer = { n: 'Обратный отсчёт', tag: 'T-MINUS', shape: 'wide', build(b) { b._end = Date.now() + (14 * 60 + 32) * 1e3; b.innerHTML = `<div class="htm"><div data-k="v" class="a">T-00:14:32</div><div class="a hsub">ДО ДЕМО НА STARK EXPO</div><div class="hbar a"><b data-k="b"></b></div></div>` },
  tick(b) { const l = Math.max(0, b._end - Date.now()), s = l / 1e3 | 0; q(b, '[data-k=v]').textContent = `T-${String(s / 3600 | 0).padStart(2, '0')}:${String((s / 60 | 0) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; q(b, '[data-k=b]').style.width = (l / 9e5 * 100 * ramp(b)) + '%' } };

HW.log = { n: 'Журнал', tag: 'LOG', shape: 'sq', build(b) { b.innerHTML = '<div class="hlog"></div>'; b._n = 0 },
  tick(b, t) { if (t - (b._lt || 0) < .8) return; b._lt = t; const L = ['scan sector 7 … clear', 'uplink stark-sat 7 · 42 ms', 'repulsor L calib … ok', 'thermal 36.6°C nominal', 'route recalculated · ETA 11 min', 'pepper.msg «будь аккуратен»', 'nanite reserve 94%', 'target lock released', 'wind 12 kt NW · gusts 18']; const d = document.createElement('div'); d.textContent = '> ' + L[b._n++ % L.length]; const box = b.firstChild; box.append(d); while (box.children.length > 10) box.firstChild.remove() } };

HW.spectrum = { n: 'Голос · спектр', tag: 'VOX', shape: 'wide', build(b) { b.innerHTML = '<canvas class="hcv"></canvas>' },
  tick(b, t) { const cv = b.firstChild, W = cv.clientWidth, H = cv.clientHeight; if (!W) return; if (cv.width !== W * 2) { cv.width = W * 2; cv.height = H * 2 } const x = cv.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); x.clearRect(0, 0, W, H);
    const n = 44, r = ramp(b), live = /speaking|listening/.test(document.body.dataset.s), bw = W / n;
    const F = window.JV?.beat?.freq; for (let i = 0; i < n; i++) { const v = (F ? F[Math.floor(i * F.length / n * .7)] / 255 * 1.1 : Math.abs(Math.sin(t * 3 + i * .5) * Math.sin(t * 1.7 + i * .23)) * (live ? 1 : .4) + .04) * r; x.fillStyle = `hsla(${195 - i * 1.3},100%,60%,.85)`; x.fillRect(i * bw + 1, H / 2 - v * H * .45, bw - 2, v * H * .9) }
    x.strokeStyle = 'rgba(255,181,71,.6)'; x.beginPath(); for (let i = 0; i <= 120; i++) { const y = H / 2 + Math.sin(i * .3 + t * 6) * Math.sin(i * .05 + t) * H * .18 * r; i ? x.lineTo(i * W / 120, y) : x.moveTo(0, y) } x.stroke() } };

HW.globe = { n: 'Глобус', tag: 'GEO', shape: 'sq', build(b) {
  b._c = [[37.6, 55.7, 'МСК'], [-118.2, 34, 'LA'], [-74, 40.7, 'NY'], [139.7, 35.7, 'TOK'], [28.97, 41, 'IST'], [2.35, 48.85, 'PAR'], [77.2, 28.6, 'DEL'], [151.2, -33.9, 'SYD'], [-46.6, -23.5, 'SAO']];
  b.innerHTML = `<svg viewBox="0 0 200 200"><circle class="d" pathLength="1" cx="100" cy="98" r="84" fill="rgba(0,212,255,.05)" stroke="${C}" stroke-width="1.5"/><path class="a" data-k="gr" fill="none" stroke="${C}" stroke-opacity=".35" stroke-width=".7"/><path class="a" data-k="arc" fill="none" stroke="${G}" stroke-width="1.3" stroke-dasharray="3 2"/>
    ${b._c.map((c, i) => `<g data-c="${i}"><circle r="2.6" fill="${G}"/><text x="4" y="3" font-size="7" fill="${G}">${c[2]}</text></g>`).join('')}<text class="a" x="100" y="196" text-anchor="middle" font-size="7.5" fill="${C}" letter-spacing="1.5">STARK NETWORK · 9 УЗЛОВ</text></svg>`;
  if (window.d3) { b._p = d3.geoOrthographic().scale(84).translate([100, 98]).clipAngle(90); b._path = d3.geoPath(b._p); b._g = d3.geoGraticule10() } },
  tick(b, t) { if (!b._p) return; const rot = [-(t * 12) % 360, -18]; b._p.rotate(rot); q(b, '[data-k=gr]').setAttribute('d', b._path(b._g)); q(b, '[data-k=arc]').setAttribute('d', b._path({ type: 'LineString', coordinates: [[37.6, 55.7], [-74, 40.7]] }) || '');
    const ctr = [-rot[0], -rot[1]], r = ramp(b); b._c.forEach((c, i) => { const el = q(b, `[data-c="${i}"]`), p = b._p([c[0], c[1]]); el.setAttribute('transform', `translate(${p[0]},${p[1]})`); el.setAttribute('opacity', d3.geoDistance([c[0], c[1]], ctr) < Math.PI / 2 && r > i / 9 ? 1 : 0) }) } };

HW.board = { n: 'Тактическая доска', tag: 'PLAN', shape: 'wide', build(b) {
  const id = 'mk' + (++uid), N = [[18, 26, 'Стенд «Жесты»', C], [140, 26, 'Демо Mk-85', C], [262, 26, 'Пресса', GR], [18, 140, 'Бюджет +15%', G], [140, 140, 'Смета Хэппи', G], [262, 140, 'Таблички камер', RD]], E = [[0, 1], [1, 2], [3, 4], [4, 1], [5, 2]];
  const box = ([x, y, t, c]) => `<g class="a"><rect x="${x}" y="${y}" width="100" height="34" rx="4" fill="${c}1f" stroke="${c}"/><text x="${x + 50}" y="${y + 21}" text-anchor="middle" font-size="10" fill="#fff">${t}</text></g>`;
  const arr = ([a, c]) => { const A = N[a], B = N[c]; let d; if (A[1] === B[1]) d = `M${A[0] + 100} ${A[1] + 17} L${B[0] - 3} ${B[1] + 17}`; else if (B[1] < A[1]) d = `M${A[0] + 50} ${A[1]} C${A[0] + 50} ${A[1] - 30} ${B[0] + 50} ${B[1] + 64} ${B[0] + 50} ${B[1] + 37}`; else d = `M${A[0] + 50} ${A[1] + 34} L${B[0] + 50} ${B[1] - 3}`; return `<path class="d" pathLength="1" d="${d}" fill="none" stroke="${C2}" stroke-width="1.5" marker-end="url(#${id})"/>` };
  b.innerHTML = `<svg viewBox="0 0 380 190"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C2}"/></marker></defs>
    <text class="a" x="4" y="12" font-size="8.5" fill="${G}" letter-spacing="2">ОПЕРАЦИЯ «STARK EXPO»</text>${N.map(box).join('')}${E.map(arr).join('')}
    <g class="a" transform="rotate(-5 95 100)"><rect x="60" y="80" width="70" height="40" fill="#ffd79a"/><text x="66" y="96" font-size="8" fill="#333">дедлайн</text><text x="66" y="111" font-size="11" font-weight="700" fill="#222">10 окт!</text></g>
    <circle class="a" cx="312" cy="105" r="12" fill="none" stroke="${RD}" stroke-dasharray="3 2"/><text class="a" x="328" y="108" font-size="8" fill="${RD}">риск</text></svg>` } };

HW.model = { n: 'Модель Mk-85', tag: '3D · WIRE', shape: 'sq', build(b) {
  b.innerHTML = `<div class="h3d"></div><div class="h3dl a">◆ левое предплечье: повреждение 12%<br><span style="color:${C2}">◆ реактор: 98% · наноботы 94%</span></div>`;
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js').then(() => {
    if (!b.isConnected) return; const T = THREE, box = b.querySelector('.h3d'); let W = box.clientWidth || 300, H = box.clientHeight || 300;
    const R = new T.WebGLRenderer({ antialias: true, alpha: true }); R.setPixelRatio(devicePixelRatio); R.setSize(W, H); box.append(R.domElement);
    const sc = new T.Scene(), cam = new T.PerspectiveCamera(40, W / H, .1, 50); cam.position.set(0, .9, 6.2); cam.lookAt(0, .75, 0);
    const mt = (c = 0x00d4ff, o = .8) => new T.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false });
    const g = new T.Group(); sc.add(g); const parts = [];
    const add = (geo, x, y, z = 0, m = mt(), rz = 0) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.z = rz; o.userData.y0 = y; g.add(o); parts.push(o); return o };
    add(new T.BoxGeometry(.42, .5, .42, 2, 2, 2), 0, 2.55); add(new T.BoxGeometry(1, 1.2, .5, 3, 3, 2), 0, 1.65); add(new T.BoxGeometry(.78, .34, .44, 2, 1, 1), 0, .9);
    add(new T.TorusGeometry(.13, .03, 6, 20), 0, 1.82, .27, mt(0xffffff, 1));
    [-1, 1].forEach(s => { add(new T.SphereGeometry(.17, 8, 6), s * .66, 2.12); add(new T.CylinderGeometry(.13, .12, .78, 8), s * .72, 1.72); const fa = add(new T.CylinderGeometry(.12, .1, .74, 8), s * .74, .98, 0, mt(s < 0 ? 0xff4d5e : 0x00d4ff)); if (s < 0) fa.userData.hurt = true;
      add(new T.CylinderGeometry(.18, .15, .9, 8), s * .24, .3); add(new T.CylinderGeometry(.14, .12, .9, 8), s * .24, -.62); add(new T.BoxGeometry(.24, .12, .4), s * .24, -1.12, .07) });
    const ring = new T.Mesh(new T.RingGeometry(1.1, 1.14, 64), new T.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: .6, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = -1.2; sc.add(ring);
    const scan = new T.Mesh(new T.PlaneGeometry(2.6, 2.6), new T.MeshBasicMaterial({ color: 0x5ff3ff, transparent: true, opacity: .1, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); scan.rotation.x = -Math.PI / 2; sc.add(scan);
    const t0 = performance.now();
    b._3 = t => { const k = Math.min(1, (performance.now() - t0) / 1600); parts.forEach((p, i) => { const kk = Math.max(0, Math.min(1, k * 1.6 - i / parts.length * .6)); p.position.y = p.userData.y0 + (1 - kk) * 2.5; p.material.opacity = kk * (p.userData.hurt ? .5 + .5 * Math.abs(Math.sin(t * 4)) : .8) });
      g.rotation.y = t * .45; scan.position.y = .85 + Math.sin(t * 1.1) * 2; R.render(sc, cam) };
    const ro = new ResizeObserver(() => { W = box.clientWidth; H = box.clientHeight; if (!W || !H) return; R.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix() }); ro.observe(box);
    b._dispose = () => { ro.disconnect(); R.dispose(); R.domElement.remove() };
  }).catch(() => { b.querySelector('.h3dl').textContent = 'three.js не загрузился (нужен интернет)' }) },
  tick(b, t) { b._3?.(t) } };

/* ---------- раскладка по слотам ---------- */
const SLOTS = { C: [33, 4, 34, 61, 'sq'], T1: [23.6, 4, 8.6, 61, 'tall'], T2: [67.8, 4, 8.6, 61, 'tall'], L1: [1, 4, 21.6, 31, 'sq'], L2: [1, 37, 21.6, 29, 'sq'], L3: [1, 68, 21.6, 29, 'wide'], R1: [77.4, 4, 21.6, 31, 'sq'], R2: [77.4, 37, 21.6, 29, 'sq'], R3: [77.4, 68, 21.6, 29, 'wide'], B1: [23.6, 68, 26.4, 29, 'wide'], B2: [50, 68, 26.4, 29, 'wide'] };
const SORDER = ['T1', 'T2', 'L1', 'R1', 'L2', 'R2', 'B1', 'B2', 'L3', 'R3'];
const SCENES = { flight: ['Полёт', '✈️', ['horizon', 'speed', 'alt', 'radar', 'globe', 'power', 'systems', 'compass', 'spectrum', 'timer']], workshop: ['Мастерская', '🛠', ['model', 'systems', 'log', 'power', 'compass', 'board', 'spectrum']], brief: ['Брифинг', '🗺', ['board', 'globe', 'radar', 'log', 'timer', 'systems', 'power']], analysis: ['Анализ', '📊', ['globe', 'radar', 'log', 'systems', 'spectrum', 'power', 'timer', 'compass']] };
let cur = [], scene = null;
function freeSlot(shape) { const used = new Set(cur.map(c => c.slot)); if (!used.has('C') && shape !== 'tall') return 'C'; const fr = SORDER.filter(s => !used.has(s)); return fr.find(s => SLOTS[s][4] === shape) || fr.find(s => SLOTS[s][4] !== 'tall' && shape !== 'tall') || (shape === 'tall' ? null : null) }
const pos = p => ['left', 'top', 'width', 'height'].map(k => parseFloat(p.style[k]));
function place(p, slot) { const [x, y, w, h] = SLOTS[slot]; Object.assign(p.style, { left: x + '%', top: y + '%', width: w + '%', height: h + '%' }) }

/* ---------- хореография ---------- */
function sfx(up) { if (!sfxOn) return; try { actx ||= new AudioContext(); const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(up ? 380 : 900, t); o.frequency.exponentialRampToValueAtTime(up ? 1500 : 180, t + .13); g.gain.setValueAtTime(.035, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .22) } catch (e) { } }
function assemble(p, delay = 0) {
  const D = x => x * M; p.style.visibility = 'visible';
  p.animate([{ clipPath: 'inset(48% 48% 48% 48%)', opacity: 0, filter: 'brightness(3)' }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, filter: 'brightness(1)' }], { duration: D(520), delay: D(delay), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  p.querySelectorAll('.hbr').forEach(b => b.animate([{ opacity: 0, transform: 'scale(3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: D(420), delay: D(delay + 140), fill: 'backwards', easing: 'ease-out' }));
  const tt = p.querySelector('.tt'), full = tt.dataset.t; tt.textContent = ''; setTimeout(async () => { for (const ch of full) { if (!p.isConnected) return; tt.textContent += ch; await sleep(D(24)) } }, D(delay + 260));
  const b = p._b, ds = [...b.querySelectorAll('.d')], as = [...b.querySelectorAll('.a')], base = delay + 380, span = Math.min(900, 30 * ds.length);
  ds.forEach((e, i) => { e.style.strokeDasharray = '1'; const an = e.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: D(620), delay: D(base + i * span / Math.max(1, ds.length)), fill: 'backwards', easing: 'ease-out' }); an.onfinish = () => { e.style.strokeDasharray = '' } });
  as.forEach((e, i) => e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D(380), delay: D(base + 160 + i * 520 / Math.max(1, as.length)), fill: 'backwards' }));
  b._born = performance.now() + D(base); setTimeout(() => sfx(true), D(delay));
}
function disassemble(p, delay = 0) { setTimeout(() => sfx(false), delay * M); return p.animate([{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, filter: 'brightness(1)' }, { clipPath: 'inset(50% 0% 50% 0%)', opacity: 0, filter: 'brightness(3)' }], { duration: 300 * M, delay: delay * M, easing: 'ease-in', fill: 'forwards' }).finished.then(() => { p._b._dispose?.(); p.remove() }) }

/* ---------- панели ---------- */
function makePanel(k, slot) {
  const W = HW[k], p = document.createElement('div'); p.className = 'hp'; p.dataset.k = k; place(p, slot);
  p.innerHTML = `<div class="hp-bg"></div><i class="hbr tl"></i><i class="hbr tr"></i><i class="hbr bl"></i><i class="hbr brr"></i><div class="hp-t"><span class="tt" data-t="${W.n.toUpperCase()}"></span><span class="tg">${W.tag}</span><span class="x" title="убрать">✕</span></div><div class="hp-b"></div>`;
  $('#hpanels').append(p); p._b = p.querySelector('.hp-b'); W.build(p._b);
  const t = p.querySelector('.hp-t');
  t.querySelector('.x').onclick = e => { e.stopPropagation(); removeW(k) };
  t.onpointerdown = e => { if (e.target.classList.contains('x') || $('#hstage').classList.contains('mob')) return; const st = $('#hstage').getBoundingClientRect(), r = p.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; t.setPointerCapture(e.pointerId); t.style.cursor = 'grabbing'; p.style.zIndex = 5;
    const mv = ev => { p.style.left = Math.max(-5, Math.min(95, (ev.clientX - st.left - ox) / st.width * 100)) + '%'; p.style.top = Math.max(-5, Math.min(95, (ev.clientY - st.top - oy) / st.height * 100)) + '%'; conn(false) };
    const up = () => { t.removeEventListener('pointermove', mv); t.removeEventListener('pointerup', up); t.style.cursor = ''; p.style.zIndex = ''; const c = cur.find(c => c.p === p); if (c) c.slot = 'free'; spec() };
    t.addEventListener('pointermove', mv); t.addEventListener('pointerup', up) };
  return p;
}
function conn(animate = true) {
  const svg = $('#hconn'), c = cur.find(x => x.slot === 'C'); if (!c) { svg.innerHTML = ''; return }
  const [cx, cy, cw, ch] = pos(c.p), H = 1; let s = '';
  cur.filter(x => x !== c).forEach(o => { const [x, y, w, h] = pos(o.p), mx = x + w / 2, my = y + h / 2; let a, z;
    if (mx < cx) { a = [cx, Math.max(cy + 4, Math.min(cy + ch - 4, my))]; z = [x + w, my] } else if (mx > cx + cw) { a = [cx + cw, Math.max(cy + 4, Math.min(cy + ch - 4, my))]; z = [x, my] } else { a = [Math.max(cx + 4, Math.min(cx + cw - 4, mx)), cy + ch]; z = [mx, y] }
    const e = mx < cx || mx > cx + cw ? `M${a[0]} ${a[1]} H${(a[0] + z[0]) / 2} V${z[1]} H${z[0]}` : `M${a[0]} ${a[1]} V${(a[1] + z[1]) / 2} H${z[0]} V${z[1]}`;
    s += `<path class="hc" pathLength="1" d="${e}" fill="none" stroke="#00d4ff" stroke-opacity=".45" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="${animate ? 1 : 'none'}" stroke-dashoffset="${animate ? 1 : 0}"/><circle cx="${z[0]}" cy="${z[1]}" r=".35" fill="#5ff3ff"/>` });
  svg.innerHTML = s;
  if (animate) svg.querySelectorAll('.hc').forEach((p, i) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 700 * M, delay: (300 + i * 90) * M, fill: 'forwards', easing: 'ease-out' }));
}
function spec() {
  $('#hspec').textContent = JSON.stringify({ tool: 'hud_compose', scene, layout: 'slots + свободное перетаскивание', widgets: cur.map(c => { const [x, y, w, h] = pos(c.p).map(v => +v.toFixed(1)); return { type: c.k, slot: c.slot, rect: { x, y, w, h } } }) }, null, 2);
  $$('#hscenes [data-s]').forEach(b => b.classList.toggle('!bg-jv-cyan/30', b.dataset.s === scene)); mob();
}
function mob() { const st = $('#hstage'); st.classList.toggle('mob', st.clientWidth > 0 && st.clientWidth < 760) }

/* ---------- API сборки ---------- */
async function setScene(name) {
  if (!SCENES[name]) return; scene = name; const old = cur; cur = [];
  await Promise.all(old.map((c, i) => disassemble(c.p, i * 30))); $('#hconn').innerHTML = '';
  SCENES[name][2].forEach((k, i) => { const slot = freeSlot(HW[k].shape); if (!slot) return; const p = makePanel(k, slot); cur.push({ k, slot, p }); assemble(p, i === 0 ? 0 : 200 + i * 160) });
  conn(true); spec(); window.log?.(`hud: scene ${name} · ${cur.length} widgets`, 'ok'); bus?.('hud.compose', { scene: name, widgets: cur.map(c => c.k) });
}
function addW(k) {
  const ex = cur.find(c => c.k === k); if (ex) { ex.p.classList.remove('pulse'); void ex.p.offsetWidth; ex.p.classList.add('pulse'); return 'уже на экране' }
  const slot = freeSlot(HW[k].shape); if (!slot) { toast('Нет свободного места — уберите что-нибудь'); return 'нет места' }
  const p = makePanel(k, slot); cur.push({ k, slot, p }); assemble(p); conn(true); spec(); return 'добавлено';
}
function removeW(k) { const i = cur.findIndex(c => c.k === k); if (i < 0) return 'нет такого'; const [c] = cur.splice(i, 1); disassemble(c.p).then(() => { conn(false); spec() }); return 'убрано' }
async function clearAll() { const old = cur; cur = []; scene = null; await Promise.all(old.map((c, i) => disassemble(c.p, i * 40))); $('#hconn').innerHTML = ''; spec() }
window.hudCompose = a => { if (a.clear) clearAll(); if (a.scene) setScene(a.scene); (a.add || []).forEach(k => HW[k] && addW(k)); (a.remove || []).forEach(k => removeW(k)); return 'готово' };

/* ---------- команды словами ---------- */
const WN = { compass: ['компас', 'курс'], horizon: ['горизонт', 'крен', 'тангаж'], speed: ['скорост'], alt: ['высот', 'альтиметр'], radar: ['радар'], power: ['энерг', 'реактор', 'мощност'], systems: ['систем', 'статус'], model: ['3d', '3д', 'модел', 'костюм', 'броня'], globe: ['глобус', 'карт', 'земл'], spectrum: ['спектр', 'голос', 'звук'], board: ['доск', 'план', 'схем'], log: ['журнал', 'лог'], timer: ['таймер', 'отсч', 'обратн'] };
const SN = { flight: ['полёт', 'полет', 'пилот', 'самол', 'кабин', 'лётн', 'летн'], workshop: ['мастерск', 'верстак'], brief: ['брифинг', 'операци'], analysis: ['анализ', 'аналит'] };
function holoCmd(t) {
  const s = t.toLowerCase(), has = arr => arr.some(w => s.includes(w));
  if (/(очист|убери вс|разбер|сверни вс|clear)/.test(s)) { clearAll(); return 'Разобрал интерфейс, сэр.' }
  const sc = Object.keys(SN).find(k => has(SN[k]));
  const ws = Object.keys(WN).filter(k => has(WN[k]));
  if (/(убер|скрой|закрой|удали)/.test(s) && ws.length) { ws.forEach(removeW); return 'Убрал: ' + ws.map(k => HW[k].n.toLowerCase()).join(', ') + '.' }
  if (sc && (!ws.length || /(собер|интерфейс|сцен|режим|hud)/.test(s))) { setScene(sc); return `Собираю интерфейс «${SCENES[sc][0]}».` }
  if (ws.length) { ws.forEach(addW); return 'Вывожу: ' + ws.map(k => HW[k].n.toLowerCase()).join(', ') + '.' }
  if (/(собер|покажи).*(интерфейс|hud)/.test(s)) { setScene('flight'); return 'Собираю полётный интерфейс.' }
  return 'Не понял, что собрать. Попробуйте «собери полёт» или «добавь радар».';
}
window.holoCmd = holoCmd;

/* ---------- UI ---------- */
$('#hscenes').innerHTML = Object.entries(SCENES).map(([k, [n, e]]) => `<button data-s="${k}" class="jv-btn">${e} ${n}</button>`).join('') + `<button id="hclr" class="jv-btn !border-jv-red/60 !text-jv-red !bg-transparent">⨯ РАЗОБРАТЬ</button>`;
$$('#hscenes [data-s]').forEach(b => b.onclick = () => { setScene(b.dataset.s); speak?.(`Собираю интерфейс «${SCENES[b.dataset.s][0]}».`) }); $('#hclr').onclick = clearAll;
$('#hpal').innerHTML = Object.entries(HW).map(([k, w]) => `<button data-w="${k}" class="chip">+ ${w.n}</button>`).join('');
$$('#hpal [data-w]').forEach(b => b.onclick = () => addW(b.dataset.w));
const run = () => { const v = $('#hcmd').value.trim(); if (!v) return; const a = holoCmd(v); toast('🛰 ' + a); speak?.(a); $('#hcmd').value = '' };
$('#hgo').onclick = run; $('#hcmd').onkeydown = e => { if (e.key === 'Enter') run() };
$('#hslow').onchange = e => M = e.target.checked ? 4 : 1; $('#hsfx').onchange = e => sfxOn = e.target.checked;
addEventListener('resize', () => { mob(); conn(false) });

/* голосом из главного экрана (демо-мозг) и из настоящего мозга (инструмент) */
SKILLS.unshift({ re: /(собери|покажи|выведи|разверни).*(интерфейс|hud|худ|полёт|полет|кабин|мастерск|брифинг|анализ|голограмм)/i, tools: [['hud_compose', 'scene']], run: t => { goTab('holo'); let a; setTimeout(() => holoCmd(t), 500); const sc = Object.keys(SN).find(k => SN[k].some(w => t.toLowerCase().includes(w))) || 'flight'; return `Собираю интерфейс «${SCENES[sc][0]}», сэр.` } });
if (typeof LLM_TOOLS !== 'undefined') {
  LLM_TOOLS.push({ name: 'hud_compose', description: 'Собрать голографический HUD-интерфейс на вкладке «Голо-HUD»: включить готовую сцену, добавить или убрать виджеты. Сцены: flight (полёт), workshop (мастерская), brief (брифинг), analysis (анализ).', input_schema: { type: 'object', properties: { scene: { type: 'string', enum: Object.keys(SCENES) }, add: { type: 'array', items: { type: 'string', enum: Object.keys(HW) } }, remove: { type: 'array', items: { type: 'string', enum: Object.keys(HW) } }, clear: { type: 'boolean' } } } });
  const _rt = runTool; runTool = async (name, a) => { if (name === 'hud_compose') { goTab('holo'); await sleep(400); return window.hudCompose(a) } return _rt(name, a) };
}
/* жесты на этой вкладке */
{ const _fg = fireGesture; window.fireGesture = fireGesture = function (k, sim) { if ($('#holo')?.classList.contains('on')) { const ks = Object.keys(SCENES), i = ks.indexOf(scene); if (k === 'Swipe_L' || k === 'Swipe_R') { setScene(ks[(i + (k === 'Swipe_R' ? 1 : -1) + ks.length) % ks.length]); glog?.(`${GACT[k]?.e} ${k} → сцена HUD`); return } if (k === 'Open_Palm') { clearAll(); glog?.('🖐 → разобрать HUD'); return } if (k === 'Closed_Fist') { setScene(scene || 'flight'); glog?.('✊ → собрать HUD'); return } } return _fg(k, sim) } }

/* ---------- цикл ---------- */
(function loop() {
  requestAnimationFrame(loop); if (!$('#holo').classList.contains('on')) return; const t = (performance.now() - S.t0) / 1000;
  S.hdg += Math.sin(t * .13) * .3; S.pitch = 4 * Math.sin(t * .37) + 1.2 * Math.sin(t * 1.3); S.roll = 17 * Math.sin(t * .23); S.spd = 420 + 26 * Math.sin(t * .2); S.alt = 12400 + 420 * Math.sin(t * .11); S.pwr = 97 + 2 * Math.sin(t * .5); S.rep = 74 + 10 * Math.sin(t * .31); S.shd = 62 + 8 * Math.sin(t * .17);
  for (const c of cur) { try { HW[c.k].tick?.(c.p._b, t) } catch (e) { } }
})();
{ const prev = window.onTab; window.onTab = t => { prev?.(t); if (t === 'holo') { mob(); if (!cur.length && !scene) setTimeout(() => setScene('flight'), 250) } } }
})();
