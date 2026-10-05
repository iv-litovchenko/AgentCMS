import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-02-wide-reading");
workspace.innerHTML = `<header class="nav-path-header">
  <select class="nav-subsection-select" data-subsection-select aria-label="Подраздел навигации">
    <option value="all" selected>Все доступные элементы</option>
    <option value="tasks">Задачи</option>
    <option value="docs">Документы</option>
  </select>
  <nav class="nav-breadcrumbs" aria-label="Путь">
    <span class="nav-crumb-prefix">Навигация ноды</span>
    <span class="nav-crumb">Tests</span><span class="nav-crumb-sep">/</span><span class="nav-crumb">Folder-2</span><span class="nav-crumb-sep">/</span><span class="nav-crumb">Folder-3</span><span class="nav-crumb-sep">/</span><span class="nav-crumb">MedCenter</span>
  </nav>
</header><div class="nav-hub nav-hub--wide"><section class="nav-block nav-block--subs">
    <h3 class="nav-block-title">🗂️ Подразделы</h3>
    <div class="nav-sub-grid"><article class="nav-sub-card" data-action="open" data-label="Задачи" tabindex="0" role="button" style="--sub-color:#dbeafe;--sub-text:#1e40af">
    <div class="nav-sub-cover">📋</div>
    <div class="nav-sub-foot"><strong>Задачи</strong></div>
  </article><article class="nav-sub-card" data-action="open" data-label="Документы" tabindex="0" role="button" style="--sub-color:#fef3c7;--sub-text:#92400e">
    <div class="nav-sub-cover">📄</div>
    <div class="nav-sub-foot"><strong>Документы</strong></div>
  </article><article class="nav-sub-card" data-action="open" data-label="Архив" tabindex="0" role="button" style="--sub-color:#dcfce7;--sub-text:#166534">
    <div class="nav-sub-cover">🗄️</div>
    <div class="nav-sub-foot"><strong>Архив</strong></div>
  </article><article class="nav-sub-card" data-action="open" data-label="Команда" tabindex="0" role="button" style="--sub-color:#ede9fe;--sub-text:#5b21b6">
    <div class="nav-sub-cover">👥</div>
    <div class="nav-sub-foot"><strong>Команда</strong></div>
  </article></div>
  </section><article class="nav-document"><div class="nav-doc-part nav-doc-part--internal">
  <div class="nav-preview file-content-preview"><h2>О проекте Medknizhky.Ru</h2>
<p>Платформа для медицинских центров: запись на приём, личный кабинет пациента, интеграция с ЕГИСЗ.</p>
<h3>Тон коммуникации</h3>
<ul>
  <li>Тёплый, без канцелярита</li>
  <li>Компетентный, но не сухой</li>
  <li>Обращение на «вы»</li>
</ul>
<p><strong>Ключевые метрики:</strong> конверсия записи, NPS, время ответа оператора.</p></div>
</div><div class="nav-doc-part nav-doc-part--external"><div class="nav-ext-toc"><section class="nav-ext-section">
      <h4 class="nav-ext-title">Корень</h4>
      <ul class="nav-ext-list"><li><a href="#" data-action="open" data-label="README">README</a></li><li><a href="#" data-action="open" data-label="Roadmap">Roadmap</a></li><li><a href="#" data-action="open" data-label="Changelog">Changelog</a></li></ul>
    </section><section class="nav-ext-section">
      <h4 class="nav-ext-title">docs</h4>
      <ul class="nav-ext-list"><li><a href="#" data-action="open" data-label="API">API</a></li><li><a href="#" data-action="open" data-label="Onboarding">Onboarding</a></li><li><a href="#" data-action="open" data-label="FAQ">FAQ</a></li></ul>
    </section><section class="nav-ext-section">
      <h4 class="nav-ext-title">marketing</h4>
      <ul class="nav-ext-list"><li><a href="#" data-action="open" data-label="Landing copy">Landing copy</a></li><li><a href="#" data-action="open" data-label="Email templates">Email templates</a></li></ul>
    </section></div></div><div class="nav-doc-part nav-doc-part--tabular"><div class="nav-tabular-wrap"><table class="nav-tabular"><thead><tr><th>name</th><th>role</th><th>status</th></tr></thead><tbody><tr><td>Иванова А.</td><td>врач</td><td>active</td></tr><tr><td>Петров С.</td><td>админ</td><td>active</td></tr><tr><td>Сидорова М.</td><td>оператор</td><td>vacation</td></tr><tr><td>Козлов Д.</td><td>разработчик</td><td>active</td></tr></tbody></table></div></div><div class="nav-doc-part nav-doc-part--media"><ul class="nav-media-list"><li><a href="#" data-action="open" data-label="logo.svg">logo.svg</a></li><li><a href="#" data-action="open" data-label="hero-banner.webp">hero-banner.webp</a></li><li><a href="#" data-action="open" data-label="intro-video.mp4">intro-video.mp4</a></li><li><a href="#" data-action="open" data-label="price-list.pdf">price-list.pdf</a></li><li><a href="#" data-action="open" data-label="archive-2024.zip">archive-2024.zip</a></li></ul></div></article></div>`;

bindDemoActions(document.body);
