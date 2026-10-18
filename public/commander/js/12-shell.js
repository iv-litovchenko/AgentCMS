/* =====================================================================
   ОБОЛОЧКА: новые вкладки, меню «Ещё», темы и режимы, HUD в такт звуку
   ===================================================================== */
window.JV = window.JV || {};
JV.store = { get(k, d) { try { const v = localStorage.getItem('jv_' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } }, set(k, v) { try { localStorage.setItem('jv_' + k, JSON.stringify(v)) } catch (e) { } } };

/* ---------- вкладки ---------- */
const NAV = document.querySelector('nav');
JV.addTab = (id, label, html, after) => {
  const sec = document.createElement('section'); sec.className = 'tab'; sec.id = id; sec.innerHTML = html; document.querySelector('footer').before(sec);
  const b = document.createElement('button'); b.dataset.tab = id; b.textContent = label; b.onclick = () => goTab(id);
  const ref = after && NAV.querySelector(`:scope > [data-tab="${after}"]`); ref ? ref.after(b) : NAV.querySelector('#navMore').before(b);
  return sec;
};
/* меню «Ещё» для справочных вкладок */
(() => {
  const more = document.createElement('div'); more.id = 'navMore'; more.className = 'relative';
  more.innerHTML = `<button id="navMoreBtn" type="button">Ещё ▾</button><div id="navMoreMenu" hidden class="absolute right-0 top-full mt-1 z-50 min-w-[210px] rounded-xl border border-solid border-jv-line bg-[#03111a]/95 backdrop-blur p-1.5 shadow-[0_10px_40px_rgba(0,0,0,.5)]"></div>`;
  NAV.append(more); const menu = more.querySelector('#navMoreMenu');
  ['build', 'gal', 'data', 'how', 'feat', 'stack'].forEach(t => { const b = NAV.querySelector(`:scope > [data-tab="${t}"]`); if (b) { b.classList.add('!block', '!w-full', '!text-left'); menu.append(b) } });
  more.querySelector('#navMoreBtn').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden };
  document.addEventListener('click', e => { if (!more.contains(e.target)) menu.hidden = true });
  menu.addEventListener('click', e => { if (e.target.dataset.tab) menu.hidden = true });
  const prev = window.onTab; window.onTab = t => { prev?.(t); more.querySelector('#navMoreBtn').classList.toggle('on', !!menu.querySelector(`[data-tab="${t}"]`)) };
})();

/* ---------- панель управления в шапке ---------- */
const CTL = document.createElement('div'); CTL.id = 'jvCtl'; CTL.className = 'flex flex-wrap items-center gap-1.5';
CTL.innerHTML = `<select id="jvTheme" title="Тема и режим" class="jv-sel"></select><select id="jvBeat" title="HUD в такт звуку" class="jv-sel"><option value="off">♪ выкл</option><option value="demo">♪ демо-бит</option><option value="mic">♪ микрофон</option></select>`;
document.getElementById('clock').after(CTL);
const st = document.createElement('style'); st.textContent = `
.jv-sel{font:600 10px var(--mono);color:var(--cy);background:rgba(0,0,0,.35);border:1px solid var(--line);border-radius:8px;padding:5px 6px;outline:none;cursor:pointer}
.jv-sel option{background:#03111a;color:#cfefff}
#navMoreMenu button{display:block;width:100%;text-align:left}
html.beat-on .jv-tile,html.beat-on .panel,html.beat-on .hp-bg{box-shadow:0 0 calc(var(--beat,0)*34px) rgba(0,212,255,calc(var(--beat,0)*.55))}
html.beat-on .core{transform:scale(calc(1 + var(--beat,0)*.35))!important}
#jvVignette{position:fixed;inset:0;pointer-events:none;z-index:95;opacity:0;transition:opacity .6s;background:radial-gradient(ellipse at center,transparent 55%,rgba(255,0,30,.45));animation:vign 1.4s ease-in-out infinite}
@keyframes vign{50%{filter:brightness(1.6)}}
#jvBanner{position:fixed;left:50%;top:10px;transform:translate(-50%,-120%);z-index:170;transition:transform .45s cubic-bezier(.2,.8,.2,1);font:700 12px var(--hud);letter-spacing:.25em;padding:9px 18px;border-radius:10px;border:1px solid var(--red);background:rgba(40,0,6,.92);color:#ffb3bb;box-shadow:0 0 30px rgba(255,77,94,.5)}
#jvBanner.on{transform:translate(-50%,0)}`;
document.head.append(st);
document.body.insertAdjacentHTML('beforeend', '<div id="jvVignette"></div><div id="jvBanner"></div>');

/* ---------- темы и режимы ---------- */
const THEMES = {
  classic: ['💠 Классика', ''],
  mk85: ['🟥 Mk-85 красный', 'hue-rotate(160deg) saturate(1.25)'],
  emerald: ['🟩 Изумруд', 'hue-rotate(-70deg) saturate(1.1)'],
  night: ['🌙 Ночной', 'sepia(.75) hue-rotate(-25deg) saturate(1.5) brightness(.58)'],
  stealth: ['🕶 Стелс', 'grayscale(1) brightness(.78) contrast(1.15)'],
  battle: ['⚠️ Боевой', 'hue-rotate(160deg) saturate(1.7) contrast(1.06)'],
};
const tsel = document.getElementById('jvTheme');
tsel.innerHTML = Object.entries(THEMES).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('');
JV.banner = (text, ms = 3500) => { const b = document.getElementById('jvBanner'); b.textContent = text; b.classList.add('on'); clearTimeout(JV._bt); if (ms) JV._bt = setTimeout(() => b.classList.remove('on'), ms) };
JV.setTheme = (k, say) => {
  if (!THEMES[k]) return; document.documentElement.style.filter = THEMES[k][1]; tsel.value = k; JV.store.set('theme', k);
  document.getElementById('jvVignette').style.opacity = k === 'battle' ? 1 : 0;
  if (k === 'battle') { JV.banner('⚠ БОЕВОЙ РЕЖИМ АКТИВИРОВАН', 0); if (say) { goTab('holo'); setTimeout(() => window.hudCompose?.({ scene: 'flight' }), 400) } } else document.getElementById('jvBanner').classList.remove('on');
  if (say) { const t = { classic: 'Классическая тема.', mk85: 'Цвета Mk-85.', emerald: 'Изумрудная тема.', night: 'Ночной режим. Приглушаю всё.', stealth: 'Режим стелс.', battle: 'Боевой режим активирован, сэр.' }[k]; toast('🎨 ' + THEMES[k][0]); speak?.(t) }
  bus?.('theme', { id: k });
};
tsel.onchange = () => JV.setTheme(tsel.value, true);
JV.setTheme(JV.store.get('theme', 'classic'));
SKILLS.unshift({ re: /(режим|тем[ауы]|цвет).*(боев|ночн|стелс|красн|mk|классич|обычн|изумруд|зел[её]н)|(боевой|ночной|стелс)[ -]?режим/i, run: t => { const s = t.toLowerCase(); const k = /боев/.test(s) ? 'battle' : /ночн/.test(s) ? 'night' : /стелс/.test(s) ? 'stealth' : /красн|mk/.test(s) ? 'mk85' : /изумруд|зел/.test(s) ? 'emerald' : 'classic'; setTimeout(() => JV.setTheme(k), 300); return { battle: 'Боевой режим активирован, сэр.', night: 'Ночной режим.', stealth: 'Стелс.', mk85: 'Перекрашиваю в цвета Mk-85.', emerald: 'Изумрудная тема.', classic: 'Классика.' }[k] } });

/* ---------- HUD в такт звуку ---------- */
JV.beat = { level: 0, freq: null };
let bctx = null, ban = null, bsrc = null, bmode = 'off', bTimer = null, bStream = null;
async function beatMode(m) {
  bmode = m; clearInterval(bTimer); bStream?.getTracks().forEach(t => t.stop()); bStream = null; document.documentElement.classList.toggle('beat-on', m !== 'off');
  if (m === 'off') { JV.beat.freq = null; document.documentElement.style.setProperty('--beat', 0); return }
  bctx ||= new AudioContext(); await bctx.resume(); ban ||= bctx.createAnalyser(); ban.fftSize = 256; ban.smoothingTimeConstant = .55;
  if (m === 'mic') { try { bStream = await navigator.mediaDevices.getUserMedia({ audio: true }); bsrc = bctx.createMediaStreamSource(bStream); bsrc.connect(ban) } catch (e) { toast('🎙 Нет доступа к микрофону'); document.getElementById('jvBeat').value = 'off'; return beatMode('off') } }
  if (m === 'demo') { // простой синт-бит 116 BPM: бочка, хэт, бас
    const out = bctx.createGain(); out.gain.value = .5; out.connect(bctx.destination); out.connect(ban);
    const kick = t => { const o = bctx.createOscillator(), g = bctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .18); g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g).connect(out); o.start(t); o.stop(t + .32) };
    const hat = t => { const b = bctx.createBuffer(1, 2205, 44100), d = b.getChannelData(0); for (let i = 0; i < d.length; i++)d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = bctx.createBufferSource(), f = bctx.createBiquadFilter(), g = bctx.createGain(); f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = .25; s.buffer = b; s.connect(f).connect(g).connect(out); s.start(t) };
    const bass = (t, n) => { const o = bctx.createOscillator(), g = bctx.createGain(); o.type = 'sawtooth'; o.frequency.value = n; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .24); o.connect(g).connect(out); o.start(t); o.stop(t + .26) };
    const spb = 60 / 116 / 2; let step = 0, next = bctx.currentTime + .05; const NOTES = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49];
    bTimer = setInterval(() => { while (next < bctx.currentTime + .15) { if (step % 4 === 0) kick(next); if (step % 2 === 1) hat(next); if (step % 2 === 0) bass(next, NOTES[(step / 2 | 0) % 8]); step++; next += spb } }, 30);
  }
}
document.getElementById('jvBeat').onchange = e => beatMode(e.target.value);
(function beatLoop() {
  requestAnimationFrame(beatLoop); if (bmode === 'off' || !ban) return;
  const f = new Uint8Array(ban.frequencyBinCount); ban.getByteFrequencyData(f); let lo = 0; for (let i = 1; i < 8; i++) lo += f[i];
  const lvl = Math.min(1, lo / (7 * 255) * 1.25); JV.beat.level = JV.beat.level * .6 + lvl * .4; JV.beat.freq = f;
  document.documentElement.style.setProperty('--beat', JV.beat.level.toFixed(3));
})();
