/* =====================================================================
   ВИДЖЕТЫ — библиотека плиток на Tailwind. Плитка = {w:'тип', size, ...данные}
   ===================================================================== */
const SIZE={1:'',2:'sm:col-span-2',4:'sm:col-span-2 lg:col-span-4'};
const spark=(a,c='#00d4ff')=>{const mn=Math.min(...a),mx=Math.max(...a),d=a.map((v,i)=>`${i?'L':'M'}${(i/(a.length-1)*100).toFixed(1)} ${(28-(v-mn)/(mx-mn||1)*24).toFixed(1)}`).join(' ');return `<svg class="absolute left-0 bottom-0 w-full h-12 opacity-70 pointer-events-none" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="${d} L100 30 L0 30Z" fill="${c}" fill-opacity=".08"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`};
const ringSvg=(v,c='#00d4ff',s=96)=>{const r=40,C=2*Math.PI*r;return `<svg width="${s}" height="${s}" viewBox="0 0 100 100" class="-rotate-90"><circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(0,212,255,.12)" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-v/100)}" style="filter:drop-shadow(0 0 5px ${c});transition:stroke-dashoffset 1s"/></svg>`};
const PRIO={crit:['КРИТ','border-jv-red text-jv-red'],high:['ВАЖНО','border-jv-gold text-jv-gold'],norm:['ОБЫЧН','border-jv-cyan text-jv-cyan'],low:['НИЗК','border-jv-line text-jv-mute']};
const lbl=t=>`<div class="jv-label mb-3">${t.label||''}</div>`;
const W={
 stat:t=>`${lbl(t)}<div class="jv-value">${t.value}</div>${t.delta?`<div class="jv-sub mt-2 ${t.up?'!text-jv-green':'!text-jv-red'}">${t.up?'▲':'▼'} ${t.delta}</div>`:''}${t.sub?`<div class="jv-sub mt-1">${t.sub}</div>`:''}<div class="h-10"></div>${t.spark?spark(t.spark,t.up===false?'#ff4d5e':'#00d4ff'):''}`,
 clock:t=>`${lbl(t)}<div class="font-hud text-5xl font-black text-jv-ice live-clock" style="text-shadow:0 0 20px #00d4ff">--:--</div><div class="jv-sub mt-2 live-date"></div>${t.sub?`<div class="mt-3 text-[13px]">${t.sub}</div>`:''}`,
 ring:t=>`${lbl(t)}<div class="flex items-center gap-4">${ringSvg(t.value,t.color)}<div><div class="font-hud text-2xl font-bold" style="color:${t.color||'#5ff3ff'}">${t.value}%</div><div class="jv-sub mt-1">${t.text||''}</div></div></div>`,
 list:t=>`${lbl(t)}${t.items.map(i=>`<div class="jv-row"><span>${i[0]}</span><span class="font-mono text-[11px] text-jv-cyan whitespace-nowrap">${i[1]||''}</span></div>`).join('')}`,
 tasks:t=>`${lbl(t)}${t.items.map(i=>`<label class="jv-row cursor-pointer justify-start"><input type="checkbox" ${i[1]?'checked':''} class="accent-[#00d4ff]" onchange="this.nextElementSibling.classList.toggle('line-through',this.checked);this.nextElementSibling.classList.toggle('opacity-50',this.checked)"><span class="${i[1]?'line-through opacity-50':''}">${i[0]}</span></label>`).join('')}`,
 timer:t=>`${lbl(t)}<div class="font-hud text-5xl font-black text-jv-ice tabular-nums" data-timer="${t.min*60}" data-left="${t.min*60}">${String(t.min).padStart(2,'0')}:00</div><div class="h-1.5 bg-jv-cyan/10 rounded-full mt-3 overflow-hidden"><div class="tbar h-full bg-jv-gold w-0 transition-all"></div></div><div class="flex gap-2 mt-3"><button class="jv-btn" data-act="tstart">▶ СТАРТ</button><button class="jv-btn" data-act="treset">↺</button></div>`,
 approval:t=>`${lbl(t)}<div class="text-[13px] mb-1">${t.text}</div><div class="jv-sub mb-3">запросил: ${t.from}</div><div class="flex gap-2 abox"><button class="jv-btn !border-jv-green !text-jv-green !bg-jv-green/10" data-act="approve">👍 ОДОБРИТЬ</button><button class="jv-btn !border-jv-red !text-jv-red !bg-jv-red/10" data-act="deny">👎 НЕТ</button></div>`,
 cams:t=>`${lbl(t)}<div class="grid grid-cols-2 gap-1.5">${t.cams.map((c,i)=>`<div class="noise relative aspect-video rounded-md overflow-hidden border border-solid border-jv-line"><span class="absolute left-1.5 top-1 font-mono text-[9px] text-jv-text">${c}</span><span class="absolute right-1.5 top-1 font-mono text-[9px] text-jv-red animate-pulse">● REC</span>${i===t.motion?'<span class="absolute left-[30%] top-[30%] w-[30%] h-[50%] border border-solid border-jv-green"></span><span class="absolute left-1.5 bottom-1 font-mono text-[9px] text-jv-green">движение · человек</span>':''}</div>`).join('')}</div>`,
 doorbell:t=>`${lbl(t)}<div class="noise relative aspect-video rounded-md border border-solid border-jv-gold overflow-hidden"><span class="absolute left-[38%] top-[18%] w-[26%] h-[70%] border-2 border-solid border-jv-gold"></span><span class="absolute left-2 top-1.5 font-mono text-[10px] text-jv-gold">🔔 ${t.who}</span></div><div class="flex gap-2 mt-3"><button class="jv-btn" data-act="say" data-say="Оставьте у двери, спасибо">🗣 ответить</button><button class="jv-btn" data-act="say" data-say="Дверь открыта">🔓 открыть</button></div>`,
 pkg:t=>`${lbl(t)}${t.items.map(p=>`<div class="mb-3"><div class="flex justify-between text-[13px]"><span>${p.name}</span><span class="jv-sub">${p.eta}</span></div><div class="flex gap-1 mt-1.5">${[0,1,2,3,4].map(i=>`<div class="h-1.5 flex-1 rounded-full ${i<=p.step?'bg-jv-cyan shadow-[0_0_6px_#00d4ff]':'bg-jv-cyan/10'}"></div>`).join('')}</div><div class="jv-sub mt-1">${['оформлен','собран','в пути','в городе','курьер едет'][p.step]}</div></div>`).join('')}`,
 flight:t=>`${lbl(t)}<div class="flex items-center gap-3"><div><div class="font-hud text-3xl font-black">${t.from}</div><div class="jv-sub">${t.fromCity}</div></div><div class="flex-1 relative h-px bg-jv-line"><span class="absolute left-1/2 -top-3 -translate-x-1/2 text-lg">✈</span></div><div class="text-right"><div class="font-hud text-3xl font-black">${t.to}</div><div class="jv-sub">${t.toCity}</div></div></div><div class="grid grid-cols-4 gap-2 mt-4 pt-3 border-0 border-t border-dashed border-jv-line">${[['Рейс',t.code],['Вылет',t.time],['Гейт',t.gate],['Место',t.seat]].map(x=>`<div><div class="jv-sub">${x[0]}</div><div class="font-hud font-bold text-jv-ice">${x[1]}</div></div>`).join('')}</div><div class="mt-3 jv-badge border-jv-green text-jv-green">${t.status}</div>`,
 ticker:t=>`<div class="flex items-center gap-3"><span class="jv-label shrink-0">${t.label}</span><div class="overflow-hidden flex-1"><div class="tick text-[13px]">${[...t.items,...t.items].map(x=>`<span><span class="text-jv-gold">◆</span> ${x}</span>`).join('')}</div></div></div>`,
 habits:t=>`${lbl(t)}<div class="grid grid-cols-[1fr_repeat(7,16px)] gap-1.5 items-center text-[12.5px]"><span></span>${'ПВСЧПСВ'.split('').map(d=>`<span class="jv-sub text-center">${d}</span>`).join('')}${t.rows.map(r=>`<span>${r[0]}</span>${r[1].map(v=>`<span class="w-4 h-4 rounded ${v?'bg-jv-green shadow-[0_0_6px_#3dffa8]':'bg-jv-cyan/10'}"></span>`).join('')}`).join('')}</div>`,
 bars:t=>{const mx=Math.max(...t.values);return `${lbl(t)}<div class="flex items-end gap-1.5 h-28">${t.values.map((v,i)=>`<div class="flex-1 flex flex-col items-center gap-1"><div class="w-full rounded-t ${i===t.hi?'bg-jv-gold':'bg-jv-cyan/50'}" style="height:${v/mx*90}px"></div><span class="jv-sub !text-[9px]">${t.labels[i]}</span></div>`).join('')}</div>${t.sub?`<div class="jv-sub mt-2">${t.sub}</div>`:''}`},
 heart:t=>`${lbl(t)}<div class="flex items-end gap-2"><span class="jv-value !text-jv-red live-bpm">72</span><span class="jv-sub mb-1">уд/мин</span><span class="ml-auto text-2xl animate-pulse">❤️</span></div><svg class="w-full h-16 mt-2" viewBox="0 0 200 40" preserveAspectRatio="none"><path class="live-ecg" fill="none" stroke="#ff4d5e" stroke-width="1.5" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 3px #ff4d5e)"/></svg><div class="jv-sub">${t.sub||''}</div>`,
 battery:t=>`${lbl(t)}${t.items.map(b=>`<div class="flex items-center gap-2 py-1 text-[12.5px]"><span class="w-28 truncate">${b[0]}</span><div class="flex-1 h-1.5 bg-jv-cyan/10 rounded-full overflow-hidden"><div class="h-full ${b[1]<20?'bg-jv-red':b[1]<50?'bg-jv-gold':'bg-jv-green'}" style="width:${b[1]}%"></div></div><span class="font-mono text-[11px] w-9 text-right">${b[1]}%</span></div>`).join('')}`,
 agents:t=>`${lbl(t)}${t.items.map(a=>`<div class="py-1.5"><div class="flex justify-between text-[12.5px]"><span>${a.name}</span><span class="jv-sub agent-st">${a.st}</span></div><div class="h-1 bg-jv-purple/15 rounded-full mt-1 overflow-hidden"><div class="agent-bar h-full bg-jv-purple shadow-[0_0_6px_#b48cff] transition-all duration-700" style="width:${a.p}%"></div></div></div>`).join('')}`,
 actions:t=>`${lbl(t)}<div class="grid grid-cols-2 gap-2">${t.buttons.map(b=>`<button class="jv-btn !py-3 !text-[11px] flex items-center gap-2 justify-center" data-act="cmd" data-cmd="${b[2]}"><span class="text-base">${b[0]}</span>${b[1]}</button>`).join('')}</div>`,
 inbox:t=>`${lbl(t)}${t.items.map(m=>`<div class="jv-row !items-start"><span class="jv-badge ${PRIO[m.p][1]} shrink-0 mt-0.5">${PRIO[m.p][0]}</span><span class="flex-1"><b class="font-semibold">${m.from}</b> <span class="text-jv-mute">— ${m.text}</span></span></div>`).join('')}<div class="jv-sub mt-2">🤖 ещё ${t.hidden} писем разобраны агентом и скрыты</div>`,
 services:t=>`${lbl(t)}${t.items.map(s=>`<div class="jv-row"><span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full ${s[1]==='ok'?'bg-jv-green shadow-[0_0_6px_#3dffa8]':s[1]==='warn'?'bg-jv-gold animate-pulse':'bg-jv-red animate-pulse'}"></span>${s[0]}</span><span class="font-mono text-[11px] text-jv-mute">${s[2]}</span></div>`).join('')}`,
 family:t=>`${lbl(t)}<div class="relative h-36 rounded-md overflow-hidden bg-[#04131c] border border-solid border-jv-line"><svg class="absolute inset-0 w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none"><path d="M0 70 C50 60 80 85 120 70 S180 40 200 50" stroke="rgba(0,140,220,.4)" stroke-width="8" fill="none"/><path d="M20 0 L40 100 M0 30 L200 20 M120 0 L140 100" stroke="rgba(0,212,255,.12)" stroke-width="2"/></svg>${t.people.map(p=>`<div class="absolute -translate-x-1/2 -translate-y-1/2 text-center" style="left:${p.x}%;top:${p.y}%"><div class="w-7 h-7 rounded-full grid place-items-center text-sm border-2 border-solid" style="border-color:${p.c};background:${p.c}33;box-shadow:0 0 10px ${p.c}">${p.e}</div><div class="font-mono text-[9px] mt-0.5 whitespace-nowrap">${p.n}</div></div>`).join('')}</div>`,
 focus:t=>`${lbl(t)}<button data-act="focus" class="w-full rounded-xl border border-solid border-jv-purple bg-jv-purple/10 text-jv-purple py-5 font-hud font-bold tracking-widest cursor-pointer">🎧 ФОКУС: <span class="fst">ВЫКЛ</span></button><div class="jv-sub mt-2">глушит уведомления, кроме КРИТ · включает lo-fi · ставит статус в Slack</div>`,
 note:t=>`${lbl(t)}<div class="text-[14px] leading-relaxed">${t.text}</div>`,
 weather:t=>`${lbl(t)}<div class="flex items-center gap-3"><span class="text-5xl">${t.icon}</span><div><div class="jv-value">${t.temp}</div><div class="jv-sub mt-1">${t.desc}</div></div></div><div class="grid grid-cols-5 gap-1 mt-3 text-center">${t.fc.map(f=>`<div class="jv-sub">${f[0]}<div class="text-jv-text text-[12px]">${f[1]}</div></div>`).join('')}</div>`,
 music:t=>`${lbl(t)}<div class="flex items-center gap-3"><div class="w-14 h-14 rounded-lg shrink-0" style="background:conic-gradient(#ff4d5e,#ffb547,#00d4ff,#b48cff,#ff4d5e)"></div><div class="min-w-0"><div class="font-semibold truncate">${t.track}</div><div class="jv-sub">${t.artist}</div></div></div><div class="h-1 bg-jv-cyan/10 rounded-full mt-3"><div class="h-full w-2/5 bg-jv-cyan rounded-full"></div></div><div class="flex justify-center gap-6 mt-3 text-lg"><button class="bg-transparent border-0 text-jv-text cursor-pointer" data-act="cmd" data-cmd="Стоп">⏮</button><button class="bg-transparent border-0 text-jv-cyan cursor-pointer" data-act="cmd" data-cmd="Включи музыку">⏯</button><button class="bg-transparent border-0 text-jv-text cursor-pointer" data-act="cmd" data-cmd="Включи музыку">⏭</button></div>`,
 translate:t=>`${lbl(t)}${t.pairs.map(p=>`<div class="py-1.5 border-0 border-b border-dashed border-jv-line"><div class="text-[13px]">${p[0]}</div><div class="text-jv-gold text-[13px]">${p[1]}</div><div class="jv-sub">${p[2]}</div></div>`).join('')}<div class="jv-sub mt-2">🎙 скажите фразу — переведу и произнесу</div>`,
 aqi:t=>`${lbl(t)}<div class="flex items-center gap-4">${ringSvg(t.value,t.value<40?'#3dffa8':'#ffb547',84)}<div class="text-[12.5px] space-y-1">${t.rows.map(r=>`<div class="flex justify-between gap-4"><span class="text-jv-mute">${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div></div>`,
 water:t=>`${lbl(t)}<div class="flex flex-wrap gap-1.5">${Array.from({length:t.goal},(_,i)=>`<button data-act="water" class="w-8 h-10 rounded-b-lg rounded-t-sm border border-solid border-jv-cyan cursor-pointer ${i<t.done?'bg-jv-cyan/40':'bg-transparent'}"></button>`).join('')}</div><div class="jv-sub mt-2"><span class="wcnt">${t.done}</span> из ${t.goal} стаканов · нажми, чтобы отметить</div>`,
 quote:t=>`<div class="flex items-center gap-4"><div class="text-4xl">${t.icon}</div><div><div class="text-[15px] text-jv-ice">${t.text}</div><div class="jv-sub mt-1">${t.sub}</div></div></div>`,
};
function tileHTML(t,i=0){const body=t.html?t.html:(W[t.w]||W.note)(t);return t.html?`<div class="${SIZE[t.size||1]} ${t.tall?'row-span-2':''} tile-in" style="animation-delay:${i*40}ms">${body}</div>`:`<div class="jv-tile ${SIZE[t.size||1]} ${t.tall?'row-span-2':''} tile-in" style="animation-delay:${i*40}ms" data-w="${t.w}">${body}</div>`}

/* ---------- дашборды ---------- */
const DASHES={
 morning:{name:'Утро',icon:'🌅',tiles:[
  {w:'clock',size:2,label:'Доброе утро, сэр',sub:'☕ Кофе будет готов через 2 минуты'},
  {w:'weather',label:'Погода',icon:'🌦',temp:'+11°',desc:'облачно, дождь с 16:00',fc:[['Чт','+12'],['Пт','+9'],['Сб','+8'],['Вс','+10'],['Пн','+13']]},
  {w:'stat',label:'Дорога в офис',value:'24 мин',delta:'+7 мин: пробка на Садовом',up:false,sub:'выезд в 09:20',spark:[18,19,22,26,31,28,24]},
  {w:'list',size:2,label:'Сегодня',items:[['Стендап команды','10:00'],['Обед с Пеппер','13:30'],['Тест костюма Mk-85','16:00'],['Зал','19:30']]},
  {w:'ring',label:'Сон',value:86,text:'7 ч 12 мин · глубокий 1 ч 40',color:'#b48cff'},
  {w:'pkg',label:'Посылки',items:[{name:'ReSpeaker Lite',step:4,eta:'сегодня 12–14'},{name:'Raspberry Pi 5',step:2,eta:'пт'}]},
  {w:'tasks',label:'Задачи',items:[['Ответить инвесторам',false],['Купить фильтр для кофемашины',false],['Оплатить интернет',true]]},
  {w:'actions',label:'Быстрые действия',buttons:[['☕','Кофе','Свари кофе'],['📰','Брифинг','Утренний брифинг'],['🪟','Шторы','Открой шторы'],['🎵','Музыка','Включи музыку']]},
  {w:'ticker',size:4,label:'Новости',items:['Вышла новая версия Home Assistant с локальным голосом','ИИ-агенты научились бронировать столики по телефону','Курс доллара: 92.40 ₽ (−0.8%)','В Москве с пятницы похолодание до +5°']},
 ]},
 work:{name:'Работа',icon:'💼',tiles:[
  {w:'agents',size:2,label:'Агенты в фоне',items:[{name:'🔎 Исследование рынка колонок',p:62,st:'читает 7/9'},{name:'🧪 Прогон тестов MyJarvis',p:88,st:'214/240'},{name:'📬 Разбор почты',p:100,st:'готово'},{name:'📝 Протокол стендапа',p:30,st:'слушает Zoom'}]},
  {w:'approval',label:'Нужно ваше решение',text:'Отправить инвесторам отчёт за Q3 (PDF, 12 стр.)?',from:'агент «Почта»'},
  {w:'timer',label:'Помодоро',min:25},
  {w:'inbox',size:2,label:'Входящие · по важности',hidden:23,items:[{p:'crit',from:'PagerDuty',text:'api-gateway: p95 латентность 2.4 с'},{p:'high',from:'Пеппер',text:'Подпиши договор до 15:00'},{p:'norm',from:'GitHub',text:'PR #142 одобрен, можно мержить'},{p:'low',from:'Хабр',text:'Дайджест за неделю'}]},
  {w:'services',label:'Сервисы',items:[['api.myjarvis','ok','42 мс'],['whisper-gpu','ok','GPU 61%'],['home-assistant','ok','v2026.10'],['api-gateway','warn','p95 2.4 с'],['backup-nas','err','нет связи 3 ч']]},
  {w:'stat',label:'Токены за сегодня',value:'$3.18',delta:'1.2 M токенов · −18% к вчера',up:true,spark:[5,4,6,5,7,4,3]},
  {w:'focus',label:'Режим'},
  {w:'stat',label:'STARK · акции',value:'$412.7',delta:'+2.4%',up:true,spark:[380,384,390,388,401,398,412]},
 ]},
 home:{name:'Дом',icon:'🏠',tiles:[
  {w:'cams',size:2,tall:true,label:'Камеры',cams:['Вход','Гостиная','Двор','Гараж'],motion:2},
  {w:'doorbell',label:'Дверной звонок',who:'курьер · 12:41'},
  {w:'aqi',label:'Воздух дома',value:28,rows:[['CO₂','640 ppm'],['PM2.5','8'],['Влажн.','44%'],['Темп.','22.5°']]},
  {w:'bars',label:'Энергия · кВт·ч за неделю',values:[11,9,12,14,10,18,13],labels:['пн','вт','ср','чт','пт','сб','вс'],hi:5,sub:'суббота: сушилка 3 часа — +6 кВт·ч'},
  {w:'battery',label:'Батарейки устройств',items:[['Датчик двери',12],['Замок',47],['Пульт ТВ',80],['Робот-пылесос',100],['Датчик протечки',64]]},
  {w:'family',size:2,label:'Где все',people:[{n:'Вы · дома',e:'🧔',x:25,y:60,c:'#00d4ff'},{n:'Пеппер · офис',e:'👩',x:72,y:35,c:'#b48cff'},{n:'Хэппи · в пути',e:'🚗',x:50,y:48,c:'#ffb547'}]},
  {w:'actions',size:2,label:'Сцены',buttons:[['🎬','Кино','Выключи свет'],['🌙','Спать','Выключи свет'],['🏠','Я дома','Включи свет'],['🚪','Ушёл из дома','Выключи свет']]},
 ]},
 health:{name:'Здоровье',icon:'❤️',tiles:[
  {w:'heart',size:2,label:'Пульс · Apple Watch',sub:'покой: 58 · HRV 64 мс · норма'},
  {w:'ring',label:'Шаги',value:64,text:'6 420 / 10 000',color:'#3dffa8'},
  {w:'ring',label:'Калории',value:48,text:'410 / 850 ккал',color:'#ff4d5e'},
  {w:'bars',size:2,label:'Сон · часы',values:[6.2,7.1,5.4,7.8,6.9,8.4,7.2],labels:['пн','вт','ср','чт','пт','сб','вс'],hi:2,sub:'среда: 5.4 ч — после поздней сессии кода. Совет: экран выкл. в 23:30'},
  {w:'habits',label:'Привычки',rows:[['Зал',[1,0,1,0,1,0,0]],['Медитация',[1,1,1,0,1,1,1]],['Без сахара',[1,1,0,1,1,0,1]],['Чтение',[0,1,1,1,0,1,1]]]},
  {w:'water',label:'Вода',goal:8,done:3},
 ]},
 trip:{name:'Поездка',icon:'✈️',tiles:[
  {w:'flight',size:2,label:'Посадочный',from:'SVO',fromCity:'Москва',to:'IST',toCity:'Стамбул',code:'SU 2136',time:'14:25',gate:'D27',seat:'4A',status:'регистрация открыта · выезд в 11:40'},
  {w:'weather',label:'Стамбул',icon:'☀️',temp:'+21°',desc:'солнечно, ветер с моря',fc:[['Пт','+22'],['Сб','+20'],['Вс','+19'],['Пн','+21'],['Вт','+23']]},
  {w:'stat',label:'Курс TRY',value:'2.71 ₽',delta:'+0.3%',up:true,spark:[2.6,2.62,2.65,2.69,2.68,2.7,2.71]},
  {w:'translate',size:2,label:'Переводчик',pairs:[['Сколько стоит?','Ne kadar?','нэ кадар'],['Счёт, пожалуйста','Hesap, lütfen','хэсап, лютфен']]},
  {w:'tasks',size:2,label:'Чек-лист сборов',items:[['Паспорт',true],['Зарядки и адаптер',true],['Страховка (PDF в телефоне)',false],['Выключить бойлер — сделаю сам 😉',false]]},
 ]},
 night:{name:'Ночь',icon:'🌙',tiles:[
  {w:'clock',size:2,label:'Не беспокоить до 07:30',sub:'🔕 пропускаю только КРИТ'},
  {w:'list',label:'Охрана',items:[['🔒 Двери','закрыты'],['🪟 Окна','закрыты'],['📹 Камеры','4/4'],['🔥 Дым / газ','норма']]},
  {w:'list',label:'Будильник',items:[['⏰ Подъём','07:30'],['☀️ Шторы откроются','07:25'],['☕ Кофе','07:35']]},
  {w:'quote',size:4,icon:'🌙',text:'Завтра первое событие — стендап в 10:00. Дождь с утра: зонт у двери.',sub:'Джарвис · вечерняя сводка'},
 ]},
 agent:{name:'🤖 Агент',icon:'',tiles:[]},
};
try{const s=JSON.parse(localStorage.getItem('jv_agent_tiles')||'null');if(s)DASHES.agent.tiles=s}catch(e){}
const saveAgent=()=>{try{localStorage.setItem('jv_agent_tiles',JSON.stringify(DASHES.agent.tiles))}catch(e){}};
const DKEYS=Object.keys(DASHES);let curDash='morning';
function autoDash(){const h=new Date().getHours();return h<5?'night':h<11?'morning':h<19?'work':h<23?'home':'night'}
curDash=autoDash();$('#dashAuto').textContent='авто по времени: '+DASHES[curDash].name.toLowerCase();
function renderDashTabs(){$('#dashTabs').innerHTML=DKEYS.map(k=>`<button data-d="${k}" class="jv-btn ${k===curDash?'!bg-jv-cyan/30 shadow-[0_0_15px_rgba(0,212,255,.35)]':'!border-jv-line !text-jv-mute !bg-transparent'}">${DASHES[k].icon} ${DASHES[k].name}${k==='agent'?` (${DASHES.agent.tiles.length})`:''}</button>`).join('');$$('#dashTabs button').forEach(b=>b.onclick=()=>showDash(b.dataset.d))}
function showDash(k){curDash=k;renderDashTabs();const t=DASHES[k].tiles;$('#dashGrid').innerHTML=t.length?t.map(tileHTML).join(''):`<div class="jv-tile sm:col-span-2 lg:col-span-4 text-center py-10"><div class="text-4xl mb-2">🤖</div><div class="jv-sub">Пусто. Попросите агента во вкладке «Конструктор» добавить плитки.</div></div>`;liveTick();bus?.('dashboard',{id:k})}
function dashStep(d){const i=(DKEYS.indexOf(curDash)+d+DKEYS.length)%DKEYS.length;showDash(DKEYS[i]);toast(`${d>0?'→':'←'} ${DASHES[DKEYS[i]].icon} ${DASHES[DKEYS[i]].name}`)}
addEventListener('keydown',e=>{if(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA')return;if(e.key===']')dashStep(1);if(e.key==='[')dashStep(-1)});

/* делегирование кликов внутри плиток (работает в дашбордах и в превью конструктора) */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,tile=b.closest('.jv-tile');
  if(a==='cmd'){toast('🗣 «'+b.dataset.cmd+'»');handle(b.dataset.cmd)}
  if(a==='say'){toast('🔊 '+b.dataset.say);speak(b.dataset.say)}
  if(a==='approve'||a==='deny')decide(tile,a==='approve');
  if(a==='focus'){const s=tile.querySelector('.fst');const on=s.textContent==='ВЫКЛ';s.textContent=on?'ВКЛ':'ВЫКЛ';b.classList.toggle('!bg-jv-purple/40',on);toast(on?'🎧 Фокус включён: уведомления заглушены':'Фокус выключен')}
  if(a==='water'){b.classList.toggle('bg-jv-cyan/40');b.classList.toggle('bg-transparent');tile.querySelector('.wcnt').textContent=tile.querySelectorAll('[data-act=water].bg-jv-cyan\\/40').length}
  if(a==='tstart'){const el=tile.querySelector('[data-timer]');el.dataset.run=el.dataset.run==='1'?'0':'1';b.textContent=el.dataset.run==='1'?'⏸ ПАУЗА':'▶ СТАРТ'}
  if(a==='treset'){const el=tile.querySelector('[data-timer]');el.dataset.left=el.dataset.timer;el.dataset.run='0';tile.querySelector('[data-act=tstart]').textContent='▶ СТАРТ';liveTick()}
});
function decide(tile,ok){
  tile=tile||document.querySelector('#dashGrid .abox')?.closest('.jv-tile');
  if(!tile||!tile.querySelector('.abox')){toast(ok?'👍 Нечего одобрять':'👎 Нечего отклонять');return false}
  tile.querySelector('.abox').outerHTML=`<div class="jv-badge ${ok?'border-jv-green text-jv-green':'border-jv-red text-jv-red'}">${ok?'✓ одобрено, агент продолжает':'✗ отклонено, агент остановлен'}</div>`;
  log(`approval → ${ok?'yes':'no'}`,ok?'ok':'w');return true;
}

/* живые плитки: часы, таймер, пульс, агенты */
let ecg=Array.from({length:100},()=>20);
function liveTick(){
  const now=new Date();
  $$('.live-clock').forEach(e=>e.textContent=now.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
  $$('.live-date').forEach(e=>e.textContent=now.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'}));
  $$('[data-timer]').forEach(el=>{let l=+el.dataset.left;if(el.dataset.run==='1'&&l>0){l--;el.dataset.left=l;if(!l){toast('⏰ Таймер закончился');speak('Время вышло, сэр. Сделайте перерыв.')}}el.textContent=`${String(Math.floor(l/60)).padStart(2,'0')}:${String(l%60).padStart(2,'0')}`;const bar=el.parentElement.querySelector('.tbar');if(bar)bar.style.width=(1-l/el.dataset.timer)*100+'%'});
}
setInterval(liveTick,1000);
let beat=0;
setInterval(()=>{
  beat++;const ph=beat%22;const v=ph===0?4:ph===1?36:ph===2?14:ph===5?24:20+Math.random()*1.5;ecg.push(v);ecg.shift();
  const d=ecg.map((y,i)=>`${i?'L':'M'}${i*2} ${40-y}`).join(' ');$$('.live-ecg').forEach(p=>p.setAttribute('d',d));
  if(beat%22===0)$$('.live-bpm').forEach(e=>e.textContent=68+Math.round(Math.random()*8));
},45);
setInterval(()=>$$('.agent-bar').forEach(b=>{let w=parseFloat(b.style.width);if(w<100){w=Math.min(100,w+Math.random()*6);b.style.width=w+'%';if(w>=100)b.closest('.py-1\\.5').querySelector('.agent-st').textContent='готово ✓'}}),1500);

/* =====================================================================
   ПОВЕРХНОСТИ ВЫВОДА + маршрутизация
   ===================================================================== */
const EVENTS={
 meet:{n:'📅 Встреча через 15 мин',p:1,short:'Стендап · 15 мин',long:'Стендап команды в 10:00 · Zoom · ссылка в календаре',voice:'Сэр, через пятнадцать минут стендап.'},
 door:{n:'🔔 Курьер у двери',p:2,short:'Курьер у двери',long:'Курьер у двери · посылка «ReSpeaker Lite»',voice:'У двери курьер с вашей посылкой.'},
 down:{n:'🔥 Упал прод',p:3,short:'PROD DOWN',long:'api.myjarvis: 502 уже 3 мин · откат на v1.4 готов',voice:'Сэр, продакшен недоступен три минуты. Откатить?'},
 msg:{n:'💬 Пеппер пишет',p:0,short:'Пеппер: ужин в 8?',long:'Пеппер: «Не забудь, ужин в 20:00 у родителей»',voice:'Пеппер напоминает про ужин в восемь.'},
 rain:{n:'🌧 Дождь через час',p:0,short:'Дождь в 16:00',long:'Дождь с 16:00 до 19:00, возьмите зонт',voice:'Через час дождь.'},
};
const CTX={desk:'💻 За компьютером',car:'🚗 За рулём',meeting:'👥 На встрече',sleep:'😴 Спите',run:'🏃 На пробежке',sofa:'🛋 Смотрите ТВ',walk:'🕶 Гуляете в AR-очках'};
let curEv='meet',curCtx='desk';
function route(ev,ctx){
  const p=ev.p,r={},add=(s,why)=>r[s]=why;
  if(ctx==='sleep'){if(p>=3){add('speaker','КРИТ: будим голосом и светом');add('phone','КРИТ: звонок в обход «не беспокоить»')}else add('eink','ночь: отложено, утром на настенном экране');return r}
  if(ctx==='meeting'){if(p>=2)add('watch','на встрече: только тихая вибрация');if(p>=3)add('phone','КРИТ: пуш даже на встрече');if(p<2)add('tg','без звука, прочитаете после');return r}
  if(ctx==='car'){add('car','за рулём: экран машины + голос');if(p>=3)add('phone','дубль: перезвонить, когда остановитесь');return r}
  if(ctx==='run'){if(p>=1)add('watch','на пробежке: часы');if(p>=2)add('speaker','голосом в наушники');if(p<1)add('tg','подождёт до конца тренировки');return r}
  if(ctx==='sofa'){add('tv','смотрите ТВ: плашка поверх картинки');if(p>=1)add('speaker','голос через колонку, ТВ на паузе');if(p>=3)add('phone','КРИТ: дубль на телефон');return r}
  if(ctx==='walk'){add('ar','AR-очки: текст прямо в поле зрения');if(p>=1)add('watch','вибро на часы');if(p>=2)add('speaker','голосом в динамики очков');return r}
  add('monitor','вы за компьютером: HUD-баннер');add('menubar','значок в меню-баре');if(p>=2)add('speaker','важно: ещё и голосом');if(p>=3)add('phone','КРИТ: дубль на телефон');if(p===0)add('eink','попадёт в вечернюю сводку');
  return r;
}
const DEV={
 monitor:{n:'Монитор · HUD',draw:(e,on)=>`<div class="aspect-video rounded-lg border-2 border-solid border-[#1c3a4a] bg-[radial-gradient(circle_at_50%_60%,#06283a,#020a10)] relative overflow-hidden"><div class="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-solid border-jv-cyan shadow-[0_0_20px_#00d4ff]"></div>${on?`<div class="absolute right-2 top-2 left-10 rounded-md border border-solid border-jv-cyan bg-black/70 p-2 text-[11px] tile-in"><b class="text-jv-cyan">J.A.R.V.I.S.</b> ${e.long}</div>`:''}</div>`},
 menubar:{n:'Меню-бар macOS',draw:(e,on)=>`<div class="rounded-lg overflow-hidden border border-solid border-[#333] bg-[#1e1e1e]"><div class="flex items-center gap-3 px-2 h-6 bg-[#2b2b2b] text-[11px] text-[#ddd]"><span></span><span class="ml-auto ${on?'text-jv-cyan animate-pulse':''}">◉</span><span>10:45</span></div>${on?`<div class="m-2 rounded-md bg-[#2b2b2b] p-2 text-[11px] text-[#eee] tile-in">◉ ${e.short}</div>`:'<div class="h-12"></div>'}</div>`},
 phone:{n:'Телефон · пуш',draw:(e,on)=>`<div class="mx-auto w-36 h-60 rounded-[26px] border-[5px] border-solid border-[#222] bg-[linear-gradient(160deg,#1b2a4a,#0b0f1d)] p-2 text-center relative"><div class="mx-auto w-12 h-3 bg-black rounded-full"></div><div class="text-3xl font-light mt-3 text-white">10:45</div>${on?`<div class="mt-3 rounded-xl bg-white/15 backdrop-blur p-2 text-left text-[10px] text-white tile-in"><b>JARVIS</b> · сейчас<br>${e.short}</div>`:''}</div>`},
 watch:{n:'Часы',draw:(e,on)=>`<div class="mx-auto w-28 h-32 rounded-[30px] border-[5px] border-solid border-[#333] bg-black grid place-items-center text-center p-2"><div>${on?`<div class="text-xl animate-bounce">📳</div><div class="text-[10px] text-jv-green font-semibold leading-tight tile-in">${e.short}</div>`:`<div class="text-xl text-white font-light">10:45</div>`}</div></div>`},
 tv:{n:'Телевизор',draw:(e,on)=>`<div class="aspect-video rounded-md border-4 border-solid border-[#111] bg-[linear-gradient(135deg,#3a1d4a,#0d3a4a)] relative">${on?`<div class="absolute left-0 right-0 bottom-3 mx-3 rounded bg-black/75 border-0 border-l-4 border-solid border-jv-cyan p-1.5 text-[11px] tile-in">⏸ ${e.long}</div>`:'<div class="absolute inset-0 grid place-items-center text-2xl opacity-40">🎬</div>'}</div>`},
 car:{n:'Авто · CarPlay',draw:(e,on)=>`<div class="h-28 rounded-[14px] border-4 border-solid border-[#222] bg-[#0a0f14] grid grid-cols-3 gap-1.5 p-1.5"><div class="col-span-2 rounded bg-[#10232e] relative overflow-hidden"><svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 60"><path d="M10 55 L40 30 L90 20" stroke="#00d4ff" stroke-width="3" fill="none"/></svg></div><div class="rounded bg-[#151515] p-1 text-[9px] ${on?'text-jv-gold':'text-jv-mute'}">${on?`<span class="tile-in">🔊 ${e.short}</span>`:'♪ AC/DC'}</div></div>`},
 ar:{n:'AR-очки',draw:(e,on)=>`<div class="relative h-28 rounded-lg bg-[linear-gradient(180deg,#5a7a8a,#2a3a2a)] overflow-hidden"><div class="absolute inset-x-6 top-5 h-16 flex gap-2"><div class="flex-1 rounded-[40%] border-[3px] border-solid border-black/80 bg-white/5"></div><div class="flex-1 rounded-[40%] border-[3px] border-solid border-black/80 bg-white/5"></div></div>${on?`<div class="absolute left-1/2 top-8 -translate-x-1/2 text-[10px] text-jv-green font-mono whitespace-nowrap tile-in" style="text-shadow:0 0 6px #3dffa8">◇ ${e.short}</div>`:''}</div>`},
 eink:{n:'E-ink на стене',draw:(e,on)=>`<div class="aspect-[4/3] rounded-sm bg-[#e8e6df] border-[6px] border-solid border-[#2a2a2a] p-2 text-[#111] font-serif"><div class="text-[11px] font-bold border-0 border-b border-solid border-[#999] pb-1">Сводка · четверг</div><div class="text-[10px] mt-1 leading-snug">☁ +11° · 3 встречи${on?`<br><b class="tile-in">• ${e.short}</b>`:''}</div></div>`},
 speaker:{n:'Колонка · голос',draw:(e,on)=>`<div class="flex flex-col items-center"><div class="w-20 h-20 rounded-full bg-[#1a1a1a] border-4 border-solid ${on?'border-jv-cyan shadow-[0_0_25px_#00d4ff] animate-pulse':'border-[#333]'}"></div>${on?`<div class="mt-2 rounded-lg bg-jv-cyan/10 border border-solid border-jv-line px-2 py-1 text-[10.5px] italic tile-in">«${e.voice}»</div>`:''}</div>`},
 tg:{n:'Telegram',draw:(e,on)=>`<div class="rounded-lg bg-[#0e1621] p-2 h-28"><div class="text-[10px] text-[#6ab3f3] mb-1">🤖 Jarvis Bot</div>${on?`<div class="rounded-xl rounded-tl-sm bg-[#182533] p-2 text-[11px] text-white max-w-[90%] tile-in">${e.long}<div class="text-right text-[9px] text-[#6d7f8f]">10:45 ✓✓</div></div>`:''}</div>`},
};
function renderSurf(){
  $('#evBtns').innerHTML=Object.entries(EVENTS).map(([k,e])=>`<button data-k="${k}" class="jv-btn ${k===curEv?'!bg-jv-cyan/30':'!border-jv-line !text-jv-mute !bg-transparent'} !normal-case !tracking-normal !font-sans !text-[12px]">${e.n} <span class="jv-badge ml-1 ${[PRIO.low,PRIO.norm,PRIO.high,PRIO.crit][e.p][1]}">${[PRIO.low,PRIO.norm,PRIO.high,PRIO.crit][e.p][0]}</span></button>`).join('');
  $('#ctxBtns').innerHTML=Object.entries(CTX).map(([k,n])=>`<button data-k="${k}" class="jv-btn ${k===curCtx?'!bg-jv-gold/20 !border-jv-gold !text-jv-gold':'!border-jv-line !text-jv-mute !bg-transparent'} !normal-case !tracking-normal !font-sans !text-[12px]">${n}</button>`).join('');
  $$('#evBtns button').forEach(b=>b.onclick=()=>{curEv=b.dataset.k;renderSurf()});
  $$('#ctxBtns button').forEach(b=>b.onclick=()=>{curCtx=b.dataset.k;renderSurf()});
  const r=route(EVENTS[curEv],curCtx);
  $('#surfaces').innerHTML=Object.entries(DEV).map(([k,d])=>`<div class="jv-tile !p-3 ${r[k]?'!border-jv-cyan shadow-[0_0_20px_rgba(0,212,255,.2)]':''}"><div class="flex items-center gap-2 mb-2"><span class="w-2 h-2 rounded-full ${r[k]?'bg-jv-green shadow-[0_0_6px_#3dffa8]':'bg-[#333]'}"></span><span class="jv-label !text-[9px]">${d.n}</span></div><div class="${r[k]?'':'surf-off'}">${d.draw(EVENTS[curEv],!!r[k])}</div><div class="jv-sub mt-2 min-h-[28px] ${r[k]?'!text-jv-text':''}">${r[k]||'— не беспокоим'}</div></div>`).join('');
}

/* =====================================================================
   ЖЕСТЫ — MediaPipe GestureRecognizer
   ===================================================================== */
const GACT={
 Open_Palm:{e:'🖐',n:'Ладонь',a:'Стоп: пауза музыки и голоса',run:()=>{speechSynthesis.cancel();$('#np').classList.remove('play');if(listening)rec.stop();toast('🖐 Стоп')}},
 Pointing_Up:{e:'☝️',n:'Палец вверх',a:'«Слушаю» (как wake word)',run:()=>{goTab('hud');startMic()}},
 Thumb_Up:{e:'👍',n:'Большой палец вверх',a:'Одобрить действие агента',run:()=>{if(!$('#dash').classList.contains('on')){goTab('dash')}if(!document.querySelector('#dashGrid .abox'))showDash('work');setTimeout(()=>decide(null,true),300)}},
 Thumb_Down:{e:'👎',n:'Большой палец вниз',a:'Отклонить',run:()=>{if(!document.querySelector('#dashGrid .abox'))showDash('work');setTimeout(()=>decide(null,false),300)}},
 Victory:{e:'✌️',n:'Победа',a:'Скриншот экрана',run:()=>{$('#flash').style.opacity=.8;setTimeout(()=>$('#flash').style.opacity=0,120);toast('📸 Скриншот сохранён в ~/Jarvis/shots')}},
 Closed_Fist:{e:'✊',n:'Кулак',a:'Тихий режим (голос вкл/выкл)',run:()=>{voiceOn=!voiceOn;toast(voiceOn?'🔊 Голос включён':'🔇 Тихий режим')}},
 ILoveYou:{e:'🤟',n:'«Рок»',a:'Включить AC/DC 🤘',run:()=>{$('#np').classList.add('play');$('#track').textContent='Thunderstruck';toast('🤟 Thunderstruck — AC/DC')}},
 Swipe_L:{e:'👈',n:'Свайп влево',a:'Предыдущий дашборд',run:()=>{goTab('dash');dashStep(-1)}},
 Swipe_R:{e:'👉',n:'Свайп вправо',a:'Следующий дашборд',run:()=>{goTab('dash');dashStep(1)}},
 Pinch:{e:'🤏',n:'Щипок',a:'Клик (в режиме аэромыши)',run:()=>toast('🤏 клик')},
};
$('#gmap').innerHTML=Object.entries(GACT).map(([k,g])=>`<div class="gm-row" data-g="${k}"><span class="text-xl text-center">${g.e}</span><span><b class="font-semibold">${g.n}</b><br><span class="text-jv-mute text-[11.5px]">${g.a}</span></span><button data-sim="${k}">симул.</button></div>`).join('');
$$('#gmap [data-sim]').forEach(b=>b.onclick=()=>fireGesture(b.dataset.sim,true));
function glog(t){const d=document.createElement('div');d.textContent=new Date().toLocaleTimeString('ru-RU')+'  '+t;$('#glog').append(d);while($('#glog').children.length>8)$('#glog').firstChild.remove()}
let lastFire=0;
function fireGesture(k,sim){
  const g=GACT[k];if(!g)return;lastFire=performance.now();
  $$('.gm-row').forEach(r=>r.classList.toggle('hit',r.dataset.g===k));setTimeout(()=>$(`.gm-row[data-g="${k}"]`)?.classList.remove('hit'),900);
  glog(`${g.e} ${k}${sim?' (симуляция)':''} → ${g.a}`);bus?.('gesture',{name:k,action:g.a});log(`gesture: ${k}`,'c');
  g.run();
}
$('#camIdeas').innerHTML=[['👤','Присутствие','Вы отошли от стола — экран гаснет, музыка на паузу. Вернулись — «С возвращением, сэр».'],['🙂','Face ID','Узнаёт хозяина и гостей; чужим не открывает замок и не читает почту.'],['👀','Взгляд','Смотрите на виджет 1 сек — он раскрывается. Отвернулись — Джарвис замолкает.'],['🧍','Осанка','MediaPipe Pose: сутулитесь 10 мин — мягкое напоминание.'],['🤟','Язык жестов','Распознавание дактиля для людей с нарушением слуха.'],['📦','Объекты','«Где мои ключи?» — камера в прихожей помнит, куда вы их положили.'],['😴','Усталость','Частое моргание и зевки → «Может, кофе или перерыв?»'],['✍️','Доска','Рисуете на бумаге схему — Джарвис превращает её в Mermaid-диаграмму.']].map(x=>`<div class="rounded-lg border border-solid border-jv-line p-2.5 bg-black/20"><div class="font-semibold mb-1">${x[0]} ${x[1]}</div><div class="text-jv-mute text-[12px] leading-snug">${x[2]}</div></div>`).join('');

const HANDC=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
let gr=null,fd=null,gOn=false,gDemo=false,holdK=null,holdT=0,wristHist=[],acur={x:innerWidth/2,y:innerHeight/2},pinched=false,fpsT=performance.now(),fpsN=0;

/* ---------- разметка: лица — приглушённо, руки — ярко ---------- */
function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
function drawFace(x,b,score,kps){
  const L=Math.min(b.w,b.h)*.2;x.save();
  x.strokeStyle='rgba(205,225,235,.42)';x.lineWidth=1.4;x.setLineDash([]);
  [[b.x,b.y,1,1],[b.x+b.w,b.y,-1,1],[b.x,b.y+b.h,1,-1],[b.x+b.w,b.y+b.h,-1,-1]].forEach(([cx,cy,dx,dy])=>{x.beginPath();x.moveTo(cx+dx*L,cy);x.lineTo(cx,cy);x.lineTo(cx,cy+dy*L);x.stroke()});
  x.strokeStyle='rgba(205,225,235,.12)';x.setLineDash([3,5]);x.strokeRect(b.x,b.y,b.w,b.h);x.setLineDash([]);
  x.fillStyle='rgba(205,225,235,.35)';(kps||[]).forEach(p=>{x.beginPath();x.arc(p.x,p.y,1.8,0,7);x.fill()});
  x.font='500 10.5px "JetBrains Mono",monospace';x.fillStyle='rgba(205,225,235,.55)';x.fillText(`лицо · ${Math.round(score*100)}%`,b.x,b.y-7);
  x.restore();
}
function drawHand(x,P,info,score,prog,fired,now){
  const col=info?'#ffb547':'#00d4ff',rgb=info?'255,181,71':'0,212,255';
  const xs=P.map(p=>p.x),ys=P.map(p=>p.y),pad=20;
  const b={x:Math.min(...xs)-pad,y:Math.min(...ys)-pad,w:Math.max(...xs)-Math.min(...xs)+pad*2,h:Math.max(...ys)-Math.min(...ys)+pad*2};
  x.save();
  // скелет
  x.strokeStyle=col;x.lineWidth=3;x.shadowColor=col;x.shadowBlur=12;
  HANDC.forEach(([a,c])=>{x.beginPath();x.moveTo(P[a].x,P[a].y);x.lineTo(P[c].x,P[c].y);x.stroke()});
  P.forEach((p,i)=>{const tip=[4,8,12,16,20].includes(i);x.fillStyle=tip?'#fff':col;x.beginPath();x.arc(p.x,p.y,tip?5.5:3.5,0,7);x.fill()});
  // рамка
  x.shadowBlur=22;x.fillStyle=`rgba(${rgb},.07)`;rr(x,b.x,b.y,b.w,b.h,14);x.fill();
  x.lineWidth=2.5;x.strokeStyle=col;x.stroke();
  // акценты по углам
  x.lineWidth=5;x.lineCap='round';const L=16;
  [[b.x,b.y,1,1],[b.x+b.w,b.y,-1,1],[b.x,b.y+b.h,1,-1],[b.x+b.w,b.y+b.h,-1,-1]].forEach(([cx,cy,dx,dy])=>{x.beginPath();x.moveTo(cx+dx*L,cy);x.lineTo(cx,cy);x.lineTo(cx,cy+dy*L);x.stroke()});
  // вспышка при срабатывании
  if(fired>=0&&fired<700){const t=fired/700;x.globalAlpha=1-t;x.lineWidth=3;rr(x,b.x-t*26,b.y-t*26,b.w+t*52,b.h+t*52,14+t*10);x.stroke();x.globalAlpha=1}
  x.shadowBlur=0;
  // плашка с жестом
  const txt=info?`${info.e} ${info.n} · ${Math.round(score*100)}%`:'✋ рука';
  x.font='700 14px Inter,system-ui,sans-serif';const tw=x.measureText(txt).width+22,th=28,lx=b.x,ly=b.y-th-8;
  x.shadowColor=col;x.shadowBlur=16;x.fillStyle=col;rr(x,lx,ly,tw,th,8);x.fill();x.shadowBlur=0;
  x.fillStyle='#021018';x.fillText(txt,lx+11,ly+19);
  if(prog>0){x.fillStyle='rgba(2,16,24,.35)';x.fillRect(lx+6,ly+th-5,tw-12,2.5);x.fillStyle='#021018';x.fillRect(lx+6,ly+th-5,(tw-12)*prog,2.5)}
  x.restore();
}

$('#gstart').onclick=async()=>{
  const b=$('#gstart');b.textContent='ЗАГРУЖАЮ МОДЕЛИ…';b.disabled=true;
  try{
    const V='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    const vision=await import(V+'/vision_bundle.mjs');
    const files=await vision.FilesetResolver.forVisionTasks(V+'/wasm');
    gr=await vision.GestureRecognizer.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.75,minHandPresenceConfidence:.75,minTrackingConfidence:.6});
    try{fd=await vision.FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',delegate:'GPU'},runningMode:'VIDEO',minDetectionConfidence:.5})}catch(e){glog('детектор лиц не загрузился: '+e.message)}
    b.textContent='ЗАПРАШИВАЮ КАМЕРУ…';
    const st=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
    const v=$('#gvid');v.srcObject=st;await v.play();gDemo=false;gOn=true;$('#gidle').hidden=true;glog('камера и модели готовы: руки + лица');gLoop();
  }catch(err){b.disabled=false;b.textContent='ПОВТОРИТЬ';$('#gidle .jv-sub').textContent='Не вышло: '+(err.message||err)+'. Нужен интернет для загрузки модели и разрешение на камеру (Chrome). Если открыто как файл и не работает — запусти: python3 -m http.server. Пока можно жать «симул.» справа или «пример разметки».'}
};
function gLoop(){
  if(!gOn)return;requestAnimationFrame(gLoop);
  const v=$('#gvid'),c=$('#gcan'),x=c.getContext('2d');if(v.readyState<2)return;
  const now=performance.now();const r=gr.recognizeForVideo(v,now);
  x.save();x.translate(c.width,0);x.scale(-1,1);x.drawImage(v,0,0,c.width,c.height);x.restore();
  x.fillStyle='rgba(0,20,30,.35)';x.fillRect(0,0,c.width,c.height);
  fpsN++;if(now-fpsT>1000){$('#gfps').textContent=fpsN+' fps';fpsN=0;fpsT=now}
  // лица
  let nf=0;
  if(fd){const sx=c.width/v.videoWidth,sy=c.height/v.videoHeight;const dets=fd.detectForVideo(v,now).detections||[];nf=dets.length;
    dets.forEach(d=>{const bb=d.boundingBox;drawFace(x,{x:c.width-(bb.originX+bb.width)*sx,y:bb.originY*sy,w:bb.width*sx,h:bb.height*sy},d.categories?.[0]?.score||0,(d.keypoints||[]).map(k=>({x:(1-k.x)*c.width,y:k.y*c.height})))})}
  $('#gfaces').textContent='лиц: '+nf;
  const nh=r.landmarks?.length||0;$('#ghands').textContent='рук: '+nh;
  // вторая рука — просто подсветка
  for(let h=1;h<nh;h++)drawHand(x,r.landmarks[h].map(p=>({x:(1-p.x)*c.width,y:p.y*c.height})),GACT[r.gestures?.[h]?.[0]?.categoryName],r.gestures?.[h]?.[0]?.score||0,0,9999,now);
  const L=r.landmarks?.[0];
  if(!L){$('#gbig').textContent='—';$('#gname').textContent='рука не найдена';$('#gact').textContent='покажи ладонь в камеру';$('#ghold').style.width=0;holdK=null;$('#aircur').hidden=true;return}
  const P=L.map(p=>({x:(1-p.x)*c.width,y:p.y*c.height}));
  const pd=Math.hypot(L[4].x-L[8].x,L[4].y-L[8].y);const isPinch=pd<.05;
  const g=r.gestures?.[0]?.[0];const k=g&&g.score>.6&&g.categoryName!=='None'?g.categoryName:(isPinch?'Pinch':null);
  const info=GACT[k];
  const mouse=$('#gmouse').checked;
  let prog=0;
  if(k&&k!=='Pinch'&&!mouse){if(holdK!==k){holdK=k;holdT=now}prog=Math.min(1,(now-holdT)/600);if(prog>=1&&now-lastFire>1500){fireGesture(k);holdT=now+99999}}else holdK=null;
  drawHand(x,P,info,g?.score||1,Math.max(0,prog),now-lastFire,now);
  if(isPinch){x.save();x.strokeStyle='#fff';x.lineWidth=2;x.shadowColor='#ffb547';x.shadowBlur=14;x.beginPath();x.arc((P[4].x+P[8].x)/2,(P[4].y+P[8].y)/2,16,0,7);x.stroke();x.restore()}
  $('#gbig').textContent=info?.e||'✋';$('#gname').textContent=info?`${info.n} · ${(g?.score||1).toFixed(2)}`:'рука найдена';$('#gact').textContent=info?.a||'жест не распознан';$('#ghold').style.width=Math.max(0,prog)*100+'%';
  // аэромышь
  $('#aircur').hidden=!mouse;
  if(mouse){const tx=Math.min(1,Math.max(0,((1-L[8].x)-.15)/.7))*innerWidth,ty=Math.min(1,Math.max(0,(L[8].y-.12)/.6))*innerHeight;acur.x+=(tx-acur.x)*.35;acur.y+=(ty-acur.y)*.35;const ac=$('#aircur');ac.style.transform=`translate(${acur.x}px,${acur.y}px)`;ac.classList.toggle('pinch',isPinch);
    if(isPinch&&!pinched){ac.hidden=true;const el=document.elementFromPoint(acur.x,acur.y);ac.hidden=false;if(el){el.click();el.focus?.();glog('🤏 клик по '+(el.textContent||el.tagName).trim().slice(0,30))}}}
  pinched=isPinch;
  // свайп: скорость запястья
  wristHist.push({x:1-L[0].x,t:now});wristHist=wristHist.filter(w=>now-w.t<250);
  if(!mouse&&wristHist.length>3&&now-lastFire>900){const dx=wristHist.at(-1).x-wristHist[0].x;if(Math.abs(dx)>.22){fireGesture(dx>0?'Swipe_R':'Swipe_L');wristHist=[]}}
}

/* ---------- пример разметки без камеры ---------- */
const DEMO_HAND=[[430,400],[392,372],[362,338],[342,304],[326,272],[405,300],[400,250],[397,214],[395,184],[430,295],[430,240],[430,200],[430,168],[455,302],[460,252],[463,218],[465,190],[478,315],[488,275],[494,248],[498,225]];
const DEMO_SEQ=['Open_Palm','Thumb_Up','Victory','Pointing_Up'];
$('#gdemo').onclick=()=>{if(gOn)return;gDemo=!gDemo;$('#gidle').hidden=gDemo;$('#gdemo2').hidden=!gDemo;if(gDemo){glog('пример разметки (без камеры)');demoLoop()}};
$('#gdemo2').onclick=()=>$('#gdemo').onclick();
function demoLoop(){
  if(!gDemo||gOn)return;requestAnimationFrame(demoLoop);
  const c=$('#gcan'),x=c.getContext('2d'),now=performance.now(),t=now/1000;
  const bg=x.createLinearGradient(0,0,c.width,c.height);bg.addColorStop(0,'#0c2230');bg.addColorStop(1,'#050c12');x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);
  x.fillStyle='rgba(255,255,255,.03)';for(let i=0;i<6;i++)x.fillRect(40+i*100,330,60,150);
  // силуэт
  x.fillStyle='rgba(120,150,165,.18)';x.beginPath();x.ellipse(225,215,72,92,0,0,7);x.fill();x.beginPath();x.ellipse(225,470,150,120,0,0,7);x.fill();
  const fy=Math.sin(t*1.3)*4;
  drawFace(x,{x:150,y:118+fy,w:150,h:190},.97,[[195,192],[255,192],[225,228],[225,262],[156,205],[294,205]].map(p=>({x:p[0],y:p[1]+fy})));
  x.save();x.font='500 10.5px "JetBrains Mono",monospace';x.fillStyle='rgba(205,225,235,.4)';x.fillText('сэр (Face ID)',150,330+fy);x.restore();
  const ph=Math.floor(t/2.2)%DEMO_SEQ.length,k=DEMO_SEQ[ph],prog=Math.min(1,(t%2.2)/.9);
  const sw=Math.sin(t*1.7)*8;
  const P=DEMO_HAND.map(([a,b])=>({x:a+sw,y:b+Math.cos(t*1.7)*4}));
  drawHand(x,P,GACT[k],.93,prog,(t%2.2-.9)*1000,now);
  x.save();x.fillStyle='rgba(255,181,71,.9)';x.fillRect(0,0,c.width,26);x.fillStyle='#021018';x.font='700 13px Inter,sans-serif';x.textAlign='center';x.fillText('ДЕМО-РАЗМЕТКА · это нарисованная рука, а не ваша камера · «✕ пример» — выйти',c.width/2,17);x.restore();
  $('#gfaces').textContent='лиц: 1';$('#ghands').textContent='рук: 1';$('#gfps').textContent='демо';
  $('#gbig').textContent=GACT[k].e;$('#gname').textContent=GACT[k].n+' · 0.93 (пример)';$('#gact').textContent=GACT[k].a;$('#ghold').style.width=prog*100+'%';
}

/* =====================================================================
   КОНСТРУКТОР — агент генерирует плитки
   ===================================================================== */
const SYS=`Ты — агент-верстальщик HUD «Джарвис».
Пользователь просит плитку/дашборд → верни ОДНО из двух:

A) JSON-спеку (предпочтительно):
   {"tiles":[{"w":"<виджет>","size":1|2|4,"tall":bool, ...поля}]}
   Виджеты: ${Object.keys(W).join(', ')}

B) Сырой HTML на Tailwind, если такого виджета нет:
   {"tiles":[{"html":"<div class=\\"jv-tile\\">…</div>","size":2}]}

ДИЗАЙН-ТОКЕНЫ (только они, никаких hex в классах):
  цвета:  jv-cyan jv-ice jv-gold jv-red jv-green jv-purple
          jv-text jv-mute jv-line jv-panel jv-bg
  шрифты: font-hud (заголовки/цифры), font-mono (метаданные)
КОМПОНЕНТЫ:
  .jv-tile   — карточка (корень каждой плитки)
  .jv-label  — заголовок плитки КАПСОМ
  .jv-value  — главная цифра
  .jv-sub    — подпись/метаданные
  .jv-btn    — кнопка;  .jv-badge — бейдж;  .jv-row — строка списка
СЕТКА: родитель grid-cols-1 sm:2 lg:4; size 2 = sm:col-span-2,
       size 4 = на всю ширину; tall = row-span-2
ДЕЙСТВИЯ: кнопка с data-act="cmd" data-cmd="<голосовая команда>"
ЗАПРЕЩЕНО: <script>, on*-атрибуты, внешние URL, position:fixed,
           style с размерами > 100vw. Тексты — по-русски, кратко.`;
$('#bsys').textContent=SYS;
$('#bkit').innerHTML=Object.keys(W).map(k=>`<span class="jv-badge border-jv-line text-jv-cyan">${k}</span>`).join('');
function genSpec(q){
  const s=q.toLowerCase(),t=[];
  const after=q.includes(':')?q.split(':').slice(1).join(':').trim():'';
  if(/доллар|евро|курс|валют/.test(s))t.push({w:'stat',label:'USD / RUB',value:'92.40 ₽',delta:'0.8% за день',up:false,spark:[91.2,91.8,92.9,93.1,92.7,93.2,92.4]});
  if(/биткоин|крипт/.test(s))t.push({w:'stat',label:'BTC',value:'$98 420',delta:'+3.1%',up:true,spark:[91,93,92,95,97,96,98]});
  if(/таймер|помодор/.test(s))t.push({w:'timer',label:'Таймер',min:+((s.match(/(\d+)\s*мин/)||[0,25])[1])});
  if(/список|покуп/.test(s))t.push({w:'tasks',label:'Покупки',items:(after||'молоко, хлеб, яйца').split(',').map(x=>[x.trim(),false])});
  if(/кольц|цель|шаг|прогресс/.test(s))t.push({w:'ring',label:'Шаги',value:64,text:'6 400 / 10 000',color:'#3dffa8'});
  if(/сцен|кнопк/.test(s))t.push({w:'actions',size:2,label:'Сцены',buttons:[['🎬','Кино','Выключи свет'],['🌙','Спать','Выключи свет'],['🏠','Я дома','Включи свет'],['☕','Кофе','Свари кофе']]});
  if(/камер|двер|звонок/.test(s))t.push({w:'doorbell',label:'Дверь',who:'никого · 14:02'});
  if(/пульс|сердц|здоров/.test(s))t.push({w:'heart',size:2,label:'Пульс',sub:'с Apple Watch через HealthKit'});
  if(/посылк|доставк|заказ/.test(s))t.push({w:'pkg',label:'Посылки',items:[{name:'Наушники',step:3,eta:'завтра'}]});
  if(/погод/.test(s))t.push({w:'weather',label:'Погода',icon:'⛅',temp:'+11°',desc:'облачно',fc:[['Чт','+12'],['Пт','+9'],['Сб','+8'],['Вс','+10'],['Пн','+13']]});
  if(/вод[ауы]/.test(s))t.push({w:'water',label:'Вода',goal:8,done:2});
  if(/сервер|сервис|мониторинг/.test(s))t.push({w:'services',label:'Сервисы',items:[['api','ok','40 мс'],['db','ok','12 мс'],['worker','warn','очередь 120']]});
  if(/стрим|twitch|obs/.test(s)){t.push({w:'stat',label:'Зрители',value:'1 284',delta:'+212 за 10 мин',up:true,spark:[800,900,950,1100,1050,1200,1284]});t.push({w:'list',label:'Донаты',items:[['ivan_dev','500 ₽'],['nastya','200 ₽'],['anon','100 ₽']]});t.push({w:'actions',size:2,label:'OBS-сцены',buttons:[['🎥','Камера','Стоп'],['🖥','Экран','Стоп'],['☕','Перерыв','Стоп'],['🔴','Стоп эфир','Стоп']]})}
  if(/мкс|космос|спутник/.test(s))t.push({size:2,html:RAW_DEFAULT});
  if(/заметк|напомн|запиш/.test(s)||!t.length)t.push({w:'note',size:2,label:'Заметка',text:after||q});
  return t;
}
const RAW_DEFAULT=`<div class="jv-tile">
  <div class="jv-label">🛰 МКС · орбита</div>
  <div class="flex items-end gap-3 mt-3">
    <div class="jv-value">27 600</div>
    <div class="jv-sub mb-1">км/ч · высота 418 км</div>
  </div>
  <div class="mt-4 h-2 rounded-full bg-jv-cyan/10 overflow-hidden">
    <div class="h-full w-2/3 bg-gradient-to-r from-jv-cyan to-jv-purple"></div>
  </div>
  <div class="flex justify-between mt-2">
    <span class="jv-sub">виток 67%</span>
    <span class="jv-badge border-jv-gold text-jv-gold">пролёт над Москвой через 42 мин</span>
  </div>
</div>`;
$('#braw').value=RAW_DEFAULT;
const sanitize=h=>h.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript:/gi,'');
let bView='json',lastSpec=null;
function showOut(){if(!lastSpec)return;$('#bout').textContent=bView==='json'?JSON.stringify({tiles:lastSpec},null,2):lastSpec.map(t=>tileHTML(t).replace(/ tile-in" style="animation-delay:\d+ms"/,'"')).join('\n\n').replace(/></g,'>\n<')}
$$('[data-bv]').forEach(b=>b.onclick=()=>{bView=b.dataset.bv;$$('[data-bv]').forEach(x=>{const on=x===b;x.classList.toggle('border-jv-cyan',on);x.classList.toggle('text-jv-cyan',on);x.classList.toggle('border-jv-line',!on);x.classList.toggle('text-jv-mute',!on)});showOut()});
function renderPrev(){$('#bprev').innerHTML=DASHES.agent.tiles.length?DASHES.agent.tiles.map(tileHTML).join(''):'<div class="jv-sub col-span-full grid place-items-center">пусто — попросите что-нибудь слева</div>';liveTick();renderDashTabs()}
let building=false;
async function build(q){
  q=q.trim();if(!q||building)return;building=true;$('#bq').value='';
  const steps=['🧠 разбираю запрос: «'+q+'»','📚 сверяюсь с UI-китом ('+Object.keys(W).length+' виджетов)','🧩 генерирую спеку…','✅ валидирую: токены jv-*, без <script>','🎨 рендерю в дашборд «🤖 Агент»'];
  $('#bsteps').innerHTML='';
  for(const s of steps){const d=document.createElement('div');d.textContent=s;d.className='tile-in';$('#bsteps').append(d);await sleep(280)}
  lastSpec=genSpec(q);showOut();
  DASHES.agent.tiles.push(...lastSpec);saveAgent();renderPrev();bus?.('ui.patch',{dashboard:'agent',added:lastSpec.map(t=>t.w||'html')});log('ui.patch +'+lastSpec.length+' tiles','ok');
  building=false;
}
$('#bgo').onclick=()=>build($('#bq').value);
$('#bq').onkeydown=e=>{if(e.key==='Enter')build($('#bq').value)};
['Добавь плитку курса доллара','Таймер на 15 минут','Список покупок: молоко, авокадо, кофе','Кольцо прогресса по шагам','Кнопки сцен для дома','Камера у двери','Мониторинг серверов','Сделай дашборд для стрима','Плитку про МКС','Заметка: позвонить маме в 19:00'].forEach(c=>{const b=document.createElement('button');b.className='chip';b.textContent=c;b.onclick=()=>build(c);$('#bchips').append(b)});
$('#bclear').onclick=()=>{DASHES.agent.tiles=[];saveAgent();renderPrev();$('#bout').textContent='— пока пусто —'};
$('#bopen').onclick=()=>{goTab('dash');showDash('agent')};
$('#brawgo').onclick=()=>{$('#brawprev').innerHTML=sanitize($('#braw').value)};
$('#brawadd').onclick=()=>{const h=sanitize($('#braw').value);lastSpec=[{size:2,html:h}];DASHES.agent.tiles.push(...lastSpec);saveAgent();renderPrev();showOut();toast('Плитка добавлена в дашборд «🤖 Агент»')};
$('#brawprev').innerHTML=RAW_DEFAULT;

/* ---------- хук на переключение вкладок ---------- */
const _onTab=window.onTab;
window.onTab=t=>{_onTab?.(t);if(t==='dash'){showDash(curDash);renderSurf()}if(t==='build')renderPrev()};
showDash(curDash);renderSurf();
