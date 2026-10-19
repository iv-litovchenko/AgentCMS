/* ЛАБОРАТОРИЯ, часть 2: модули 07–12 */

/* ===================== 07 · ПЕРЕВОДЧИК В РЕАЛЬНОМ ВРЕМЕНИ ===================== */
LAB.push({
  icon: '🌐', t: 'Переводчик вживую', s: 'два языка, Джарвис посередине', d: 'Вы говорите по-русски, собеседник — на своём. Джарвис слышит обоих и переводит голосом с сохранением тона.',
  r(el, tok) {
    const RU = ['Здравствуйте! Рад наконец познакомиться.', 'Взаимно. Как вам наш прототип?', 'Впечатляет. Сколько стоит партия из тысячи штук?', 'Около сорока тысяч долларов, доставка через месяц.', 'Если закажем две тысячи, будет скидка?', 'Да, пятнадцать процентов. Пришлю договор сегодня.'];
    const LANGS = {
      en: ['🇬🇧 English', 'en-US', 'Mr. Smith', ['Hello! Glad to finally meet you.', 'Likewise. What do you think of our prototype?', 'Impressive. How much is a batch of a thousand units?', 'About forty thousand dollars, delivery in a month.', 'If we order two thousand, is there a discount?', "Yes, fifteen percent. I'll send the contract today."], 'деловой, нейтральный'],
      ja: ['🇯🇵 日本語', 'ja-JP', '田中さん', ['こんにちは！やっとお会いできて嬉しいです。', 'こちらこそ。私たちの試作品はいかがですか？', '素晴らしいです。千個のロットはおいくらですか？', '約四万ドルで、納品は一か月後です。', '二千個注文したら、割引はありますか？', 'はい、15パーセントです。今日契約書をお送りします。'], 'вежливая форма (keigo)'],
      es: ['🇪🇸 Español', 'es-ES', 'Sr. García', ['¡Hola! Me alegra conocerle por fin.', 'Igualmente. ¿Qué le parece nuestro prototipo?', 'Impresionante. ¿Cuánto cuesta un lote de mil unidades?', 'Unos cuarenta mil dólares, con entrega en un mes.', 'Si pedimos dos mil, ¿hay descuento?', 'Sí, un quince por ciento. Le envío el contrato hoy.'], 'на «usted» — уважительно'],
      tr: ['🇹🇷 Türkçe', 'tr-TR', 'Ahmet Bey', ['Merhaba! Sonunda tanıştığımıza memnun oldum.', 'Ben de. Prototipimiz hakkında ne düşünüyorsunuz?', 'Etkileyici. Bin adetlik bir parti ne kadar?', 'Yaklaşık kırk bin dolar, teslimat bir ay içinde.', 'İki bin adet sipariş verirsek indirim olur mu?', 'Evet, yüzde on beş. Sözleşmeyi bugün gönderiyorum.'], 'вежливый, «Bey» к имени'],
    };
    let lang = 'ja', run = false;
    el.innerHTML = `<div class="jv-tile mb-3 flex flex-wrap items-center gap-2"><span class="jv-label !mb-0 mr-2">Язык собеседника</span>${Object.entries(LANGS).map(([k, v]) => `<button data-l="${k}" class="jv-badge cursor-pointer bg-transparent">${v[0]}</button>`).join('')}
        <label class="ml-auto flex items-center gap-2 jv-sub cursor-pointer"><input type="checkbox" id="tr-voice" checked class="accent-[#00d4ff]"> озвучивать перевод</label><button id="tr-go" class="jv-btn">▶ НАЧАТЬ РАЗГОВОР</button></div>
      <div class="grid grid-cols-1 md:grid-cols-[1fr_120px_1fr] gap-3 items-stretch">
        <div class="jv-tile"><div class="flex items-center gap-2 mb-3"><span class="text-2xl">🧔</span><div><div class="font-semibold">Вы</div><div class="jv-sub">🇷🇺 русский · слышите по-русски</div></div><div class="ml-auto flex items-end gap-[2px] h-6" id="tr-wa">${'<i class="block w-[3px] rounded bg-jv-cyan/30" style="height:3px"></i>'.repeat(14)}</div></div><div id="tr-a" class="space-y-2 min-h-[320px] max-h-[420px] overflow-y-auto"></div></div>
        <div class="flex md:flex-col items-center justify-center gap-2 text-center"><div class="relative w-20 h-20"><div class="absolute inset-0 rounded-full border-2 border-solid border-jv-cyan animate-spin" style="border-top-color:transparent;animation-duration:3s"></div><div class="absolute inset-3 rounded-full bg-jv-cyan/20 grid place-items-center text-2xl" style="box-shadow:0 0 25px #00d4ff">🤖</div></div><div class="jv-sub">Джарвис<br><span id="tr-lat" class="text-jv-gold">задержка —</span></div><div id="tr-tone" class="jv-badge border-jv-purple text-jv-purple !text-[9px]"></div></div>
        <div class="jv-tile"><div class="flex items-center gap-2 mb-3"><span class="text-2xl">🧑‍💼</span><div><div class="font-semibold" id="tr-name"></div><div class="jv-sub" id="tr-sub"></div></div><div class="ml-auto flex items-end gap-[2px] h-6" id="tr-wb">${'<i class="block w-[3px] rounded bg-jv-gold/30" style="height:3px"></i>'.repeat(14)}</div></div><div id="tr-b" class="space-y-2 min-h-[320px] max-h-[420px] overflow-y-auto"></div></div></div>
      <div class="jv-sub mt-3">В реальности: потоковый STT → LLM-перевод с контекстом разговора → TTS голосом, похожим на говорящего. Задержка 0.6–1.2 с. Наушник у вас, колонка или телефон — у собеседника.</div>`;
    const setL = k => { lang = k; $$('[data-l]').forEach(b => { const on = b.dataset.l === k; b.classList.toggle('border-jv-cyan', on); b.classList.toggle('text-jv-cyan', on); b.classList.toggle('border-jv-line', !on); b.classList.toggle('text-jv-mute', !on) }); const L2 = LANGS[k]; $('#tr-name').textContent = L2[2]; $('#tr-sub').textContent = L2[0] + ' · слышит на своём'; $('#tr-tone').textContent = 'тон: ' + L2[4] };
    $$('[data-l]').forEach(b => b.onclick = () => { if (!run) setL(b.dataset.l) }); setL(lang);
    const bub = (box, text, kind, extra = '') => { const d = document.createElement('div'); d.className = 'tile-in rounded-xl border border-solid px-3 py-2 ' + (kind === 'orig' ? 'bg-white/5 border-jv-line' : 'bg-jv-cyan/10 border-jv-cyan/40'); d.innerHTML = `<div class="font-mono text-[9.5px] text-jv-mute mb-0.5">${kind === 'orig' ? '🎙 оригинал' : '🔊 перевод Джарвиса'} ${extra}</div><div class="text-[14px] tx"></div>`; box.append(d); box.scrollTop = 1e9; return d.querySelector('.tx') };
    let wv; const wave = id => { clearInterval(wv); $$('#tr-wa i,#tr-wb i').forEach(i => i.style.height = '3px'); if (!id) return; wv = setInterval(() => $$(id + ' i').forEach(i => i.style.height = (3 + Math.random() * 20) + 'px'), 90) };
    $('#tr-go').onclick = async () => {
      if (run) return; run = true; $('#tr-go').disabled = true; $('#tr-a').innerHTML = $('#tr-b').innerHTML = ''; const [, code, , FX] = LANGS[lang];
      for (let i = 0; i < RU.length; i++) {
        if (!alive(tok)) return; const me = i % 2 === 0, src = me ? RU[i] : FX[i], dst = me ? FX[i] : RU[i];
        const [A, B] = me ? ['#tr-a', '#tr-b'] : ['#tr-b', '#tr-a']; wave(me ? '#tr-wa' : '#tr-wb');
        await typeInto(bub($(A), '', 'orig'), src, 35, tok); if (!alive(tok)) return; wave(null);
        const lat = (0.55 + Math.random() * .5).toFixed(2); $('#tr-lat').textContent = 'задержка ' + lat + ' с'; await sleep(lat * 1000); if (!alive(tok)) return;
        const t = bub($(B), '', 'tr', `· ${lat} с`); await typeInto(t, dst, 14, tok);
        if ($('#tr-voice').checked) await speakAs(dst, { lang: me ? code : 'ru-RU', rate: 1.05 }); else await sleep(600);
      }
      if (!alive(tok)) return; run = false; $('#tr-go').disabled = false; $('#tr-go').textContent = '↻ ЕЩЁ РАЗ'; toast('🌐 Итог встречи: скидка 15% на 2 000 шт, договор сегодня — записал в мозг');
    };
    return () => clearInterval(wv);
  }
});

/* ===================== 08 · РЕЖИМ «СНЫ» ===================== */
LAB.push({
  icon: '🌙', t: 'Режим «Сны»', s: 'ночные инсайты к утру', d: 'Ночью агент перебирает заметки и разговоры, ищет неочевидные связи, забытые обещания и закономерности — и утром показывает.',
  r(el, tok) {
    el.innerHTML = `<div class="jv-tile !p-0 relative overflow-hidden mb-3" style="height:220px;background:linear-gradient(180deg,#0a0820,#04121c)"><canvas id="dr-c" class="absolute inset-0 w-full h-full"></canvas>
        <div class="absolute left-6 bottom-5 right-6"><div class="font-hud text-jv-purple tracking-[.25em] text-[11px]">ОТЧЁТ О СНЕ · 02:00 – 05:40</div><div class="text-[20px] text-white mt-1">Доброе утро, сэр. Пока вы спали, я перечитал <b class="text-jv-cyan">41 заметку</b> и <b class="text-jv-cyan">3 дня разговоров</b>.</div>
        <div class="flex gap-2 mt-3"><button id="dr-replay" class="jv-badge border-jv-purple text-jv-purple bg-black/40 cursor-pointer">▶ посмотреть сон</button><button id="dr-brain" class="jv-badge border-jv-cyan text-jv-cyan bg-black/40 cursor-pointer">🧠 открыть во втором мозге</button></div></div></div>
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3" id="dr-cards"></div>`;
    const C = [
      ['✨ Новая связь', 'border-jv-purple', `<div class="flex items-center gap-2 text-[13px]"><span class="jv-badge border-jv-green text-jv-green">Сон</span><span class="flex-1 h-px bg-jv-purple relative"><span class="absolute left-1/2 -top-2.5 -translate-x-1/2 text-[10px] text-jv-purple bg-[#06121b] px-1">0.82</span></span><span class="jv-badge border-jv-gold text-jv-gold">Идея «сны»</span></div><div class="text-[13px] mt-3">Ваша идея «Джарвис, который видит сны» по сути повторяет то, что вы записали о сне: мозг ночью консолидирует память. Это хороший аргумент для питча на Expo.</div>`, true],
      ['✨ Новая связь', 'border-jv-purple', `<div class="flex items-center gap-2 text-[13px]"><span class="jv-badge border-jv-cyan text-jv-cyan">Баг бэкапа NAS</span><span class="flex-1 h-px bg-jv-purple"></span><span class="jv-badge border-jv-green text-jv-green">Ollama</span></div><div class="text-[13px] mt-3">Бэкап падает в 03:10 — ровно когда Ollama на том же сервере пересчитывает эмбеддинги. Скорее всего, дело не в диске, а в нехватке памяти.</div>`, true],
      ['⏳ Забытое обещание', 'border-jv-gold', `<div class="text-[13px]">12 марта вы пообещали маме «простого Джарвиса». Прошло <b class="text-jv-gold">7 месяцев</b>. У вас лежит лишний Raspberry Pi 5 — хватит на прототип за выходные.</div><div class="flex gap-2 mt-3"><button class="jv-badge border-jv-gold text-jv-gold bg-transparent cursor-pointer" data-dr="Добавил «Джарвис для мамы» в план на субботу">📅 в план на субботу</button></div>`],
      ['📈 Закономерность', 'border-jv-cyan', `<div class="text-[13px] mb-2">В дни после зала у вас на <b class="text-jv-green">22% больше</b> глубокой работы (по данным за 8 недель):</div><div class="flex items-end gap-3 h-24">${[['без зала', 3.1, '#3d5566'], ['после зала', 3.8, '#3dffa8']].map(([n, v, c]) => `<div class="flex-1 text-center"><div class="mx-auto w-14 rounded-t" style="height:${v * 20}px;background:${c};box-shadow:0 0 12px ${c}66"></div><div class="jv-sub mt-1">${n} · ${v} ч</div></div>`).join('')}</div>`],
      ['❓ Вопрос дня', 'border-jv-red', `<div class="text-[13px]">Вы забросили «кофе по пульсу», потому что Home Assistant не видел кофемашину. В сентябре вышла интеграция для вашей модели. <b>Вернуться к идее?</b></div><div class="flex gap-2 mt-3"><button class="jv-badge border-jv-green text-jv-green bg-transparent cursor-pointer" data-dr="Идея «кофе по пульсу» снова в работе">↺ вернуть</button><button class="jv-badge border-jv-line text-jv-mute bg-transparent cursor-pointer" data-dr="Ок, больше не напомню">✗ нет</button></div>`],
      ['🧹 Уборка в мозге', 'border-jv-line', `<div class="text-[13px] space-y-1"><div>• склеил 2 дубля: «Whisper» и «распознавание речи»</div><div>• 3 заметки без связей — предлагаю привязать</div><div>• устарело: «MVP работает с января» → обновить цифры задержки?</div></div>`],
    ];
    $('#dr-cards').innerHTML = C.map(([t, b, h, acc], i) => `<div class="jv-tile ${b} tile-in" style="animation-delay:${i * 90}ms">${L(t)}${h}${acc ? `<div class="flex gap-2 mt-3"><button class="jv-badge border-jv-green text-jv-green bg-transparent cursor-pointer" data-dr="Связь принята — добавил в граф">✓ принять связь</button><button class="jv-badge border-jv-line text-jv-mute bg-transparent cursor-pointer" data-dr="Понял, это совпадение — запомнил">✗ ерунда</button></div>` : ''}</div>`).join('');
    $$('[data-dr]').forEach(b => b.onclick = () => { toast(b.dataset.dr); b.parentElement.innerHTML = `<span class="jv-sub text-jv-green">✓ ${b.dataset.dr}</span>` });
    $('#dr-brain').onclick = () => { goTab('brain'); setTimeout(() => window.brainAsk?.('Что общего у сна и ИИ?'), 600) };
    // анимация «сна»: созвездие, связи вспыхивают
    const cv = $('#dr-c'), x = cv.getContext('2d'); let W, H, raf, stars, links = [], t0 = performance.now();
    const rs = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * devicePixelRatio; cv.height = H * devicePixelRatio; x.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); stars = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H * .7, r: Math.random() * 2 + 1, p: Math.random() * 6, c: ['#00d4ff', '#b48cff', '#3dffa8', '#ffb547'][Math.random() * 4 | 0] })) }; rs();
    const replay = () => { links = []; t0 = performance.now(); for (let i = 0; i < 26; i++) { const a = Math.random() * stars.length | 0, b = Math.random() * stars.length | 0; if (a !== b) links.push({ a, b, t: i * 160 + Math.random() * 100, gold: i % 9 === 4 }) } };
    $('#dr-replay').onclick = replay; replay();
    (function loop(now) {
      if (!alive(tok)) return; raf = requestAnimationFrame(loop); const t = now - t0; x.clearRect(0, 0, W, H);
      links.forEach(l => { if (t < l.t) return; const k = Math.min(1, (t - l.t) / 600), A = stars[l.a], B = stars[l.b]; x.strokeStyle = l.gold ? `rgba(255,181,71,${.7 * k})` : `rgba(180,140,255,${.25 * k})`; x.lineWidth = l.gold ? 1.6 : .8; x.beginPath(); x.moveTo(A.x, A.y); x.lineTo(A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k); x.stroke() });
      stars.forEach(s => { x.fillStyle = s.c; x.globalAlpha = .4 + .6 * Math.abs(Math.sin(now / 900 + s.p)); x.shadowColor = s.c; x.shadowBlur = 10; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 7); x.fill() }); x.globalAlpha = 1; x.shadowBlur = 0;
    })(performance.now());
    return () => cancelAnimationFrame(raf);
  }
});

/* ===================== 09 · СЕМЕЙНЫЙ РЕЖИМ ===================== */
LAB.push({
  icon: '👨‍👩‍👧', t: 'Семейный режим', s: 'узнаёт, кто говорит', d: 'Голосовой отпечаток (voice ID) определяет, кто говорит. У каждого своя память, права и стиль ответа.',
  r(el, tok) {
    const P = { tony: ['Тони', '🧔', '#00d4ff', 'владелец', 'всё', 214], pepper: ['Пеппер', '👩', '#b48cff', 'взрослый', 'всё, кроме мастерской', 156], morgan: ['Морган', '👧', '#ffb547', 'ребёнок, 6 лет', 'мультики до 20:00, свет, музыка', 38], guest: ['Гость', '🧑', '#9fc3d4', 'не узнан', 'свет, музыка, погода', 0] };
    const PR = Object.fromEntries(Object.keys(P).map((k, i) => [k, Array.from({ length: 24 }, (_, j) => .3 + .7 * Math.abs(Math.sin(j * (.5 + i * .37) + i * 2)))]));
    const RQ = { cartoons: ['📺 «Включи мультики»', { tony: 'Включаю на большом телевизоре.', pepper: 'Включаю. Морган уже смотрела сегодня час, к слову.', morgan: 'Конечно! Но только до восьми — потом спать, договорились? Включаю «Щенячий патруль».', guest: 'Включаю, телевизор в гостиной.' }], door: ['🚪 «Открой входную дверь»', { tony: 'Открываю.', pepper: 'Открываю, Пеппер.', morgan: 'Дверь открывают только взрослые. Позвать маму?', guest: 'Гостям дверь не открываю. Отправил запрос Тони на телефон.' }], pizza: ['🍕 «Закажи пиццу»', { tony: 'Пепперони, как обычно, 2 900 рублей — подтверждаете?', pepper: 'Без глютена из «Наполи», как в прошлый раз?', morgan: 'Пиццу заказывают родители. Передам папе, что ты очень хочешь пиццу!', guest: 'Покупки доступны только хозяевам дома.' }], tomorrow: ['📅 «Что у меня завтра?»', { tony: 'Завтра стендап в 10 и тест костюма в 16.', pepper: 'Совет директоров в 11 и ужин у родителей в 20:00.', morgan: 'Завтра садик, а в пять — бассейн!', guest: 'Я не знаю вашего расписания — вы не в моём списке. Хотите, познакомимся?' }] };
    el.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3" id="fm-p">${Object.entries(P).map(([k, [n, e, c, role, perm, mem]]) => `<div data-p="${k}" class="jv-tile transition"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full grid place-items-center text-2xl" style="background:${c}22;border:2px solid ${c}">${e}</div><div><div class="font-semibold">${n}</div><div class="jv-sub">${role}</div></div></div><div class="flex items-end gap-[2px] h-8 mt-3">${PR[k].map(v => `<i class="block flex-1 rounded-sm" style="height:${v * 100}%;background:${c}66"></i>`).join('')}</div><div class="jv-sub mt-2">🔑 ${perm}</div><div class="jv-sub">🧠 ${mem} воспоминаний</div><div class="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden"><div data-sim="${k}" class="h-full w-0 transition-all duration-700" style="background:${c}"></div></div></div>`).join('')}</div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div class="jv-tile">${L('1. Кто говорит?')}<div class="flex flex-wrap gap-1.5">${Object.entries(P).map(([k, [n, e]]) => `<button data-who="${k}" class="chip">${e} ${n}</button>`).join('')}</div>${L('2. Что говорит?', 'mt-4')}<div class="flex flex-wrap gap-1.5">${Object.entries(RQ).map(([k, [t]]) => `<button data-rq="${k}" class="chip">${t}</button>`).join('')}</div><button id="fm-go" class="jv-btn w-full mt-4 !py-3">🎙 ПРОИЗНЕСТИ</button></div>
        <div class="jv-tile lg:col-span-2">${L('Распознавание и ответ')}<div class="flex items-end gap-[2px] h-14" id="fm-in">${'<i class="block flex-1 rounded-sm bg-jv-mute/30" style="height:6%"></i>'.repeat(24)}</div><div id="fm-res" class="mt-4 min-h-[110px]"><div class="jv-sub">выберите, кто и что говорит</div></div></div></div>`;
    let who = 'morgan', rq = 'door';
    const sel = () => { $$('[data-who]').forEach(b => b.classList.toggle('!border-jv-cyan', b.dataset.who === who)); $$('[data-rq]').forEach(b => b.classList.toggle('!border-jv-cyan', b.dataset.rq === rq)) };
    $$('[data-who]').forEach(b => b.onclick = () => { who = b.dataset.who; sel() }); $$('[data-rq]').forEach(b => b.onclick = () => { rq = b.dataset.rq; sel() }); sel();
    $('#fm-go').onclick = async () => {
      $('#fm-go').disabled = true; $$('[data-sim]').forEach(s => s.style.width = 0); $$('[data-p]').forEach(p => p.style.boxShadow = ''); $('#fm-res').innerHTML = '<div class="font-mono text-[12px] text-jv-mute">🎙 запись… → эмбеддинг голоса (256 чисел) → сравнение с 3 профилями</div>';
      const bars = $$('#fm-in i'), pr = PR[who === 'guest' ? 'guest' : who];
      for (let f = 0; f < 14; f++) { if (!alive(tok)) return; bars.forEach((b, i) => { b.style.height = (pr[i] * 100 * (.6 + Math.random() * .5)) + '%'; b.style.background = '#00d4ff' }); await sleep(70) }
      const sims = Object.fromEntries(Object.keys(P).filter(k => k !== 'guest').map(k => [k, k === who ? .88 + Math.random() * .08 : .2 + Math.random() * .3]));
      Object.entries(sims).forEach(([k, v]) => $(`[data-sim="${k}"]`).style.width = v * 100 + '%'); await sleep(800); if (!alive(tok)) return;
      const best = Object.entries(sims).sort((a, b) => b[1] - a[1])[0]; const id = best[1] > .7 ? best[0] : 'guest'; const [n, e, c] = P[id];
      $(`[data-p="${id}"]`).style.boxShadow = `0 0 0 2px ${c},0 0 30px ${c}55`;
      const ans = RQ[rq][1][id];
      $('#fm-res').innerHTML = `<div class="flex items-center gap-2"><span class="jv-badge" style="color:${c};border-color:${c}">${e} узнан: ${n} · ${id === 'guest' ? 'нет совпадений > 0.7' : 'сходство ' + best[1].toFixed(2)}</span><span class="jv-sub">профиль, права и память — ${n}</span></div><div class="mt-3 rounded-xl bg-jv-cyan/10 border border-solid border-jv-cyan/40 px-3 py-2.5 text-[15px]">🤖 ${esc(ans)}</div>`;
      await speakAs(ans, { pitch: id === 'morgan' ? 1.25 : .9 }); if (alive(tok)) $('#fm-go').disabled = false;
    };
  }
});

/* ===================== 10 · ОФЛАЙН ИЛИ ОБЛАКО ===================== */
LAB.push({
  icon: '☁️', t: 'Офлайн или облако', s: 'скорость, качество, цена', d: 'Каждый модуль можно запустить у себя или в облаке. Переключай и смотри, как меняются задержка, качество, цена и приватность.',
  r(el) {
    const M = [
      ['stt', '👂 Распознавание речи', ['☁️ Deepgram', 150, 9.5, 4, 2, 0], ['💻 faster-whisper', 280, 9, 0, 10, 3]],
      ['llm', '🧠 Мозг (LLM)', ['☁️ Claude', 380, 10, 25, 3, 0], ['💻 Qwen 14B · Ollama', 650, 7, 0, 10, 10]],
      ['tts', '🗣 Синтез речи', ['☁️ ElevenLabs', 220, 10, 22, 3, 0], ['💻 Piper', 70, 6.5, 0, 10, .5]],
      ['mem', '💾 Память', ['☁️ Mem0', 90, 9, 10, 2, 0], ['💻 SQLite + Chroma', 15, 8.5, 0, 10, .5]],
      ['vis', '👁 Зрение', ['☁️ Claude Vision', 900, 9.5, 8, 3, 0], ['💻 YOLO + LLaVA', 1200, 6.5, 0, 10, 6]],
    ];
    const PRE = { 'Максимум качества': [0, 0, 0, 0, 0], 'Баланс': [1, 0, 1, 1, 0], 'Приватно': [1, 1, 1, 1, 1], 'Бесплатно': [1, 1, 1, 1, 1] };
    const st = [1, 0, 1, 1, 0]; let offline = false;
    el.innerHTML = `<div class="grid grid-cols-1 xl:grid-cols-5 gap-3">
      <div class="jv-tile xl:col-span-3">${L('Модули · wake word всегда локально')}<div class="space-y-2" id="of-m"></div>
        <div class="flex flex-wrap gap-1.5 mt-4"><span class="jv-sub self-center mr-1">пресеты:</span>${Object.keys(PRE).map(k => `<button data-pre="${k}" class="chip">${k}</button>`).join('')}</div>
        <label class="flex items-center gap-2 mt-4 cursor-pointer text-[13px]"><input type="checkbox" id="of-net" class="accent-[#ff4d5e]"> 📡 пропал интернет</label></div>
      <div class="xl:col-span-2 flex flex-col gap-3"><div class="grid grid-cols-2 gap-3" id="of-k"></div><div class="jv-tile" id="of-v"></div></div></div>`;
    function render() {
      $('#of-m').innerHTML = M.map(([k, n, a, b], i) => { const o = [a, b][st[i]], broken = offline && st[i] === 0; return `<div class="flex flex-wrap items-center gap-2 p-2 rounded-lg ${broken ? 'bg-jv-red/10 border border-solid border-jv-red/50' : 'bg-white/[.03]'}"><span class="w-40 text-[13px]">${n}</span><div class="flex rounded-lg overflow-hidden border border-solid border-jv-line">${[a, b].map((x, j) => `<button data-m="${i}" data-j="${j}" class="px-3 py-1.5 text-[11.5px] border-0 cursor-pointer ${st[i] === j ? (j ? 'bg-jv-green/20 text-jv-green' : 'bg-jv-cyan/20 text-jv-cyan') : 'bg-transparent text-jv-mute'}">${x[0]}</button>`).join('')}</div><span class="ml-auto font-mono text-[10.5px] text-jv-mute">${broken ? '<span class="text-jv-red">✗ не работает</span>' : `${o[1]} мс · ${o[3] ? '$' + o[3] : 'бесплатно'}`}</span></div>` }).join('');
      $$('[data-m]').forEach(b => b.onclick = () => { st[+b.dataset.m] = +b.dataset.j; render() });
      const o = M.map((m, i) => m[2 + st[i]]);
      const lat = o[0][1] + o[1][1] + o[2][1] + o[3][1] + 150, q = (o[0][2] + o[1][2] * 2 + o[2][2] + o[3][2]) / 5, cost = o.reduce((a, x) => a + x[3], 0), priv = o.reduce((a, x) => a + x[4], 0) / o.length, vram = o.reduce((a, x) => a + x[5], 0), off = st.every(v => v === 1);
      const K = [['⚡ Ответ', lat + ' мс', lat < 900 ? 'text-jv-green' : lat < 1300 ? 'text-jv-gold' : 'text-jv-red', Math.max(5, 100 - lat / 20)], ['⭐ Качество', q.toFixed(1) + '/10', q > 8.8 ? 'text-jv-green' : 'text-jv-gold', q * 10], ['💸 В месяц', cost ? '$' + cost : '$0', cost > 30 ? 'text-jv-gold' : 'text-jv-green', 100 - cost * 1.4], ['🔒 Приватность', priv.toFixed(1) + '/10', priv > 8 ? 'text-jv-green' : priv > 5 ? 'text-jv-gold' : 'text-jv-red', priv * 10]];
      $('#of-k').innerHTML = K.map(([n, v, c, p]) => `<div class="jv-tile"><div class="jv-label">${n}</div><div class="jv-value mt-2 !text-2xl ${c}">${v}</div><div class="h-1.5 rounded-full bg-white/5 mt-3 overflow-hidden"><div class="h-full bg-current ${c} transition-all duration-500" style="width:${Math.max(4, Math.min(100, p))}%"></div></div></div>`).join('');
      const broken = offline ? M.filter((m, i) => st[i] === 0).map(m => m[1]) : [];
      $('#of-v').innerHTML = `${L('Вывод')}<div class="text-[13px] leading-relaxed">${broken.length ? `<span class="text-jv-red">📡 Без интернета отвалится: ${broken.join(', ')}.</span> ` : offline ? '<span class="text-jv-green">📡 Интернета нет — но всё работает локально.</span> ' : ''}${off ? 'Полностью офлайн: ничего не уходит из дома.' : 'Гибрид: часть данных уходит в облако.'} ${vram ? `Нужно железо: ~<b>${vram} ГБ</b> видеопамяти/RAM${vram >= 10 ? ' (Mac с 32 ГБ или ПК с RTX 4070+)' : ''}.` : 'Подойдёт любой ноутбук.'}</div>`;
      $$('[data-pre]').forEach(b => b.classList.remove('!border-jv-cyan'));
    }
    $$('[data-pre]').forEach(b => b.onclick = () => { PRE[b.dataset.pre].forEach((v, i) => st[i] = v); render(); b.classList.add('!border-jv-cyan') });
    $('#of-net').onchange = e => { offline = e.target.checked; render() };
    render();
  }
});

/* ===================== 11 · АВТОМАТИЗАЦИИ ===================== */
LAB.push({
  icon: '⚙️', t: 'Автоматизации', s: 'правила «если → то»', d: 'Собери правило мышкой или скажи словами. Джарвис превращает фразу в цепочку «триггер → условия → действия».',
  r(el, tok) {
    const TR = [['home', '🏠 Пришёл домой'], ['leave', '🚪 Ушёл из дома'], ['morning', '⏰ 07:00 по будням'], ['sunset', '🌇 Закат'], ['night', '🚶 Движение ночью в коридоре'], ['pulse', '❤️ Пульс > 120 в покое'], ['mail', '📧 Письмо от Пеппер'], ['bat', '🔋 Телефон < 15%']];
    const CO = [['dark', '🌙 после заката'], ['empty', '👥 дома никого'], ['work', '📅 будний день'], ['sleep', '😴 режим сна'], ['rain', '🌧 идёт дождь'], ['nofocus', '🎧 не в фокусе']];
    const AC = [['l30', '💡 Свет 30%'], ['l100', '💡 Свет 100%'], ['music', '🎵 Музыка AC/DC'], ['coffee', '☕ Сварить кофе'], ['lock', '🔒 Закрыть двери'], ['cams', '📹 Камеры на запись'], ['watch', '⌚ Уведомить на часы'], ['say', '🗣 Сказать «С возвращением»'], ['ac', '🌡 Климат 22°'], ['brain', '🧠 Записать в мозг']];
    const NL = [['Когда я прихожу домой после заката, включи свет и музыку и скажи «с возвращением»', 'home', ['dark'], ['l100', 'music', 'say']], ['Если ночью движение в коридоре, включи свет на 30%', 'night', ['sleep'], ['l30']], ['Когда все ушли из дома — закрой двери и включи камеры', 'leave', ['empty'], ['lock', 'cams']], ['Если пульс выше 120 в покое, напиши мне на часы и запиши в мозг', 'pulse', [], ['watch', 'brain']]];
    const RULES = [{ n: 'Утро буднего дня', tr: 'morning', co: ['work'], ac: ['l100', 'coffee'], on: true, last: 'сегодня 07:00' }, { n: 'Уход из дома', tr: 'leave', co: ['empty'], ac: ['lock', 'cams'], on: true, last: 'вчера 09:14' }, { n: 'Дождь и окна', tr: 'sunset', co: ['rain'], ac: ['watch'], on: false, last: '3 дня назад' }];
    let cur = { tr: 'home', co: ['dark'], ac: ['l100', 'music'] };
    const nm = (arr, k) => arr.find(x => x[0] === k)[1];
    el.innerHTML = `<div class="jv-tile mb-3"><div class="flex flex-wrap gap-2 items-center"><span class="jv-label !mb-0">🗣 Скажи правило</span><input id="au-nl" class="flex-1 min-w-[260px] bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-3 py-2 font-mono text-[12.5px] outline-none focus:border-jv-cyan" placeholder="Когда я прихожу домой после заката…"><button id="au-parse" class="jv-btn">РАЗОБРАТЬ</button></div><div class="flex flex-wrap gap-1.5 mt-2">${NL.map((x, i) => `<button data-nl="${i}" class="chip">${x[0]}</button>`).join('')}</div></div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">${[['ЕСЛИ · триггер', 'tr', TR], ['И · условия', 'co', CO], ['ТО · действия', 'ac', AC]].map(([t, k, arr]) => `<div class="jv-tile">${L(t)}<div class="flex flex-wrap gap-1.5">${arr.map(([id, n]) => `<button data-${k}="${id}" class="chip">${n}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="jv-tile mt-3">${L('Цепочка')}<div id="au-flow" class="flex flex-wrap items-center gap-2"></div><div id="au-text" class="mt-3 text-[14px] text-jv-ice"></div><div class="flex gap-2 mt-3"><button id="au-test" class="jv-btn">▶ ПРОВЕРИТЬ</button><button id="au-save" class="jv-btn !border-jv-green !text-jv-green !bg-jv-green/10">💾 СОХРАНИТЬ</button></div></div>
      <div class="jv-tile mt-3">${L('Мои автоматизации')}<div id="au-list"></div></div>`;
    function render() {
      $$('[data-tr]').forEach(b => b.classList.toggle('!border-jv-cyan', b.dataset.tr === cur.tr)); $$('[data-tr]').forEach(b => b.classList.toggle('!text-jv-cyan', b.dataset.tr === cur.tr));
      $$('[data-co]').forEach(b => { const on = cur.co.includes(b.dataset.co); b.classList.toggle('!border-jv-gold', on); b.classList.toggle('!text-jv-gold', on) });
      $$('[data-ac]').forEach(b => { const on = cur.ac.includes(b.dataset.ac); b.classList.toggle('!border-jv-green', on); b.classList.toggle('!text-jv-green', on) });
      const node = (t, c, id) => `<div data-node="${id}" class="rounded-lg border border-solid px-3 py-2 text-[12.5px] transition" style="border-color:${c};background:${c}14">${t}</div>`, arr = `<span class="text-jv-mute font-mono">──▶</span>`;
      $('#au-flow').innerHTML = [node(nm(TR, cur.tr), '#00d4ff', 'tr'), ...cur.co.map(c => node(nm(CO, c), '#ffb547', 'co-' + c)), ...cur.ac.map(a => node(nm(AC, a), '#3dffa8', 'ac-' + a))].join(arr);
      $('#au-text').innerHTML = `Когда <b>${nm(TR, cur.tr).slice(2).toLowerCase()}</b>${cur.co.length ? ', если ' + cur.co.map(c => '<b>' + nm(CO, c).slice(2) + '</b>').join(' и ') : ''}, то: ${cur.ac.map(a => nm(AC, a).slice(2)).join(' → ') || '…'}.`;
      $('#au-list').innerHTML = RULES.map((r, i) => `<div class="jv-row"><span class="flex-1"><b class="font-semibold">${esc(r.n)}</b> <span class="jv-sub">· ${nm(TR, r.tr)} → ${r.ac.map(a => nm(AC, a).split(' ')[0]).join(' ')}</span></span><span class="jv-sub">${r.last}</span><button data-tog="${i}" class="sw ${r.on ? 'on' : ''}"></button></div>`).join('');
      $$('[data-tog]').forEach(b => b.onclick = () => { RULES[+b.dataset.tog].on = !RULES[+b.dataset.tog].on; render() });
    }
    $$('[data-tr]').forEach(b => b.onclick = () => { cur.tr = b.dataset.tr; render() });
    $$('[data-co]').forEach(b => b.onclick = () => { const k = b.dataset.co; cur.co = cur.co.includes(k) ? cur.co.filter(x => x !== k) : [...cur.co, k]; render() });
    $$('[data-ac]').forEach(b => b.onclick = () => { const k = b.dataset.ac; cur.ac = cur.ac.includes(k) ? cur.ac.filter(x => x !== k) : [...cur.ac, k]; render() });
    const parse = async txt => {
      $('#au-nl').value = txt; const n = NL.find(x => x[0] === txt) || NL.find(x => x[0].toLowerCase().split(' ').filter(w => w.length > 4).some(w => txt.toLowerCase().includes(w.slice(0, 5))));
      if (!n) { toast('Не понял правило — попробуйте одну из подсказок'); return }
      cur = { tr: n[1], co: [...n[2]], ac: [] }; render(); for (const a of n[3]) { await sleep(250); cur.ac.push(a); render() } toast('🧠 LLM превратила фразу в правило');
    };
    $('#au-parse').onclick = () => parse($('#au-nl').value); $('#au-nl').onkeydown = e => { if (e.key === 'Enter') parse(e.target.value) };
    $$('[data-nl]').forEach(b => b.onclick = () => parse(NL[+b.dataset.nl][0]));
    $('#au-test').onclick = async () => {
      const ids = ['tr', ...cur.co.map(c => 'co-' + c), ...cur.ac.map(a => 'ac-' + a)];
      for (const id of ids) { if (!alive(tok)) return; const n = $(`[data-node="${id}"]`); n.style.boxShadow = '0 0 0 2px #fff,0 0 20px #00d4ff'; n.style.transform = 'scale(1.06)'; await sleep(450); n.style.boxShadow = ''; n.style.transform = ''; if (id.startsWith('ac-')) { const a = id.slice(3); if (a === 'l100' || a === 'l30') typeof setDev === 'function' && setDev('light', true); if (a === 'coffee') typeof setDev === 'function' && setDev('coffee', true); if (a === 'say') speakAs('С возвращением, сэр.', { pitch: .8 }); window.log?.('auto: ' + nm(AC, a), 'ok') } }
      toast('✅ Правило отработало (свет и кофе переключились и в HUD)');
    };
    $('#au-save').onclick = () => { RULES.unshift({ n: $('#au-text').textContent.slice(0, 48) + '…', ...structuredClone(cur), on: true, last: 'ещё не запускалось' }); render(); toast('💾 Автоматизация сохранена') };
    render();
  }
});

/* ===================== 12 · ТЕЛЕФОН И ЧАСЫ ===================== */
LAB.push({
  icon: '📱', t: 'Телефон и часы', s: 'Джарвис в кармане', d: 'Тот же Джарвис на iPhone (экран блокировки, виджет, приложение, Dynamic Island) и Apple Watch.',
  r(el, tok) {
    el.innerHTML = `<div class="flex flex-wrap gap-8 justify-center items-start">
      <div class="text-center"><div id="ph" class="relative mx-auto w-[290px] h-[600px] rounded-[48px] border-[10px] border-solid border-[#1a1a1a] bg-black overflow-hidden shadow-[0_0_0_2px_#333,0_30px_80px_rgba(0,0,0,.6),0_0_60px_rgba(0,212,255,.12)]">
        <div id="ph-isl" class="absolute left-1/2 -translate-x-1/2 top-2.5 z-20 h-[30px] w-[100px] rounded-full bg-black transition-all duration-500 flex items-center justify-center gap-2 overflow-hidden text-[11px] text-white"></div>
        <div id="ph-scr" class="absolute inset-0 text-white"></div></div>
        <div class="flex justify-center gap-1.5 mt-4">${[['lock', 'Блокировка'], ['home', 'Виджет'], ['app', 'Приложение']].map(([k, n]) => `<button data-ph="${k}" class="jv-badge cursor-pointer bg-transparent border-jv-line text-jv-mute">${n}</button>`).join('')}</div></div>
      <div class="text-center"><div class="relative mx-auto w-[184px] h-[224px] rounded-[52px] border-[9px] border-solid border-[#222] bg-black overflow-hidden shadow-[0_0_0_2px_#3a3a3a,0_20px_50px_rgba(0,0,0,.6)]" style="margin-top:110px"><div id="wt-scr" class="absolute inset-0 text-white p-3"></div><div class="absolute -right-[13px] top-14 w-[6px] h-10 rounded bg-[#333]"></div></div>
        <div class="flex justify-center gap-1.5 mt-4">${[['face', 'Циферблат'], ['talk', 'Говорить'], ['ask', 'Подтверждение']].map(([k, n]) => `<button data-wt="${k}" class="jv-badge cursor-pointer bg-transparent border-jv-line text-jv-mute">${n}</button>`).join('')}</div></div>
      <div class="jv-tile max-w-sm self-center">${L('Что тут показано')}<div class="text-[13px] leading-relaxed space-y-2"><div>🔒 <b>Live Activity</b> на экране блокировки: такси, таймер, прогресс агента.</div><div>🏝 <b>Dynamic Island</b>: «Джарвис слушает» с волной, пока вы говорите.</div><div>🧩 <b>Виджет</b>: следующее событие, погода, быстрые сцены.</div><div>⌚ <b>Часы</b>: поднял руку и говоришь, подтверждаешь действия агента одним тапом.</div><div class="jv-sub pt-2">Делают так: нативное приложение (Swift) или PWA + Shortcuts «Эй, Siri, спроси Джарвиса». Мозг тот же, на сервере дома.</div></div></div></div>`;
    const isl = (mode) => { const i = $('#ph-isl'); if (mode === 'listen') { i.style.width = '250px'; i.style.height = '62px'; i.style.borderRadius = '30px'; i.innerHTML = `<span class="w-8 h-8 rounded-full bg-[radial-gradient(circle,#fff,#00d4ff_50%,transparent_70%)] animate-pulse"></span><span class="text-left"><b class="text-[12px]">Джарвис</b><br><span class="text-[#8fdcff]">слушаю…</span></span><span class="flex items-end gap-[2px] h-5">${'<i class="block w-[3px] bg-jv-cyan rounded animate-pulse" style="height:60%"></i>'.repeat(6)}</span>` } else if (mode === 'taxi') { i.style.width = '170px'; i.style.height = '30px'; i.innerHTML = '<span>🚕</span><span class="text-[#ffd79a]">4 мин</span>' } else { i.style.width = '100px'; i.style.height = '30px'; i.innerHTML = '' } };
    const now = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const PH = {
      lock: () => { isl('taxi'); return `<div class="h-full bg-[linear-gradient(170deg,#0b2a4a,#050b16_60%,#140a2a)] pt-16 px-4 text-center"><div class="text-[13px] text-white/70">${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div><div class="text-[68px] font-light leading-none mt-1">${now()}</div>
          <div class="mt-8 rounded-[22px] bg-white/10 backdrop-blur p-3 text-left"><div class="flex items-center gap-2 text-[11px] text-white/70"><span class="w-5 h-5 rounded-md bg-jv-cyan/30 grid place-items-center text-[10px]">J</span>JARVIS · Live Activity</div><div class="flex items-center gap-3 mt-2"><span class="text-2xl">🚕</span><div class="flex-1"><div class="text-[15px] font-semibold">Хэппи будет через 4 мин</div><div class="text-[11px] text-white/60">Audi R8 · у подъезда · затем офис 24 мин</div></div></div><div class="h-1 rounded-full bg-white/15 mt-2 overflow-hidden"><div class="h-full w-3/4 bg-[#ffb547]"></div></div></div>
          <div class="mt-3 rounded-[22px] bg-white/10 backdrop-blur p-3 text-left text-[12px]"><b>JARVIS</b> · сейчас<br>Стендап через 15 минут. Я перенёс его на 10:15 — вы в пути.</div></div>` },
      home: () => { isl(); return `<div class="h-full bg-[linear-gradient(160deg,#103a5a,#06101e)] pt-14 px-4"><div class="rounded-[24px] bg-[#06141d]/85 border border-solid border-jv-line p-3"><div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full bg-[radial-gradient(circle,#fff,#00d4ff_45%,transparent_70%)]"></div><div class="font-hud text-[10px] tracking-widest text-jv-cyan">JARVIS</div><div class="ml-auto text-[11px] text-white/70">☁️ +11°</div></div><div class="mt-3 text-[11px] text-white/60">Дальше</div><div class="text-[15px] font-semibold">Стендап · 10:15</div><div class="text-[11px] text-white/60">Zoom · 5 участников</div><div class="grid grid-cols-4 gap-1.5 mt-3">${['☕', '💡', '🎵', '🔒'].map(e => `<div class="h-10 rounded-xl bg-jv-cyan/15 grid place-items-center">${e}</div>`).join('')}</div></div>
          <div class="grid grid-cols-4 gap-4 mt-6 px-1">${['📞', '💬', '📷', '🗺', '🎵', '📅', '⚙️', '🧠'].map((e, i) => `<div class="text-center"><div class="w-12 h-12 mx-auto rounded-[14px] grid place-items-center text-2xl ${i === 7 ? 'bg-[radial-gradient(circle,#0a3a52,#021018)] border border-solid border-jv-cyan' : 'bg-white/15'}">${e}</div><div class="text-[9px] mt-1 text-white/80">${['Телефон', 'Сообщ.', 'Камера', 'Карты', 'Музыка', 'Календ.', 'Настр.', 'Jarvis'][i]}</div></div>`).join('')}</div></div>` },
      app: () => { isl(); return `<div class="h-full bg-[radial-gradient(ellipse_at_50%_30%,#0a3048,#020a12_70%)] pt-14 px-4 flex flex-col"><div class="font-hud text-[11px] tracking-[.3em] text-jv-cyan text-center">J.A.R.V.I.S.</div>
          <button id="ph-orb" class="mx-auto mt-6 w-32 h-32 rounded-full border-0 cursor-pointer bg-[radial-gradient(circle,#fff_0,#5ff3ff_25%,#00d4ff_50%,rgba(0,100,160,.2)_70%,transparent_72%)] shadow-[0_0_50px_#00d4ff] transition-transform"></button><div id="ph-hint" class="text-center text-[11px] text-white/60 mt-2">нажмите и говорите</div>
          <div id="ph-chat" class="flex-1 mt-4 space-y-2 overflow-hidden text-[12px]"><div class="ml-8 rounded-2xl rounded-tr-sm bg-jv-green/15 px-3 py-2">Вызови Хэппи к подъезду</div><div class="mr-8 rounded-2xl rounded-tl-sm bg-jv-cyan/15 px-3 py-2">Уже едет, сэр. Будет через 4 минуты 🚕</div></div>
          <div class="flex gap-2 pb-6">${['🏠 Дом', '📅 День', '🧠 Мозг'].map(x => `<div class="flex-1 text-center rounded-xl bg-white/10 py-2 text-[10px]">${x}</div>`).join('')}</div></div>` },
    };
    const WT = {
      face: () => `<div class="h-full flex flex-col items-center justify-center"><div class="relative w-24 h-24"><svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90"><circle cx="50" cy="50" r="44" fill="none" stroke="#3dffa833" stroke-width="7"/><circle cx="50" cy="50" r="44" fill="none" stroke="#3dffa8" stroke-width="7" stroke-linecap="round" stroke-dasharray="276" stroke-dashoffset="100"/><circle cx="50" cy="50" r="34" fill="none" stroke="#00d4ff33" stroke-width="7"/><circle cx="50" cy="50" r="34" fill="none" stroke="#00d4ff" stroke-width="7" stroke-linecap="round" stroke-dasharray="214" stroke-dashoffset="70"/></svg><div class="absolute inset-0 grid place-items-center text-[22px] font-semibold">${now()}</div></div><div class="text-[10px] text-jv-cyan mt-2">● Стендап 10:15</div><div class="text-[9px] text-white/60">❤️ 72 · ☁️ +11°</div></div>`,
      talk: () => `<div class="h-full flex flex-col items-center justify-center text-center"><div class="w-16 h-16 rounded-full bg-[radial-gradient(circle,#fff,#00d4ff_45%,transparent_70%)] animate-pulse shadow-[0_0_25px_#00d4ff]"></div><div class="text-[11px] mt-2 text-jv-cyan">Слушаю…</div><div class="flex flex-wrap gap-1 justify-center mt-2">${['Да', 'Позже', '👍'].map(x => `<span class="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">${x}</span>`).join('')}</div></div>`,
      ask: () => `<div class="h-full flex flex-col justify-center text-center"><div class="text-xl">📳</div><div class="text-[11px] font-semibold mt-1">Оплатить 18 450 ₽?</div><div class="text-[9px] text-white/60">билет SU 2136</div><div class="grid grid-cols-2 gap-1.5 mt-3"><button data-wa="1" class="rounded-full border-0 bg-jv-green text-black py-1.5 text-[11px] font-bold cursor-pointer">Да</button><button data-wa="0" class="rounded-full border-0 bg-white/20 text-white py-1.5 text-[11px] cursor-pointer">Нет</button></div></div>`,
    };
    const showP = k => { $('#ph-scr').innerHTML = PH[k](); $$('[data-ph]').forEach(b => { const on = b.dataset.ph === k; b.classList.toggle('!border-jv-cyan', on); b.classList.toggle('!text-jv-cyan', on) });
      if (k === 'app') $('#ph-orb').onclick = async () => { isl('listen'); $('#ph-orb').style.transform = 'scale(1.1)'; $('#ph-hint').textContent = 'слушаю…'; await sleep(1800); if (!alive(tok)) return; isl(); $('#ph-orb').style.transform = ''; $('#ph-hint').textContent = 'нажмите и говорите'; const c = $('#ph-chat'); c.insertAdjacentHTML('beforeend', `<div class="ml-8 rounded-2xl rounded-tr-sm bg-jv-green/15 px-3 py-2 tile-in">Что у меня сегодня?</div><div class="mr-8 rounded-2xl rounded-tl-sm bg-jv-cyan/15 px-3 py-2 tile-in">Стендап в 10:15, обед с Пеппер в 13:30, тест костюма в 16:00.</div>`); while (c.children.length > 4) c.firstChild.remove(); speakAs('Стендап в десять пятнадцать, обед с Пеппер и тест костюма.') } };
    const showW = k => { $('#wt-scr').innerHTML = WT[k](); $$('[data-wt]').forEach(b => { const on = b.dataset.wt === k; b.classList.toggle('!border-jv-cyan', on); b.classList.toggle('!text-jv-cyan', on) }); $$('[data-wa]').forEach(b => b.onclick = () => { $('#wt-scr').innerHTML = `<div class="h-full grid place-items-center text-center"><div><div class="text-3xl">${b.dataset.wa === '1' ? '✅' : '✖️'}</div><div class="text-[11px] mt-1">${b.dataset.wa === '1' ? 'Оплачено' : 'Отменено'}</div></div></div>`; toast(b.dataset.wa === '1' ? '⌚ Подтверждено с часов' : '⌚ Отклонено с часов') }) };
    $$('[data-ph]').forEach(b => b.onclick = () => showP(b.dataset.ph)); $$('[data-wt]').forEach(b => b.onclick = () => showW(b.dataset.wt));
    showP('lock'); showW('face');
  }
});
