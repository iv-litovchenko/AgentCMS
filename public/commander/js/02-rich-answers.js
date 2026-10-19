/* =====================================================================
   RICH ANSWERS — «Generative UI»: модель возвращает JSON-блок, HUD его рисует
   ===================================================================== */
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let uid=0;
if(window.mermaid)mermaid.initialize({startOnLoad:false,theme:'dark',securityLevel:'loose',fontFamily:'Inter',themeVariables:{darkMode:true,background:'transparent',primaryColor:'#06283a',primaryTextColor:'#d8f5ff',primaryBorderColor:'#00d4ff',lineColor:'#00d4ff',secondaryColor:'#2a1f0a',tertiaryColor:'#0a1f18',fontSize:'13px',actorBkg:'#06283a',actorBorder:'#00d4ff',signalColor:'#5ff3ff',signalTextColor:'#d8f5ff',noteBkgColor:'#2a1f0a',noteTextColor:'#ffd79a',cScale0:'#003a52',cScale1:'#0b3d2c',cScale2:'#3a2a08',cScale3:'#2a1a45',cScale4:'#3d0f18',cScale5:'#063040',cScaleLabel0:'#d8f5ff',cScaleLabel1:'#d8f5ff',cScaleLabel2:'#d8f5ff',cScaleLabel3:'#d8f5ff',cScaleLabel4:'#d8f5ff',cScaleLabel5:'#d8f5ff'}});
if(window.Chart){Chart.defaults.color='#8fb6c9';Chart.defaults.borderColor='rgba(0,212,255,.12)';Chart.defaults.font.family='JetBrains Mono'}

/* ---------- данные графа знаний ---------- */
const GCOL={person:'#00d4ff',project:'#3dffa8',place:'#ffb547',pref:'#b48cff',thing:'#ff4d5e',event:'#5ff3ff'};
const GTYPE={person:'люди',project:'проекты',place:'места',pref:'предпочтения',thing:'вещи',event:'события'};
const KG={nodes:[
 {id:'me',label:'Сэр (вы)',type:'person'},{id:'pepper',label:'Пеппер',type:'person'},{id:'happy',label:'Хэппи',type:'person'},
 {id:'mj',label:'MyJarvis',type:'project'},{id:'si',label:'Stark Industries',type:'project'},{id:'mk',label:'Костюм Mk-85',type:'thing'},
 {id:'msk',label:'Москва',type:'place'},{id:'office',label:'Офис',type:'place'},{id:'coffee',label:'Чёрный кофе',type:'pref'},
 {id:'acdc',label:'AC/DC',type:'pref'},{id:'sushi',label:'Суши',type:'pref'},{id:'claude',label:'Claude',type:'thing'},
 {id:'ha',label:'Home Assistant',type:'thing'},{id:'pi',label:'Raspberry Pi 5',type:'thing'},{id:'lunch',label:'Обед 13:30',type:'event'},
 {id:'gym',label:'Зал вт/чт',type:'event'},{id:'audi',label:'Audi R8',type:'thing'}],
links:[
 {source:'me',target:'mj',label:'делает'},{source:'mj',target:'claude',label:'мозг'},{source:'mj',target:'ha',label:'дом'},{source:'mj',target:'pi',label:'железо'},
 {source:'me',target:'msk',label:'живёт'},{source:'me',target:'coffee',label:'любит'},{source:'me',target:'acdc',label:'слушает'},{source:'me',target:'sushi',label:'любит'},
 {source:'me',target:'lunch',label:'идёт'},{source:'pepper',target:'lunch',label:'идёт'},{source:'pepper',target:'si',label:'CEO'},{source:'me',target:'si',label:'владеет'},
 {source:'me',target:'mk',label:'тестирует'},{source:'si',target:'mk',label:'выпускает'},{source:'happy',target:'me',label:'водитель'},{source:'happy',target:'audi',label:'водит'},
 {source:'me',target:'gym',label:'ходит'},{source:'si',target:'office',label:'находится'},{source:'office',target:'msk',label:'в'}]};

/* ---------- генераторы демо-данных ---------- */
function walk(n,start,vol,seed=7){let x=start,s=seed;const r=()=>(s=(s*9301+49297)%233280)/233280;return Array.from({length:n},()=>x=+(x*(1+(r()-.48)*vol)).toFixed(0))}
const days=n=>Array.from({length:n},(_,i)=>{const d=new Date(Date.now()-(n-1-i)*864e5);return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})});

/* ---------- каталог «богатых» ответов ---------- */
const RICH={
 seq:{ask:'Покажи, что происходит, когда я прошу включить свет',re:/что происходит|последовательност|sequence/i,icon:'📨',type:'mermaid',title:'Диаграмма последовательности',
  tools:[['diagram.mermaid','kind="sequence"']],say:'Вот путь одной команды по всем модулям, сэр. Обратите внимание: модель дважды обращается к Claude — до инструмента и после.',
  data:{code:`sequenceDiagram
  participant Я
  participant J as Джарвис (Python)
  participant LLM as Claude
  participant HA as Home Assistant
  Я->>J: «Джарвис, включи свет»
  J->>J: wake word → VAD → Whisper
  J->>LLM: текст + история + список tools
  LLM-->>J: tool_use: set_light(room="гостиная")
  J->>HA: POST /api/services/light/turn_on
  HA-->>J: 200 OK
  J->>LLM: tool_result: "ok"
  LLM-->>J: «Свет включён, сэр»
  J-->>Я: 🔊 TTS + анимация HUD`}},
 flow:{ask:'Нарисуй схему, как ты устроен',re:/схем|диаграм|как ты устроен|блок-?схем/i,icon:'🔀',type:'mermaid',title:'Архитектура Джарвиса',
  tools:[['diagram.mermaid','kind="flowchart"']],say:'Готово. Вот блок-схема моей архитектуры: от микрофона до динамика и экрана.',
  data:{code:`flowchart TD
  A[🎙 Микрофон] --> B{Wake word?}
  B -- нет --> A
  B -- да --> C[VAD: запись фразы]
  C --> D[Whisper STT]
  D --> E[Claude + память]
  M[(Векторная память)] <--> E
  G[(Граф знаний)] <--> E
  E -- tool_use --> T[Инструменты: дом, ПК, веб, календарь]
  T -- tool_result --> E
  E --> S[TTS]
  S --> SP[🔊 Динамик]
  E --> H[🖥 HUD по WebSocket]`}},
 mind:{ask:'Сделай майндмэп про квантовые компьютеры',re:/майнд|mind|интеллект-карт|карту мыслей/i,icon:'🧠',type:'mermaid',title:'Mind map',
  tools:[['web_search','"квантовые компьютеры основы"'],['diagram.mermaid','kind="mindmap"']],say:'Собрал карту темы: основы, железо, алгоритмы и главные проблемы.',
  data:{code:`mindmap
  root((Квантовые компьютеры))
    Основы
      Кубит
      Суперпозиция
      Запутанность
    Железо
      Сверхпроводники
      Ионные ловушки
      Фотоны
    Алгоритмы
      Шор: факторизация
      Гровер: поиск
      Симуляция молекул
    Проблемы
      Шум и ошибки
      Охлаждение до мК
      Мало кубитов`}},
 gantt:{ask:'Спланируй проект MyJarvis на месяц',re:/сплан|гант|gantt|план проекта|роадмап|roadmap/i,icon:'📆',type:'mermaid',title:'План проекта (Gantt)',
  tools:[['calendar.free_slots','range="30d"'],['diagram.mermaid','kind="gantt"']],say:'Разбил проект на три трека, с учётом свободных окон в вашем календаре. Мозг готов к концу месяца.',
  data:{code:`gantt
  title MyJarvis — план на месяц
  dateFormat YYYY-MM-DD
  axisFormat %d.%m
  section Мозг
  Персона и промпт      :done, a1, 2026-10-15, 2d
  Инструменты (tools)   :active, a2, after a1, 5d
  Память и граф         :a3, after a2, 5d
  section Голос
  Wake word + VAD       :b1, 2026-10-19, 4d
  Whisper STT           :b2, after b1, 3d
  TTS + перебивание     :b3, after b2, 5d
  section Интерфейс
  HUD                   :c1, 2026-10-24, 6d
  Умный дом             :c2, after c1, 5d`}},
 btc:{ask:'Покажи график биткоина за месяц',re:/биткоин|bitcoin|btc|курс|акци|график/i,icon:'📈',type:'chart',title:'BTC/USD · 30 дней',
  tools:[['finance.get_prices','symbol="BTC-USD", days=30']],say:'Вот динамика за тридцать дней, сэр. Данные в макете демонстрационные, это не реальный курс.',
  data:(()=>{const v=walk(30,98000,.045);return{kpis:[['Сейчас','$'+v[29].toLocaleString('ru-RU')],['За месяц',((v[29]/v[0]-1)*100).toFixed(1)+'%',v[29]>=v[0]?'up':'dn'],['Макс','$'+Math.max(...v).toLocaleString('ru-RU')],['Мин','$'+Math.min(...v).toLocaleString('ru-RU')]],
   chart:{type:'line',data:{labels:days(30),datasets:[{label:'BTC',data:v,borderColor:'#00d4ff',backgroundColor:'rgba(0,212,255,.12)',fill:true,tension:.35,pointRadius:0,borderWidth:2}]},options:{plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:6}}}}}}})()},
 money:{ask:'Куда ушли мои деньги в сентябре?',re:/деньг|расход|трат|бюджет/i,icon:'💸',type:'chart',title:'Расходы · сентябрь',
  tools:[['bank.transactions','month="2026-09"'],['python.exec','groupby(category)']],say:'Всего сто восемь тысяч шестьсот. Больше всего ушло на жильё и еду. Подписки выросли: из шести сервисов двумя вы не пользуетесь два месяца — отменить?',
  data:{kpis:[['Всего','108 600 ₽'],['vs август','+7.2%','dn'],['Подписки','3 900 ₽']],chart:{type:'doughnut',data:{labels:['Жильё','Еда','Развлечения','Транспорт','Здоровье','Подписки'],datasets:[{data:[45000,32400,12500,8700,6100,3900],backgroundColor:['#00d4ff','#3dffa8','#b48cff','#ffb547','#ff4d5e','#5ff3ff'],borderColor:'#03080d',borderWidth:2}]},options:{plugins:{legend:{position:'right'}},cutout:'62%'}}}},
 hourly:{ask:'Погода по часам на сегодня',re:/по часам|почасов|дожд.*когда|когда.*дожд/i,icon:'🌦',type:'chart',title:'Погода · по часам',
  tools:[['get_weather','city="Москва", hourly=true']],say:'Дождь начнётся около шестнадцати часов, вероятность до восьмидесяти процентов. Зонт лучше взять, сэр.',
  data:{kpis:[['Сейчас','+11°'],['Макс','+13°'],['Дождь с','16:00','dn']],chart:{data:{labels:['08','10','12','14','16','18','20','22'],datasets:[{type:'line',label:'°C',data:[7,9,12,13,12,10,9,8],borderColor:'#ffb547',tension:.4,yAxisID:'y',pointRadius:3},{type:'bar',label:'Дождь %',data:[5,5,10,30,80,70,40,20],backgroundColor:'rgba(0,212,255,.35)',yAxisID:'y1',borderRadius:4}]},options:{scales:{y:{position:'left'},y1:{position:'right',max:100,grid:{display:false}}}}}}},
 article:{ask:'Прочитай статью и перескажи главное',re:/стать|прочитай|перескаж|ссылк/i,icon:'📰',type:'article',title:'Пересказ статьи',
  tools:[['web.fetch','url="https://habr.com/ru/articles/…"'],['readability.extract','→ 6 140 слов'],['llm.summarize','style="tldr+bullets"']],say:'Прочитал. Коротко: главный враг голосового агента — задержка, и побеждают её стримингом на каждом этапе. Пять ключевых тезисов на экране.',
  data:{source:'habr.com',url:'https://habr.com/ru/articles/… (пример)',title:'Голосовой агент с задержкой меньше 500 мс: что мы поняли за год',author:'пример статьи для макета',minutes:24,readIn:'3.1 с',
   tldr:'Главный враг голосового ассистента — не качество модели, а пауза перед ответом. Её побеждают стримингом на каждом этапе и умным определением конца реплики.',
   bullets:['Пользователь ощущает паузу дольше 800 мс как «тупит»; цель — 500 мс до первого звука.','Фиксированный таймаут тишины (1 с) — худшее решение; turn-detection модель экономит 300–600 мс.','LLM нужно стримить, а TTS запускать по первому законченному предложению.','Перебивание (barge-in) важнее красивого голоса: без него разговор ощущается как автоответчик.','Filler-фразы («секунду, смотрю…») маскируют долгие вызовы инструментов.'],
   quotes:['Пользователи прощают ошибку распознавания, но не прощают тишину.'],
   entities:['Silero VAD','faster-whisper','Claude','ElevenLabs','LiveKit','WebRTC'],sentiment:'практическая · оптимистичная'}},
 video:{ask:'Посмотри видео и сделай конспект с таймкодами',re:/видео|youtube|ютуб|ролик|конспект/i,icon:'🎬',type:'video',title:'Конспект видео',
  tools:[['yt_dlp.download','url="youtu.be/…"'],['whisper.transcribe','27:41 → 4 380 слов'],['vision.keyframes','every=10s → 166 кадров'],['llm.chapters','']],say:'Посмотрел все двадцать семь минут. Разбил на семь глав и отметил три ключевых кадра. Итоговая задержка у автора — полторы секунды.',
  data:{title:'Собираю JARVIS на Raspberry Pi 5 за выходные',channel:'пример канала',duration:'27:41',sec:1661,
   chapters:[{t:'00:00',s:0,title:'Что будем строить',note:'Цель: офлайн-ассистент для квартиры за 15 000 ₽'},{t:'02:15',s:135,title:'Железо',note:'Pi 5 (8 ГБ), ReSpeaker Lite, колонка, корпус на 3D-принтере'},{t:'06:40',s:400,title:'Wake word',note:'openWakeWord, обучение «Джарвис» на 3 000 синтетических фраз'},{t:'11:05',s:665,title:'Whisper vs Vosk',note:'Vosk быстрее в 4 раза, Whisper точнее; выбор — whisper tiny + int8'},{t:'15:30',s:930,title:'Подключаем LLM и tools',note:'Цикл tool_use, 6 функций, системный промпт с персоной'},{t:'21:10',s:1270,title:'Home Assistant',note:'REST API, свет и шторы, сцена «Кино»'},{t:'25:20',s:1520,title:'Итоги',note:'Задержка 1.4 с, главная проблема — эхо от собственной колонки'}],
   frames:[{t:'06:52',cap:'Схема подключения микрофона к GPIO'},{t:'15:48',cap:'Код tool-цикла на экране'},{t:'21:30',cap:'Демо: свет включается голосом'}],
   summary:'Рабочий офлайн-джарвис на Pi реален, но медленный. Автор советует вынести LLM на ПК или в облако, а Pi оставить «ушами и ртом».'}},
 graph:{ask:'Покажи граф того, что ты знаешь обо мне',re:/граф|что ты знаешь|связ/i,icon:'🕸',type:'graph',title:'Граф знаний',
  tools:[['memory.graph_query','MATCH (me)-[*1..2]-(n) RETURN *']],say:'Вот всё, что я о вас помню, в виде графа. Узлы можно двигать мышкой.',data:KG},
 table:{ask:'Сравни микрофоны для своей колонки',re:/сравни|сравнен|таблиц|микрофон/i,icon:'📊',type:'table',title:'Сравнение микрофонов',
  tools:[['web_search','"best microphone array voice assistant"'],['web.fetch','×5 обзоров'],['llm.extract_table','']],say:'Сравнил четыре варианта. Для начала рекомендую ReSpeaker Lite: у него есть аппаратное подавление эха. Цены примерные.',
  data:{columns:['Модель','Цена ~','Микрофоны','Шумодав / эхо','Для чего'],best:1,rows:[['ReSpeaker 4-Mic (Pi HAT)','$35','4','программный','Pi, эксперименты'],['ReSpeaker Lite (XMOS)','$25','2','аппаратный AEC','колонка с музыкой'],['ESP32-S3-BOX-3','$45','2','AFE Espressif','сателлит в комнату + экран'],['USB-конференц-микрофон','$40–80','1–3','встроенный','рабочий стол']]}},
 rag:{ask:'Что в договоре аренды сказано про животных?',re:/договор|документ|pdf|животн/i,icon:'📄',type:'rag',title:'Ответ по документу (RAG)',
  tools:[['docs.search','file="Договор_аренды.pdf", k=3'],['llm.answer','with_citations=true']],say:'Животные разрешены только с письменного согласия арендодателя. Залог при этом увеличивается на десять тысяч рублей. Ссылки на пункты договора на экране.',
  data:{file:'Договор_аренды.pdf · 14 стр. · 212 чанков',answer:'Держать животных можно <b>только с письменного согласия арендодателя</b> <sup data-s="0">[1]</sup>. В этом случае страховой депозит увеличивается на <b>10 000 ₽</b> <sup data-s="1">[2]</sup>, а ущерб, причинённый животными (мебель, полы, двери), арендатор возмещает полностью и сверх депозита <sup data-s="2">[3]</sup>.',
   sources:[{p:'стр. 4, п. 4.7',score:.91,text:'Арендатор вправе содержать в Помещении домашних животных <mark>исключительно при наличии письменного согласия Арендодателя</mark>…'},{p:'стр. 6, п. 6.2',score:.87,text:'…при содержании домашних животных размер Обеспечительного платежа <mark>увеличивается на 10 000 (десять тысяч) рублей</mark>.'},{p:'стр. 9, п. 8.4',score:.79,text:'Арендатор <mark>возмещает в полном объёме ущерб</mark>, причинённый имуществу Арендодателя, в том числе домашними животными…'}]}},
 plan:{ask:'Исследуй рынок умных колонок и сделай отчёт',re:/исследу|отч[её]т|рынок|ресёрч|research/i,icon:'🤖',type:'plan',title:'Агент: многошаговая задача',
  tools:[['agent.plan','goal="отчёт по рынку колонок"']],say:'Запустил исследование. Три под-агента работают параллельно, план и прогресс на экране.',
  data:{steps:[{a:'планировщик',t:'Разбить задачу на подзадачи',r:'5 подзадач, 3 параллельно'},{a:'поисковик',t:'web_search × 6 запросов',r:'найдено 41 ссылка, отобрано 9'},{a:'читатель',t:'Прочитать 9 источников',r:'≈ 38 000 слов → 9 конспектов'},{a:'аналитик',t:'Извлечь цены, доли рынка, фичи в таблицу',r:'таблица 12 × 7'},{a:'критик',t:'Проверить противоречия между источниками',r:'2 расхождения, помечены'},{a:'писатель',t:'Написать отчёт и сохранить',r:'✓ 2 стр. + таблица → Notion / «Рынок колонок»'}]}},
 code:{ask:'Напиши скрипт, который переименует фото по дате съёмки',re:/скрипт|напиши код|переимен|python/i,icon:'💻',type:'code',title:'Код + запуск',
  tools:[['code.write','lang="python"'],['code.run','sandbox=true, dry_run=false']],say:'Скрипт написан и запущен. Переименовано двести четырнадцать фото, три файла без даты съёмки пропущены.',
  data:{lang:'python',code:`from pathlib import Path
from datetime import datetime
from PIL import Image

src = Path("~/Pictures/Import").expanduser()
for p in sorted(src.glob("*.jpg")):
    raw = Image.open(p).getexif().get(306)   # тег DateTime
    if not raw:
        print("⚠ нет даты:", p.name); continue
    d = datetime.strptime(raw, "%Y:%m:%d %H:%M:%S")
    new = p.with_name(d.strftime("%Y-%m-%d_%H-%M-%S") + p.suffix)
    p.rename(new); print("✓", p.name, "→", new.name)`,
   output:`✓ IMG_4021.jpg → 2026-08-14_19-02-11.jpg
✓ IMG_4022.jpg → 2026-08-14_19-02-36.jpg
⚠ нет даты: screenshot_01.jpg
✓ DSC_0193.jpg → 2026-09-03_07-45-50.jpg
…
Готово: 214 переименовано, 3 пропущено · 1.8 с`}},
 map:{ask:'Сколько ехать до офиса?',re:/ехать|маршрут|дорог|пробк|офис/i,icon:'🗺',type:'map',title:'Маршрут',
  tools:[['maps.route','from="дом", to="офис", mode="car"'],['calendar.next_event','']],say:'Двадцать четыре минуты, на Садовом пробка. Чтобы успеть к стендапу в десять, выезжайте в девять двадцать. Вызвать Хэппи?',
  data:{eta:'24 мин',dist:'11.3 км',traffic:'6 баллов',leave:'09:20',steps:['Ленинский пр-т — 3.2 км, свободно','Садовое кольцо — 4.1 км, пробка +7 мин','Новый Арбат — 2.6 км, плотно','Пресненская наб. — 1.4 км, свободно']}},
 timeline:{ask:'Расскажи историю голосовых ассистентов',re:/истори|таймлайн|timeline|хронолог/i,icon:'⏳',type:'timeline',title:'История голосовых ассистентов',
  tools:[['web_search','"history of voice assistants"']],say:'От машины, понимавшей шестнадцать слов, до агентов, которые сами управляют компьютером, — за шестьдесят лет.',
  data:{items:[['1961','IBM Shoebox понимает 16 слов и цифры'],['1966','ELIZA — первый чат-бот'],['1997','Dragon NaturallySpeaking — диктовка на ПК'],['2008','JARVIS в «Железном человеке» задаёт мечту'],['2011','Siri в iPhone 4S'],['2014','Amazon Alexa и колонка Echo'],['2016','Google Assistant'],['2022','ChatGPT: LLM умеют разговаривать'],['2024','Голосовой режим в реальном времени, ~300 мс'],['сейчас','Агенты с инструментами, памятью и зрением']]}},
 email:{ask:'Ответь Пеппер, что я опоздаю на обед',re:/ответь|письм|напиши (ей|ему)|email|почт/i,icon:'✉️',type:'email',title:'Черновик письма',
  tools:[['email.search','from="Пеппер", latest=1'],['email.draft','']],say:'Черновик готов. Отправлять без вашего подтверждения не буду — нажмите «Отправить» или скажите, что поправить.',
  data:{to:'Пеппер Поттс <pepper@example.com>',subject:'Re: Обед в 13:30',body:'Пеппер, привет!\n\nЗадерживаюсь на тесте костюма — буду минут на 20 позже, к 13:50. Закажи, пожалуйста, мне суши, как обычно.\n\nТони'}},
 screen:{ask:'Что у меня на экране? Почему код падает?',re:/экран|скриншот|почему.*пада|ошибк|баг/i,icon:'🖥',type:'screen',title:'Анализ экрана',
  tools:[['screen.capture','display=1'],['vision.analyze','model="claude"']],say:'Вижу проблему, сэр: в строке пять await вызывается вне асинхронной функции. Исправление на экране.',
  data:{file:'jarvis/tools.py',lines:['import httpx','','def get_weather(city: str):','    url = f"https://api.weather/{city}"','    r = await httpx.AsyncClient().get(url)','    return r.json()["temp"]'],bad:4,anno:'SyntaxError: \'await\' outside async function — get_weather объявлена без async',diff:['- def get_weather(city: str):','+ async def get_weather(city: str):']}},
};

/* ---------- рендер карточки ---------- */
function renderCard(b){
  const c=document.createElement('div');c.className='card';
  c.innerHTML=`<div class="ch">${b.icon} ${esc(b.title)}<span class="ty">type: "${b.type}"</span></div><div class="cb"></div>
   <div class="cf"><button class="js">{ } JSON модели</button><span>tools: ${b.tools.map(t=>t[0]).join(' → ')}</span></div><pre class="json" hidden></pre>`;
  const pre=c.querySelector('pre.json');
  c.querySelector('.js').onclick=()=>{if(!pre.textContent)pre.textContent=JSON.stringify({type:b.type,...b.data},null,2);pre.hidden=!pre.hidden};
  (R[b.type]||(()=>{}))(c.querySelector('.cb'),b.data,b);
  return c;
}
async function mer(el,code){
  if(!window.mermaid){el.innerHTML=`<pre class="code">${esc(code)}</pre>`;return}
  try{const {svg}=await mermaid.render('mmd'+(++uid),code);el.innerHTML=svg}catch(e){el.innerHTML=`<pre class="code">${esc(code)}</pre>`}
}
const R={
 mermaid(el,d){el.innerHTML='<div class="mer">рисую…</div>';mer(el.firstChild,d.code)},
 chart(el,d){
  el.innerHTML=(d.kpis?`<div class="kpis">${d.kpis.map(k=>`<div>${k[0]}<b class="${k[2]||''}">${k[1]}</b></div>`).join('')}</div>`:'')+'<div class="chartbox"><canvas></canvas></div>';
  if(window.Chart)setTimeout(()=>new Chart(el.querySelector('canvas'),{...structuredClone(d.chart),options:{maintainAspectRatio:false,...d.chart.options}}),30);
 },
 article(el,d){el.innerHTML=`<div class="art"><h5>${esc(d.title)}</h5><div class="meta">${d.source} · ${d.author} · ${d.minutes} мин чтения → прочитано за ${d.readIn} · тон: ${d.sentiment}</div>
  <div class="tldr"><b>TL;DR</b> ${esc(d.tldr)}</div><ul>${d.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${d.quotes.map(q=>`<blockquote>«${esc(q)}»</blockquote>`).join('')}
  <div class="ents">${d.entities.map(e=>`<span class="tag">${e}</span>`).join('')}</div>
  <div class="how"><i>как:</i><span>fetch</span>→<span>Readability</span>→<span>Markdown</span>→<span>LLM</span>→<span>JSON</span></div></div>`},
 video(el,d){
  el.innerHTML=`<div class="vp"><div class="dur">${d.duration}</div><div class="play">▶</div><div class="vt">${esc(d.title)}<small>${d.channel}</small></div></div>
  <div class="vbar"><div class="fill" style="width:0"></div>${d.chapters.map(c=>`<div class="mk" style="left:${c.s/d.sec*100}%"></div>`).join('')}</div>
  <div class="chap">${d.chapters.map((c,i)=>`<a data-i="${i}">${c.t}</a><span>${esc(c.title)}</span><span class="note">${esc(c.note)}</span>`).join('')}</div>
  <div class="frames">${d.frames.map(f=>`<div><b>${f.t}</b>${esc(f.cap)}</div>`).join('')}</div>
  <div class="tldr" style="margin-top:10px"><b>Вывод:</b> ${esc(d.summary)}</div>
  <div class="how"><i>как:</i><span>yt-dlp</span>→<span>Whisper</span>+<span>кадры → vision</span>→<span>LLM главы</span></div>`;
  el.querySelectorAll('.chap a').forEach(a=>a.onclick=()=>{const c=d.chapters[a.dataset.i];el.querySelector('.fill').style.width=c.s/d.sec*100+'%';toast(`▶ перемотка на ${c.t} — «${c.title}»`)});
 },
 graph(el,d,b){drawGraph(el,d,b.big?520:340)},
 table(el,d){el.innerHTML=`<div class="tbl"><table class="dt"><tr>${d.columns.map(c=>`<th>${c}</th>`).join('')}</tr>${d.rows.map((r,i)=>`<tr class="${i===d.best?'best':''}">${r.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table></div>`},
 rag(el,d){
  el.innerHTML=`<div style="font:11px var(--mono);color:var(--mut);margin-bottom:8px">📎 ${d.file}</div><div class="ans">${d.answer}</div>
  ${d.sources.map((s,i)=>`<div class="src" data-i="${i}"><div class="sh"><span>[${i+1}] ${s.p}</span><span>сходство ${s.score}<span class="score"><i style="width:${s.score*100}%"></i></span></span></div>${s.text}</div>`).join('')}
  <div class="how"><i>как:</i><span>PDF</span>→<span>чанки по 512 токенов</span>→<span>эмбеддинги</span>→<span>top-k=3</span>→<span>ответ со ссылками</span></div>`;
  el.querySelectorAll('sup').forEach(s=>s.onmouseenter=()=>{el.querySelectorAll('.src').forEach(x=>x.classList.toggle('hl',x.dataset.i===s.dataset.s))});
 },
 plan(el,d){
  el.innerHTML=d.steps.map(s=>`<div class="pl"><div class="st"></div><div>${esc(s.t)}</div><div class="ag">${s.a}</div><div class="res">ожидание…</div></div>`).join('');
  const rows=[...el.querySelectorAll('.pl')];
  (async()=>{for(let i=0;i<rows.length;i++){rows[i].classList.add('run');rows[i].querySelector('.res').textContent='выполняется…';await sleep(900+Math.random()*700);rows[i].classList.replace('run','ok');rows[i].querySelector('.res').textContent=d.steps[i].r}})();
 },
 code(el,d){el.innerHTML=`<pre class="code">${esc(d.code)}</pre><div class="term">$ python rename_photos.py\n${esc(d.output)}</div>`},
 map(el,d){
  el.innerHTML=`<div class="mapw"><svg viewBox="0 0 400 240">
   ${Array.from({length:9},(_,i)=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="240" stroke="rgba(0,212,255,.07)"/>`).join('')}${Array.from({length:6},(_,i)=>`<line x1="0" y1="${i*48}" x2="400" y2="${i*48}" stroke="rgba(0,212,255,.07)"/>`).join('')}
   <path d="M0 170 C80 150 120 200 200 180 S330 120 400 140" stroke="rgba(0,120,200,.35)" stroke-width="14" fill="none"/>
   <circle cx="200" cy="120" r="70" stroke="rgba(255,255,255,.08)" stroke-width="6" fill="none"/>
   <path d="M40 215 L120 205 L140 160" stroke="#3dffa8" stroke-width="5" fill="none" stroke-linecap="round"/>
   <path d="M140 160 A70 70 0 0 1 200 50" stroke="#ff4d5e" stroke-width="5" fill="none" stroke-linecap="round"/>
   <path d="M200 50 L290 60" stroke="#ffb547" stroke-width="5" fill="none" stroke-linecap="round"/>
   <path d="M290 60 L350 40" stroke="#3dffa8" stroke-width="5" fill="none" stroke-linecap="round"/>
   <path class="route" d="M40 215 L120 205 L140 160 A70 70 0 0 1 200 50 L290 60 L350 40" stroke="#fff" stroke-width="1.5" fill="none"/>
   <circle cx="40" cy="215" r="7" fill="#00d4ff"/><text x="50" y="232" fill="#cfefff" font-size="11">Дом</text>
   <circle cx="350" cy="40" r="7" fill="#ffb547"/><text x="320" y="24" fill="#cfefff" font-size="11">Офис</text>
   <text x="210" y="140" fill="#ff8d98" font-size="10">Садовое +7 мин</text></svg>
   <div><div class="big">${d.eta}</div><div style="font:11px var(--mono);color:var(--mut)">${d.dist} · пробки ${d.traffic}</div>
   <div class="tldr" style="margin:8px 0">Выезд в <b>${d.leave}</b>, чтобы успеть на стендап в 10:00</div><ol>${d.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div></div>`},
 timeline(el,d){el.innerHTML=`<div class="tl">${d.items.map((x,i)=>`<div class="it ${i===d.items.length-1?'now':''}"><b>${x[0]}</b>${esc(x[1])}</div>`).join('')}</div>`},
 email(el,d){
  el.innerHTML=`<div class="mail"><div class="row"><span>Кому</span>${esc(d.to)}</div><div class="row"><span>Тема</span>${esc(d.subject)}</div><div class="body" contenteditable="true">${esc(d.body)}</div>
  <div class="acts"><button class="btn snd">ОТПРАВИТЬ</button><button class="btn ghost">ИЗМЕНИТЬ ТОН</button></div></div>`;
  el.querySelector('.snd').onclick=e=>{e.target.textContent='✓ ОТПРАВЛЕНО (ДЕМО)';e.target.disabled=true;log('email.send ✓ (после подтверждения)','ok')};
  el.querySelector('.ghost').onclick=()=>{el.querySelector('.body').textContent='Уважаемая Пеппер,\n\nК сожалению, задерживаюсь примерно на 20 минут. Прошу прощения за неудобства.\n\nС уважением,\nЭнтони';toast('LLM переписала письмо в официальном тоне')};
 },
 screen(el,d){
  el.innerHTML=`<div style="font:11px var(--mono);color:var(--mut);margin-bottom:6px">📸 скриншот · ${d.file}</div><div class="ed">${d.lines.map((l,i)=>`<div class="${i===d.bad?'bad':''}"><i>${i+1}</i>${esc(l)}</div>`).join('')}<div class="anno">${esc(d.anno)}</div></div>
  <div class="diff">${d.diff.map(l=>`<div class="${l[0]==='-'?'m':'p'}">${esc(l)}</div>`).join('')}</div>
  <div class="how"><i>как:</i><span>screencapture</span>→<span>vision-модель</span>→<span>ответ + патч</span></div>`},
};

/* ---------- граф (d3 force) ---------- */
function drawGraph(el,data,H){
  if(!window.d3){el.innerHTML='<pre class="code">'+esc(data.links.map(l=>`${l.source} —${l.label}→ ${l.target}`).join('\n'))+'</pre>';return}
  const W=640;
  const svg=d3.select(el).append('svg').attr('viewBox',[0,0,W,H]).attr('class','gsvg');
  const g=svg.append('g');
  svg.call(d3.zoom().scaleExtent([.4,3]).on('zoom',e=>g.attr('transform',e.transform)));
  const nodes=data.nodes.map(d=>({...d})),links=data.links.map(d=>({...d}));
  const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(d=>d.id).distance(H>400?95:70))
    .force('charge',d3.forceManyBody().strength(H>400?-420:-260)).force('center',d3.forceCenter(W/2,H/2)).force('collide',d3.forceCollide(30));
  const link=g.append('g').selectAll('line').data(links).join('line').attr('stroke','rgba(0,212,255,.35)').attr('stroke-width',1.2);
  const ll=g.append('g').selectAll('text').data(links).join('text').attr('class','gl').text(d=>d.label);
  const node=g.append('g').selectAll('g').data(nodes).join('g').style('cursor','pointer')
    .call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));
  node.append('circle').attr('r',d=>d.id==='me'?20:12).attr('fill',d=>GCOL[d.type]).attr('fill-opacity',.22).attr('stroke',d=>GCOL[d.type]).attr('stroke-width',1.6).style('filter',d=>`drop-shadow(0 0 6px ${GCOL[d.type]})`);
  node.append('text').attr('class','gn').attr('dy',d=>d.id==='me'?34:26).text(d=>d.label);
  node.on('mouseenter',(e,d)=>{link.attr('stroke',l=>l.source.id===d.id||l.target.id===d.id?GCOL[d.type]:'rgba(0,212,255,.15)').attr('stroke-width',l=>l.source.id===d.id||l.target.id===d.id?2.4:1)})
      .on('mouseleave',()=>link.attr('stroke','rgba(0,212,255,.35)').attr('stroke-width',1.2));
  sim.on('tick',()=>{
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    ll.attr('x',d=>(d.source.x+d.target.x)/2).attr('y',d=>(d.source.y+d.target.y)/2-3);
    node.attr('transform',d=>`translate(${d.x},${d.y})`);
  });
}

/* ---------- чипы «богатых» ответов в HUD ---------- */
(()=>{const h=document.createElement('div');h.className='chiphd';h.textContent='БОГАТЫЕ ОТВЕТЫ · ДИАГРАММЫ · ГРАФИКИ · СТАТЬИ · ВИДЕО';$('#chips').append(h);
 Object.values(RICH).forEach(b=>{const c=document.createElement('button');c.className='chip rich';c.textContent=b.icon+' '+b.ask;c.onclick=()=>handle(b.ask);$('#chips').append(c)})})();

/* ---------- галерея ---------- */
let galDone=false;
function buildGallery(){
  if(galDone)return;galDone=true;
  Object.values(RICH).forEach(b=>{
    const w=document.createElement('div');
    w.innerHTML=`<div class="gq">🗣 «${esc(b.ask)}»<button>▶ спросить</button></div>`;
    w.querySelector('button').onclick=()=>{goTab('hud');setTimeout(()=>handle(b.ask),350)};
    w.append(renderCard(b));$('#galgrid').append(w);
  });
}

/* ---------- данные внутри ---------- */
window.HIST=[];
let toolSeq=0;
window.histTools=tools=>{
  const uses=tools.map(([n,a])=>({type:'tool_use',id:'toolu_'+(++toolSeq).toString().padStart(4,'0'),name:n,input:{args:a}}));
  HIST.push({role:'assistant',content:uses});
  HIST.push({role:'user',content:uses.map(u=>({type:'tool_result',tool_use_id:u.id,content:'{"ok":true}'}))});
};
window.renderHist=()=>{const h=$('#hist');if(!h)return;h.textContent=JSON.stringify({model:'claude-sonnet-5-5',system:'Ты — Джарвис, британский дворецкий. Кратко, с иронией, обращайся «сэр».',tools:['…'+(Object.keys(RICH).length+12)+' инструментов'],messages:HIST},null,2);h.scrollTop=1e9};
renderHist();

function bus(ev,payload){const b=$('#bus');if(!b)return;const d=document.createElement('div');d.innerHTML=`<span style="color:#4f7184">${new Date().toISOString().slice(11,23)}</span> {"event":"<span class="e">${ev}</span>", <span class="v">${esc(JSON.stringify(payload).slice(1,-1))}</span>}`;b.append(d);while(b.children.length>200)b.firstChild.remove();b.scrollTop=1e9}
const _setState=setState;setState=s=>{_setState(s);bus('state',{value:s})};
const _addTool=addTool;addTool=(n,a)=>{_addTool(n,a);bus('tool_call',{name:n,args:a})};
const _addMsg=addMsg;addMsg=(w,t)=>{bus('transcript',{role:w==='u'?'user':'assistant'});return _addMsg(w,t)};
$$('.sw').forEach(s=>s.addEventListener('click',()=>bus('device',{id:s.dataset.dev,on:s.classList.contains('on')})));
setInterval(()=>bus('telemetry',{cpu:$('#cpuv').textContent,ram:$('#ramv').textContent}),5000);
bus('hello',{client:'hud',version:'5.5'});

/* граф + тройки */
let dataDone=false;
function buildData(){
  renderHist();
  if(dataDone)return;dataDone=true;
  drawGraph($('#biggraph'),KG,520);
  $('#legend').innerHTML=Object.entries(GTYPE).map(([k,v])=>`<span><i style="background:${GCOL[k]}"></i>${v}</span>`).join('');
  const lab=id=>KG.nodes.find(n=>n.id===id).label;
  $('#triples').innerHTML=KG.links.map(l=>`<div>(${lab(l.source)}) <b>—${l.label}→</b> (${lab(l.target)})</div>`).join('');
  $$('#data [data-mer]').forEach(el=>mer(el,el.dataset.mer));
  vsearch();
}

/* векторная память: игрушечные эмбеддинги (хэш основ слов → 96 измерений) */
const MEMS=['Сэр пьёт чёрный кофе без сахара каждое утро','Любимая группа — AC/DC, особенно Back in Black','Обед с Пеппер по пятницам в 13:30','Хэппи водит Audi R8 и забирает сэра в 9:20','Сэр ходит в зал по вторникам и четвергам','Аллергия на клубнику','Проект MyJarvis: Python + Claude + Home Assistant','Wi-Fi пароль от гостевой сети спрашивать у Пеппер','Любит суши, особенно с лососем','Костюм Mk-85 на тестах по средам','Машину ставить на подземную парковку, место 42','Не беспокоить после 23:00, кроме срочного'];
function emb(s){const v=new Float32Array(96);s.toLowerCase().replace(/[^a-zа-яё0-9 ]/gi,' ').split(/\s+/).filter(w=>w.length>2).forEach(w=>{const st=w.slice(0,4);let h=0;for(const ch of st)h=(h*31+ch.charCodeAt(0))>>>0;for(let k=0;k<3;k++){v[(h>>>(k*5))%96]+=1-k*.3}});const n=Math.hypot(...v)||1;return v.map(x=>x/n)}
const SYN={пью:'кофе',пить:'кофе',утр:'утро',машин:'audi парковку',еда:'суши обед',ем:'суши',музык:'группа ac/dc',спорт:'зал',трениров:'зал',пароль:'wi-fi',сплю:'беспокоить 23:00',ночь:'беспокоить 23:00',аллерг:'клубнику',работ:'проект myjarvis'};
function expand(q){let x=q.toLowerCase();for(const k in SYN)if(x.includes(k))x+=' '+SYN[k];return x}
const MEMV=MEMS.map(emb);
function paint(cv,v){const c=cv.getContext('2d'),img=c.createImageData(96,1);v.forEach((x,i)=>{const t=Math.min(1,x*2.2);img.data.set([t*60,80+t*175,120+t*135,40+t*215],i*4)});c.putImageData(img,0,0)}
function vsearch(){
  const qv=emb(expand($('#vq').value));paint($('#vqv'),qv);
  const res=MEMS.map((m,i)=>({m,v:MEMV[i],s:qv.reduce((a,x,k)=>a+x*MEMV[i][k],0)})).sort((a,b)=>b.s-a.s).slice(0,5);
  $('#vres').innerHTML='';
  res.forEach((r,i)=>{const d=document.createElement('div');d.className='vrow';d.innerHTML=`<span>${i===0&&r.s>.15?'🎯 ':''}${esc(r.m)}</span><span class="sc" style="color:${r.s>.3?'var(--green)':r.s>.12?'var(--gold)':'var(--mut)'}">${r.s.toFixed(3)}</span><canvas width="96" height="1"></canvas>`;$('#vres').append(d);paint(d.querySelector('canvas'),r.v)});
}
$('#vq').addEventListener('input',vsearch);

window.onTab=t=>{if(t==='gal')buildGallery();if(t==='data')buildData();if(t==='how')$$('#how [data-mer]').forEach(el=>mer(el,el.dataset.mer))};
