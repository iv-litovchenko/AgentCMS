import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const pagePath = z
  .string()
  .min(1)
  .describe(
    "Path to hub manifest.md (awn.hub.topic|area|ws), e.g. awn-topics/finansy/manifest.md"
  );

const workspaceFilePath = z
  .string()
  .min(1)
  .describe(
    "Workspace-relative file path, e.g. awn-topics/tema/awn-storage/media/photo.png (same as UI cloud sync)"
  );

const mediaCloudScope = z
  .enum(["file", "topic"])
  .optional()
  .describe("file (default) — one file; topic — all media files under the page");

const providerId = z
  .string()
  .optional()
  .describe("Provider key from platform media-cloud-providers, e.g. google-drive, yandex-disk");

const MEDIA_CLOUD_STUB_MESSAGE =
  "Not implemented yet (stub). Local offload via module_media_cloud_sync works; remote API upload and public URLs are planned.";

export function registerMediaCloudTools(reg, client, { pagePath: pagePathSchema } = {}) {
  const manifestPath = pagePathSchema || pagePath;

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_media_cloud_providers_list",
    legacy: "list_media_cloud_providers",
    description:
      "module-media-cloud: default provider and catalog from platform settings (media-cloud-providers). Folders: awn-media-cloud/{key}/.",
    schema: z.object({}),
    handler: () => client.get("/api/media-cloud/providers")
  });

  const statusSchema = z.object({
    path: manifestPath,
    file: workspaceFilePath.optional().describe("Required when scope=file"),
    scope: mediaCloudScope,
    provider: providerId
  });

  const statusHandler = ({ path, file, scope, provider }) => {
    const scoped = String(scope || "file").trim();
    const query = { path, scope: scoped };
    if (scoped === "file" && file) query.file = file;
    if (provider) query.provider = provider;
    return client.get("/api/gdrive/status", query);
  };

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_media_cloud_status",
    legacy: "get_media_cloud_file_status",
    description:
      "module-media-cloud: sync status for one media path or whole topic media set. Local offload: symlink + awn-media-cloud/_blobs/ + registry.json providers[].",
    schema: statusSchema,
    handler: statusHandler
  });

  const syncSchema = z.object({
    path: manifestPath,
    file: workspaceFilePath.optional().describe("Required when scope=file"),
    scope: mediaCloudScope,
    provider: providerId
  });

  const syncHandler = ({ path, file, scope, provider }) => {
    const scoped = String(scope || "file").trim();
    const body = { path, scope: scoped };
    if (scoped === "file" && file) body.file = file;
    if (provider) body.provider = provider;
    return client.post("/api/gdrive/toggle", body);
  };

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_media_cloud_sync",
    legacy: "sync_media_cloud_file",
    description:
      "module-media-cloud: toggle local offload — awn-media-cloud/_blobs/ (symlink at original path) or restore locally; per-provider add/remove when already synced. Not remote Google/Yandex API upload.",
    schema: syncSchema,
    handler: syncHandler
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_media_cloud_links_repair",
    legacy: "repair_media_cloud_links",
    description:
      "module-media-cloud: repair broken symlinks using awn-media-cloud/registry.json (same as UI «Починить ссылки»).",
    schema: z.object({}),
    handler: () => client.post("/api/gdrive/repair-links", {})
  });

  const stubUploadSchema = z.object({
    path: manifestPath,
    file: workspaceFilePath,
    provider: providerId.describe("Target provider key")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_media_cloud_upload",
    legacy: "upload_media_cloud_to_provider_zzz",
    description:
      "module-media-cloud STUB: future — upload blob to remote provider API (Google Drive, Yandex Disk). Use module_media_cloud_sync for local offload today.",
    schema: stubUploadSchema,
    handler: async () => ({
      ok: false,
      stub: true,
      tool: "module_media_cloud_upload",
      message: MEDIA_CLOUD_STUB_MESSAGE
    })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_media_cloud_url",
    legacy: "get_remote_url_zzz",
    description:
      "module-media-cloud STUB: future — public or share URL for a file on a provider after remote upload. registry remoteUrl not set by local sync alone.",
    schema: stubUploadSchema,
    handler: async () => ({
      ok: false,
      stub: true,
      tool: "module_media_cloud_url",
      remoteUrl: null,
      message: MEDIA_CLOUD_STUB_MESSAGE
    })
  });
}
