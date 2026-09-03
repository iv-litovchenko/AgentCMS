let lightboxNode = null;
let lightboxGallery = null;
let lightboxBound = false;

const SHELL_IMAGE_ROOT_SELECTOR =
  ".shell-reply-body-formatted, .shell-chat-msg, .shell-reply-segment, .shell-reply-text, .shell-show-item";

function getShellImageSrc(img) {
  if (!(img instanceof HTMLImageElement)) return "";
  return String(img.dataset.fullSrc || img.currentSrc || img.getAttribute("src") || "").trim();
}

function getShellImageCaption(img) {
  if (!(img instanceof HTMLImageElement)) return "";

  const showCaption = img.closest(".shell-show-item")?.querySelector(".shell-show-caption");
  if (showCaption) return String(showCaption.textContent || "").trim();

  const figureCaption = img.closest("figure")?.querySelector("figcaption");
  if (figureCaption) return String(figureCaption.textContent || "").trim();

  const title = String(img.getAttribute("title") || "").trim();
  if (title) return title;

  const alt = String(img.alt || "").trim();
  if (alt && !/^(image|изображение|img|photo|picture)$/i.test(alt)) return alt;
  return "";
}

function buildShellLightboxGallery(triggerImg, activeSrc, alt = "", caption = "") {
  const galleryRoot = triggerImg?.closest?.(SHELL_IMAGE_ROOT_SELECTOR);
  if (!galleryRoot) {
    return { images: [{ src: activeSrc, alt, caption: caption || alt }], index: 0 };
  }

  const images = [];
  for (const img of galleryRoot.querySelectorAll("img")) {
    if (img.dataset.shellImgFallback === "1") continue;
    if (img.closest(".shell-image-lightbox")) continue;
    const src = getShellImageSrc(img);
    if (!src) continue;
    const itemCaption = getShellImageCaption(img);
    images.push({ src, alt: img.alt || "", caption: itemCaption });
  }

  if (images.length === 0) {
    return { images: [{ src: activeSrc, alt, caption: caption || alt }], index: 0 };
  }

  let index = images.findIndex((item) => item.src === activeSrc);
  if (index < 0) index = 0;
  return { images, index };
}

function updateShellLightboxNav() {
  if (!lightboxNode || !lightboxGallery) return;
  const { images, index } = lightboxGallery;
  const showNav = images.length > 1;
  const prevBtn = lightboxNode.querySelector(".shell-image-lightbox-prev");
  const nextBtn = lightboxNode.querySelector(".shell-image-lightbox-next");
  const counter = lightboxNode.querySelector(".shell-image-lightbox-counter");

  if (prevBtn) {
    prevBtn.disabled = index <= 0;
    prevBtn.hidden = !showNav;
  }
  if (nextBtn) {
    nextBtn.disabled = index >= images.length - 1;
    nextBtn.hidden = !showNav;
  }
  if (counter) {
    counter.textContent = showNav ? `${index + 1} / ${images.length}` : "";
    counter.hidden = !showNav;
  }
}

function showShellLightboxSlide(index) {
  if (!lightboxNode || !lightboxGallery) return;
  const { images } = lightboxGallery;
  if (index < 0 || index >= images.length) return;

  lightboxGallery.index = index;
  const item = images[index];
  const img = lightboxNode.querySelector(".shell-image-lightbox-img");
  const captionEl = lightboxNode.querySelector(".shell-image-lightbox-caption");
  if (img) {
    img.src = item.src;
    img.alt = item.alt || item.caption || "";
  }
  if (captionEl) {
    const caption = String(item.caption || item.alt || "").trim();
    captionEl.textContent = caption;
    captionEl.hidden = !caption;
  }
  updateShellLightboxNav();
}

function navigateShellLightbox(delta) {
  if (!lightboxGallery) return;
  showShellLightboxSlide(lightboxGallery.index + delta);
}

function closeShellImageLightbox() {
  if (!lightboxNode) return;
  lightboxNode.classList.add("hidden");
  lightboxGallery = null;
}

function ensureShellImageLightbox() {
  if (lightboxNode) return lightboxNode;

  const overlay = document.createElement("div");
  overlay.className = "shell-image-lightbox hidden";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Просмотр изображения");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "shell-image-lightbox-close";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.textContent = "×";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "shell-image-lightbox-nav shell-image-lightbox-prev";
  prevBtn.setAttribute("aria-label", "Предыдущее изображение");
  prevBtn.textContent = "‹";
  prevBtn.hidden = true;

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "shell-image-lightbox-nav shell-image-lightbox-next";
  nextBtn.setAttribute("aria-label", "Следующее изображение");
  nextBtn.textContent = "›";
  nextBtn.hidden = true;

  const counter = document.createElement("div");
  counter.className = "shell-image-lightbox-counter";
  counter.hidden = true;

  const stage = document.createElement("div");
  stage.className = "shell-image-lightbox-stage";

  const img = document.createElement("img");
  img.className = "shell-image-lightbox-img";
  img.alt = "";

  const caption = document.createElement("figcaption");
  caption.className = "shell-image-lightbox-caption";
  caption.hidden = true;

  stage.append(img, caption);
  overlay.append(closeBtn, prevBtn, nextBtn, counter, stage);
  document.body.appendChild(overlay);

  closeBtn.addEventListener("click", closeShellImageLightbox);
  prevBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    navigateShellLightbox(-1);
  });
  nextBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    navigateShellLightbox(1);
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeShellImageLightbox();
  });
  img.addEventListener("click", (event) => event.stopPropagation());
  stage.addEventListener("click", (event) => event.stopPropagation());

  let touchStartX = 0;
  overlay.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? 0;
    },
    { passive: true }
  );
  overlay.addEventListener("touchend", (event) => {
    if (overlay.classList.contains("hidden")) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? 0;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) < 48) return;
    navigateShellLightbox(deltaX > 0 ? -1 : 1);
  });

  document.addEventListener("keydown", (event) => {
    if (overlay.classList.contains("hidden")) return;
    if (event.key === "Escape") {
      closeShellImageLightbox();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateShellLightbox(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateShellLightbox(1);
    }
  });

  lightboxNode = overlay;
  return overlay;
}

export function openShellImageLightbox(src, alt = "", { trigger, caption = "" } = {}) {
  const normalizedSrc = String(src || "").trim();
  if (!normalizedSrc) return;
  const resolvedCaption =
    String(caption || "").trim() ||
    (trigger instanceof HTMLImageElement ? getShellImageCaption(trigger) : "") ||
    String(alt || "").trim();
  ensureShellImageLightbox();
  lightboxGallery = buildShellLightboxGallery(trigger, normalizedSrc, alt, resolvedCaption);
  showShellLightboxSlide(lightboxGallery.index);
  lightboxNode.classList.remove("hidden");
}

function isShellLightboxImageTarget(target) {
  if (!(target instanceof HTMLImageElement)) return false;
  if (target.dataset.shellImgFallback === "1") return false;
  if (target.closest(".shell-image-lightbox")) return false;
  if (target.closest(".shell-md-code-block, .shell-reply-tts-block, .footnotes")) return false;
  return Boolean(
    target.classList.contains("shell-show-image") ||
      target.closest(".shell-md") ||
      target.closest(".shell-show-item")
  );
}

export function initShellImageLightbox(root = document) {
  if (lightboxBound) return;
  const host = root?.documentElement ? root : document;
  if (!host) return;
  lightboxBound = true;

  host.addEventListener("click", (event) => {
    const target = event.target;
    if (!isShellLightboxImageTarget(target)) return;
    event.preventDefault();
    event.stopPropagation();
    openShellImageLightbox(getShellImageSrc(target), target.alt || "", {
      trigger: target,
      caption: getShellImageCaption(target)
    });
  });
}
