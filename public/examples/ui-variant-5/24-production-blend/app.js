import { mountShell, bindDemoActions } from "../shared-mock.js";
import { bindDocTypeToggle } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-24-production-blend");
workspace.innerHTML = `
  <div class="doc-type-switch" role="tablist" aria-label="Тип документа">
    <button type="button" data-doc-type="agents" class="active">AGENTS.md</button>
    <button type="button" data-doc-type="node">_.node.md</button>
  </div>
      <section class="slab path-slab"><nav class="breadcrumbs crumb-zone" data-crumb-zone="agents"><button type="button" class="breadcrumb">Workspaces</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Main Agent</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">AGENTS.md</span></nav><nav class="breadcrumbs crumb-zone hidden" data-crumb-zone="node"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Память</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка.md</span></nav></section>
      <section class="slab title-slab">
        <div class="slab-label">Название</div>
        <div class="title-row"><div class="title-zone" data-title-zone="agents"><div class="title-fixed"><span>AGENTS.md</span><span class="lock" title="Имя нельзя менять">🔒</span></div></div><div class="title-zone hidden" data-title-zone="node"><input class="doc-title-input" value="Дальнобойщики-2" /><span class="doc-ext">.node.md</span></div>
  <div class="doc-actions">
    <button type="button" class="btn" data-action="props">Свойства</button>
    <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
    <button type="button" class="btn btn-danger" data-action="delete">Удалить</button>
  </div></div>
      </section>
      <section class="slab props-slab">
        <div class="slab-label">Свойства md-файла</div>
        <textarea class="yaml-textarea">agent_id: main
name: Main Agent
version: 1</textarea>
      </section>
      <section class="slab content-slab">
        <div class="path-actions-row"><span class="slab-label" style="margin:0">Содержимое</span>
  <div class="view-toggle" role="tablist">
    <button type="button" class="active">Источник</button>
    <button type="button">Просмотр</button>
  </div></div>
        <textarea class="editor-textarea"># Main Agent

Роль: координатор воркспейса.

## Правила
- Не переименовывать этот файл</textarea>
      </section>`;

bindDocTypeToggle(workspace);
bindDemoActions(document.body);
