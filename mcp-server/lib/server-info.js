import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8")
);

/** @returns {string | null} */
export function resolveMcpIconPublicOrigin() {
  const keys = [
    "AGENT_CMS_MCP_ICON_BASE_URL",
    "AGENT_CMS_MCP_PUBLIC_URL",
    "AGENT_CMS_PUBLIC_URL",
    "AGENT_CMS_EDITOR_HTTPS_URL",
    "AGENT_CMS_EDITOR_HTTP_URL",
    "AGENT_CMS_BASE_URL",
    "YAMLCMS_BASE_URL"
  ];
  for (const key of keys) {
    const raw = String(process.env[key] || "").trim();
    if (!raw) continue;
    try {
      return new URL(raw).origin;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * MCP Implementation metadata (initialize → serverInfo).
 * Icons are meant for Streamable HTTP clients (Cursor / Claude URL); skipped for stdio unless forced.
 *
 * @param {{ transport?: "stdio" | "http" }} [options]
 */
export function getMcpServerInfo(options = {}) {
  const transport = options.transport || "stdio";
  const version = String(pkg.version || "0.0.0").trim() || "0.0.0";
  const info = {
    name: "agent-cms",
    title: "Agent CMS",
    version
  };

  const includeIcons =
    transport === "http" ||
    ["1", "true", "yes", "on"].includes(String(process.env.AGENT_CMS_MCP_INCLUDE_ICONS || "").trim().toLowerCase());

  if (!includeIcons) return info;

  const customIcon = String(process.env.AGENT_CMS_MCP_ICON_URL || "").trim();
  if (customIcon) {
    info.icons = [{ src: customIcon, mimeType: guessMimeType(customIcon), sizes: ["any"] }];
    return info;
  }

  const origin = resolveMcpIconPublicOrigin();
  if (!origin) return info;

  info.websiteUrl = origin;
  info.icons = [
    {
      src: `${origin}/favicon.png`,
      mimeType: "image/png",
      sizes: ["32x32", "192x192"]
    },
    {
      src: `${origin}/favicon.svg`,
      mimeType: "image/svg+xml",
      sizes: ["any"]
    }
  ];
  return info;
}

/** @param {string} url */
function guessMimeType(url) {
  const lower = url.toLowerCase();
  if (lower.includes(".svg")) return "image/svg+xml";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "image/jpeg";
  return "image/png";
}
