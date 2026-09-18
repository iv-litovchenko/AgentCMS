const fs = require("fs");
const path = require("path");

const COUNTER_FILE = "id-autoincrement.json";

function getCounterPath(agentRoot) {
  return path.join(agentRoot, COUNTER_FILE);
}

function readCounter(agentRoot) {
  const file = getCounterPath(agentRoot);
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw);
    const next = Number(data?.next);
    const issued = Number(data?.issued);
    return {
      next: Number.isFinite(next) && next > 0 ? Math.floor(next) : 1,
      issued: Number.isFinite(issued) && issued >= 0 ? Math.floor(issued) : 0,
      updatedAt: data?.updatedAt || null
    };
  } catch {
    return { next: 1, issued: 0, updatedAt: null };
  }
}

function writeCounter(agentRoot, data) {
  const file = getCounterPath(agentRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = {
    next: data.next,
    issued: data.issued,
    updatedAt: data.updatedAt || new Date().toISOString(),
    model: "workspace-id-autoincrement-v1"
  };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  return payload;
}

function allocateNextId(agentRoot) {
  const current = readCounter(agentRoot);
  const id = current.next;
  writeCounter(agentRoot, {
    next: id + 1,
    issued: current.issued + 1,
    updatedAt: new Date().toISOString()
  });
  return id;
}

function bumpCounterFloor(agentRoot, minNext) {
  const floor = Number(minNext);
  if (!Number.isFinite(floor) || floor <= 0) return readCounter(agentRoot);
  const current = readCounter(agentRoot);
  if (current.next >= floor) return current;
  return writeCounter(agentRoot, {
    next: Math.floor(floor),
    issued: current.issued,
    updatedAt: new Date().toISOString()
  });
}

module.exports = {
  COUNTER_FILE,
  getCounterPath,
  readCounter,
  writeCounter,
  allocateNextId,
  bumpCounterFloor
};
