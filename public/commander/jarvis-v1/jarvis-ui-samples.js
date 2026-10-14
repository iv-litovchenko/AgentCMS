/** @typedef {{ id: string, title: string, category: string, kind: 'html'|'markdown'|'mermaid', content: string }} JarvisUiSample */

window.JARVIS_UI_SAMPLES = [
  {
    id: "stats-row",
    title: "KPI · карточки",
    category: "metrics",
    kind: "html",
    content: `<div class="jui-root jui-stack">
  <div class="jui-row jui-grid jui-grid-4">
    <div class="jui-card jui-stat tone-ok"><div class="jui-stat-val">128</div><div class="jui-stat-label">Топиков</div></div>
    <div class="jui-card jui-stat"><div class="jui-stat-val">94%</div><div class="jui-stat-label">Индекс</div></div>
    <div class="jui-card jui-stat tone-warn"><div class="jui-stat-val">3</div><div class="jui-stat-label">Inbox</div></div>
    <div class="jui-card jui-stat"><div class="jui-stat-val">online</div><div class="jui-stat-label">CMS</div></div>
  </div>
  <p class="jui-hint">jui-stat · jui-grid-4 · tone-ok / tone-warn</p>
</div>`
  },
  {
    id: "md-report",
    title: "Markdown · отчёт",
    category: "markdown",
    kind: "markdown",
    content: `## Результаты поиска

Агент нашёл **12** файлов по запросу \`workspace:hero\`.

### Выводы
- 3 топика без schema
- 2 битые ссылки на media

| Путь | Статус |
|------|--------|
| topics/launch | ok |
| topics/draft | warn |

\`\`\`json
{ "action": "reindex", "scope": "workspace" }
\`\`\`
`
  },
  {
    id: "data-table",
    title: "Таблица · контент",
    category: "table",
    kind: "html",
    content: `<div class="jui-root jui-stack">
  <div class="jui-row"><span class="jui-badge ok">sync</span><span class="jui-badge">12 rows</span></div>
  <div class="jui-table-wrap">
    <table class="jui-table">
      <thead><tr><th>Топик</th><th>Слот</th><th>Обновлён</th><th></th></tr></thead>
      <tbody>
        <tr><td>product-launch</td><td>media</td><td>2026-03-10</td><td><span class="jui-badge ok">ok</span></td></tr>
        <tr><td>faq</td><td>body</td><td>2026-03-08</td><td><span class="jui-badge ok">ok</span></td></tr>
        <tr><td>draft-notes</td><td>—</td><td>2026-02-01</td><td><span class="jui-badge warn">draft</span></td></tr>
      </tbody>
    </table>
  </div>
</div>`
  },
  {
    id: "form-edit",
    title: "Форма · правка свойств",
    category: "form",
    kind: "html",
    content: `<div class="jui-root">
  <form class="jui-form jui-stack" onsubmit="return false">
    <div class="jui-field"><label>title</label><input type="text" value="Hero block" /></div>
    <div class="jui-field"><label>status</label><select><option>published</option><option selected>draft</option></select></div>
    <div class="jui-field"><label>tags</label><input type="text" value="launch, cms" /></div>
    <div class="jui-field"><label>comment</label><textarea rows="3">Комментарий агента после MCP write…</textarea></div>
    <div class="jui-row"><button type="button" class="jui-btn">Сохранить</button><button type="button" class="jui-btn ghost">Отмена</button></div>
  </form>
</div>`
  },
  {
    id: "bar-chart",
    title: "График · столбцы (CSS)",
    category: "chart",
    kind: "html",
    content: `<div class="jui-root jui-stack">
  <div class="jui-card"><h3>Запросы по дням</h3>
    <div class="jui-bars" aria-hidden="true">
      <div class="jui-bar" style="height:45%"><span>Пн</span></div>
      <div class="jui-bar" style="height:72%"><span>Вт</span></div>
      <div class="jui-bar" style="height:58%"><span>Ср</span></div>
      <div class="jui-bar" style="height:90%"><span>Чт</span></div>
      <div class="jui-bar" style="height:64%"><span>Пт</span></div>
    </div>
  </div>
  <p class="jui-hint">Высота .jui-bar inline или через style="height:N%" от агента</p>
</div>`
  },
  {
    id: "sparkline-svg",
    title: "Sparkline · SVG",
    category: "chart",
    kind: "html",
    content: `<div class="jui-root jui-stack">
  <div class="jui-card"><h3>Latency MCP (ms)</h3>
    <svg class="jui-sparkline" viewBox="0 0 200 48" preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" stroke-width="2"
        points="0,40 25,32 50,36 75,20 100,28 125,12 150,18 175,8 200,14"/>
    </svg>
    <div class="jui-row"><span class="jui-badge">avg 24ms</span><span class="jui-badge ok">p95 41ms</span></div>
  </div>
</div>`
  },
  {
    id: "donut",
    title: "Donut · доля индекса",
    category: "chart",
    kind: "html",
    content: `<div class="jui-root jui-row" style="justify-content:center;gap:24px;flex-wrap:wrap">
  <div><div class="jui-donut" style="background:conic-gradient(#22d3ee 0 62%, rgba(148,163,184,0.2) 62% 100%)"><div class="jui-donut-inner">62%</div></div><p style="text-align:center;font-size:0.6875rem;color:#94a3b8;margin:8px 0 0">semantic</p></div>
  <div><div class="jui-donut" style="background:conic-gradient(#7c6cff 0 88%, rgba(148,163,184,0.2) 88% 100%)"><div class="jui-donut-inner">88%</div></div><p style="text-align:center;font-size:0.6875rem;color:#94a3b8;margin:8px 0 0">fulltext</p></div>
</div>`
  },
  {
    id: "timeline",
    title: "Timeline · журнал",
    category: "feed",
    kind: "html",
    content: `<div class="jui-root"><div class="jui-timeline">
  <div class="jui-timeline-item"><time>14:02</time><p><strong>search_workspace</strong> — 8 hits</p></div>
  <div class="jui-timeline-item"><time>14:03</time><p><strong>read_content</strong> hero.md</p></div>
  <div class="jui-timeline-item"><time>14:04</time><p><strong>write_content</strong> draft saved</p></div>
</div></div>`
  },
  {
    id: "alerts",
    title: "Alerts · статусы",
    category: "feed",
    kind: "html",
    content: `<div class="jui-root jui-stack">
  <div class="jui-alert">CMS online · индексы актуальны.</div>
  <div class="jui-alert warn">2 топика без schema — рекомендуется refresh.</div>
  <div class="jui-alert danger">MCP timeout на read_content (retry 1/3).</div>
</div>`
  },
  {
    id: "kv-meta",
    title: "Key · value мета",
    category: "data",
    kind: "html",
    content: `<div class="jui-root jui-card"><h3>get_content_meta</h3>
<dl class="jui-kv">
  <dt>path</dt><dd>topics/product-launch</dd>
  <dt>slot</dt><dd>media/hero.md</dd>
  <dt>kind</dt><dd>page</dd>
  <dt>updated</dt><dd>2026-03-10T11:22:00Z</dd>
</dl></div>`
  },
  {
    id: "kanban",
    title: "Kanban · задачи",
    category: "board",
    kind: "html",
    content: `<div class="jui-root"><div class="jui-kanban">
  <div class="jui-kanban-col"><h5>Todo</h5><div class="jui-kanban-card">Reindex semantic</div><div class="jui-kanban-card">Fix hero link</div></div>
  <div class="jui-kanban-col"><h5>Doing</h5><div class="jui-kanban-card">MCP refactor test</div></div>
  <div class="jui-kanban-col"><h5>Done</h5><div class="jui-kanban-card">Voice HUD UI kit</div></div>
</div></div>`
  },
  {
    id: "compare",
    title: "Сравнение · до/после",
    category: "diff",
    kind: "html",
    content: `<div class="jui-root jui-grid jui-grid-2">
  <div class="jui-card"><h4>До</h4><pre style="margin:0;font-size:0.7rem;color:#94a3b8;overflow:auto">title: Old
status: draft</pre></div>
  <div class="jui-card"><h4>После</h4><pre style="margin:0;font-size:0.7rem;color:#34d399;overflow:auto">title: Launch 2026
status: published</pre></div>
</div>`
  },
  {
    id: "mermaid-flow",
    title: "Mermaid · поток",
    category: "diagram",
    kind: "mermaid",
    content: `flowchart LR
  User[Voice HUD] --> Agent[Agent CMS]
  Agent --> MCP[MCP tools]
  MCP --> WS[(Workspace)]
  MCP --> Index[Semantic index]
`
  },
  {
    id: "agent-blank",
    title: "Шаблон · пустая панель",
    category: "template",
    kind: "html",
    content: `<div class="jui-root jui-stack">
  <div class="jui-alert">Агент: вставьте HTML в <code>jarvisRenderPanel()</code> или классы jui-*.</div>
  <div class="jui-card"><h3>Заголовок</h3><p>Текст, таблица или график ниже.</p></div>
  <div class="jui-table-wrap"><table class="jui-table"><thead><tr><th>col A</th><th>col B</th></tr></thead><tbody><tr><td>…</td><td>…</td></tr></tbody></table></div>
</div>`
  }
];

window.JARVIS_UI_CONTRACT_URL = "jarvis-ui-contract.md";
