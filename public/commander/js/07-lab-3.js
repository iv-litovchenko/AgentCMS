/* ЛАБОРАТОРИЯ, часть 3: 16 новых демо (13–28) + меню с группами */
LAB.forEach(m => m.group ||= 'Основное');
labBuild = function () {
  const nav = $('#labnav'); if (nav.children.length) return; let g = null;
  nav.innerHTML = LAB.map((m, i) => { const head = m.group !== g ? `<div class="font-hud text-[9px] tracking-[.25em] text-jv-mute px-3 pt-3 pb-1 shrink-0 whitespace-nowrap">${(g = m.group).toUpperCase()}</div>` : ''; return head + `<button data-i="${i}" class="lab-item w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border border-solid border-transparent bg-transparent cursor-pointer text-jv-text hover:bg-jv-cyan/5 shrink-0"><span class="text-lg w-7 text-center">${m.icon}</span><span class="min-w-0"><span class="block text-[12.5px] font-semibold leading-tight">${m.t}</span><span class="block jv-sub !text-[10px] truncate">${m.s}</span></span><span class="ml-auto font-mono text-[10px] text-jv-mute">${String(i + 1).padStart(2, '0')}</span></button>` }).join('');
  $$('#labnav .lab-item').forEach(b => b.onclick = () => labOpen(+b.dataset.i));
};
const bubble = (who, html) => `<div class="tile-in ${who === 'u' ? 'ml-12 bg-jv-green/10 border-jv-green/40' : who === 'j' ? 'mr-12 bg-jv-cyan/10 border-jv-cyan/40' : 'mx-6 bg-jv-purple/10 border-jv-purple/40 font-mono text-[11px] text-jv-purple'} rounded-xl border border-solid px-3 py-2 text-[13.5px]">${html}</div>`;
const chips = (arr, attr) => arr.map((x, i) => `<button data-${attr}="${i}" class="chip">${x}</button>`).join('');

/* ===================== 13 · ПЕРЕСПРОС И ОТМЕНА ===================== */
LAB.push({
  group: 'Чего не хватало', icon: '🔁', t: 'Переспрос и отмена', s: '«нет, я имел в виду…», «отмени»', d: 'Хороший ассистент переспрашивает, когда не уверен, понимает поправки и умеет отменять свои действия.',
  r(el) {
    const ROOMS = ['гостиная', 'кухня', 'кабинет'];
    const SAY = ['«Включи свет в спальне»', '«В гостиной»', '«Нет, я имел в виду на кухне»', '«Сделай поярче»', '«Отмени последнее»', '«Отмени всё за минуту»'];
    const st = { гостиная: 0, кухня: 0, кабинет: 0 }, stack = []; let last = null;
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="jv-tile lg:col-span-2">${L('Диалог · жми реплики по порядку')}<div class="flex flex-wrap gap-1.5 mb-3">${chips(SAY, 'say')}</div><div id="rp-log" class="space-y-2 min-h-[300px] max-h-[420px] overflow-y-auto"></div></div>
      <div class="flex flex-col gap-3"><div class="jv-tile">${L('Свет')}<div id="rp-rooms" class="space-y-2"></div></div><div class="jv-tile">${L('Стек отмены')}<div id="rp-stack" class="font-mono text-[11.5px] space-y-1"></div><div class="jv-sub mt-2">каждое действие хранит, как его откатить</div></div></div></div>`;
    const draw = () => { $('#rp-rooms').innerHTML = ROOMS.map(r => `<div class="flex items-center gap-2 text-[13px]"><span class="w-20">${r}</span><div class="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-jv-gold transition-all duration-500" style="width:${st[r]}%"></div></div><span class="font-mono text-[11px] w-10 text-right">${st[r]}%</span></div>`).join(''); $('#rp-stack').innerHTML = stack.slice().reverse().map(s => `<div>↶ ${s.room}: ${s.from}% → ${s.to}%</div>`).join('') || '<div class="jv-sub">пусто</div>' };
    const act = (room, to) => { stack.push({ room, from: st[room], to }); st[room] = to; last = room; draw() };
    const out = (w, h) => { $('#rp-log').insertAdjacentHTML('beforeend', bubble(w, h)); $('#rp-log').scrollTop = 1e9 };
    const R2 = [
      () => { out('u', 'Включи свет в спальне'); out('t', 'намерение: light.on · комната «спальня» не найдена → уверенность 0.31 → переспросить'); out('j', 'Спальни у меня в списке нет, сэр. Вы имели в виду <b>гостиную</b>, <b>кухню</b> или <b>кабинет</b>?'); speakAs('Спальни у меня нет. Гостиная, кухня или кабинет?') },
      () => { out('u', 'В гостиной'); act('гостиная', 80); out('j', 'Включил свет в гостиной. Запомнить, что «спальня» — это гостиная?') },
      () => { out('u', 'Нет, я имел в виду на кухне'); out('t', 'поправка → откатить последнее действие (гостиная 80→0) и применить к «кухня»'); const s = stack.pop(); if (s) st[s.room] = s.from; act('кухня', 80); out('j', 'Понял: выключил в гостиной, включил на кухне.') },
      () => { out('u', 'Сделай поярче'); out('t', 'контекст: последний объект — кухня · «поярче» = +20%'); last ||= 'кухня'; act(last, Math.min(100, st[last] + 20)); out('j', `Кухня — ${st[last]}%.`) },
      () => { out('u', 'Отмени последнее'); const s = stack.pop(); if (s) { st[s.room] = s.from; draw(); out('j', `Вернул: ${s.room} — ${s.from}%.`) } else out('j', 'Отменять нечего, сэр.') },
      () => { out('u', 'Отмени всё за минуту'); let n = 0; while (stack.length) { const s = stack.pop(); st[s.room] = s.from; n++ } draw(); out('j', n ? `Откатил ${n} действий. Всё как было.` : 'Отменять нечего.') },
    ];
    $$('[data-say]').forEach(b => b.onclick = () => R2[+b.dataset.say]()); draw();
  }
});

/* ===================== 14 · КОНТЕКСТ РАЗГОВОРА ===================== */
LAB.push({
  group: 'Чего не хватало', icon: '🧵', t: 'Контекст разговора', s: '«а завтра?», «а в Питере?»', d: 'Джарвис держит «слоты» разговора — о чём, где, когда — и понимает короткие уточнения без повторов.',
  r(el) {
    const STEPS = [
      ['Какая погода в Москве?', { тема: 'погода', город: 'Москва', когда: 'сегодня' }, 'В Москве плюс одиннадцать, облачно.'],
      ['А завтра?', { когда: 'завтра' }, 'Завтра в Москве плюс девять и дождь.'],
      ['А в Питере?', { город: 'Санкт-Петербург' }, 'В Петербурге завтра плюс семь, ветер 12 м/с.'],
      ['Тогда напомни взять зонт', { тема: 'напоминание', что: 'зонт' }, 'Напомню завтра в 8:30, перед выходом — вы же едете в Петербург?'],
      ['Нет, я дома буду', { город: 'Москва' }, 'Понял, напомню про зонт в 8:30 — в Москве тоже дождь.'],
      ['Сделай потеплее', { тема: 'климат', устройство: 'кондиционер' }, 'Поднял кондиционер с 22 до 24 градусов.'],
      ['Ещё на градус', { значение: '25°' }, '25 градусов.'],
    ];
    let i = 0; const slots = {};
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="jv-tile lg:col-span-2">${L('Диалог')}<div id="cx-log" class="space-y-2 min-h-[320px] max-h-[440px] overflow-y-auto"></div><button id="cx-next" class="jv-btn mt-3">▶ СЛЕДУЮЩАЯ РЕПЛИКА</button></div>
      <div class="jv-tile">${L('Слоты контекста')}<div id="cx-slots" class="space-y-1.5"></div><div class="jv-sub mt-4 leading-relaxed">В реальности это просто история диалога в messages[] — LLM сама разрешает «а завтра?». Слоты нужны, чтобы показать это в интерфейсе и для быстрых локальных команд без LLM.</div></div></div>`;
    const draw = (ch = {}) => { $('#cx-slots').innerHTML = Object.entries(slots).map(([k, v]) => `<div class="flex justify-between rounded-md px-2 py-1.5 text-[13px] transition-colors duration-700 ${k in ch ? 'bg-jv-gold/25' : 'bg-white/5'}"><span class="text-jv-mute">${k}</span><b>${v}</b></div>`).join('') || '<div class="jv-sub">пусто</div>'; setTimeout(() => $$('#cx-slots .bg-jv-gold\\/25').forEach(x => x.classList.replace('bg-jv-gold/25', 'bg-white/5')), 900) };
    $('#cx-next').onclick = () => { if (i >= STEPS.length) { i = 0; Object.keys(slots).forEach(k => delete slots[k]); $('#cx-log').innerHTML = ''; draw(); $('#cx-next').textContent = '▶ СЛЕДУЮЩАЯ РЕПЛИКА'; return } const [u, ch, a] = STEPS[i++]; Object.assign(slots, ch); const log = $('#cx-log'); log.insertAdjacentHTML('beforeend', bubble('u', esc(u)) + bubble('t', 'изменил: ' + Object.entries(ch).map(([k, v]) => k + '=' + v).join(', ')) + bubble('j', esc(a))); log.scrollTop = 1e9; draw(ch); speakAs(a); if (i >= STEPS.length) $('#cx-next').textContent = '↻ СНАЧАЛА' };
    draw();
  }
});

/* ===================== 15 · МНОГОШАГОВЫЙ ДИАЛОГ ===================== */
LAB.push({
  group: 'Чего не хватало', icon: '🍕', t: 'Многошаговый диалог', s: 'заказ с уточнениями', d: 'Для сложной задачи Джарвис собирает недостающие детали по одной — и не переспрашивает то, что уже знает из памяти.',
  r(el, tok) {
    const SL = [['what', 'Что', 'Какую пиццу, сэр?', ['Пепперони', 'Маргарита', 'Четыре сыра'], null], ['size', 'Размер', 'Какой размер?', ['30 см', '35 см', '40 см'], null], ['addr', 'Адрес', null, null, 'Малибу-Пойнт, 10880 — из памяти'], ['time', 'Когда', 'К какому времени?', ['Как можно скорее', 'К 20:00', 'К 21:00'], null], ['pay', 'Оплата', null, null, 'Карта •• 4242 — из профиля']];
    const val = {}; let k = 0;
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-5 gap-3"><div class="jv-tile lg:col-span-3">${L('Диалог')}<div id="pz-log" class="space-y-2 min-h-[320px] max-h-[440px] overflow-y-auto">${bubble('u', 'Закажи пиццу')}</div><div id="pz-ch" class="flex flex-wrap gap-1.5 mt-3"></div></div>
      <div class="jv-tile lg:col-span-2">${L('Форма заказа (заполняется по ходу)')}<div id="pz-form" class="space-y-2"></div><div id="pz-ok" class="mt-4"></div></div></div>`;
    const draw = () => { $('#pz-form').innerHTML = SL.map(([id, n, , , mem]) => `<div class="flex items-center gap-2 text-[13px] rounded-md px-2 py-2 ${val[id] ? 'bg-jv-green/10' : 'bg-white/5'}"><span class="w-16 text-jv-mute">${n}</span><b class="flex-1">${val[id] ? esc(val[id]) : '—'}</b>${val[id] ? (mem && val[id] === mem.split(' —')[0] ? '<span class="jv-badge border-jv-purple text-jv-purple !text-[9px]">память</span>' : '<span class="text-jv-green">✓</span>') : ''}</div>`).join('') };
    const out = (w, h) => { $('#pz-log').insertAdjacentHTML('beforeend', bubble(w, h)); $('#pz-log').scrollTop = 1e9 };
    function next() {
      if (!alive(tok)) return; $('#pz-ch').innerHTML = '';
      while (k < SL.length && SL[k][4]) { const [id, , , , mem] = SL[k]; val[id] = mem.split(' —')[0]; out('t', `слот «${SL[k][1]}» уже известен: ${mem}`); k++; draw() }
      if (k >= SL.length) { out('j', `Итого: ${val.what}, ${val.size}, к ${val.time.toLowerCase()}, на Малибу-Пойнт. 2 900 ₽ с карты •• 4242. <b>Заказываю?</b>`); $('#pz-ch').innerHTML = `<button class="jv-btn !border-jv-green !text-jv-green !bg-jv-green/10" id="pz-yes">👍 ДА</button><button class="jv-btn !border-jv-line !text-jv-mute !bg-transparent" id="pz-no">ИЗМЕНИТЬ</button>`; $('#pz-yes').onclick = () => { out('u', 'Да'); out('j', 'Заказано. Курьер будет через 35 минут — покажу на телефоне.'); $('#pz-ch').innerHTML = ''; $('#pz-ok').innerHTML = '<div class="tile-in rounded-lg border border-solid border-jv-green bg-jv-green/10 p-3 text-[13px]">✅ Заказ №4412 · трекинг добавлен в Live Activity</div>'; speakAs('Заказано. Курьер будет через тридцать пять минут.') }; $('#pz-no').onclick = () => { k = 0; Object.keys(val).forEach(x => delete val[x]); $('#pz-log').innerHTML = bubble('u', 'Закажи пиццу'); $('#pz-ok').innerHTML = ''; draw(); next() }; speakAs('Заказываю?'); return }
      const [id, , q, opts] = SL[k]; out('j', q); speakAs(q);
      $('#pz-ch').innerHTML = opts.map((o, i) => `<button data-o="${i}" class="chip">${o}</button>`).join('');
      $$('#pz-ch [data-o]').forEach(b => b.onclick = () => { val[id] = opts[+b.dataset.o]; out('u', esc(val[id])); k++; draw(); setTimeout(next, 350) });
    }
    draw(); setTimeout(next, 300);
  }
});

/* ===================== 16 · УВЕДОМЛЕНИЯ И ОЧЕРЕДЬ ===================== */
LAB.push({
  group: 'Чего не хватало', icon: '🔔', t: 'Уведомления и очередь', s: 'когда перебить, когда копить', d: 'Не всё стоит произносить сразу. Важное перебивает, остальное копится и зачитывается сводкой «пока вас не было».',
  r(el, tok) {
    const SRC = [['💬', 'Пеппер', 'Ужин в 20:00 у родителей — не забудь', 1], ['📦', 'Доставка', 'Посылка в пункте выдачи', 0], ['📧', 'Инвестор', 'Ждём отчёт до пятницы', 1], ['🔥', 'PagerDuty', 'api-gateway: 502 уже 2 минуты', 3], ['🛒', 'Магазин', 'Скидка 20% на кофе', 0], ['📅', 'Календарь', 'Через 10 минут созвон с Брюсом', 2], ['💬', 'Роуди', 'Скинь фото костюма', 0], ['🔔', 'Дверь', 'Звонок в дверь', 2]];
    const PR = [['низк', '#6c93a8'], ['обычн', '#00d4ff'], ['важно', '#ffb547'], ['КРИТ', '#ff4d5e']];
    let mode = 'focus', q = [], iv, n = 0;
    el.innerHTML = `<div class="jv-tile mb-3 flex flex-wrap items-center gap-2"><span class="jv-label !mb-0 mr-2">Вы сейчас</span>${[['free', '🙂 свободны'], ['focus', '🎧 в фокусе'], ['meeting', '👥 на встрече'], ['sleep', '😴 спите']].map(([k, n]) => `<button data-md="${k}" class="chip">${n}</button>`).join('')}<button id="nt-back" class="jv-btn ml-auto">🔙 Я ВЕРНУЛСЯ</button></div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="jv-tile">${L('Входящий поток')}<div id="nt-in" class="space-y-1.5 h-[360px] overflow-hidden flex flex-col justify-end"></div></div>
        <div class="jv-tile">${L('Сказал сразу (перебил)')}<div id="nt-now" class="space-y-1.5"></div></div>
        <div class="jv-tile">${L('В очереди')}<div id="nt-q" class="space-y-1.5"></div><div id="nt-dg" class="mt-3"></div></div></div>`;
    const item = ([e, f, t, p], extra = '') => `<div class="tile-in flex gap-2 items-start rounded-md bg-white/5 px-2 py-1.5 text-[12.5px]"><span>${e}</span><span class="flex-1"><b>${f}</b> — ${esc(t)}</span><span class="jv-badge !text-[9px]" style="color:${PR[p][1]};border-color:${PR[p][1]}">${PR[p][0]}</span>${extra}</div>`;
    const thr = () => ({ free: 0, focus: 2, meeting: 3, sleep: 3 })[mode];
    const setM = m => { mode = m; $$('[data-md]').forEach(b => b.classList.toggle('!border-jv-cyan', b.dataset.md === m)) };
    $$('[data-md]').forEach(b => b.onclick = () => setM(b.dataset.md)); setM('focus');
    iv = setInterval(() => {
      if (!alive(tok)) return clearInterval(iv); const x = SRC[n++ % SRC.length]; $('#nt-in').insertAdjacentHTML('beforeend', item(x)); while ($('#nt-in').children.length > 9) $('#nt-in').firstChild.remove();
      if (x[3] >= thr()) { $('#nt-now').insertAdjacentHTML('afterbegin', item(x, mode === 'meeting' ? '<span title="вибро на часы">⌚</span>' : '<span>🔊</span>')); if (x[3] >= 2) speakAs(`${x[1]}: ${x[2]}`); while ($('#nt-now').children.length > 5) $('#nt-now').lastChild.remove() }
      else { q.push(x); $('#nt-q').innerHTML = q.slice(-7).map(y => item(y)).join('') + (q.length > 7 ? `<div class="jv-sub">…и ещё ${q.length - 7}</div>` : '') }
    }, 1600);
    $('#nt-back').onclick = () => {
      if (!q.length) { toast('Очередь пуста'); return } const imp = q.filter(x => x[3] >= 1), rest = q.length - imp.length;
      const txt = `Пока вас не было — ${q.length} уведомлений. Важное: ${imp.slice(0, 3).map(x => x[1] + ' — ' + x[2].toLowerCase()).join('; ') || 'ничего'}.${rest ? ` Ещё ${rest} — реклама и мелочи, я их скрыл.` : ''}`;
      $('#nt-dg').innerHTML = `<div class="tile-in rounded-lg border border-solid border-jv-cyan bg-jv-cyan/10 p-3 text-[13px]">🗣 ${esc(txt)}</div>`; speakAs(txt); q = []; $('#nt-q').innerHTML = ''; setM('free');
    };
    return () => clearInterval(iv);
  }
});

/* ===================== 17 · ДОСТУПНОСТЬ ===================== */
LAB.push({
  group: 'Чего не хватало', icon: '♿', t: 'Доступность', s: 'субтитры, крупно, контраст', d: 'Джарвис должен работать для всех: для слабовидящих, слабослышащих, людей с нарушением моторики и речи.',
  r(el) {
    const OPT = [['cap', '💬 Субтитры к голосу', 'всё, что говорит Джарвис, дублируется текстом внизу экрана'], ['big', '🔠 Крупный текст', 'весь интерфейс ×1.25'], ['hc', '🌓 Высокий контраст', 'без полупрозрачности и свечений'], ['slow', '🐢 Медленная речь', 'TTS 0.8×, паузы между фразами'], ['silent', '🤫 Без голоса', 'ответы только текстом + вибро на часы'], ['motion', '🧘 Без анимаций', 'для чувствительных к движению'], ['dwell', '👁 Клик взглядом/задержкой', 'наведи и задержи — сработает'], ['simple', '🧩 Простой режим', 'крупные кнопки, минимум слов (для пожилых и детей)']];
    const st = {};
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-3"><div class="jv-tile">${L('Настройки')}${OPT.map(([k, n, d]) => `<label class="jv-row cursor-pointer !items-start !justify-start"><input type="checkbox" data-a="${k}" class="accent-[#00d4ff] mt-1"><span><b class="font-semibold">${n}</b><br><span class="jv-sub">${d}</span></span></label>`).join('')}
        <div class="flex gap-2 mt-4"><button id="ac-say" class="jv-btn">🔊 ПРОВЕРИТЬ ГОЛОС</button><button id="ac-all" class="jv-btn !border-jv-gold !text-jv-gold !bg-jv-gold/10">ПРИМЕНИТЬ КО ВСЕМУ МАКЕТУ</button></div></div>
      <div class="jv-tile">${L('Превью')}<div id="ac-prev" class="rounded-xl border border-solid border-jv-line p-4 transition-all"><div class="flex items-center gap-3"><div id="ac-orb" class="w-14 h-14 rounded-full bg-[radial-gradient(circle,#fff,#00d4ff_45%,transparent_70%)] shadow-[0_0_25px_#00d4ff] animate-pulse"></div><div><div class="font-semibold" id="ac-t1">Джарвис</div><div class="jv-sub" id="ac-t2">Через 15 минут стендап</div></div></div>
        <div class="grid grid-cols-2 gap-2 mt-4" id="ac-btns">${['☕ Кофе', '💡 Свет', '📞 Позвонить маме', '🆘 Помощь'].map(x => `<button class="jv-btn ac-b">${x}</button>`).join('')}</div></div><div id="ac-cap" class="hidden mt-3 rounded-lg bg-black border border-solid border-white/30 px-3 py-2 text-[15px] text-white text-center"></div></div></div>`;
    const apply = () => {
      const p = $('#ac-prev'); p.style.fontSize = st.big ? '1.25em' : ''; p.style.background = st.hc ? '#000' : ''; p.style.borderColor = st.hc ? '#fff' : ''; $('#ac-orb').classList.toggle('animate-pulse', !st.motion && !st.hc); $('#ac-orb').style.boxShadow = st.hc ? 'none' : '';
      $$('.ac-b').forEach(b => { b.style.padding = st.simple ? '18px' : ''; b.style.fontSize = st.simple ? '14px' : ''; b.style.color = st.hc ? '#fff' : ''; b.style.borderColor = st.hc ? '#fff' : '' });
      $('#ac-t2').textContent = st.simple ? 'Стендап скоро' : 'Через 15 минут стендап'; $('#ac-cap').classList.toggle('hidden', !st.cap);
    };
    $$('[data-a]').forEach(c => c.onchange = () => { st[c.dataset.a] = c.checked; apply() });
    $('#ac-say').onclick = async () => { const t = 'Сэр, через пятнадцать минут стендап. Хэппи уже ждёт у подъезда.'; if (st.cap) $('#ac-cap').textContent = '🔊 ' + t; if (st.silent) { toast('⌚ вибро на часы + текст'); return } await speakAs(t, { rate: st.slow ? .8 : 1.05 }) };
    $$('.ac-b').forEach(b => { let tm; b.onmouseenter = () => { if (st.dwell) { b.style.boxShadow = '0 0 0 3px #ffb547'; tm = setTimeout(() => { b.click(); b.style.boxShadow = '' }, 1200) } }; b.onmouseleave = () => { clearTimeout(tm); b.style.boxShadow = '' }; b.onclick = () => toast('Нажато: ' + b.textContent) });
    $('#ac-all').onclick = () => { const on = !document.body.classList.contains('a11y-big'); document.body.classList.toggle('a11y-big', on); document.documentElement.style.fontSize = on && st.big ? '17.5px' : ''; document.body.style.zoom = on && st.big ? '1.12' : ''; document.body.classList.toggle('a11y-hc', on && !!st.hc); document.body.classList.toggle('a11y-still', on && !!st.motion); toast(on ? 'Применено ко всему макету (нажмите ещё раз, чтобы снять)' : 'Сброшено') };
  }
});

/* ===================== 18 · ЗДОРОВЬЕ СИСТЕМЫ ===================== */
LAB.push({
  group: 'Чего не хватало', icon: '🩺', t: 'Здоровье системы', s: 'что если всё сломалось', d: 'Облако упало, кончились деньги, модель ошиблась — Джарвис должен деградировать плавно, а не молчать.',
  r(el) {
    const C = { net: ['📡 Интернет', 'ok'], llm: ['🧠 Claude API', 'ok'], tts: ['🗣 ElevenLabs', 'ok'], stt: ['👂 Whisper (локально)', 'ok'], ha: ['🏠 Home Assistant', 'ok'], bud: ['💸 Бюджет API', 'ok'] };
    const F = [['💥 Пропал интернет', ['net', 'llm', 'tts'], 'Облако недоступно → мозг: Ollama (Qwen 14B) локально, голос: Piper. Сложные вопросы отложены в очередь.'], ['💸 Кончились деньги на API', ['bud', 'llm'], 'Лимит $50/мес исчерпан → простые команды локально, сложное — с вашего подтверждения. Уведомил на телефон.'], ['🔇 TTS вернул 500', ['tts'], 'ElevenLabs отвечает ошибкой → 2 ретрая с паузой → переключился на Piper, голос проще, но работает.'], ['🏠 HA не отвечает', ['ha'], 'Умный дом недоступен → команды «включи свет» ставлю в очередь, перепроверка каждые 30 с. Сказал вам честно.'], ['🤪 Модель ошиблась', [], 'Вызвала set_device("toaster") — такого нет → вернул is_error в tool_result → модель исправилась: «Тостера нет, включить кофемашину?»']];
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="jv-tile">${L('Компоненты')}<div id="hs-c" class="space-y-1.5"></div>${L('Бюджет месяца', 'mt-4')}<div class="h-2 rounded-full bg-white/5 overflow-hidden"><div id="hs-b" class="h-full bg-jv-green transition-all" style="width:42%"></div></div><div id="hs-bt" class="jv-sub mt-1">$21 из $50</div></div>
      <div class="jv-tile">${L('Сломать что-нибудь')}<div class="flex flex-col gap-2">${F.map((f, i) => `<button data-f="${i}" class="jv-btn !text-left !normal-case !tracking-normal !font-sans !text-[13px] !border-jv-red/60 !text-jv-text !bg-jv-red/5">${f[0]}</button>`).join('')}<button id="hs-fix" class="jv-btn !border-jv-green !text-jv-green !bg-jv-green/10 mt-2">🔧 ПОЧИНИТЬ ВСЁ</button></div></div>
      <div class="jv-tile">${L('Журнал инцидентов')}<div id="hs-log" class="space-y-2 text-[12.5px] max-h-[380px] overflow-y-auto"></div></div></div>`;
    const draw = () => $('#hs-c').innerHTML = Object.values(C).map(([n, s]) => `<div class="flex items-center gap-2 text-[13px]"><span class="w-2.5 h-2.5 rounded-full ${s === 'ok' ? 'bg-jv-green shadow-[0_0_6px_#3dffa8]' : s === 'fb' ? 'bg-jv-gold animate-pulse' : 'bg-jv-red animate-pulse'}"></span><span class="flex-1">${n}</span><span class="font-mono text-[10px] ${s === 'ok' ? 'text-jv-green' : 'text-jv-gold'}">${s === 'ok' ? 'ok' : 'резерв'}</span></div>`).join('');
    $$('[data-f]').forEach(b => b.onclick = () => { const [n, ks, how] = F[+b.dataset.f]; ks.forEach(k => C[k][1] = 'fb'); if (ks.includes('bud')) { $('#hs-b').style.width = '100%'; $('#hs-b').classList.replace('bg-jv-green', 'bg-jv-red'); $('#hs-bt').textContent = '$50 из $50 — лимит' } draw(); $('#hs-log').insertAdjacentHTML('afterbegin', `<div class="tile-in rounded-md bg-white/5 p-2"><div class="font-mono text-[10px] text-jv-mute">${new Date().toLocaleTimeString('ru-RU')}</div><b class="text-jv-red">${n}</b><div class="mt-1">→ ${how}</div></div>`); speakAs(how.split('→')[0].trim() === '' ? how : 'Сэр, ' + n.slice(2).toLowerCase() + '. Перешёл на резерв.') });
    $('#hs-fix').onclick = () => { Object.values(C).forEach(c => c[1] = 'ok'); $('#hs-b').style.width = '42%'; $('#hs-b').classList.replace('bg-jv-red', 'bg-jv-green'); $('#hs-bt').textContent = '$21 из $50'; draw(); toast('🔧 Все системы в норме') };
    draw();
  }
});

/* ===================== 19 · ОНБОРДИНГ ===================== */
LAB.push({
  group: 'Полезное', icon: '👋', t: 'Первое знакомство', s: 'онбординг за 5 минут', d: 'Первые минуты решают, полюбит ли человек ассистента: познакомиться, записать голос, подключить сервисы, выбрать характер.',
  r(el, tok) {
    const ST = ['Знакомство', 'Голос', 'Сервисы', 'Характер', 'Готово']; let s = 0; const d = { name: 'Тони', addr: 'сэр', svc: { 'Google Календарь': true, 'Spotify': true, 'Home Assistant': true, 'Почта': false, 'Telegram': false }, pers: '🎩 Дворецкий' };
    el.innerHTML = `<div class="jv-tile max-w-3xl"><div id="ob-steps" class="flex gap-2 mb-5"></div><div id="ob-body" class="min-h-[300px]"></div><div class="flex gap-2 mt-5"><button id="ob-back" class="jv-btn !border-jv-line !text-jv-mute !bg-transparent">← НАЗАД</button><button id="ob-next" class="jv-btn ml-auto">ДАЛЕЕ →</button></div></div>`;
    const P = [
      () => `<div class="text-[22px] text-white">Здравствуйте! Я — Джарвис.</div><div class="text-jv-mute mt-1">Как мне к вам обращаться?</div><div class="grid grid-cols-2 gap-3 mt-5 max-w-md"><label><span class="jv-sub">Имя</span><input id="ob-n" value="${esc(d.name)}" class="mt-1 w-full bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-3 py-2 outline-none"></label><label><span class="jv-sub">Обращение</span><select id="ob-a" class="mt-1 w-full bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-3 py-2">${['сэр', 'по имени', 'на «ты»', 'мэм'].map(x => `<option ${x === d.addr ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>`,
      () => `<div class="text-[18px] text-white">Запишем ваш голос</div><div class="text-jv-mute mt-1">Прочитайте 3 фразы — так я буду узнавать вас среди гостей.</div><div class="space-y-3 mt-4">${['«Джарвис, доброе утро»', '«Включи свет в гостиной»', '«Какие у меня планы на завтра?»'].map((x, i) => `<div class="flex items-center gap-3"><button data-rec="${i}" class="jv-btn !w-10 !px-0">🎙</button><span class="flex-1 text-[14px]">${x}</span><div class="w-40 h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-jv-green w-0 transition-all duration-[1500ms]" id="ob-r${i}"></div></div></div>`).join('')}</div>`,
      () => `<div class="text-[18px] text-white">Что подключим?</div><div class="text-jv-mute mt-1">Можно позже. Я попрошу только нужные права.</div><div class="grid grid-cols-2 gap-2 mt-4">${Object.entries(d.svc).map(([k, v]) => `<label class="flex items-center gap-2 rounded-lg border border-solid border-jv-line p-3 cursor-pointer"><input type="checkbox" data-sv="${k}" ${v ? 'checked' : ''} class="accent-[#00d4ff]"><span>${k}</span></label>`).join('')}</div>`,
      () => `<div class="text-[18px] text-white">Каким мне быть?</div><div class="grid grid-cols-2 gap-2 mt-4">${['🎩 Дворецкий', '👩‍💼 Деловая Пятница', '😎 Приятель', '🧘 Спокойный минималист'].map(x => `<button data-ps="${x}" class="text-left rounded-xl border border-solid p-3 cursor-pointer bg-transparent text-jv-text ${x === d.pers ? 'border-jv-cyan bg-jv-cyan/10' : 'border-jv-line'}">${x}</button>`).join('')}</div>`,
      () => `<div class="text-center py-6"><div class="text-5xl">✨</div><div class="text-[22px] text-white mt-2">Всё готово, ${esc(d.addr === 'по имени' ? d.name : d.addr)}!</div><div class="text-jv-mute mt-2 text-[13px]">Голос записан · подключено: ${Object.entries(d.svc).filter(x => x[1]).map(x => x[0]).join(', ')} · характер: ${d.pers}</div><div class="text-[13px] mt-4">Попробуйте сказать: <b class="text-jv-cyan">«Джарвис, что у меня сегодня?»</b></div></div>`,
    ];
    const save = () => { if (s === 0) { d.name = $('#ob-n').value; d.addr = $('#ob-a').value } if (s === 2) $$('[data-sv]').forEach(c => d.svc[c.dataset.sv] = c.checked) };
    const draw = () => { $('#ob-steps').innerHTML = ST.map((x, i) => `<div class="flex-1"><div class="h-1 rounded-full ${i <= s ? 'bg-jv-cyan shadow-[0_0_6px_#00d4ff]' : 'bg-white/10'}"></div><div class="jv-sub !text-[10px] mt-1 ${i === s ? '!text-jv-cyan' : ''}">${i + 1}. ${x}</div></div>`).join(''); $('#ob-body').innerHTML = `<div class="tile-in">${P[s]()}</div>`; $('#ob-back').style.visibility = s ? '' : 'hidden'; $('#ob-next').textContent = s === ST.length - 1 ? '↻ ЗАНОВО' : 'ДАЛЕЕ →';
      $$('[data-rec]').forEach(b => b.onclick = () => { $('#ob-r' + b.dataset.rec).style.width = '100%'; b.textContent = '✓'; speakAs('Записал.') }); $$('[data-ps]').forEach(b => b.onclick = () => { d.pers = b.dataset.ps; draw() });
      if (s === 0) speakAs('Здравствуйте! Я Джарвис. Как мне к вам обращаться?'); if (s === ST.length - 1) speakAs('Всё готово. Приятно познакомиться.') };
    $('#ob-next').onclick = () => { save(); s = s === ST.length - 1 ? 0 : s + 1; draw() }; $('#ob-back').onclick = () => { save(); s = Math.max(0, s - 1); draw() };
    draw();
  }
});

/* ===================== 20 · МАГАЗИН НАВЫКОВ ===================== */
LAB.push({
  group: 'Полезное', icon: '🧩', t: 'Магазин навыков', s: 'MCP-серверы в один клик', d: 'Новые умения ставятся как приложения: каждый навык — MCP-сервер с инструментами и списком прав, которые он просит.',
  r(el) {
    const S = [['📓', 'Notion', 'Заметки и базы', ['читать страницы', 'создавать страницы'], true], ['🐙', 'GitHub', 'Код, PR, issues', ['читать репозитории', 'создавать issues'], true], ['🎵', 'Spotify', 'Музыка', ['управлять плеером'], true], ['✈️', 'Авиабилеты', 'Поиск и бронь', ['поиск рейсов', 'бронь ✋'], false], ['🍳', 'Рецепты', 'Готовка по шагам', ['поиск рецептов'], false], ['🚗', 'Tesla', 'Машина', ['климат', 'открыть ✋', 'местоположение'], false], ['📈', 'Биржа', 'Котировки', ['читать котировки'], false], ['🏋️', 'Strava', 'Тренировки', ['читать активности'], false], ['🗂', 'Google Drive', 'Файлы', ['читать файлы', 'загружать'], false]];
    el.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" id="sk-g"></div><div id="sk-modal"></div>`;
    const draw = () => { $('#sk-g').innerHTML = S.map(([e, n, d, p, on], i) => `<div class="jv-tile flex flex-col"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-xl grid place-items-center text-2xl bg-jv-cyan/10 border border-solid border-jv-line">${e}</div><div><div class="font-semibold">${n}</div><div class="jv-sub">${d}</div></div>${on ? '<span class="ml-auto jv-badge border-jv-green text-jv-green">установлен</span>' : ''}</div><div class="jv-sub mt-3">инструменты: ${p.join(' · ')}</div><button data-sk="${i}" class="jv-btn mt-3 ${on ? '!border-jv-red/60 !text-jv-red !bg-transparent' : ''}">${on ? 'УДАЛИТЬ' : '+ УСТАНОВИТЬ'}</button></div>`).join(''); $$('[data-sk]').forEach(b => b.onclick = () => act(+b.dataset.sk)) };
    function act(i) {
      const s = S[i]; if (s[4]) { s[4] = false; draw(); toast(`🗑 ${s[1]} удалён, токены отозваны`); return }
      $('#sk-modal').innerHTML = `<div class="fixed inset-0 z-[170] bg-black/60 grid place-items-center p-4"><div class="jv-tile !bg-[#04131c] max-w-sm w-full tile-in"><div class="text-3xl">${s[0]}</div><div class="font-semibold text-[16px] mt-2">${s[1]} просит доступ:</div><div class="mt-3 space-y-1.5 text-[13px]">${s[3].map(p => `<div>• ${p}${p.includes('✋') ? ' <span class="jv-sub">— каждый раз спросит вас</span>' : ''}</div>`).join('')}</div><div id="sk-pr" class="h-1.5 rounded-full bg-white/5 mt-4 overflow-hidden"><div class="h-full w-0 bg-jv-cyan transition-all duration-[1200ms]"></div></div><div class="flex gap-2 mt-4"><button id="sk-ok" class="jv-btn flex-1">РАЗРЕШИТЬ</button><button id="sk-no" class="jv-btn !border-jv-line !text-jv-mute !bg-transparent">ОТМЕНА</button></div></div></div>`;
      $('#sk-no').onclick = () => $('#sk-modal').innerHTML = '';
      $('#sk-ok').onclick = () => { $('#sk-pr div').style.width = '100%'; setTimeout(() => { s[4] = true; $('#sk-modal').innerHTML = ''; draw(); toast(`✅ ${s[1]}: +${s[3].length} инструментов. Попробуйте спросить голосом`); speakAs(`Навык ${s[1]} установлен.`) }, 1300) };
    }
    draw();
  }
});

/* ===================== 21 · ФИНАНСЫ ===================== */
LAB.push({
  group: 'Полезное', icon: '💰', t: 'Финансы', s: 'подписки, счета, траты', d: 'Только аналитика и напоминания — Джарвис ничего не оплачивает сам. Находит забытые подписки и предупреждает о счетах.',
  r(el) {
    const SUB = [['Netflix', 799, 2], ['Spotify', 299, 0], ['iCloud 2 ТБ', 749, 0], ['Adobe CC', 3290, 64], ['ChatGPT Plus', 1990, 41], ['Фитнес-клуб', 4500, 23], ['Кинопоиск', 399, 88], ['Claude API', 2100, 0]];
    const BILL = [['ЖКХ', 'через 3 дня', 7800], ['Интернет', 'через 6 дней', 900], ['Страховка авто', 'через 12 дней', 46000], ['Налог на имущество', 'до 1 декабря', 12400]];
    const tot = SUB.reduce((a, s) => a + s[1], 0), unused = SUB.filter(s => s[2] > 30);
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="jv-tile lg:col-span-2">${L(`Подписки · ${tot.toLocaleString('ru-RU')} ₽ в месяц`)}${SUB.map(([n, p, d], i) => `<div class="jv-row" data-sb="${i}"><span class="flex-1">${n}</span><span class="jv-sub w-32 text-right ${d > 30 ? '!text-jv-gold' : ''}">${d ? `не открывали ${d} дн.` : 'используете'}</span><span class="font-mono w-20 text-right">${p.toLocaleString('ru-RU')} ₽</span>${d > 30 ? `<button data-cn="${i}" class="jv-badge border-jv-gold text-jv-gold bg-transparent cursor-pointer">напомнить отменить</button>` : '<span class="w-[118px]"></span>'}</div>`).join('')}
        <div class="mt-3 rounded-lg border border-solid border-jv-gold/60 bg-jv-gold/10 p-3 text-[13px]">💡 ${unused.length} подписки не использовались больше месяца: <b>${unused.map(s => s[0]).join(', ')}</b> — это <b>${unused.reduce((a, s) => a + s[1], 0).toLocaleString('ru-RU')} ₽/мес</b> или ${(unused.reduce((a, s) => a + s[1], 0) * 12).toLocaleString('ru-RU')} ₽ в год.</div></div>
      <div class="flex flex-col gap-3"><div class="jv-tile">${L('Ближайшие счета')}${BILL.map(([n, w, s]) => `<div class="jv-row"><span>${n}<br><span class="jv-sub">${w}</span></span><b class="font-mono">${s.toLocaleString('ru-RU')} ₽</b></div>`).join('')}</div>
        <div class="jv-tile">${L('Траты по неделям')}<div class="flex items-end gap-2 h-28">${[18, 24, 15, 31, 22, 27].map((v, i) => `<div class="flex-1 text-center"><div class="rounded-t ${i === 3 ? 'bg-jv-red' : 'bg-jv-cyan/50'}" style="height:${v * 3}px"></div><div class="jv-sub !text-[9px]">н${i + 1}</div></div>`).join('')}</div><div class="jv-sub mt-2">4-я неделя: +40% — подарки и билеты на Expo</div></div>
        <div class="jv-sub px-1">🔒 Джарвис только читает выписки. Платежи — всегда вами.</div></div></div>`;
    $$('[data-cn]').forEach(b => b.onclick = () => { b.outerHTML = '<span class="jv-badge border-jv-green text-jv-green">задача создана</span>'; toast('📌 Задача: отменить подписку (ссылка на страницу отмены)') });
  }
});

/* ===================== 22 · РЕПЕТИТОР ===================== */
LAB.push({
  group: 'Полезное', icon: '🎓', t: 'Репетитор', s: 'карточки и экзамен голосом', d: 'Интервальное повторение: Джарвис спрашивает то, что вы вот-вот забудете. Карточки делает сам из ваших заметок и статей.',
  r(el) {
    const C = [['Что такое VAD?', 'Voice Activity Detection — определение, где речь, а где тишина'], ['Как по-японски «спасибо»?', 'ありがとう (аригато)'], ['Сколько бит в байте?', '8'], ['Кто написал «В работу с головой»?', 'Кэл Ньюпорт'], ['Что делает tool_result?', 'Возвращает модели результат вызова инструмента'], ['Столица Турции?', 'Анкара (не Стамбул!)']];
    let i = 0, flip = false, score = { ok: 0, bad: 0 }, due = C.map(() => 0);
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="lg:col-span-2"><div id="tu-card" class="jv-tile cursor-pointer min-h-[260px] grid place-items-center text-center !p-8 [perspective:800px]"></div>
      <div class="flex gap-2 mt-3"><button id="tu-bad" class="jv-btn flex-1 !border-jv-red !text-jv-red !bg-jv-red/10">✗ НЕ ЗНАЛ</button><button id="tu-hard" class="jv-btn flex-1 !border-jv-gold !text-jv-gold !bg-jv-gold/10">~ С ТРУДОМ</button><button id="tu-ok" class="jv-btn flex-1 !border-jv-green !text-jv-green !bg-jv-green/10">✓ ЗНАЛ</button></div></div>
      <div class="flex flex-col gap-3"><div class="jv-tile">${L('Сегодня')}<div class="flex gap-6"><div><div class="jv-value !text-jv-green" id="tu-ok-n">0</div><div class="jv-sub">знал</div></div><div><div class="jv-value !text-jv-red" id="tu-bad-n">0</div><div class="jv-sub">повторить</div></div><div><div class="jv-value">🔥 12</div><div class="jv-sub">дней подряд</div></div></div></div>
        <div class="jv-tile">${L('Следующее повторение')}<div id="tu-due" class="space-y-1 text-[12.5px]"></div></div><button id="tu-voice" class="jv-btn">🔊 СПРОСИ МЕНЯ ГОЛОСОМ</button></div></div>`;
    const draw = () => { const [q, a] = C[i]; $('#tu-card').innerHTML = `<div class="tile-in"><div class="jv-sub mb-3">${flip ? 'ответ' : 'вопрос'} · ${i + 1}/${C.length} · клик — перевернуть</div><div class="text-[24px] ${flip ? 'text-jv-green' : 'text-white'}">${esc(flip ? a : q)}</div></div>`; $('#tu-due').innerHTML = C.map(([q], k) => `<div class="flex justify-between"><span class="truncate">${esc(q)}</span><span class="jv-sub">${due[k] ? 'через ' + due[k] + ' дн.' : 'сегодня'}</span></div>`).join('') };
    $('#tu-card').onclick = () => { flip = !flip; draw() };
    const grade = (d, ok) => { due[i] = d; score[ok ? 'ok' : 'bad']++; $('#tu-ok-n').textContent = score.ok; $('#tu-bad-n').textContent = score.bad; i = (i + 1) % C.length; flip = false; draw() };
    $('#tu-ok').onclick = () => grade(6, 1); $('#tu-hard').onclick = () => grade(2, 1); $('#tu-bad').onclick = () => grade(0, 0);
    $('#tu-voice').onclick = async () => { flip = false; draw(); await speakAs(C[i][0]); await sleep(2500); flip = true; draw(); speakAs('Ответ: ' + C[i][1]) };
    draw();
  }
});

/* ===================== 23 · КУХНЯ ===================== */
LAB.push({
  group: 'Полезное', icon: '🍳', t: 'Кухня', s: 'рецепт по шагам с таймерами', d: 'Руки в муке — экран не потрогать. «Что приготовить из того, что есть» и рецепт голосом: «дальше», «повтори», таймеры на каждый шаг.',
  r(el, tok) {
    const ING = ['🥚 яйца', '🧀 сыр', '🍅 помидоры', '🍝 паста', '🥓 бекон', '🧄 чеснок', '🥛 сливки', '🍗 курица'];
    const REC = [['Паста карбонара', ['🍝 паста', '🥚 яйца', '🥓 бекон', '🧀 сыр'], 20, [['Поставьте воду, посолите', 0], ['Варите пасту', 9], ['Обжарьте бекон до хруста', 4], ['Смешайте желтки с тёртым сыром', 0], ['Смешайте пасту с беконом, снимите с огня, влейте яичную смесь', 0]]], ['Омлет с помидорами', ['🥚 яйца', '🍅 помидоры', '🧀 сыр'], 10, [['Взбейте 3 яйца с щепоткой соли', 0], ['Обжарьте помидоры', 2], ['Залейте яйцами, накройте крышкой', 4], ['Посыпьте сыром', 1]]], ['Курица в сливках', ['🍗 курица', '🥛 сливки', '🧄 чеснок'], 30, [['Нарежьте курицу кубиками', 0], ['Обжарьте до золотистого', 7], ['Добавьте чеснок', 1], ['Влейте сливки, тушите', 12]]]];
    const have = new Set(['🥚 яйца', '🧀 сыр', '🍝 паста', '🥓 бекон']); let rec = null, step = 0, tm = null;
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="jv-tile">${L('Что есть в холодильнике')}<div id="kc-ing" class="flex flex-wrap gap-1.5"></div>${L('Можно приготовить', 'mt-4')}<div id="kc-rec" class="space-y-2"></div></div>
      <div class="jv-tile lg:col-span-2" id="kc-cook"><div class="h-full grid place-items-center jv-sub min-h-[300px]">выберите рецепт</div></div></div>`;
    const draw = () => { $('#kc-ing').innerHTML = ING.map(x => `<button data-ig="${x}" class="chip ${have.has(x) ? '!border-jv-green !text-jv-green' : 'opacity-50'}">${x}</button>`).join(''); $$('[data-ig]').forEach(b => b.onclick = () => { const x = b.dataset.ig; have.has(x) ? have.delete(x) : have.add(x); draw() });
      $('#kc-rec').innerHTML = REC.map(([n, need, min], i) => { const miss = need.filter(x => !have.has(x)); return `<button data-rc="${i}" class="w-full text-left rounded-lg border border-solid ${miss.length ? 'border-jv-line opacity-60' : 'border-jv-green'} bg-transparent p-2.5 cursor-pointer text-jv-text"><b>${n}</b> <span class="jv-sub">· ${min} мин</span><div class="jv-sub">${miss.length ? 'не хватает: ' + miss.join(', ') : '✓ всё есть'}</div></button>` }).join(''); $$('[data-rc]').forEach(b => b.onclick = () => { rec = REC[+b.dataset.rc]; step = 0; cook() }) };
    function cook() {
      clearInterval(tm); const [n, , , S] = rec, [txt, min] = S[step];
      $('#kc-cook').innerHTML = `<div class="flex items-center gap-2"><span class="jv-label !mb-0">${n}</span><span class="ml-auto jv-sub">шаг ${step + 1} из ${S.length}</span></div><div class="flex gap-1 mt-2">${S.map((_, i) => `<div class="h-1 flex-1 rounded-full ${i <= step ? 'bg-jv-cyan' : 'bg-white/10'}"></div>`).join('')}</div>
        <div class="text-[30px] leading-tight text-white mt-8 min-h-[120px] tile-in">${txt}</div>${min ? `<div class="flex items-center gap-3 mt-4"><span class="font-hud text-4xl text-jv-gold" id="kc-t">${String(min).padStart(2, '0')}:00</span><button id="kc-ts" class="jv-btn">⏱ ЗАПУСТИТЬ ТАЙМЕР</button></div>` : ''}
        <div class="flex gap-2 mt-6"><button id="kc-pr" class="jv-btn !border-jv-line !text-jv-mute !bg-transparent">← «назад»</button><button id="kc-rp" class="jv-btn !border-jv-line !text-jv-mute !bg-transparent">🔁 «повтори»</button><button id="kc-nx" class="jv-btn ml-auto !text-[12px] !px-6">«ДАЛЬШЕ» →</button></div>`;
      speakAs(txt);
      $('#kc-nx').onclick = () => { if (step < S.length - 1) { step++; cook() } else { $('#kc-cook').innerHTML = '<div class="h-full grid place-items-center text-center min-h-[300px]"><div><div class="text-6xl">🍽</div><div class="text-[22px] mt-2">Приятного аппетита, сэр!</div></div></div>'; speakAs('Готово. Приятного аппетита, сэр.') } };
      $('#kc-pr').onclick = () => { step = Math.max(0, step - 1); cook() }; $('#kc-rp').onclick = () => speakAs(txt);
      if (min) $('#kc-ts').onclick = () => { let l = min * 60 / 10; $('#kc-ts').textContent = '⏱ ИДЁТ (×10 для демо)'; clearInterval(tm); tm = setInterval(() => { if (!alive(tok)) return clearInterval(tm); l--; const s = l * 10; $('#kc-t').textContent = `${String(s / 60 | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; if (l <= 0) { clearInterval(tm); $('#kc-t').textContent = 'ГОТОВО'; speakAs('Таймер! ' + txt + ' — готово.') } }, 1000) };
    }
    draw(); return () => clearInterval(tm);
  }
});

/* ===================== 24 · ДОКУМЕНТЫ ===================== */
LAB.push({
  group: 'Полезное', icon: '📄', t: 'Документы', s: 'сфоткал счёт — всё понял', d: 'Фото счёта, договора или письма → Джарвис вытаскивает суммы, сроки и реквизиты и ставит напоминание.',
  r(el, tok) {
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-3"><div class="jv-tile"><div class="flex items-center mb-3"><span class="jv-label !mb-0">Фото документа</span><button id="dc-go" class="jv-btn ml-auto">📸 РАСПОЗНАТЬ</button></div>
      <div id="dc-doc" class="relative mx-auto max-w-sm bg-[#f4f1ea] text-[#222] rounded p-5 font-serif text-[12px] leading-relaxed shadow-[0_10px_40px_rgba(0,0,0,.5)] rotate-[-1.5deg] overflow-hidden">
        <div class="text-center font-bold text-[14px]">СЧЁТ НА ОПЛАТУ № <span data-f="num">2026-1187</span></div><div class="text-center text-[11px]">от 12 октября 2026 г.</div>
        <div class="mt-3">Поставщик: <span data-f="from">ООО «Умный Дом Сервис»</span>, ИНН <span data-f="inn">7701234567</span></div><div>Покупатель: Старк Э.</div>
        <table class="w-full mt-3 text-[11px] border-collapse"><tr class="border-0 border-b border-solid border-[#999]"><td>Наименование</td><td class="text-right">Сумма</td></tr><tr><td>Монтаж датчиков Zigbee (12 шт.)</td><td class="text-right">18 000,00</td></tr><tr><td>Годовое обслуживание</td><td class="text-right">12 400,00</td></tr></table>
        <div class="text-right mt-2 font-bold">Итого: <span data-f="sum">30 400,00 ₽</span></div><div class="mt-2">Оплатить до: <span data-f="due">25 октября 2026 г.</span></div><div class="text-[10px] mt-1">Р/с <span data-f="acc">40702810•••••••1234</span></div>
        <div id="dc-scan" class="absolute left-0 right-0 h-1 bg-jv-cyan shadow-[0_0_15px_#00d4ff] hidden" style="top:0"></div></div></div>
      <div class="jv-tile">${L('Извлечённые данные')}<div id="dc-out" class="jv-sub">нажмите «Распознать»</div></div></div>`;
    const F = { num: 'Номер счёта', from: 'Поставщик', inn: 'ИНН', sum: 'Сумма', due: 'Срок оплаты', acc: 'Р/с' };
    $('#dc-go').onclick = async () => {
      const sc = $('#dc-scan'); sc.classList.remove('hidden'); $('#dc-out').innerHTML = '<div class="font-mono text-[11px]">👁 vision-модель читает документ…</div>';
      for (let y = 0; y <= 100; y += 4) { if (!alive(tok)) return; sc.style.top = y + '%'; await sleep(28) } sc.classList.add('hidden');
      for (const k in F) { if (!alive(tok)) return; const s = $(`[data-f="${k}"]`); s.style.outline = '2px solid #ffb547'; s.style.background = 'rgba(255,181,71,.25)'; await sleep(150) }
      $('#dc-out').innerHTML = `<table class="dt">${Object.entries(F).map(([k, n]) => `<tr><td class="text-jv-mute">${n}</td><td><b>${$(`[data-f="${k}"]`).textContent}</b></td></tr>`).join('')}</table>
        <div class="mt-3 rounded-lg border border-solid border-jv-gold/60 bg-jv-gold/10 p-3 text-[13px]">⚠️ «Годовое обслуживание 12 400 ₽» — в прошлом году было 9 800 ₽ (+27%). Уточнить у поставщика?</div>
        <div class="flex flex-wrap gap-2 mt-3"><button class="jv-btn" data-dk="⏰ Напомню 23 октября — за 2 дня до срока">⏰ НАПОМНИТЬ</button><button class="jv-btn" data-dk="📁 Сохранил в «Документы / Счета / 2026»">📁 В АРХИВ</button><button class="jv-btn" data-dk="✉️ Черновик письма поставщику готов">✉️ СПРОСИТЬ ПРО +27%</button></div>`;
      $$('[data-dk]').forEach(b => b.onclick = () => toast(b.dataset.dk)); speakAs('Счёт на тридцать тысяч четыреста рублей, оплатить до двадцать пятого октября. Обслуживание подорожало на двадцать семь процентов.');
    };
  }
});

/* ===================== 25 · РЕЖИМ РАЗРАБОТЧИКА ===================== */
LAB.push({
  group: 'Полезное', icon: '🛠', t: 'Режим разработчика', s: 'логи, токены, цена, A/B', d: 'Каждый запрос к модели: сколько токенов, сколько стоил, сколько ждали. С подключённым настоящим мозгом здесь появляются реальные запросы.',
  r(el) {
    const PRICE = { 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [.1, .5] };
    const demo = [['какая погода', 'claude-opus-5-5', 2140, 38, 820, 'tool_use'], ['', 'claude-opus-5-5', 2210, 24, 640, 'end_turn'], ['включи свет', 'claude-opus-5-5', 2190, 41, 710, 'tool_use'], ['', 'claude-opus-5-5', 2260, 19, 590, 'end_turn'], ['нарисуй схему', 'claude-opus-5-5', 2300, 410, 2900, 'tool_use']].map(([q, m, i, o, ms, st], k) => ({ t: new Date(Date.now() - (5 - k) * 60e3), model: m, inp: i, out: o, ms, stop: st, demo: true, req: { q }, res: [] }));
    const rows = () => [...demo, ...DEVLOG];
    const cost = r => { const p = PRICE[r.model] || PRICE['claude-opus-5-5']; return (r.inp * p[0] + r.out * p[1]) / 1e6 };
    el.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3" id="dv-k"></div><div class="grid grid-cols-1 xl:grid-cols-5 gap-3"><div class="jv-tile xl:col-span-3">${L('Запросы к модели')}<div class="tbl"><table class="dt" id="dv-t"></table></div><div class="jv-sub mt-2">${DEVLOG.length ? '' : '🎭 сейчас показаны демо-строки. Подключите настоящий мозг (кнопка в шапке) — и тут появятся реальные запросы.'}</div></div>
      <div class="jv-tile xl:col-span-2">${L('Детали запроса')}<pre id="dv-j" class="code m-0 !text-[11px] max-h-[360px] overflow-auto">кликните строку</pre></div></div>
      <div class="jv-tile mt-3">${L('A/B-тест системного промпта · 20 одинаковых вопросов')}<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${[['A', 'Ты — Джарвис. Отвечай вежливо.', 6.8, 46, 1.9], ['B', 'Ты — Джарвис, британский дворецкий. 1–2 предложения, обращение «сэр», лёгкая ирония.', 8.7, 21, 1.2]].map(([n, p, sc, w, s]) => `<div class="rounded-lg border border-solid ${n === 'B' ? 'border-jv-green' : 'border-jv-line'} p-3"><div class="flex items-center gap-2"><b class="font-hud text-jv-cyan">ВАРИАНТ ${n}</b>${n === 'B' ? '<span class="jv-badge border-jv-green text-jv-green">победил</span>' : ''}</div><div class="text-[12px] text-jv-mute mt-1 italic">«${p}»</div><div class="flex gap-5 mt-2 text-[12px]"><span>оценка судьи <b>${sc}</b>/10</span><span>~${w} слов</span><span>${s} с</span></div></div>`).join('')}</div></div>`;
    const draw = () => {
      const R = rows(), sum = R.reduce((a, r) => a + cost(r), 0), avg = Math.round(R.reduce((a, r) => a + r.ms, 0) / (R.length || 1));
      $('#dv-k').innerHTML = [['Запросов', R.length], ['Токенов', R.reduce((a, r) => a + r.inp + r.out, 0).toLocaleString('ru-RU')], ['Стоимость', '$' + sum.toFixed(4)], ['Ср. ожидание', avg + ' мс']].map(([n, v]) => `<div class="jv-tile"><div class="jv-label">${n}</div><div class="jv-value mt-2 !text-2xl">${v}</div></div>`).join('');
      $('#dv-t').innerHTML = `<tr><th>Время</th><th>Модель</th><th>Вход</th><th>Выход</th><th>Цена</th><th>мс</th><th>stop</th></tr>` + R.slice().reverse().map((r, i) => `<tr data-r="${R.length - 1 - i}" class="cursor-pointer hover:bg-jv-cyan/5"><td class="font-mono text-[11px]">${r.t.toLocaleTimeString('ru-RU')}${r.demo ? ' <span class="jv-sub">демо</span>' : ''}</td><td class="text-[11px]">${r.model}</td><td class="font-mono">${r.inp}</td><td class="font-mono">${r.out}</td><td class="font-mono">$${cost(r).toFixed(4)}</td><td class="font-mono">${r.ms}</td><td><span class="jv-badge ${r.stop === 'tool_use' ? 'border-jv-gold text-jv-gold' : 'border-jv-green text-jv-green'}">${r.stop}</span></td></tr>`).join('');
      $$('[data-r]').forEach(tr => tr.onclick = () => { const r = R[+tr.dataset.r]; $('#dv-j').textContent = JSON.stringify({ request: r.req, response: r.res, usage: { input_tokens: r.inp, output_tokens: r.out }, stop_reason: r.stop, cost_usd: +cost(r).toFixed(5) }, null, 2) });
    };
    draw();
  }
});

/* ===================== 26 · ГОЛОСОВОЙ ДНЕВНИК ===================== */
LAB.push({
  group: 'Полезное', icon: '📔', t: 'Голосовой дневник', s: '2 минуты вечером → тренды', d: 'Вечером Джарвис задаёт пару вопросов. Из ответов — настроение, энергия, темы. Через месяц видно, что на вас влияет.',
  r(el, tok) {
    const mood = [3, 4, 3, 2, 2, 3, 4, 4, 5, 3, 4, 2, 3, 4], E = [['😊', 'Сегодня', 'Хороший день: демо-зону согласовали, вечером зал.', ['работа', 'спорт']], ['😐', 'Вчера', 'Устал, много созвонов. Не успел к маме.', ['работа', 'семья']], ['😫', '13 окт', 'Лёг в 3 ночи, весь день разбитый.', ['сон']], ['🤩', '12 окт', 'Голограмма заработала!', ['проект']]];
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="jv-tile text-center"><div class="jv-label">Вечерняя запись</div><button id="dy-rec" class="mx-auto mt-5 w-28 h-28 rounded-full border-0 cursor-pointer bg-[radial-gradient(circle,#ff8d98,#ff4d5e_50%,transparent_72%)] shadow-[0_0_40px_#ff4d5e] text-3xl">🎙</button><div id="dy-tm" class="font-mono text-jv-red mt-3">02:00</div><div id="dy-q" class="text-[14px] mt-3 min-h-[44px]">«Как прошёл день, сэр?»</div></div>
      <div class="jv-tile lg:col-span-2">${L('Настроение · 14 дней')}<svg viewBox="0 0 280 90" class="w-full h-32"><polyline points="${mood.map((m, i) => `${i * 20 + 10},${85 - m * 15}`).join(' ')}" fill="none" stroke="#b48cff" stroke-width="2" style="filter:drop-shadow(0 0 4px #b48cff)"/>${mood.map((m, i) => `<circle cx="${i * 20 + 10}" cy="${85 - m * 15}" r="3" fill="${m >= 4 ? '#3dffa8' : m <= 2 ? '#ff4d5e' : '#b48cff'}"/>`).join('')}</svg>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-[12.5px]"><div class="rounded-md bg-jv-green/10 p-2">📈 Лучшие дни — <b>после зала</b> (4.3 vs 2.9)</div><div class="rounded-md bg-jv-red/10 p-2">📉 Худшие — после сна <b>&lt; 6 ч</b></div><div class="rounded-md bg-jv-gold/10 p-2">💡 «Мама» упоминается с грустью 3 раза — позвонить?</div></div></div>
      <div class="jv-tile lg:col-span-3">${L('Записи')}<div id="dy-e" class="grid grid-cols-1 md:grid-cols-2 gap-2"></div></div></div>`;
    const draw = () => $('#dy-e').innerHTML = E.map(([e, d, t, tg]) => `<div class="tile-in flex gap-3 rounded-lg bg-white/5 p-3"><span class="text-2xl">${e}</span><div><div class="jv-sub">${d}</div><div class="text-[13px]">${esc(t)}</div><div class="flex gap-1 mt-1">${tg.map(x => `<span class="jv-badge border-jv-line text-jv-mute !text-[9px]">#${x}</span>`).join('')}</div></div></div>`).join('');
    let rec = false; $('#dy-rec').onclick = async () => { if (rec) return; rec = true; const Q = ['«Как прошёл день, сэр?»', '«Что было лучшим?»', '«Что завтра хотите сделать иначе?»']; for (let s = 0; s < 3; s++) { if (!alive(tok)) return; $('#dy-q').textContent = Q[s]; speakAs(Q[s].replace(/[«»]/g, '')); for (let k = 0; k < 4; k++) { await sleep(500); if (!alive(tok)) return; $('#dy-tm').textContent = `01:${String(59 - s * 20 - k * 5).padStart(2, '0')}` } } E.unshift(['🙂', 'Только что', 'День продуктивный, лучшее — разговор с Брюсом. Завтра лечь до 00:00.', ['работа', 'сон']]); draw(); $('#dy-q').textContent = '✓ Записал. Спокойной ночи, сэр.'; $('#dy-tm').textContent = '02:00'; rec = false; speakAs('Записал. Спокойной ночи, сэр.') };
    draw();
  }
});

/* ===================== 27 · СОВМЕСТНЫЙ ДЖАРВИС ===================== */
LAB.push({
  group: 'Полезное', icon: '👥', t: 'Совместный Джарвис', s: 'общие списки и календарь', d: 'Один Джарвис на семью или команду: общий список покупок, общий календарь, кто что добавил — и личное остаётся личным.',
  r(el) {
    const U = { t: ['Тони', '#00d4ff', '🧔'], p: ['Пеппер', '#b48cff', '👩'], m: ['Морган', '#ffb547', '👧'] }; let who = 't';
    const list = [['Молоко', 'p', false], ['Кофе в зёрнах', 't', true], ['Мороженое 🍦', 'm', false], ['Батарейки AA', 't', false]];
    const EV = [['09:00', 'm', 'Садик'], ['10:15', 't', 'Стендап'], ['11:00', 'p', 'Совет директоров'], ['17:00', 'm', 'Бассейн (отвозит Хэппи)'], ['20:00', 'p', 'Ужин у родителей — все']];
    el.innerHTML = `<div class="jv-tile mb-3 flex items-center gap-2 flex-wrap"><span class="jv-label !mb-0 mr-2">Говорит</span>${Object.entries(U).map(([k, [n, c, e]]) => `<button data-u="${k}" class="chip">${e} ${n}</button>`).join('')}<span class="ml-auto flex -space-x-2">${Object.values(U).map(([n, c, e]) => `<span class="w-8 h-8 rounded-full grid place-items-center border-2 border-solid" style="border-color:${c};background:${c}33" title="${n} онлайн">${e}</span>`).join('')}</span></div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3"><div class="jv-tile">${L('🛒 Общий список покупок')}<div id="cl-l"></div><div class="flex gap-2 mt-3"><input id="cl-in" class="flex-1 bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-3 py-2 text-[13px] outline-none" placeholder="«Джарвис, добавь в список…»"><button id="cl-add" class="jv-btn">+</button></div></div>
        <div class="jv-tile">${L('📅 Общий календарь на сегодня')}<div id="cl-c"></div><div class="jv-sub mt-3">🔒 Личные заметки, почта и дневник каждого — не видны остальным.</div></div></div>`;
    const draw = () => { $$('[data-u]').forEach(b => b.classList.toggle('!border-jv-cyan', b.dataset.u === who)); $('#cl-l').innerHTML = list.map(([t, u, d], i) => `<label class="jv-row cursor-pointer !justify-start"><input type="checkbox" data-li="${i}" ${d ? 'checked' : ''} class="accent-[#00d4ff]"><span class="flex-1 ${d ? 'line-through opacity-50' : ''}">${esc(t)}</span><span class="w-6 h-6 rounded-full grid place-items-center text-[12px]" style="background:${U[u][1]}33;border:1px solid ${U[u][1]}" title="добавил(а) ${U[u][0]}">${U[u][2]}</span></label>`).join(''); $$('[data-li]').forEach(c => c.onchange = () => { list[+c.dataset.li][2] = c.checked; draw() });
      $('#cl-c').innerHTML = EV.map(([t, u, n]) => `<div class="flex items-center gap-3 py-1.5"><span class="font-mono text-[12px] text-jv-cyan w-12">${t}</span><span class="w-1 self-stretch rounded" style="background:${U[u][1]}"></span><span class="flex-1 text-[13px]">${esc(n)}</span><span>${U[u][2]}</span></div>`).join('') };
    $$('[data-u]').forEach(b => b.onclick = () => { who = b.dataset.u; draw() });
    const add = () => { const v = $('#cl-in').value.trim(); if (!v) return; list.push([v, who, false]); $('#cl-in').value = ''; draw(); toast(`🛒 ${U[who][0]} добавил(а) «${v}» — остальные увидят на телефонах`) };
    $('#cl-add').onclick = add; $('#cl-in').onkeydown = e => { if (e.key === 'Enter') add() }; draw();
  }
});

/* ===================== 28 · ИГРЫ ===================== */
LAB.push({
  group: 'Полезное', icon: '🎲', t: 'Игры и сказки', s: 'квиз и сказка на ночь', d: 'Джарвис-ведущий: квиз с таймером голосом и сказки для детей, которые сочиняются из выбранных героев.',
  r(el, tok) {
    const Q = [['Какая планета самая большая в Солнечной системе?', ['Сатурн', 'Юпитер', 'Нептун'], 1], ['Сколько ног у паука?', ['6', '8', '10'], 1], ['Кто создал Джарвиса в фильме?', ['Брюс Беннер', 'Тони Старк', 'Ник Фьюри'], 1], ['Что тяжелее: килограмм пуха или килограмм железа?', ['Железо', 'Пух', 'Одинаково'], 2], ['Самый быстрый наземный зверь?', ['Гепард', 'Лев', 'Антилопа'], 0]];
    const HERO = ['🐉 дракончик Искра', '🤖 робот Болт', '🦊 лисёнок Рыжик'], PLACE = ['в облачном городе', 'на дне океана', 'на Луне'], GOAL = ['искал потерянную звезду', 'учился дружить', 'чинил радугу'];
    let qi = 0, sc = 0, tm, sel = [0, 0, 0];
    el.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-3"><div class="jv-tile">${L('🧠 Квиз')}<div id="gm-q"></div></div><div class="jv-tile">${L('🌙 Сказка на ночь')}${[['Герой', HERO], ['Где', PLACE], ['Что делал', GOAL]].map(([n, a], k) => `<div class="mb-2"><div class="jv-sub mb-1">${n}</div><div class="flex flex-wrap gap-1.5">${a.map((x, i) => `<button data-st="${k}-${i}" class="chip">${x}</button>`).join('')}</div></div>`).join('')}<button id="gm-tell" class="jv-btn mt-2">📖 РАССКАЖИ</button><div id="gm-story" class="mt-3 text-[14px] leading-relaxed"></div></div></div>`;
    const qz = () => { clearInterval(tm); if (qi >= Q.length) { $('#gm-q').innerHTML = `<div class="text-center py-8"><div class="text-5xl">${sc >= 4 ? '🏆' : '👏'}</div><div class="text-[20px] mt-2">${sc} из ${Q.length}</div><button id="gm-re" class="jv-btn mt-4">↻ ЕЩЁ РАЗ</button></div>`; $('#gm-re').onclick = () => { qi = sc = 0; qz() }; speakAs(`${sc} из ${Q.length}. ${sc >= 4 ? 'Блестяще, сэр.' : 'Неплохо.'}`); return }
      const [q, o, r] = Q[qi]; let t = 10; $('#gm-q').innerHTML = `<div class="flex justify-between jv-sub"><span>вопрос ${qi + 1}/${Q.length}</span><span>очки: ${sc}</span></div><div class="h-1 rounded-full bg-white/10 mt-2 overflow-hidden"><div id="gm-bar" class="h-full bg-jv-gold transition-all duration-1000" style="width:100%"></div></div><div class="text-[18px] text-white mt-4 min-h-[56px]">${q}</div><div class="grid gap-2 mt-3">${o.map((x, i) => `<button data-an="${i}" class="jv-btn !text-[13px] !normal-case !tracking-normal !font-sans !py-3">${x}</button>`).join('')}</div>`;
      speakAs(q); tm = setInterval(() => { if (!alive(tok)) return clearInterval(tm); t--; $('#gm-bar').style.width = t * 10 + '%'; if (t <= 0) { clearInterval(tm); qi++; toast('⏰ Время вышло'); qz() } }, 1000);
      $$('[data-an]').forEach(b => b.onclick = () => { clearInterval(tm); const ok = +b.dataset.an === r; if (ok) sc++; b.style.background = ok ? '#3dffa833' : '#ff4d5e33'; b.style.borderColor = ok ? '#3dffa8' : '#ff4d5e'; speakAs(ok ? 'Верно!' : 'Увы. Правильно — ' + o[r]); setTimeout(() => { if (!alive(tok)) return; qi++; qz() }, 1300) }) };
    const pick = () => $$('[data-st]').forEach(b => { const [k, i] = b.dataset.st.split('-').map(Number); b.classList.toggle('!border-jv-purple', sel[k] === i); b.classList.toggle('!text-jv-purple', sel[k] === i) });
    $$('[data-st]').forEach(b => b.onclick = () => { const [k, i] = b.dataset.st.split('-').map(Number); sel[k] = i; pick() }); pick();
    $('#gm-tell').onclick = async () => { const h = HERO[sel[0]].split(' ').slice(1).join(' '), p = PLACE[sel[1]], g = GOAL[sel[2]]; const S = [`Жил-был ${h} ${p}.`, `Каждый день он ${g}, но ничего не получалось.`, `Однажды ему встретился старый мудрый светлячок.`, `«Главное — не сдаваться и звать друзей», — сказал светлячок.`, `${h[0].toUpperCase() + h.slice(1)} позвал друзей, и вместе у них всё получилось.`, `А теперь — пора спать. Спокойной ночи!`]; $('#gm-story').innerHTML = ''; for (const s of S) { if (!alive(tok)) return; const d = document.createElement('p'); d.className = 'tile-in m-0 mb-1.5'; d.textContent = s; $('#gm-story').append(d); await speakAs(s, { rate: .9, pitch: 1.1 }) } };
    qz(); return () => clearInterval(tm);
  }
});
