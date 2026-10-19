const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- boot ---------- */
(async()=>{
  const lines=["J.A.R.V.I.S. OS v5.5 — загрузка ядра…","[ OK ] Аудио-подсистема · 48 кГц","[ OK ] Wake word «Джарвис» · openWakeWord","[ OK ] Silero VAD","[ OK ] STT · whisper-large-v3-turbo","[ OK ] LLM · claude-sonnet-5-5 · 12 инструментов","[ OK ] TTS · голос «Пол Беттани» (клон)","[ OK ] Home Assistant · 5 устройств","[ OK ] Память · 3 факта","Все системы в норме, сэр."];
  const b=$('#bootlog');
  for(const l of lines){b.textContent+=l+"\n";await sleep(140)}
  await sleep(350);$('#boot').classList.add('hide');
  setTimeout(()=>$('#boot')?.remove(),900);
  greet();
})();

/* ---------- tabs ---------- */
$$('nav button').forEach(b=>b.onclick=()=>goTab(b.dataset.tab));
function goTab(t){$$('nav button').forEach(x=>x.classList.toggle('on',x.dataset.tab===t));$$('.tab').forEach(x=>x.classList.toggle('on',x.id===t));window.scrollTo({top:0,behavior:'smooth'});window.onTab?.(t)}

/* ---------- clock / stats ---------- */
setInterval(()=>{$('#clock').textContent=new Date().toLocaleTimeString('ru-RU')},1000);
function setBar(id,v){$('#'+id).style.width=v+'%';$('#'+id+'v').textContent=id==='net'?Math.round(v*1.4)+' Мб':v+'%'}
let load=0;
setInterval(()=>{
  const busy=document.body.dataset.s!=='idle';
  setBar('cpu',Math.round(12+Math.random()*15+(busy?35:0)));
  setBar('ram',Math.round(46+Math.random()*6));
  setBar('gpu',Math.round(5+Math.random()*8+(busy?55:0)));
  setBar('net',Math.round(15+Math.random()*30));
},1200);

/* ---------- log ---------- */
function log(t,c=''){const d=document.createElement('div');d.className=c;d.textContent=new Date().toLocaleTimeString('ru-RU')+' '+t;$('#log').append(d);while($('#log').children.length>14)$('#log').firstChild.remove()}
setInterval(()=>{if(Math.random()<.3)log(['heartbeat ok','ha: sensors sync','memory: index ok','calendar: poll','wakeword: listening…'][Math.floor(Math.random()*5)])},4000);

/* ---------- state ---------- */
const STATES={idle:['ОЖИДАНИЕ','Скажи «Джарвис» или нажми на ядро'],listening:['СЛУШАЮ','Говорите, сэр…'],thinking:['ДУМАЮ','LLM · вызов инструментов'],speaking:['ГОВОРЮ','TTS · стриминг голоса']};
function setState(s){document.body.dataset.s=s;$('#stateTxt').textContent=STATES[s][0];$('#stateSub').textContent=STATES[s][1]}

/* ---------- waveform ---------- */
const cv=$('#wave'),cx=cv.getContext('2d');let analyser=null,micData=null;
function resize(){cv.width=cv.clientWidth*devicePixelRatio;cv.height=cv.clientHeight*devicePixelRatio}
addEventListener('resize',resize);resize();
let t0=0;
(function draw(t){
  requestAnimationFrame(draw);t0=t/1000;
  const w=cv.width,h=cv.height,s=document.body.dataset.s;cx.clearRect(0,0,w,h);
  const col={idle:'0,212,255',listening:'61,255,168',thinking:'255,181,71',speaking:'0,212,255'}[s];
  let amp={idle:4,listening:18,thinking:8,speaking:30}[s]*devicePixelRatio;
  if(analyser&&s==='listening'){analyser.getByteTimeDomainData(micData);let m=0;for(const v of micData)m=Math.max(m,Math.abs(v-128));amp=(6+m*1.4)*devicePixelRatio}
  const R=165*devicePixelRatio,N=180;
  for(let k=0;k<3;k++){
    cx.beginPath();
    for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;const n=Math.sin(a*6+t0*(2+k)+k)*Math.sin(a*3-t0*1.3)*amp*(1-k*.25)+(s==='speaking'?Math.sin(a*20+t0*12)*amp*.25:0);const r=R+k*10*devicePixelRatio+n;const x=w/2+Math.cos(a)*r,y=h/2-14*devicePixelRatio+Math.sin(a)*r;i?cx.lineTo(x,y):cx.moveTo(x,y)}
    cx.strokeStyle=`rgba(${col},${.7-k*.2})`;cx.lineWidth=(1.5-k*.3)*devicePixelRatio;cx.shadowColor=`rgb(${col})`;cx.shadowBlur=12;cx.stroke();
  }
  if(s==='speaking'||s==='listening')$('#core').style.transform=`scale(${1+amp/devicePixelRatio/120})`;else $('#core').style.transform='';
})(0);

/* ---------- chat ---------- */
function addMsg(who,text){const d=document.createElement('div');d.className='msg '+(who==='u'?'u':'j');d.innerHTML=`<div class="who">${who==='u'?'ВЫ':'J.A.R.V.I.S.'}</div><span></span>`;$('#chat').append(d);$('#chat').scrollTop=1e9;return d.querySelector('span')}
function addTool(name,args){const d=document.createElement('div');d.className='tool';d.innerHTML=`⚙ <b>${name}</b>(${args})`;$('#chat').append(d);$('#chat').scrollTop=1e9;log(`tool_use → ${name}(${args})`,'w')}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').classList.remove('on'),3200)}

let voiceOn=true,busy=false;
function speak(text){
  return new Promise(res=>{
    if(!voiceOn||!('speechSynthesis' in window)){res();return}
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text.replace(/[*_`]/g,''));u.lang='ru-RU';u.rate=1.05;u.pitch=.85;
    const v=speechSynthesis.getVoices().find(v=>/ru/i.test(v.lang)&&/(Yuri|Male|Dmitri|Pavel|Maxim)/i.test(v.name))||speechSynthesis.getVoices().find(v=>/ru/i.test(v.lang));
    if(v)u.voice=v;
    u.onend=res;u.onerror=res;speechSynthesis.speak(u);
    setTimeout(res,Math.max(3000,text.length*90));
  });
}
async function jReply(text){
  setState('speaking');const span=addMsg('j','');const sp=speak(text);
  for(const ch of text){span.textContent+=ch;$('#chat').scrollTop=1e9;await sleep(14)}
  await sp;setState('idle');
}

/* ---------- skills (demo brain) ---------- */
const sw=d=>$(`.sw[data-dev="${d}"]`);
function setDev(d,on){sw(d).classList.toggle('on',on)}
const SKILLS=[
  {re:/привет|здравств|добр(ое|ый)/i,run:()=>`Здравствуйте, сэр. Все системы в норме. На ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} у вас ${$('#cal').children.length} события в календаре.`},
  {re:/погод/i,tools:[['get_weather','city="Москва"']],run:()=>'В Москве плюс одиннадцать, облачно. В пятницу ожидается дождь — рекомендую взять зонт, сэр.'},
  {re:/свет.*(выкл|погас)|(выкл|погас).*свет/i,tools:[['home_assistant.light','room="гостиная", on=false']],run:()=>{setDev('light',false);return 'Свет в гостиной выключен.'}},
  {re:/свет/i,tools:[['home_assistant.light','room="гостиная", on=true']],run:()=>{setDev('light',true);return 'Свет в гостиной включён, сэр.'}},
  {re:/кофе/i,tools:[['home_assistant.switch','"coffee_machine", on=true']],run:()=>{setDev('coffee',true);return 'Кофемашина запущена. Чёрный, без сахара, как вы любите. Будет готов через две минуты.'}},
  {re:/штор/i,tools:[['home_assistant.cover','"blinds", open=true']],run:()=>{setDev('blinds',!sw('blinds').classList.contains('on'));return sw('blinds').classList.contains('on')?'Открываю шторы.':'Закрываю шторы.'}},
  {re:/муз|включи .*(песн|трек)|play|рок/i,tools:[['spotify.play','query="AC/DC"']],run:()=>{$('#np').classList.add('play');$('#track').textContent='Shoot to Thrill';return 'Включаю AC/DC — Shoot to Thrill. Отличный выбор для работы, сэр.'}},
  {re:/стоп|пауз|выключи муз/i,tools:[['spotify.pause','']],run:()=>{$('#np').classList.remove('play');return 'Музыка на паузе.'}},
  {re:/календар|расписан|встреч|план/i,tools:[['calendar.list_events','date="today"']],run:()=>'Сегодня: в десять — стендап, в половине второго — обед с Пеппер, в четыре — тест костюма Mk-85. Напомнить за пятнадцать минут до каждого?'},
  {re:/напомн|добавь.*(встреч|событ)/i,tools:[['calendar.create_event','title="Звонок", time="18:00"']],run:()=>{const e=document.createElement('div');e.className='ev';e.innerHTML='<time>18:00</time>Звонок (добавлено голосом)';$('#cal').append(e);return 'Готово, добавил событие на восемнадцать ноль-ноль и напомню заранее.'}},
  {re:/запомни|меня зовут|я люблю/i,tools:[['memory.save','fact="…"']],run:t=>{const f=t.replace(/^(джарвис[, ]*)?(запомни,?( что)?)/i,'').trim();const li=document.createElement('li');li.textContent=f||t;$('#mem').append(li);return 'Запомнил, сэр. Это сохранится и в следующих разговорах.'}},
  {re:/что ты (знаешь|помнишь)|обо мне/i,tools:[['memory.search','query="user"']],run:()=>'Я помню: '+[...$$('#mem li')].map(l=>l.textContent).join('; ')+'.'},
  {re:/открой|запусти/i,tools:[['os.open_app','name="Visual Studio Code"']],run:t=>{toast('🖥  open -a "Visual Studio Code"');return 'Открываю редактор кода. Проект MyJarvis уже загружен.'}},
  {re:/найди|поищи|загугл|новост/i,tools:[['web_search','query="новости ИИ"'],['fetch_page','top 3']],run:()=>'Нашёл три свежие статьи. Главное: вышли новые голосовые модели с задержкой меньше трёхсот миллисекунд. Прочитать подробнее?'},
  {re:/что (ты )?видишь|камер|кто (это|передо)/i,tools:[['vision.capture','camera=0'],['vision.describe','model="claude"']],run:()=>'Вижу вас за столом, сэр, монитор и кружку — судя по всему, кофе уже остыл.'},
  {re:/систем|диагност|статус|cpu|процессор/i,tools:[['os.system_info','']],run:()=>`Процессор загружен на ${$('#cpuv').textContent}, память ${$('#ramv').textContent}, батарея восемьдесят шесть процентов. Всё в пределах нормы.`},
  {re:/костюм|протокол|mark|броня/i,tools:[['suit.diagnostics','id="Mk-85"']],run:()=>'Костюм Марк восемьдесят пять: заряд репульсоров сто процентов, наноботы откалиброваны. Протокол «Домашняя вечеринка» готов к запуску по вашей команде.'},
  {re:/брифинг|утро|доброе утро/i,tools:[['get_weather','city="Москва"'],['calendar.list_events','date="today"'],['email.unread','limit=3']],run:()=>'Доброе утро, сэр. Плюс одиннадцать, облачно. Три встречи сегодня, первая в десять. Два важных письма — одно от Пеппер. Кофе уже варится.'},
  {re:/посчитай|сколько будет|\d+\s*[-+*/x×]\s*\d+/i,tools:[['python.exec','expr']],run:t=>{const m=t.match(/(\d+(?:[.,]\d+)?)\s*([-+*/x×])\s*(\d+(?:[.,]\d+)?)/);if(!m)return'Назовите выражение, сэр.';const a=+m[1].replace(',','.'),b=+m[3].replace(',','.');const r={'+':a+b,'-':a-b,'*':a*b,'x':a*b,'×':a*b,'/':a/b}[m[2]];return `Получается ${+r.toFixed(4)}.`}},
  {re:/шутк|пошути/i,run:()=>'Я бы рассказал шутку про UDP, сэр, но не уверен, что вы её получите.'},
  {re:/кто ты|что ты умеешь|помощ/i,run:()=>'Я — Джарвис, ваш голосовой ассистент. Управляю домом, музыкой, календарём, компьютером, ищу в интернете, вижу через камеру и запоминаю важное. Просто скажите.'},
  {re:/голос.*(выкл|off)|молч/i,run:()=>{voiceOn=false;return 'Перехожу в текстовый режим.'}},
  {re:/голос.*(вкл|on)|говори/i,run:()=>{voiceOn=true;return 'Голос снова включён, сэр.'}},
];
async function handle(text){
  text=text.trim();if(!text||busy)return;busy=true;
  speechSynthesis?.cancel();
  addMsg('u','').textContent=text;$('#inp').value='';
  const t=performance.now();setState('thinking');log(`stt → "${text}"`,'c');
  const rich=typeof RICH!=='undefined'&&Object.values(RICH).find(b=>b.re.test(text));
  const sk=rich?null:SKILLS.find(s=>s.re.test(text));
  const tools=rich?rich.tools:sk?.tools;
  window.HIST?.push({role:'user',content:text});
  await sleep(350);
  if(tools)for(const [n,a] of tools){addTool(n,a);await sleep(420);log(`${n} ✓ 200 OK`,'ok')}
  if(tools)window.histTools?.(tools);
  const ans=rich?rich.say:sk?sk.run(text):'Понял вас, сэр. В этом макете у меня нет настоящей нейросети, но в реальной сборке этот запрос ушёл бы в LLM. Попробуйте: «нарисуй схему», «конспект видео», «граф обо мне», «погода», «включи свет».';
  $('#latency').textContent=`латентность: ${Math.round(performance.now()-t)} мс`;
  if(rich){$('#chat').append(renderCard(rich));$('#chat').scrollTop=1e9}
  window.HIST?.push({role:'assistant',content:rich?[{type:'text',text:ans},{type:'ui_block',block:{type:rich.type,...rich.data}}]:ans});
  window.renderHist?.();
  await jReply(ans);busy=false;
}
$('#send').onclick=()=>handle($('#inp').value);
$('#inp').onkeydown=e=>{if(e.key==='Enter')handle($('#inp').value)};
['Утренний брифинг','Какая погода?','Включи свет','Свари кофе','Включи музыку','Что у меня сегодня?','Что ты видишь?','Запомни, что я люблю суши','Что ты обо мне знаешь?','Открой VS Code','Найди новости ИИ','Статус системы','Сколько будет 128*42','Пошути'].forEach(c=>{const b=document.createElement('button');b.className='chip';b.textContent=c;b.onclick=()=>handle(c);$('#chips').append(b)});
$$('.sw').forEach(s=>s.onclick=()=>{s.classList.toggle('on');log(`ha: ${s.dataset.dev} → ${s.classList.contains('on')?'on':'off'}`,'ok')});
async function greet(){await sleep(300);await jReply('Добрый день, сэр. Джарвис онлайн. Чем могу помочь?')}

/* ---------- real mic (Web Speech API) ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,listening=false;
async function startMic(){
  if(busy)return;
  speechSynthesis?.cancel();
  if(!SR){toast('Браузер не поддерживает распознавание речи — показываю симуляцию');setState('listening');await sleep(1600);setState('idle');handle('Утренний брифинг');return}
  try{if(!analyser){const st=await navigator.mediaDevices.getUserMedia({audio:true});const ac=new AudioContext();analyser=ac.createAnalyser();analyser.fftSize=512;micData=new Uint8Array(analyser.fftSize);ac.createMediaStreamSource(st).connect(analyser)}}catch(e){}
  rec=new SR();rec.lang='ru-RU';rec.interimResults=true;
  let final='';
  rec.onresult=e=>{final=[...e.results].map(r=>r[0].transcript).join('');$('#inp').value=final};
  rec.onend=()=>{listening=false;$('#mic').classList.remove('live');setState('idle');if(final)handle(final.replace(/^джарвис[,]?\s*/i,''))};
  rec.onerror=e=>{toast('Микрофон: '+e.error)};
  rec.start();listening=true;$('#mic').classList.add('live');setState('listening');log('mic: recording…','c');
}
$('#mic').onclick=()=>listening?rec.stop():startMic();
$('#reactor').onclick=()=>listening?rec.stop():startMic();
addEventListener('keydown',e=>{if(e.code==='Space'&&document.activeElement!==$('#inp')&&$('#hud').classList.contains('on')){e.preventDefault();listening?rec.stop():startMic()}});

/* ---------- pipeline ---------- */
const PIPE=[
  {n:'01',t:'Wake Word',ms:'~0',p:'Постоянно слушает только слово «Джарвис»',d:`<b>Что это:</b> крошечная нейросеть (килобайты), которая крутится 24/7 на CPU и ждёт одно слово. Пока она не сработала — ничего никуда не отправляется, это и приватность, и экономия.<br><br><b>Чем делают:</b> openWakeWord (бесплатно, можно обучить своё слово), Picovoice Porcupine (точнее, есть русский), на колонках — micro-wake-word на ESP32.<code class="code" style="margin-top:10px"><span class="k">from</span> openwakeword.model <span class="k">import</span> Model
m = Model(wakeword_models=[<span class="s">"hey_jarvis"</span>])
<span class="k">if</span> m.predict(audio_chunk)[<span class="s">"hey_jarvis"</span>] > <span class="f">0.5</span>: start_listening()</code>`},
  {n:'02',t:'VAD',ms:'150мс',p:'Понимает, когда ты закончил говорить',d:`<b>Voice Activity Detection</b> — определяет речь vs тишину. Нужно, чтобы не ждать фиксированные 5 секунд, а отрезать фразу ровно когда ты замолчал. Продвинутые сборки используют <b>turn detection</b> модели, которые по смыслу понимают «он договорил или просто думает».<br><br><b>Чем делают:</b> Silero VAD (стандарт де-факто), WebRTC VAD, LiveKit turn-detector.`},
  {n:'03',t:'STT',ms:'200мс',p:'Речь → текст',d:`<b>Speech-to-Text.</b> Самое популярное — <b>Whisper</b> от OpenAI: открытый, понимает русский, работает локально. faster-whisper и whisper.cpp ускоряют его в 4–10 раз (на Mac — через Metal). Облачные Deepgram/AssemblyAI дают стриминг: текст появляется, пока ты ещё говоришь.<code class="code" style="margin-top:10px"><span class="k">from</span> faster_whisper <span class="k">import</span> WhisperModel
model = WhisperModel(<span class="s">"large-v3-turbo"</span>, compute_type=<span class="s">"int8"</span>)
text = <span class="s">" "</span>.join(s.text <span class="k">for</span> s <span class="k">in</span> model.transcribe(<span class="s">"cmd.wav"</span>, language=<span class="s">"ru"</span>)[<span class="f">0</span>])</code>`},
  {n:'04',t:'LLM + Tools',ms:'350мс',p:'Мозг: понимает и решает, что делать',d:`<b>Сердце системы.</b> Языковая модель получает текст + историю + память + <b>список инструментов</b> (функций). Если нужно действие — она возвращает «вызови set_light(room='гостиная')», твой код это выполняет и отдаёт результат обратно. Так она управляет чем угодно.<br><br><b>Персона</b> задаётся системным промптом: «Ты — Джарвис, британский дворецкий, ироничный, отвечай 1–2 предложениями, обращайся "сэр"».<br><br>Сейчас модно подключать инструменты через <b>MCP</b> (Model Context Protocol) — готовые серверы для файлов, браузера, GitHub, Notion, Spotify и т.д.`},
  {n:'05',t:'TTS',ms:'200мс',p:'Текст → голос',d:`<b>Text-to-Speech.</b> Тут решается, будет ли «вау». <b>ElevenLabs</b> — самый реалистичный, умеет клонировать голос по минуте записи (люди клонируют голос Пола Беттани из фильмов — для себя, не для публикации). Локально — <b>Piper</b> (быстрый, на Raspberry Pi), <b>XTTS</b>, <b>Kokoro</b>, для русского — <b>Silero TTS</b>.<br><br>Ключевая фишка — стриминг: ответ LLM режут на предложения и озвучивают первое, пока генерируется второе.`},
  {n:'06',t:'Действие + HUD',ms:'50мс',p:'Динамик, экран, умный дом',d:`Звук идёт в колонку, а параллельно по <b>WebSocket</b> на экран летят события: «состояние=говорю», «вызван инструмент», «включён свет». Интерфейс (как этот макет) — просто веб-страница, которая рисует реактор, волну и виджеты. Делают на HTML/Canvas, Three.js, React, Electron или Tauri для десктопа.<br><br><b>Barge-in:</b> если ты заговорил, пока он отвечает, — VAD это ловит, TTS мгновенно замолкает, начинается новый цикл.`},
];
PIPE.forEach((s,i)=>{
  const n=document.createElement('div');n.className='node';n.innerHTML=`<div class="n">${s.n}</div><div class="ms">${s.ms}</div><h4>${s.t}</h4><p>${s.p}</p>`;
  n.onclick=()=>{$$('.node').forEach(x=>x.classList.remove('act'));n.classList.add('act');$('#pdetail').innerHTML=`<div class="ph">${s.n} · ${s.t}</div><div style="font-size:13.5px;color:#cbe7f3">${s.d}</div>`};
  $('#pipe').append(n);if(i<PIPE.length-1){const a=document.createElement('div');a.className='arrow';a.textContent='›';$('#pipe').append(a)}
});
$('.node').click();

/* ---------- features ---------- */
const F=[
  ['🗣','Wake word «Джарвис»','Слушает постоянно, просыпается только на имя. Можно обучить своё слово за полчаса на синтетических данных.','Голос','m',['openWakeWord','Porcupine']],
  ['✋','Перебивание (barge-in)','Заговорил посреди ответа — он замолкает и слушает. Без этого ассистент ощущается как автоответчик.','Голос','m',['Silero VAD','LiveKit','Pipecat']],
  ['🎭','Клон голоса из фильма','Голос, интонации, британский акцент. Клонируют по 1–3 минутам чистой записи.','Голос','e',['ElevenLabs','XTTS','F5-TTS']],
  ['😏','Персона и юмор','Системный промпт с характером: сухая ирония, «сэр», краткость. Половина «магии» — именно тут.','Мозг','e',['System prompt'],'Пошути'],
  ['🧠','Долговременная память','Помнит твои привычки, имена, проекты между сессиями. Факты сохраняются в векторную БД и подмешиваются в контекст.','Мозг','m',['Mem0','ChromaDB','RAG'],'Запомни, что я люблю суши'],
  ['🌅','Утренний брифинг','Сам здоровается утром: погода, календарь, письма, новости, пробки. Запуск по расписанию или по датчику движения.','Проактивность','e',['cron','HA automations'],'Утренний брифинг'],
  ['🔔','Проактивные подсказки','«Сэр, через 15 минут встреча, а вы ещё дома — такси вызвать?» Агент сам периодически смотрит на контекст и решает, стоит ли заговорить.','Проактивность','h',['Agent loop','Heartbeat']],
  ['🏠','Умный дом','Свет, климат, замки, шторы, пылесос, сцены «Я дома» / «Кино». Через Home Assistant — тысячи устройств.','Дом','m',['Home Assistant','MQTT','Zigbee'],'Включи свет'],
  ['📡','Колонки в каждой комнате','Дешёвые микрофоны-сателлиты на ESP32 по ~$15. Ответ звучит там, где ты сказал.','Дом','h',['ESP32-S3','Wyoming','ReSpeaker']],
  ['🖥','Управление компьютером','Открыть приложения, найти файл, сделать скриншот, набрать текст, управлять окнами. Продвинутые — computer use: ИИ сам кликает по экрану.','ПК','m',['AppleScript','pyautogui','Computer Use'],'Открой VS Code'],
  ['💻','Пишет и запускает код','«Джарвис, напиши скрипт, который…» — генерирует, запускает в песочнице, сообщает результат. Связка с Claude Code / Cursor.','ПК','m',['Code exec','Claude Code'],'Сколько будет 128*42'],
  ['👁','Зрение','Камера или скриншот → мультимодальная модель описывает, что видит. «Что у меня на экране?», «Кто у двери?»','Зрение','m',['Claude vision','YOLO','OpenCV'],'Что ты видишь?'],
  ['🙂','Распознавание лиц и жестов','Узнаёт хозяина, здоровается по имени, не слушается чужих. Жесты руками — «щёлкнул пальцами = выключить свет».','Зрение','h',['face_recognition','MediaPipe']],
  ['🎤','Узнаёт по голосу','Voice ID: отличает тебя от гостей и детей, разные права доступа.','Голос','h',['Resemblyzer','pyannote']],
  ['🌐','Поиск в интернете','Ищет, читает страницы, суммирует. Новости, курсы, факты свежее даты обучения модели.','Мозг','e',['Tavily','Brave API','web_search'],'Найди новости ИИ'],
  ['🔌','MCP-инструменты','Подключение сотен готовых интеграций одной строкой: файлы, GitHub, Notion, Gmail, Spotify, браузер, БД.','Мозг','e',['MCP','Claude Desktop']],
  ['🤖','Мульти-агенты','Джарвис раздаёт задачи «подчинённым»: один исследует, другой пишет код, третий проверяет. Как Пятница и Эдит.','Мозг','h',['Agent SDK','CrewAI','LangGraph']],
  ['📅','Календарь, почта, задачи','Создаёт встречи, читает и отвечает на письма (с подтверждением!), ведёт to-do.','Продуктивность','m',['Google API','Outlook','Todoist'],'Что у меня сегодня?'],
  ['🎵','Музыка и медиа','«Включи что-нибудь для концентрации», громкость, пауза, телевизор.','Дом','e',['Spotify API','Chromecast'],'Включи музыку'],
  ['📱','Джарвис в телефоне','Telegram-бот с голосовыми, Siri Shortcuts, PWA. Доступ к дому из любой точки.','Интерфейс','e',['Telegram','Shortcuts','PWA']],
  ['🌀','Голографический HUD','Реактор, волны, панели как в фильме. Three.js, частицы, иногда — проектор + пирамида «пеппер-гоуст» или AR-очки.','Интерфейс','m',['Three.js','Canvas','Electron']],
  ['🔒','Полностью офлайн','Ни байта в облако: Whisper + Ollama + Piper на своём Mac/ПК с GPU. Медленнее и глупее, зато приватно и бесплатно.','Приватность','h',['Ollama','LM Studio','Piper']],
  ['⚡','Speech-to-speech в реальном времени','Модель слышит и отвечает голосом напрямую, задержка ~300 мс, понимает эмоции и интонацию, можно перебивать.','Голос','m',['OpenAI Realtime','Gemini Live']],
  ['😠','Распознавание эмоций','Слышит раздражение или усталость по голосу и меняет тон ответа.','Голос','h',['Hume AI','SER-модели']],
  ['🛡','Подтверждение опасных действий','«Открыть дверь? Подтвердите кодовым словом». Обязательно для замков, денег, отправки писем.','Приватность','e',['Guardrails']],
  ['🦾','Железо и роботы','Подключение Arduino, 3D-принтеров, дронов, робо-рук. «Джарвис, запусти печать».','Дом','h',['Arduino','OctoPrint','ROS']],
];
const cats=['Все',...new Set(F.map(f=>f[3]))];let cur='Все';
cats.forEach(c=>{const b=document.createElement('button');b.className='chip';b.textContent=c;b.onclick=()=>{cur=c;renderF();$$('#filters .chip').forEach(x=>x.style.borderColor=x.textContent===c?'var(--cy)':'')};$('#filters').append(b)});
function renderF(){
  $('#fgrid').innerHTML='';
  F.filter(f=>cur==='Все'||f[3]===cur).forEach(([ic,t,p,c,l,tags,demo])=>{
    const d=document.createElement('div');d.className='feat';
    d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><span class="ic">${ic}</span><span class="lvl ${l}">● ${{e:'вечер',m:'выходные',h:'месяц+'}[l]}</span></div><h4>${t}</h4><p>${p}</p><div class="tags">${tags.map(x=>`<span class="tag">${x}</span>`).join('')}</div>`;
    if(demo){const b=document.createElement('button');b.className='try';b.textContent='▶ попробовать в интерфейсе';b.onclick=()=>{goTab('hud');setTimeout(()=>handle(demo),400)};d.insertBefore(b,d.querySelector('.tags'))}
    $('#fgrid').append(d);
  });
}
renderF();$('#filters .chip').style.borderColor='var(--cy)';
speechSynthesis?.getVoices();
