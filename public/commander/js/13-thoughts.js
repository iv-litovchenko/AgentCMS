/* =====================================================================
   ХОД МЫСЛЕЙ АГЕНТА — дерево шагов каждого запроса в реальном времени
   ===================================================================== */
(() => {
  const st = document.createElement('style'); st.textContent = `
#thDrawer{position:fixed;top:0;right:0;bottom:0;width:min(400px,100vw);z-index:160;background:rgba(2,12,18,.96);backdrop-filter:blur(10px);border-left:1px solid var(--line);transform:translateX(100%);transition:transform .35s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column}
#thDrawer.on{transform:none}
#thBtn{position:fixed;right:14px;bottom:14px;z-index:150;font:700 11px var(--hud);letter-spacing:.12em;color:var(--purple);background:rgba(20,8,40,.85);border:1px solid var(--purple);border-radius:99px;padding:10px 16px;cursor:pointer;box-shadow:0 0 20px rgba(180,140,255,.35)}
#thBtn .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--purple);margin-right:7px;vertical-align:middle}
#thBtn.busy .dot{animation:pulse .5s infinite alternate;background:var(--gold)}
.th-run{margin:10px 12px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:rgba(0,20,30,.5)}
.th-q{font-size:13.5px;color:#fff}.th-meta{font:10px var(--mono);color:var(--mut);margin-top:2px}
.th-steps{margin-top:8px;position:relative;padding-left:16px}
.th-steps::before{content:"";position:absolute;left:5px;top:4px;bottom:4px;width:1px;background:linear-gradient(var(--purple),var(--cy))}
.th-s{position:relative;margin:7px 0;font-size:12.5px;animation:fade .35s}
.th-s::before{content:"";position:absolute;left:-15px;top:5px;width:9px;height:9px;border-radius:50%;background:#03111a;border:2px solid var(--c,var(--cy))}
.th-s.run::before{border-color:var(--gold);animation:pulse .5s infinite alternate}
.th-s b{color:var(--c,var(--cy));font-weight:600}.th-s .ms{font:10px var(--mono);color:var(--mut);margin-left:6px}
.th-s .det{font:11px/1.45 var(--mono);color:#9fc3d4;margin-top:3px;white-space:pre-wrap;word-break:break-word}
.th-s .think{font:italic 12px/1.5 Inter;color:#d9c8ff;border-left:2px solid var(--purple);padding-left:8px;margin-top:4px;white-space:pre-wrap}
.th-par{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.th-par span{font:10.5px var(--mono);padding:2px 6px;border-radius:5px;border:1px solid rgba(255,181,71,.5);color:#ffd79a;background:rgba(255,181,71,.08)}`;
  document.head.append(st);
  document.body.insertAdjacentHTML('beforeend', `<button id="thBtn"><span class="dot"></span>ХОД МЫСЛЕЙ</button>
   <aside id="thDrawer"><div style="display:flex;align-items:center;gap:8px;padding:14px 14px 6px"><span style="font:700 11px var(--hud);letter-spacing:.2em;color:var(--purple)">🧠 ХОД МЫСЛЕЙ АГЕНТА</span><button id="thClr" class="jv-badge border-jv-line text-jv-mute bg-transparent cursor-pointer" style="margin-left:auto">очистить</button><button id="thX" style="background:none;border:0;color:var(--mut);font-size:22px;cursor:pointer">×</button></div>
   <div style="padding:0 14px 6px;font-size:11.5px;color:var(--mut)">Что Джарвис услышал, как понял, какие инструменты вызвал параллельно и сколько это заняло. С настоящим мозгом — ещё и краткий пересказ рассуждений модели.</div>
   <div id="thList" style="flex:1;overflow-y:auto;padding-bottom:20px"></div></aside>`);
  const D = document.getElementById('thDrawer'), L = document.getElementById('thList'), B = document.getElementById('thBtn');
  B.onclick = () => D.classList.toggle('on'); document.getElementById('thX').onclick = () => D.classList.remove('on'); document.getElementById('thClr').onclick = () => L.innerHTML = '';
  let run = null;
  const COL = { hear: '#3dffa8', intent: '#b48cff', tool: '#ffb547', llm: '#b48cff', think: '#b48cff', ok: '#3dffa8', say: '#00d4ff', err: '#ff4d5e' };
  function step(kind, title, det = '', html = '') {
    if (!run) return null; if (run.last?.classList.contains('run')) run.last.classList.remove('run');
    const s = document.createElement('div'); s.className = 'th-s run'; s.style.setProperty('--c', COL[kind] || COL.say);
    s.innerHTML = `<b>${title}</b><span class="ms">+${Math.round(performance.now() - run.t0)} мс</span>${det ? `<div class="det">${esc(det)}</div>` : ''}${html}`;
    run.steps.append(s); run.last = s; L.scrollTop = 1e9; return s;
  }
  JV.thought = step;
  function begin(text) {
    const r = document.createElement('div'); r.className = 'th-run';
    const real = typeof BRAIN !== 'undefined' && BRAIN.mode === 'real' && !!BRAIN.key;
    r.innerHTML = `<div class="th-q">«${esc(text)}»</div><div class="th-meta">${new Date().toLocaleTimeString('ru-RU')} · ${real ? '⚡ ' + (MODELS[BRAIN.model] || BRAIN.model) + ' · effort ' + BRAIN.effort : '🎭 демо-мозг'}</div><div class="th-steps"></div>`;
    L.append(r); while (L.children.length > 25) L.firstChild.remove();
    run = { el: r, steps: r.querySelector('.th-steps'), t0: performance.now(), tools: 0, real };
    B.classList.add('busy');
    step('hear', '🎙 Услышал', text.length > 80 ? text.slice(0, 80) + '…' : text);
    step('intent', real ? '🧠 Отправил в модель' : '🧩 Ищу подходящий навык', real ? 'история диалога + 10 инструментов + память о вас' : 'сравниваю с шаблонами команд (регулярные выражения)');
  }
  function end() { if (!run) return; if (run.last) run.last.classList.remove('run'); const ms = Math.round(performance.now() - run.t0); run.el.querySelector('.th-meta').textContent += ` · готово за ${ms} мс · инструментов: ${run.tools}`; B.classList.remove('busy'); run = null }

  /* перехваты: handle → начало/конец, addTool → шаг, DEVLOG → ответ модели, jReply → озвучка */
  const _h = handle; handle = async function (text) { const t = (text || '').trim(); if (!t || busy) return _h(text); begin(t); try { return await _h(text) } finally { end() } };
  const _at = addTool; addTool = function (n, a) { if (run) { run.tools++; const prev = run.last; if (prev && prev.dataset.tools && performance.now() - +prev.dataset.t < 120) { prev.querySelector('.th-par').insertAdjacentHTML('beforeend', `<span>${esc(n)}</span>`); prev.querySelector('b').textContent = `🔧 Параллельно вызвал ${prev.querySelectorAll('.th-par span').length} инструмента` } else { const s = step('tool', '🔧 Вызвал инструмент', '', `<div class="th-par"><span>${esc(n)}</span></div><div class="det">${esc(String(a || '').slice(0, 120))}</div>`); if (s) { s.dataset.tools = 1; s.dataset.t = performance.now() } } } return _at(n, a) };
  const _jr = jReply; jReply = async function (t) { if (run) step('say', '🗣 Ответил голосом', t.length > 140 ? t.slice(0, 140) + '…' : t); return _jr(t) };
  if (window.DEVLOG) { const _p = DEVLOG.push.bind(DEVLOG); DEVLOG.push = (...a) => { a.forEach(e => { const th = (e.res || []).filter(b => b.type === 'thinking' && b.thinking).map(b => b.thinking).join('\n'); step('llm', `⚡ Модель ответила · ${e.stop}`, `${e.inp} → ${e.out} токенов · ${e.ms} мс`, th ? `<div class="think">💭 ${esc(th.slice(0, 600))}</div>` : '') }); return _p(...a) } }
})();
