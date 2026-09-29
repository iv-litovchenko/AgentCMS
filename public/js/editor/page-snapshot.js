/**
 * Снимок страницы хоста — title, URL, meta для карточки «Страница» в Agent CMS Voice.
 */
(function initPageSnapshot(global) {
  function readMeta(doc, name) {
    const el = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return String(el?.getAttribute("content") || "").trim();
  }

  function readFaviconHref(doc, baseHref) {
    const icon = doc.querySelector(
      'link[rel="icon"][href], link[rel="shortcut icon"][href], link[rel="apple-touch-icon"][href]'
    );
    if (!icon) return "";
    try {
      return new URL(icon.getAttribute("href") || "", baseHref).href;
    } catch {
      return String(icon.getAttribute("href") || "").trim();
    }
  }

  function readCanonicalHref(doc, baseHref) {
    const link = doc.querySelector('link[rel="canonical"][href]');
    if (!link) return "";
    try {
      return new URL(link.getAttribute("href") || "", baseHref).href;
    } catch {
      return "";
    }
  }

  function collectPageSnapshot(doc = document, { source } = {}) {
    const view = doc.defaultView;
    const baseHref = view?.location?.href || doc.baseURI || "";
    let url = baseHref;
    let hostname = "";
    let pathname = "";

    try {
      const parsed = new URL(baseHref);
      url = parsed.href;
      hostname = parsed.hostname;
      pathname = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      // ignore
    }

    const title = String(doc.title || "").trim();
    const description =
      readMeta(doc, "og:description") || readMeta(doc, "description") || readMeta(doc, "twitter:description");
    const siteName = readMeta(doc, "og:site_name") || hostname;
    const imageUrl = readMeta(doc, "og:image") || readMeta(doc, "twitter:image");
    const isCms = Boolean(global.PagePickerExtract?.isAgentCmsHost?.());

    return {
      url,
      hostname,
      pathname,
      title: title || hostname || url,
      description,
      siteName,
      faviconUrl: readFaviconHref(doc, baseHref),
      canonicalUrl: readCanonicalHref(doc, baseHref) || url,
      imageUrl,
      source: source || (isCms ? "agent-cms" : "host-document")
    };
  }

  global.PageSnapshot = {
    collect: () => collectPageSnapshot(document)
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
