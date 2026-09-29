/**
 * Agent Shell Companion — модалка установки расширения Chrome.
 */
(function initCompanionDocs() {
  const openBtns = document.querySelectorAll("#companion-docs-btn, #header-welcome-companion-btn");
  const modalNode = document.getElementById("companion-docs-modal");
  const closeBtn = document.getElementById("companion-docs-close-btn");
  const contentNode = document.getElementById("companion-docs-content");

  if (!openBtns.length || !modalNode || !contentNode) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const CHPU_RESERVED_ROOT_SEGMENTS = new Set(["api", "shell", "vendor", "a", "shared", "cms"]);

  function getAgentHint() {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("agent");
      if (fromQuery) return fromQuery;
      const parts = window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (!parts.length) return "";
      if (parts[0] === "a" && parts[1]) return decodeURIComponent(parts[1]);
      const first = parts[0];
      if (first && !CHPU_RESERVED_ROOT_SEGMENTS.has(first.toLowerCase()) && !first.includes(".")) {
        return decodeURIComponent(first);
      }
    } catch {
      // ignore
    }
    return "";
  }

  function highlightCodeBlocks() {
    if (!window.hljs?.highlightElement) return;
    contentNode.querySelectorAll("pre code").forEach((block) => {
      window.hljs.highlightElement(block);
    });
  }

  function renderContent() {
    const cmsOrigin = window.location.origin;
    const agentId = getAgentHint();
    const extensionFolder = "browser-extension";
    const agentBlock = agentId
      ? `<li>В настройках расширения укажите <strong>ID агента</strong>: <code>${escapeHtml(agentId)}</code></li>`
      : "<li>В настройках расширения при необходимости укажите <strong>ID агента</strong> (как в URL CMS <code>?agent=…</code>).</li>";

    contentNode.innerHTML = `
      <h1>Agent Shell Companion</h1>
      <p>Расширение для Google Chrome · Side Panel и команды на любой странице в интернете</p>

      <h2>Что это</h2>
      <p>
        <strong>Agent Shell Companion</strong> — расширение для Google Chrome.
        На любой странице в интернете справа открывается панель с тем же Agent Shell, что уже встроен в CMS
        (<em>Discuss → Agent Shell</em>). Плюс плавающие кнопки «Страница» и «Выделение» отправляют контекст агенту.
      </p>

      <h2>1. Запустите Agent CMS</h2>
      <pre><code class="language-bash">npm run start:https</code></pre>
      <p>
        CMS: <a href="${escapeHtml(cmsOrigin)}" target="_blank" rel="noopener">${escapeHtml(cmsOrigin)}</a>
        · Voice (Side Panel): <code>https://localhost:3488/{agent-id}/extension/</code>
      </p>

      <h2>2. Установите расширение в Chrome</h2>
      <ol>
        <li>Откройте <code>chrome://extensions</code></li>
        <li>Включите <strong>Режим разработчика</strong> (переключатель справа сверху)</li>
        <li>Нажмите <strong>Загрузить распакованное расширение</strong></li>
        <li>Выберите папку <code>${escapeHtml(extensionFolder)}/</code> в корне репозитория Agent CMS</li>
      </ol>
      <p><em>Путь на диске:</em> <code>…/YamlCMS/${escapeHtml(extensionFolder)}/</code></p>

      <h2>3. Настройте подключение</h2>
      <ol>
        <li>На странице расширений откройте <strong>Подробнее → Параметры</strong> у Agent Shell Companion</li>
        <li>URL Agent CMS: <code>${escapeHtml(cmsOrigin)}</code> — Side Panel сам откроет Voice на <code>:3488</code></li>
        ${agentBlock}
      </ol>

      <h2>Если Side Panel пустой или «CMS недоступен»</h2>
      <ul>
        <li>В настройках расширения укажите <strong>HTTPS CMS</strong>: <code>https://localhost:3443</code> (не <code>http://localhost:3000</code>)</li>
        <li>Side Panel грузит Agent Shell с Voice: <code>https://localhost:3488/…/extension/</code></li>
        <li>На <code>chrome://extensions</code> нажмите ↻ у Agent Shell Companion после обновления файлов</li>
        <li>Если Voice просит логин — войдите в Side Panel (<code>admin</code> / пароль из <code>.env</code>)</li>
      </ul>

      <h2>4. Как пользоваться</h2>
      <ul>
        <li>Клик по иконке расширения в панели Chrome → открывается <strong>Side Panel</strong> с Agent Shell</li>
        <li>На любом сайте внизу справа — toolbar: <strong>Страница</strong> (URL + текст), <strong>Выделение</strong></li>
        <li>Сообщения уходят в тот же thread/inbox, что и обычный Shell (<code>/api/shell/message</code>)</li>
      </ul>

      <h2>Ограничения</h2>
      <ul>
        <li>CMS должен быть запущен локально (или доступен по сети, если указали другой URL)</li>
        <li>На HTTPS-сайтах mixed content не мешает iframe, но CMS должен отвечать по указанному URL</li>
        <li>Toolbar не показывается на страницах CMS/Voice (<code>localhost:3443</code>, <code>localhost:3488</code>) — там уже есть встроенная панель справа</li>
      </ul>
    `;

    highlightCodeBlocks();
  }

  function openModal() {
    window.agentCmsCloseHeaderProfileMenu?.();
    window.agentCmsCloseHeaderWelcomePopover?.();
    renderContent();
    modalNode.classList.remove("hidden");
  }

  function closeModal() {
    modalNode.classList.add("hidden");
  }

  openBtns.forEach((btn) => btn.addEventListener("click", openModal));
  closeBtn?.addEventListener("click", closeModal);
  modalNode.addEventListener("click", (event) => {
    if (event.target === modalNode) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalNode.classList.contains("hidden")) closeModal();
  });
})();
