import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

export function registerNotificationTools({ reg, client, pagePath }) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "user_notification_send",
    legacy: "notify_user",
    description: "Push notification to CMS bell for the workspace user.",
    schema: z.object({
      title: z.string().min(1),
      message: z.string().optional(),
      path: pagePath.optional()
    }),
    handler: ({ title, message, path }) =>
      client.post("/api/agent/activity/notify", { title, message, manifestPath: path, path })
  });
}
