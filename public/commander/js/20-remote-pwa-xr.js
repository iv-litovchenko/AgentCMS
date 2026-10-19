/* =====================================================================
   ТЕЛЕФОН КАК ПУЛЬТ (PeerJS / BroadcastChannel + QR) · PWA · AR/VR (WebXR)
   ===================================================================== */
(() => {
const PEER = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', QR = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const Q = new URLSearchParams(location.search), REMOTE = Q.get('remote');
const grid = document.querySelector('#conn .grid');

/* ---------- канал связи: PeerJS (между устройствами) + BroadcastChannel (вкладки одного браузера) ---------- */
async function channel(id, host, onMsg, onStatus) {
  const bc = new BroadcastChannel('jv-remote-' + id); bc.onmessage = e => onMsg(e.data);
  const conns = []; let peer = null;
  try {
    await loadScript(PEER);
    peer = host ? new Peer(id) : new Peer();
    peer.on('open', () => { onStatus('p2p готов'); if (!host) { const c = peer.connect(id, { reliable: true }); c.on('open', () => { conns.push(c); onStatus('🟢 подключено через интернет (P2P)'); c.send({ t: 'hello' }) }); c.on('data', onMsg); c.on('close', () => onStatus('🔴 связь потеряна')) } });
    if (host) peer.on('connection', c => { conns.push(c); c.on('data', d => onMsg(d, c)); c.on('open', () => onStatus(`🟢 пультов: ${conns.filter(x => x.open).length}`)); c.on('close', () => onStatus(`пультов: ${conns.filter(x => x.open).length}`)) });
    peer.on('error', e => onStatus('P2P: ' + e.type + ' · работает только в этом браузере'));
  } catch (e) { onStatus('P2P недоступен · работает только в этом браузере') }
  return m => { bc.postMessage(m); conns.forEach(c => c.open && c.send(m)) };
}

/* ================= РЕЖИМ ПУЛЬТА (открыт на телефоне) ================= */
if (REMOTE) {
  voiceOn = false; document.querySelector('.wrap').style.display = 'none'; ['thBtn', 'boot'].forEach(i => document.getElementById(i)?.remove());
  const DV = [['light', '💡', 'Свет'], ['coffee', '☕', 'Кофе'], ['blinds', '🪟', 'Шторы'], ['lock', '🔒', 'Дверь'], ['ac', '🌡', 'Климат']];
  document.body.insertAdjacentHTML('beforeend', `<div id="rm" style="position:fixed;inset:0;z-index:300;overflow:auto;background:radial-gradient(ellipse at 50% 0,rgba(0,90,140,.35),#02080d 60%);padding:max(16px,env(safe-area-inset-top)) 16px 30px">
    <div class="flex items-center gap-2"><div class="font-hud text-jv-cyan tracking-[.3em] text-[15px]">J.A.R.V.I.S.</div><span class="jv-sub">пульт</span><span id="rmSt" class="ml-auto jv-badge border-jv-line text-jv-mute">подключаюсь…</span></div>
    <div id="rmReply" class="jv-tile mt-4 text-[15px] min-h-[64px]">Скажите или напишите команду — она выполнится на большом экране.</div>
    <div class="flex gap-2 mt-3"><input id="rmIn" class="flex-1 min-w-0 bg-black/40 border border-solid border-jv-line rounded-xl text-jv-text px-4 py-3 text-[15px] outline-none" placeholder="Команда…"><button id="rmMic" class="jv-btn !text-xl !px-4">🎙</button><button id="rmSend" class="jv-btn !px-4">➤</button></div>
    <div class="jv-label mt-5 mb-2">Дом</div><div class="grid grid-cols-3 gap-2">${DV.map(([k, e, n]) => `<button data-dv="${k}" class="rounded-2xl border border-solid border-jv-line bg-black/30 text-jv-text py-4 text-[13px] cursor-pointer"><div class="text-2xl">${e}</div>${n}</button>`).join('')}<button id="rmMus" class="rounded-2xl border border-solid border-jv-line bg-black/30 text-jv-text py-4 text-[13px] cursor-pointer"><div class="text-2xl">🎵</div><span id="rmTr">Музыка</span></button></div>
    <div class="jv-label mt-5 mb-2">Голо-HUD на экране</div><div class="grid grid-cols-2 gap-2">${[['flight', '✈️ Полёт'], ['workshop', '🛠 Мастерская'], ['brief', '🗺 Брифинг'], ['analysis', '📊 Анализ']].map(([k, n]) => `<button data-sc="${k}" class="jv-btn !py-3 !text-[11px]">${n}</button>`).join('')}</div>
    <div class="jv-label mt-5 mb-2">Режим</div><div class="grid grid-cols-3 gap-2">${[['classic', '💠 Обычный'], ['battle', '⚠️ Боевой'], ['night', '🌙 Ночь']].map(([k, n]) => `<button data-th="${k}" class="jv-btn !py-3 !text-[10px]">${n}</button>`).join('')}</div></div>`);
  let send = () => { }; const st = {};
  channel(REMOTE, false, m => { if (m.t === 'state') { Object.assign(st, m); if (!/🟢/.test($('#rmSt').textContent)) { $('#rmSt').textContent = '🟢 связь с экраном'; $('#rmSt').className = 'ml-auto jv-badge border-jv-green text-jv-green' } DV.forEach(([k]) => { const b = document.querySelector(`[data-dv="${k}"]`); const on = m.dev?.[k]; b.style.borderColor = on ? '#00d4ff' : ''; b.style.background = on ? 'rgba(0,212,255,.15)' : '' }); $('#rmTr').textContent = m.playing ? '⏸ ' + (m.track || '').slice(0, 14) : '▶ ' + (m.track || 'Музыка').slice(0, 14); if (m.last) $('#rmReply').textContent = '🤖 ' + m.last } }, s => $('#rmSt').textContent = s).then(fn => { send = fn; fn({ t: 'hello' }) });
  const cmd = t => { if (!t) return; send({ t: 'cmd', text: t }); $('#rmReply').textContent = '⏳ «' + t + '»'; $('#rmIn').value = '' };
  $('#rmSend').onclick = () => cmd($('#rmIn').value.trim()); $('#rmIn').onkeydown = e => { if (e.key === 'Enter') $('#rmSend').click() };
  $$('[data-dv]').forEach(b => b.onclick = () => send({ t: 'dev', id: b.dataset.dv })); $('#rmMus').onclick = () => send({ t: 'music' });
  $$('[data-sc]').forEach(b => b.onclick = () => send({ t: 'scene', s: b.dataset.sc })); $$('[data-th]').forEach(b => b.onclick = () => send({ t: 'theme', k: b.dataset.th }));
  const SRr = window.SpeechRecognition || window.webkitSpeechRecognition;
  $('#rmMic').onclick = () => { if (!SRr) return alertBox('Голосовой ввод не поддерживается этим браузером'); const r = new SRr(); r.lang = 'ru-RU'; $('#rmMic').textContent = '🔴'; r.onresult = e => cmd(e.results[0][0].transcript); r.onend = () => $('#rmMic').textContent = '🎙'; r.start() };
  function alertBox(t) { $('#rmReply').textContent = t }
  return;
}

/* ================= ХОСТ: карточка «Телефон как пульт» ================= */
grid.insertAdjacentHTML('beforeend', `<div class="jv-tile" id="cnR"><div class="flex items-center gap-3 mb-3"><span class="text-2xl">📱</span><div><div class="font-semibold text-white">Телефон как пульт</div><div class="jv-sub">сканируйте QR — телефон управляет этим экраном</div></div><span class="ml-auto jv-badge border-jv-line text-jv-mute" id="cnRst">выкл</span></div>
  <button id="cnRgo" class="jv-btn">📱 СОЗДАТЬ ПУЛЬТ</button><div id="cnRbody" class="hidden mt-3"><div class="flex gap-3 items-start"><div id="cnRqr" class="rounded-lg overflow-hidden bg-[#03080d] p-2 shrink-0"></div><div class="text-[12.5px] leading-relaxed"><div class="jv-label mb-1">Адрес для телефона</div><input id="cnRbase" class="w-full bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-2 py-1.5 font-mono text-[11px] outline-none"><div id="cnRhint" class="jv-sub mt-2"></div><button id="cnRtab" class="jv-badge border-jv-cyan text-jv-cyan bg-transparent cursor-pointer mt-2">открыть пульт в новой вкладке</button></div></div></div></div>
  <div class="jv-tile" id="cnP"><div class="flex items-center gap-3 mb-3"><span class="text-2xl">⬇️</span><div><div class="font-semibold text-white">Приложение (PWA)</div><div class="jv-sub">иконка на рабочем столе, офлайн, уведомления</div></div><span class="ml-auto jv-badge border-jv-line text-jv-mute" id="cnPst">…</span></div>
  <div class="flex flex-wrap gap-2"><button id="cnPinst" class="jv-btn" disabled>⬇ УСТАНОВИТЬ</button><button id="cnPnot" class="jv-btn !border-jv-line !text-jv-mute !bg-transparent">🔔 ТЕСТ УВЕДОМЛЕНИЯ</button></div><div id="cnPinfo" class="jv-sub mt-2 leading-relaxed"></div></div>`);
let hostSend = null, hostId = JV.store.get('rid', null);
const state = () => ({ t: 'state', dev: Object.fromEntries($$('.sw[data-dev]').map(s => [s.dataset.dev, s.classList.contains('on')])), track: $('#track')?.textContent, playing: $('#np')?.classList.contains('play'), last: [...$$('#chat .msg.j span')].at(-1)?.textContent?.slice(0, 160) });
$('#cnRgo').onclick = async () => {
  hostId ||= 'jarvis-' + Math.random().toString(36).slice(2, 8); JV.store.set('rid', hostId); $('#cnRgo').disabled = true; $('#cnRbody').classList.remove('hidden');
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname); $('#cnRbase').value = local ? `http://192.168.1.10:${location.port || 80}${location.pathname}` : location.origin + location.pathname;
  $('#cnRhint').innerHTML = local ? '⚠️ Телефон не видит <b>localhost</b>. Запустите сервер так, чтобы он был виден в сети (<code>--bind 0.0.0.0</code>), и впишите IP этого компьютера. Связь между устройствами идёт напрямую (P2P через WebRTC), сервер PeerJS лишь знакомит их.' : 'Откройте камеру телефона и наведите на QR.';
  const qr = async () => { await loadScript(QR).catch(() => { }); const box = $('#cnRqr'); box.innerHTML = ''; const url = $('#cnRbase').value.trim() + '?remote=' + hostId; if (window.QRCode) new QRCode(box, { text: url, width: 150, height: 150, colorDark: '#00d4ff', colorLight: '#03080d' }); else box.textContent = url };
  $('#cnRbase').onchange = qr; qr(); $('#cnRtab').onclick = () => window.open(location.origin + location.pathname + '?remote=' + hostId, '_blank');
  hostSend = await channel(hostId, true, async m => {
    if (m.t === 'hello') { hostSend(state()); return } log?.('remote: ' + JSON.stringify(m).slice(0, 60), 'c'); bus?.('remote', m);
    if (m.t === 'cmd') { toast('📱 «' + m.text + '»'); await handle(m.text) }
    if (m.t === 'dev') setDev(m.id, !$(`.sw[data-dev="${m.id}"]`).classList.contains('on'));
    if (m.t === 'music') $('#np').classList.toggle('play');
    if (m.t === 'scene') { goTab('holo'); setTimeout(() => window.hudCompose?.({ scene: m.s }), 400) }
    if (m.t === 'theme') JV.setTheme(m.k, true);
    setTimeout(() => hostSend(state()), 300);
  }, s => $('#cnRst').textContent = s);
  setInterval(() => hostSend && hostSend(state()), 2500);
};

/* ---------- PWA ---------- */
let installEvt = null;
if (!window.JV_BUNDLE && !document.querySelector('link[rel=manifest]')) document.head.insertAdjacentHTML('beforeend', '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#03080d"><link rel="apple-touch-icon" href="icon.svg">');
const pst = (t, ok) => { $('#cnPst').textContent = t; $('#cnPst').className = `ml-auto jv-badge ${ok ? 'border-jv-green text-jv-green' : 'border-jv-line text-jv-mute'}` };
if (window.JV_BUNDLE) { pst('однофайловая версия', false); $('#cnPinfo').innerHTML = 'Установка и офлайн-режим работают в версии из папки <code>jarvis/</code> на сервере: там лежат manifest и service worker.' }
else if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').then(() => { pst('✓ работает офлайн', true); $('#cnPinfo').textContent = 'Service worker закэшировал макет: он откроется даже без интернета (кроме облачных функций).' }).catch(e => { pst('нет', false); $('#cnPinfo').textContent = 'Service worker не зарегистрирован: ' + e.message });
else pst('нужен http-сервер', false);
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#cnPinst').disabled = false; if (!$('#jvInst')) { document.getElementById('jvCtl').insertAdjacentHTML('beforeend', '<button id="jvInst" class="jv-sel" title="Установить как приложение">⬇ Установить</button>'); $('#jvInst').onclick = () => $('#cnPinst').click() } });
$('#cnPinst').onclick = async () => { if (!installEvt) return toast('Установка доступна в Chrome/Edge; в Safari: «Поделиться → На экран Домой»'); installEvt.prompt(); const r = await installEvt.userChoice; toast(r.outcome === 'accepted' ? '⬇ Джарвис установлен' : 'Установка отменена'); installEvt = null; $('#cnPinst').disabled = true; $('#jvInst')?.remove() };
addEventListener('appinstalled', () => pst('✓ установлено', true));
$('#cnPnot').onclick = async () => { if (!('Notification' in window)) return toast('Уведомления не поддерживаются'); if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') return toast('🔕 Уведомления запрещены'); const reg = await navigator.serviceWorker?.getRegistration(); const b = { body: 'Сэр, это тестовое уведомление. Системы в норме.', icon: 'icon.svg', tag: 'jv-test' }; reg ? reg.showNotification('J.A.R.V.I.S.', b) : new Notification('J.A.R.V.I.S.', b) };
if (matchMedia('(display-mode: standalone)').matches) pst('✓ запущено как приложение', true);

/* ---------- AR-камера и WebXR в Голо-HUD ---------- */
const bar = $('#hcmd').closest('.jv-tile');
bar.insertAdjacentHTML('beforeend', '<button id="hAR" class="jv-badge border-jv-green text-jv-green bg-transparent cursor-pointer">📷 AR-камера</button><button id="hXR" class="jv-badge border-jv-purple text-jv-purple bg-transparent cursor-pointer">🥽 VR / AR-очки</button>');
let arStream = null;
$('#hAR').onclick = async () => {
  const stg = $('#hstage');
  if (arStream) { arStream.getTracks().forEach(t => t.stop()); arStream = null; $('#harVid')?.remove(); stg.style.background = ''; $('#hAR').textContent = '📷 AR-камера'; return }
  try { arStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }) } catch (e) { return toast('📷 Нет доступа к камере') }
  stg.insertAdjacentHTML('afterbegin', '<video id="harVid" autoplay playsinline muted style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55;filter:saturate(.6) contrast(1.1)"></video>');
  $('#harVid').srcObject = arStream; stg.style.background = 'rgba(2,8,13,.25)'; $('#hAR').textContent = '📷 выключить AR'; toast('📷 HUD поверх камеры — как в шлеме');
};
$('#hXR').onclick = async () => {
  if (!navigator.xr) return toast('🥽 WebXR недоступен здесь. Откройте эту страницу в браузере Quest или Safari на Vision Pro (по https или localhost).');
  const mode = (await navigator.xr.isSessionSupported('immersive-ar').catch(() => false)) ? 'immersive-ar' : (await navigator.xr.isSessionSupported('immersive-vr').catch(() => false)) ? 'immersive-vr' : null;
  if (!mode) return toast('🥽 Браузер знает WebXR, но шлем не найден. Подключите VR/AR-устройство.');
  await loadScript(THREE_URL); const T = THREE, session = await navigator.xr.requestSession(mode, { optionalFeatures: ['local-floor', 'hand-tracking'] });
  const R = new T.WebGLRenderer({ antialias: true, alpha: true }); R.xr.enabled = true; R.xr.setReferenceSpaceType('local-floor'); document.body.append(R.domElement); R.domElement.style.display = 'none';
  const sc = new T.Scene(), cam = new T.PerspectiveCamera(70, 1, .05, 50); sc.add(new T.AmbientLight(0xffffff, 1));
  const mk = (title, draw, ang) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320; const tx = new T.CanvasTexture(cv), m = new T.Mesh(new T.PlaneGeometry(.64, .4), new T.MeshBasicMaterial({ map: tx, transparent: true })); m.position.set(Math.sin(ang) * 1.5, 1.45, -Math.cos(ang) * 1.5); m.lookAt(0, 1.45, 0); sc.add(m); return { cv, tx, title, draw } };
  const frameP = (x, t) => { x.clearRect(0, 0, 512, 320); x.fillStyle = 'rgba(0,30,45,.75)'; x.fillRect(0, 0, 512, 320); x.strokeStyle = '#00d4ff'; x.lineWidth = 4; x.strokeRect(2, 2, 508, 316); x.fillStyle = '#00d4ff'; x.font = 'bold 26px sans-serif'; x.fillText(t, 20, 40) };
  const P = [mk('ВРЕМЯ', (x, t) => { x.fillStyle = '#fff'; x.font = 'bold 110px sans-serif'; x.fillText(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), 40, 200) }, -.9),
    mk('РЕАКТОР', (x, t) => { const v = 96 + Math.sin(t) * 3; x.strokeStyle = '#5ff3ff'; x.lineWidth = 22; x.beginPath(); x.arc(256, 190, 90, Math.PI * .75, Math.PI * .75 + Math.PI * 1.5 * v / 100); x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 54px sans-serif'; x.fillText(Math.round(v) + '%', 200, 210) }, -.45),
    mk('ДЖАРВИС', (x) => { x.fillStyle = '#fff'; x.font = '28px sans-serif'; const s = [...$$('#chat .msg.j span')].at(-1)?.textContent || 'Системы в норме, сэр.'; s.match(/.{1,30}(\s|$)/g)?.slice(0, 6).forEach((l, i) => x.fillText(l, 24, 90 + i * 36)) }, 0),
    mk('РАДАР', (x, t) => { x.strokeStyle = '#3dffa8'; x.lineWidth = 2; [40, 80, 120].forEach(r => { x.beginPath(); x.arc(256, 180, r, 0, 7); x.stroke() }); const a = t * 2; x.lineWidth = 4; x.beginPath(); x.moveTo(256, 180); x.lineTo(256 + Math.cos(a) * 120, 180 + Math.sin(a) * 120); x.stroke() }, .45),
    mk('ДОМ', (x) => { x.font = '30px sans-serif'; $$('.sw[data-dev]').forEach((s, i) => { x.fillStyle = s.classList.contains('on') ? '#3dffa8' : '#6c93a8'; x.fillText((s.classList.contains('on') ? '● ' : '○ ') + s.parentElement.textContent.trim().slice(0, 18), 24, 90 + i * 44) }) }, .9)];
  const core = new T.Mesh(new T.TorusGeometry(.18, .04, 12, 48), new T.MeshBasicMaterial({ color: 0x5ff3ff, wireframe: true })); core.position.set(0, 1.1, -1.1); sc.add(core);
  let last = 0; R.setAnimationLoop(ts => { const t = ts / 1000; core.rotation.y = t; core.rotation.x = t * .6; if (ts - last > 200) { last = ts; P.forEach(p => { const x = p.cv.getContext('2d'); frameP(x, p.title); p.draw(x, t); p.tx.needsUpdate = true }) } R.render(sc, cam) });
  session.addEventListener('end', () => { R.setAnimationLoop(null); R.dispose(); R.domElement.remove(); toast('🥽 Сеанс XR завершён') });
  await R.xr.setSession(session); toast('🥽 Панели вокруг вас — оглянитесь');
};
})();
