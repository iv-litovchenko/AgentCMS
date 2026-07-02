const SHOW_BLOCK_RE = /\[show\]([\s\S]*?)\[\/show\]/gi;
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

function parseShowBlockBody(blockBody) {
  const fields = {};
  for (const line of String(blockBody || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf(":");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim().toLowerCase();
    const value = trimmed.slice(sep + 1).trim();
    if (key && value) fields[key] = value;
  }

  const type = fields.type || "image";
  const src = fields.src || fields.url || fields.image || fields.href || "";
  const caption = fields.caption || fields.title || fields.alt || "";
  if (!src) return null;
  return { type, src, caption };
}

export function parseShellReply(body) {
  const raw = String(body || "");
  const shows = [];

  raw.replace(SHOW_BLOCK_RE, (_, blockBody) => {
    const item = parseShowBlockBody(blockBody);
    if (item) shows.push(item);
    return "";
  });

  let text = raw.replace(SHOW_BLOCK_RE, "").trim();
  text = text.replace(MARKDOWN_IMAGE_RE, (_, alt, src) => {
    shows.push({
      type: "image",
      src: String(src || "").trim(),
      caption: String(alt || "").trim()
    });
    return "";
  }).trim();

  if (!text && shows.length) text = "—";
  return { text: text || "—", shows };
}

export function resolveShowSrc(src, agentId) {
  const raw = String(src || "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;

  if (raw.startsWith("/")) {
    const url = new URL(raw, window.location.origin);
    if (agentId && url.pathname.startsWith("/api/") && !url.searchParams.has("agent")) {
      url.searchParams.set("agent", agentId);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return raw;
}

export function toSpeechText(body) {
  const { text, shows } = parseShellReply(body);
  let speech = text === "—" ? "" : text;
  for (const item of shows) {
    if (item.caption) {
      speech = speech ? `${speech} ${item.caption}` : item.caption;
    }
  }
  return speech.trim();
}

export function renderShellReplyMedia(containerEl, shows, agentId) {
  if (!containerEl) return;
  containerEl.innerHTML = "";
  const items = Array.isArray(shows) ? shows.filter((item) => item?.src) : [];
  containerEl.classList.toggle("hidden", !items.length);
  if (!items.length) return;

  for (const item of items) {
    const wrap = document.createElement("figure");
    wrap.className = "shell-show-item";

    if (item.type === "image" || !item.type) {
      const img = document.createElement("img");
      img.className = "shell-show-image";
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = item.caption || "Изображение от агента";
      img.src = resolveShowSrc(item.src, agentId);
      img.addEventListener("click", () => {
        window.open(img.src, "_blank", "noopener,noreferrer");
      });
      wrap.append(img);
    } else {
      const link = document.createElement("a");
      link.className = "shell-show-link";
      link.href = resolveShowSrc(item.src, agentId);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.caption || item.src;
      wrap.append(link);
    }

    if (item.caption) {
      const cap = document.createElement("figcaption");
      cap.className = "shell-show-caption";
      cap.textContent = item.caption;
      wrap.append(cap);
    }

    containerEl.append(wrap);
  }
}
