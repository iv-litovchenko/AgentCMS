import { mountShell, bindDemoActions } from "../shared-mock.js";
import { bindDocTypeToggle } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-18-meta-sidebar");
workspace.innerHTML = `
  <div class="doc-type-switch" role="tablist" aria-label="Тип документа">
    <button type="button" data-doc-type="agents" class="active">AGENTS.md</button>
    <button type="button" data-doc-type="node">_.node.md</button>
  </div>
      <div class="doc-body meta-layout">
        <aside class="meta-col">
          <div class="slab-label">Документ</div>
          <p data-agents-only class="meta-type">AGENTS.md</p>
          <p data-node-only class="meta-type hidden">_.node.md</p>
          <button class="btn btn-primary full" data-action="save">Сохранить</button>
          <button class="btn full" data-action="props">Свойства</button>
          <button class="btn btn-danger full" data-action="delete">Удалить</button>
        </aside>
        <div class="meta-main">
          <nav class="breadcrumbs crumb-zone" data-crumb-zone="agents"><button type="button" class="breadcrumb">Workspaces</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Main Agent</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">AGENTS.md</span></nav><nav class="breadcrumbs crumb-zone hidden" data-crumb-zone="node"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Память</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка.md</span></nav>
          <div class="title-row"><div class="title-zone" data-title-zone="agents"><div class="title-fixed"><span>AGENTS.md</span><span class="lock" title="Имя нельзя менять">🔒</span></div></div><div class="title-zone hidden" data-title-zone="node"><input class="doc-title-input" value="Дальнобойщики-2" /><span class="doc-ext">.node.md</span></div></div>
          <textarea class="editor-textarea"># Main Agent

Роль: координатор воркспейса.

## Правила
- Не переименовывать этот файл</textarea>
        </div>
      </div>`;

bindDocTypeToggle(workspace);
bindDemoActions(document.body);
