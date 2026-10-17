(function initMaterialFileIcons(global) {
  const fallbackCfg = {
    base: "/vendor/material-file-icons/",
    default: "file.svg",
    byExt: {}
  };

  function getConfig() {
    return global.MATERIAL_FILE_ICONS || fallbackCfg;
  }

  function getExtension(relativePath) {
    const name = String(relativePath || "");
    const dot = name.lastIndexOf(".");
    return dot === -1 ? "" : name.slice(dot).toLowerCase();
  }

  function resolveIconFile(relativePath) {
    const cfg = getConfig();
    const ext = getExtension(relativePath);
    return (ext && cfg.byExt[ext]) || cfg.default || "file.svg";
  }

  function resolveIconUrl(relativePath) {
    const cfg = getConfig();
    const base = cfg.base || "/vendor/material-file-icons/";
    return `${base}${resolveIconFile(relativePath)}`;
  }

  function createIconImg(relativePath, options = {}) {
    const { className = "", alt = "", width = null, height = null } = options;
    const img = document.createElement("img");
    img.className = className;
    img.alt = alt;
    img.decoding = "async";
    img.loading = "lazy";
    img.src = resolveIconUrl(relativePath);
    if (width != null) img.width = width;
    if (height != null) img.height = height;
    return img;
  }

  function fillFileFallback(container, relativePath, emojiFallback = "📎") {
    if (!container) return container;
    container.replaceChildren();
    const img = createIconImg(relativePath, {
      className: "node-entry-overview-media-asset-file-fallback-icon",
      alt: ""
    });
    img.addEventListener("error", () => {
      container.replaceChildren();
      container.textContent = emojiFallback;
    });
    container.appendChild(img);
    return container;
  }

  function appendKindBadgeIcon(badge, relativePath, emojiFallback = "📎") {
    if (!badge) return;
    const img = createIconImg(relativePath, {
      className: "material-file-icon material-file-icon--kind-badge",
      alt: ""
    });
    img.addEventListener("error", () => {
      badge.insertBefore(document.createTextNode(`${emojiFallback} `), badge.firstChild);
    });
    badge.append(img, document.createTextNode(" "));
  }

  function fillInlineFileIcon(container, relativePath, emojiFallback = "📎", options = {}) {
    const {
      className = "material-file-icon material-file-icon--toc",
      width = 16,
      height = 16,
      replaceChildren = true
    } = options;
    if (!container) return container;
    if (replaceChildren) container.replaceChildren();
    const img = createIconImg(relativePath, {
      className,
      alt: "",
      width,
      height
    });
    img.addEventListener("error", () => {
      if (replaceChildren) {
        container.replaceChildren();
        container.textContent = emojiFallback;
      } else {
        img.replaceWith(document.createTextNode(emojiFallback));
      }
    });
    container.appendChild(img);
    return container;
  }

  global.MaterialFileIcons = {
    resolveIconUrl,
    createIconImg,
    fillFileFallback,
    appendKindBadgeIcon,
    fillInlineFileIcon
  };
})(window);
