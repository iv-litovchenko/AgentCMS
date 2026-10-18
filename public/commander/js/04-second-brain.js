/* =====================================================================
   ВТОРОЙ МОЗГ — граф заметок (d3-force + canvas)
   ===================================================================== */
(()=>{
const AREAS={a_proj:['🛠 Проекты','#00d4ff'],a_ppl:['👥 Люди','#b48cff'],a_know:['📚 Знания','#3dffa8'],a_idea:['💡 Идеи','#ffb547'],a_log:['📓 Дневник','#ff7a8a'],a_src:['🎬 Источники','#7aa2ff']};
const TYPE={area:['◉','раздел'],project:['🛠','проект'],person:['👤','человек'],concept:['🧠','понятие'],idea:['💡','идея'],meeting:['🤝','встреча'],journal:['📓','дневник'],task:['✅','задача'],article:['📰','статья'],video:['🎬','видео'],book:['📕','книга'],podcast:['🎧','подкаст'],part:['◦','фрагмент']};
const PK={факт:'#3dffa8',цитата:'#b48cff',задача:'#ffb547',вопрос:'#ff7a8a',цифра:'#00d4ff',мысль:'#9fc3d4'};
const N=(id,type,area,title,date,tags,content,x={})=>({id,type,area,title,date,tags,content,...x});
const NOTES=[
 N('mj','project','a_proj','MyJarvis','2025-11-02',['голос','ии','python'],'Личный голосовой ассистент. Стек: [[whisper]] → [[claude]] → [[tts]]. Цель — ответ быстрее 1 секунды. Уши и рот в комнатах — [[pi5]]. Главная боль сейчас — [[latency]].',{src:'вручную',parts:[['факт','MVP работает с января 2026'],['цифра','задержка 1.4 с → цель 0.8 с'],['задача','добавить перебивание (barge-in)'],['вопрос','локальная LLM или облако?'],['цитата','«Хочу, чтобы он отвечал как человек, а не как автоответчик»']]}),
 N('expo','project','a_proj','Stark Expo 2026','2026-02-10',['мероприятие','презентация','жесты'],'Выставка в мае. Показываем [[mj]] и костюм [[suit]]. Ответственная — [[pepper]]. Нужна демо-зона с управлением жестами ([[gestures]]).',{src:'встреча',parts:[['цифра','бюджет +15% после обеда с Пеппер'],['задача','смета от Хэппи до 10 окт'],['факт','3 000 гостей, 2 сцены']]}),
 N('homelab','project','a_proj','Домашний сервер','2025-12-05',['железо','сеть','локально'],'Mac mini + NAS. Крутит [[ha]], [[ollama]] и бэкапы. Ночью падает бэкап — [[backup_bug]].',{src:'вручную'}),
 N('suit','project','a_proj','Костюм Mk-85','2025-11-20',['железо','голос'],'Наноботы, репульсоры. Тесты по средам. Голосовой интерфейс — тот же [[mj]].',{src:'вручную'}),
 N('pepper','person','a_ppl','Пеппер Поттс','2025-11-01',['работа','близкие'],'CEO Stark Industries. Ведёт [[expo]]. Любит пионы, аллергия на клубнику. Последняя встреча — [[m_lunch]].',{src:'авто',parts:[['факт','аллергия на клубнику'],['факт','любит пионы'],['задача','подарок на годовщину — 14 ноября']]}),
 N('happy','person','a_ppl','Хэппи Хоган','2025-11-01',['работа','логистика'],'Водитель и охрана. Отвечает за логистику [[expo]] и смету [[t_budget]].',{src:'авто'}),
 N('rhodey','person','a_ppl','Роуди','2025-11-03',['близкие','приватность'],'Друг, военный. Скептик насчёт ИИ — спорили в [[j_privacy]].',{src:'авто'}),
 N('bruce','person','a_ppl','Брюс Беннер','2026-01-15',['наука','локально','ии'],'Учёный. Советует локальные модели — [[ollama]]. Соавтор идеи [[i_dream]]. Созвон — [[m_bruce]].',{src:'авто'}),
 N('mom','person','a_ppl','Мама','2025-11-01',['близкие','голос'],'Звонить по воскресеньям. День рождения 12 марта. Хочет помощника попроще — [[i_grandma]].',{src:'голос'}),
 N('whisper','concept','a_know','Whisper (распознавание речи)','2025-11-04',['голос','stt','ии'],'Модель распознавания речи от OpenAI. faster-whisper быстрее в 4 раза. Русский понимает хорошо. Тесты на [[pi5]] — в [[v_pi]].',{src:'статья'}),
 N('claude','concept','a_know','Claude','2025-11-05',['llm','ии','агенты'],'LLM с вызовом инструментов ([[tooluse]]). Мозг [[mj]]. Персона задаётся промптом [[persona]].',{src:'вручную'}),
 N('tts','concept','a_know','Синтез речи','2025-11-08',['голос','tts'],'ElevenLabs — лучшее качество, Piper — локально и быстро. Стриминг по предложениям снижает [[latency]]. Мечта — [[i_voice]].',{src:'статья'}),
 N('latency','concept','a_know','Задержка ответа','2026-01-20',['голос','производительность'],'Бюджет: VAD 150 + STT 200 + LLM 350 + TTS 200 мс. Главные рычаги — стриминг и [[vad]]. Источник — [[a_latency]].',{src:'статья',parts:[['цифра','> 800 мс воспринимается как «тупит»'],['факт','стриминг TTS экономит 400–700 мс'],['мысль','filler-фразы маскируют долгие tool calls'],['вопрос','сколько даст локальный Whisper на GPU?']]}),
 N('vad','concept','a_know','VAD и конец фразы','2026-01-22',['голос','производительность'],'Silero VAD отделяет речь от тишины. Turn-detection модель понимает конец фразы по смыслу и экономит 300–600 мс ([[latency]]).',{src:'статья'}),
 N('tooluse','concept','a_know','Tool use','2025-11-10',['llm','агенты'],'Модель возвращает вызов функции, код его выполняет и отдаёт результат. Основа для [[ha]] и [[mcp]].',{src:'подкаст'}),
 N('mcp','concept','a_know','MCP','2026-03-02',['агенты','llm'],'Model Context Protocol — готовые серверы инструментов. Подключил Notion и GitHub к [[mj]]. Подробно в [[p_agents]].',{src:'подкаст'}),
 N('rag','concept','a_know','RAG и эмбеддинги','2026-02-18',['llm','память','ии'],'Поиск по смыслу: заметки → чанки по 512 токенов → векторы → top-k. Так устроен этот второй мозг. Развитие — [[i_dream]].',{src:'вручную'}),
 N('ha','concept','a_know','Home Assistant','2025-12-01',['дом','железо','локально'],'Хаб умного дома: 46 устройств, REST API для [[tooluse]]. Живёт на [[homelab]].',{src:'вручную'}),
 N('ollama','concept','a_know','Ollama','2026-01-16',['llm','локально'],'Локальные модели на [[homelab]]. Qwen 14B справляется с простыми командами, сложное — в [[claude]]. См. [[a_local]].',{src:'встреча'}),
 N('pi5','concept','a_know','Raspberry Pi 5','2025-12-12',['железо','голос'],'Уши и рот Джарвиса в комнатах. Whisper tiny работает, LLM — нет. Обзор — [[v_pi]].',{src:'видео'}),
 N('gestures','concept','a_know','Жесты MediaPipe','2026-04-05',['зрение','интерфейс','жесты'],'21 точка руки, 7 жестов из коробки. Для [[expo]] — управление голограммой. Туториал — [[v_mediapipe]].',{src:'видео'}),
 N('deepwork','concept','a_know','Глубокая работа','2026-04-22',['продуктивность'],'Блоки по 90 минут без уведомлений. Из книги [[b_deepwork]]. Джарвис включает режим фокуса.',{src:'книга'}),
 N('sleep','concept','a_know','Сон','2026-04-21',['здоровье','продуктивность','память'],'Меньше 6 часов — продуктивность −30% на следующий день (мои данные за 3 месяца). Экран выключается в 23:30. Во сне мозг консолидирует память.',{src:'авто',parts:[['цифра','−30% продуктивности после < 6 ч сна'],['факт','правило: экран выкл. в 23:30'],['мысль','во сне мозг «перекладывает» память — можно так же с заметками']]}),
 N('persona','concept','a_know','Промпт: персона Джарвиса','2025-11-06',['llm','голос'],'Британский дворецкий, сухая ирония, кратко, обращение «сэр». Используется в [[claude]].',{src:'вручную'}),
 N('i_dream','idea','a_idea','Джарвис, который видит сны','2026-08-14',['ии','память','идея'],'Ночью агент пересматривает дневные заметки, находит связи и утром предлагает инсайты — как консолидация памяти во время сна ([[sleep]]). Техника — [[rag]]. Придумали с [[bruce]].',{src:'встреча',status:'в работе'}),
 N('i_grandma','idea','a_idea','Джарвис для мамы','2026-03-12',['голос','идея','близкие'],'Одна кнопка, большие буквы, напоминания о таблетках, звонок семье голосом. На базе [[pi5]]. Для [[mom]].',{src:'голос',status:'идея'}),
 N('i_glasses','idea','a_idea','HUD в AR-очках','2026-05-30',['интерфейс','идея','зрение'],'Подсказки в поле зрения на встречах: имя собеседника и о чём говорили в прошлый раз ([[pepper]]).',{src:'голос',status:'пауза'}),
 N('i_coffee','idea','a_idea','Кофе по пульсу','2026-02-02',['дом','здоровье','идея'],'Если утром пульс низкий — двойной эспрессо. Забросил: [[ha]] не видит кофемашину.',{src:'голос',status:'заброшено'}),
 N('i_voice','idea','a_idea','Голос из фильма','2026-06-11',['голос','tts','идея'],'Клонировать голос для [[tts]]. Юридически — только для личного использования.',{src:'голос',status:'в работе'}),
 N('m_lunch','meeting','a_log','Обед с Пеппер · 3 окт','2026-10-03',['встреча','мероприятие'],'Обсудили [[expo]]: бюджет +15%, демо-зона жестов. Она против камер в зале без табличек. Задача — [[t_budget]].',{src:'встреча',parts:[['задача','согласовать бюджет до 10 окт'],['цитата','«Никаких камер без табличек, Тони»'],['факт','демо-зона жестов одобрена']]}),
 N('m_bruce','meeting','a_log','Созвон с Брюсом · 14 авг','2026-08-14',['встреча','локально','ии'],'Брюс считает, что локальные модели догонят облако за год. Предложил [[i_dream]] и скинул [[a_local]].',{src:'встреча'}),
 N('j_privacy','journal','a_log','Спор о приватности · 2 июн','2026-06-02',['приватность','ии'],'Роуди: ассистент, который всё слышит, — это жучок. Решение: wake word и всё локально, кроме LLM ([[ollama]]). Говорили с [[rhodey]].',{src:'голос',parts:[['цитата','«Ассистент, который всё слышит — это жучок»'],['факт','решение: локальный wake word'],['вопрос','нужен ли офлайн-режим целиком?']]}),
 N('j_burnout','journal','a_log','Выгорание · 20 апр','2026-04-20',['здоровье','продуктивность'],'Три недели по 4–5 часов сна. Ввёл правило 23:30 ([[sleep]]) и блоки [[deepwork]].',{src:'голос'}),
 N('backup_bug','task','a_log','Баг: бэкап NAS','2026-09-12',['железо','баг'],'Падает по ночам с timeout. Гипотеза — засыпает диск. Не решено три недели. Часть [[homelab]].',{src:'авто',status:'не решено'}),
 N('t_budget','task','a_log','Согласовать бюджет Expo','2026-10-03',['мероприятие','задача'],'Срок — 10 октября. Нужна смета от [[happy]] для [[expo]].',{src:'встреча',status:'открыта'}),
 N('a_latency','article','a_src','Статья: голосовой агент < 500 мс','2026-01-19',['голос','производительность'],'Пауза больше 800 мс ощущается как «тупит». Помогают turn detection, стриминг TTS и filler-фразы. Выводы — в [[latency]] и [[vad]].',{src:'статья'}),
 N('a_local','article','a_src','Статья: локальные LLM в 2026','2026-08-15',['llm','локально'],'Qwen и Llama на M-чипах дают 30–60 токенов/с для 14B. Применение — [[ollama]].',{src:'статья'}),
 N('v_pi','video','a_src','Видео: JARVIS на Raspberry Pi','2025-12-11',['железо','голос'],'Задержка 1.4 с, главная проблема — эхо от собственной колонки. См. [[pi5]], [[whisper]].',{src:'видео'}),
 N('v_mediapipe','video','a_src','Видео: жесты за 15 минут','2026-04-04',['зрение','жесты'],'Туториал по MediaPipe: распознавание руки в браузере. Применил в [[gestures]].',{src:'видео'}),
 N('b_deepwork','book','a_src','Книга: «В работу с головой»','2026-04-18',['продуктивность'],'Кэл Ньюпорт. Глубокая работа — редкий и ценный навык. Конспект — [[deepwork]].',{src:'книга'}),
 N('p_agents','podcast','a_src','Подкаст: как устроены агенты','2026-03-01',['агенты','ии','llm'],'Агент = LLM + инструменты + память + цикл. См. [[tooluse]], [[mcp]].',{src:'подкаст'}),
];
const day=d=>Math.floor(Date.parse(d)/864e5);
const ALL=[],byId={},LINKS=[];
Object.entries(AREAS).forEach(([id,[t]])=>{const n={id,type:'area',area:id,title:t,tags:[],content:'',d:0};ALL.push(n);byId[id]=n});
NOTES.forEach(n=>{n.d=day(n.date);n.links=[...n.content.matchAll(/\[\[(\w+)\]\]/g)].map(m=>m[1]);
  n.parts=(n.parts||n.content.replace(/\[\[(\w+)\]\]/g,(m,i)=>NOTES.find(z=>z.id===i)?.title||i).split(/(?<=[.!?])\s+/).filter(s=>s.length>8).map(s=>['мысль',s]));
  ALL.push(n);byId[n.id]=n});
const D0=Math.min(...NOTES.map(n=>n.d)),D1=Math.max(...NOTES.map(n=>n.d));
Object.keys(AREAS).forEach(a=>byId[a].d=D0);
NOTES.forEach(n=>{LINKS.push({s:n.area,t:n.id,k:'area'});n.links.forEach(t=>{if(byId[t]&&!LINKS.some(l=>l.k==='ref'&&((l.s===n.id&&l.t===t)||(l.s===t&&l.t===n.id))))LINKS.push({s:n.id,t,k:'ref'})})});
const jac=(a,b)=>{const A=new Set(a.tags),i=b.tags.filter(x=>A.has(x)).length;return i/(new Set([...a.tags,...b.tags]).size||1)};
const linked=(a,b)=>LINKS.some(l=>l.k==='ref'&&((l.s===a&&l.t===b)||(l.s===b&&l.t===a)));
const SEM=[];
for(let i=0;i<NOTES.length;i++)for(let j=i+1;j<NOTES.length;j++){const a=NOTES[i],b=NOTES[j];const ov=a.tags.filter(x=>b.tags.includes(x)).length;if(ov>=2&&!linked(a.id,b.id))SEM.push({s:a.id,t:b.id,k:'sem',score:jac(a,b)})}
// части (появляются при «разборе»)
NOTES.forEach(n=>n.parts.forEach((p,i)=>{const id=n.id+'#'+i;const pn={id,type:'part',area:n.area,parent:n.id,kind:p[0],title:p[1],tags:[],content:p[1],d:n.d};ALL.push(pn);byId[id]=pn;LINKS.push({s:n.id,t:id,k:'part'})}));

const hexA=(h,a)=>{const n=parseInt(h.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
const col=n=>n.type==='part'?PK[n.kind]||'#9fc3d4':AREAS[n.area][1];

/* ---------- состояние ---------- */
let cv,ctx,mini,mctx,W=0,H=0,dpr=1,zoomB,tr=d3.zoomIdentity,sim,inited=false;
let vis=[],visL=[],nbr=new Map(),sel=null,hover=null,hiSet=null,hiPath=[],pulses=[];
const exploded=new Set(),collapsed=new Set(),areaOff=new Set();
let timeCut=D1,semOn=false,semShown=0,mode='map',labelsAll=false;
const deg=id=>(nbr.get(id)||new Set()).size;
const rad=n=>n.type==='area'?18:n.type==='part'?3.6:5+Math.sqrt(deg(n.id))*1.7;

function isVis(n){
  if(n.d>timeCut)return false;if(areaOff.has(n.area))return false;
  if(n.type==='part')return exploded.has(n.parent)&&isVis(byId[n.parent]);
  if(n.type!=='area'&&collapsed.has(n.area))return false;return true;
}
function restart(heat=.5){
  vis=ALL.filter(isVis);const vs=new Set(vis.map(n=>n.id));
  const pool=[...LINKS,...(semOn?SEM.slice(0,semShown):[])];
  visL=pool.filter(l=>vs.has(l.s)&&vs.has(l.t)).map(l=>({source:byId[l.s],target:byId[l.t],k:l.k,score:l.score}));
  nbr=new Map();visL.forEach(l=>{if(l.k==='area')return;[[l.source.id,l.target.id],[l.target.id,l.source.id]].forEach(([a,b])=>{if(!nbr.has(a))nbr.set(a,new Set());nbr.get(a).add(b)})});
  vis.forEach(n=>{if(n.x==null){const p=n.parent?byId[n.parent]:byId[n.area];if(n.parent){const i=+n.id.split('#')[1],m=p.parts.length,a=i/m*Math.PI*2;n.x=p.x+Math.cos(a)*50;n.y=p.y+Math.sin(a)*50}else{n.x=(p?.x??0)+(Math.random()-.5)*40;n.y=(p?.y??0)+(Math.random()-.5)*40}}});
  sim.nodes(vis);
  sim.force('link').links(visL);
  sim.alpha(Math.max(sim.alpha(),heat)).restart();
  if(sel&&!vs.has(sel.id))closeInsp();
  $('#bstats').textContent=`${vis.filter(n=>n.type!=='area'&&n.type!=='part').length} заметок · ${visL.filter(l=>l.k==='ref').length} ссылок · ${visL.filter(l=>l.k==='sem').length} по смыслу${exploded.size?` · ${vis.filter(n=>n.type==='part').length} фрагм.`:''}`;
}
const AKEYS=Object.keys(AREAS);
function areaCenter(a){const i=AKEYS.indexOf(a),ang=i/AKEYS.length*Math.PI*2-Math.PI/2;return[Math.cos(ang)*420,Math.sin(ang)*300]}
function setForces(){
  const sem=mode==='map';
  sim.force('x',d3.forceX(n=>sem?areaCenter(n.area)[0]:0).strength(n=>sem?(n.type==='part'?0:.28):.025))
     .force('y',d3.forceY(n=>sem?areaCenter(n.area)[1]:0).strength(n=>sem?(n.type==='part'?0:.28):.025));
  sim.force('link')?.strength(sim.force('link').strength());sim.alpha(.8).restart();
}

/* ---------- инициализация ---------- */
function init(){
  if(inited)return;inited=true;
  cv=$('#bcan');ctx=cv.getContext('2d');mini=$('#bmini');mctx=mini.getContext('2d');
  sim=d3.forceSimulation().alphaDecay(.02).velocityDecay(.35)
    .force('link',d3.forceLink().id(d=>d.id).distance(l=>l.k==='part'?52:l.k==='area'?70:l.k==='sem'?130:80).strength(l=>l.k==='part'?.9:l.k==='sem'?.03:l.k==='area'?.3:(mode==='map'?.1:.5)))
    .force('charge',d3.forceManyBody().strength(n=>n.type==='part'?-90:n.type==='area'?-260:-150).distanceMax(600))
    .force('collide',d3.forceCollide(n=>rad(n)+4));
  setForces();
  const ro=new ResizeObserver(resize);ro.observe($('#bwrap'));resize();
  zoomB=d3.zoom().scaleExtent([.12,9]).on('zoom',e=>{tr=e.transform});
  const drag=d3.drag().subject(e=>hit(e.sourceEvent)).on('start',e=>{if(!e.active)sim.alphaTarget(.25).restart();e.subject.fx=e.subject.x;e.subject.fy=e.subject.y;cv.style.cursor='grabbing'})
    .on('drag',e=>{const [x,y]=tr.invert(d3.pointer(e.sourceEvent,cv));e.subject.fx=x;e.subject.fy=y})
    .on('end',e=>{if(!e.active)sim.alphaTarget(0);e.subject.fx=null;e.subject.fy=null;cv.style.cursor='grab'});
  d3.select(cv).call(drag).call(zoomB).on('dblclick.zoom',null);
  d3.select(cv).call(zoomB.transform,d3.zoomIdentity.translate(W/2,H/2).scale(.55));
  cv.addEventListener('mousemove',e=>{hover=hit(e);cv.style.cursor=hover?'pointer':'grab';const tip=$('#btip');if(hover){const r=cv.getBoundingClientRect();tip.innerHTML=`${hover.type==='part'?`<span style="color:${col(hover)}">${hover.kind}</span>`:TYPE[hover.type][0]} ${esc(hover.title)}${hover.type==='area'&&collapsed.has(hover.id)?' <span class="text-jv-gold">(свёрнут)</span>':''}`;tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top+14)+'px';tip.classList.remove('hidden')}else tip.classList.add('hidden')});
  cv.addEventListener('mouseleave',()=>{hover=null;$('#btip').classList.add('hidden')});
  cv.addEventListener('click',e=>{const n=hit(e);if(n)select(n,true);else{closeInsp();hiSet=null;hiPath=[]}});
  cv.addEventListener('dblclick',e=>{const n=hit(e);if(!n)return;if(n.type==='area'){toggleCollapse(n)}else if(n.type!=='part'){toggleExplode(n)}});
  mini.addEventListener('click',e=>{if(!mini._b)return;const r=mini.getBoundingClientRect(),b=mini._b;const wx=b.x0+(e.clientX-r.left-b.ox)/b.s,wy=b.y0+(e.clientY-r.top-b.oy)/b.s;d3.select(cv).transition().duration(600).call(zoomB.translateTo,wx,wy)});
  buildUI();restart(1);sim.tick(260);sim.alpha(.3);
  fit(0);
  requestAnimationFrame(loop);
}
function resize(){const r=$('#bwrap').getBoundingClientRect();W=r.width;H=r.height;dpr=devicePixelRatio||1;cv.width=W*dpr;cv.height=H*dpr}
function hit(e){const r=cv.getBoundingClientRect();const [x,y]=tr.invert([e.clientX-r.left,e.clientY-r.top]);let best=null,bd=1e9;for(const n of vis){const d=Math.hypot(n.x-x,n.y-y);if(d<rad(n)+6/tr.k&&d<bd){bd=d;best=n}}return best}
function fit(dur=900,nodes=vis){
  if(!dur){const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);const k=Math.min(4,.85*Math.min(W/(x1-x0+80),(H-80)/(y1-y0+80)));d3.select(cv).call(zoomB.transform,d3.zoomIdentity.translate(W/2,H/2).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2));return}
  if(!nodes.length)return;const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const insp=!$('#binsp').classList.contains('translate-x-full')&&W>640?380:0;
  const k=Math.min(4,.85*Math.min((W-insp)/(x1-x0+80),(H-80)/(y1-y0+80)));
  d3.select(cv).transition().duration(dur).call(zoomB.transform,d3.zoomIdentity.translate((W-insp)/2,H/2).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2));
}
function flyTo(n,k=Math.max(tr.k,2.2)){const insp=W>640?380:0;d3.select(cv).transition().duration(750).call(zoomB.transform,d3.zoomIdentity.translate((W-insp)/2,H/2).scale(k).translate(-n.x,-n.y))}

/* ---------- действия ---------- */
function toggleExplode(n){
  if(exploded.has(n.id)){exploded.delete(n.id);n.parts.forEach((p,i)=>{const q=byId[n.id+'#'+i];q.x=q.y=null});toast(`🔽 «${n.title}» собрана обратно`)}else{exploded.add(n.id);toast(`💥 «${n.title}» разобрана на ${n.parts.length} фрагм.`);n.fx=n.x;n.fy=n.y;setTimeout(()=>{n.fx=null;n.fy=null},1200)}
  restart(.6);if(sel===n)renderInsp(n);bus?.('brain.explode',{id:n.id,open:exploded.has(n.id)});
}
function toggleCollapse(a){if(collapsed.has(a.id))collapsed.delete(a.id);else collapsed.add(a.id);restart(.5);toast(`${collapsed.has(a.id)?'📦 Свернул':'📂 Развернул'} раздел ${a.title}`)}
function select(n,fly){sel=n;hiSet=null;hiPath=[];renderInsp(n);$('#binsp').classList.remove('translate-x-full');if(fly)flyTo(n,n.type==='area'?1.3:n.type==='part'?3.5:2.4);bus?.('brain.open',{id:n.id})}
function closeInsp(){sel=null;$('#binsp').classList.add('translate-x-full')}

/* ---------- инспектор ---------- */
const md=s=>esc(s).replace(/\[\[(\w+)\]\]/g,(m,id)=>byId[id]?`<a data-go="${id}" class="cursor-pointer no-underline px-1.5 py-px rounded border border-solid" style="color:${col(byId[id])};border-color:${hexA(col(byId[id]),.4)};background:${hexA(col(byId[id]),.08)}">${esc(byId[id].title)}</a>`:m);
const chip=(n,extra='')=>`<a data-go="${n.id}" class="flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-jv-cyan/10 no-underline text-jv-text text-[12.5px]"><span class="w-2 h-2 rounded-full shrink-0" style="background:${col(n)};box-shadow:0 0 6px ${col(n)}"></span><span class="flex-1 truncate">${TYPE[n.type][0]} ${esc(n.title)}</span>${extra}</a>`;
const STC={'в работе':'border-jv-cyan text-jv-cyan','заброшено':'border-jv-red text-jv-red','пауза':'border-jv-gold text-jv-gold','идея':'border-jv-line text-jv-mute','не решено':'border-jv-red text-jv-red','открыта':'border-jv-gold text-jv-gold'};
function renderInsp(n){
  const c=col(n),el=$('#binspc');
  const sec=(t,b)=>b?`<div class="mt-5"><div class="jv-label mb-2">${t}</div>${b}</div>`:'';
  if(n.type==='area'){
    const kids=NOTES.filter(x=>x.area===n.id).sort((a,b)=>b.d-a.d);
    el.innerHTML=`${head(n,c)}<div class="text-[13px] text-jv-mute mt-2">${kids.length} заметок в разделе. Двойной клик по узлу сворачивает раздел в одну точку.</div>
      <div class="flex gap-2 mt-3"><button class="jv-btn" data-bact="collapse">${collapsed.has(n.id)?'📂 РАЗВЕРНУТЬ':'📦 СВЕРНУТЬ'}</button><button class="jv-btn" data-bact="fitarea">⤢ ПОКАЗАТЬ ВЕСЬ</button></div>
      ${sec('Последние',kids.map(k=>chip(k,`<span class="jv-sub">${k.date.slice(5)}</span>`)).join(''))}`;
  }else if(n.type==='part'){
    const p=byId[n.parent];
    el.innerHTML=`${head(n,c)}<div class="mt-3 text-[15px] leading-relaxed border-0 border-l-[3px] border-solid pl-3" style="border-color:${c}">${esc(n.title)}</div>
      ${sec('Из заметки',chip(p))}${sec('Ещё фрагменты',p.parts.map((x,i)=>p.id+'#'+i).filter(id=>id!==n.id).map(id=>chip(byId[id],`<span class="jv-badge !text-[9px]" style="color:${PK[byId[id].kind]};border-color:${PK[byId[id].kind]}">${byId[id].kind}</span>`)).join(''))}`;
  }else{
    const back=NOTES.filter(x=>x.links.includes(n.id));
    const out=n.links.map(i=>byId[i]).filter(Boolean);
    const simi=NOTES.filter(x=>x!==n&&!n.links.includes(x.id)&&!x.links.includes(n.id)).map(x=>[x,jac(n,x)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
    el.innerHTML=`${head(n,c)}
      <div class="mt-4 text-[14px] leading-[1.75]">${md(n.content)}</div>
      <div class="flex flex-wrap gap-1 mt-3">${n.tags.map(t=>`<span class="jv-badge border-jv-line text-jv-mute">#${t}</span>`).join('')}</div>
      <div class="flex flex-wrap gap-2 mt-4">
        <button class="jv-btn" data-bact="explode">${exploded.has(n.id)?'🔽 СОБРАТЬ':'💥 РАЗОБРАТЬ НА ЧАСТИ'}</button>
        <button class="jv-btn !border-jv-purple !text-jv-purple !bg-jv-purple/10" data-bact="hops">✨ СВЯЗИ 2-ГО УРОВНЯ</button>
        <button class="jv-btn !border-jv-line !text-jv-mute !bg-transparent" data-bact="read">🔊</button>
      </div>
      ${sec(`Внутри · ${n.parts.length} фрагментов`,n.parts.map((p,i)=>`<a data-go="${n.id}#${i}" data-needx="${n.id}" class="flex gap-2 items-start py-1.5 px-2 rounded-md cursor-pointer hover:bg-jv-cyan/10 no-underline text-jv-text text-[12.5px]"><span class="jv-badge !text-[9px] shrink-0" style="color:${PK[p[0]]};border-color:${PK[p[0]]}">${p[0]}</span><span>${esc(p[1])}</span></a>`).join(''))}
      ${sec(`Ссылается на · ${out.length}`,out.map(x=>chip(x)).join(''))}
      ${sec(`Обратные ссылки · ${back.length}`,back.map(x=>chip(x)).join('')||'<div class="jv-sub">никто не ссылается — «сиротская» заметка</div>')}
      ${sec('Похоже по смыслу (эмбеддинги)',simi.map(([x,s])=>chip(x,`<span class="font-mono text-[10px] text-jv-purple">${s.toFixed(2)}</span>`)).join('')||'<div class="jv-sub">—</div>')}
      <div class="jv-sub mt-6">📁 brain/${AREAS[n.area][0].split(' ')[1].toLowerCase()}/${n.id}.md · источник: ${n.src} · связей: ${deg(n.id)}</div>`;
  }
  el.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>{if(a.dataset.needx&&!exploded.has(a.dataset.needx))toggleExplode(byId[a.dataset.needx]);const t=byId[a.dataset.go];setTimeout(()=>{if(!isVis(t)){areaOff.delete(t.area);collapsed.delete(t.area);timeCut=D1;$('#btime').value=D1;restart();buildAreas()}select(t,true)},a.dataset.needx?120:0)});
  el.querySelectorAll('[data-bact]').forEach(b=>b.onclick=()=>{const a=b.dataset.bact;
    if(a==='explode')toggleExplode(n);
    if(a==='collapse'){toggleCollapse(n);renderInsp(n)}
    if(a==='fitarea')fit(800,vis.filter(x=>x.area===n.id));
    if(a==='read'){speak(n.title+'. '+n.content.replace(/\[\[(\w+)\]\]/g,(m,i)=>byId[i]?.title||''))}
    if(a==='hops'){const s=new Set([n.id]);(nbr.get(n.id)||[]).forEach(x=>{s.add(x);(nbr.get(x)||[]).forEach(y=>s.add(y))});sel=null;hiSet=s;hiPath=[];toast(`✨ ${s.size-1} заметок в двух шагах от «${n.title}»`);fit(800,vis.filter(x=>s.has(x.id)))}
  });
}
function head(n,c){
  const st=n.status?`<span class="jv-badge ${STC[n.status]||'border-jv-line text-jv-mute'}">${n.status}</span>`:'';
  return `<div class="flex items-center gap-2"><button class="ml-auto order-last bg-transparent border-0 text-jv-mute text-xl cursor-pointer" onclick="document.getElementById('binsp').classList.add('translate-x-full')">×</button>
    <span class="jv-badge" style="color:${c};border-color:${c}">${n.type==='part'?n.kind:TYPE[n.type][1]}</span>${n.type!=='area'?`<span class="jv-badge border-jv-line text-jv-mute">${AREAS[n.area][0]}</span>`:''}${st}</div>
    <div class="flex items-start gap-3 mt-3"><div class="w-11 h-11 rounded-xl grid place-items-center text-xl shrink-0" style="background:${hexA(c,.12)};border:1px solid ${hexA(c,.5)};box-shadow:0 0 18px ${hexA(c,.35)}">${n.type==='part'?'◦':TYPE[n.type][0]}</div>
    <div><div class="text-[18px] font-semibold text-white leading-tight">${esc(n.title)}</div>${n.date?`<div class="jv-sub mt-1">${new Date(n.date).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</div>`:''}</div></div>`;
}

/* ---------- верхняя панель, таймлайн, поиск ---------- */
function buildAreas(){
  $('#bareas').innerHTML=Object.entries(AREAS).map(([id,[t,c]])=>`<button data-a="${id}" class="jv-badge cursor-pointer bg-black/60" style="color:${areaOff.has(id)?'#3d5566':c};border-color:${areaOff.has(id)?'rgba(0,212,255,.15)':hexA(c,.6)}">${t}</button>`).join('');
  $$('#bareas [data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;areaOff.has(a)?areaOff.delete(a):areaOff.add(a);buildAreas();restart(.4)});
}
function buildUI(){
  buildAreas();
  const t=$('#btime');t.min=D0;t.max=D1;t.value=D1;const lab=()=>$('#btimel').textContent=new Date(timeCut*864e5).toLocaleDateString('ru-RU',{day:'2-digit',month:'short',year:'2-digit'});lab();
  t.oninput=()=>{timeCut=+t.value;lab();restart(.3)};
  let pl=null;$('#bplay').onclick=()=>{if(pl){clearInterval(pl);pl=null;$('#bplay').textContent='▶ РОСТ';return}timeCut=D0;$('#bplay').textContent='⏸';closeInsp();
    pl=setInterval(()=>{const before=vis.length;timeCut=Math.min(D1,timeCut+4);t.value=timeCut;lab();restart(.25);if(vis.length!==before)fit(300);if(timeCut>=D1){clearInterval(pl);pl=null;$('#bplay').textContent='▶ РОСТ';fit()}},70)};
  $('#bmode').onclick=()=>{mode=mode==='links'?'map':'links';$('#bmode').textContent=mode==='map'?'◎ режим: карта смыслов':'◎ режим: связи';setForces();setTimeout(()=>fit(),1400)};
  $('#bsem').onclick=()=>{if(semOn){semOn=false;semShown=0;restart(.3);$('#bsem').textContent='✨ найти связи по смыслу';return}
    semOn=true;semShown=0;$('#bsem').textContent='✨ скрыть связи по смыслу';const iv=setInterval(()=>{semShown++;restart(.15);const l=SEM[semShown-1];if(l){pulses.push({a:byId[l.s],b:byId[l.t],t0:performance.now(),dur:900,c:'#b48cff'})}if(semShown>=SEM.length){clearInterval(iv);toast(`✨ Найдено ${SEM.length} неочевидных связей по смыслу`)}},90)};
  $('#blabels').onclick=()=>{labelsAll=!labelsAll;$('#blabels').classList.toggle('!text-jv-cyan',labelsAll)};
  $('#bfit').onclick=()=>{hiSet=null;hiPath=[];closeInsp();fit()};
  $('#bsearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();if(!q){hiSet=null;return}sel=null;hiSet=new Set(vis.filter(n=>(n.title+' '+n.content+' '+n.tags.join(' ')).toLowerCase().includes(q)).map(n=>n.id))};
  $('#bsearch').onkeydown=e=>{if(e.key==='Enter'&&hiSet?.size){const f=vis.filter(n=>hiSet.has(n.id));f.length===1?select(f[0],true):fit(700,f)}};
  ASK.forEach(a=>{const b=document.createElement('button');b.className='chip';b.textContent=a.q;b.onclick=()=>ask(a.q);$('#baskchips').append(b)});
  $('#baskgo').onclick=()=>ask($('#bask').value);$('#bask').onkeydown=e=>{if(e.key==='Enter')ask($('#bask').value)};
}

/* ---------- «спроси мозг»: поиск + проход по связям ---------- */
const ASK=[
 {q:'Как мне уменьшить задержку Джарвиса?',re:/задерж|быстр|латент/i,hits:['mj','latency','vad','tts','a_latency'],a:'По твоим заметкам главный рычаг — стриминг на каждом этапе ([[latency]]) и определение конца фразы по смыслу вместо таймаута тишины ([[vad]]): это −300…600 мс. Синтез речи запускать по первому предложению ([[tts]]). Всё это из статьи [[a_latency]]. Сейчас у [[mj]] 1.4 с.'},
 {q:'Кто связан со Stark Expo?',re:/expo|экспо|выставк/i,hits:['expo','pepper','m_lunch','t_budget','happy','gestures'],a:'Ведёт [[pepper]] — на [[m_lunch]] согласовали +15% бюджета. Смету должен прислать [[happy]] (задача [[t_budget]], срок 10 окт). Для демо-зоны нужны [[gestures]].'},
 {q:'Какие идеи я забросил?',re:/забр|идеи|брошен/i,hits:['i_coffee','ha','i_glasses','backup_bug','homelab'],a:'Заброшена [[i_coffee]] — упёрлась в то, что [[ha]] не видит кофемашину. На паузе [[i_glasses]]. И висит нерешённый [[backup_bug]] уже три недели — он тормозит весь [[homelab]].'},
 {q:'Что общего у сна и ИИ?',re:/сон|сна|сны/i,hits:['sleep','i_dream','rag','bruce','m_bruce'],a:'Неочевидная связь через идею [[i_dream]]: как мозг во время сна ([[sleep]]) консолидирует память, агент ночью перебирает заметки и ищет связи. Техника — [[rag]]. Идею предложил [[bruce]] на [[m_bruce]].'},
 {q:'Что я знаю о приватности?',re:/приват|слежк|жучок/i,hits:['j_privacy','rhodey','ollama','homelab','m_lunch'],a:'Главный разговор — [[j_privacy]] с [[rhodey]]: решили держать wake word и всё, кроме LLM, локально на [[ollama]]. Ещё [[pepper]] на [[m_lunch]] против камер на Expo без табличек.'},
];
function bfs(a,b){const prev=new Map([[a,null]]),q=[a];while(q.length){const x=q.shift();if(x===b)break;for(const y of nbr.get(x)||[]){if(!prev.has(y)){prev.set(y,x);q.push(y)}}}if(!prev.has(b))return[];const p=[];for(let x=b;x!=null;x=prev.get(x))p.unshift(x);return p}
function ask(q){
  q=(q||'').trim();if(!q)return;$('#bask').value=q;
  areaOff.clear();collapsed.clear();timeCut=D1;$('#btime').value=D1;buildAreas();restart(.3);
  let a=ASK.find(x=>x.q===q||x.re.test(q));
  if(!a){const words=q.toLowerCase().split(/\s+/).filter(w=>w.length>3).map(w=>w.slice(0,5));const sc=NOTES.map(n=>[n,words.filter(w=>(n.title+' '+n.content+' '+n.tags.join(' ')).toLowerCase().includes(w)).length]).filter(x=>x[1]).sort((x,y)=>y[1]-x[1]).slice(0,4);
    a={hits:sc.map(x=>x[0].id),a:sc.length?'Нашёл в мозге: '+sc.map(x=>`[[${x[0].id}]] — ${x[0].content.split(/(?<=\.)\s/)[0].replace(/\[\[\w+\]\]/g,'…')}`).join(' '):'В мозге про это пока ничего нет. Скажите «Джарвис, запомни…» — и появится новая заметка.'}}
  hiPath=[];for(let i=0;i<a.hits.length-1;i++){const p=bfs(a.hits[i],a.hits[i+1]);for(let j=0;j<p.length-1;j++)hiPath.push([p[j],p[j+1]])}
  hiSet=new Set([...a.hits,...hiPath.flat()]);sel=null;
  setTimeout(()=>fit(800,vis.filter(n=>hiSet.has(n.id))),50);
  const el=$('#binspc');
  el.innerHTML=`<div class="flex items-center gap-2"><span class="jv-badge border-jv-gold text-jv-gold">ответ мозга · RAG</span><button class="ml-auto bg-transparent border-0 text-jv-mute text-xl cursor-pointer" onclick="document.getElementById('binsp').classList.add('translate-x-full')">×</button></div>
   <div class="text-[16px] font-semibold text-white mt-3">${esc(q)}</div>
   <div class="font-mono text-[11px] text-jv-mute mt-3 space-y-0.5"><div>1. эмбеддинг вопроса → top-${a.hits.length} заметок</div><div>2. проход по связям: ${hiPath.length} рёбер</div><div>3. LLM собирает ответ со ссылками</div></div>
   <div class="mt-4 text-[14px] leading-[1.8] border-0 border-l-[3px] border-solid border-jv-gold pl-3">${md(a.a)}</div>
   <div class="jv-label mt-5 mb-2">Использованные заметки</div>${a.hits.map(id=>chip(byId[id])).join('')}`;
  $('#binsp').classList.remove('translate-x-full');
  el.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>select(byId[x.dataset.go],true));
  speak(a.a.replace(/\[\[(\w+)\]\]/g,(m,i)=>byId[i]?.title||'').replace(/\(|\)/g,''));
  bus?.('brain.ask',{q,hits:a.hits});
}

/* ---------- рисование ---------- */
const stars=Array.from({length:140},()=>[Math.random(),Math.random(),Math.random()*1.2+.2,Math.random()]);
function focus(){if(sel){const s=new Set([sel.id,...(nbr.get(sel.id)||[])]);if(sel.parent)s.add(sel.parent);return s}return hiSet}
function loop(now){
  requestAnimationFrame(loop);if(!$('#brain').classList.contains('on')||!W)return;
  const k=tr.k,F=focus();
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  stars.forEach(([x,y,r,p])=>{ctx.fillStyle=`rgba(160,220,255,${.15+.15*Math.sin(now/900+p*9)})`;ctx.fillRect(((x*W+tr.x*.05)%W+W)%W,((y*H+tr.y*.05)%H+H)%H,r,r)});
  ctx.save();ctx.translate(tr.x,tr.y);ctx.scale(k,k);
  // облака разделов
  for(const a of AKEYS){const ns=vis.filter(n=>n.area===a&&n.type!=='part');if(!ns.length)continue;const cx=d3.mean(ns,n=>n.x),cy=d3.mean(ns,n=>n.y);const R=Math.max(60,d3.max(ns,n=>Math.hypot(n.x-cx,n.y-cy))+45);const c=AREAS[a][1];
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,hexA(c,F?.03:.09));g.addColorStop(1,hexA(c,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fill();
    const la=Math.max(0,Math.min(1,(1.15-k)/.5));if(la>0){ctx.font=`700 ${Math.min(60,22/k)}px Orbitron,sans-serif`;ctx.textAlign='center';ctx.fillStyle=hexA(c,.55*la);ctx.fillText(AREAS[a][0].toUpperCase(),cx,cy-R*.75)}}
  // связи
  for(const l of visL){const s=l.source,t=l.target;const on=F?F.has(s.id)&&F.has(t.id):true;
    let a={area:.07,ref:.28,sem:.35,part:.45}[l.k];if(F)a=on?(l.k==='area'?.15:.85):.025;
    ctx.strokeStyle=l.k==='sem'?hexA('#b48cff',a):l.k==='part'?hexA(col(t),a):hexA(l.k==='area'?AREAS[s.area][1]:'#7fdcff',a);
    ctx.lineWidth=(F&&on&&l.k!=='area'?1.8:l.k==='area'?.8:1)/Math.sqrt(k);ctx.setLineDash(l.k==='sem'?[5/k,4/k]:[]);
    ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(t.x,t.y);ctx.stroke()}
  ctx.setLineDash([]);
  // импульсы по пути ответа
  if(hiPath.length&&Math.random()<.12){const [a,b]=hiPath[Math.floor(Math.random()*hiPath.length)];pulses.push({a:byId[a],b:byId[b],t0:now,dur:900,c:'#ffb547'})}
  if(sel&&Math.random()<.08){const ns=[...(nbr.get(sel.id)||[])];if(ns.length)pulses.push({a:sel,b:byId[ns[Math.floor(Math.random()*ns.length)]],t0:now,dur:800,c:col(sel)})}
  pulses=pulses.filter(p=>now-p.t0<p.dur);
  for(const p of pulses){const t=(now-p.t0)/p.dur;if(p.a.x==null||p.b.x==null)continue;const x=p.a.x+(p.b.x-p.a.x)*t,y=p.a.y+(p.b.y-p.a.y)*t;ctx.shadowColor=p.c;ctx.shadowBlur=12;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(x,y,2.6/Math.sqrt(k),0,7);ctx.fill();ctx.shadowBlur=0}
  // узлы
  for(const n of vis){const c=col(n),r=rad(n),dim=F&&!F.has(n.id);ctx.globalAlpha=dim?.13:1;
    if(n===sel||(hiSet&&hiSet.has(n.id)&&!dim)){ctx.shadowColor=n===sel?c:'#ffb547';ctx.shadowBlur=25;ctx.strokeStyle=n===sel?c:'#ffb547';ctx.lineWidth=2/k;ctx.beginPath();ctx.arc(n.x,n.y,r+5+Math.sin(now/300)*1.5,0,7);ctx.stroke();ctx.shadowBlur=0}
    if(n.type==='area'){const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,r);g.addColorStop(0,'#fff');g.addColorStop(.35,c);g.addColorStop(1,hexA(c,.15));ctx.fillStyle=g;ctx.shadowColor=c;ctx.shadowBlur=30;ctx.beginPath();ctx.arc(n.x,n.y,r,0,7);ctx.fill();ctx.shadowBlur=0;
      if(collapsed.has(n.id)){const cnt=NOTES.filter(x=>x.area===n.id&&x.d<=timeCut).length;ctx.font=`700 ${11/Math.sqrt(k)}px JetBrains Mono`;ctx.textAlign='center';ctx.fillStyle='#021018';ctx.fillText('+'+cnt,n.x,n.y+4/Math.sqrt(k))}}
    else{ctx.fillStyle=hexA(c,n.type==='part'?.9:.85);ctx.beginPath();ctx.arc(n.x,n.y,r,0,7);ctx.fill();if(n.type!=='part'){ctx.strokeStyle=hexA('#ffffff',.5);ctx.lineWidth=1/k;ctx.stroke()}
      if(exploded.has(n.id)){ctx.strokeStyle=c;ctx.setLineDash([3/k,3/k]);ctx.lineWidth=1.2/k;ctx.beginPath();ctx.arc(n.x,n.y,r+9,0,7);ctx.stroke();ctx.setLineDash([])}
      if(n.status==='заброшено'){ctx.strokeStyle='#ff4d5e';ctx.lineWidth=1.5/k;ctx.beginPath();ctx.moveTo(n.x-r,n.y+r);ctx.lineTo(n.x+r,n.y-r);ctx.stroke()}
      if(k*r>14&&n.type!=='part'){ctx.font=`${r*1.15}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(TYPE[n.type][0],n.x,n.y+1);ctx.textBaseline='alphabetic'}}
    ctx.globalAlpha=1}
  // подписи (постоянный экранный размер)
  ctx.textAlign='center';
  for(const n of vis){const dim=F&&!F.has(n.id);if(dim)continue;
    const show=labelsAll||n===hover||n===sel||(F&&F.has(n.id))||n.type==='area'&&k>1.1||(n.type!=='part'&&n.type!=='area'&&(k>1.5||deg(n.id)>=5&&k>.8))||(n.type==='part'&&k>2.6);
    if(!show)continue;const fs=(n.type==='area'?13:n.type==='part'?10:11.5)/k;ctx.font=`${n.type==='area'?'700':'500'} ${fs}px ${n.type==='area'?'Orbitron':'Inter'},sans-serif`;
    let t=n.title;if(n.type==='part'&&t.length>38)t=t.slice(0,36)+'…';const y=n.y+rad(n)+fs*1.25;
    ctx.lineWidth=3/k;ctx.strokeStyle='rgba(2,8,14,.85)';ctx.strokeText(t,n.x,y);ctx.fillStyle=n.type==='part'?col(n):(n===sel||n===hover?'#fff':'#cfefff');ctx.fillText(t,n.x,y)}
  ctx.restore();
  drawMini();
}
function drawMini(){
  const w=200,h=130,mr=devicePixelRatio||1;if(mini.width!==w*mr){mini.width=w*mr;mini.height=h*mr}mctx.setTransform(mr,0,0,mr,0,0);mctx.clearRect(0,0,w,h);
  const ns=vis.filter(n=>n.x!=null);if(!ns.length)return;const x0=d3.min(ns,n=>n.x)-40,x1=d3.max(ns,n=>n.x)+40,y0=d3.min(ns,n=>n.y)-40,y1=d3.max(ns,n=>n.y)+40;
  const s=Math.min(w/(x1-x0),h/(y1-y0)),ox=(w-(x1-x0)*s)/2,oy=(h-(y1-y0)*s)/2;mini._b={x0,y0,s,ox,oy};
  const F=focus();
  for(const n of ns){mctx.fillStyle=hexA(col(n),F&&!F.has(n.id)?.2:.9);mctx.beginPath();mctx.arc(ox+(n.x-x0)*s,oy+(n.y-y0)*s,n.type==='area'?3:1.4,0,7);mctx.fill()}
  const [a,b]=tr.invert([0,0]),[c,d]=tr.invert([W,H]);mctx.strokeStyle='#00d4ff';mctx.lineWidth=1;mctx.strokeRect(ox+(a-x0)*s,oy+(b-y0)*s,(c-a)*s,(d-b)*s);
}

const prevOnTab=window.onTab;
window.onTab=t=>{prevOnTab?.(t);if(t==='brain'){init();setTimeout(resize,30)}};
window.brainAsk=ask;
window.__brain={byId,select:n=>select(byId[n],true),explode:n=>toggleExplode(byId[n]),screen:n=>{const r=cv.getBoundingClientRect(),[x,y]=tr.apply([byId[n].x,byId[n].y]);return[r.left+x,r.top+y]}};
})();
