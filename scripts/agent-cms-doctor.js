#!/usr/bin/env node
/**
 * agent-cms-cli doctor — git, docker, .env, HTTP (в т.ч. 503).
 */
const { execSync } = require("child_process");
const path = require("path");
const {
  findRepoRoot,
  readEnvFile,
  getPublicBaseUrl
} = require("../lib/desktop/public-url");

let failed = false;

function pass(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.log(`✗ ${msg}`);
  failed = true;
}
function warn(msg) {
  console.log(`⚠ ${msg}`);
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
}

async function probeGet(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "*/*" }
    });
    return { url, status: res.status, ok: res.ok || res.status === 401 || res.status === 403 };
  } catch (err) {
    const msg = err.cause?.code || err.cause?.message || err.message || String(err);
    return { url, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

function hostFromUrl(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return "";
  }
}

function explainHttp(result) {
  if (result.error) {
    return `ошибка: ${result.error}`;
  }
  const s = result.status;
  if (s >= 200 && s < 400) return `${s} OK`;
  if (s === 502) return `${s} Bad Gateway — Caddy не получил ответ от cms:3000`;
  if (s === 503) return `${s} Service Unavailable — CMS недоступен для Caddy (контейнер / healthcheck)`;
  if (s === 404) return `${s} Not Found`;
  return `${s}`;
}

async function main() {
  const repoRoot = findRepoRoot(path.join(__dirname, ".."));
  process.chdir(repoRoot);

  try {
    pass(`git ${sh("git --version").split("\n")[0]}`);
  } catch {
    fail("git не найден");
  }

  let dockerOk = false;
  try {
    sh("docker info", { stdio: "ignore" });
    pass(`docker ${sh("docker --version").split("\n")[0]}`);
    pass(sh("docker compose version").split("\n")[0]);
    dockerOk = true;
  } catch {
    fail("docker / compose не готов");
  }

  const envPath = path.join(repoRoot, ".env");
  if (!require("fs").existsSync(envPath)) {
    fail("нет .env");
  } else {
    pass(".env");
  }

  const env = readEnvFile(repoRoot);
  const domain = String(env.AGENT_CMS_PUBLIC_DOMAIN || "").trim();
  const publicUrl = String(env.AGENT_CMS_PUBLIC_URL || "").trim();
  const caddyEmail = String(env.AGENT_CMS_CADDY_EMAIL || "").trim();
  const platform =
    process.env.AGENT_CMS_CLI_PLATFORM ||
    (process.platform === "linux" ? "linux" : process.platform === "darwin" ? "mac" : "other");

  console.log(`home: ${repoRoot}`);

  if (domain) console.log(`  AGENT_CMS_PUBLIC_DOMAIN=${domain}`);
  if (publicUrl) console.log(`  AGENT_CMS_PUBLIC_URL=${publicUrl}`);
  if (caddyEmail) console.log(`  AGENT_CMS_CADDY_EMAIL=${caddyEmail}`);

  if (domain && publicUrl) {
    const h = hostFromUrl(publicUrl.replace(/\/+$/, "") || publicUrl);
    if (h && h !== domain) {
      warn(`домен в URL (${h}) ≠ AGENT_CMS_PUBLIC_DOMAIN (${domain})`);
    }
  }
  if (publicUrl && !/^https?:\/\/.+\..+/.test(publicUrl) && publicUrl.length < 12) {
    warn("AGENT_CMS_PUBLIC_URL выглядит обрезанным — проверьте .env");
  }
  if (platform === "linux" && domain === "localhost") {
    warn("AGENT_CMS_PUBLIC_DOMAIN=localhost — снаружи сайт по домену не настроен (ожидается реальный домен)");
  }
  if (platform === "linux" && domain && domain !== "localhost" && !caddyEmail) {
    warn("нет AGENT_CMS_CADDY_EMAIL — Let's Encrypt может не выпустить сертификат");
  }

  const base = getPublicBaseUrl(repoRoot);
  const probes = [];

  probes.push(`${base}/api/agent/mcp-ping`);
  if (platform === "linux") {
    probes.push("http://127.0.0.1/api/agent/mcp-ping");
    if (domain && domain !== "localhost") {
      const httpsBase = `https://${domain}`;
      if (httpsBase.replace(/\/+$/, "") !== base.replace(/\/+$/, "")) {
        probes.push(`${httpsBase}/api/agent/mcp-ping`);
      }
      probes.push(`http://${domain}/api/agent/mcp-ping`);
    }
  }

  const seen = new Set();
  console.log("");
  console.log("HTTP (с этого сервера):");
  for (const url of probes) {
    if (seen.has(url)) continue;
    seen.add(url);
    const result = await probeGet(url);
    const detail = explainHttp(result);
    if (result.ok) {
      pass(`${url} → ${detail}`);
    } else if (result.status) {
      fail(`${url} → ${detail}`);
      if (result.status === 503 || result.status === 502) {
        console.log("    → docker compose logs caddy cms --tail 40");
        console.log("    → docker compose ps");
      }
    } else {
      fail(`${url} → ${detail}`);
      if (/certificate|SSL|TLS|ECONNREFUSED|CERT/i.test(result.error || "")) {
        console.log("    → проверьте DNS, порты 80/443, AGENT_CMS_PUBLIC_DOMAIN и пересоздайте caddy:");
        console.log("      docker compose … up -d --force-recreate caddy");
      }
    }
  }

  if (dockerOk) {
    console.log("");
    try {
      const composeFile = platform === "linux" ? "docker-compose.linux.yml" : "docker-compose.mac.yml";
      const ps = sh(
        `docker compose -f ${composeFile} -f docker-compose.workspace-mounts.yml ps --format '{{.Name}}\t{{.State}}\t{{.Status}}'`,
        { cwd: repoRoot }
      );
      if (ps) {
        console.log("Docker:");
        for (const line of ps.split("\n")) {
          console.log(`  ${line}`);
        }
      } else {
        warn("контейнеры не запущены — agent-cms-cli start / rebuild");
        failed = true;
      }
    } catch {
      warn("docker compose ps не удалось");
    }
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
