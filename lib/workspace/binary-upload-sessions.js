"use strict";

const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { getAgentRoot } = require("../paths/agent-cms");

const DEFAULT_TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, object>} */
const sessions = new Map();

function stagingDirectory() {
  return path.join(getAgentRoot(), ".awn-system", "binary-upload-staging");
}

function purgeExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt <= now && session.status !== "ready") {
      sessions.delete(id);
      fs.unlink(session.stagingPath).catch(() => {});
    }
  }
}

/**
 * @param {object} params
 */
async function createBinaryUploadSession(params) {
  purgeExpiredSessions();
  const uploadId = randomUUID();
  const dir = stagingDirectory();
  await fs.mkdir(dir, { recursive: true });
  const stagingPath = path.join(dir, uploadId);
  await fs.writeFile(stagingPath, Buffer.alloc(0));

  const expectedSize = Number(params.sizeBytes);
  if (!Number.isFinite(expectedSize) || expectedSize <= 0) {
    throw Object.assign(new Error("sizeBytes must be a positive number"), { status: 400 });
  }

  const maxBytes = Math.min(Number(params.maxBytes) || expectedSize, params.target?.maxBytes || expectedSize);
  if (expectedSize > maxBytes) {
    throw Object.assign(new Error(`sizeBytes exceeds limit (${maxBytes} bytes)`), { status: 400 });
  }

  const session = {
    uploadId,
    target: params.target,
    sizeBytes: expectedSize,
    mimeType: params.mimeType ? String(params.mimeType).trim() : null,
    maxBytes,
    stagingPath,
    receivedBytes: 0,
    status: "pending",
    expiresAt: Date.now() + DEFAULT_TTL_MS,
    createdAt: Date.now()
  };
  sessions.set(uploadId, session);
  return session;
}

function getBinaryUploadSession(uploadId) {
  purgeExpiredSessions();
  const id = String(uploadId || "").trim();
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= Date.now() && session.status === "pending") {
    sessions.delete(id);
    fs.unlink(session.stagingPath).catch(() => {});
    return null;
  }
  return session;
}

async function appendBinaryUploadBytes(uploadId, buffer) {
  const session = getBinaryUploadSession(uploadId);
  if (!session) {
    throw Object.assign(new Error("Upload session not found or expired"), { status: 404 });
  }
  if (session.status !== "pending") {
    throw Object.assign(new Error(`Upload session is ${session.status}`), { status: 409 });
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error("Empty body"), { status: 400 });
  }
  const next = session.receivedBytes + buffer.length;
  if (next > session.maxBytes) {
    throw Object.assign(new Error(`Upload exceeds max ${session.maxBytes} bytes`), { status: 413 });
  }
  await fs.appendFile(session.stagingPath, buffer);
  session.receivedBytes = next;
  if (session.receivedBytes === session.sizeBytes) {
    session.status = "uploaded";
  } else if (session.receivedBytes > session.sizeBytes) {
    session.status = "failed";
    throw Object.assign(new Error("Uploaded more bytes than declared in sizeBytes"), { status: 400 });
  }
  return session;
}

async function removeBinaryUploadSession(uploadId, { keepFile = false } = {}) {
  const session = sessions.get(String(uploadId || "").trim());
  if (!session) return false;
  sessions.delete(session.uploadId);
  if (!keepFile) {
    await fs.unlink(session.stagingPath).catch(() => {});
  }
  return true;
}

function markBinaryUploadComplete(uploadId, result) {
  const session = sessions.get(String(uploadId || "").trim());
  if (!session) return null;
  session.status = "ready";
  session.result = result;
  return session;
}

module.exports = {
  createBinaryUploadSession,
  getBinaryUploadSession,
  appendBinaryUploadBytes,
  removeBinaryUploadSession,
  markBinaryUploadComplete
};
