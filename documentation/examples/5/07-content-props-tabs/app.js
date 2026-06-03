import { mountShell, bindDemoActions } from "../shared-mock.js";
import { bindDocTypeToggle } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-07-content-props-tabs");
workspace.innerHTML = `
  <div class="doc-type-switch" role="tablist" aria-label="Тип документа">
    <button type="button" data-doc-type="agents" class="active">AGENTS.md</button>
    <button type="button" data-doc-type="node">_.node.md</button>
  </div>
      <div class="doc-body">
        <div class="title-row"><div class="title-zone" data-title-zone="agents"><div class="title-fixed"><span>AGENTS.md</span><span class="lock" title="Имя нельзя менять">🔒</span></div></div><div class="title-zone hidden" data-title-zone="node"><input class="doc-title-input" value="Дальнобойщики-2" /><span class="doc-ext">.node.md</span></div></div>
        <div class="tab-bar">
          <button type="button" class="tab active">Содержимое</button>
          <button type="button" class="tab">Свойства</button>
          <button type="button" class="tab">Просмотр</button>
          <span class="spacer"></span>
          <button class="btn btn-primary" data-action="save">Сохранить</button>
          <button class="btn btn-danger" data-action="delete">Удалить</button>
        </div>
        <textarea class="editor-textarea"># Main Agent

Роль: координатор воркспейса.

## Правила
- Не переименовывать этот файл</textarea>
      </div>`;

bindDocTypeToggle(workspace);
bindDemoActions(document.body);
