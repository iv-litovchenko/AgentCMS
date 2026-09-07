const os = require("os");
const fs = require("fs");
const path = require("path");
const { getLanIPv4 } = require("./lan-ip");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { enrichShellPath, probeCliBinary } = require("../agent-shell/runtime-cli-env");
const { isTlsConfigured, usesTrustedDevCert } = require("./https-redirect");

const execFileAsync = promisify(execFile);
const packageJson = require("../package.json");

async function whichBinary(name, env = enrichShellPath()) {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    const { stdout } = await execFileAsync(cmd, [name], { timeout: 4000, env });
    const line = String(stdout || "")
      .trim()
      .split(/\r?\n/)[0]
      .trim();
    return line || null;
  } catch {
    return null;
  }
}

async function readCommandVersion(binary, args = ["--version"], env = enrichShellPath()) {
  try {
    const { stdout, stderr } = await execFileAsync(binary, args, {
      timeout: 5000,
      env,
      encoding: "utf8"
    });
    const line = String(stdout || stderr || "")
      .trim()
      .split(/\r?\n/)
      .find(Boolean);
    return line ? line.slice(0, 120) : null;
  } catch (error) {
    const line = String(error?.stdout || error?.stderr || "").trim().split(/\r?\n/)[0];
    return line ? line.slice(0, 120) : null;
  }
}

function readDevCertProvider(projectRoot) {
  try {
    return String(
      fs.readFileSync(path.join(projectRoot, ".dev-certs", "provider.txt"), "utf8")
    ).trim();
  } catch {
    return "";
  }
}

function formatPlatformLabel(platform = process.platform, arch = process.arch) {
  const names = {
    darwin: "macOS",
    win32: "Windows",
    linux: "Linux"
  };
  return `${names[platform] || platform} ${arch}`;
}

function shortenVersion(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const match = raw.match(/v?\d+(?:\.\d+){0,3}/);
  return match ? match[0].replace(/^v/, "v") : raw.slice(0, 24);
}

async function probeBinaryTool({
  id,
  label,
  binary,
  versionArgs = ["--version"],
  role = "recommended",
  env
}) {
  const resolved = await whichBinary(binary, env);
  if (!resolved) {
    return { id, label, role, status: "missing", value: "—", path: null };
  }
  const version = await readCommandVersion(resolved, versionArgs, env);
  return {
    id,
    label,
    role,
    status: "ok",
    value: shortenVersion(version) || "есть",
    path: resolved
  };
}

async function readMacComputerName(env = enrichShellPath()) {
  if (process.platform !== "darwin") return null;
  try {
    const { stdout } = await execFileAsync("/usr/sbin/scutil", ["--get", "ComputerName"], {
      timeout: 3000,
      env,
      encoding: "utf8"
    });
    const name = String(stdout || "").trim();
    return name || null;
  } catch {
    return null;
  }
}

async function buildSystemEnvironment(projectRoot = path.resolve(__dirname, "..")) {
  const env = enrichShellPath();
  const tlsConfigured = isTlsConfigured();
  const devCertProvider = readDevCertProvider(projectRoot);
  const lanIp = getLanIPv4(projectRoot);
  const computerName = (await readMacComputerName(env)) || os.hostname();

  const tools = await Promise.all([
    probeBinaryTool({ id: "npm", label: "npm", binary: "npm", env, role: "required" }),
    probeBinaryTool({ id: "git", label: "Git", binary: "git", env, role: "recommended" }),
    probeBinaryTool({
      id: "python",
      label: "Python",
      binary: process.platform === "win32" ? "python" : "python3",
      env,
      role: "recommended"
    }),
    probeBinaryTool({ id: "mkcert", label: "mkcert", binary: "mkcert", versionArgs: ["-version"], env, role: "recommended" }),
    probeBinaryTool({ id: "openssl", label: "OpenSSL", binary: "openssl", versionArgs: ["version"], env, role: "optional" })
  ]);

  const nodeTool = {
    id: "node",
    label: "Node.js",
    role: "required",
    status: "ok",
    value: shortenVersion(process.version) || process.version,
    path: process.execPath
  };

  let claudeTool = { id: "claude", label: "Claude CLI", role: "optional", status: "missing", value: "—", path: null };
  let codexTool = { id: "codex", label: "Codex CLI", role: "optional", status: "missing", value: "—", path: null };

  try {
    const claude = await probeCliBinary("claude", {});
    claudeTool = {
      id: "claude",
      label: "Claude CLI",
      role: "optional",
      status: claude.ok ? "ok" : "warn",
      value: claude.ok ? "ok" : "—",
      path: claude.binary || null,
      note: claude.ok ? null : claude.error || null
    };
  } catch {
    // optional
  }

  try {
    const codex = await probeCliBinary("codex", {});
    codexTool = {
      id: "codex",
      label: "Codex CLI",
      role: "optional",
      status: codex.ok ? "ok" : "warn",
      value: codex.ok ? "ok" : "—",
      path: codex.binary || null,
      note: codex.ok ? null : codex.error || null
    };
  } catch {
    // optional
  }

  let httpsTool = {
    id: "https",
    label: "HTTPS",
    role: "recommended",
    status: "missing",
    value: "HTTP only",
    path: null
  };

  if (tlsConfigured) {
    if (usesTrustedDevCert()) {
      httpsTool = {
        id: "https",
        label: "HTTPS",
        role: "recommended",
        status: "ok",
        value: "mkcert",
        path: path.join(projectRoot, ".dev-certs")
      };
    } else if (devCertProvider === "openssl") {
      httpsTool = {
        id: "https",
        label: "HTTPS",
        role: "recommended",
        status: "warn",
        value: "self-signed",
        path: path.join(projectRoot, ".dev-certs")
      };
    } else {
      httpsTool = {
        id: "https",
        label: "HTTPS",
        role: "recommended",
        status: "ok",
        value: "enabled",
        path: path.join(projectRoot, ".dev-certs")
      };
    }
  } else if (devCertProvider) {
    httpsTool = {
      id: "https",
      label: "HTTPS",
      role: "recommended",
      status: "warn",
      value: `${devCertProvider} · off`,
      path: path.join(projectRoot, ".dev-certs")
    };
  }

  const electronPath = path.join(projectRoot, "node_modules", "electron", "package.json");
  const electronTool = {
    id: "electron",
    label: "Electron",
    role: "optional",
    status: fs.existsSync(electronPath) ? "ok" : "missing",
    value: fs.existsSync(electronPath)
      ? shortenVersion(JSON.parse(fs.readFileSync(electronPath, "utf8")).version)
      : "—",
    path: fs.existsSync(electronPath) ? path.dirname(electronPath) : null
  };

  const dependencies = [nodeTool, ...tools, httpsTool, claudeTool, codexTool, electronTool];

  return {
    host: {
      hostname: os.hostname(),
      computerName,
      platform: process.platform,
      platformLabel: formatPlatformLabel(process.platform, process.arch),
      arch: process.arch,
      release: os.release(),
      lanIp: lanIp || null,
      uptimeSec: Math.floor(os.uptime())
    },
    app: {
      name: packageJson.name,
      version: packageJson.version,
      nodeModules: fs.existsSync(path.join(projectRoot, "node_modules"))
    },
    dependencies,
    summaryLine: [computerName, formatPlatformLabel(process.platform, process.arch), lanIp ? lanIp : null]
      .filter(Boolean)
      .join(" · ")
  };
}

module.exports = {
  buildSystemEnvironment
};
