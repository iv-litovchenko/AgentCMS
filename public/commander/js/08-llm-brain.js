/* =====================================================================
   НАСТОЯЩИЙ МОЗГ — Claude через официальный SDK (@anthropic-ai/sdk) прямо из браузера.
   Ключ вводит пользователь; хранится только в его браузере (по желанию).
   ===================================================================== */
const BRAIN = { mode: 'demo', key: '', model: 'claude-opus-5-5', effort: 'low', remember: false };
try { Object.assign(BRAIN, JSON.parse(localStorage.getItem('jv_brain') || '{}')) } catch (e) { }
const saveBrain = () => { try { localStorage.setItem('jv_brain', JSON.stringify({ ...BRAIN, key: BRAIN.remember ? BRAIN.key : '' })) } catch (e) { } };
const MODELS = { 'claude-opus-5-5': 'Claude Opus 5.5', 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'claude-haiku-5-5': 'Claude Haiku 5.5' };
window.DEVLOG = [];
let sdkP = null;
const getSDK = () => sdkP ||= import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.110.0/+esm').then(m => m.default || m.Anthropic);
let LMSG = [];
try { LMSG = JSON.parse(localStorage.getItem('jv_llm_msgs') || '[]') } catch (e) { }
const saveL = () => { try { localStorage.setItem('jv_llm_msgs', JSON.stringify(LMSG.slice(-40))) } catch (e) { } };

const JV_SYSTEM = `Ты — Джарвис, голосовой ассистент в стиле британского дворецкого из «Железного человека». Отвечай по-русски, коротко (1–3 предложения): ответ озвучивается голосом. Обращайся «сэр», допускай лёгкую сухую иронию.
Ты управляешь демонстрационным HUD-интерфейсом через инструменты: умный дом, музыка, календарь, память, погода (демо-данные), второй мозг (заметки), дашборды и экран.
Когда ответ лучше показать, чем сказать (схема, таблица, сравнение, график, план) — вызови render_ui, а голосом скажи только суть.
Если просят сделать плитку/виджет — add_tile. Перед действиями, которые нельзя отменить, переспроси.`;

const LLM_TOOLS = [
  { name: 'set_device', description: 'Включить или выключить устройство умного дома в HUD.', input_schema: { type: 'object', properties: { device: { type: 'string', enum: ['light', 'ac', 'lock', 'blinds', 'coffee'], description: 'light — свет в гостиной, ac — кондиционер, lock — входная дверь (on=закрыта), blinds — шторы, coffee — кофемашина' }, on: { type: 'boolean' } }, required: ['device', 'on'] } },
  { name: 'music', description: 'Включить или поставить на паузу музыку.', input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['play', 'pause'] }, track: { type: 'string', description: 'название трека (необязательно)' } }, required: ['action'] } },
  { name: 'get_weather', description: 'Погода (демо-данные).', input_schema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } },
  { name: 'get_calendar', description: 'События пользователя на сегодня.', input_schema: { type: 'object', properties: {} } },
  { name: 'add_event', description: 'Добавить событие в календарь на сегодня.', input_schema: { type: 'object', properties: { time: { type: 'string', description: 'ЧЧ:ММ' }, title: { type: 'string' } }, required: ['time', 'title'] } },
  { name: 'remember', description: 'Сохранить факт о пользователе в долговременную память.', input_schema: { type: 'object', properties: { fact: { type: 'string' } }, required: ['fact'] } },
  { name: 'search_brain', description: 'Поиск по «второму мозгу» — заметкам пользователя (проекты, люди, идеи, статьи).', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'render_ui', description: 'Показать в чате визуальный блок. type=mermaid — диаграмма (поле mermaid с кодом Mermaid), table — таблица (columns, rows), chart — график (labels, values, chart_kind), note — заметка (text).', input_schema: { type: 'object', properties: { type: { type: 'string', enum: ['mermaid', 'table', 'chart', 'note'] }, title: { type: 'string' }, mermaid: { type: 'string' }, columns: { type: 'array', items: { type: 'string' } }, rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } }, labels: { type: 'array', items: { type: 'string' } }, values: { type: 'array', items: { type: 'number' } }, chart_kind: { type: 'string', enum: ['line', 'bar', 'doughnut'] }, text: { type: 'string' } }, required: ['type', 'title'] } },
  { name: 'add_tile', description: 'Добавить плитку в дашборд «🤖 Агент».', input_schema: { type: 'object', properties: { widget: { type: 'string', enum: ['stat', 'note', 'list', 'ring'] }, label: { type: 'string' }, value: { type: 'string', description: 'для stat: главная цифра; для ring: число 0–100' }, text: { type: 'string', description: 'для note и подпись для stat/ring' }, items: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'для list: [[слева, справа], …]' } }, required: ['widget', 'label'] } },
  { name: 'open_tab', description: 'Открыть вкладку интерфейса.', input_schema: { type: 'object', properties: { tab: { type: 'string', enum: ['hud', 'brain', 'lab', 'dash', 'gest', 'build', 'gal', 'data', 'how', 'feat', 'stack'] } }, required: ['tab'] } },
];
async function runTool(name, a) {
  if (name === 'set_device') { setDev(a.device, !!a.on); return `${a.device}: ${a.on ? 'включено' : 'выключено'}` }
  if (name === 'music') { $('#np').classList.toggle('play', a.action === 'play'); if (a.track) $('#track').textContent = a.track; return a.action === 'play' ? 'играет ' + $('#track').textContent : 'пауза' }
  if (name === 'get_weather') return JSON.stringify({ city: a.city, temp: '+11°C', sky: 'облачно', rain_from: '16:00', note: 'демо-данные' });
  if (name === 'get_calendar') return [...$$('#cal .ev')].map(e => e.innerText.replace('\n', ' ')).join('; ');
  if (name === 'add_event') { const e = document.createElement('div'); e.className = 'ev'; e.innerHTML = `<time>${esc(a.time)}</time>${esc(a.title)}`; $('#cal').append(e); return 'добавлено' }
  if (name === 'remember') { const li = document.createElement('li'); li.textContent = a.fact; $('#mem').append(li); saveState(); return 'сохранено' }
  if (name === 'search_brain') { const q = (a.query || '').toLowerCase().split(/\s+/).filter(w => w.length > 2).map(w => w.slice(0, 5)); const hits = Object.values(window.__brain?.byId || {}).filter(n => n.type !== 'part' && n.type !== 'area' && q.some(w => (n.title + ' ' + n.content + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(w))).slice(0, 5); return hits.length ? hits.map(n => `«${n.title}»: ${n.content.replace(/\[\[(\w+)\]\]/g, (m, i) => window.__brain.byId[i]?.title || i)}`).join('\n') : 'ничего не найдено' }
  if (name === 'render_ui') {
    const b = { icon: { mermaid: '🔀', table: '📊', chart: '📈', note: '📝' }[a.type], title: a.title, type: a.type, tools: [['render_ui', a.type]] };
    if (a.type === 'mermaid') b.data = { code: a.mermaid || 'flowchart LR\n A-->B' };
    if (a.type === 'table') b.data = { columns: a.columns || [], rows: a.rows || [], best: -1 };
    if (a.type === 'chart') { const k = a.chart_kind || 'bar', pal = ['#00d4ff', '#3dffa8', '#b48cff', '#ffb547', '#ff4d5e', '#5ff3ff']; b.data = { chart: { type: k, data: { labels: a.labels || [], datasets: [{ label: a.title, data: a.values || [], borderColor: '#00d4ff', backgroundColor: k === 'doughnut' ? pal : 'rgba(0,212,255,.35)', fill: k === 'line', tension: .35, borderRadius: 4 }] }, options: { plugins: { legend: { display: k === 'doughnut' } } } } } }
    if (a.type === 'note') b.data = { text: a.text || '' };
    $('#chat').append(renderCard(b)); $('#chat').scrollTop = 1e9; return 'показано на экране';
  }
  if (name === 'add_tile') { const t = { w: a.widget, size: a.widget === 'note' || a.widget === 'list' ? 2 : 1, label: a.label }; if (a.widget === 'stat') Object.assign(t, { value: a.value || '—', sub: a.text }); if (a.widget === 'note') t.text = esc(a.text || ''); if (a.widget === 'list') t.items = a.items || []; if (a.widget === 'ring') Object.assign(t, { value: Math.max(0, Math.min(100, parseFloat(a.value) || 0)), text: a.text || '', color: '#3dffa8' }); DASHES.agent.tiles.push(t); saveAgent(); return 'плитка добавлена в дашборд «Агент»' }
  if (name === 'open_tab') { setTimeout(() => goTab(a.tab), 600); return 'открываю' }
  throw new Error('неизвестный инструмент ' + name);
}
R.note = (el, d) => { el.innerHTML = `<div class="text-[14px] leading-relaxed whitespace-pre-wrap">${esc(d.text)}</div>` };

async function llmHandle(text) {
  const A = await getSDK();
  const client = new A({ apiKey: BRAIN.key, dangerouslyAllowBrowser: true });
  const facts = [...$$('#mem li')].map(l => l.textContent).join('; ');
  LMSG.push({ role: 'user', content: `${text}\n\n[контекст HUD: ${new Date().toLocaleString('ru-RU')}; память о пользователе: ${facts}]` });
  const fallback = BRAIN.model !== 'claude-haiku-5-5' ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {};
  for (let i = 0; i < 8; i++) {
    const t0 = performance.now();
    const r = await client.beta.messages.create({ model: BRAIN.model, max_tokens: 16000, system: JV_SYSTEM, tools: LLM_TOOLS, messages: LMSG, thinking: { type: 'adaptive', display: 'summarized' }, output_config: { effort: BRAIN.effort }, ...fallback });
    DEVLOG.push({ t: new Date(), model: r.model, inp: r.usage?.input_tokens || 0, out: r.usage?.output_tokens || 0, ms: Math.round(performance.now() - t0), stop: r.stop_reason, req: { model: BRAIN.model, effort: BRAIN.effort, last: LMSG.at(-1) }, res: r.content });
    log(`llm ${r.model} · ${r.usage?.input_tokens}→${r.usage?.output_tokens} tok · ${r.stop_reason}`, 'c');
    LMSG.push({ role: 'assistant', content: r.content });
    if (r.stop_reason === 'refusal') { saveL(); return 'Боюсь, с этим я помочь не могу, сэр.' }
    if (r.stop_reason === 'pause_turn') continue;
    const uses = r.content.filter(b => b.type === 'tool_use');
    if (!uses.length || r.stop_reason !== 'tool_use') { saveL(); return r.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim() || 'Готово, сэр.' }
    const results = [];
    for (const u of uses) {
      addTool(u.name, JSON.stringify(u.input).slice(1, -1).slice(0, 90));
      try { results.push({ type: 'tool_result', tool_use_id: u.id, content: String(await runTool(u.name, u.input)) }) }
      catch (e) { results.push({ type: 'tool_result', tool_use_id: u.id, content: String(e.message || e), is_error: true }) }
      await sleep(150);
    }
    LMSG.push({ role: 'user', content: results });
  }
  saveL(); return 'Задача оказалась длиннее, чем я рассчитывал, сэр. Остановился после восьми шагов.';
}
async function llmError(e) {
  const A = await getSDK().catch(() => null);
  if (A && e instanceof A.AuthenticationError) return 'Ключ API не подошёл, сэр. Проверьте его в настройках мозга.';
  if (A && e instanceof A.RateLimitError) return 'Слишком много запросов — облако просит подождать минуту.';
  if (A && e instanceof A.APIConnectionError) return 'Нет связи с облаком. Переключаюсь в демо-режим.';
  if (A && e instanceof A.APIError) return 'Облако ответило ошибкой ' + (e.status || '') + '. Подробности в журнале.';
  return 'Не удалось загрузить мозг: ' + (e.message || e);
}

/* перехватываем handle(): в режиме «настоящий мозг» запросы идут в Claude */
const _handleDemo = handle;
handle = async function (text) {
  if (BRAIN.mode !== 'real' || !BRAIN.key) return _handleDemo(text);
  text = (text || '').trim(); if (!text || busy) return; busy = true; speechSynthesis?.cancel();
  addMsg('u', '').textContent = text; $('#inp').value = ''; window.HIST?.push({ role: 'user', content: text });
  const t = performance.now(); setState('thinking'); log(`stt → "${text}"`, 'c');
  let ans;
  try { ans = await llmHandle(text) } catch (e) { ans = await llmError(e); log('llm error: ' + (e.status || '') + ' ' + (e.message || ''), 'w'); if (LMSG.at(-1)?.role === 'user') LMSG.pop() }
  $('#latency').textContent = `латентность: ${Math.round(performance.now() - t)} мс · ${MODELS[BRAIN.model]}`;
  window.HIST?.push({ role: 'assistant', content: ans }); window.renderHist?.();
  await jReply(ans); busy = false; saveState();
};

/* ---------- окно настроек мозга ---------- */
function brainPill() { const p = $('#netpill'); const real = BRAIN.mode === 'real' && BRAIN.key; p.textContent = real ? '● ' + MODELS[BRAIN.model].toUpperCase() : '● ДЕМО-МОЗГ · нажми'; p.classList.toggle('off', !real); p.style.cursor = 'pointer'; p.title = 'Настройки мозга' }
function openBrainSettings() {
  let m = $('#brainModal'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'brainModal'; m.className = 'fixed inset-0 z-[180] bg-black/70 backdrop-blur-sm grid place-items-center p-4';
  m.innerHTML = `<div class="jv-tile !bg-[#04131c] max-w-lg w-full !p-5 tile-in">
    <div class="flex items-center gap-3"><span class="text-3xl">🧠</span><div><div class="font-hud text-jv-cyan tracking-widest">МОЗГ ДЖАРВИСА</div><div class="jv-sub">демо-ответы или настоящая модель Claude</div></div><button id="bm-x" class="ml-auto bg-transparent border-0 text-jv-mute text-2xl cursor-pointer">×</button></div>
    <div class="grid grid-cols-2 gap-2 mt-4">${[['demo', '🎭 Демо', 'заготовленные ответы, бесплатно, офлайн'], ['real', '⚡ Настоящий', 'Claude API: понимает что угодно, сам вызывает инструменты']].map(([k, n, d]) => `<button data-bm="${k}" class="text-left rounded-xl border border-solid p-3 cursor-pointer bg-transparent text-jv-text ${BRAIN.mode === k ? 'border-jv-cyan bg-jv-cyan/10' : 'border-jv-line'}"><div class="font-semibold">${n}</div><div class="jv-sub !text-[10px] mt-1">${d}</div></button>`).join('')}</div>
    <div id="bm-real" class="${BRAIN.mode === 'real' ? '' : 'opacity-40 pointer-events-none'} mt-4 space-y-3">
      <label class="block"><span class="jv-label">API-ключ Anthropic</span><input id="bm-key" type="password" autocomplete="off" value="${esc(BRAIN.key)}" placeholder="sk-ant-…" class="mt-1 w-full bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-3 py-2 font-mono text-[12.5px] outline-none focus:border-jv-cyan"></label>
      <label class="flex items-center gap-2 jv-sub cursor-pointer"><input id="bm-rem" type="checkbox" ${BRAIN.remember ? 'checked' : ''} class="accent-[#00d4ff]"> запомнить ключ в этом браузере</label>
      <div class="grid grid-cols-2 gap-3"><label class="block"><span class="jv-label">Модель</span><select id="bm-model" class="mt-1 w-full bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-2 py-2 text-[13px]">${Object.entries(MODELS).map(([k, n]) => `<option value="${k}" ${k === BRAIN.model ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="block"><span class="jv-label">Усилие (effort)</span><select id="bm-eff" class="mt-1 w-full bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-2 py-2 text-[13px]">${['low', 'medium', 'high'].map(k => `<option value="${k}" ${k === BRAIN.effort ? 'selected' : ''}>${{ low: 'low — быстро, для голоса', medium: 'medium', high: 'high — умнее, медленнее' }[k]}</option>`).join('')}</select></label></div>
      <div class="rounded-lg border border-solid border-jv-gold/50 bg-jv-gold/10 p-2.5 text-[12px] leading-relaxed">⚠️ Ключ уходит напрямую из браузера в API Anthropic. Это нормально для личного локального макета, но <b>не публикуйте страницу с ключом</b>. В настоящем продукте запросы идут через ваш сервер.</div>
      <div id="bm-test-r" class="jv-sub min-h-[18px]"></div></div>
    <div class="flex flex-wrap gap-2 mt-4"><button id="bm-save" class="jv-btn">💾 СОХРАНИТЬ</button><button id="bm-test" class="jv-btn !border-jv-green !text-jv-green !bg-jv-green/10">⚡ ПРОВЕРИТЬ</button><button id="bm-reset" class="jv-btn !border-jv-red !text-jv-red !bg-transparent ml-auto">🗑 СБРОСИТЬ ВСЁ</button></div></div>`;
  document.body.append(m);
  let mode = BRAIN.mode;
  m.onclick = e => { if (e.target === m) m.remove() }; $('#bm-x').onclick = () => m.remove();
  $$('[data-bm]').forEach(b => b.onclick = () => { mode = b.dataset.bm; $$('[data-bm]').forEach(x => { const on = x === b; x.classList.toggle('border-jv-cyan', on); x.classList.toggle('bg-jv-cyan/10', on); x.classList.toggle('border-jv-line', !on) }); $('#bm-real').classList.toggle('opacity-40', mode !== 'real'); $('#bm-real').classList.toggle('pointer-events-none', mode !== 'real') });
  const apply = () => { Object.assign(BRAIN, { mode, key: $('#bm-key').value.trim(), remember: $('#bm-rem').checked, model: $('#bm-model').value, effort: $('#bm-eff').value }); saveBrain(); brainPill() };
  $('#bm-save').onclick = () => { apply(); m.remove(); toast(BRAIN.mode === 'real' && BRAIN.key ? '⚡ Подключён ' + MODELS[BRAIN.model] : '🎭 Демо-мозг'); };
  $('#bm-test').onclick = async () => {
    apply(); const r = $('#bm-test-r'); if (!BRAIN.key) { r.textContent = 'введите ключ'; return } r.textContent = '⏳ отправляю тестовый запрос…';
    try { const A = await getSDK(); const c = new A({ apiKey: BRAIN.key, dangerouslyAllowBrowser: true }); const t0 = performance.now(); const x = await c.messages.create({ model: BRAIN.model, max_tokens: 1024, output_config: { effort: 'low' }, messages: [{ role: 'user', content: 'Скажи «Системы в норме, сэр» и больше ничего.' }] }); r.innerHTML = `<span class="text-jv-green">✓ ${esc(x.content.filter(b => b.type === 'text').map(b => b.text).join(' '))}</span> · ${Math.round(performance.now() - t0)} мс` }
    catch (e) { r.innerHTML = `<span class="text-jv-red">✗ ${esc(await llmError(e))}</span>` }
  };
  $('#bm-reset').onclick = () => { if ($('#bm-reset').dataset.sure !== '1') { $('#bm-reset').dataset.sure = '1'; $('#bm-reset').textContent = 'ТОЧНО? ЕЩЁ РАЗ'; return } try { Object.keys(localStorage).filter(k => k.startsWith('jv_')).forEach(k => localStorage.removeItem(k)) } catch (e) { } location.reload() };
}
$('#netpill').onclick = openBrainSettings; brainPill();

/* =====================================================================
   СОХРАНЕНИЕ: чат, память, устройства, голос — переживают перезагрузку
   ===================================================================== */
function saveState() {
  try {
    const chat = [...$$('#chat .msg')].slice(-30).map(m => [m.classList.contains('u') ? 'u' : 'j', m.querySelector('span')?.textContent || '']);
    localStorage.setItem('jv_state', JSON.stringify({ chat, mem: [...$$('#mem li')].map(l => l.textContent), dev: Object.fromEntries($$('.sw[data-dev]').map(s => [s.dataset.dev, s.classList.contains('on')])), cal: [...$$('#cal .ev')].map(e => [e.querySelector('time')?.textContent, e.lastChild?.textContent]), voice: voiceOn, at: Date.now() }));
  } catch (e) { }
}
(function restore() {
  let s; try { s = JSON.parse(localStorage.getItem('jv_state') || 'null') } catch (e) { } if (!s) return;
  if (s.mem?.length) $('#mem').innerHTML = s.mem.map(m => `<li>${esc(m)}</li>`).join('');
  if (s.cal?.length) $('#cal').innerHTML = s.cal.map(([t, x]) => `<div class="ev"><time>${esc(t || '')}</time>${esc(x || '')}</div>`).join('');
  Object.entries(s.dev || {}).forEach(([k, v]) => setDev(k, v));
  if (typeof s.voice === 'boolean') voiceOn = s.voice;
  if (s.chat?.length) { s.chat.forEach(([w, t]) => { const sp = addMsg(w, ''); sp.textContent = t; sp.closest('.msg').style.opacity = .55 }); const d = document.createElement('div'); d.className = 'text-center font-mono text-[10px] text-jv-mute'; d.textContent = `— сохранённая история · ${new Date(s.at).toLocaleString('ru-RU')} —`; $('#chat').append(d) }
})();
setInterval(saveState, 5000); addEventListener('beforeunload', saveState);
$$('.sw[data-dev]').forEach(s => s.addEventListener('click', () => setTimeout(saveState, 50)));
