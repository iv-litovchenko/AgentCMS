(function () {
  const TEMPLATES = {
    java: {
      name: "Java / программирование",
      badge: "layer-map",
      body: `# {{topic}}

## Зачем это нужно
Краткий контекст…

## Синтаксис / API
\`\`\`java
// пример кода
\`\`\`

## Типичные ошибки
[мое ошибка]: …

## Повторить
[мое повторить]: …

## Вопросы
[мое вопрос]: …

## Связанные темы
- [[другая тема]]
`,
    },
    english: {
      name: "English",
      badge: "layer-me",
      body: `# {{topic}} — vocabulary

## Words
| word | translation | example |
|------|-------------|---------|
| deploy | развёртывать | We deploy on Fridays |

[мое слово]: schedule — /ˈʃedjuːl/

## Grammar point
…

[мое повторить]: past perfect vs past simple

## Collocations
[мое выражение]: make a decision (not *do*)
`,
    },
    history: {
      name: "История / гуманитарные",
      badge: "layer-road",
      body: `# {{topic}}

@timeline
1848 | Событие | Краткое описание

## Причины
…

## Следствия
…

## Сравнение
| | Вариант A | Вариант B |
|---|-----------|-----------|

[мое важно]: дата экзамена — …

## Источники
[мое источник]: Учебник, стр. 45
`,
    },
  };

  function init() {
    const preview = document.getElementById("template-preview");
    const title = document.getElementById("template-name");
    const badge = document.getElementById("template-badge");

    const show = (key) => {
      const t = TEMPLATES[key];
      document.querySelectorAll("[data-tpl]").forEach((b) => b.classList.toggle("is-active", b.dataset.tpl === key));
      title.textContent = t.name;
      badge.className = `badge ${t.badge}`;
      badge.textContent = key;
      preview.textContent = t.body;
    };

    document.querySelectorAll("[data-tpl]").forEach((btn) => {
      btn.addEventListener("click", () => show(btn.dataset.tpl));
    });

    document.getElementById("copy-tpl")?.addEventListener("click", () => {
      navigator.clipboard?.writeText(preview.textContent);
    });

    show("java");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
