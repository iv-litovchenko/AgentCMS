import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "shortlist-all");
workspace.innerHTML = `<div class="shortlist-page">
  <p class="shortlist-intro">Все варианты из шортлиста на одной странице — прокрути и сравни. Порядок: #24 (рекомендация), затем #03–#18.</p>
  <section class="shortlist-item" id="v24">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">24</span> Production compact <span class="shortlist-num shortlist-num--pick">★ рекомендация</span><span class="shortlist-desc">Рекомендуемый: компактные строки, stat справа, без тяжёлых карточек.</span></h2>
        <a class="shortlist-link" href="../24-production-compact/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v24"><div class="mem-stage"><p class="mem-context">Assistant.Ai · NODE/INDEX · AWN-MEMORY: hybrid</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-list mem-list--compact"><div class="mem-row" data-action="open" data-driver="internal" data-label="Краткая память" role="button" tabindex="0">
  <span class="mem-row-icon">📝</span>
  <div class="mem-row-body"><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span><span class="mem-excerpt">Краткие заметки о тоне и стиле…</span></div>
  <span class="mem-row-stat">842 симв.</span><span class="mem-chevron">›</span>
</div><div class="mem-row" data-action="open" data-driver="external" data-label="Архив" role="button" tabindex="0">
  <span class="mem-row-icon">📁</span>
  <div class="mem-row-body"><strong>Архив</strong><span class="mem-path">_Content/</span><span class="mem-recent-inline">Профиль.md · FAQ.md</span></div>
  <span class="mem-row-stat">12 записей</span><span class="mem-chevron">›</span>
</div><div class="mem-row" data-action="open" data-driver="tabular" data-label="Таблица" role="button" tabindex="0">
  <span class="mem-row-icon">📊</span>
  <div class="mem-row-body"><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span><span class="mem-excerpt">name · role · status</span></div>
  <span class="mem-row-stat">4 строки · 3 кол.</span><span class="mem-chevron">›</span>
</div></div></div></div>
    </section>
  <section class="shortlist-item" id="v03">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">03</span> Compact list<span class="shortlist-desc">Строки вместо карточек — меньше воздуха, chevron справа.</span></h2>
        <a class="shortlist-link" href="../03-compact-list/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v03"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-list"><div class="mem-row" data-action="open" data-driver="internal" data-label="Краткая память" role="button" tabindex="0">
  <span class="mem-row-icon">📝</span>
  <div class="mem-row-body"><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span><span class="mem-excerpt">Краткие заметки о тоне и стиле…</span></div>
  <span class="mem-row-stat">842 симв.</span><span class="mem-chevron">›</span>
</div><div class="mem-row" data-action="open" data-driver="external" data-label="Архив" role="button" tabindex="0">
  <span class="mem-row-icon">📁</span>
  <div class="mem-row-body"><strong>Архив</strong><span class="mem-path">_Content/</span><span class="mem-recent-inline">Профиль.md · FAQ.md</span></div>
  <span class="mem-row-stat">12 записей</span><span class="mem-chevron">›</span>
</div><div class="mem-row" data-action="open" data-driver="tabular" data-label="Таблица" role="button" tabindex="0">
  <span class="mem-row-icon">📊</span>
  <div class="mem-row-body"><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span><span class="mem-excerpt">name · role · status</span></div>
  <span class="mem-row-stat">4 строки · 3 кол.</span><span class="mem-chevron">›</span>
</div></div></div></div>
    </section>
  <section class="shortlist-item" id="v04">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">04</span> Stacked panels<span class="shortlist-desc">Full-width панели друг под другом с цветной полосой слева.</span></h2>
        <a class="shortlist-link" href="../04-stacked-panels/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v04"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="stack"><article class="mem-card mem-card--internal">
  <div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div>
  <p class="mem-stat">842 симв.</p><p class="mem-excerpt">Краткие заметки о тоне и стиле…</p>
  <button type="button" class="mem-open" data-action="open" data-driver="internal" data-label="Краткая память">Открыть</button>
</article><article class="mem-card mem-card--external">
  <div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div>
  <p class="mem-stat">12 записей</p>
  <ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li><li>Onboarding.md</li></ul>
  <button type="button" class="mem-open" data-action="open" data-driver="external" data-label="Архив">Открыть</button>
</article><article class="mem-card mem-card--tabular">
  <div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div>
  <p class="mem-stat">4 строки · 3 кол.</p><p class="mem-excerpt">name · role · status</p>
  <button type="button" class="mem-open" data-action="open" data-driver="tabular" data-label="Таблица">Открыть</button>
</article></div></div></div>
    </section>
  <section class="shortlist-item" id="v05">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">05</span> Icon tiles<span class="shortlist-desc">Крупные иконки, минимум текста — быстрый scan.</span></h2>
        <a class="shortlist-link" href="../05-icon-tiles/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v05"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-tile-grid">
        <button type="button" class="mem-tile" data-action="open" data-label="Краткая"><span class="mem-tile-icon">📝</span><strong>Краткая</strong><span class="mem-stat">842</span></button>
        <button type="button" class="mem-tile" data-action="open" data-label="Архив"><span class="mem-tile-icon">📁</span><strong>Архив</strong><span class="mem-stat">12</span></button>
        <button type="button" class="mem-tile" data-action="open" data-label="Таблица"><span class="mem-tile-icon">📊</span><strong>Таблица</strong><span class="mem-stat">4×3</span></button>
      </div></div></div>
    </section>
  <section class="shortlist-item" id="v06">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">06</span> Stats KPI<span class="shortlist-desc">Числа крупно — dashboard-стиль, подпись мелко.</span></h2>
        <a class="shortlist-link" href="../06-stats-kpi/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v06"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-kpi-grid">
        <button type="button" class="mem-kpi" data-action="open" data-label="Краткая"><span class="mem-kpi-val">842</span><span class="mem-kpi-label">📝 символов</span></button>
        <button type="button" class="mem-kpi" data-action="open" data-label="Архив"><span class="mem-kpi-val">12</span><span class="mem-kpi-label">📁 записей</span></button>
        <button type="button" class="mem-kpi" data-action="open" data-label="Таблица"><span class="mem-kpi-val">4</span><span class="mem-kpi-label">📊 строк CSV</span></button>
      </div></div></div>
    </section>
  <section class="shortlist-item" id="v10">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">10</span> Minimal badges<span class="shortlist-desc">Только ссылки с badge-stat — ultra minimal.</span></h2>
        <a class="shortlist-link" href="../10-minimal-badges/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v10"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-minimal">
        <a href="#" class="mem-min-link" data-action="open" data-label="Краткая">📝 Краткая память <span class="mem-chip-badge">842</span></a>
        <a href="#" class="mem-min-link" data-action="open" data-label="Архив">📁 Архив <span class="mem-chip-badge">12</span></a>
        <a href="#" class="mem-min-link" data-action="open" data-label="Таблица">📊 Таблица <span class="mem-chip-badge">4×3</span></a>
      </div></div></div>
    </section>
  <section class="shortlist-item" id="v13">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">13</span> Chip bar<span class="shortlist-desc">Горизонтальные chips — компактно в одну линию.</span></h2>
        <a class="shortlist-link" href="../13-chip-bar/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v13"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-chip-bar">
        <button type="button" class="mem-chip" data-action="open" data-label="Краткая">📝 Краткая <span class="mem-chip-badge">842</span></button>
        <button type="button" class="mem-chip" data-action="open" data-label="Архив">📁 Архив <span class="mem-chip-badge">12</span></button>
        <button type="button" class="mem-chip" data-action="open" data-label="Таблица">📊 CSV <span class="mem-chip-badge">4×3</span></button>
      </div></div></div>
    </section>
  <section class="shortlist-item" id="v14">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">14</span> Notion rows<span class="shortlist-desc">Database row — свойство слева, значение справа.</span></h2>
        <a class="shortlist-link" href="../14-notion-rows/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v14"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-notion">
        <button type="button" class="mem-nrow" data-action="open" data-label="Краткая"><span class="mem-nprop">📝 Краткая</span><span class="mem-nval">842 симв. · excerpt</span><span class="mem-chevron">›</span></button>
        <button type="button" class="mem-nrow" data-action="open" data-label="Архив"><span class="mem-nprop">📁 Архив</span><span class="mem-nval">12 · Профиль.md, FAQ…</span><span class="mem-chevron">›</span></button>
        <button type="button" class="mem-nrow" data-action="open" data-label="Таблица"><span class="mem-nprop">📊 Таблица</span><span class="mem-nval">name · role · status</span><span class="mem-chevron">›</span></button>
      </div></div></div>
    </section>
  <section class="shortlist-item" id="v15">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">15</span> Sidebar labels<span class="shortlist-desc">Фиксированные labels слева, контент и stat справа.</span></h2>
        <a class="shortlist-link" href="../15-sidebar-labels/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v15"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-side-rows">
        <div class="mem-siderow"><span class="mem-sidelabel">Internal</span><div><strong>Краткая память</strong><p class="mem-excerpt">Краткие заметки…</p></div><button class="mem-open" data-action="open" data-label="Краткая">842 →</button></div>
        <div class="mem-siderow"><span class="mem-sidelabel">External</span><div><strong>Архив</strong><p class="mem-excerpt">Профиль.md · FAQ.md</p></div><button class="mem-open" data-action="open" data-label="Архив">12 →</button></div>
        <div class="mem-siderow"><span class="mem-sidelabel">Tabular</span><div><strong>Таблица</strong><p class="mem-excerpt">name · role · status</p></div><button class="mem-open" data-action="open" data-label="Таблица">4×3 →</button></div>
      </div></div></div>
    </section>
  <section class="shortlist-item" id="v16">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">16</span> Gradient cards<span class="shortlist-desc">Мягкий градиент по типу драйвера.</span></h2>
        <a class="shortlist-link" href="../16-gradient-cards/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v16"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-grid grad-grid"><article class="mem-card mem-card--internal">
  <div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div>
  <p class="mem-stat">842 симв.</p><p class="mem-excerpt">Краткие заметки о тоне и стиле…</p>
  <button type="button" class="mem-open" data-action="open" data-driver="internal" data-label="Краткая память">Открыть</button>
</article><article class="mem-card mem-card--external">
  <div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div>
  <p class="mem-stat">12 записей</p>
  <ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li><li>Onboarding.md</li></ul>
  <button type="button" class="mem-open" data-action="open" data-driver="external" data-label="Архив">Открыть</button>
</article><article class="mem-card mem-card--tabular">
  <div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div>
  <p class="mem-stat">4 строки · 3 кол.</p><p class="mem-excerpt">name · role · status</p>
  <button type="button" class="mem-open" data-action="open" data-driver="tabular" data-label="Таблица">Открыть</button>
</article></div></div></div>
    </section>
  <section class="shortlist-item" id="v17">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">17</span> Clickable card<span class="shortlist-desc">Вся карточка кликабельна — без отдельной кнопки.</span></h2>
        <a class="shortlist-link" href="../17-clickable-card/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v17"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-grid"><button type="button" class="mem-card mem-click" data-action="open" data-label="Краткая"><div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div><p class="mem-stat">842 симв.</p><p class="mem-excerpt">Краткие заметки о тоне и стиле…</p></button><button type="button" class="mem-card mem-click" data-action="open" data-label="Архив"><div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div><p class="mem-stat">12 записей</p><ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li></ul></button><button type="button" class="mem-card mem-click" data-action="open" data-label="Таблица"><div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div><p class="mem-stat">4 строки · 3 кол.</p><p class="mem-excerpt">name · role · status</p></button></div></div></div>
    </section>
  <section class="shortlist-item" id="v18">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">18</span> Chevron only<span class="shortlist-desc">Строки с chevron — без кнопки «Открыть».</span></h2>
        <a class="shortlist-link" href="../18-chevron-only/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v18"><div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-list"><div class="mem-row" data-action="open" data-driver="internal" data-label="Краткая память" role="button" tabindex="0">
  <span class="mem-row-icon">📝</span>
  <div class="mem-row-body"><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span><span class="mem-excerpt">Краткие заметки о тоне и стиле…</span></div>
  <span class="mem-row-stat">842 симв.</span><span class="mem-chevron">›</span>
</div><div class="mem-row" data-action="open" data-driver="external" data-label="Архив" role="button" tabindex="0">
  <span class="mem-row-icon">📁</span>
  <div class="mem-row-body"><strong>Архив</strong><span class="mem-path">_Content/</span><span class="mem-recent-inline">Профиль.md · FAQ.md</span></div>
  <span class="mem-row-stat">12 записей</span><span class="mem-chevron">›</span>
</div><div class="mem-row" data-action="open" data-driver="tabular" data-label="Таблица" role="button" tabindex="0">
  <span class="mem-row-icon">📊</span>
  <div class="mem-row-body"><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span><span class="mem-excerpt">name · role · status</span></div>
  <span class="mem-row-stat">4 строки · 3 кол.</span><span class="mem-chevron">›</span>
</div></div></div></div>
    </section>
</div>`;

bindDemoActions(document.body);
