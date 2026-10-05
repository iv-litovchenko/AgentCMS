(function initCompanionFileHubBuffer(global) {
  "use strict";

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    if (!bytes.length) return "";
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const raw = String(base64 || "").trim();
    if (!raw) return null;
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function normalizeAttachBuffer(message) {
    if (!message || typeof message !== "object") return null;
    const b64 = message.fileBase64;
    if (typeof b64 === "string" && b64.length) {
      return base64ToArrayBuffer(b64);
    }
    const raw = message.buffer;
    if (raw instanceof ArrayBuffer) return raw;
    if (ArrayBuffer.isView(raw)) {
      return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
    }
    if (Array.isArray(raw) && raw.length) {
      return new Uint8Array(raw).buffer;
    }
    return null;
  }

  global.CompanionFileHubBuffer = {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    normalizeAttachBuffer
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
