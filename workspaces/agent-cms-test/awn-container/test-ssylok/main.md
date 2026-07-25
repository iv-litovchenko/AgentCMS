# Тест ссылок — однофайловая память

Все ссылки ниже должны открываться по клику в превью и в редакторе.

## 1. Темы (manifest)

| Тип | Ссылка |
| --- | --- |
| Текущая тема, относительно | [Тест ссылок (manifest.md)](manifest.md) |
| Текущая тема, абсолютный путь | [Тест ссылок (abs)](/awn-container/test-ssylok/manifest.md) |
| Соседняя тема, относительно | [PHP (../php/manifest.md)](../php/manifest.md) |
| Соседняя тема, абсолютный путь | [PHP (abs)](/awn-container/php/manifest.md) |
| Другая тема | [Тест всех полей](/awn-container/test-vseh-poley/manifest.md) |

## 2. Записи в слоте main (многофайловая память)

| Тип | Ссылка |
| --- | --- |
| Относительно main.md | [Примеры ЧПУ](awn-storage/main/chpu-primery.md) |
| Абсолютный workspace-путь | [Примеры ЧПУ (abs)](/awn-container/test-ssylok/awn-storage/main/chpu-primery.md) |
| Раздел в теме PHP | [PHP: OOP](/awn-container/php/awn-storage/main/oop/manifest.md) |

## 3. Записи inbox

| Тип | Ссылка |
| --- | --- |
| Запись | [Первая запись](awn-storage/inbox/demo-razdel/pervaya-zapis.md) |
| Раздел (категория) | [Демо-раздел](awn-storage/inbox/demo-razdel/manifest.md) |
| Абсолютный путь | [Первая запись (abs)](/awn-container/test-ssylok/awn-storage/inbox/demo-razdel/pervaya-zapis.md) |

## 4. CHPU-URL (браузер, тот же агент)

| Тип | Ссылка |
| --- | --- |
| Навигация темы | [~nav](http://localhost:3000/agent-cms-test/awn-container/test-ssylok/~nav) |
| Однофайловая память | [main](http://localhost:3000/agent-cms-test/awn-container/test-ssylok/main) |
| Запись main | [chpu-primery](http://localhost:3000/agent-cms-test/awn-container/test-ssylok/awn-storage/main/chpu-primery) |
| Карточка записи | [chpu-primery ~preview](http://localhost:3000/agent-cms-test/awn-container/test-ssylok/awn-storage/main/chpu-primery/~preview) |
| Список main | [main ~list](http://localhost:3000/agent-cms-test/awn-container/test-ssylok/awn-storage/main/~list) |
| Тема PHP | [PHP (CHPU)](http://localhost:3000/agent-cms-test/awn-container/php) |

## 5. Прочее

| Тип | Ссылка |
| --- | --- |
| Этот файл (sidecar) | [main.md](main.md) |
| Внешний сайт | [Example.com](https://example.com) |
| Якорь в manifest | [Manifest + якорь](manifest.md#тест-ссылок) |

## 6. Схема раздела (config.yml)

Раздел может переопределять схему полей для своих записей через **`config.yml`** (тот же формат, что у темы):

| Файл | Назначение |
| --- | --- |
| [demo-razdel/config.yml](awn-storage/inbox/demo-razdel/config.yml) | Поле `awn-section-tag` для записей раздела |
| [Первая запись](awn-storage/inbox/demo-razdel/pervaya-zapis.md) | Должна показывать поле из схемы раздела в props |

Цепочка: **тип платформы → config.yml темы → config.yml каждого родительского раздела → frontmatter записи**.

