#!/usr/bin/env node
"use strict";

const path = require("path");
const {
  listPlatformEnvKeys,
  readPlatformEnvKey,
  writePlatformEnvKey
} = require("../lib/ops/platform-root-env");

function resolveHome() {
  const home = String(process.env.AGENT_CMS_HOME || "").trim();
  if (home && require("fs").existsSync(path.join(home, "package.json"))) {
    return path.resolve(home);
  }
  const cwd = process.cwd();
  if (require("fs").existsSync(path.join(cwd, "package.json"))) {
    return cwd;
  }
  console.error("Задайте AGENT_CMS_HOME или запускайте из корня репозитория.");
  process.exit(1);
}

function usage() {
  console.error(`Usage:
  agent-cms env show [--reveal] [KEY]
  agent-cms env set KEY=VALUE
  agent-cms env set KEY VALUE`);
  process.exit(1);
}

function printKeyLine(entry) {
  const cur = entry.current || {};
  const disp = cur.redacted ? "***" : (cur.display ?? cur.value ?? "");
  const flag = entry.secret ? " (secret)" : "";
  const unk = entry.unknownKey ? " (not in .env.example)" : "";
  console.log(`${entry.key}=${disp}${flag}${unk}`);
}

const home = resolveHome();
const args = process.argv.slice(2);
const sub = args[0];

if (!sub || sub === "-h" || sub === "--help") {
  usage();
}

if (sub === "show") {
  const reveal = args.includes("--reveal");
  const keyArg = args.slice(1).find((a) => !a.startsWith("-"));
  if (keyArg) {
    const one = readPlatformEnvKey(home, keyArg, { revealSecrets: reveal });
    if (!one.ok) {
      console.error(one.message || one.error || "read failed");
      process.exit(1);
    }
    console.log(`${one.key}=${one.redacted ? "***" : one.value ?? ""}`);
    process.exit(0);
  }
  const list = listPlatformEnvKeys(home, { revealSecrets: reveal });
  if (!list.ok) {
    console.error(list.error || "list failed");
    process.exit(1);
  }
  for (const entry of list.keys) {
    printKeyLine(entry);
  }
  process.exit(0);
}

if (sub === "set") {
  let key;
  let value;
  const rest = args.slice(1).filter((a) => !a.startsWith("-"));
  if (rest.length === 0) usage();
  if (rest[0].includes("=")) {
    const joined = rest.join(" ");
    const eq = joined.indexOf("=");
    key = joined.slice(0, eq);
    value = joined.slice(eq + 1);
  } else {
    key = rest[0];
    value = rest.slice(1).join(" ");
  }
  if (value === undefined) {
    console.error("Нужно значение: agent-cms env set KEY=VALUE");
    process.exit(1);
  }
  const result = writePlatformEnvKey(home, key, value);
  if (!result.ok) {
    console.error(result.message || result.error || "write failed");
    process.exit(1);
  }
  console.log(result.message || `OK ${result.key}`);
  if (result.secret) {
    console.log("(secret key — значение не выводится)");
  }
  process.exit(0);
}

usage();
