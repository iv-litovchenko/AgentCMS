(function () {
  const root = document.getElementById("short-link-root");
  const loadingEl = document.getElementById("short-link-loading");
  const errorEl = document.getElementById("short-link-error");
  const readyEl = document.getElementById("short-link-ready");
  const workspaceOrbit = document.getElementById("short-link-workspace-orbit");
  const workspaceNameEl = document.getElementById("short-link-workspace-name");
  const workspaceSlugEl = document.getElementById("short-link-workspace-slug");
  const wsAvatarImg = document.getElementById("short-link-workspace-avatar-img");
  const wsAvatarEmoji = document.getElementById("short-link-workspace-avatar-emoji");
  const wsAvatarInitials = document.getElementById("short-link-workspace-avatar-initials");
  const previewFrame = document.getElementById("short-link-preview-frame");
  const previewImg = document.getElementById("short-link-preview-img");
  const previewEmoji = document.getElementById("short-link-preview-emoji");
  const titleEl = document.getElementById("short-link-title");
  const descEl = document.getElementById("short-link-desc");
  const pathCard = document.getElementById("short-link-path-card");
  const targetEl = document.getElementById("short-link-target");
  const staleEl = document.getElementById("short-link-stale");
  const openBtn = document.getElementById("short-link-open-btn");
  const footnoteEl = document.getElementById("short-link-footnote");

  function parseRoute() {
    const match = location.pathname.match(/^\/link\/([^/]+)\/([^/]+)\/?$/i);
    if (!match) return null;
    return {
      agentId: decodeURIComponent(match[1]),
      code: decodeURIComponent(match[2]).toLowerCase()
    };
  }

  function setState(state) {
    if (root) root.dataset.state = state;
  }

  function showError(message) {
    setState("error");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }
    readyEl?.classList.add("hidden");
    loadingEl?.classList.add("hidden");
  }

  function hideAvatarLayers() {
    wsAvatarImg?.classList.add("hidden");
    wsAvatarEmoji?.classList.add("hidden");
    wsAvatarInitials?.classList.add("hidden");
  }

  function workspaceInitials(name, id) {
    const source = String(name || id || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (source.length >= 2) return source.slice(0, 2).toUpperCase();
    return source.slice(0, 1).toUpperCase();
  }

  function applyWorkspaceOrbit(data) {
    const name = String(data.workspaceName || data.agentId || "").trim();
    const slug = String(data.workspaceId || data.agentId || "").trim();
    if (!name && !slug) {
      workspaceOrbit?.classList.add("hidden");
      return;
    }

    if (workspaceNameEl) workspaceNameEl.textContent = name || slug;
    if (workspaceSlugEl) workspaceSlugEl.textContent = slug;

    hideAvatarLayers();
    const previewUrl = String(data.workspacePreviewUrl || "").trim();
    const emoji = String(data.workspaceEmoji || "").trim();

    if (previewUrl && wsAvatarImg) {
      wsAvatarImg.classList.remove("hidden");
      wsAvatarImg.alt = name || "Превью workspace";
      wsAvatarImg.onerror = () => {
        wsAvatarImg.classList.add("hidden");
        if (emoji && wsAvatarEmoji) {
          wsAvatarEmoji.textContent = emoji;
          wsAvatarEmoji.classList.remove("hidden");
        } else if (wsAvatarInitials) {
          wsAvatarInitials.textContent = workspaceInitials(name, slug);
          wsAvatarInitials.classList.remove("hidden");
        }
      };
      wsAvatarImg.src = previewUrl;
    } else if (emoji && wsAvatarEmoji) {
      wsAvatarEmoji.textContent = emoji;
      wsAvatarEmoji.classList.remove("hidden");
    } else if (wsAvatarInitials) {
      wsAvatarInitials.textContent = workspaceInitials(name, slug);
      wsAvatarInitials.classList.remove("hidden");
    }

    workspaceOrbit?.classList.remove("hidden");
  }

  function setPagePreviewHasMedia(hasMedia) {
    previewFrame?.classList.toggle("has-media", Boolean(hasMedia));
  }

  function applyPagePreviewMedia(data) {
    previewImg?.classList.add("hidden");
    previewEmoji?.classList.add("hidden");
    setPagePreviewHasMedia(false);

    const imageUrl = String(data.previewImageUrl || "").trim();
    const emoji = String(data.previewEmoji || "").trim();

    if (imageUrl && previewImg) {
      previewImg.classList.remove("hidden");
      previewImg.alt = String(data.title || "Превью страницы");
      previewImg.onload = () => setPagePreviewHasMedia(true);
      previewImg.onerror = () => {
        previewImg.classList.add("hidden");
        if (emoji && previewEmoji) {
          previewEmoji.textContent = emoji;
          previewEmoji.classList.remove("hidden");
          setPagePreviewHasMedia(true);
        }
      };
      previewImg.src = imageUrl;
      return;
    }

    if (emoji && previewEmoji) {
      previewEmoji.textContent = emoji;
      previewEmoji.classList.remove("hidden");
      setPagePreviewHasMedia(true);
    }
  }

  function renderCard(data) {
    setState("ready");
    loadingEl?.classList.add("hidden");
    errorEl?.classList.add("hidden");
    readyEl?.classList.remove("hidden");

    applyWorkspaceOrbit(data);

    const title = String(data.title || data.code || "Страница").trim();
    titleEl.textContent = title;
    document.title = `${title} — Agent CMS`;

    const description = String(data.description || "").trim();
    if (description) {
      descEl.textContent = description;
      descEl.classList.remove("hidden");
    } else {
      descEl.textContent = "";
      descEl.classList.add("hidden");
    }

    if (data.targetPath && targetEl && pathCard) {
      targetEl.textContent = data.targetPath;
      pathCard.classList.remove("hidden");
    } else {
      pathCard?.classList.add("hidden");
    }

    if (data.targetExists === false) {
      staleEl.textContent =
        "Исходный файл не найден — ссылка могла устареть после перемещения материала.";
      staleEl.classList.remove("hidden");
    } else {
      staleEl.classList.add("hidden");
    }

    applyPagePreviewMedia(data);

    if (data.fullUrl) {
      openBtn.href = data.fullUrl;
      openBtn.classList.remove("is-disabled");
      openBtn.removeAttribute("aria-disabled");
      openBtn.title = "Открыть полную страницу";
    } else {
      openBtn.href = "#";
      openBtn.classList.add("is-disabled");
      openBtn.setAttribute("aria-disabled", "true");
      openBtn.title = "Полная страница недоступна";
    }

    if (footnoteEl) {
      const code = String(data.code || "").trim();
      if (code) {
        footnoteEl.textContent = `Agent CMS · код ${code}`;
        footnoteEl.classList.remove("hidden");
      } else {
        footnoteEl.textContent = "";
        footnoteEl.classList.add("hidden");
      }
    }

    if (data.previewImageUrl) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement("meta");
        ogImage.setAttribute("property", "og:image");
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute("content", data.previewImageUrl);
    }
  }

  async function loadPreview() {
    setState("loading");
    loadingEl?.classList.remove("hidden");
    readyEl?.classList.add("hidden");
    errorEl?.classList.add("hidden");

    const route = parseRoute();
    if (!route) {
      showError("Неверный адрес короткой ссылки.");
      return;
    }

    const apiUrl = `/api/public/short-link?agentId=${encodeURIComponent(route.agentId)}&code=${encodeURIComponent(route.code)}`;
    try {
      const res = await fetch(apiUrl, { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details || `HTTP ${res.status}`);
      renderCard(data);
    } catch (error) {
      showError(`Не удалось загрузить ссылку: ${error.message}`);
    }
  }

  loadPreview();
})();
