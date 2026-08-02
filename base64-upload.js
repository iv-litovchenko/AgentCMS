const BASE64_INVALID_DETAILS =
  "Parameter data must be base64-encoded file bytes. Plain text or markdown is not accepted — use create_content { body } for text records, import_content_from_url for remote files.";

function normalizeBase64Payload(raw) {
  let data = String(raw ?? "").trim();
  if (!data) return "";
  const dataUrlMatch = /^data:[^;]+;base64,(.+)$/is.exec(data);
  if (dataUrlMatch) data = dataUrlMatch[1].trim();
  return data.replace(/\s+/g, "");
}

function decodeBase64UploadData(raw, { label = "file data" } = {}) {
  const normalized = normalizeBase64Payload(raw);
  if (!normalized) {
    throw Object.assign(new Error(`Missing ${label}`), { status: 400 });
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw Object.assign(new Error("Invalid base64 data"), {
      status: 400,
      details: BASE64_INVALID_DETAILS
    });
  }

  if (normalized.length % 4 === 1) {
    throw Object.assign(new Error("Invalid base64 data"), {
      status: 400,
      details: "Malformed base64 padding. Encode raw file bytes as base64 before upload."
    });
  }

  const buffer = Buffer.from(normalized, "base64");
  const roundTrip = buffer.toString("base64").replace(/=+$/, "");
  const inputNorm = normalized.replace(/=+$/, "");

  if (!buffer.length) {
    throw Object.assign(new Error("Empty file data"), { status: 400 });
  }

  if (roundTrip !== inputNorm) {
    throw Object.assign(new Error("Invalid base64 data"), {
      status: 400,
      details: BASE64_INVALID_DETAILS
    });
  }

  return buffer;
}

module.exports = {
  BASE64_INVALID_DETAILS,
  decodeBase64UploadData,
  normalizeBase64Payload
};
