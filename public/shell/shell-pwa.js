/** PWA helpers: standalone detection + «На экран Домой» banner. */

import { SHELL_STORAGE } from "/shell/shell-storage-keys.js?v=1";

const DEFAULT_DISMISS_KEY = SHELL_STORAGE.installDismiss;

export function isStandalonePwa() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function shouldOfferInstallBanner({ requireMobileContext = true } = {}) {
  if (isStandalonePwa()) return false;
  if (!requireMobileContext) return true;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  if (window.matchMedia("(max-width: 768px)").matches && "ontouchstart" in window) return true;
  return false;
}

/**
 * @param {{
 *   bannerEl?: HTMLElement | null,
 *   dismissBtn?: HTMLElement | null,
 *   dismissKey?: string,
 *   requireMobileContext?: boolean
 * }} options
 */
export function initShellInstallBanner({
  bannerEl,
  dismissBtn,
  dismissKey = DEFAULT_DISMISS_KEY,
  requireMobileContext = true
} = {}) {
  if (!bannerEl) return;
  if (!shouldOfferInstallBanner({ requireMobileContext })) return;
  if (localStorage.getItem(dismissKey) === "1") return;

  bannerEl.classList.remove("hidden");
  dismissBtn?.addEventListener("click", () => {
    localStorage.setItem(dismissKey, "1");
    bannerEl.classList.add("hidden");
  });
}
