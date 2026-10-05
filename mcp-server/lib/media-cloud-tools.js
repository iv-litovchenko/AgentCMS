import { z } from "zod";

const pagePath = z
  .string()
  .min(1)
  .describe(
    "Path to page manifest.md (awn.page.topic|area|ws), e.g. awn-container/finansy/manifest.md"
  );

const workspaceFilePath = z
  .string()
  .min(1)
  .describe(
    "Workspace-relative file path, e.g. awn-container/tema/awn-storage/media/photo.png (same as UI cloud sync)"
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
  "Not implemented yet (zzz stub). Local offload via sync_media_cloud_file works; remote API upload and public URLs are planned.";

export function registerMediaCloudTools(reg, client, { pagePath: pagePathSchema } = {}) {
  const manifestPath = pagePathSchema || pagePath;

  reg(
    "list_media_cloud_providers",
    "Media cloud: default provider and catalog from platform settings (media-cloud-providers). Folders: awn-media-cloud/{key}/.",
    z.object({}),
    () => client.get("/api/media-cloud/providers")
  );

  reg(
    "get_media_cloud_file_status",
    "Media cloud sync status for a file or whole topic media set. Local offload: symlink + awn-media-cloud/_blobs/ + registry.json providers[].",
    z.object({
      path: manifestPath,
      file: workspaceFilePath.optional().describe("Required when scope=file"),
      scope: mediaCloudScope,
      provider: providerId
    }),
    ({ path, file, scope, provider }) => {
      const scoped = String(scope || "file").trim();
      const query = { path, scope: scoped };
      if (scoped === "file" && file) query.file = file;
      if (provider) query.provider = provider;
      return client.get("/api/gdrive/status", query);
    }
  );

  reg(
    "sync_media_cloud_file",
    "Toggle media cloud for a file or topic: offload to awn-media-cloud/_blobs/ (symlink at original path) or restore locally; per-provider add/remove when already synced.",
    z.object({
      path: manifestPath,
      file: workspaceFilePath.optional().describe("Required when scope=file"),
      scope: mediaCloudScope,
      provider: providerId
    }),
    ({ path, file, scope, provider }) => {
      const scoped = String(scope || "file").trim();
      const body = { path, scope: scoped };
      if (scoped === "file" && file) body.file = file;
      if (provider) body.provider = provider;
      return client.post("/api/gdrive/toggle", body);
    }
  );

  reg(
    "repair_media_cloud_links",
    "Repair broken symlinks for media cloud files using awn-media-cloud/registry.json (same as UI «Починить ссылки»).",
    z.object({}),
    () => client.post("/api/gdrive/repair-links", {})
  );

  reg(
    "upload_media_cloud_to_provider_zzz",
    "STUB (zzz): future — upload blob to remote provider API (Google Drive, Yandex Disk). Use sync_media_cloud_file for local offload today.",
    z.object({
      path: manifestPath,
      file: workspaceFilePath,
      provider: providerId.describe("Target provider key")
    }),
    async () => ({
      ok: false,
      stub: true,
      tool: "upload_media_cloud_to_provider_zzz",
      message: MEDIA_CLOUD_STUB_MESSAGE
    })
  );

  reg(
    "get_remote_url_zzz",
    "STUB (zzz): future — public or share URL for a file on a provider after remote upload. registry remoteUrl not set by local sync alone.",
    z.object({
      path: manifestPath,
      file: workspaceFilePath,
      provider: providerId.describe("Provider key")
    }),
    async () => ({
      ok: false,
      stub: true,
      tool: "get_remote_url_zzz",
      remoteUrl: null,
      message: MEDIA_CLOUD_STUB_MESSAGE
    })
  );
}
