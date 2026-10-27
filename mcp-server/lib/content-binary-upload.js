import { createRequire } from "node:module";
import { getContentSize } from "./content-core.js";

const require = createRequire(import.meta.url);

function pickPlacementPayload(args) {
  const sourceUrl = args.sourceUrl != null ? String(args.sourceUrl).trim() : "";
  const base = {
    sizeBytes: args.sizeBytes,
    mimeType: args.mimeType,
    createSubdir: args.createSubdir,
    ...(sourceUrl ? { sourceUrl } : {})
  };
  if (args.placement) {
    return {
      placement: args.placement,
      ...base
    };
  }
  return {
    path: args.path,
    slot: args.slot,
    ref: args.ref,
    ...base
  };
}

export async function beginContentBinaryUpload(client, args) {
  const sourceUrl = String(args.sourceUrl || "").trim();
  if (sourceUrl) {
    return client.post("/api/workspace/binary-upload/begin", pickPlacementPayload(args));
  }
  const sizeBytes = Number(args.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("sizeBytes must be a positive number (omit when sourceUrl is set)");
  }
  return client.post("/api/workspace/binary-upload/begin", pickPlacementPayload(args));
}

export async function chunkContentBinaryUpload(client, args) {
  const uploadId = String(args.uploadId || "").trim();
  if (!uploadId) throw new Error("uploadId is required");
  const data = String(args.data || "").trim();
  if (!data) throw new Error("data (base64 chunk) is required");
  return client.post("/api/workspace/binary-upload/chunk", { uploadId, data });
}

export async function completeContentBinaryUpload(client, args) {
  const uploadId = String(args.uploadId || "").trim();
  if (!uploadId) throw new Error("uploadId is required");
  return client.post("/api/workspace/binary-upload/complete", { uploadId });
}

export async function abortContentBinaryUpload(client, args) {
  const uploadId = String(args.uploadId || "").trim();
  if (!uploadId) throw new Error("uploadId is required");
  return client.post("/api/workspace/binary-upload/abort", { uploadId });
}

export async function statusContentBinaryUpload(client, args) {
  const uploadId = String(args.uploadId || "").trim();
  if (!uploadId) throw new Error("uploadId is required");
  return client.get("/api/workspace/binary-upload/status", { uploadId });
}

export async function getContentBinaryMetadata(client, args) {
  const slim = await getContentSize(client, args);
  const path = slim.workspacePath || slim.ref;
  return {
    placement: slim.placement,
    path,
    name: path ? String(path).split("/").pop() : undefined,
    size: slim.sizeBytes,
    mimeType: slim.mimeType,
    exists: slim.exists !== false,
    sizeBytes: slim.sizeBytes,
    hint: "Alias fields; prefer content_size_get for new integrations."
  };
}
