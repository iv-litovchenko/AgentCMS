import { mountShell, bindDemoActions } from "../shared-mock.js";
import { bindDocTypeToggle } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-19-props-inspector");
workspace.innerHTML = `
  <div class="doc-type-switch" role="tablist" aria-label="Тип документа">
    <button type="button" data-doc-type="agents" class="active">AGENTS.md</button>
    <button type="button" data-doc-type="node">_.node.md</button>
  </div>
      <div class="doc-body inspector-layout">
        <div class="inspector-main">
          <div class="path-actions-row"><nav class="breadcrumbs crumb-zone" data-crumb-zone="agents"><button type="button" class="breadcrumb">Workspaces</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Main Agent</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">AGENTS.md</span></nav><nav class="breadcrumbs crumb-zone hidden" data-crumb-zone="node"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Память</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка.md</span></nav><span class="spacer"></span>
            <button class="btn" data-action="props">Свойства ▸</button>
            <button class="btn btn-primary" data-action="save">Сохранить</button>
            <button class="btn btn-danger" data-action="delete">Удалить</button>
          </div>
          <div class="title-row"><div class="title-zone" data-title-zone="agents"><div class="title-fixed"><span>AGENTS.md</span><span class="lock" title="Имя нельзя менять">🔒</span></div></div><div class="title-zone hidden" data-title-zone="node"><input class="doc-title-input" value="Дальнобойщики-2" /><span class="doc-ext">.node.md</span></div></div>
          <textarea class="editor-textarea"># Main Agent

Роль: координатор воркспейса.

## Правила
- Не переименовывать этот файл</textarea>
        </div>
        <aside class="inspector-drawer">
          <div class="slab-label">Свойства</div>
          <textarea class="yaml-textarea">agent_id: main
name: Main Agent
version: 1</textarea>
        </aside>
      </div>`;

bindDocTypeToggle(workspace);
bindDemoActions(document.body);
