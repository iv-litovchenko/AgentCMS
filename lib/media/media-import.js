const http = require("http");
const https = require("https");
const dns = require("dns").promises;
const { isIP } = require("net");
const path = require("path");

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_REDIRECTS = 5;
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google",
  "instance-data"
]);

function isPrivateIpv4(parts) {
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpAddress(ip) {
  const normalized = String(ip || "").trim().toLowerCase();
  if (!normalized) return true;

  if (normalized.includes(":")) {
    if (normalized === "::1") return true;
    if (normalized.startsWith("fe80:")) return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice("::ffff:".length);
      if (isIP(mapped) === 4) return isPrivateIpAddress(mapped);
    }
    return false;
  }

  if (isIP(normalized) !== 4) return true;
  return isPrivateIpv4(normalized.split(".").map((part) => Number(part)));
}

function parseImportUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || "").trim());
  } catch {
    throw Object.assign(new Error("Invalid URL"), { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw Object.assign(new Error("Only http and https URLs are allowed"), { status: 400 });
  }
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error("URL credentials are not allowed"), { status: 400 });
  }
  return parsed;
}

async function assertImportHostAllowed(hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  if (!host) throw Object.assign(new Error("Invalid URL host"), { status: 400 });
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    throw Object.assign(new Error("URL host is not allowed"), { status: 400 });
  }

  if (isIP(host)) {
    if (isPrivateIpAddress(host)) {
      throw Object.assign(new Error("Private network URLs are not allowed"), { status: 400 });
    }
    return;
  }

  let addresses = [];
  try {
    addresses = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw Object.assign(new Error("Could not resolve URL host"), { status: 400 });
  }

  if (!addresses.length) {
    throw Object.assign(new Error("Could not resolve URL host"), { status: 400 });
  }

  for (const entry of addresses) {
    if (isPrivateIpAddress(entry.address)) {
      throw Object.assign(new Error("Private network URLs are not allowed"), { status: 400 });
    }
  }
}

function decodeContentDispositionFileName(headerValue) {
  const raw = String(headerValue || "").trim();
  if (!raw) return "";

  const utf8Match = raw.match(/filename\*=(?:UTF-8''|utf-8'')([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ""));
    } catch {
      return utf8Match[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  const plainMatch = raw.match(/filename="([^"]+)"/i) || raw.match(/filename=([^;]+)/i);
  return plainMatch ? plainMatch[1].trim().replace(/^["']|["']$/g, "") : "";
}

function resolveImportFileName({ url, fileName, contentType, contentDisposition }) {
  const explicit = String(fileName || "").trim();
  if (explicit) return explicit;

  const fromHeader = decodeContentDispositionFileName(contentDisposition);
  if (fromHeader) return fromHeader;

  try {
    const parsed = new URL(url);
    const base = path.basename(parsed.pathname);
    if (base && base !== "/") return base;
  } catch {
    // ignore
  }

  const mime = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (mime === "image/png") return "import.png";
  if (mime === "image/jpeg") return "import.jpg";
  if (mime === "image/gif") return "import.gif";
  if (mime === "image/webp") return "import.webp";
  if (mime === "text/plain") return "import.txt";
  if (mime === "application/json") return "import.json";
  if (mime === "application/pdf") return "import.pdf";
  return "import.bin";
}

function requestUrlOnce(urlString, { timeoutMs, maxBytes }) {
  const parsed = parseImportUrl(urlString);
  const lib = parsed.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      parsed,
      {
        method: "GET",
        headers: {
          "User-Agent": "YamlCMS-import/1.0",
          Accept: "*/*"
        },
        timeout: timeoutMs
      },
      (res) => {
        const statusCode = Number(res.statusCode || 0);
        const location = res.headers.location;

        if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
          res.resume();
          resolve({
            redirect: true,
            location: new URL(location, parsed).toString()
          });
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          reject(Object.assign(new Error(`Remote URL returned HTTP ${statusCode}`), { status: 502 }));
          return;
        }

        const chunks = [];
        let total = 0;
        res.on("data", (chunk) => {
          total += chunk.length;
          if (total > maxBytes) {
            req.destroy();
            reject(Object.assign(new Error(`Remote file is too large (max ${maxBytes} bytes)`), { status: 400 }));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          resolve({
            redirect: false,
            buffer: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "",
            contentDisposition: res.headers["content-disposition"] || ""
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(Object.assign(new Error("Remote URL request timed out"), { status: 504 }));
    });
    req.on("error", (error) => {
      reject(Object.assign(new Error(`Failed to fetch remote URL: ${error.message}`), { status: 502 }));
    });
    req.end();
  });
}

async function fetchBufferFromImportUrl(rawUrl, options = {}) {
  const maxBytes = Number(options.maxBytes) > 0 ? Number(options.maxBytes) : DEFAULT_MAX_BYTES;
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const maxRedirects = Number(options.maxRedirects) >= 0 ? Number(options.maxRedirects) : DEFAULT_MAX_REDIRECTS;

  let currentUrl = parseImportUrl(rawUrl).toString();
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const parsed = parseImportUrl(currentUrl);
    await assertImportHostAllowed(parsed.hostname);
    const result = await requestUrlOnce(currentUrl, { timeoutMs, maxBytes });
    if (!result.redirect) {
      if (!result.buffer?.length) {
        throw Object.assign(new Error("Remote URL returned empty body"), { status: 400 });
      }
      return {
        buffer: result.buffer,
        contentType: result.contentType,
        contentDisposition: result.contentDisposition,
        sourceUrl: currentUrl
      };
    }
    if (redirectCount >= maxRedirects) {
      throw Object.assign(new Error("Too many redirects while fetching remote URL"), { status: 400 });
    }
    currentUrl = result.location;
  }

  throw Object.assign(new Error("Failed to fetch remote URL"), { status: 502 });
}

module.exports = {
  DEFAULT_MAX_BYTES,
  fetchBufferFromImportUrl,
  resolveImportFileName
};
