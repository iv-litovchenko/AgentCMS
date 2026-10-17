---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-importance: 0
awn-emoji: ""
awn-note-todo-sticker: ""
awn-main: false
awn-focus: false
awn-index-exclude-record: false
awn-auto-toc: false
awn-summary: ""
awn-tags: []
awn-taxonomy: {}
awn-viz-graph: {}
awn-viz-mindmap: {}
awn-viz-roadmap: {}
awn-id: 21
awn-type: awn.content.record
awn-create: "2026-10-02T18:09:14.668Z"
awn-owner: ""
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-attachments: []
awn-description: ""
awn-index-exclude-subtree: false
awn-name: Многофайловый поиск - вектрый поиск 1000 файлов
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-10-02T18:09:46.052Z
awn-version: 3
---

Да. На GitHub уже есть почти все строительные блоки, которые тебе нужны. И я бы не искал один «волшебный инструмент», а собрал стек из нескольких независимых модулей.
Для твоей задачи я бы смотрел на такие проекты:

1. **Trafilatura** — извлечение содержимого из HTML. Умеет отделять основной текст от навигации, футеров, рекламы и другого boilerplate. Может отдавать структурированные результаты. ([GitHub](https://github.com/adbar/trafilatura?utm_source=chatgpt.com))


    [GitHub — Trafilatura](https://github.com/adbar/trafilatura?utm_source=chatgpt.com)
2. **Scrapy** — уже полноценный движок crawling/extraction. Причём в его документации прямо разделены две задачи: очистка HTML и извлечение конкретных значений вроде цены, даты или телефона. ([Scrapy](https://doc.scrapy.org/en/master/topics/extraction.html?utm_source=chatgpt.com))


    [GitHub — Scrapy](https://github.com/scrapy/scrapy?utm_source=chatgpt.com)
3. **Apache Tika** — универсальный слой извлечения текста и метаданных из множества форматов. Это полезно, если Agent CMS со временем выйдет за пределы HTML.
4. **GROBID** — специализированный инструмент для превращения неструктурированных документов в структурированные данные, особенно PDF и научных документов. Для твоих HTML он не главный, но как отдельный extractor может пригодиться. ([GitHub](https://github.com/grobidOrg/grobid/blob/master/doc/Introduction.md?utm_source=chatgpt.com))


    [GitHub — GROBID](https://github.com/kermitt2/grobid?utm_source=chatgpt.com)
5. **LanceDB** — здесь уже слой поиска. Интересно именно то, что он сочетает **vector search + full-text search + SQL**, то есть тебе не приходится использовать векторную БД для абсолютно всех типов запросов. ([GitHub](https://github.com/lancedb/lancedb?utm_source=chatgpt.com))


    [GitHub — LanceDB](https://github.com/lancedb/lancedb?utm_source=chatgpt.com)

И вот для твоей концепции я бы собрал это примерно так:
                 AGENT CMS
                     │
              ┌──────┴──────┐
              │             │
          ORIGINAL       PARSER
          DOCUMENT        LAYER
              │             │
          HTML/PDF      Trafilatura
          DOCX/TXT      Scrapy
              │          Tika
              │             │
              └──────┬──────┘
                     ↓
                TEXT + DOM
                     │
          ┌──────────┼──────────┐
          ↓          ↓          ↓
       FULLTEXT    VECTOR     METADATA
          │          │          │
          └──────────┼──────────┘
                     ↓
                 AGENT QUERY
                     │
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
    SEARCH       EXTRACT        ANALYZE
       ↓             ↓             ↓
    слова          цены        ошибки
    фразы          услуги      факты
    exact          телефоны    сущности
Но есть один модуль, которого я бы **обязательно добавил поверх готовых проектов**: Task/Analysis Engine.
Потому что именно он решает твою идею:
Сегодня:
"Найди все цены"



→ Price Extraction



Завтра:
"Найди орфографические ошибки"



→ Spelling Analysis



Послезавтра:
"Найди все телефоны"



→ Phone Extraction



Потом:
"Найди все упоминания Киары Нургали"



→ Entity Search



Потом:
"Найди всё, что относится к ювелирным услугам"



→ Semantic Search
То есть **тип анализа должен задаваться запросом, а не зашиваться в структуру CMS заранее**.
И здесь, на мой взгляд, у тебя появляется довольно сильная архитектурная формула:
**Raw Data → Universal Parser → Universal Index → Task Engine → Result**
А не:
**Raw Data → заранее придуманные поля price, service, phone, name...**
Это принципиальная разница. В первом варианте твоя система может исследовать данные, которые ты **сама ещё не знаешь как структурировать**.
Если хочешь, я могу следующим сообщением собрать тебе **конкретный список из 15–20 GitHub-проектов именно для Agent CMS**, разбив их по модулям: парсинг → OCR → extraction → NLP → spelling → search → vector → GraphRAG → crawling → storage → orchestration, и отметить, **что готово брать как есть, а что лучше написать самим**.



Да. Я бы для Agent CMS не пытался выбрать один фреймворк. Тебе нужен набор специализированных компонентов. Я проверила актуальные GitHub-проекты и разложила их именно по той архитектуре, которую мы сейчас обсуждаем. ([GitHub](https://github.com/aglio-lab/rag-retrieval-tools?utm_source=chatgpt.com))
**1. Разбор и извлечение из документов**

| **Проект** | **Для чего** |
| ------ | -------- |
| **Trafilatura** | HTML → чистый текст + структура + metadata |
| **Scrapy** | crawling, обход множества страниц, extraction |
| **Unstructured** | универсальный разбор HTML/PDF/DOCX/images и подготовка к RAG |
| **Docling** | сложные документы, таблицы, layout, provenance |
| **Apache Tika** | универсальное извлечение текста и metadata из разных форматов |

Trafilatura особенно интересна для твоих 1000 HTML: она умеет работать не только с текстом, но и с заголовками, списками, таблицами, ссылками, metadata и даже имеет режим, ориентированный на повышенный recall. ([GitHub](https://github.com/adbar/trafilatura?utm_source=chatgpt.com))
[Trafilatura на GitHub](https://github.com/adbar/trafilatura?utm_source=chatgpt.com)
[Scrapy на GitHub](https://github.com/scrapy/scrapy?utm_source=chatgpt.com)
[Unstructured на GitHub](https://github.com/Unstructured-IO/unstructured?utm_source=chatgpt.com)
[Docling на GitHub](https://github.com/docling-project/docling?utm_source=chatgpt.com)
[Apache Tika на GitHub](https://github.com/apache/tika?utm_source=chatgpt.com)
**2. Поиск**
Здесь я бы **не ограничивалась vector DB**.
Нужны как минимум три механизма:
**Full-text / BM25** — точные слова:
найди все «орфографические ошибки»
**Vector search** — смысл:
найди услуги по уходу за волосами
**Metadata/filter search**:
найди документы сайта X за сентябрь.
Для этого стоит посмотреть:

| **Проект** | **Роль** |
| ------ | ---- |
| **OpenSearch** | full-text + hybrid + vector |
| **Qdrant** | vector + metadata/filtering |
| **LanceDB** | vector + full-text + SQL |
| **pgvector** | vector search непосредственно в PostgreSQL |
| **Elasticsearch** | мощный full-text + vector/hybrid |

[Qdrant на GitHub](https://github.com/qdrant/qdrant?utm_source=chatgpt.com)
[LanceDB на GitHub](https://github.com/lancedb/lancedb?utm_source=chatgpt.com)
[pgvector на GitHub](https://github.com/pgvector/pgvector?utm_source=chatgpt.com)
[OpenSearch на GitHub](https://github.com/opensearch-project/OpenSearch?utm_source=chatgpt.com)
[Elasticsearch на GitHub](https://github.com/elastic/elasticsearch?utm_source=chatgpt.com)
**3. NLP и извлечение неизвестных сущностей**
Вот здесь начинается самое интересное для твоего Agent CMS.

| **Проект** | **Что даёт** |
| ------ | -------- |
| **spaCy** | NLP pipeline, NER, classification, linguistic analysis |
| **GLiNER** | извлечение сущностей без заранее обученного фиксированного набора классов |
| **Presidio** | поиск чувствительных сущностей: имена, телефоны, email, документы и т. д. |
| **Transformers** | огромный набор моделей для classification/extraction |
| **LanguageTool** | орфография и грамматика |

Особенно я бы внимательно посмотрела на **GLiNER**.
Он очень хорошо соответствует твоей идее:
Запрос:
"Найди названия услуг и цены"



↓
entities:
SERVICE
PRICE
А потом:
"Найди телефоны и email"



↓
PHONE
EMAIL
То есть тебе не обязательно заранее проектировать в CMS поля price, phone, service, person и т. д.
[GLiNER на GitHub](https://github.com/urchade/GLiNER?utm_source=chatgpt.com)
[spaCy на GitHub](https://github.com/explosion/spaCy?utm_source=chatgpt.com)
[Presidio на GitHub](https://github.com/microsoft/presidio?utm_source=chatgpt.com)
[LanguageTool на GitHub](https://github.com/languagetool-org/languagetool?utm_source=chatgpt.com)
[Transformers на GitHub](https://github.com/huggingface/transformers?utm_source=chatgpt.com)
**4. Оркестрация Agent CMS**
Здесь нужны не столько «базы», сколько системы, которые позволяют соединять инструменты в pipeline.
Я бы рассматривала:
**Haystack**
**LlamaIndex**
**LangChain**
Они позволяют строить цепочки вроде:
Document
 ↓
Parser
 ↓
Chunker
 ↓
Retriever
 ↓
Reranker
 ↓
LLM
 ↓
Extractor
 ↓
Validator
 ↓
Result
Haystack особенно интересен как компонентная архитектура: у него есть интеграции с Qdrant, OpenSearch, pgvector, spaCy, Tika, Unstructured, Transformers, Presidio и множеством других компонентов. ([GitHub](https://github.com/deepset-ai/haystack-core-integrations?utm_source=chatgpt.com))
[Haystack на GitHub](https://github.com/deepset-ai/haystack?utm_source=chatgpt.com)
[LlamaIndex на GitHub](https://github.com/run-llama/llama_index?utm_source=chatgpt.com)
[LangChain на GitHub](https://github.com/langchain-ai/langchain?utm_source=chatgpt.com)
**5. Crawling**
Если Agent CMS должна не только анализировать уже имеющиеся 1000 HTML, но и сама собирать сайты:
**Crawlee** — очень интересный вариант.
Он рассчитан именно на crawling/scraping и может использовать разные стратегии получения данных.
[Crawlee на GitHub](https://github.com/apify/crawlee?utm_source=chatgpt.com)



**Но я бы не ставила все 20 проектов в систему**
Для твоего Agent CMS я бы начала с **ядра из 8 компонентов**:
                 AGENT CMS
                     │
                     ▼
              ┌──────────────┐
              │   STORAGE    │
              │ оригиналы    │
              └──────┬───────┘
                     ↓
               Trafilatura
                     ↓
              структурированный
                  документ
                     │
          ┌──────────┼──────────┐
          ↓          ↓          ↓
       Fulltext   Vector      Metadata
          │          │          │
       OpenSearch   Qdrant      SQL
          │          │          │
          └──────────┼──────────┘
                     ↓
               QUERY ENGINE
                     ↓
             ┌───────┴────────┐
             ↓                ↓
        GLiNER/NLP          LLM
             ↓                ↓
          Extraction       Analysis
             └───────┬────────┘
                     ↓
                 RESULTS
                     ↓
                 Evidence
А **Haystack или свой собственный orchestration layer** соединяет эти инструменты.
И здесь я вижу одну важную особенность именно твоего проекта.
Тебе, возможно, вообще **не стоит делать заранее таблицу services**.
Лучше иметь универсальную сущность примерно такого типа:
Finding
├── type
├── value
├── source_document
├── source_location
├── context
├── confidence
├── extractor
└── created_at
Тогда сегодня:
type = PRICE
value = 2500 ₽
завтра:
type = SPELLING_ERROR
value = "..."
потом:
type = PHONE
value = "+..."
а потом:
type = PERSON
value = "Анна Иванова"
**Вот это уже очень близко к твоей исходной идее Agent CMS как самоизменяемой системы.** Она не обязана знать заранее, какие знания ты однажды захочешь извлечь из своих документов.
И ещё: есть хороший актуальный GitHub-список rag-retrieval-tools, где собраны сотни инструментов именно по parsing, chunking, retrieval, embeddings, reranking и evaluation — его можно использовать как каталог при дальнейшем проектировании. ([GitHub](https://github.com/aglio-lab/rag-retrieval-tools?utm_source=chatgpt.com))