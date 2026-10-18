/* =====================================================================
   ПЕРЕМОТКА ДНЯ — таймлайн всего, что Джарвис видел, слышал и делал
   ===================================================================== */
(() => {
const sec = JV.addTab('rewind', 'Перемотка', `
  <div class="max-w-4xl mb-3"><div class="h2">ПЕРЕМОТКА ДНЯ</div>
    <p class="m-0 text-[14px] text-jv-text">Джарвис записывает каждое событие: что вы сказали, какие инструменты он вызвал, что включилось в доме, какие были жесты и какой интерфейс собирался. Тяните ползунок — справа видно <b>состояние в ту минуту</b>. «▶ Воспроизвести» прокручивает день в ускоренном темпе. Всё, что вы делаете в макете, сразу появляется на ленте.</p></div>
  <div class="jv-tile !p-0 overflow-hidden"><div class="flex flex-wrap items-center gap-2 px-4 py-3 border-0 border-b border-solid border-jv-line">
      <button id="rwPlay" class="jv-btn">▶ ВОСПРОИЗВЕСТИ ×600</button><button id="rwNow" class="jv-btn !border-jv-line !text-jv-mute !bg-transparent">⏭ СЕЙЧАС</button>
      <span id="rwTime" class="font-hud text-[22px] text-white ml-3"></span><span id="rwCnt" class="jv-sub ml-auto"></span></div>
    <div class="relative"><canvas id="rwC" class="w-full block cursor-pointer" style="height:230px"></canvas></div></div>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
    <div class="jv-tile"><div class="jv-label mb-2">Состояние в этот момент</div><div id="rwState"></div></div>
    <div class="jv-tile lg:col-span-2"><div class="jv-label mb-2">События рядом (±20 мин)</div><div id="rwList" class="space-y-1 max-h-[300px] overflow-y-auto"></div></div></div>`, 'sim');
const TR = [['speech', '🎙 Речь', '#3dffa8'], ['tool', '🔧 Инструменты', '#ffb547'], ['home', '🏠 Дом', '#00d4ff'], ['gesture', '✋ Жесты', '#b48cff'], ['ui', '🖥 Интерфейс', '#5ff3ff'], ['brain', '🧠 Мозг и память', '#ff7a8a']];
const kindOf = ev => /transcript/.test(ev) ? 'speech' : /tool/.test(ev) ? 'tool' : /device/.test(ev) ? 'home' : /gesture/.test(ev) ? 'gesture' : /brain|memory|llm/.test(ev) ? 'brain' : 'ui';
let EV = JV.store.get('rewind', null);
const today = new Date(); today.setHours(0, 0, 0, 0); const D0 = today.getTime() + 7 * 36e5;
if (!EV || !EV.length || EV[0].t < today.getTime()) { // демо-утро, чтобы лента не была пустой
  const at = (h, m) => today.getTime() + (h * 60 + m) * 6e4;
  EV = [[7, 0, 'ui', 'Будильник, шторы открылись', { dev: { blinds: true } }], [7, 2, 'speech', '«Доброе утро, Джарвис»'], [7, 2, 'tool', 'get_weather · calendar.list_events · email.unread'], [7, 3, 'speech', 'Джарвис: «Плюс одиннадцать, три встречи…»'], [7, 5, 'home', 'Кофемашина включена', { dev: { coffee: true } }], [7, 6, 'home', 'Свет в гостиной 60%', { dev: { light: true } }], [7, 40, 'home', 'Кофемашина выключена', { dev: { coffee: false } }], [8, 15, 'gesture', '👍 одобрил отправку отчёта'], [8, 50, 'ui', 'Дашборд «Работа»'], [9, 12, 'tool', 'maps.route → 24 мин'], [9, 20, 'home', 'Ушёл из дома: двери закрыты, свет выкл.', { dev: { light: false, lock: true } }], [10, 15, 'brain', 'Протокол стендапа сохранён во второй мозг'], [11, 30, 'tool', 'web_search × 4 · исследование колонок'], [12, 5, 'gesture', '🤟 включил AC/DC', { music: 'Thunderstruck' }], [13, 30, 'speech', '«Напомни про обед с Пеппер»'], [14, 10, 'ui', 'Голо-HUD: сцена «Брифинг»'], [15, 40, 'brain', 'Новая связь в графе: «сон» ↔ «сны Джарвиса»']].filter(e => at(e[0], e[1]) < Date.now()).map(e => ({ t: at(e[0], e[1]), k: e[2], txt: e[3], st: e[4] || {} }));
}
const save = () => JV.store.set('rewind', EV.slice(-1500));
/* запись живых событий из шины */
const _bus = bus; bus = function (ev, p) { try { const k = kindOf(ev); const txt = ev === 'transcript' ? (p.role === 'user' ? 'вы сказали' : 'Джарвис ответил') : ev === 'tool_call' ? `${p.name}(${String(p.args || '').slice(0, 40)})` : ev === 'device' ? `${p.id} → ${p.on ? 'вкл' : 'выкл'}` : ev === 'gesture' ? `${p.name} → ${p.action}` : ev === 'state' || ev === 'hello' ? null : ({ 'table.done': () => 'Голостол: Mark 86 собран', 'hud.compose': () => `Голо-HUD: сцена «${p.scene}»`, theme: () => `Тема: ${p.id}`, 'lab.open': () => `Лаборатория: ${p.demo}`, dashboard: () => `Дашборд: ${p.id}`, 'brain.open': () => `Второй мозг: открыта заметка`, 'brain.ask': () => `Вопрос мозгу: ${p.q}`, 'brain.explode': () => 'Второй мозг: разбор заметки', 'ui.patch': () => 'Конструктор: агент добавил плитки' }[ev]?.() || ev); if (txt && ev !== 'telemetry') { EV.push({ t: Date.now(), k, txt, st: ev === 'device' ? { dev: { [p.id]: p.on } } : {} }); if (sec.classList.contains('on')) draw(); save() } } catch (e) { } return _bus(ev, p) };
let cur = Date.now(), play = null;
const span = () => [D0, Math.max(Date.now(), D0 + 36e5)];
function stateAt(t) { const s = { dev: { light: false, ac: true, lock: true, blinds: false, coffee: false }, music: '—', n: 0, last: null }; EV.filter(e => e.t <= t).forEach(e => { Object.assign(s.dev, e.st.dev || {}); if (e.st.music) s.music = e.st.music; s.n++; if (e.k === 'speech' || e.k === 'ui') s.last = e }); return s }
function draw() {
  const c = $('#rwC'), W = c.clientWidth, H = c.clientHeight; if (!W) return; c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0);
  const [a, b] = span(), L = 120, px = t => L + (t - a) / (b - a) * (W - L - 16), rowH = (H - 34) / TR.length;
  x.font = '11px Inter'; TR.forEach(([k, n, col], i) => { const y = 8 + i * rowH; x.fillStyle = i % 2 ? 'rgba(255,255,255,.02)' : 'rgba(0,212,255,.03)'; x.fillRect(0, y, W, rowH); x.fillStyle = col; x.fillText(n, 10, y + rowH / 2 + 4) });
  x.font = '10px JetBrains Mono'; x.fillStyle = '#6c93a8'; for (let h = new Date(a).getHours(); h <= new Date(b).getHours() + 1; h++) { const t = new Date(a); t.setHours(h, 0, 0, 0); if (t.getTime() < a || t.getTime() > b) continue; const X = px(t.getTime()); x.fillRect(X, 8, 1, H - 34); x.fillText(String(h).padStart(2, '0') + ':00', X - 14, H - 10) }
  EV.forEach(e => { const i = TR.findIndex(r => r[0] === e.k), y = 8 + i * rowH + rowH / 2, X = px(e.t); x.fillStyle = TR[i][2]; x.shadowColor = TR[i][2]; x.shadowBlur = Math.abs(e.t - cur) < 12e5 ? 10 : 0; x.beginPath(); x.arc(X, y, Math.abs(e.t - cur) < 12e5 ? 5 : 3.5, 0, 7); x.fill() }); x.shadowBlur = 0;
  const X = px(cur); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(X, 4); x.lineTo(X, H - 22); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(X - 6, 2); x.lineTo(X + 6, 2); x.lineTo(X, 10); x.fill();
  $('#rwTime').textContent = new Date(cur).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); $('#rwCnt').textContent = `${EV.length} событий сегодня`;
  const s = stateAt(cur), D = [['light', '💡 Свет'], ['coffee', '☕ Кофе'], ['blinds', '🪟 Шторы'], ['lock', '🔒 Дверь'], ['ac', '🌡 Климат']];
  $('#rwState').innerHTML = `<div class="grid grid-cols-2 gap-2">${D.map(([k, n]) => `<div class="rounded-lg px-2 py-2 text-[12.5px] border border-solid ${s.dev[k] ? 'border-jv-cyan bg-jv-cyan/10 text-jv-text' : 'border-jv-line text-jv-mute'}">${n} · ${s.dev[k] ? (k === 'lock' ? 'закрыта' : 'вкл') : (k === 'lock' ? 'открыта' : 'выкл')}</div>`).join('')}</div><div class="mt-3 text-[13px]">🎵 ${esc(s.music)}</div><div class="jv-sub mt-2">событий к этой минуте: ${s.n}</div>${s.last ? `<div class="mt-2 text-[12.5px] rounded-md bg-white/5 p-2">последнее: ${esc(s.last.txt)}</div>` : ''}`;
  const near = EV.filter(e => Math.abs(e.t - cur) < 12e5); $('#rwList').innerHTML = near.length ? near.map(e => { const tr = TR.find(r => r[0] === e.k); return `<div class="flex gap-3 items-center text-[12.5px] rounded-md px-2 py-1.5 ${e.t <= cur ? 'bg-white/5' : 'opacity-50'}"><span class="font-mono text-[11px] text-jv-mute">${new Date(e.t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span><span class="w-2 h-2 rounded-full" style="background:${tr[2]}"></span><span>${esc(e.txt)}</span></div>` }).join('') : '<div class="jv-sub">в эти минуты ничего не происходило</div>';
}
const seek = e => { const c = $('#rwC'), r = c.getBoundingClientRect(), [a, b] = span(); cur = Math.max(a, Math.min(b, a + (e.clientX - r.left - 120) / (r.width - 136) * (b - a))); draw() };
let dragging = false; $('#rwC').onpointerdown = e => { dragging = true; $('#rwC').setPointerCapture(e.pointerId); seek(e) }; $('#rwC').onpointermove = e => dragging && seek(e); $('#rwC').onpointerup = () => dragging = false;
$('#rwPlay').onclick = () => { if (play) { clearInterval(play); play = null; $('#rwPlay').textContent = '▶ ВОСПРОИЗВЕСТИ ×600'; return } const [a] = span(); if (cur >= Date.now() - 6e4) cur = a; $('#rwPlay').textContent = '⏸ ПАУЗА'; play = setInterval(() => { cur += 6e4; if (cur >= Date.now()) { cur = Date.now(); clearInterval(play); play = null; $('#rwPlay').textContent = '▶ ВОСПРОИЗВЕСТИ ×600' } draw() }, 100) };
$('#rwNow').onclick = () => { cur = Date.now(); draw() };
{ const prev = window.onTab; window.onTab = t => { prev?.(t); if (t === 'rewind') { cur = Date.now(); setTimeout(draw, 30) } } }
addEventListener('resize', () => sec.classList.contains('on') && draw());
SKILLS.unshift({ re: /(что было|перемот|что ты делал|утром|в \d{1,2}(:\d\d)? (утра|часов))/i, run: () => { goTab('rewind'); return 'Открываю ленту дня, сэр.' } });
})();
