const BASE64_INVALID_DETAILS =
  "Parameter data must be base64-encoded file bytes. Plain text or markdown is not accepted — use create_content { body } for text records, import_content_from_url for remote files.";

/** Hard cap for MCP tools that accept base64 (content_binary_write, content_write data=…). Editor HTTP keeps higher limits. */
const DEFAULT_MCP_BINARY_BASE64_MAX_BYTES = 1024 * 1024;

const MCP_BASE64_UPLOAD_TOO_LARGE_DETAILS =
  "Use content_binary_upload_begin (sizeBytes) → PUT raw bytes to putUrl → content_binary_upload_complete.";

function getMcpBinaryBase64MaxBytes() {
  const fromEnv = Number(process.env.AGENT_CMS_MCP_BASE64_MAX_BYTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.floor(fromEnv);
  return DEFAULT_MCP_BINARY_BASE64_MAX_BYTES;
}

function estimateDecodedBase64ByteLength(raw) {
  const normalized = normalizeBase64Payload(raw);
  if (!normalized) return 0;
  let padding = 0;
  if (normalized.endsWith("==")) padding = 2;
  else if (normalized.endsWith("=")) padding = 1;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function assertMcpBinaryBase64UploadWithinLimit(raw, { label = "data" } = {}) {
  const maxBytes = getMcpBinaryBase64MaxBytes();
  const sizeBytes = estimateDecodedBase64ByteLength(raw);
  if (sizeBytes > maxBytes) {
    throw Object.assign(
      new Error(
        `${label} too large for base64 upload (${sizeBytes} bytes; MCP max ${maxBytes}). ${MCP_BASE64_UPLOAD_TOO_LARGE_DETAILS}`
      ),
      {
        status: 413,
        details: MCP_BASE64_UPLOAD_TOO_LARGE_DETAILS,
        maxBytes,
        sizeBytes
      }
    );
  }
}

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
  DEFAULT_MCP_BINARY_BASE64_MAX_BYTES,
  MCP_BASE64_UPLOAD_TOO_LARGE_DETAILS,
  assertMcpBinaryBase64UploadWithinLimit,
  decodeBase64UploadData,
  estimateDecodedBase64ByteLength,
  getMcpBinaryBase64MaxBytes,
  normalizeBase64Payload
};
