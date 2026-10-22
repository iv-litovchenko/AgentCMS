import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeLegacyWorkspaceId } = require("../../lib/workspace/bundled-workspaces.js");

const INSTANCE_ID_RE = /^[a-z0-9][a-z0-9_-]*$/i;

/**
 * @param {string} raw
 * @returns {{ instanceId: string, workspaceId: string, qualifiedId: string }}
 */
export function parseWorkspaceRef(raw) {
  const input = String(raw || "").trim();
  if (!input) {
    return { instanceId: "local", workspaceId: "", qualifiedId: "" };
  }

  const colon = input.indexOf(":");
  if (colon > 0 && colon < input.length - 1) {
    const prefix = input.slice(0, colon);
    const rest = input.slice(colon + 1);
    if (INSTANCE_ID_RE.test(prefix) && prefix !== "http" && prefix !== "https") {
      const workspaceId = normalizeLegacyWorkspaceId(rest);
      return {
        instanceId: prefix,
        workspaceId,
        qualifiedId: `${prefix}:${workspaceId}`
      };
    }
  }

  const workspaceId = normalizeLegacyWorkspaceId(input);
  return { instanceId: "local", workspaceId, qualifiedId: workspaceId };
}
