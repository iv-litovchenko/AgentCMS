/* =====================================================================
   СИМУЛЯТОР «ЧТО ЕСЛИ» — долетим ли? (упрощённая физика полёта костюма)
   ===================================================================== */
(() => {
const sec = JV.addTab('sim', 'Симулятор', `
  <div class="max-w-4xl mb-3"><div class="h2">СИМУЛЯТОР «ЧТО ЕСЛИ»</div>
    <p class="m-0 text-[14px] text-jv-text">Тони постоянно спрашивает Джарвиса «а если…?». Двигайте ползунки — дальность, время и запас энергии пересчитываются на лету, а Джарвис сам находит <b>оптимальную скорость</b>. Модель упрощённая: сопротивление воздуха растёт как скорость², плотность воздуха падает с высотой, на удержание в воздухе тратится постоянная мощность.</p></div>
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
    <div class="jv-tile"><div class="jv-label mb-3">Параметры</div><div id="smS" class="space-y-3"></div>
      <div class="jv-label mt-5 mb-2">Куда летим (из Москвы)</div><div id="smT" class="flex flex-wrap gap-1.5"></div>
      <div class="flex gap-2 mt-4"><input id="smQ" class="flex-1 min-w-0 bg-black/40 border border-solid border-jv-line rounded-lg text-jv-text px-3 py-2 font-mono text-[12px] outline-none" placeholder="«что если скорость 1500 и ветер 80?»"><button id="smGo" class="jv-btn">?</button></div></div>
    <div class="xl:col-span-2 flex flex-col gap-3">
      <div id="smV" class="jv-tile"></div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="smK"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3"><div class="jv-tile"><div class="jv-label mb-2">Запас энергии по пути</div><canvas id="smC1" class="w-full h-48 block"></canvas></div><div class="jv-tile"><div class="jv-label mb-2">Дальность от скорости</div><canvas id="smC2" class="w-full h-48 block"></canvas></div></div>
    </div></div>`, 'table');
const P = { pwr: ['⚡ Заряд реактора', 20, 100, 85, '%'], mass: ['🏋 Масса пилота + груз', 70, 400, 150, 'кг'], v: ['🚀 Скорость', 200, 2500, 900, 'км/ч'], wind: ['🌬 Встречный ветер', -100, 200, 30, 'км/ч'], h: ['⛰ Высота полёта', 0, 15000, 6000, 'м'], res: ['🛟 Неприкосновенный запас', 0, 40, 15, '%'] };
const TG = [['Стамбул', 1750], ['Париж', 2480], ['Лондон', 2500], ['Дубай', 3650], ['Нью-Йорк', 7510], ['Малибу', 9790]]; let tgt = 4;
const V = Object.fromEntries(Object.entries(P).map(([k, p]) => [k, p[3]]));
$('#smS').innerHTML = Object.entries(P).map(([k, [n, a, b]]) => `<div><div class="flex justify-between text-[12.5px]"><span>${n}</span><b class="font-mono text-jv-cyan" id="smv-${k}"></b></div><input type="range" data-k="${k}" min="${a}" max="${b}" step="${k === 'h' ? 100 : k === 'v' || k === 'mass' ? 10 : 1}" class="w-full accent-[#00d4ff]"></div>`).join('');
$('#smT').innerHTML = TG.map(([n, d], i) => `<button data-t="${i}" class="chip">${n} · ${d.toLocaleString('ru-RU')} км</button>`).join('');
// e(J/м) = A·(v+w)³/v + B/v ; A = ½ρ·CdA/η, B = мощность удержания
const E0 = 2.2e11, CDA = .35, ETA = .6;
const perM = (v, s) => { const rho = 1.225 * Math.exp(-s.h / 8500), A = .5 * rho * CDA / ETA, B = s.mass * 50e3, vm = v / 3.6, wm = s.wind / 3.6, air = Math.max(1, vm + wm); return (A * air ** 3 + B) / vm };
const range = (v, s) => E0 * s.pwr / 100 * (1 - s.res / 100) / perM(v, s) / 1000;
function calc() {
  Object.entries(P).forEach(([k, p]) => { $(`[data-k="${k}"]`).value = V[k]; $('#smv-' + k).textContent = Number(V[k]).toLocaleString('ru-RU') + ' ' + p[4] });
  $$('[data-t]').forEach(b => b.classList.toggle('!border-jv-cyan', +b.dataset.t === tgt));
  const [tn, dist] = TG[tgt], R = range(V.v, V), time = dist / V.v, ok = R >= dist, used = Math.min(100, dist / R * (100 - V.res));
  let best = 200, br = 0; for (let v = 200; v <= 2500; v += 10) { const r = range(v, V); if (r > br) { br = r; best = v } }
  let need = null; if (!ok) for (let v = 200; v <= 2500; v += 10) if (range(v, V) >= dist) { need = v; break }
  $('#smV').innerHTML = `<div class="flex items-center gap-4"><div class="text-5xl">${ok ? '✅' : '❌'}</div><div><div class="font-hud text-[18px] tracking-wider ${ok ? 'text-jv-green' : 'text-jv-red'}">${ok ? `ДОЛЕТИМ ДО: ${tn.toUpperCase()}` : `НЕ ХВАТИТ ${Math.round(dist - R).toLocaleString('ru-RU')} КМ`}</div><div class="text-[13.5px] mt-1">${ok ? `Запас после посадки — ${Math.round((1 - dist / R) * 100)}% сверх неприкосновенного. ` : ''}${!ok && need ? `Сбросьте скорость до <b>${need} км/ч</b> — тогда долетим.` : !ok ? 'Даже на оптимальной скорости не хватает: нужна дозаправка или выше высота.' : ''} Оптимальная скорость для дальности — <b>${best} км/ч</b> (${Math.round(br).toLocaleString('ru-RU')} км).</div></div></div>`;
  $('#smK').innerHTML = [['Дальность', Math.round(R).toLocaleString('ru-RU') + ' км'], ['Время в пути', `${time | 0} ч ${Math.round(time % 1 * 60)} мин`], ['Расход', Math.round(used) + '%'], ['Плотность воздуха', (1.225 * Math.exp(-V.h / 8500)).toFixed(2) + ' кг/м³']].map(([n, v]) => `<div class="jv-tile"><div class="jv-label">${n}</div><div class="jv-value mt-2 !text-xl">${v}</div></div>`).join('');
  draw1(R, dist, ok); draw2(best, dist);
}
function cv(id) { const c = $('#' + id), W = c.clientWidth, H = c.clientHeight; c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); x.font = '10px JetBrains Mono'; return [x, W, H] }
function draw1(R, dist, ok) {
  const [x, W, H] = cv('smC1'), max = Math.max(R, dist) * 1.1, px = d => 30 + d / max * (W - 40), py = e => 10 + (1 - e / 100) * (H - 30);
  x.strokeStyle = 'rgba(0,212,255,.15)'; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(30, py(i * 25)); x.lineTo(W - 10, py(i * 25)); x.stroke(); x.fillStyle = '#6c93a8'; x.fillText(i * 25 + '%', 0, py(i * 25) + 3) }
  const top = 100 - 0, low = V.res; x.fillStyle = 'rgba(255,77,94,.12)'; x.fillRect(30, py(low), W - 40, py(0) - py(low)); x.fillStyle = '#ff4d5e'; x.fillText('НЗ', W - 28, py(low) - 3);
  x.strokeStyle = ok ? '#3dffa8' : '#ff4d5e'; x.lineWidth = 2.5; x.shadowColor = x.strokeStyle; x.shadowBlur = 8; x.beginPath(); x.moveTo(px(0), py(V.pwr)); x.lineTo(px(R), py(low * V.pwr / 100 + 0)); x.stroke(); x.shadowBlur = 0;
  x.strokeStyle = '#ffb547'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(px(dist), 8); x.lineTo(px(dist), H - 18); x.stroke(); x.setLineDash([]); x.fillStyle = '#ffb547'; x.fillText(TG[tgt][0], Math.min(px(dist) + 4, W - 60), 18); x.fillStyle = '#6c93a8'; x.fillText('0', 30, H - 4); x.fillText(Math.round(max).toLocaleString('ru-RU') + ' км', W - 70, H - 4);
}
function draw2(best, dist) {
  const [x, W, H] = cv('smC2'), pts = []; for (let v = 200; v <= 2500; v += 20) pts.push([v, range(v, V)]); const max = Math.max(...pts.map(p => p[1]), dist) * 1.1, px = v => 30 + (v - 200) / 2300 * (W - 40), py = r => 10 + (1 - r / max) * (H - 30);
  x.strokeStyle = 'rgba(255,181,71,.6)'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(30, py(dist)); x.lineTo(W - 10, py(dist)); x.stroke(); x.setLineDash([]); x.fillStyle = '#ffb547'; x.fillText('нужно ' + dist.toLocaleString('ru-RU'), 34, py(dist) - 4);
  x.strokeStyle = '#00d4ff'; x.lineWidth = 2; x.beginPath(); pts.forEach(([v, r], i) => i ? x.lineTo(px(v), py(r)) : x.moveTo(px(v), py(r))); x.stroke();
  x.fillStyle = '#3dffa8'; x.beginPath(); x.arc(px(best), py(range(best, V)), 5, 0, 7); x.fill(); x.fillText('оптимум ' + best, Math.min(px(best) + 6, W - 80), py(range(best, V)) - 6);
  x.fillStyle = '#fff'; x.beginPath(); x.arc(px(V.v), py(range(V.v, V)), 4, 0, 7); x.fill(); x.fillStyle = '#6c93a8'; x.fillText('200 км/ч', 30, H - 4); x.fillText('2500', W - 34, H - 4);
}
$$('#smS [data-k]').forEach(i => i.oninput = () => { V[i.dataset.k] = +i.value; calc() });
$$('[data-t]').forEach(b => b.onclick = () => { tgt = +b.dataset.t; calc() });
function ask(t) {
  const s = t.toLowerCase(), num = re => { const m = s.match(re); return m ? +m[1].replace(/\s/g, '') : null };
  const map = [['v', /скорост\D{0,12}(\d[\d\s]*)/], ['wind', /ветер\D{0,12}(-?\d+)/], ['h', /высот\D{0,12}(\d[\d\s]*)/], ['mass', /(?:масс|вес|груз)\D{0,12}(\d+)/], ['pwr', /(?:заряд|реактор|мощн)\D{0,12}(\d+)/]];
  map.forEach(([k, re]) => { const n = num(re); if (n != null) V[k] = Math.max(P[k][1], Math.min(P[k][2], n)) });
  TG.forEach(([n], i) => { if (s.includes(n.toLowerCase().slice(0, 5))) tgt = i });
  calc(); const R = range(V.v, V), d = TG[tgt][1]; return R >= d ? `Долетим до ${TG[tgt][0]}: дальность ${Math.round(R)} километров.` : `Не хватит ${Math.round(d - R)} километров, сэр.`;
}
$('#smGo').onclick = () => { const a = ask($('#smQ').value); speak?.(a) }; $('#smQ').onkeydown = e => { if (e.key === 'Enter') $('#smGo').click() };
SKILLS.unshift({ re: /(что если|а если|долетим|хватит ли|дальност)/i, run: t => { goTab('sim'); return ask(t) } });
{ const prev = window.onTab; window.onTab = t => { prev?.(t); if (t === 'sim') setTimeout(calc, 30) } }
addEventListener('resize', () => sec.classList.contains('on') && calc());
})();
