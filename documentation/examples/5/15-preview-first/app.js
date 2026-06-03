import { mountShell, bindDemoActions } from "../shared-mock.js";
import { bindDocTypeToggle } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-15-preview-first");
workspace.innerHTML = `
  <div class="doc-type-switch" role="tablist" aria-label="Тип документа">
    <button type="button" data-doc-type="agents" class="active">AGENTS.md</button>
    <button type="button" data-doc-type="node">_.node.md</button>
  </div>
      <div class="doc-body">
        <nav class="breadcrumbs crumb-zone" data-crumb-zone="agents"><button type="button" class="breadcrumb">Workspaces</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Main Agent</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">AGENTS.md</span></nav><nav class="breadcrumbs crumb-zone hidden" data-crumb-zone="node"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Память</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка.md</span></nav>
        <div class="title-row"><div class="title-zone" data-title-zone="agents"><div class="title-fixed"><span>AGENTS.md</span><span class="lock" title="Имя нельзя менять">🔒</span></div></div><div class="title-zone hidden" data-title-zone="node"><input class="doc-title-input" value="Дальнобойщики-2" /><span class="doc-ext">.node.md</span></div>
          <button class="btn" type="button">Редактировать</button>
          <button class="btn btn-primary hidden" data-action="save">Сохранить</button>
        </div>
        <div class="preview-pane"><h1>Main Agent</h1><p>Роль: координатор воркспейса.</p></div>
        <textarea class="editor-textarea hidden"># Main Agent

Роль: координатор воркспейса.

## Правила
- Не переименовывать этот файл</textarea>
      </div>`;

bindDocTypeToggle(workspace);
bindDemoActions(document.body);
