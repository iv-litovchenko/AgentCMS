"use strict";

const fs = require("fs/promises");
const {
  createBinaryUploadSession,
  getBinaryUploadSession,
  appendBinaryUploadBytes,
  removeBinaryUploadSession,
  markBinaryUploadComplete
} = require("./binary-upload-sessions");
const { resolveBinaryUploadTarget } = require("./binary-upload-target");
const { readRequestBuffer } = require("../http/read-request-buffer");
const { resolvePublicBaseUrl } = require("../platform/platform-apps");
const { decodeBase64UploadData } = require("../media/base64-upload");

/** Max decoded bytes per MCP chunk (cloud agents without PUT to public URL). */
const MCP_BINARY_UPLOAD_CHUNK_MAX_BYTES = 48 * 1024;

function buildPutUrl(req, uploadId) {
  const base = resolvePublicBaseUrl(req).replace(/\/+$/, "");
  return `${base}/api/workspace/binary-upload/${encodeURIComponent(uploadId)}`;
}

async function beginBinaryUpload(req, payload) {
  const target = resolveBinaryUploadTarget(payload, { createSubdir: payload.createSubdir });
  const session = await createBinaryUploadSession({
    target,
    sizeBytes: payload.sizeBytes,
    mimeType: payload.mimeType,
    maxBytes: target.maxBytes
  });
  const putUrl = buildPutUrl(req, session.uploadId);
  const base = resolvePublicBaseUrl(req).replace(/\/+$/, "");
  return {
    uploadId: session.uploadId,
    method: "PUT",
    putUrl,
    chunkMethod: "POST",
    chunkUrl: `${base}/api/workspace/binary-upload/chunk`,
    chunkMaxBytes: MCP_BINARY_UPLOAD_CHUNK_MAX_BYTES,
    headers: { "Content-Type": payload.mimeType || "application/octet-stream" },
    expiresAt: new Date(session.expiresAt).toISOString(),
    maxBytes: session.maxBytes,
    placement: target.placement
  };
}

async function finalizeBinaryUploadSession(session, deps) {
  const {
    uploadWorkspaceFsFile,
    persistMediaUploadBuffer,
    resolveApiStorageContext,
    validateContentSlotAccess,
    getProjectRoot,
    getAgentRoot,
    readManifestAwnTypeId,
    slotKeyFromStorageFolder
  } = deps;

  const buffer = await fs.readFile(session.stagingPath);
  if (buffer.length !== session.sizeBytes) {
    throw Object.assign(new Error(`Expected ${session.sizeBytes} bytes, received ${buffer.length}`), {
      status: 400
    });
  }

  const { target } = session;
  if (target.mode === "workspace") {
    const result = await uploadWorkspaceFsFile(target.relPath, buffer, { mimeType: session.mimeType });
    if (result.error) {
      throw Object.assign(new Error(result.error), { status: result.status || 400, hint: result.hint });
    }
    return {
      mode: "workspace",
      path: result.path,
      ref: result.path,
      size: result.size,
      mimeType: result.mimeType || session.mimeType,
      placement: target.placement,
      created: result.created
    };
  }

  const policyManifest = String(target.contextRel || target.relPath || "").replace(/\\/g, "/");
  const slotKey = slotKeyFromStorageFolder(target.libraryFolder);
  const verdict = await validateContentSlotAccess({
    projectRoot: getProjectRoot(),
    agentRoot: getAgentRoot(),
    manifestRelPath: policyManifest,
    slotKey,
    getAwnType: readManifestAwnTypeId
  });
  if (!verdict.ok) {
    throw Object.assign(new Error(verdict.error || "Slot policy denied upload"), { status: 403 });
  }

  const storageContext = await resolveApiStorageContext(target.contextRel);
  if (!storageContext) {
    throw Object.assign(new Error("Invalid storage context path"), { status: 400 });
  }

  const result = await persistMediaUploadBuffer({
    relPath: target.relPath,
    storageContext,
    buffer,
    fileName: target.fileName,
    mimeType: session.mimeType,
    libraryFolder: target.libraryFolder,
    subdir: target.subdir,
    createSubdir: target.createSubdir
  });

  const ref =
    result.workspaceRef ||
    (target.subdir ? `${target.subdir}/${result.file}`.replace(/\/+/g, "/") : result.file) ||
    target.address.ref;
  return {
    mode: "media",
    path: target.relPath,
    ref,
    file: result.file,
    size: result.bytes ?? buffer.length,
    mimeType: result.mimeType || session.mimeType,
    placement: {
      ...target.placement,
      ref
    },
    previewUrl: result.previewUrl
  };
}

async function completeBinaryUpload(uploadId, deps) {
  const session = getBinaryUploadSession(uploadId);
  if (!session) {
    throw Object.assign(new Error("Upload session not found or expired"), { status: 404 });
  }
  if (session.status === "ready" && session.result) {
    return session.result;
  }
  if (session.receivedBytes !== session.sizeBytes) {
    throw Object.assign(
      new Error(`Upload incomplete: ${session.receivedBytes}/${session.sizeBytes} bytes`),
      { status: 400 }
    );
  }

  const result = await finalizeBinaryUploadSession(session, deps);
  markBinaryUploadComplete(uploadId, result);
  await removeBinaryUploadSession(uploadId, { keepFile: false });
  return result;
}

async function putBinaryUploadBody(req, uploadId) {
  const session = getBinaryUploadSession(uploadId);
  if (!session) {
    throw Object.assign(new Error("Upload session not found or expired"), { status: 404 });
  }
  const remaining = session.sizeBytes - session.receivedBytes;
  const maxChunk = Math.max(remaining, session.maxBytes - session.receivedBytes);
  const buffer = await readRequestBuffer(req, maxChunk);
  return appendBinaryUploadBytes(uploadId, buffer);
}

async function postBinaryUploadChunk(uploadId, base64Data) {
  const buffer = decodeBase64UploadData(base64Data, { label: "data" });
  if (buffer.length > MCP_BINARY_UPLOAD_CHUNK_MAX_BYTES) {
    throw Object.assign(
      new Error(
        `Chunk too large (${buffer.length} bytes decoded; max ${MCP_BINARY_UPLOAD_CHUNK_MAX_BYTES}). Send smaller base64 pieces.`
      ),
      { status: 413, maxChunkBytes: MCP_BINARY_UPLOAD_CHUNK_MAX_BYTES }
    );
  }
  return appendBinaryUploadBytes(uploadId, buffer);
}

function uploadSessionProgress(session) {
  return {
    uploadId: session.uploadId,
    receivedBytes: session.receivedBytes,
    sizeBytes: session.sizeBytes,
    status: session.status,
    complete: session.receivedBytes >= session.sizeBytes
  };
}

module.exports = {
  beginBinaryUpload,
  putBinaryUploadBody,
  postBinaryUploadChunk,
  completeBinaryUpload,
  getBinaryUploadSession,
  removeBinaryUploadSession,
  readRequestBuffer,
  uploadSessionProgress,
  MCP_BINARY_UPLOAD_CHUNK_MAX_BYTES
};
