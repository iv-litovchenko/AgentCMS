/* =====================================================================
   ПОДКЛЮЧЕНИЯ: погода, Home Assistant, Spotify, календарь
   + ПРОАКТИВНОСТЬ (сам заговаривает) + СЛОВО «ДЖАРВИС» без кнопки
   Ключи и токены вводит пользователь; хранятся только в его браузере.
   ===================================================================== */
(() => {
const card = (id, ic, t, sub, body) => `<div class="jv-tile" id="${id}"><div class="flex items-center gap-3 mb-3"><span class="text-2xl">${ic}</span><div><div class="font-semibold text-white">${t}</div><div class="jv-sub">${sub}</div></div><span class="ml-auto jv-badge border-jv-line text-jv-mute" data-st>не подключено</span></div>${body}</div>`;
const inp = (id, ph, type = 'text') => `<input id="${id}" type="${type}" placeholder="${ph}" autocomplete="off" class="w-full bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-3 py-2 font-mono text-[12px] outline-none focus:border-jv-cyan">`;
const sec = JV.addTab('conn', 'Подключения', `
  <div class="max-w-4xl mb-3"><div class="h2">ПОДКЛЮЧЕНИЯ · ПРОАКТИВНОСТЬ · СЛОВО «ДЖАРВИС»</div>
    <p class="m-0 text-[14px] text-jv-text">Здесь макет перестаёт быть демо: <b>настоящая погода</b>, ваш <b>Home Assistant</b>, <b>Spotify</b> и <b>календарь</b>. Когда сервис подключён, Джарвис (и демо-мозг, и Claude) берёт данные оттуда. Ключи и токены вы вводите сами — они хранятся только в этом браузере.</p></div>
  <div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
    ${card('cnW', '🌦', 'Погода · Open-Meteo', 'бесплатно, без ключа', `<div class="flex gap-2">${inp('cnWcity', 'Город, например Москва')}<button id="cnWgo" class="jv-btn shrink-0">ПОДКЛЮЧИТЬ</button><button id="cnWgeo" class="jv-btn shrink-0 !px-2" title="по геолокации">📍</button></div><div id="cnWout" class="mt-3 text-[13px]"></div>`)}
    ${card('cnH', '🏠', 'Home Assistant', 'адрес + долгоживущий токен', `<div class="space-y-2">${inp('cnHurl', 'http://homeassistant.local:8123')}${inp('cnHtok', 'Long-lived access token', 'password')}<div class="flex gap-2"><button id="cnHgo" class="jv-btn">ПОДКЛЮЧИТЬ</button><label class="jv-sub flex items-center gap-1.5"><input type="checkbox" id="cnHrem" class="accent-[#00d4ff]">запомнить</label></div></div><div id="cnHout" class="mt-3 text-[12.5px] max-h-56 overflow-y-auto"></div><div class="jv-sub mt-2">Нужно разрешить этот адрес в HA: <code class="text-jv-gold">http: cors_allowed_origins: - ${location.origin}</code> в configuration.yaml</div>`)}
    ${card('cnS', '🎵', 'Spotify', 'вход через Spotify (PKCE), управление — Premium', `<div class="flex gap-2">${inp('cnSid', 'Client ID из developer.spotify.com')}<button id="cnSgo" class="jv-btn shrink-0">ВОЙТИ</button></div><div class="jv-sub mt-2">В настройках приложения Spotify добавьте Redirect URI: <code class="text-jv-gold">${location.origin + location.pathname}</code></div><div id="cnSout" class="mt-3 text-[13px]"></div>`)}
    ${card('cnC', '📅', 'Календарь', 'файл .ics (Google, Apple, Outlook → экспорт)', `<label class="jv-btn inline-block cursor-pointer">📂 ВЫБРАТЬ .ICS<input id="cnCfile" type="file" accept=".ics,text/calendar" class="hidden"></label><div id="cnCout" class="mt-3 text-[12.5px]"></div><div class="jv-sub mt-2">Прямое подключение Google Календаря требует OAuth через ваш сервер — в браузере без бэкенда безопаснее файл.</div>`)}
    ${card('cnM', '📧', 'Почта и Telegram', 'только через ваш сервер', `<div class="text-[13px] leading-relaxed">Пароль от почты и токен бота <b>нельзя</b> держать в странице. Делают так: маленький сервер (Python/Node) хранит ключи, а Джарвис зовёт его как инструмент или MCP-сервер. В Лаборатории → «Магазин навыков» показано, как это выглядит.</div>`)}
    <div class="jv-tile" id="cnWake"><div class="flex items-center gap-3 mb-3"><span class="text-2xl">👂</span><div><div class="font-semibold text-white">Слово «Джарвис»</div><div class="jv-sub">слушать постоянно, без кнопки</div></div><span class="ml-auto jv-badge border-jv-line text-jv-mute" data-st>выкл</span></div>
      <button id="cnWkgo" class="jv-btn">👂 ВКЛЮЧИТЬ</button><div id="cnWkout" class="mt-3 font-mono text-[11.5px] text-jv-mute min-h-[40px]"></div>
      <div class="jv-sub mt-2 leading-relaxed">Скажите «Джарвис, включи свет» — или просто «Джарвис», пауза, команда. Работает через Web Speech: в Chrome звук распознаётся серверами Google. Полностью локально — openWakeWord или Picovoice Porcupine (у него встроено слово «Jarvis»).</div></div>
  </div>
  <div class="jv-tile mt-3"><div class="flex flex-wrap items-center gap-2 mb-3"><span class="jv-label !mb-0">⏰ Проактивность · Джарвис заговаривает сам</span><button id="cnNot" class="jv-badge border-jv-cyan text-jv-cyan bg-transparent cursor-pointer ml-auto">🔔 разрешить системные уведомления</button></div>
    <div id="cnRules" class="grid grid-cols-1 md:grid-cols-2 gap-2"></div></div>`, 'office');
const setSt = (id, txt, ok) => { const b = $(`#${id} [data-st]`); b.textContent = txt; b.className = `ml-auto jv-badge ${ok ? 'border-jv-green text-jv-green' : 'border-jv-line text-jv-mute'}` };
JV.conn = { weather: null, ha: null, sp: null };

/* ---------- погода ---------- */
const WMO = { 0: ['☀️', 'ясно'], 1: ['🌤', 'малооблачно'], 2: ['⛅', 'переменная облачность'], 3: ['☁️', 'облачно'], 45: ['🌫', 'туман'], 48: ['🌫', 'изморозь'], 51: ['🌦', 'морось'], 53: ['🌦', 'морось'], 55: ['🌧', 'сильная морось'], 61: ['🌧', 'небольшой дождь'], 63: ['🌧', 'дождь'], 65: ['🌧', 'ливень'], 71: ['🌨', 'небольшой снег'], 73: ['🌨', 'снег'], 75: ['❄️', 'сильный снег'], 80: ['🌦', 'ливневый дождь'], 81: ['🌧', 'ливни'], 82: ['⛈', 'сильные ливни'], 95: ['⛈', 'гроза'], 96: ['⛈', 'гроза с градом'], 99: ['⛈', 'гроза с градом'] };
const wm = c => WMO[c] || WMO[Math.floor(c / 10) * 10] || ['🌡', 'погода'];
async function weather(q, lat, lon) {
  $('#cnWout').textContent = '⏳ запрашиваю…';
  try {
    let name = q;
    if (lat == null) { const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=ru`)).json(); if (!g.results?.length) throw new Error('город не найден'); ({ latitude: lat, longitude: lon, name } = g.results[0]) }
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&hourly=precipitation_probability&daily=weather_code,temperature_2m_max&forecast_days=5&timezone=auto&wind_speed_unit=ms`)).json();
    const c = w.current, [e, d] = wm(c.weather_code), hr = new Date().getHours(), rain = (w.hourly?.precipitation_probability || []).slice(hr, hr + 3);
    JV.conn.weather = { name, lat, lon, t: Math.round(c.temperature_2m), e, d, wind: Math.round(c.wind_speed_10m * 10) / 10, hum: c.relative_humidity_2m, rainNext: Math.max(0, ...rain), daily: w.daily };
    JV.store.set('wcity', { name, lat, lon }); applyWeather(); setSt('cnW', '✓ ' + name, true);
  } catch (err) { $('#cnWout').innerHTML = `<span class="text-jv-red">✗ ${esc(err.message)}</span>` }
}
function applyWeather() {
  const W = JV.conn.weather; if (!W) return; const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  $('#cnWout').innerHTML = `<div class="flex items-center gap-3"><span class="text-4xl">${W.e}</span><div><div class="jv-value !text-2xl">${W.t > 0 ? '+' : ''}${W.t}°</div><div class="jv-sub">${W.d} · ветер ${W.wind} м/с · влажн. ${W.hum}% · дождь в ближ. 3 ч: ${W.rainNext}%</div></div></div>`;
  const wx = document.querySelector('#hud .wx'); if (wx) { wx.querySelector('.t').textContent = (W.t > 0 ? '+' : '') + W.t + '°'; wx.querySelector('.t').nextElementSibling.innerHTML = `<div>${W.e} ${W.d[0].toUpperCase() + W.d.slice(1)}</div><div class="d">Ветер ${W.wind} м/с · влажн. ${W.hum}%</div>` }
  const ph = wx?.closest('.panel')?.querySelector('.ph span'); if (ph) ph.textContent = W.name + ' · live';
  const fc = document.querySelector('#hud .fc'); if (fc && W.daily) fc.innerHTML = W.daily.time.map((t, i) => `<div>${days[new Date(t).getDay()]}<b>${W.daily.temperature_2m_max[i] > 0 ? '+' : ''}${Math.round(W.daily.temperature_2m_max[i])}</b>${wm(W.daily.weather_code[i])[0]}</div>`).join('');
}
$('#cnWgo').onclick = () => weather($('#cnWcity').value.trim() || 'Москва');
$('#cnWcity').onkeydown = e => { if (e.key === 'Enter') $('#cnWgo').click() };
$('#cnWgeo').onclick = () => navigator.geolocation?.getCurrentPosition(p => weather('ваше место', p.coords.latitude, p.coords.longitude), () => toast('📍 Геолокация недоступна'));
{ const c = JV.store.get('wcity', null); if (c) { $('#cnWcity').value = c.name; weather(c.name, c.lat, c.lon) } }

/* ---------- Home Assistant ---------- */
const HA = JV.store.get('ha', { url: '', tok: '', map: {} });
async function ha(path, body) { const r = await fetch(HA.url.replace(/\/$/, '') + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + HA.tok, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() }
async function haConnect() {
  HA.url = $('#cnHurl').value.trim(); HA.tok = $('#cnHtok').value.trim(); if (!HA.url || !HA.tok) return toast('Введите адрес и токен'); $('#cnHout').textContent = '⏳ подключаюсь…';
  try {
    const states = await ha('/api/states'), ents = states.filter(s => /^(light|switch|cover|lock|climate|fan)\./.test(s.entity_id));
    JV.conn.ha = ents; if ($('#cnHrem').checked) JV.store.set('ha', HA); setSt('cnH', `✓ ${ents.length} устройств`, true);
    const HUD = [['light', '💡 Свет'], ['coffee', '☕ Кофе'], ['blinds', '🪟 Шторы'], ['lock', '🔒 Дверь'], ['ac', '🌡 Климат']];
    $('#cnHout').innerHTML = `<div class="jv-label mb-1">Связать кнопки HUD с устройствами</div>${HUD.map(([k, n]) => `<div class="flex items-center gap-2 py-1"><span class="w-24">${n}</span><select data-map="${k}" class="jv-sel flex-1"><option value="">—</option>${ents.map(e => `<option value="${e.entity_id}" ${HA.map[k] === e.entity_id ? 'selected' : ''}>${esc(e.attributes.friendly_name || e.entity_id)}</option>`).join('')}</select></div>`).join('')}
      <div class="jv-label mt-3 mb-1">Все устройства</div>${ents.slice(0, 40).map(e => `<div class="jv-row"><span>${esc(e.attributes.friendly_name || e.entity_id)}</span><button data-tg="${e.entity_id}" class="jv-badge bg-transparent cursor-pointer ${e.state === 'on' || e.state === 'open' || e.state === 'unlocked' ? 'border-jv-green text-jv-green' : 'border-jv-line text-jv-mute'}">${e.state}</button></div>`).join('')}`;
    $$('#cnHout [data-map]').forEach(s => s.onchange = () => { HA.map[s.dataset.map] = s.value; if ($('#cnHrem').checked) JV.store.set('ha', HA) });
    $$('#cnHout [data-tg]').forEach(b => b.onclick = async () => { const id = b.dataset.tg; try { await ha(`/api/services/homeassistant/toggle`, { entity_id: id }); toast('🏠 ' + id + ' переключено') } catch (e) { toast('🏠 ' + e.message) } });
  } catch (err) { $('#cnHout').innerHTML = `<span class="text-jv-red">✗ ${esc(err.message)}</span><div class="jv-sub mt-1">Проверьте адрес, токен и cors_allowed_origins.</div>` }
}
$('#cnHgo').onclick = haConnect; if (HA.url) { $('#cnHurl').value = HA.url; $('#cnHtok').value = HA.tok; $('#cnHrem').checked = true; haConnect() }
const haSync = (dev, on) => { const id = HA.map?.[dev]; if (!JV.conn.ha || !id) return; const dom = id.split('.')[0], svc = dom === 'lock' ? (on ? 'lock' : 'unlock') : dom === 'cover' ? (on ? 'open_cover' : 'close_cover') : on ? 'turn_on' : 'turn_off'; ha(`/api/services/${dom}/${svc}`, { entity_id: id }).then(() => log?.(`ha: ${id} → ${svc}`, 'ok')).catch(e => toast('🏠 ' + e.message)) };
const _sd = setDev; setDev = (d, on) => { _sd(d, on); haSync(d, on) };
$$('.sw[data-dev]').forEach(s => s.addEventListener('click', () => haSync(s.dataset.dev, s.classList.contains('on'))));

/* ---------- Spotify (PKCE) ---------- */
const SP = JV.store.get('sp', { id: '', tok: null, ref: null, exp: 0 }), RED = location.origin + location.pathname;
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
$('#cnSid').value = SP.id || '';
$('#cnSgo').onclick = async () => {
  SP.id = $('#cnSid').value.trim(); if (!SP.id) return toast('Введите Client ID'); const v = b64u(crypto.getRandomValues(new Uint8Array(48))); JV.store.set('sp', SP); sessionStorage.setItem('jv_sp_v', v);
  const ch = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
  location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ response_type: 'code', client_id: SP.id, scope: 'user-read-playback-state user-modify-playback-state user-read-currently-playing', code_challenge_method: 'S256', code_challenge: ch, redirect_uri: RED, state: 'jv-sp' });
};
async function spToken(body) { const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: SP.id, ...body }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error_description || j.error); SP.tok = j.access_token; SP.ref = j.refresh_token || SP.ref; SP.exp = Date.now() + j.expires_in * 1000 - 6e4; JV.store.set('sp', SP) }
async function sp(path, method = 'GET') { if (Date.now() > SP.exp && SP.ref) await spToken({ grant_type: 'refresh_token', refresh_token: SP.ref }); const r = await fetch('https://api.spotify.com/v1' + path, { method, headers: { Authorization: 'Bearer ' + SP.tok } }); if (r.status === 204) return null; if (!r.ok) throw new Error('Spotify ' + r.status); return r.json().catch(() => null) }
async function spNow() { try { const n = await sp('/me/player/currently-playing'); if (n?.item) { $('#track').textContent = n.item.name; $('#np .ar').textContent = n.item.artists.map(a => a.name).join(', '); $('#np').classList.toggle('play', n.is_playing); $('#cnSout').innerHTML = `🎵 <b>${esc(n.item.name)}</b> — ${esc(n.item.artists[0].name)}<div class="flex gap-2 mt-2"><button class="jv-btn" data-sp="prev">⏮</button><button class="jv-btn" data-sp="${n.is_playing ? 'pause' : 'play'}">${n.is_playing ? '⏸' : '▶'}</button><button class="jv-btn" data-sp="next">⏭</button></div>`; $$('#cnSout [data-sp]').forEach(b => b.onclick = () => spCmd(b.dataset.sp)) } else $('#cnSout').innerHTML = '<span class="jv-sub">сейчас ничего не играет</span>'; setSt('cnS', '✓ подключено', true); JV.conn.sp = true } catch (e) { $('#cnSout').innerHTML = `<span class="text-jv-red">✗ ${esc(e.message)}</span>` } }
const spCmd = async a => { try { await sp(a === 'next' ? '/me/player/next' : a === 'prev' ? '/me/player/previous' : '/me/player/' + a, a === 'next' || a === 'prev' ? 'POST' : 'PUT'); setTimeout(spNow, 600) } catch (e) { toast('🎵 ' + e.message + ' (нужен Premium и открытый плеер)') } };
JV.spCmd = spCmd;
(async () => { const q = new URLSearchParams(location.search); if (q.get('state') === 'jv-sp' && q.get('code')) { try { await spToken({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: RED, code_verifier: sessionStorage.getItem('jv_sp_v') }); toast('🎵 Spotify подключён') } catch (e) { toast('🎵 ' + e.message) } history.replaceState(null, '', RED) } if (SP.tok) { spNow(); setInterval(spNow, 15000) } })();

/* ---------- календарь .ics ---------- */
function parseICS(txt) {
  const L = txt.replace(/\r?\n[ \t]/g, '').split(/\r?\n/), ev = []; let cur = null;
  for (const l of L) { if (l === 'BEGIN:VEVENT') cur = {}; else if (l === 'END:VEVENT') { if (cur?.start) ev.push(cur); cur = null } else if (cur) { const [k, ...v] = l.split(':'), val = v.join(':'); if (k.startsWith('DTSTART')) { const m = val.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/); if (m) cur.start = m[7] ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)); cur.allDay = !m?.[4] } if (k === 'SUMMARY') cur.title = val.replace(/\\,/g, ',') } }
  return ev;
}
$('#cnCfile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return; const ev = parseICS(await f.text()), d0 = new Date(); d0.setHours(0, 0, 0, 0); const d1 = new Date(d0.getTime() + 864e5 * 7);
  const today = ev.filter(x => x.start >= d0 && x.start < new Date(d0.getTime() + 864e5)).sort((a, b) => a.start - b.start), week = ev.filter(x => x.start >= d0 && x.start < d1).sort((a, b) => a.start - b.start);
  if (today.length) $('#cal').innerHTML = today.map(x => `<div class="ev"><time>${x.allDay ? 'весь день' : x.start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>${esc(x.title || '—')}</div>`).join('');
  JV.conn.cal = week; setSt('cnC', `✓ ${ev.length} событий`, true);
  $('#cnCout').innerHTML = `<div class="jv-label mb-1">Ближайшие 7 дней · ${week.length}</div>${week.slice(0, 12).map(x => `<div class="jv-row"><span>${esc(x.title || '—')}</span><span class="jv-sub">${x.start.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })} ${x.allDay ? '' : x.start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span></div>`).join('')}${today.length ? '<div class="jv-sub mt-2">✓ события на сегодня выведены в HUD</div>' : '<div class="jv-sub mt-2">на сегодня событий нет — в HUD остались демо-данные</div>'}`;
};

/* ---------- данные в мозг: погода и музыка ---------- */
if (typeof runTool !== 'undefined') { const _rt = runTool; runTool = async (n, a) => { const W = JV.conn.weather; if (n === 'get_weather' && W) return JSON.stringify({ city: W.name, temp: W.t, sky: W.d, wind_ms: W.wind, humidity: W.hum, rain_next_3h_pct: W.rainNext, source: 'open-meteo, live' }); if (n === 'music' && JV.conn.sp) { await spCmd(a.action === 'play' ? 'play' : 'pause'); return 'Spotify: ' + a.action } return _rt(n, a) } }
SKILLS.unshift({ re: /погод/i, run: () => { const W = JV.conn.weather; if (!W) return SKILLS.find((s, i) => i > 0 && s.re.test('погода')).run(); return `В городе ${W.name} ${W.t > 0 ? 'плюс' : W.t < 0 ? 'минус' : ''} ${Math.abs(W.t)}, ${W.d}. Ветер ${Math.round(W.wind)} метров в секунду.${W.rainNext > 50 ? ' В ближайшие часы возможен дождь — возьмите зонт.' : ''}` }, tools: [['get_weather', 'open-meteo · live']] });

/* ---------- проактивность ---------- */
const RULES = JV.store.get('rules', { brief: { on: true, at: '07:30' }, event: { on: true }, water: { on: false }, diary: { on: true, at: '22:00' }, rain: { on: true }, quiet: { on: true, from: '23:00', to: '07:00' } });
const DESC = { brief: ['🌅 Утренний брифинг', 'в будни, в указанное время'], event: ['📅 За 15 минут до события', 'из календаря HUD'], water: ['💧 Вода', 'каждые 2 часа с 9 до 21'], diary: ['📔 Вечерний дневник', 'в указанное время'], rain: ['🌧 Скоро дождь', 'если подключена погода'], quiet: ['🌙 Тихие часы', 'в это время молчит (кроме важного)'] };
let fired = JV.store.get('fired', {});
function drawRules() {
  $('#cnRules').innerHTML = Object.entries(DESC).map(([k, [n, d]]) => `<div class="flex items-center gap-2 rounded-lg border border-solid border-jv-line p-2.5"><button class="sw ${RULES[k].on ? 'on' : ''}" data-rl="${k}"></button><div class="flex-1"><div class="text-[13px]">${n}</div><div class="jv-sub">${d}</div></div>${'at' in RULES[k] ? `<input type="time" value="${RULES[k].at}" data-at="${k}" class="jv-sel">` : ''}${k === 'quiet' ? `<input type="time" value="${RULES.quiet.from}" data-qf class="jv-sel"><input type="time" value="${RULES.quiet.to}" data-qt class="jv-sel">` : `<button data-try="${k}" class="jv-badge border-jv-cyan text-jv-cyan bg-transparent cursor-pointer">▶ сейчас</button>`}</div>`).join('');
  $$('[data-rl]').forEach(b => b.onclick = () => { RULES[b.dataset.rl].on = !RULES[b.dataset.rl].on; save(); drawRules() });
  $$('[data-at]').forEach(i => i.onchange = () => { RULES[i.dataset.at].at = i.value; save() }); $$('[data-qf]').forEach(i => i.onchange = () => { RULES.quiet.from = i.value; save() }); $$('[data-qt]').forEach(i => i.onchange = () => { RULES.quiet.to = i.value; save() });
  $$('[data-try]').forEach(b => b.onclick = () => fire(b.dataset.try, true));
}
const save = () => JV.store.set('rules', RULES);
const hm = d => d.toTimeString().slice(0, 5), inQuiet = d => { if (!RULES.quiet.on) return false; const t = hm(d), { from: f, to } = RULES.quiet; return f < to ? t >= f && t < to : t >= f || t < to };
function proactive(text, ic = '💬') {
  let c = $('#jvPro'); if (!c) { document.body.insertAdjacentHTML('beforeend', '<div id="jvPro" style="position:fixed;right:16px;top:16px;z-index:175;max-width:340px;transform:translateX(130%);transition:transform .45s cubic-bezier(.2,.8,.2,1)" class="jv-tile !bg-[#04131c]/95 !border-jv-purple"></div>'); c = $('#jvPro') }
  c.innerHTML = `<div class="font-hud text-[9px] tracking-[.2em] text-jv-purple">ДЖАРВИС ЗАГОВОРИЛ САМ</div><div class="text-[14px] mt-1.5">${ic} ${esc(text)}</div>`; c.style.transform = 'none'; clearTimeout(c._t); c._t = setTimeout(() => c.style.transform = 'translateX(130%)', 9000);
  speak?.(text); log?.('proactive: ' + text.slice(0, 40), 'c'); bus?.('proactive', { text });
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') { navigator.serviceWorker?.ready.then(r => r.showNotification('J.A.R.V.I.S.', { body: text, icon: 'icon.svg', tag: 'jv-pro' })).catch(() => new Notification('J.A.R.V.I.S.', { body: text })) }
}
function fire(k, test) {
  const W = JV.conn.weather;
  if (k === 'brief') return test ? handle('Утренний брифинг') : (goTab('hud'), handle('Утренний брифинг'));
  if (k === 'event') { const e = $('#cal .ev'); return proactive(e ? `Через 15 минут: ${e.lastChild.textContent.trim()}.` : 'Через 15 минут у вас встреча.', '📅') }
  if (k === 'water') return proactive('Сэр, вы два часа без воды. Стакан не помешает.', '💧');
  if (k === 'diary') return proactive('Время вечернего дневника: две минуты о том, как прошёл день?', '📔');
  if (k === 'rain') return proactive(W ? `В ${W.name} вероятность дождя ${W.rainNext}% в ближайшие часы. Зонт у двери.` : 'Подключите погоду, и я буду предупреждать о дожде.', '🌧');
}
setInterval(() => {
  const d = new Date(), t = hm(d), day = d.toDateString(), once = (k, key) => { if (fired[key] === day) return false; fired[key] = day; JV.store.set('fired', fired); return true };
  if (inQuiet(d)) return;
  if (RULES.brief.on && d.getDay() % 6 && t === RULES.brief.at && once('brief', 'brief')) fire('brief');
  if (RULES.diary.on && t === RULES.diary.at && once('diary', 'diary')) fire('diary');
  if (RULES.water.on && d.getHours() >= 9 && d.getHours() <= 21 && d.getHours() % 2 === 1 && d.getMinutes() === 0 && once('water', 'water' + d.getHours())) fire('water');
  if (RULES.rain.on && JV.conn.weather?.rainNext > 60 && once('rain', 'rain' + d.getHours())) fire('rain');
  if (RULES.event.on) $$('#cal .ev').forEach(e => { const tm = e.querySelector('time')?.textContent; if (!/^\d\d:\d\d$/.test(tm || '')) return; const [h, m] = tm.split(':').map(Number), et = new Date(d); et.setHours(h, m - 15, 0, 0); if (hm(et) === t && once('event', 'ev' + tm)) proactive(`Через 15 минут: ${e.lastChild.textContent.trim()}.`, '📅') });
}, 20000);
$('#cnNot').onclick = async () => { if (!('Notification' in window)) return toast('Уведомления не поддерживаются'); const p = await Notification.requestPermission(); toast(p === 'granted' ? '🔔 Уведомления разрешены' : '🔕 Уведомления запрещены') };
drawRules(); JV.proactive = proactive;

/* ---------- слово «Джарвис» ---------- */
const SRw = window.SpeechRecognition || window.webkitSpeechRecognition; let wk = null, wkOn = false, armed = 0;
const wkLog = t => { const o = $('#cnWkout'); o.innerHTML = `<div>${new Date().toLocaleTimeString('ru-RU')} ${esc(t)}</div>` + o.innerHTML; while (o.children.length > 5) o.lastChild.remove() };
function wkStart() {
  if (!SRw) return toast('Распознавание речи не поддерживается этим браузером');
  wk = new SRw(); wk.lang = 'ru-RU'; wk.continuous = true; wk.interimResults = false;
  wk.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) { if (!e.results[i].isFinal) continue; const t = e.results[i][0].transcript.trim(), m = t.match(/(джарвис|jarvis|жарвис|джервис)[,!\s]*(.*)/i);
    if (m) { const rest = m[2].trim(); window.sfxClick?.(); if (rest) { wkLog('🎯 «' + t + '»'); handle(rest) } else { armed = Date.now(); wkLog('👂 «Джарвис» — слушаю команду…'); setState?.('listening'); speak?.('Да, сэр?') } }
    else if (Date.now() - armed < 8000) { armed = 0; wkLog('🎯 команда: «' + t + '»'); setState?.('idle'); handle(t) } else wkLog('· ' + t.slice(0, 50)) } };
  wk.onend = () => { if (wkOn) setTimeout(() => { try { wk.start() } catch (e) { } }, 300) };
  wk.onerror = e => { if (e.error === 'not-allowed') { wkStop(); toast('🎙 Нет доступа к микрофону') } };
  wkOn = true; try { wk.start() } catch (e) { } setSt('cnWake', '👂 слушаю', true); $('#cnWkgo').textContent = '⏹ ВЫКЛЮЧИТЬ'; wkLog('жду слово «Джарвис»…'); $('#wkInd')?.classList.remove('hidden');
}
function wkStop() { wkOn = false; try { wk?.stop() } catch (e) { } setSt('cnWake', 'выкл', false); $('#cnWkgo').textContent = '👂 ВКЛЮЧИТЬ'; $('#wkInd')?.classList.add('hidden') }
$('#cnWkgo').onclick = () => wkOn ? wkStop() : wkStart();
document.getElementById('jvCtl').insertAdjacentHTML('beforeend', '<span id="wkInd" class="hidden jv-badge border-jv-green text-jv-green animate-pulse" title="слушаю слово «Джарвис»">👂 Джарвис</span>');
if (typeof startMic === 'function') { const _sm = startMic; startMic = async (...a) => { if (wkOn) { try { wk.stop() } catch (e) { } } return _sm(...a) } }
})();
