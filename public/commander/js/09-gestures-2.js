/* =====================================================================
   ЖЕСТЫ 2.0 — все виды: поза руки, движение, две руки, голова, звук
   ===================================================================== */
window.jvVol = 60; window.jvBri = 80;
const flashScr = () => { $('#flash').style.opacity = .8; setTimeout(() => $('#flash').style.opacity = 0, 120) };
const volTo = v => { jvVol = Math.max(0, Math.min(100, v)); toast(`🔊 Громкость ${jvVol}%  ${'▮'.repeat(jvVol / 10)}${'▯'.repeat(10 - jvVol / 10)}`) };
const lastJ = () => [...$$('#chat .msg.j span')].at(-1)?.textContent || 'Я ничего ещё не говорил, сэр.';
Object.assign(GACT, {
  ILoveYou: { e: '🤟', n: '«Люблю»', a: 'Джарвис отвечает «Взаимно, сэр»', run: () => { toast('🤟 ❤️'); speak('Взаимно, сэр.') } },
  OK: { e: '👌', n: 'ОК', a: 'Подтвердить', run: () => { if (document.querySelector('#dashGrid .abox')) decide(null, true); toast('👌 Подтверждено') } },
  Call: { e: '🤙', n: '«Позвони»', a: 'Позвонить маме', run: () => { toast('📞 Звоню маме…'); speak('Звоню маме, сэр.') } },
  Rock: { e: '🤘', n: 'Коза', a: 'Включить AC/DC', run: () => { $('#np').classList.add('play'); $('#track').textContent = 'Thunderstruck'; toast('🤘 Thunderstruck — AC/DC') } },
  Fingers_3: { e: '3️⃣', n: 'Три пальца', a: 'Свет на 60%', run: () => { setDev('light', true); jvBri = 60; toast('💡 Свет 60%') } },
  Fingers_4: { e: '4️⃣', n: 'Четыре пальца', a: 'Свет на 80%', run: () => { setDev('light', true); jvBri = 80; toast('💡 Свет 80%') } },
  Point_Left: { e: '👈', n: 'Указать влево', a: 'Предыдущий трек', run: () => { $('#np').classList.add('play'); $('#track').textContent = 'Back In Black'; toast('⏮ Back In Black') } },
  Point_Right: { e: '👉', n: 'Указать вправо', a: 'Следующий трек', run: () => { $('#np').classList.add('play'); $('#track').textContent = 'Highway to Hell'; toast('⏭ Highway to Hell') } },
  Point_Down: { e: '👇', n: 'Указать вниз', a: 'Скрыть уведомления', run: () => toast('🔕 Уведомления скрыты на 30 минут') },
  Swipe_U: { e: '⬆️', n: 'Свайп вверх', a: 'Громче', run: () => volTo(jvVol + 10) },
  Swipe_D: { e: '⬇️', n: 'Свайп вниз', a: 'Тише', run: () => volTo(jvVol - 10) },
  Wave: { e: '👋', n: 'Помахать', a: 'Поздороваться', run: () => { toast('👋 Привет!'); speak('Здравствуйте, сэр. Рад вас видеть.') } },
  Push: { e: '🫸', n: 'Толкнуть от себя', a: 'Отклонить / убрать', run: () => toast('🫸 Уведомление отклонено') },
  Pull: { e: '🫴', n: 'Потянуть к себе', a: 'Показать подробнее', run: () => toast('🫴 Открываю подробности') },
  Rotate: { e: '🔄', n: 'Крутилка', a: 'Плавно менять громкость', run: () => { } },
  Clap_Cam: { e: '👏', n: 'Хлопок (видно)', a: 'Свет вкл/выкл', run: () => { const on = !$('.sw[data-dev="light"]').classList.contains('on'); setDev('light', on); toast(on ? '💡 Свет включён' : '🌑 Свет выключен') } },
  Zoom_In: { e: '↔️', n: 'Развести руки', a: 'Приблизить', run: () => { if (!window.holoGesture?.('Zoom_In')) toast('🔍 Приближаю') } },
  Zoom_Out: { e: '🤲', n: 'Свести руки', a: 'Отдалить', run: () => { if (!window.holoGesture?.('Zoom_Out')) toast('🔎 Отдаляю') } },
  Frame: { e: '🖼', n: 'Рамка из пальцев', a: 'Снимок этой области', run: () => { flashScr(); toast('🖼 Снимок области сохранён') } },
  Heart: { e: '🫶', n: 'Сердце руками', a: 'В избранное', run: () => toast('🫶 Добавлено в избранное') },
  Nod: { e: '😌', n: 'Кивнуть', a: 'Да / подтвердить', run: () => { if (document.querySelector('#dashGrid .abox')) decide(null, true); toast('😌 Да') } },
  Shake: { e: '🙅', n: 'Помотать головой', a: 'Нет / отмена', run: () => { speechSynthesis.cancel(); if (document.querySelector('#dashGrid .abox')) decide(null, false); toast('🙅 Нет — отменено') } },
  Shh: { e: '🤫', n: 'Палец к губам', a: 'Тихий режим', run: () => { voiceOn = false; speechSynthesis.cancel(); $('#np').classList.remove('play'); toast('🤫 Тихий режим') } },
  Ear: { e: '👂', n: 'Ладонь к уху', a: 'Повторить погромче', run: () => { voiceOn = true; speak(lastJ()) } },
  Face_Back: { e: '👀', n: 'Вернулся к экрану', a: '«С возвращением», продолжить', run: () => { toast('👀 С возвращением, сэр') } },
  Face_Away: { e: '🚶', n: 'Отошёл от экрана', a: 'Пауза, экран гаснет', run: () => { $('#np').classList.remove('play'); toast('🚶 Вы отошли — пауза') } },
  Clap_1: { e: '👏', n: 'Один хлопок', a: '«Слушаю, сэр»', run: () => speak('Слушаю, сэр.') },
  Clap_2: { e: '👏👏', n: 'Два хлопка', a: 'Свет вкл/выкл (как The Clapper)', run: () => GACT.Clap_Cam.run() },
  Clap_3: { e: '👏👏👏', n: 'Три хлопка', a: 'Музыка вкл/выкл', run: () => { const p = $('#np').classList.toggle('play'); toast(p ? '🎵 Музыка' : '⏸ Пауза') } },
  Snap: { e: '🫰', n: 'Щелчок пальцами', a: 'Выключить всё («щелчок Таноса»)', run: () => { ['light', 'coffee', 'ac'].forEach(d => setDev(d, false)); $('#np').classList.remove('play'); toast('🫰 Всё выключено') } },
  Whistle: { e: '😗', n: 'Свист', a: 'Позвать Джарвиса', run: () => { toast('😗 → Джарвис слушает'); speak('Да, сэр?') } },
});
const META = {
  Open_Palm: ['MediaPipe', 'раскрытая ладонь к камере'], Closed_Fist: ['MediaPipe', 'сжать кулак'], Pointing_Up: ['MediaPipe', 'указательный вверх'], Thumb_Up: ['MediaPipe', 'большой палец вверх'], Thumb_Down: ['MediaPipe', 'большой палец вниз'], Victory: ['MediaPipe', 'указательный + средний'], ILoveYou: ['MediaPipe', 'большой, указательный и мизинец'],
  OK: ['по точкам', 'кольцо из большого и указательного'], Call: ['по точкам', 'большой + мизинец, «трубка»'], Rock: ['по точкам', 'указательный + мизинец, большой прижат'], Fingers_3: ['по точкам', 'три пальца'], Fingers_4: ['по точкам', 'четыре пальца, большой прижат'], Point_Left: ['по точкам', 'указательный влево'], Point_Right: ['по точкам', 'указательный вправо'], Point_Down: ['по точкам', 'указательный вниз'], Pinch: ['по точкам', 'свести большой и указательный'],
  Swipe_L: ['движение', 'быстро провести рукой влево'], Swipe_R: ['движение', 'быстро вправо'], Swipe_U: ['движение', 'быстро вверх'], Swipe_D: ['движение', 'быстро вниз'], Wave: ['движение', 'помахать ладонью 2–3 раза'], Push: ['движение', 'ладонь резко к камере'], Pull: ['движение', 'ладонь резко от камеры'], Rotate: ['движение', 'щипок + повернуть кисть как ручку'],
  Clap_Cam: ['2 руки', 'хлопнуть в ладоши перед камерой'], Zoom_In: ['2 руки', 'две ладони — развести'], Zoom_Out: ['2 руки', 'две ладони — свести'], Frame: ['2 руки', 'уголки «Г» из пальцев, как кадр'], Heart: ['2 руки', 'сердце: большие и указательные сомкнуты'],
  Nod: ['лицо', 'кивнуть 2 раза'], Shake: ['лицо', 'помотать головой'], Shh: ['лицо + рука', 'указательный к губам'], Ear: ['лицо + рука', 'ладонь к уху'], Face_Back: ['лицо', 'сесть перед камерой'], Face_Away: ['лицо', 'отойти на 6+ секунд'],
  Clap_1: ['микрофон', 'хлопнуть один раз'], Clap_2: ['микрофон', 'два хлопка подряд'], Clap_3: ['микрофон', 'три хлопка подряд'], Snap: ['микрофон', 'щёлкнуть пальцами'], Whistle: ['микрофон', 'свистнуть ~0.5 с'],
};
const GCATS = [['✋ Поза одной руки', 'Держите позу ~0.6 с', ['Open_Palm', 'Closed_Fist', 'Pointing_Up', 'Thumb_Up', 'Thumb_Down', 'Victory', 'ILoveYou', 'OK', 'Call', 'Rock', 'Fingers_3', 'Fingers_4', 'Point_Left', 'Point_Right', 'Point_Down', 'Pinch']], ['🌀 Движение рукой', 'Срабатывает сразу по траектории', ['Swipe_L', 'Swipe_R', 'Swipe_U', 'Swipe_D', 'Wave', 'Push', 'Pull', 'Rotate']], ['🙌 Две руки', 'Нужны обе руки в кадре', ['Clap_Cam', 'Zoom_In', 'Zoom_Out', 'Frame', 'Heart']], ['🙂 Голова и лицо', 'Детектор лица + рука', ['Nod', 'Shake', 'Shh', 'Ear', 'Face_Back', 'Face_Away']], ['👏 Звук · микрофон', 'Кнопка «Слушать» справа от камеры', ['Clap_1', 'Clap_2', 'Clap_3', 'Snap', 'Whistle']]];
const SRCC = { MediaPipe: '#00d4ff', 'по точкам': '#3dffa8', 'движение': '#ffb547', '2 руки': '#b48cff', 'лицо': '#ff7a8a', 'лицо + рука': '#ff7a8a', 'микрофон': '#5ff3ff' };
$('#gcnt').textContent = GCATS.reduce((a, c) => a + c[2].length, 0) + ' жестов';
$('#gcat').innerHTML = GCATS.map(([t, sub, ks]) => `<div class="mt-2 mb-2 flex items-baseline gap-2"><span class="font-hud text-[11px] tracking-[.2em] text-jv-ice">${t.toUpperCase()}</span><span class="jv-sub">${sub}</span></div>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 mb-3">${ks.map(k => { const g = GACT[k], [src, how] = META[k], c = SRCC[src]; return `<div class="gm-card relative rounded-xl border border-solid border-jv-line bg-black/20 p-2.5 transition duration-300" data-g="${k}"><div class="flex items-start gap-2"><span class="text-[26px] leading-none">${g.e}</span><span class="ml-auto font-mono text-[8.5px] px-1.5 py-0.5 rounded border border-solid" style="color:${c};border-color:${c}66">${src}</span></div><div class="text-[12.5px] font-semibold mt-1.5 leading-tight">${g.n}</div><div class="jv-sub !text-[10px] leading-snug mt-0.5">${how}</div><div class="text-[11px] text-jv-cyan mt-1.5 leading-snug">→ ${g.a}</div><button data-sim="${k}" class="absolute right-2 bottom-2 font-mono text-[9px] bg-transparent border border-solid border-jv-line text-jv-mute rounded px-1.5 py-0.5 cursor-pointer hover:text-jv-cyan hover:border-jv-cyan">симул.</button></div>` }).join('')}</div>`).join('');
$$('#gcat [data-sim]').forEach(b => b.onclick = () => fireGesture(b.dataset.sim, true));

/* подсветка карточки + большая надпись поверх видео */
let gLastK = null, gLastT = 0;
$('#gsens').oninput = e => { $('#gsensv').textContent = (+e.target.value).toFixed(2); try { localStorage.setItem('jv_gsens', e.target.value) } catch (_) { } };
try { const v = localStorage.getItem('jv_gsens'); if (v) { $('#gsens').value = v; $('#gsensv').textContent = (+v).toFixed(2) } } catch (_) { }
{ const _fg = fireGesture; window.fireGesture = fireGesture = function (k, sim) { gLastK = k; gLastT = performance.now(); $$('.gm-card').forEach(c => { const on = c.dataset.g === k; c.style.borderColor = on ? '#ffb547' : ''; c.style.boxShadow = on ? '0 0 0 1px #ffb547,0 0 22px rgba(255,181,71,.35)' : ''; c.style.background = on ? 'rgba(255,181,71,.12)' : '' }); setTimeout(() => { const c = $(`.gm-card[data-g="${k}"]`); if (c && performance.now() - gLastT > 1100) { c.style.borderColor = ''; c.style.boxShadow = ''; c.style.background = '' } }, 1200); return _fg(k, sim) } }

/* ---------- геометрия руки ---------- */
const dd = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function fingers(L) {
  const s = dd(L[0], L[9]);
  const f = [[8, 6], [12, 10], [16, 14], [20, 18]].map(([t, p]) => dd(L[t], L[0]) > dd(L[p], L[0]) * 1.1);
  const thumb = dd(L[4], L[17]) > dd(L[3], L[17]) * 1.04 && dd(L[4], L[5]) > s * .45;
  return { thumb, idx: f[0], mid: f[1], ring: f[2], pinky: f[3], n: [thumb, ...f].filter(Boolean).length, s };
}
function poseCustom(L, e) {
  if (dd(L[4], L[8]) < e.s * .3 && e.mid && e.ring && e.pinky) return 'OK';
  if (e.thumb && e.pinky && !e.idx && !e.mid && !e.ring) return 'Call';
  if (e.idx && e.pinky && !e.mid && !e.ring && !e.thumb) return 'Rock';
  if (e.idx && !e.mid && !e.ring && !e.pinky) { const vx = L[5].x - L[8].x, vy = L[8].y - L[5].y; if (Math.abs(vx) > Math.abs(vy) * 1.3 && Math.abs(vx) > e.s * .5) return vx > 0 ? 'Point_Right' : 'Point_Left'; if (vy > e.s * .5) return 'Point_Down' }
  if (e.idx && e.mid && e.ring && !e.pinky && !e.thumb) return 'Fingers_3';
  if (e.idx && e.mid && e.ring && e.pinky && !e.thumb) return 'Fingers_4';
  return null;
}
function reversals(arr, amp) { let dir = 0, ext = arr[0], n = 0; for (const v of arr) { if (dir >= 0 && v < ext - amp) { if (dir > 0) n++; dir = -1; ext = v } else if (dir <= 0 && v > ext + amp) { if (dir < 0) n++; dir = 1; ext = v } else if ((dir > 0 && v > ext) || (dir < 0 && v < ext)) ext = v } return n }
const GH = { w: [], sz: [], two: [], nose: [], lastFace: 0, face: false, ang: null, rot: 0 }, gCd = {};
const cool = (k, ms) => { const n = performance.now(); if (gCd[k] && n - gCd[k] < ms) return false; gCd[k] = n; return true };

/* ---------- новый цикл распознавания ---------- */
gLoop = function () {
  if (!gOn) return; requestAnimationFrame(gLoop);
  const v = $('#gvid'), c = $('#gcan'), x = c.getContext('2d'); if (v.readyState < 2) return;
  const now = performance.now(), r = gr.recognizeForVideo(v, now);
  x.save(); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(v, 0, 0, c.width, c.height); x.restore();
  x.fillStyle = 'rgba(0,20,30,.35)'; x.fillRect(0, 0, c.width, c.height);
  fpsN++; if (now - fpsT > 1000) { $('#gfps').textContent = fpsN + ' fps'; fpsN = 0; fpsT = now }
  const mouse = $('#gmouse').checked, toPx = L => L.map(p => ({ x: (1 - p.x) * c.width, y: p.y * c.height })), minS = +$('#gsens').value;
  const raw = (r.landmarks || []).map((L, i) => ({ L, s: r.handedness?.[i]?.[0]?.score ?? 0, g: r.gestures?.[i]?.[0] }));
  const good = raw.filter(h => { const sz = dd(h.L[0], h.L[9]); return h.s >= minS && sz > .035 && sz < .6 && h.L.every(p => p.x > -.05 && p.x < 1.05 && p.y > -.05 && p.y < 1.05) });
  GH.stable = good.length ? (GH.stable || 0) + 1 : 0;
  const hs = GH.stable >= 4 ? good : [], hands = hs.map(h => h.L);
  $('#ghands').textContent = 'рук: ' + hands.length + (raw.length ? ` · ${Math.max(...raw.map(h => h.s)).toFixed(2)}` : '') + (raw.length > hs.length ? ` · отсеяно ${raw.length - hs.length}` : '');
  // ----- лицо -----
  let face = null;
  if (fd) {
    const sx = c.width / v.videoWidth, sy = c.height / v.videoHeight, dets = fd.detectForVideo(v, now).detections || [];
    $('#gfaces').textContent = 'лиц: ' + dets.length;
    dets.forEach(d => { const bb = d.boundingBox; drawFace(x, { x: c.width - (bb.originX + bb.width) * sx, y: bb.originY * sy, w: bb.width * sx, h: bb.height * sy }, d.categories?.[0]?.score || 0, (d.keypoints || []).map(k => ({ x: (1 - k.x) * c.width, y: k.y * c.height }))) });
    if (dets.length && dets[0].keypoints?.length >= 6) {
      face = dets[0].keypoints;
      if (GH.lastFace && now - GH.lastFace > 4000 && cool('Face_Back', 5000)) fireGesture('Face_Back');
      GH.lastFace = now; GH.face = true;
      GH.nose.push({ x: face[2].x, y: face[2].y, t: now }); GH.nose = GH.nose.filter(p => now - p.t < 1100);
      if (GH.nose.length > 8) { const xs = GH.nose.map(p => p.x), ys = GH.nose.map(p => p.y), xr = Math.max(...xs) - Math.min(...xs), yr = Math.max(...ys) - Math.min(...ys);
        if (reversals(ys, .016) >= 2 && xr < yr * .7 && cool('Nod', 1800)) { fireGesture('Nod'); GH.nose = [] }
        else if (reversals(xs, .024) >= 2 && yr < xr * .7 && cool('Shake', 1800)) { fireGesture('Shake'); GH.nose = [] } }
    } else if (GH.face && now - GH.lastFace > 6000) { GH.face = false; fireGesture('Face_Away') }
  }
  // ----- две руки -----
  let twoK = null;
  if (hands.length >= 2) {
    const [A, B] = hands, pc = L => ({ x: (L[0].x + L[5].x + L[9].x + L[13].x + L[17].x) / 5, y: (L[0].y + L[5].y + L[9].y + L[13].y + L[17].y) / 5 }), d = dd(pc(A), pc(B)), eA = fingers(A), eB = fingers(B);
    GH.two.push({ d, t: now }); GH.two = GH.two.filter(p => now - p.t < 500); const mx = Math.max(...GH.two.map(p => p.d));
    if (d < .11 && mx > .25 && cool('Clap_Cam', 1000)) { fireGesture('Clap_Cam'); GH.two = [] }
    else if (eA.n >= 4 && eB.n >= 4 && GH.two.length > 6) { const r0 = d / GH.two[0].d; if (r0 > 1.6 && cool('Zoom', 1000)) fireGesture('Zoom_In'); else if (r0 < .62 && d > .14 && cool('Zoom', 1000)) fireGesture('Zoom_Out') }
    if (dd(A[4], B[4]) < .06 && dd(A[8], B[8]) < .06) twoK = 'Heart';
    else if (eA.thumb && eA.idx && !eA.mid && !eA.ring && eB.thumb && eB.idx && !eB.mid && !eB.ring && d > .2) twoK = 'Frame';
  } else GH.two = [];
  for (let h = 1; h < hands.length; h++) drawHand(x, toPx(hands[h]), null, 0, 0, 9999, now);
  // ----- основная рука -----
  const L = hands[0];
  if (!L) { $('#gbig').textContent = '—'; $('#gname').textContent = face ? 'лицо в кадре · рука не найдена' : 'рука не найдена'; $('#gact').textContent = 'покажи ладонь в камеру'; $('#ghold').style.width = 0; holdK = null; $('#aircur').hidden = true; GH.w = []; GH.sz = []; GH.ang = null; overlay(x, c, now); return }
  const P = toPx(L), e = fingers(L), isPinch = dd(L[4], L[8]) < .05;
  let faceK = null;
  if (face) { if (e.idx && !e.mid && !e.ring && !e.pinky && dd(L[8], face[3]) < .09) faceK = 'Shh'; else { const pc = { x: (L[0].x + L[9].x) / 2, y: (L[0].y + L[9].y) / 2 }; if (e.n >= 4 && (dd(pc, face[4]) < .1 || dd(pc, face[5]) < .1)) faceK = 'Ear' } }
  const g = hs[0]?.g, mp = g && g.score > .6 && g.categoryName !== 'None' ? g.categoryName : null;
  const k = twoK || faceK || poseCustom(L, e) || mp || (isPinch ? 'Pinch' : null), info = GACT[k];
  // движение
  if (!mouse) {
    GH.w.push({ x: 1 - L[0].x, y: L[0].y, t: now }); GH.w = GH.w.filter(p => now - p.t < 1200);
    const recent = GH.w.filter(p => now - p.t < 260);
    if (recent.length > 3 && now - lastFire > 900 && !isPinch) {
      const dx = recent.at(-1).x - recent[0].x, dy = recent.at(-1).y - recent[0].y;
      if (Math.abs(dx) > .22 && Math.abs(dx) > Math.abs(dy)) { fireGesture(dx > 0 ? 'Swipe_R' : 'Swipe_L'); GH.w = [] }
      else if (Math.abs(dy) > .2 && Math.abs(dy) > Math.abs(dx)) { fireGesture(dy < 0 ? 'Swipe_U' : 'Swipe_D'); GH.w = [] }
    }
    if (GH.w.length > 12 && e.n >= 4 && reversals(GH.w.map(p => p.x), .035) >= 3 && cool('Wave', 2500)) { fireGesture('Wave'); GH.w = [] }
    GH.sz.push({ s: e.s, t: now }); GH.sz = GH.sz.filter(p => now - p.t < 450);
    if (GH.sz.length > 5 && e.n >= 4) { const q = e.s / GH.sz[0].s; if (q > 1.45 && cool('PushPull', 1200)) { fireGesture('Push'); GH.sz = [] } else if (q < .68 && cool('PushPull', 1200)) { fireGesture('Pull'); GH.sz = [] } }
    if (isPinch) { const a = Math.atan2(L[9].y - L[0].y, L[9].x - L[0].x); if (GH.ang != null) { let da = a - GH.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; GH.rot += da; if (Math.abs(GH.rot) > .26) { const up = GH.rot < 0; GH.rot = 0; jvVol = Math.max(0, Math.min(100, jvVol + (up ? 5 : -5))); gLastK = 'Rotate'; gLastT = now; if (cool('RotLog', 700)) glog(`🔄 крутилка → громкость ${jvVol}%`) } } GH.ang = a } else { GH.ang = null; GH.rot = 0 }
  }
  // удержание для поз
  let prog = 0;
  if (k && k !== 'Pinch' && !mouse) { if (holdK !== k) { holdK = k; holdT = now } prog = Math.min(1, (now - holdT) / (k.startsWith('Fingers') ? 800 : 600)); if (prog >= 1 && now - lastFire > 1500) { fireGesture(k); holdT = now + 99999 } } else holdK = null;
  drawHand(x, P, info, g?.score || .9, Math.max(0, prog), now - lastFire, now);
  if (isPinch) { x.save(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.shadowColor = '#ffb547'; x.shadowBlur = 14; x.beginPath(); x.arc((P[4].x + P[8].x) / 2, (P[4].y + P[8].y) / 2, 16, 0, 7); x.stroke();
    if (GH.ang != null) { x.strokeStyle = '#5ff3ff'; x.lineWidth = 4; x.beginPath(); x.arc(P[0].x, P[0].y, 46, -Math.PI / 2, -Math.PI / 2 + jvVol / 100 * Math.PI * 2); x.stroke(); x.fillStyle = '#5ff3ff'; x.font = '700 12px Inter'; x.fillText(jvVol + '%', P[0].x - 14, P[0].y + 4) } x.restore() }
  $('#gbig').textContent = info?.e || '✋'; $('#gname').textContent = info ? `${info.n}${g && k === mp ? ' · ' + g.score.toFixed(2) : ''}` : `рука найдена · пальцев: ${e.n}`; $('#gact').textContent = info?.a || 'жест не распознан'; $('#ghold').style.width = Math.max(0, prog) * 100 + '%';
  // аэромышь
  $('#aircur').hidden = !mouse;
  if (mouse) { const tx = Math.min(1, Math.max(0, ((1 - L[8].x) - .15) / .7)) * innerWidth, ty = Math.min(1, Math.max(0, (L[8].y - .12) / .6)) * innerHeight; acur.x += (tx - acur.x) * .35; acur.y += (ty - acur.y) * .35; const ac = $('#aircur'); ac.style.transform = `translate(${acur.x}px,${acur.y}px)`; ac.classList.toggle('pinch', isPinch);
    if (isPinch && !pinched) { ac.hidden = true; const el = document.elementFromPoint(acur.x, acur.y); ac.hidden = false; if (el) { el.click(); el.focus?.(); glog('🤏 клик по ' + (el.textContent || el.tagName).trim().slice(0, 30)) } } }
  pinched = isPinch;
  overlay(x, c, now);
};
function overlay(x, c, now) {
  const t = now - gLastT; if (!gLastK || t > 1000 || !GACT[gLastK]) return; const g = GACT[gLastK], a = 1 - Math.max(0, (t - 600) / 400), s = 1 + Math.min(1, t / 150) * .15;
  x.save(); x.globalAlpha = a; x.translate(c.width / 2, c.height * .42); x.scale(s, s); x.textAlign = 'center';
  x.font = '64px system-ui'; x.fillText(g.e, 0, 0); x.font = '800 26px Orbitron,Inter,sans-serif'; x.shadowColor = '#ffb547'; x.shadowBlur = 20; x.fillStyle = '#ffd79a'; x.fillText(g.n.toUpperCase(), 0, 44);
  x.shadowBlur = 0; x.font = '500 14px Inter'; x.fillStyle = '#cfefff'; x.fillText('→ ' + g.a, 0, 70); x.restore();
}

/* ---------- звуковые жесты: хлопки, щелчок, свист ---------- */
let auOn = false;
$('#gaudgo').onclick = async () => {
  if (auOn) return; const b = $('#gaudgo'); b.textContent = '…';
  let st; try { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }) } catch (e) { b.textContent = '🎙 СЛУШАТЬ'; $('#gaudn').textContent = 'нет доступа к микрофону'; $('#gauds').textContent = e.message; return }
  auOn = true; b.textContent = '● СЛУШАЮ'; b.classList.add('!border-jv-red', '!text-jv-red');
  const ac = new AudioContext(), an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0; ac.createMediaStreamSource(st).connect(an);
  const td = new Float32Array(an.fftSize), fq = new Float32Array(an.frequencyBinCount), hz = ac.sampleRate / an.fftSize;
  const cv = $('#gaud'), cx = cv.getContext('2d'); let floor = .01, prev = 0, lastOn = 0, claps = [], clapTm = null, wh = 0, lvl = [];
  const ev = (k, extra = '') => { const g = GACT[k]; $('#gaudev').textContent = g.e; $('#gaudn').textContent = g.n + extra; $('#gauds').textContent = '→ ' + g.a; fireGesture(k) };
  setInterval(() => {
    an.getFloatTimeDomainData(td); an.getFloatFrequencyData(fq);
    let sq = 0; for (const s of td) sq += s * s; const rms = Math.sqrt(sq / td.length), now = performance.now();
    let num = 0, den = 0, pk = 0, pki = 0, sum = 0, cnt = 0;
    for (let i = 2; i < fq.length; i++) { const m = 10 ** (fq[i] / 20); num += i * hz * m; den += m; const f = i * hz; if (f > 800 && f < 4000) { sum += m; cnt++; if (m > pk) { pk = m; pki = i } } }
    const cent = num / (den || 1), tonal = pk / ((sum / (cnt || 1)) || 1e-9);
    if (rms > Math.max(.06, floor * 7) && prev < rms * .45 && now - lastOn > 110) {
      lastOn = now;
      if (cent > 4200 && rms < .25) ev('Snap', ` · ${Math.round(cent)} Гц`);
      else { claps.push(now); clearTimeout(clapTm); $('#gaudev').textContent = '👏'; $('#gaudn').textContent = `хлопок ×${claps.length}…`; clapTm = setTimeout(() => { const n = Math.min(3, claps.length); claps = []; ev('Clap_' + n) }, 600) }
    } else if (rms < floor * 3) floor = floor * .97 + rms * .03;
    if (tonal > 30 && rms > Math.max(.015, floor * 3) && rms < .3) { wh += 20; if (wh > 420 && cool('Whistle', 2500)) ev('Whistle', ` · ${Math.round(pki * hz)} Гц`) } else wh = 0;
    prev = rms; lvl.push(rms); if (lvl.length > 140) lvl.shift();
    const W = cv.width = cv.clientWidth * devicePixelRatio, H = cv.height = cv.clientHeight * devicePixelRatio; cx.clearRect(0, 0, W, H);
    for (let i = 0; i < 64; i++) { const v = Math.max(0, (fq[i * 6] + 100) / 80); cx.fillStyle = `hsla(${190 - i * 2},100%,60%,.35)`; cx.fillRect(i * W / 64, H - v * H, W / 64 - 1, v * H) }
    cx.strokeStyle = '#5ff3ff'; cx.lineWidth = 2 * devicePixelRatio; cx.beginPath(); lvl.forEach((l, i) => { const y = H - Math.min(1, l * 4) * H; i ? cx.lineTo(i * W / 140, y) : cx.moveTo(0, y) }); cx.stroke();
    const th = H - Math.min(1, Math.max(.06, floor * 7) * 4) * H; cx.strokeStyle = 'rgba(255,77,94,.7)'; cx.setLineDash([6, 4]); cx.beginPath(); cx.moveTo(0, th); cx.lineTo(W, th); cx.stroke(); cx.setLineDash([]);
  }, 20);
  $('#gaudn').textContent = 'слушаю…'; $('#gauds').textContent = 'хлопните 1, 2 или 3 раза · щёлкните пальцами · свистните'; glog('🎙 микрофон: звуковые жесты включены');
};
