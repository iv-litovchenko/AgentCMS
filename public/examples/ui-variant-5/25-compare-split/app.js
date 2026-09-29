import { mountShell, bindDemoActions } from "../shared-mock.js";


const root = document.getElementById("app");
const workspace = mountShell(root, "variant-25-compare-split");
workspace.innerHTML = `
      <div class="doc-body compare-split">
        <div class="compare-col">
          <h3>AGENTS.md</h3>
          <div class="title-fixed"><span>AGENTS.md</span><span class="lock">🔒</span></div>
          <div class="doc-actions"><button class="btn" data-action="props">Свойства</button><button class="btn btn-primary" data-action="save">Сохранить</button></div>
          <textarea class="editor-textarea"># Main Agent

Роль: координатор воркспейса.

## Правила
- Не переименовывать этот файл</textarea>
        </div>
        <div class="compare-col">
          <h3>_.node.md</h3>
          <div class="title-row"><input class="doc-title-input" value="Дальнобойщики-2" /><span class="doc-ext">.node.md</span></div>
          <div class="doc-actions"><button class="btn" data-action="props">Свойства</button><button class="btn btn-primary" data-action="save">Сохранить</button><button class="btn btn-danger" data-action="delete">Удалить</button></div>
          <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Прибытие: 18:30</textarea>
        </div>
      </div>`;


bindDemoActions(document.body);
