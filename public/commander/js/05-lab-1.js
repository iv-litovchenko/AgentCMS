/* =====================================================================
   ЛАБОРАТОРИЯ — 12 «наворотов» Джарвиса. Каждый модуль: {icon,t,s,r(el,tok)}
   r() рисует демо в el; tok — токен активности (если labTok сменился — демо остановлено)
   ===================================================================== */
window.LAB = [];
let labTok = 0, labCur = null, labCleanup = null;
const L = (t, extra = '') => `<div class="jv-label mb-3 ${extra}">${t}</div>`;
const alive = tok => tok === labTok;
const _scripts = {};
function loadScript(src) { return _scripts[src] ||= new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s) }) }
function speakAs(text, { pitch = 1, rate = 1.05, lang = 'ru-RU' } = {}) {
  return new Promise(res => {
    if (!voiceOn || !('speechSynthesis' in window)) { setTimeout(res, 500 + text.length * 32); return }
    const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.pitch = pitch; u.rate = rate;
    const v = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').startsWith(lang.slice(0, 2))); if (v) u.voice = v;
    let done = false; const fin = () => { if (!done) { done = true; res() } };
    u.onend = fin; u.onerror = fin; speechSynthesis.speak(u); setTimeout(fin, 1500 + text.length * 95);
  });
}
async function typeInto(el, text, ms = 18, tok) { for (const ch of text) { if (tok != null && !alive(tok)) return; el.textContent += ch; await sleep(ms) } }

function labBuild() {
  const nav = $('#labnav'); if (nav.children.length) return;
  nav.innerHTML = LAB.map((m, i) => `<button data-i="${i}" class="lab-item w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-solid border-transparent bg-transparent cursor-pointer text-jv-text hover:bg-jv-cyan/5 shrink-0">
    <span class="text-xl w-7 text-center">${m.icon}</span><span class="min-w-0"><span class="block text-[13px] font-semibold leading-tight">${m.t}</span><span class="block jv-sub truncate">${m.s}</span></span><span class="ml-auto font-mono text-[10px] text-jv-mute">${String(i + 1).padStart(2, '0')}</span></button>`).join('');
  $$('#labnav .lab-item').forEach(b => b.onclick = () => labOpen(+b.dataset.i));
}
function labOpen(i) {
  labTok++; try { labCleanup?.() } catch (e) { } labCleanup = null; window.holoGesture = null; speechSynthesis?.cancel();
  labCur = i; const m = LAB[i];
  $$('#labnav .lab-item').forEach(b => { const on = +b.dataset.i === i; b.classList.toggle('!bg-jv-cyan/10', on); b.classList.toggle('!border-jv-cyan', on) });
  const el = $('#labmain');
  el.innerHTML = `<div class="flex items-center gap-3 mb-3"><span class="text-3xl">${m.icon}</span><div><div class="font-hud text-lg font-bold tracking-wider text-jv-cyan">${m.t.toUpperCase()}</div><div class="text-[13px] text-jv-mute">${m.d || m.s}</div></div></div><div id="labbody" class="tile-in"></div>`;
  const r = m.r($('#labbody'), labTok); if (typeof r === 'function') labCleanup = r;
  bus?.('lab.open', { demo: m.t });
}
(() => { const prev = window.onTab; window.onTab = t => { prev?.(t); if (t === 'lab') { labBuild(); if (labCur == null) labOpen(0) } else if (labCur != null && t !== 'lab') { labTok++; try { labCleanup?.() } catch (e) { } labCleanup = null; window.holoGesture = null; labCur = null; $('#labmain').innerHTML = '' ; $$('#labnav .lab-item').forEach(b=>b.classList.remove('!bg-jv-cyan/10','!border-jv-cyan'))} } })();

/* голограмма перехватывает жесты, когда открыта */
if (typeof fireGesture === 'function') {
  const _fg = fireGesture;
  window.fireGesture = fireGesture = function (k, sim) { if (window.holoGesture && window.holoGesture(k)) { glog(`${GACT[k]?.e || ''} ${k} → голограмма`); return } return _fg(k, sim) };
}

/* ===================== 01 · ЗВОНОК ОТ ВАШЕГО ИМЕНИ ===================== */
LAB.push({
  icon: '📞', t: 'Звонок от вашего имени', s: 'бронирует по телефону', d: 'Джарвис сам звонит в ресторан, ведёт разговор по вашим правилам, а вы можете вмешаться в любой момент.',
  r(el, tok) {
    const CK = { date: 'пятница', time: 'время (±30 мин)', guests: '4 гостя', name: 'на имя Старк', window: 'у окна' };
    const S = [
      ['sys', 'Набираю «Пушкин» · +7 495 •••-••-••'],
      ['them', 'Ресторан «Пушкин», добрый вечер!'],
      ['me', 'Добрый вечер! Я ИИ-ассистент, звоню по поручению Тони Старка. Хотел бы забронировать столик на четверых в эту пятницу на 20:00.', ['date', 'guests']],
      ['them', 'Минутку… На 20:00 всё занято. Могу предложить 20:30 или 21:15.'],
      ['think', 'правило «±30 минут — соглашаться» → выбираю 20:30'],
      ['me', '20:30 подойдёт. А можно столик у окна?', ['time']],
      ['them', 'У окна есть. На чьё имя записать?'],
      ['me', 'На имя Старк. Контактный номер — тот, с которого я звоню.', ['name']],
      ['them', 'Записала: пятница, 20:30, четыре гостя, у окна. Ждём вас!', ['window']],
      ['me', 'Спасибо, хорошего вечера!'],
    ];
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="jv-tile">${L('Поручение')}<div class="text-[14px] leading-relaxed">«Джарвис, забронируй столик на четверых в пятницу на 20:00 в „Пушкине“»</div>
        ${L('Правила переговоров', 'mt-5')}<div class="text-[12.5px] space-y-1.5"><div>✅ время ±30 минут — можно соглашаться</div><div>✅ у окна — желательно</div><div>✅ бюджет до 20 000 ₽</div><div>⛔ номер карты не называть</div><div>🗣 честно представляться ИИ</div></div>
        ${L('Цель звонка', 'mt-5')}<div id="cl-ck" class="space-y-1 text-[13px]">${Object.entries(CK).map(([k, v]) => `<div data-ck="${k}" class="flex items-center gap-2 text-jv-mute"><span class="w-4 h-4 rounded border border-solid border-jv-line grid place-items-center text-[10px]"></span>${v}</div>`).join('')}</div>
        <label class="flex items-center gap-2 mt-4 jv-sub cursor-pointer"><input type="checkbox" id="cl-voice" checked class="accent-[#00d4ff]"> озвучивать разговор</label>
        <button id="cl-start" class="jv-btn w-full mt-3 !py-3 !text-[12px]">📞 ПОЗВОНИТЬ</button></div>
      <div class="jv-tile lg:col-span-2 flex flex-col">
        <div class="flex items-center gap-4 pb-3 border-0 border-b border-solid border-jv-line">
          <div id="cl-av" class="w-14 h-14 rounded-full grid place-items-center text-2xl bg-jv-gold/10 border-2 border-solid border-jv-gold/50">🍽</div>
          <div><div class="font-semibold text-[15px]">Ресторан «Пушкин»</div><div id="cl-st" class="jv-sub">ожидание</div></div>
          <div id="cl-wave" class="ml-auto flex items-center gap-[3px] h-10">${Array.from({ length: 28 }, () => '<i class="block w-[3px] rounded-full bg-jv-mute/40 transition-all duration-100" style="height:4px"></i>').join('')}</div>
          <div id="cl-time" class="font-mono text-jv-cyan text-lg w-14 text-right">00:00</div></div>
        <div id="cl-log" class="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[340px] max-h-[460px] pr-1"></div>
        <div class="flex flex-wrap gap-2 pt-3 border-0 border-t border-solid border-jv-line items-center">
          <button id="cl-take" class="jv-btn !border-jv-gold !text-jv-gold !bg-jv-gold/10 disabled:opacity-40" disabled>🎙 ВМЕШАТЬСЯ</button>
          <button id="cl-end" class="jv-btn !border-jv-red !text-jv-red !bg-jv-red/10 disabled:opacity-40" disabled>⏹ ЗАВЕРШИТЬ</button>
          <span class="ml-auto jv-sub">в реальности: телефония (SIP/Twilio) + голосовая модель в реальном времени</span></div></div></div>`;
    const log = $('#cl-log'), wave = [...$$('#cl-wave i')];
    let speaking = null, paused = false, stopped = false, sec = 0, timer, wv;
    const add = (who, text) => {
      const d = document.createElement('div');
      const st = { me: 'mr-10 bg-jv-cyan/10 border-jv-cyan/40', them: 'ml-10 bg-jv-gold/10 border-jv-gold/40', sys: 'text-center', think: 'mr-10' }[who];
      if (who === 'sys') d.innerHTML = `<div class="${st} font-mono text-[11px] text-jv-mute">— ${esc(text)} —</div>`;
      else if (who === 'think') d.innerHTML = `<div class="${st} font-mono text-[11px] text-jv-purple italic">🧠 ${esc(text)}</div>`;
      else d.innerHTML = `<div class="${st} rounded-xl border border-solid px-3 py-2"><div class="font-hud text-[9px] tracking-widest mb-1 ${who === 'me' ? 'text-jv-cyan' : 'text-jv-gold'}">${who === 'me' ? '🤖 ДЖАРВИС' : '🍽 РЕСТОРАН'}</div><div class="text-[13.5px] tx"></div></div>`;
      d.className = 'tile-in'; log.append(d); log.scrollTop = 1e9; return d.querySelector('.tx');
    };
    const setSpk = w => { speaking = w; $('#cl-st').textContent = w === 'me' ? 'говорит Джарвис' : w === 'them' ? 'говорит ресторан' : paused ? 'вы на линии' : 'на связи'; wave.forEach(i => { i.classList.toggle('bg-jv-cyan', w === 'me'); i.classList.toggle('bg-jv-gold', w === 'them') }) };
    const cleanup = () => { clearInterval(timer); clearInterval(wv); stopped = true; speechSynthesis?.cancel() };
    $('#cl-start').onclick = async () => {
      $('#cl-start').disabled = true; $('#cl-start').textContent = '📞 ИДЁТ ЗВОНОК…'; $('#cl-take').disabled = $('#cl-end').disabled = false; log.innerHTML = '';
      timer = setInterval(() => { if (!paused || true) { sec++; $('#cl-time').textContent = `${String(sec / 60 | 0).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}` } }, 1000);
      wv = setInterval(() => wave.forEach((i, k) => i.style.height = speaking ? (6 + Math.abs(Math.sin(Date.now() / 120 + k)) * 28 * Math.random()) + 'px' : '4px'), 90);
      log.append(Object.assign(document.createElement('div'), { className: 'text-center text-2xl animate-pulse', textContent: '📞' }));
      await sleep(1400); log.innerHTML = '';
      for (const [who, text, ck] of S) {
        if (!alive(tok) || stopped) return;
        while (paused) { await sleep(200); if (!alive(tok) || stopped) return }
        if (who === 'sys' || who === 'think') { add(who, text); await sleep(900); continue }
        setSpk(who); const tx = add(who, text);
        const sp = $('#cl-voice').checked ? speakAs(text, who === 'me' ? { pitch: .8, rate: 1.08 } : { pitch: 1.35, rate: 1.12 }) : sleep(600 + text.length * 30);
        await typeInto(tx, text, 22, tok); await sp; setSpk(null);
        (ck || []).forEach(k => { const r = $(`[data-ck="${k}"]`); r.classList.replace('text-jv-mute', 'text-jv-green'); r.firstElementChild.textContent = '✓'; r.firstElementChild.classList.add('border-jv-green') });
        await sleep(350);
      }
      if (!alive(tok) || stopped) return;
      add('sys', `Звонок завершён · ${$('#cl-time').textContent}`); cleanup();
      const r = document.createElement('div'); r.className = 'tile-in rounded-xl border border-solid border-jv-green bg-jv-green/10 p-3 text-[13.5px]';
      r.innerHTML = `<b class="text-jv-green">✅ Забронировано:</b> пятница, <b>20:30</b> (вместо 20:00 — в рамках правила ±30 мин), 4 гостя, у окна.<div class="jv-sub mt-1">📅 добавил в календарь · 💬 написал Пеппер · ⏰ напомню в пятницу в 19:30</div>`;
      log.append(r); log.scrollTop = 1e9; $('#cl-st').textContent = 'завершён'; $('#cl-take').disabled = $('#cl-end').disabled = true; $('#cl-start').disabled = false; $('#cl-start').textContent = '↻ ПОЗВОНИТЬ ЕЩЁ РАЗ';
      window.log?.('call: booked 20:30 x4', 'ok'); toast('📞 Столик забронирован на 20:30');
    };
    $('#cl-take').onclick = () => {
      paused = !paused; speechSynthesis?.cancel();
      $('#cl-take').textContent = paused ? '↩ ВЕРНУТЬ ДЖАРВИСУ' : '🎙 ВМЕШАТЬСЯ';
      add('sys', paused ? 'Вы на линии. Джарвис слушает и подсказывает в наушник' : 'Джарвис снова ведёт разговор');
      if (paused) add('think', 'подсказка вам: «спросите, есть ли парковка» · «уточните дресс-код»');
      setSpk(null);
    };
    $('#cl-end').onclick = () => { cleanup(); add('sys', 'Звонок завершён вами'); $('#cl-st').textContent = 'завершён'; $('#cl-take').disabled = $('#cl-end').disabled = true; $('#cl-start').disabled = false; $('#cl-start').textContent = '↻ ПОЗВОНИТЬ'; setSpk(null) };
    return cleanup;
  }
});

/* ===================== 02 · ПРОТОКОЛ ВСТРЕЧИ ВЖИВУЮ ===================== */
LAB.push({
  icon: '🗒', t: 'Протокол встречи вживую', s: 'кто говорит, решения, задачи', d: 'Слушает созвон, различает голоса и на лету вытаскивает решения, задачи и открытые вопросы.',
  r(el, tok) {
    const SP = { p: ['Пеппер', '#b48cff'], t: ['Тони', '#00d4ff'], h: ['Хэппи', '#ffb547'], b: ['Брюс', '#3dffa8'] };
    const S = [
      ['p', 6, 'Итак, до Expo семь месяцев. Сегодня утверждаем бюджет и демо-зону.'],
      ['t', 5, 'Демо-зона — жесты и голограмма. Джарвис уже умеет, покажем вживую.'],
      ['h', 7, 'По логистике: площадка две тысячи квадратов, мне нужна смета на свет и охрану.', { task: ['Хэппи', 'Смета на свет и охрану', 'до 10 окт'] }],
      ['b', 6, 'Я бы добавил стенд с локальными моделями — все спрашивают про приватность.'],
      ['p', 5, 'Согласна. Значит, два стенда: жесты и приватный ИИ.', { dec: 'Два стенда: «Жесты + голограмма» и «Приватный ИИ»' }],
      ['t', 4, 'Бюджет — плюс пятнадцать процентов к прошлому году?'],
      ['p', 6, 'Если смета Хэппи уложится — да. Финально решим в пятницу.', { dec: 'Бюджет +15% — при условии сметы', q: 'Уложится ли смета в +15%?' }],
      ['b', 5, 'Мне нужен доступ к GPU-серверу для демо до конца месяца.', { task: ['Тони', 'Выдать Брюсу доступ к GPU-серверу', 'до 31 окт'] }],
      ['t', 3, 'Сделаю сегодня же.'],
      ['h', 5, 'И камеры в зале — нужны таблички, Пеппер просила.', { task: ['Хэппи', 'Таблички о видеосъёмке', 'до Expo'] }],
      ['p', 4, 'Обязательно. Кто ведёт стенд приватного ИИ — решим позже. Всем спасибо!', { q: 'Кто ведёт стенд «Приватный ИИ»?' }],
    ];
    const TOT = S.reduce((a, s) => a + s[1], 0); let acc = 0; S.forEach(s => { s.start = acc; acc += s[1] });
    el.innerHTML = `<div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
      <div class="xl:col-span-2 flex flex-col gap-3">
        <div class="jv-tile"><div class="flex items-center gap-2 mb-3"><span class="jv-label !mb-0">Кто говорит · диаризация</span><span class="ml-auto flex gap-1.5 items-center"><span class="w-2 h-2 rounded-full bg-jv-red animate-pulse"></span><span id="mt-t" class="font-mono text-[12px] text-jv-red">00:00</span></span></div>
          <div class="space-y-2" id="mt-rows">${Object.entries(SP).map(([k, [n, c]]) => `<div class="flex items-center gap-2"><span class="w-16 text-[12px]" style="color:${c}">${n}</span><div class="relative flex-1 h-5 rounded bg-white/5" data-row="${k}"></div><span class="w-10 text-right font-mono text-[10px] text-jv-mute" data-pct="${k}">0%</span></div>`).join('')}
            <div class="relative ml-[72px] mr-12 h-0"><div id="mt-head" class="absolute -top-[100px] w-px h-[100px] bg-jv-red" style="left:0"></div></div></div>
          <div class="flex gap-2 mt-4"><button id="mt-play" class="jv-btn">▶ СЛУШАТЬ</button>${[1, 2, 4].map(x => `<button data-sp="${x}" class="jv-badge cursor-pointer bg-transparent ${x === 2 ? 'border-jv-cyan text-jv-cyan' : 'border-jv-line text-jv-mute'}">×${x}</button>`).join('')}<span class="ml-auto jv-sub self-center">Whisper + pyannote (кто говорит) + LLM (извлечение)</span></div></div>
        <div class="jv-tile">${L('Расшифровка')}<div id="mt-tr" class="space-y-2 max-h-[300px] overflow-y-auto text-[13.5px] min-h-[120px]"><div class="jv-sub">нажмите «Слушать»</div></div></div></div>
      <div class="flex flex-col gap-3">
        <div class="jv-tile">${L('✅ Решения')}<div id="mt-dec" class="space-y-1.5 text-[13px] min-h-[30px]"></div></div>
        <div class="jv-tile">${L('📌 Задачи')}<div id="mt-task" class="space-y-1.5 text-[13px] min-h-[30px]"></div></div>
        <div class="jv-tile">${L('❓ Открытые вопросы')}<div id="mt-q" class="space-y-1.5 text-[13px] min-h-[30px]"></div></div>
        <div id="mt-done" class="hidden jv-tile !border-jv-green">${L('📝 Протокол готов')}<div class="flex flex-wrap gap-2"><button class="jv-btn" data-mt="Участникам на почту">✉️ ВСЕМ</button><button class="jv-btn" data-mt="В Notion">📓 NOTION</button><button class="jv-btn" data-mt="Во второй мозг">🧠 В МОЗГ</button></div></div></div></div>`;
    const tr = $('#mt-tr'); let t = 0, speed = 2, play = false, idx = -1, iv;
    const talk = { p: 0, t: 0, h: 0, b: 0 };
    const fmt = s => `${String(s / 60 | 0).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const flash = (box, html) => { const d = document.createElement('div'); d.className = 'tile-in rounded-md px-2 py-1.5 bg-jv-gold/15 transition-colors duration-1000'; d.innerHTML = html; box.append(d); setTimeout(() => d.classList.replace('bg-jv-gold/15', 'bg-white/5'), 900) };
    let curTx = null;
    function step() {
      if (!alive(tok)) return clearInterval(iv);
      t = Math.min(TOT, t + .1 * speed); $('#mt-t').textContent = fmt(t); $('#mt-head').style.left = (t / TOT * 100) + '%';
      const i = S.findIndex(s => t >= s.start && t < s.start + s[1]); const cur = i < 0 ? S.length - 1 : i;
      if (cur !== idx) {
        if (idx >= 0) { const ex = S[idx][3]; if (ex) { if (ex.dec) flash($('#mt-dec'), '✅ ' + esc(ex.dec)); if (ex.task) flash($('#mt-task'), `<span class="jv-badge border-jv-cyan text-jv-cyan mr-1">${ex.task[0]}</span>${esc(ex.task[1])} <span class="jv-sub">· ${ex.task[2]}</span>`); if (ex.q) flash($('#mt-q'), '❓ ' + esc(ex.q)) } }
        idx = cur; if (idx === 0 && tr.querySelector('.jv-sub')) tr.innerHTML = '';
        const [k, , text] = S[idx]; const [n, c] = SP[k];
        const seg = document.createElement('div'); seg.className = 'absolute top-0 bottom-0 rounded'; seg.style.cssText = `left:${S[idx].start / TOT * 100}%;width:0;background:${c};box-shadow:0 0 8px ${c}`; seg.dataset.seg = idx; $(`[data-row="${k}"]`).append(seg);
        const d = document.createElement('div'); d.className = 'tile-in'; d.innerHTML = `<span class="font-mono text-[10px] text-jv-mute mr-2">${fmt(S[idx].start)}</span><b style="color:${c}">${n}:</b> <span class="tx"></span>`; tr.append(d); curTx = { el: d.querySelector('.tx'), text };
      }
      const s = S[idx], p = Math.min(1, (t - s.start) / s[1]);
      const seg = $(`[data-seg="${idx}"]`); if (seg) seg.style.width = (s[1] * p / TOT * 100) + '%';
      if (curTx) { curTx.el.textContent = curTx.text.slice(0, Math.ceil(curTx.text.length * Math.min(1, p * 1.3))); tr.scrollTop = 1e9 }
      talk[s[0]] = S.filter((x, j) => x[0] === s[0] && j < idx).reduce((a, x) => a + x[1], 0) + s[1] * p;
      const sum = Object.values(talk).reduce((a, b) => a + b, 0) || 1; Object.keys(talk).forEach(k => $(`[data-pct="${k}"]`).textContent = Math.round(talk[k] / sum * 100) + '%');
      if (t >= TOT) { clearInterval(iv); play = false; const ex = S[idx][3]; if (ex?.q) flash($('#mt-q'), '❓ ' + esc(ex.q)); $('#mt-play').textContent = '↻ ЗАНОВО'; $('#mt-done').classList.remove('hidden'); toast('🗒 Протокол готов: 2 решения, 3 задачи, 2 вопроса') }
    }
    $('#mt-play').onclick = () => {
      if (t >= TOT) { t = 0; idx = -1; $$('[data-row]').forEach(r => r.innerHTML = ''); ['#mt-dec', '#mt-task', '#mt-q'].forEach(s => $(s).innerHTML = ''); tr.innerHTML = ''; Object.keys(talk).forEach(k => talk[k] = 0); $('#mt-done').classList.add('hidden') }
      play = !play; $('#mt-play').textContent = play ? '⏸ ПАУЗА' : '▶ СЛУШАТЬ'; clearInterval(iv); if (play) iv = setInterval(step, 100);
    };
    $$('[data-sp]').forEach(b => b.onclick = () => { speed = +b.dataset.sp; $$('[data-sp]').forEach(x => { const on = x === b; x.classList.toggle('border-jv-cyan', on); x.classList.toggle('text-jv-cyan', on); x.classList.toggle('border-jv-line', !on); x.classList.toggle('text-jv-mute', !on) }) });
    $$('[data-mt]').forEach(b => b.onclick = () => toast('📤 Протокол отправлен: ' + b.dataset.mt));
    return () => clearInterval(iv);
  }
});

/* ===================== 03 · АГЕНТ ЗА КОМПЬЮТЕРОМ ===================== */
LAB.push({
  icon: '🖱', t: 'Агент за компьютером', s: 'сам кликает в браузере', d: 'Computer use: модель смотрит на скриншот, решает, куда кликнуть, и печатает сама. Перед оплатой обязательно спрашивает вас.',
  r(el, tok) {
    el.innerHTML = `<div class="grid grid-cols-1 xl:grid-cols-5 gap-3">
      <div class="xl:col-span-3">
        <div id="cu-br" class="relative rounded-xl overflow-hidden border border-solid border-[#2a3a44] bg-[#f3f6f9] text-[#16232e] shadow-[0_0_40px_rgba(0,212,255,.12)]" style="height:480px">
          <div class="h-9 bg-[#dde4ea] flex items-center gap-2 px-3"><span class="w-3 h-3 rounded-full bg-[#ff5f57]"></span><span class="w-3 h-3 rounded-full bg-[#febc2e]"></span><span class="w-3 h-3 rounded-full bg-[#28c840]"></span>
            <div class="flex-1 ml-3 h-6 rounded-md bg-white flex items-center px-2 font-mono text-[11px] text-[#556]" id="cu-url">about:blank</div><span id="cu-ctl" class="hidden text-[10px] font-mono px-2 py-0.5 rounded bg-[#00d4ff] text-[#002]">🤖 управляет Джарвис</span></div>
          <div id="cu-page" class="p-6 h-[calc(100%-36px)] overflow-hidden"></div>
          <svg id="cu-cur" class="absolute w-6 h-6 z-20 transition-all duration-700 ease-in-out pointer-events-none" style="left:60%;top:60%;filter:drop-shadow(0 0 6px #00d4ff)" viewBox="0 0 24 24"><path d="M4 2l6.5 19 2.6-7.6L21 11z" fill="#00d4ff" stroke="#012" stroke-width="1.3"/></svg>
          <div id="cu-modal" class="hidden absolute inset-0 bg-[#000a]/60 backdrop-blur-sm z-30 grid place-items-center p-6"></div></div></div>
      <div class="xl:col-span-2 flex flex-col gap-3">
        <div class="jv-tile">${L('Задача')}<div class="text-[14px]">«Купи мне билет в Стамбул на пятницу, прямой рейс, место у окна»</div>
          <div class="flex gap-2 mt-3"><button id="cu-go" class="jv-btn">▶ НАЧАТЬ</button><button id="cu-stop" class="jv-btn !border-jv-red !text-jv-red !bg-jv-red/15 !text-[12px] flex-1 disabled:opacity-40" disabled>⛔ СТОП</button></div></div>
        <div class="jv-tile flex-1">${L('Мысли и действия агента')}<div id="cu-log" class="space-y-2 max-h-[300px] overflow-y-auto text-[12.5px]"><div class="jv-sub">цикл: 📸 скриншот → 🧠 решение → 🖱 действие → повтор</div></div></div></div></div>`;
    const br = $('#cu-br'), cur = $('#cu-cur'), page = $('#cu-page'); let stopped = false;
    const inp = (id, ph) => `<label class="block"><span class="text-[11px] text-[#678]">${ph}</span><div id="${id}" class="mt-1 h-10 rounded-lg border border-solid border-[#c9d3dc] bg-white px-3 flex items-center text-[14px] font-medium"></div></label>`;
    const PAGES = {
      search: `<div class="text-[22px] font-bold">✈ SkyFly <span class="text-[12px] font-normal text-[#789]">(вымышленный сайт)</span></div><div class="text-[13px] text-[#678] mb-4">Поиск авиабилетов</div>
        <div class="grid grid-cols-2 gap-3">${inp('cu-from', 'Откуда')}${inp('cu-to', 'Куда')}${inp('cu-date', 'Дата')}${inp('cu-pax', 'Пассажиры')}</div>
        <button id="cu-search" class="mt-5 w-full h-11 rounded-lg border-0 bg-[#ff7a2f] text-white font-bold text-[15px]">Найти билеты</button>`,
      results: `<div class="text-[15px] font-bold mb-3">Москва → Стамбул · пт, 23 октября</div>${[['cu-r0', 'Pegasus · 1 пересадка', '06:10 → 13:40', '11 900 ₽'], ['cu-r1', 'SU 2136 · прямой', '14:25 → 18:05', '18 450 ₽'], ['cu-r2', 'Turkish · прямой', '21:40 → 01:20', '21 300 ₽']].map(r => `<div id="${r[0]}" class="flex items-center gap-3 rounded-lg border border-solid border-[#d5dde4] bg-white p-3 mb-2 transition"><div class="flex-1"><div class="font-semibold">${r[1]}</div><div class="text-[12px] text-[#678]">${r[2]}</div></div><div class="font-bold text-[16px]">${r[3]}</div></div>`).join('')}`,
      pax: `<div class="text-[15px] font-bold mb-3">Пассажир и место · SU 2136</div>${inp('cu-name', 'Имя и фамилия (латиницей)')}<div class="text-[11px] text-[#678] mt-4 mb-1">Выберите место</div>
        <div class="grid grid-cols-6 gap-1.5 w-60">${'ABCDEF'.split('').map((c, i) => [1, 2, 3, 4].map(r => `<div id="cu-s${r}${c}" class="h-7 rounded text-[10px] grid place-items-center ${(r * 7 + i) % 3 === 0 ? 'bg-[#cfd6dc] text-[#9aa]' : 'bg-white border border-solid border-[#c9d3dc]'}">${r}${c}</div>`).join('')).join('')}</div>
        <button id="cu-pay" class="mt-5 w-full h-11 rounded-lg border-0 bg-[#ff7a2f] text-white font-bold">Перейти к оплате · 18 450 ₽</button>`,
    };
    const goPage = (k, url) => { page.innerHTML = PAGES[k]; $('#cu-url').textContent = url };
    const move = async id => { if (!alive(tok) || stopped || !$(id)) return; const t = $(id), a = br.getBoundingClientRect(), b = t.getBoundingClientRect(); cur.style.left = (b.left - a.left + b.width * .5) + 'px'; cur.style.top = (b.top - a.top + b.height * .55) + 'px'; await sleep(750) };
    const click = async id => { await move(id); if (!alive(tok) || stopped || !$(id)) return; const a = br.getBoundingClientRect(), b = $(id).getBoundingClientRect(); const r = document.createElement('div'); r.className = 'absolute z-10 w-10 h-10 -ml-5 -mt-5 rounded-full border-2 border-solid border-[#00d4ff] animate-ping pointer-events-none'; r.style.left = (b.left - a.left + b.width * .5) + 'px'; r.style.top = (b.top - a.top + b.height * .55) + 'px'; br.append(r); setTimeout(() => r.remove(), 600); $(id).style.outline = '2px solid #00d4ff'; await sleep(350) };
    const type = async (id, text) => { await click(id); for (const ch of text) { if (stopped || !alive(tok)) return; $(id).textContent += ch; await sleep(55) } $(id).style.outline = '' };
    let n = 0; const say = (th, act) => { n++; const d = document.createElement('div'); d.className = 'tile-in rounded-lg border border-solid border-jv-line p-2'; d.innerHTML = `<div class="flex gap-2 items-start"><span class="font-mono text-[10px] text-jv-mute mt-0.5">${String(n).padStart(2, '0')}</span><div class="w-10 h-7 rounded bg-white/10 border border-solid border-jv-line shrink-0 grid place-items-center text-[10px]">📸</div><div><div class="text-jv-purple">🧠 ${esc(th)}</div><div class="font-mono text-[11px] text-jv-cyan mt-0.5">🖱 ${esc(act)}</div></div></div>`; $('#cu-log').append(d); $('#cu-log').scrollTop = 1e9 };
    const modal = html => { $('#cu-modal').innerHTML = html; $('#cu-modal').classList.remove('hidden') };
    const STEPS = [
      ['Открываю сайт авиабилетов', 'navigate("skyfly.example")', async () => { goPage('search', 'https://skyfly.example/'); await sleep(600) }],
      ['Поле «Откуда» пустое — ввожу город', 'type("Москва")', () => type('#cu-from', 'Москва')],
      ['Город назначения', 'type("Стамбул")', () => type('#cu-to', 'Стамбул')],
      ['Ближайшая пятница — 23 октября', 'type("23.10.2026")', () => type('#cu-date', 'пт, 23 окт')],
      ['Один пассажир — вы', 'type("1 взрослый")', () => type('#cu-pax', '1 взрослый')],
      ['Нажимаю «Найти»', 'click(Найти билеты)', async () => { await click('#cu-search'); goPage('results', 'https://skyfly.example/search?MOW-IST'); await sleep(500) }],
      ['Сравниваю: дешёвый с пересадкой — нет, вы просили прямой. SU 2136 удобнее Turkish по времени', 'click(SU 2136)', async () => { await move('#cu-r0'); await move('#cu-r2'); await click('#cu-r1'); $('#cu-r1').style.background = '#e6faff'; await sleep(400); goPage('pax', 'https://skyfly.example/booking/SU2136') }],
      ['Беру данные из вашего профиля', 'type("TONY STARK")', () => type('#cu-name', 'TONY STARK')],
      ['Место у окна, ближе к выходу — 1A свободно', 'click(seat 1A)', async () => { await click('#cu-s1A'); $('#cu-s1A').style.background = '#00d4ff'; $('#cu-s1A').style.color = '#012' }],
      ['Дальше — оплата. Деньги без вашего «да» не трачу', 'request_approval(18 450 ₽)', async () => { await move('#cu-pay'); return 'confirm' }],
    ];
    $('#cu-go').onclick = async () => {
      stopped = false; n = 0; $('#cu-log').innerHTML = ''; $('#cu-go').disabled = true; $('#cu-stop').disabled = false; $('#cu-ctl').classList.remove('hidden'); $('#cu-modal').classList.add('hidden');
      for (const [th, act, fn] of STEPS) {
        if (stopped || !alive(tok)) return; say(th, act); const r = await fn(); await sleep(250);
        if (r === 'confirm') {
          modal(`<div class="bg-[#06141d] text-jv-text border border-solid border-jv-gold rounded-2xl p-5 max-w-sm shadow-[0_0_40px_rgba(255,181,71,.3)]"><div class="jv-label !text-jv-gold">🔐 Нужно ваше разрешение</div><div class="text-[15px] mt-3">Джарвис хочет оплатить <b class="text-jv-gold">18 450 ₽</b></div><div class="jv-sub mt-1">SkyFly · SU 2136 · 23 окт 14:25 · место 1A · карта •• 4242</div><div class="flex gap-2 mt-4"><button id="cu-ok" class="jv-btn !border-jv-green !text-jv-green !bg-jv-green/10 flex-1">✓ РАЗРЕШИТЬ</button><button id="cu-no" class="jv-btn !border-jv-red !text-jv-red !bg-jv-red/10 flex-1">✗ НЕТ</button></div><div class="jv-sub mt-3">Также можно ответить голосом или 👍 / 👎 жестом</div></div>`);
          $('#cu-ok').onclick = async () => { $('#cu-modal').classList.add('hidden'); say('Оплата разрешена вами — нажимаю', 'click(Оплатить)'); await click('#cu-pay'); page.innerHTML = `<div class="h-full grid place-items-center text-center"><div><div class="text-5xl">✅</div><div class="text-[20px] font-bold mt-2">Билет оформлен</div><div class="text-[#678] mt-1">SU 2136 · 23 октября · 14:25 · место 1A</div><div class="text-[12px] text-[#678] mt-3">посадочный добавлен в Wallet и дашборд «Поездка»</div></div></div>`; $('#cu-url').textContent = 'https://skyfly.example/booking/done'; fin('✅ Готово за ' + n + ' шагов') };
          $('#cu-no').onclick = () => { $('#cu-modal').classList.add('hidden'); say('Вы отказали — ничего не покупаю', 'stop()'); fin('Отменено вами, бронь удержана 15 минут') };
          return;
        }
      }
    };
    const fin = msg => { if (!alive(tok)) return; $('#cu-go').disabled = false; $('#cu-go').textContent = '↻ ЗАНОВО'; $('#cu-stop').disabled = true; $('#cu-ctl').classList.add('hidden'); toast('🖱 ' + msg) };
    $('#cu-stop').onclick = () => { stopped = true; say('Остановлен пользователем — отпускаю мышь и клавиатуру', 'release_control()'); $('#cu-modal').classList.add('hidden'); fin('⛔ Агент остановлен') };
    return () => { stopped = true };
  }
});

/* ===================== 04 · ГОЛОГРАММА 3D ===================== */
LAB.push({
  icon: '🌀', t: 'Голограмма 3D', s: 'крути, разбирай, жесты', d: 'Модели как в фильме: вращай мышкой, разбирай на детали, кликай по детали. С камерой во вкладке «Жесты»: 👈👉 — вращать, 🖐 — разобрать, ✊ — собрать.',
  r(el, tok) {
    el.innerHTML = `<div class="grid grid-cols-1 xl:grid-cols-4 gap-3">
      <div class="xl:col-span-3 jv-tile !p-0 relative overflow-hidden" style="height:520px;background:radial-gradient(ellipse at 50% 85%,rgba(0,212,255,.25),rgba(2,10,16,.95) 60%)">
        <div id="hg-wrap" class="absolute inset-0 cursor-grab"></div>
        <div class="absolute inset-0 pointer-events-none" style="background:repeating-linear-gradient(0deg,rgba(0,212,255,.05) 0 1px,transparent 1px 4px)"></div>
        <div class="absolute left-4 top-3 pointer-events-none"><div id="hg-title" class="font-hud text-jv-cyan tracking-[.3em] text-[13px]">ГОЛОГРАММА</div><div id="hg-sel" class="jv-sub mt-1">загрузка three.js…</div></div>
        <div class="absolute right-3 top-3 flex gap-1.5"><button id="hg-ex" class="jv-badge border-jv-gold text-jv-gold bg-black/50 cursor-pointer">💥 разобрать</button><button id="hg-rot" class="jv-badge border-jv-cyan text-jv-cyan bg-black/50 cursor-pointer">⟳ авто</button></div>
        <div class="absolute left-0 right-0 bottom-3 text-center jv-sub pointer-events-none">тяни — вращать · колесо — зум · клик по детали — подробности</div></div>
      <div class="flex flex-col gap-3">
        <div class="jv-tile">${L('Модель')}<div id="hg-models" class="grid grid-cols-2 gap-2"></div></div>
        <div class="jv-tile flex-1">${L('Детали')}<div id="hg-parts" class="space-y-1"></div><div id="hg-info" class="mt-3 text-[13px] leading-relaxed text-jv-text"></div></div></div></div>`;
    let stop = false, R, raf; const cleanup = () => { stop = true; cancelAnimationFrame(raf); window.holoGesture = null; try { R?.dispose(); R?.domElement.remove() } catch (e) { } };
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js').then(() => {
      if (stop || !alive(tok)) return; const T = THREE, wrap = $('#hg-wrap');
      let W = wrap.clientWidth, H = wrap.clientHeight;
      R = new T.WebGLRenderer({ antialias: true, alpha: true }); R.setPixelRatio(devicePixelRatio); R.setSize(W, H); wrap.append(R.domElement);
      const scene = new T.Scene(), cam = new T.PerspectiveCamera(45, W / H, .1, 100); cam.position.set(0, .4, 7.5);
      const mat = (c = 0x00d4ff, o = .85, wf = true) => new T.MeshBasicMaterial({ color: c, wireframe: wf, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false });
      const grid = new T.GridHelper(12, 24, 0x00d4ff, 0x004a63); grid.position.y = -2.4; grid.material.transparent = true; grid.material.opacity = .3; scene.add(grid);
      const beam = new T.Mesh(new T.CylinderGeometry(2.4, .3, 4.6, 48, 1, true), new T.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: .05, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); beam.position.y = -.1; scene.add(beam);
      const dust = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(Array.from({ length: 900 }, () => (Math.random() - .5) * 9), 3)), new T.PointsMaterial({ color: 0x5ff3ff, size: .02, transparent: true, opacity: .5 })); scene.add(dust);
      let root = new T.Group(); scene.add(root); let parts = [], ex = 0, exT = 0, auto = true, selP = null;
      const V = (x, y, z) => new T.Vector3(x, y, z);
      const MODELS = {
        reactor: ['Дуговой реактор', () => {
          const P = [];
          const core = new T.Mesh(new T.SphereGeometry(.45, 20, 14), mat(0xffffff, .9)); P.push(['Ядро', 'Палладиевое ядро: источник энергии. Светится от реакции внутри.', core, V(0, 0, 1.6)]);
          const r1 = new T.Mesh(new T.TorusGeometry(.85, .07, 10, 60), mat()); P.push(['Внутреннее кольцо', 'Удерживает плазму вокруг ядра магнитным полем.', r1, V(0, 0, .9)]);
          const coils = new T.Group(); for (let i = 0; i < 10; i++) { const b = new T.Mesh(new T.BoxGeometry(.28, .52, .2), mat(0x5ff3ff, .8)); const a = i / 10 * Math.PI * 2; b.position.set(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0); b.rotation.z = a + Math.PI / 2; coils.add(b) } P.push(['Катушки ×10', 'Электромагнитные катушки: разгоняют и стабилизируют поле.', coils, V(0, 0, 0)]);
          const r2 = new T.Mesh(new T.TorusGeometry(1.8, .09, 10, 80), mat(0x00d4ff, .7)); P.push(['Внешнее кольцо', 'Корпус-радиатор, отводит тепло.', r2, V(0, 0, -1)]);
          const h = new T.Mesh(new T.CylinderGeometry(2, 2, .5, 64, 1, true), mat(0x0090c0, .35)); h.rotation.x = Math.PI / 2; P.push(['Корпус', 'Титановый корпус, вставляется в грудь костюма.', h, V(0, 0, -1.9)]);
          coils.userData.spread = true; return P;
        }],
        earth: ['Земля и спутники', () => {
          const P = []; const s = new T.Mesh(new T.SphereGeometry(1.5, 28, 18), mat(0x00d4ff, .5)); P.push(['Планета', 'Каркас Земли, 28×18 сегментов.', s, V(0, 0, 0)]);
          const atm = new T.Mesh(new T.SphereGeometry(1.68, 24, 16), mat(0x3dffa8, .12)); P.push(['Атмосфера', 'Тонкая оболочка — здесь живёт погода.', atm, V(0, 1.4, 0)]);
          const pts = []; for (let i = 0; i < 70; i++) { const la = (Math.random() - .5) * Math.PI * .8, lo = Math.random() * Math.PI * 2; pts.push(Math.cos(la) * Math.cos(lo) * 1.52, Math.sin(la) * 1.52, Math.cos(la) * Math.sin(lo) * 1.52) }
          const c = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(pts, 3)), new T.PointsMaterial({ color: 0xffb547, size: .07, transparent: true, blending: T.AdditiveBlending })); P.push(['Города', '70 точек данных: офисы Stark Industries по миру.', c, V(0, 0, 1.5)]);
          const orb = new T.Group(); const ring = new T.Mesh(new T.TorusGeometry(2.4, .01, 6, 120), mat(0xb48cff, .6)); orb.add(ring); const sat = new T.Mesh(new T.BoxGeometry(.18, .1, .1), mat(0xffffff, 1, false)); sat.position.x = 2.4; orb.add(sat); orb.rotation.x = 1.1; orb.userData.spin = true; P.push(['Спутник на орбите', 'Спутник связи Stark-Sat 7, орбита ~550 км.', orb, V(0, -1.4, 0)]);
          return P;
        }],
        molecule: ['Молекула кофеина', () => {
          const P = [], A = (p, c, r = .22) => { const m = new T.Mesh(new T.SphereGeometry(r, 16, 12), mat(c, .9, false)); m.position.copy(p); return m };
          const B = (a, b) => { const d = b.clone().sub(a), m = new T.Mesh(new T.CylinderGeometry(.05, .05, d.length(), 8), mat(0x9fc3d4, .7, false)); m.position.copy(a.clone().add(b).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m };
          const hex = [...Array(6)].map((_, i) => V(Math.cos(i * Math.PI / 3 + Math.PI / 6) * .9 - .45, Math.sin(i * Math.PI / 3 + Math.PI / 6) * .9, 0));
          const g1 = new T.Group(); hex.forEach((p, i) => { g1.add(A(p, i % 3 === 1 ? 0x7aa2ff : 0x5ff3ff)); g1.add(B(p, hex[(i + 1) % 6])) }); P.push(['Шестичленное кольцо', 'Пиримидиновое кольцо: 4 углерода и 2 азота.', g1, V(-1.2, 0, 0)]);
          const p0 = hex[0], p5 = hex[5], pen = [V(.95, .35, 0), V(1.3, -.15, 0), V(.95, -.65, 0)]; const g2 = new T.Group(); pen.forEach(p => g2.add(A(p, 0x7aa2ff))); g2.add(B(p0, pen[0])); g2.add(B(pen[0], pen[1])); g2.add(B(pen[1], pen[2])); g2.add(B(pen[2], p5)); P.push(['Пятичленное кольцо', 'Имидазол: делает кофеин похожим на аденозин — поэтому он бодрит.', g2, V(1.3, 0, 0)]);
          const o1 = V(-.45, 1.75, 0), o2 = V(-1.95, -.45, 0); const g3 = new T.Group(); g3.add(A(o1, 0xff4d5e, .25)); g3.add(A(o2, 0xff4d5e, .25)); g3.add(B(hex[2], o1)); g3.add(B(hex[3], o2)); P.push(['Кислород ×2', 'Карбонильные группы C=O.', g3, V(0, 1.2, .8)]);
          const g4 = new T.Group(); [[hex[1], V(.55, 1.6, .2)], [hex[4], V(-1.2, -1.5, .2)], [pen[0], V(1.4, 1.1, -.2)]].forEach(([a, b]) => { g4.add(A(b, 0xb48cff, .2)); g4.add(B(a, b)) }); P.push(['Метильные группы ×3', 'CH₃ — три «хвостика».', g4, V(0, -1.2, 1)]);
          return P;
        }],
        city: ['Город · данные', () => {
          const P = [], hi = new T.Group(), lo = new T.Group();
          for (let x = -3; x <= 3; x++)for (let z = -3; z <= 3; z++) { if (Math.random() < .2) continue; const h = Math.random() ** 2 * 2.8 + .2; const m = new T.Mesh(new T.BoxGeometry(.38, h, .38), mat(h > 1.6 ? 0xffb547 : 0x00d4ff, h > 1.6 ? .9 : .55)); m.position.set(x * .55, h / 2 - 1.4, z * .55); (h > 1.6 ? hi : lo).add(m) }
          P.push(['Небоскрёбы', 'Здания выше 1.6 — подсвечены жёлтым: тут больше всего энергопотребления.', hi, V(0, 1.2, 0)]); P.push(['Жилые кварталы', 'Остальная застройка.', lo, V(0, 0, 0)]);
          const roads = new T.Mesh(new T.PlaneGeometry(4.2, 4.2, 14, 14), mat(0x3dffa8, .25)); roads.rotation.x = -Math.PI / 2; roads.position.y = -1.4; P.push(['Сетка улиц', 'Дорожный граф: Джарвис считает по нему маршруты.', roads, V(0, -.8, 0)]);
          return P;
        }],
      };
      let curM = 'reactor';
      function build(k) {
        scene.remove(root); root = new T.Group(); scene.add(root); parts = []; selP = null; ex = exT = 0;
        MODELS[k][1]().forEach(([n, d, obj, dir]) => { obj.userData.base = obj.position.clone(); obj.userData.dir = dir; obj.traverse(o => { if (o.material) o.userData.c0 = o.material.color.getHex() }); root.add(obj); parts.push({ n, d, obj }) });
        $('#hg-title').textContent = 'ГОЛОГРАММА · ' + MODELS[k][0].toUpperCase(); $('#hg-sel').textContent = parts.length + ' деталей';
        $('#hg-parts').innerHTML = parts.map((p, i) => `<button data-p="${i}" class="w-full text-left bg-transparent border border-solid border-transparent hover:border-jv-line rounded-md px-2 py-1.5 text-[12.5px] text-jv-text cursor-pointer">◇ ${p.n}</button>`).join('');
        $$('#hg-parts [data-p]').forEach(b => b.onclick = () => pick(parts[+b.dataset.p])); $('#hg-info').innerHTML = '<span class="jv-sub">кликни деталь на голограмме или в списке</span>';
        $$('#hg-models [data-m]').forEach(b => { const on = b.dataset.m === k; b.classList.toggle('!bg-jv-cyan/25', on) });
      }
      function pick(p) {
        selP = p; parts.forEach(q => q.obj.traverse(o => { if (o.material) o.material.color.setHex(q === p ? 0xffb547 : o.userData.c0) }));
        $$('#hg-parts [data-p]').forEach((b, i) => { b.classList.toggle('!border-jv-gold', parts[i] === p); b.classList.toggle('!text-jv-gold', parts[i] === p) });
        $('#hg-info').innerHTML = `<b class="text-jv-gold">${p.n}</b><br>${p.d}`; $('#hg-sel').textContent = '◆ ' + p.n;
      }
      $('#hg-models').innerHTML = Object.entries(MODELS).map(([k, [n]]) => `<button data-m="${k}" class="jv-btn !text-[9.5px] !px-2">${n}</button>`).join('');
      $$('#hg-models [data-m]').forEach(b => b.onclick = () => { curM = b.dataset.m; build(curM) });
      const setEx = v => { exT = v; $('#hg-ex').textContent = v ? '🔽 собрать' : '💥 разобрать' };
      $('#hg-ex').onclick = () => setEx(exT ? 0 : 1);
      $('#hg-rot').onclick = () => { auto = !auto; $('#hg-rot').classList.toggle('opacity-40', !auto) };
      build(curM);
      let drag = null, moved = 0, vy = 0;
      wrap.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; wrap.setPointerCapture(e.pointerId); wrap.style.cursor = 'grabbing' };
      wrap.onpointermove = e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); root.rotation.y += dx * .008; root.rotation.x = Math.max(-1.2, Math.min(1.2, root.rotation.x + dy * .006)); vy = dx * .008; drag = { x: e.clientX, y: e.clientY } };
      wrap.onpointerup = e => {
        wrap.style.cursor = 'grab'; const was = drag; drag = null; if (!was || moved > 6) return;
        const r = wrap.getBoundingClientRect(), m = new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), rc = new T.Raycaster(); rc.params.Points.threshold = .1; rc.setFromCamera(m, cam);
        const hit = rc.intersectObjects(root.children, true)[0]; if (!hit) return; const p = parts.find(q => { let o = hit.object; while (o) { if (o === q.obj) return true; o = o.parent } return false }); if (p) pick(p);
      };
      wrap.onwheel = e => { e.preventDefault(); cam.position.z = Math.max(3.5, Math.min(14, cam.position.z + e.deltaY * .006)) };
      window.holoGesture = k => { if (k === 'Swipe_L') { vy = -.12; return true } if (k === 'Swipe_R') { vy = .12; return true } if (k === 'Open_Palm') { setEx(1); return true } if (k === 'Closed_Fist') { setEx(0); return true } if (k === 'Victory') { const ks = Object.keys(MODELS); curM = ks[(ks.indexOf(curM) + 1) % ks.length]; build(curM); return true } return false };
      const ro = new ResizeObserver(() => { W = wrap.clientWidth; H = wrap.clientHeight; if (!W) return; R.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix() }); ro.observe(wrap);
      const t0 = performance.now();
      (function loop() {
        if (stop || !alive(tok)) { ro.disconnect(); return } raf = requestAnimationFrame(loop); const t = (performance.now() - t0) / 1000;
        ex += (exT - ex) * .08; parts.forEach(p => { p.obj.position.copy(p.obj.userData.base).addScaledVector(p.obj.userData.dir, ex); if (p.obj.userData.spread) p.obj.children.forEach((c, i) => { const a = i / p.obj.children.length * Math.PI * 2; c.position.set(Math.cos(a) * (1.35 + ex * .9), Math.sin(a) * (1.35 + ex * .9), 0) }); if (p.obj.userData.spin) p.obj.rotation.z = t * .6 });
        if (!drag) { root.rotation.y += vy; vy *= .94; if (auto) root.rotation.y += .004 }
        root.position.y = Math.sin(t * 1.2) * .06; dust.rotation.y = t * .02; beam.material.opacity = .045 + Math.sin(t * 3) * .01;
        R.render(scene, cam);
      })();
    }).catch(() => { $('#hg-sel').textContent = 'не удалось загрузить three.js (нужен интернет)' });
    return cleanup;
  }
});

/* ===================== 05 · НАСТРОЙКИ ЛИЧНОСТИ ===================== */
LAB.push({
  icon: '🎭', t: 'Настройки личности', s: 'характер, голос, правила', d: 'Двигай ползунки — меняется системный промпт, и тот же вопрос получает другой ответ.',
  r(el) {
    const SL = [['humor', 'Юмор', 60], ['formal', 'Формальность', 75], ['verbose', 'Многословность', 35], ['init', 'Инициативность', 70], ['sarcasm', 'Сарказм', 40]];
    const VOICES = [['butler', '🎩 Дворецкий', 'британский, бархатный, неторопливый'], ['friday', '👩‍💼 Пятница', 'ирландский акцент, быстрая, деловая'], ['edith', '🕶 Эдит', 'тихая, минимум слов'], ['buddy', '😎 Приятель', 'на «ты», с шутками']];
    const RULES = [['night', 'Не беспокоить после 23:00 (кроме КРИТ)', true], ['sir', 'Обращаться «сэр»', true], ['guests', 'Без шуток при гостях', true], ['buy', 'Покупки > 5 000 ₽ — только с подтверждением', true], ['short', 'В машине — только короткие ответы', false]];
    const Q = [['late', '«Я опаздываю на встречу»'], ['coffee', '«Сколько я потратил на кофе?»'], ['light', '«Включи свет»']];
    const st = { humor: 60, formal: 75, verbose: 35, init: 70, sarcasm: 40, voice: 'butler', q: 'late', rules: Object.fromEntries(RULES.map(r => [r[0], r[2]])) };
    el.innerHTML = `<div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
      <div class="jv-tile">${L('Характер')}${SL.map(([k, n]) => `<div class="mb-3"><div class="flex justify-between text-[12.5px]"><span>${n}</span><span class="font-mono text-jv-cyan" id="pv-${k}"></span></div><input type="range" min="0" max="100" data-k="${k}" class="w-full accent-[#00d4ff]"></div>`).join('')}
        ${L('Голос', 'mt-4')}<div class="grid grid-cols-2 gap-2">${VOICES.map(([k, n, d]) => `<button data-v="${k}" class="text-left rounded-lg border border-solid border-jv-line bg-transparent p-2 cursor-pointer text-jv-text"><div class="text-[13px] font-semibold">${n}</div><div class="jv-sub !text-[10px]">${d}</div></button>`).join('')}</div></div>
      <div class="jv-tile">${L('Правила')}${RULES.map(([k, n]) => `<label class="jv-row cursor-pointer !justify-start"><input type="checkbox" data-r="${k}" class="accent-[#00d4ff]"><span>${n}</span></label>`).join('')}
        ${L('Системный промпт (генерируется)', 'mt-5')}<pre id="pv-prompt" class="code m-0 !text-[11px] whitespace-pre-wrap max-h-64 overflow-auto"></pre></div>
      <div class="jv-tile">${L('Живое превью')}<div class="flex flex-wrap gap-1.5 mb-3">${Q.map(([k, n]) => `<button data-q="${k}" class="chip">${n}</button>`).join('')}</div>
        <div class="rounded-xl bg-jv-green/10 border border-solid border-jv-green/40 px-3 py-2 text-[13px] ml-10" id="pv-ask"></div>
        <div class="rounded-xl bg-jv-cyan/10 border border-solid border-jv-cyan/40 px-3 py-2.5 text-[14px] mr-6 mt-2 leading-relaxed"><div class="font-hud text-[9px] tracking-widest text-jv-cyan mb-1" id="pv-who">ДЖАРВИС</div><div id="pv-ans"></div></div>
        <button id="pv-say" class="jv-btn mt-3">🔊 ПРОИЗНЕСТИ</button>
        <div class="jv-sub mt-4">В реальности всё это — несколько строк системного промпта + выбор голоса в TTS. Модель сама подстраивает стиль.</div></div></div>`;
    const pick = (lo, mid, hi, v) => v < 34 ? lo : v < 67 ? mid : hi;
    function answer() {
      const s = st, addr = s.voice === 'buddy' ? 'бро' : s.rules.sir && s.formal > 40 ? 'сэр' : s.formal > 70 ? 'мистер Старк' : '';
      const A = a => addr ? a.replace('{a}', addr) : a.replace(/,? ?\{a\}/, '');
      const core = {
        late: [A('Понял, {a}. Написал участникам, что вы будете через 10 минут.'), A('Понял, {a}. Предупредил участников стендапа, что задерживаетесь на 10 минут, и перенёс начало на 10:15.'), A('Понял, {a}. Я уже написал всем пятерым участникам стендапа, что вы задерживаетесь примерно на 10 минут — по пробкам на Садовом это реалистично. Начало перенёс на 10:15, Пеппер в курсе.')],
        coffee: [A('Девять тысяч двести рублей за месяц, {a}.'), A('За октябрь — 9 200 ₽, {a}. Это 46 чашек, на 30% больше, чем в сентябре.'), A('За октябрь, {a}, — 9 200 ₽: 46 чашек, в среднем 200 ₽. Это на 30% больше сентября; пик — дни перед Expo. Дома кофемашина обходится в 35 ₽ за чашку.')],
        light: [A('Включил.'), A('Включил свет в гостиной, {a}.'), A('Включил свет в гостиной на 80%, {a}, — на улице уже темнеет. Если нужно, могу сделать тёплый оттенок для вечера.')],
      }[s.q][pick(0, 1, 2, s.verbose)];
      const jokes = { late: ['Пробки, как и физика, пока мне не подчиняются.', 'Классическое опоздание Старка — на 10 минут, а не на 40. Прогресс.'], coffee: ['Кровь у вас, судя по всему, уже на 40% эспрессо.', 'Если бы кофе был акцией, вы бы уже были мажоритарием.'], light: ['Да будет свет.', 'Тьма отступает, сэр. Опять.'] }[s.q];
      let out = core; if (s.humor > 55 && !(s.rules.guests && false)) out += ' ' + jokes[s.sarcasm > 55 ? 1 : 0];
      if (s.init > 60) out += { late: ' Вызвать Хэппи к подъезду?', coffee: ' Поставить лимит на кофе в бюджете?', light: ' Включить вечернюю сцену целиком?' }[s.q];
      if (s.voice === 'edith') out = core.split('.')[0] + '.';
      if (s.voice === 'buddy') out = out.replace(/Понял/, 'Окей').replace(/Включил/, 'Готово, включил');
      return out;
    }
    function render() {
      SL.forEach(([k]) => { $(`[data-k="${k}"]`).value = st[k]; $('#pv-' + k).textContent = st[k] });
      $$('[data-v]').forEach(b => { const on = b.dataset.v === st.voice; b.classList.toggle('!border-jv-cyan', on); b.classList.toggle('!bg-jv-cyan/10', on) });
      $$('[data-r]').forEach(c => c.checked = st.rules[c.dataset.r]); $$('[data-q]').forEach(b => b.classList.toggle('!border-jv-cyan', b.dataset.q === st.q));
      $('#pv-ask').textContent = Q.find(q => q[0] === st.q)[1].replace(/[«»]/g, '');
      $('#pv-who').textContent = VOICES.find(v => v[0] === st.voice)[1].split(' ')[1].toUpperCase();
      $('#pv-ans').textContent = answer();
      const lv = (v, a, b, c) => v < 34 ? a : v < 67 ? b : c;
      $('#pv-prompt').textContent = `Ты — ${{ butler: 'Джарвис, британский дворецкий', friday: 'Пятница, деловая ассистентка', edith: 'Эдит, немногословный ассистент', buddy: 'Джарвис, приятель на «ты»' }[st.voice]}.
Юмор: ${lv(st.humor, 'не шути', 'изредка лёгкая шутка', 'шути охотно, сухо и по-британски')}.
Тон: ${lv(st.formal, 'неформальный, на «ты»', 'вежливый, нейтральный', 'подчёркнуто вежливый')}.
Длина: ${lv(st.verbose, '1 фраза', '1–2 предложения', 'подробно, с контекстом и цифрами')}.
Инициатива: ${lv(st.init, 'только отвечай', 'иногда предлагай', 'всегда предлагай следующий шаг')}.
Сарказм: ${lv(st.sarcasm, 'нет', 'лёгкая ирония', 'ощутимый, но без грубости')}.
${RULES.filter(r => st.rules[r[0]]).map(r => '• ' + r[1]).join('\n')}`;
    }
    $$('[data-k]').forEach(i => i.oninput = () => { st[i.dataset.k] = +i.value; render() });
    $$('[data-v]').forEach(b => b.onclick = () => { st.voice = b.dataset.v; render() });
    $$('[data-r]').forEach(c => c.onchange = () => { st.rules[c.dataset.r] = c.checked; render() });
    $$('[data-q]').forEach(b => b.onclick = () => { st.q = b.dataset.q; render() });
    $('#pv-say').onclick = () => speakAs($('#pv-ans').textContent, { pitch: { butler: .8, friday: 1.3, edith: 1.1, buddy: 1 }[st.voice], rate: { butler: .95, friday: 1.15, edith: 1, buddy: 1.1 }[st.voice] });
    render();
  }
});

/* ===================== 06 · ПРАВА И БЕЗОПАСНОСТЬ ===================== */
LAB.push({
  icon: '🛡', t: 'Права и безопасность', s: 'что ему можно, журнал, «забыть»', d: 'Вы решаете, к чему у Джарвиса доступ. Каждое действие пишется в журнал, любое воспоминание можно стереть.',
  r(el) {
    const PERM = [['mail', '📧 Почта', ['нет', 'читать', 'черновики', 'отправлять ✋', 'отправлять'], 3], ['money', '💳 Деньги', ['нет', 'до 1 000 ₽', 'до 10 000 ₽ ✋', 'любые ✋'], 2], ['lock', '🔒 Замок', ['нет', 'закрывать', 'открывать ✋'], 2], ['cam', '📹 Камеры', ['нет', 'только движение', 'видео'], 1], ['files', '📁 Файлы', ['нет', '~/Jarvis', 'весь диск (чтение)'], 1], ['web', '🌐 Браузер', ['нет', 'читать', 'действовать ✋'], 2], ['mic', '🎙 Микрофон', ['только wake word', 'всегда слушать'], 0]];
    const st = Object.fromEntries(PERM.map(p => [p[0], p[3]]));
    const MEM = ['Любит чёрный кофе без сахара', 'Пароль от гостевого Wi-Fi спрашивать у Пеппер', 'Аллергия на клубнику', 'Обсуждали продажу акций (12 окт, 22:40)', 'Машина на парковке, место 42', 'Мама — день рождения 12 марта'];
    const REQ = [['📧 Агент «Почта» хочет отправить отчёт инвесторам', 'mail', 3], ['💳 Агент хочет оплатить подписку 15 000 ₽', 'money', 2], ['🔒 Гость просит открыть входную дверь', 'lock', 2], ['📁 Агент хочет прочитать ~/Documents/taxes.pdf', 'files', 2], ['🎙 Включить постоянное прослушивание для заметок', 'mic', 1]];
    el.innerHTML = `<div id="sec-root" class="relative grid grid-cols-1 xl:grid-cols-3 gap-3">
      <div class="jv-tile xl:col-span-2">${L('Доступы · ✋ = каждый раз спрашивать')}<div class="space-y-2">${PERM.map(([k, n, o]) => `<div class="flex flex-wrap items-center gap-2"><span class="w-28 text-[13px]">${n}</span><div class="flex flex-wrap rounded-lg overflow-hidden border border-solid border-jv-line" data-perm="${k}">${o.map((x, i) => `<button data-i="${i}" class="px-2.5 py-1.5 text-[11.5px] border-0 bg-transparent text-jv-mute cursor-pointer">${x}</button>`).join('')}</div></div>`).join('')}</div>
        ${L('Проверить на запросе', 'mt-5')}<div class="flex flex-wrap gap-1.5">${REQ.map((r, i) => `<button data-req="${i}" class="chip">${r[0]}</button>`).join('')}</div></div>
      <div class="flex flex-col gap-3">
        <div class="jv-tile">${L('Статус')}<div class="grid grid-cols-3 gap-2 text-center text-[11px]"><div><div class="text-xl" id="ind-mic">🎙</div><div class="jv-sub">wake word</div></div><div><div class="text-xl">📹</div><div class="jv-sub">выкл</div></div><div><div class="text-xl">☁️</div><div class="jv-sub">только LLM</div></div></div>
          <button id="sec-kill" class="w-full mt-4 rounded-xl border-2 border-solid border-jv-red bg-jv-red/15 text-jv-red font-hud font-bold tracking-widest py-3 cursor-pointer">⛔ АВАРИЙНАЯ ОСТАНОВКА</button></div>
        <div class="jv-tile">${L('Что он помнит о вас')}<div id="sec-mem" class="space-y-1"></div><div class="flex gap-2 mt-3"><button id="sec-hour" class="jv-badge border-jv-red text-jv-red bg-transparent cursor-pointer">🧹 забыть последний час</button><button id="sec-exp" class="jv-badge border-jv-line text-jv-mute bg-transparent cursor-pointer">⬇ экспорт</button></div></div></div>
      <div class="jv-tile xl:col-span-3">${L('Журнал действий агента')}<div id="sec-log" class="font-mono text-[11.5px] space-y-1 max-h-56 overflow-y-auto"></div></div></div>`;
    const logL = (ic, t, cls) => { const d = document.createElement('div'); d.className = 'tile-in flex gap-3'; d.innerHTML = `<span class="text-jv-mute">${new Date().toLocaleTimeString('ru-RU')}</span><span>${ic}</span><span class="${cls}">${esc(t)}</span>`; $('#sec-log').prepend(d) };
    [['✅', 'calendar.read — утренний брифинг', 'text-jv-green'], ['✅', 'home.light(on) — «включи свет»', 'text-jv-green'], ['❓', 'email.send(инвесторам) — спросил вас → одобрено', 'text-jv-gold'], ['⛔', 'files.read(~/Documents/passport.pdf) — запрещено правилом', 'text-jv-red'], ['✅', 'web.search — новости ИИ', 'text-jv-green']].forEach(x => logL(...x));
    function render() { PERM.forEach(([k, , o]) => $$(`[data-perm="${k}"] button`).forEach((b, i) => { const on = i === st[k]; b.classList.toggle('!bg-jv-cyan/25', on); b.classList.toggle('!text-jv-cyan', on); b.classList.toggle('font-semibold', on) })); $('#ind-mic').textContent = st.mic ? '🔴' : '🎙' }
    $$('[data-perm]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => { const k = g.dataset.perm; st[k] = +b.dataset.i; render(); logL('⚙️', `права: ${PERM.find(p => p[0] === k)[1]} → ${b.textContent}`, 'text-jv-cyan') }));
    $$('[data-req]').forEach(b => b.onclick = () => {
      const [t, k, need] = REQ[+b.dataset.req], lvl = st[k], opt = PERM.find(p => p[0] === k)[2][lvl];
      if (lvl < need) { logL('⛔', `${t} — заблокировано (сейчас: «${opt}»)`, 'text-jv-red'); toast('⛔ Заблокировано правами') }
      else if (opt.includes('✋')) { logL('❓', `${t} — спросил вас на телефоне`, 'text-jv-gold'); toast('❓ Джарвис спрашивает разрешение') }
      else { logL('✅', `${t} — выполнено`, 'text-jv-green'); toast('✅ Разрешено правами') }
    });
    const mem = () => { $('#sec-mem').innerHTML = MEM.map((m, i) => `<div class="flex items-center gap-2 text-[12.5px] py-1 border-0 border-b border-dashed border-jv-line"><span class="flex-1">${esc(m)}</span><button data-f="${i}" class="bg-transparent border-0 cursor-pointer text-jv-mute hover:text-jv-red">🗑</button></div>`).join('') || '<div class="jv-sub">пусто</div>'; $$('[data-f]').forEach(b => b.onclick = () => { const [m] = MEM.splice(+b.dataset.f, 1); logL('🗑', `memory.forget — «${m}» (из векторов и графа)`, 'text-jv-purple'); mem() }) };
    mem();
    $('#sec-hour').onclick = () => { const i = MEM.findIndex(m => m.includes('акций')); if (i >= 0) { MEM.splice(i, 1); mem() } logL('🧹', 'memory.forget(since=1h) — стёрто 1 воспоминание и 4 реплики', 'text-jv-purple'); toast('🧹 Последний час забыт') };
    $('#sec-exp').onclick = () => toast('⬇ Архив jarvis-export.zip: память, журнал, настройки (демо)');
    $('#sec-kill').onclick = () => {
      const o = document.createElement('div'); o.className = 'absolute inset-0 z-20 rounded-xl grid place-items-center text-center bg-[#2a0008]/90 backdrop-blur border-2 border-solid border-jv-red';
      o.innerHTML = `<div><div class="text-5xl">⛔</div><div class="font-hud text-jv-red text-xl tracking-widest mt-2">ВСЁ ОСТАНОВЛЕНО</div><div class="text-[13px] mt-2">4 агента остановлены · токены доступа отозваны · микрофон и камеры выключены</div><button class="jv-btn mt-4" id="sec-back">ВОССТАНОВИТЬ</button></div>`;
      $('#sec-root').append(o); logL('⛔', 'KILL SWITCH — все агенты остановлены, ключи отозваны', 'text-jv-red'); speakAs('Все системы остановлены.');
      $('#sec-back').onclick = () => { o.remove(); logL('✅', 'системы восстановлены владельцем', 'text-jv-green') };
    };
    render();
  }
});
