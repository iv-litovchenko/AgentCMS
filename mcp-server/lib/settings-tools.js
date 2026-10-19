import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const settingsScope = z
  .enum(["all", "platform", "workspace", "integrations", "plugins", "user", "global", "local"])
  .optional()
  .describe(
    "Settings scope: all (default for list), platform/global, workspace/local, integrations/plugins, or user"
  );

const settingsScopeRequired = z
  .enum(["platform", "workspace", "integrations", "plugins", "user", "global", "local"])
  .describe("Settings scope: platform/global, workspace/local, integrations/plugins, or user");

const settingKey = z.string().min(1).describe("Setting key from settings schema, e.g. mcp-mode, tree-max-depth");

const settingValue = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  .describe("New value (type coerced from schema defaults)");

export function registerSettingsTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "settings_list",
    legacy: "list_settings",
    description:
      "List Agent CMS settings with values and schema metadata (platform .agent-cms-global/settings/platform.yml, workspace .agent-cms/settings/workspace.yml, integrations .agent-cms/settings/integrations.yml, user .agent-cms/settings/user.yml).",
    schema: z.object({
      scope: settingsScope.describe(
        "Filter scope: all (default), platform, workspace, integrations, or user"
      )
    }),
    handler: ({ scope }) => client.get("/api/agent/settings/list", { scope: scope || "all" })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "setting_read",
    legacy: "read_setting",
    description: "Read one setting value with schema metadata (title, readonly, runtimeEffect).",
    schema: z.object({
      scope: settingsScopeRequired,
      key: settingKey
    }),
    handler: ({ scope, key }) => client.get("/api/agent/settings/read", { scope, key })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "setting_write",
    legacy: "write_setting",
    description:
      "Write one setting value. Readonly keys (sys-*, awn-id-*) are rejected. Blocked in mcp-mode=readonly.",
    schema: z.object({
      scope: settingsScopeRequired,
      key: settingKey,
      value: settingValue
    }),
    handler: ({ scope, key, value }) => client.post("/api/agent/settings/write", { scope, key, value })
  });
}
