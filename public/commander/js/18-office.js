/* =====================================================================
   ОФИС АГЕНТОВ И ЛЮДЕЙ — живая симуляция совместной работы
   ===================================================================== */
(() => {
const sec = JV.addTab('office', 'Офис агентов', `
  <div class="max-w-4xl mb-3"><div class="h2">ОФИС АГЕНТОВ И ЛЮДЕЙ</div>
    <p class="m-0 text-[14px] text-jv-text">Так выглядит работа, когда у вас команда ИИ-агентов: <b>Джарвис-координатор</b> раздаёт задачи, агенты идут в нужную «комнату» (почта, лаборатория, серверная), а всё рискованное — отправка писем, открытие двери, деньги — <b>приносят людям на подпись</b>. Вы играете за Тони: одобряйте справа. Кликните любого — увидите, чем он занят. Можно дать свою задачу.</p></div>
  <div class="grid grid-cols-1 2xl:grid-cols-4 gap-3">
    <div class="2xl:col-span-3 flex flex-col gap-3">
      <div class="jv-tile !p-0 overflow-hidden"><div class="flex flex-wrap items-center gap-2 px-3 py-2 border-0 border-b border-solid border-jv-line">
        <input id="ofIn" class="flex-1 min-w-[220px] bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-3 py-2 font-mono text-[12.5px] outline-none" placeholder="Новая задача: «найди лучшие AR-очки», «ответь Роуди», «проверь камеры»…"><button id="ofAdd" class="jv-btn">+ ЗАДАЧА</button><button id="ofMeet" class="jv-btn !border-jv-purple !text-jv-purple !bg-jv-purple/10">👥 СОВЕЩАНИЕ</button>
        <button id="ofPause" class="jv-badge border-jv-line text-jv-mute bg-transparent cursor-pointer">⏸</button>${[1, 2, 4].map(x => `<button data-osp="${x}" class="jv-badge bg-transparent cursor-pointer ${x === 2 ? 'border-jv-cyan text-jv-cyan' : 'border-jv-line text-jv-mute'}">×${x}</button>`).join('')}</div>
        <div class="overflow-x-auto"><svg id="ofSvg" viewBox="0 0 1000 560" class="block w-full min-w-[760px]" style="background:radial-gradient(ellipse at 50% 50%,rgba(0,90,130,.22),rgba(2,8,14,.96) 75%)"></svg></div></div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" id="ofKan"></div>
    </div>
    <div class="flex flex-col gap-3">
      <div class="jv-tile !border-jv-gold/60"><div class="jv-label !text-jv-gold mb-2">✋ Ждёт вашего решения</div><div id="ofAppr" class="space-y-2"><div class="jv-sub">пока ничего</div></div></div>
      <div class="jv-tile"><div class="jv-label mb-2">Профиль</div><div id="ofProf" class="text-[13px]"><span class="jv-sub">кликните агента или человека</span></div></div>
      <div class="jv-tile flex-1"><div class="jv-label mb-2">Лента офиса</div><div id="ofLog" class="font-mono text-[11px] space-y-1 max-h-[300px] overflow-y-auto"></div></div>
    </div></div>`, 'road');

const ROOMS = { meet: [30, 30, 280, 220, 'Переговорная', '#b48cff'], mail: [340, 30, 150, 140, 'Почта', '#b48cff'], server: [510, 30, 150, 140, 'Серверная', '#ffb547'], open: [340, 200, 320, 300, 'Опенспейс агентов', '#00d4ff'], lab: [30, 280, 280, 250, 'Лаборатория', '#3dffa8'], tony: [700, 30, 270, 160, 'Кабинет Тони', '#ff7a8a'], pepper: [700, 210, 270, 150, 'Кабинет Пеппер', '#ff7a8a'], garage: [700, 380, 270, 150, 'Гараж · вход', '#7aa2ff'] };
const ctr = r => { const [x, y, w, h] = ROOMS[r]; return [x + w / 2, y + h / 2 + 10] };
const P = [
  ['jarvis', 'Джарвис', 'agent', 'координатор: принимает задачи, раздаёт агентам', '🤖', '#00d4ff', [500, 345], ['все агенты', 'память', 'календарь']],
  ['friday', 'Пятница', 'agent', 'почта и календарь', '📬', '#b48cff', [410, 270], ['email.draft', 'email.send ✋', 'calendar']],
  ['research', 'Исследователь', 'agent', 'веб-поиск и чтение', '🔎', '#3dffa8', [590, 270], ['web_search', 'web_fetch', 'brain.save']],
  ['coder', 'Кодер', 'agent', 'код, сервера, логи', '💻', '#ffb547', [410, 430], ['bash', 'git', 'ssh ✋']],
  ['analyst', 'Аналитик', 'agent', 'таблицы, графики, отчёты', '📊', '#5ff3ff', [590, 430], ['python', 'charts', 'notion']],
  ['guard', 'Охрана', 'agent', 'камеры и замки', '🛡', '#ff4d5e', [500, 470], ['cameras', 'lock.open ✋']],
  ['tony', 'Тони', 'human', 'владелец, подписывает рискованное', '🧔', '#ff7a8a', [835, 115], []],
  ['pepper', 'Пеппер', 'human', 'CEO, бюджеты и встречи', '👩', '#ff7a8a', [835, 290], []],
  ['happy', 'Хэппи', 'human', 'логистика и охрана', '🧑‍✈️', '#7aa2ff', [835, 460], []],
].map(([id, n, kind, role, e, c, home, tools]) => ({ id, n, kind, role, e, c, home, tools, x: home[0], y: home[1], tx: home[0], ty: home[1], say: null, sayT: 0, work: 0, busy: false, task: '—', done: 0, tok: 0 }));
const E = id => P.find(p => p.id === id);
let speed = 2, paused = false, cards = [], appr = [], links = [];
const wait = async ms => { let t = 0; while (t < ms) { await sleep(60); if (!paused) t += 60 * speed } };
const go = (id, to, dx = 0, dy = 0) => new Promise(res => { const p = E(id), [x, y] = typeof to === 'string' ? (ROOMS[to] ? ctr(to) : E(to) ? [E(to).x - 34, E(to).y + 4] : p.home) : to; p.tx = x + dx; p.ty = y + dy; p._arr = res });
const home = id => go(id, E(id).home);
const say = (id, t, ms = 2600) => { const p = E(id); p.say = t; p.sayT = performance.now() + ms / speed; logL(`${p.e} ${p.n}: ${t}`, p.c) };
const link = (a, b) => links.push({ a, b, t: performance.now() });
function logL(t, c = '#9fc3d4') { const d = document.createElement('div'); d.innerHTML = `<span style="color:#4f7184">${new Date().toLocaleTimeString('ru-RU')}</span> <span style="color:${c}">${esc(t)}</span>`; $('#ofLog').append(d); while ($('#ofLog').children.length > 80) $('#ofLog').firstChild.remove(); $('#ofLog').scrollTop = 1e9 }
const COLS = [['in', '📥 Входящие'], ['work', '⚙️ В работе'], ['human', '✋ Ждёт человека'], ['done', '✅ Готово']];
function card(title, who) { const c = { id: Math.random().toString(36).slice(2), title, who, col: 'in' }; cards.push(c); kan(); return c }
const move = (c, col, who) => { c.col = col; if (who) c.who = who; kan() };
function kan() { $('#ofKan').innerHTML = COLS.map(([k, n]) => `<div class="jv-tile !p-3"><div class="jv-label mb-2">${n} · ${cards.filter(c => c.col === k).length}</div><div class="space-y-1.5">${cards.filter(c => c.col === k).slice(-6).map(c => { const p = E(c.who); return `<div class="tile-in rounded-md px-2 py-1.5 text-[12px] bg-white/5 border-0 border-l-[3px] border-solid flex items-center gap-2" style="border-color:${p?.c || '#6c93a8'}"><span>${p?.e || '•'}</span><span class="flex-1">${esc(c.title)}</span></div>` }).join('')}</div></div>`).join('') }
function approval(who, text, by = 'tony') {
  return new Promise(res => { const a = { id: Math.random().toString(36).slice(2), who, text, by, res }; appr.push(a); drawAppr(); E(by).say = '✋ жду решения'; E(by).sayT = performance.now() + 9e9;
    a.auto = setTimeout(() => decide(a.id, true, true), 25000 / speed) });
}
function decide(id, ok, auto) { const a = appr.find(x => x.id === id); if (!a) return; clearTimeout(a.auto); appr = appr.filter(x => x !== a); drawAppr(); E(a.by).say = null; say(a.by, ok ? (auto ? 'одобряю (авто, демо)' : 'одобряю ✓') : 'нет, не надо ✗'); a.res(ok) }
function drawAppr() { $('#ofAppr').innerHTML = appr.length ? appr.map(a => { const p = E(a.who); return `<div class="tile-in rounded-lg border border-solid border-jv-gold/50 bg-jv-gold/10 p-2.5 text-[12.5px]"><div>${p.e} <b>${p.n}</b> → ${E(a.by).e} ${E(a.by).n}</div><div class="mt-1">${esc(a.text)}</div><div class="flex gap-1.5 mt-2"><button data-ok="${a.id}" class="jv-badge border-jv-green text-jv-green bg-transparent cursor-pointer">✓ одобрить</button><button data-no="${a.id}" class="jv-badge border-jv-red text-jv-red bg-transparent cursor-pointer">✗ отклонить</button></div></div>` }).join('') : '<div class="jv-sub">пока ничего</div>';
  $$('#ofAppr [data-ok]').forEach(b => b.onclick = () => decide(b.dataset.ok, true)); $$('#ofAppr [data-no]').forEach(b => b.onclick = () => decide(b.dataset.no, false)) }
const lock = async (...ids) => { while (ids.some(i => E(i).busy)) await wait(400); ids.forEach(i => E(i).busy = true) };
const free = (...ids) => ids.forEach(i => { E(i).busy = false; E(i).work = 0; E(i).task = '—' });
const working = (id, task, ms) => { const p = E(id); p.task = task; p.work = 1; return wait(ms).then(() => { p.work = 0; if (p.kind === 'agent') p.tok += 2000 + Math.random() * 6000 | 0 }) };

/* ---------- сценарии ---------- */
const S = {
  async mail(title = 'Ответ инвестору по Q3') {
    const c = card(title, 'jarvis'); say('jarvis', `Пятница, возьми: «${title}»`); link('jarvis', 'friday'); await lock('friday'); move(c, 'work', 'friday');
    await go('friday', 'mail'); say('friday', 'пишу черновик…'); await working('friday', title, 4500); say('friday', 'черновик готов, нужна подпись');
    await go('friday', 'tony'); move(c, 'human'); link('friday', 'tony'); const ok = await approval('friday', `Отправить письмо «${title}»?`);
    if (ok) { await go('friday', 'mail'); say('friday', 'отправлено ✓'); move(c, 'done') } else { say('friday', 'понял, оставлю черновиком'); c.title += ' (отменено)'; move(c, 'done') }
    E('friday').done++; await home('friday'); free('friday');
  },
  async research(title = 'Рынок умных колонок') {
    const c = card(title, 'jarvis'); say('jarvis', `Исследователь, Аналитик — «${title}»`); link('jarvis', 'research'); await lock('research', 'analyst'); move(c, 'work', 'research');
    await go('research', 'lab', -40); say('research', 'web_search × 6 … читаю 9 источников'); await working('research', title, 5000);
    await go('analyst', 'lab', 40); link('research', 'analyst'); say('research', 'передаю конспекты'); say('analyst', 'свожу в таблицу 12×7'); move(c, 'work', 'analyst'); await working('analyst', title, 4000);
    await go('analyst', 'pepper'); link('analyst', 'pepper'); say('analyst', 'Пеппер, отчёт готов — 2 страницы'); await wait(1600); say('pepper', 'спасибо, гляну вечером'); move(c, 'done');
    E('research').done++; E('analyst').done++; await Promise.all([home('research'), home('analyst')]); free('research', 'analyst');
  },
  async bug(title = 'Бэкап NAS падает в 03:10') {
    const c = card(title, 'jarvis'); say('jarvis', 'Кодер, посмотри бэкап'); link('jarvis', 'coder'); await lock('coder', 'happy'); move(c, 'work', 'coder');
    await go('coder', 'server'); say('coder', 'tail -f logs … нашёл: Ollama съедает память'); await working('coder', title, 4500);
    say('coder', 'нужна ручная перезагрузка NAS'); move(c, 'human', 'happy'); await go('happy', 'server', 30); link('coder', 'happy'); say('happy', 'перезагружаю, секунду'); await wait(2500); say('coder', 'бэкап проходит ✓'); move(c, 'done');
    E('coder').done++; await Promise.all([home('coder'), home('happy')]); free('coder', 'happy');
  },
  async door() {
    const c = card('Курьер у двери', 'guard'); await lock('guard', 'happy'); move(c, 'work'); say('guard', '📹 у двери курьер, посылка «ReSpeaker»'); await go('guard', 'garage', -60);
    move(c, 'human'); link('guard', 'tony'); const ok = await approval('guard', 'Открыть дверь курьеру?');
    if (ok) { await go('happy', 'garage', 40); say('happy', 'забрал посылку'); move(c, 'done') } else { say('guard', 'попросил оставить у двери'); move(c, 'done') }
    E('guard').done++; await Promise.all([home('guard'), home('happy')]); free('guard', 'happy');
  },
  async meeting() {
    const all = P.map(p => p.id); await lock(...all); const c = card('Совещание: Stark Expo', 'pepper'); move(c, 'work'); logL('— все в переговорную —', '#b48cff');
    const [x, y, w, h] = ROOMS.meet; await Promise.all(all.map((id, i) => { const a = i / all.length * Math.PI * 2; return go(id, [x + w / 2 + Math.cos(a) * 92, y + h / 2 + 12 + Math.sin(a) * 62]) }));
    for (const [id, t] of [['pepper', 'Повестка: бюджет и демо-зона'], ['jarvis', 'Агенты подготовили 3 варианта стенда'], ['analyst', 'Вариант B дешевле на 18%'], ['tony', 'Берём B, но с голограммой'], ['research', 'Найду поставщика проекторов'], ['happy', 'Логистику беру на себя'], ['jarvis', 'Протокол записан во второй мозг ✓']]) { say(id, t, 2400); await wait(2400) }
    move(c, 'done'); await Promise.all(all.map(home)); free(...all);
  },
  async custom(text) {
    const s = text.toLowerCase(), who = /почт|письм|ответ|напиши|календар/.test(s) ? 'friday' : /код|баг|сервер|деплой|скрипт/.test(s) ? 'coder' : /таблиц|отч[её]т|посчит|график|бюджет/.test(s) ? 'analyst' : /камер|двер|охран|замок/.test(s) ? 'guard' : 'research';
    const room = { friday: 'mail', coder: 'server', analyst: 'lab', guard: 'garage', research: 'lab' }[who], risky = /отправ|оплат|куп|открой|удали/.test(s);
    const c = card(text, 'jarvis'); say('jarvis', `Принял. ${E(who).n}, это тебе`); link('jarvis', who); await lock(who); move(c, 'work', who);
    await go(who, room); say(who, 'работаю…'); await working(who, text, 4500);
    if (risky) { await go(who, 'tony'); move(c, 'human'); const ok = await approval(who, `«${text}» — это действие нельзя отменить. Выполнить?`); say(who, ok ? 'сделано ✓' : 'отменил') } else { await go(who, 'jarvis'); link(who, 'jarvis'); say(who, 'готово, результат в мозге ✓') }
    move(c, 'done'); E(who).done++; await home(who); free(who);
  },
};
const AUTO = ['mail', 'research', 'bug', 'door'];
let running = 0, started = false;
async function runS(name, ...a) { running++; try { await S[name](...a) } finally { running-- } }

/* ---------- отрисовка ---------- */
function floor() { let h = `<defs><pattern id="ofGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(0,212,255,.06)"/></pattern></defs><rect width="1000" height="560" fill="url(#ofGrid)"/>`;
  Object.values(ROOMS).forEach(([x, y, w, h2, n, c]) => { h += `<rect x="${x}" y="${y}" width="${w}" height="${h2}" rx="10" fill="${c}0d" stroke="${c}" stroke-opacity=".45" stroke-width="1.5"/><text x="${x + 12}" y="${y + 20}" font-size="11" fill="${c}" font-family="Orbitron" letter-spacing="2">${n.toUpperCase()}</text>` });
  [[410, 270], [590, 270], [410, 430], [590, 430], [500, 470], [500, 345]].forEach(([x, y]) => h += `<rect x="${x - 26}" y="${y + 14}" width="52" height="14" rx="3" fill="rgba(0,212,255,.08)" stroke="rgba(0,212,255,.3)"/>`);
  h += `<ellipse cx="170" cy="152" rx="70" ry="38" fill="rgba(180,140,255,.07)" stroke="rgba(180,140,255,.35)"/>`;
  return h + '<g id="ofLinks"></g><g id="ofPpl"></g>' }
function frame() {
  const now = performance.now(), dt = 1 / 60;
  P.forEach(p => { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), v = (p.kind === 'agent' ? 150 : 110) * speed * dt * (paused ? 0 : 1); if (d > 1) { p.x += dx / d * Math.min(v, d); p.y += dy / d * Math.min(v, d); p.walk = true } else { p.walk = false; if (p._arr) { const r = p._arr; p._arr = null; r() } } if (p.say && now > p.sayT) p.say = null });
  links = links.filter(l => now - l.t < 1500); $('#ofLinks').innerHTML = links.map(l => { const a = E(l.a), b = E(l.b), k = 1 - (now - l.t) / 1500; return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${a.c}" stroke-width="2" stroke-dasharray="6 5" stroke-dashoffset="${-now / 30}" opacity="${k}"/>` }).join('');
  $('#ofPpl').innerHTML = P.map(p => { const bob = p.walk ? Math.sin(now / 90) * 2 : 0, ag = p.kind === 'agent', sb = p.say ? `<g transform="translate(0 -36)"><rect x="${-Math.min(150, p.say.length * 3.4 + 14)}" y="-15" width="${Math.min(300, p.say.length * 6.8 + 28)}" height="21" rx="8" fill="rgba(2,14,22,.94)" stroke="${p.c}"/><text y="0" text-anchor="middle" font-size="10.5" fill="#e6f8ff">${esc(p.say.length > 42 ? p.say.slice(0, 41) + '…' : p.say)}</text></g>` : '';
    return `<g transform="translate(${p.x.toFixed(1)} ${(p.y + bob).toFixed(1)})" data-p="${p.id}" style="cursor:pointer">${p.work ? `<circle r="22" fill="none" stroke="${p.c}" stroke-width="2" stroke-dasharray="20 40" transform="rotate(${now / 4 % 360})"/>` : ''}<circle r="16" fill="${ag ? '#03111a' : p.c + '33'}" stroke="${p.c}" stroke-width="2" ${ag ? `style="filter:drop-shadow(0 0 6px ${p.c})"` : ''}/>${ag ? '' : `<circle r="19" fill="none" stroke="${p.c}" stroke-opacity=".4"/>`}<text y="6" text-anchor="middle" font-size="16">${p.e}</text><text y="31" text-anchor="middle" font-size="10" fill="${p.c}" paint-order="stroke" stroke="#02080d" stroke-width="3">${p.n}</text>${sb}</g>` }).join('');
  if (selP && (++fc % 20 === 0)) prof(selP, true);
}
let selP = null, fc = 0;
function prof(id, quiet) { selP = id; const p = E(id); $('#ofProf').innerHTML = `<div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full grid place-items-center text-2xl" style="border:2px solid ${p.c};background:${p.c}22">${p.e}</div><div><div class="font-semibold text-white">${p.n}</div><div class="jv-sub">${p.kind === 'agent' ? 'ИИ-агент' : 'человек'} · ${p.role}</div></div></div>
  <div class="mt-3">Сейчас: <b class="${p.work ? 'text-jv-gold' : 'text-jv-mute'}">${esc(p.busy ? (p.task === '—' ? 'в пути' : p.task) : 'свободен')}</b></div><div class="jv-sub mt-1">задач сегодня: ${p.done}${p.kind === 'agent' ? ` · токенов: ${p.tok.toLocaleString('ru-RU')} · ≈ $${(p.tok / 1e6 * 8).toFixed(3)}` : ''}</div>${p.tools.length ? `<div class="flex flex-wrap gap-1 mt-2">${p.tools.map(t => `<span class="jv-badge border-jv-line text-jv-mute">${t}</span>`).join('')}</div>` : ''}` }
function start() {
  if (started) return; started = true; $('#ofSvg').innerHTML = floor(); kan(); $('#ofSvg').addEventListener('pointerdown', e => { const g = e.target.closest('[data-p]'); if (g) prof(g.dataset.p) }); logL('офис открыт · 6 агентов, 3 человека', '#3dffa8');
  (function loop() { requestAnimationFrame(loop); if (sec.classList.contains('on')) frame() })();
  runS('mail'); setTimeout(() => runS('research'), 1500);
  setInterval(() => { if (!sec.classList.contains('on') || paused || running >= 3) return; runS(AUTO[Math.random() * AUTO.length | 0]) }, 6000);
}
$('#ofAdd').onclick = () => { const v = $('#ofIn').value.trim(); if (!v) return; $('#ofIn').value = ''; runS('custom', v) }; $('#ofIn').onkeydown = e => { if (e.key === 'Enter') $('#ofAdd').click() };
$('#ofMeet').onclick = () => runS('meeting');
$('#ofPause').onclick = () => { paused = !paused; $('#ofPause').textContent = paused ? '▶' : '⏸' };
$$('[data-osp]').forEach(b => b.onclick = () => { speed = +b.dataset.osp; $$('[data-osp]').forEach(x => { const on = x === b; x.classList.toggle('border-jv-cyan', on); x.classList.toggle('text-jv-cyan', on); x.classList.toggle('border-jv-line', !on); x.classList.toggle('text-jv-mute', !on) }) });
{ const prev = window.onTab; window.onTab = t => { prev?.(t); if (t === 'office') start() } }
SKILLS.unshift({ re: /(офис|агентам|команд[аеу] агентов|поручи)/i, run: t => { goTab('office'); setTimeout(() => { start(); if (/поручи/i.test(t)) runS('custom', t.replace(/.*поручи\S*\s*/i, '') || t) }, 400); return 'Открываю офис агентов, сэр.' } });
})();
