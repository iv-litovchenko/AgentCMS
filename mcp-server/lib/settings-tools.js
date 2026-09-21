import { z } from "zod";

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
  reg(
    "list_settings",
    "List Agent CMS settings with values and schema metadata (platform settings.global.yml, workspace settings.yml, integrations .agent-cms/integrations.yml, user .agent-cms/user-settings.yml).",
    z.object({
      scope: settingsScope.describe(
        "Filter scope: all (default), platform, workspace, integrations, or user"
      )
    }),
    ({ scope }) => client.get("/api/agent/settings/list", { scope: scope || "all" })
  );

  reg(
    "read_setting",
    "Read one setting value with schema metadata (title, readonly, runtimeEffect).",
    z.object({
      scope: settingsScopeRequired,
      key: settingKey
    }),
    ({ scope, key }) => client.get("/api/agent/settings/read", { scope, key })
  );

  reg(
    "write_setting",
    "Write one setting value. Readonly keys (sys-*, awn-id-*) are rejected. Blocked in mcp-mode=readonly.",
    z.object({
      scope: settingsScopeRequired,
      key: settingKey,
      value: settingValue
    }),
    ({ scope, key, value }) => client.post("/api/agent/settings/write", { scope, key, value })
  );
}
