/** QR для ссылки «Мобила» (offline, vendor/qrcode.mjs). */

let qrLibPromise = null;

function loadQrLib() {
  if (!qrLibPromise) {
    qrLibPromise = import("./vendor/qrcode.mjs");
  }
  return qrLibPromise;
}

export async function renderMobileQr(target, text) {
  const value = String(text || "").trim();
  if (!target || !value) return false;
  try {
    const mod = await loadQrLib();
    const QRCode = mod.default || mod;
    if (target instanceof HTMLCanvasElement) {
      await QRCode.toCanvas(target, value, {
        width: 220,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" }
      });
      return true;
    }
    if (target instanceof HTMLImageElement) {
      target.src = await QRCode.toDataURL(value, {
        width: 220,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" }
      });
      return true;
    }
    return false;
  } catch (error) {
    console.warn("[shell-qr] render failed", error);
    return false;
  }
}

/** @deprecated use renderMobileQr */
export async function renderMobileQrCanvas(canvas, text) {
  return renderMobileQr(canvas, text);
}
