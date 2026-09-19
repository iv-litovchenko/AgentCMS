import { z } from "zod";

const storePath = z
  .string()
  .min(1)
  .describe("Store relPath under awn-data/, e.g. tasks, taxonomies/statuses, agent-registry/agents");

const recordRef = z
  .string()
  .optional()
  .describe("Record id or rel path (e.g. 1, section/2). Omit for singleton stores (main.md).");

export function registerIblockTools(reg, client) {
  // ── Infoblock container (iblock_*) ─────────────────────────────────────────

  reg(
    "iblock_list",
    "List infoblocks (awn-data): groups, collections, singletons.",
    z.object({}),
    () => client.get("/api/awn-data")
  );

  reg(
    "iblock_get",
    "One infoblock with schema, records and tree (MD or CSV).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/statuses, tasks")
    }),
    ({ store }) => client.get("/api/awn-data", { store })
  );

  reg(
    "iblock_create",
    "Create infoblock: group, collection (MD or CSV for taxonomies/), or singleton.",
    z.object({
      kind: z.enum(["group", "collection", "singleton"]).optional(),
      slug: z.string().min(1).describe("Folder slug under awn-data/, e.g. taxonomies/users"),
      name: z.string().optional(),
      description: z.string().optional(),
      hierarchy: z.boolean().optional(),
      withSampleRecord: z.boolean().optional()
    }),
    (payload) => client.post("/api/awn-data/stores", payload)
  );

  reg(
    "iblock_read_index",
    "Quick TOC for all infoblocks: kind, group, path, title, description, recordCount (awn-data/index.md). No body. indexFile.exists shows on-disk index.md.",
    z.object({}),
    () => client.get("/api/agent/awn-data-index")
  );

  reg(
    "iblock_refresh_index",
    "Refresh (rebuild and save) awn-data/index.md from iblock_list (kind/group/path/title/description table). overwrite=false skips if file exists.",
    z.object({
      overwrite: z
        .boolean()
        .optional()
        .describe("Replace existing index.md if present (default true). false → 409 when file exists.")
    }),
    ({ overwrite }) =>
      client.post("/api/agent/awn-data-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      })
  );

  reg(
    "iblock_read_schema",
    "Read record field schema from infoblock schema-mod.yml (instance override, not type catalog).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. tasks, taxonomies/statuses")
    }),
    ({ store }) => client.get("/api/awn-data/store-schema", { store })
  );

  reg(
    "iblock_read_properties",
    "Read full YAML frontmatter of infoblock manifest.md.",
    z.object({ store: storePath }),
    ({ store }) => client.get("/api/awn-data/store-properties", { store })
  );

  reg(
    "iblock_write_properties",
    "Patch YAML frontmatter of infoblock manifest.md. Send only keys to change — existing keys on disk are preserved.",
    z.object({
      store: storePath,
      content: z.string().describe("YAML patch, e.g. awn-name: Задачи")
    }),
    ({ store, content }) => client.post("/api/awn-data/store-properties", { store, content })
  );

  reg(
    "iblock_read_property",
    "Read one property from infoblock manifest.md (e.g. awn-name, awn-description).",
    z.object({
      store: storePath,
      key: z.string().min(1)
    }),
    ({ store, key }) => client.get("/api/awn-data/store-properties", { store, key })
  );

  reg(
    "iblock_write_property",
    "Set one property on infoblock manifest.md. Other keys preserved.",
    z.object({
      store: storePath,
      key: z.string().min(1),
      value: z.string()
    }),
    ({ store, key, value }) => client.post("/api/awn-data/store-properties", { store, key, value })
  );

  // ── Infoblock content (iblock_content_*) ───────────────────────────────────

  reg(
    "iblock_content_create",
    "Add record to infoblock collection (append CSV row or create {id}.md).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/tags"),
      id: z.string().optional(),
      title: z.string().optional(),
      parent: z.string().optional()
    }),
    (payload) => client.post("/api/awn-data/records", payload)
  );

  reg(
    "iblock_content_read_properties",
    "Read full YAML frontmatter of infoblock record ({id}.md or singleton main.md).",
    z.object({
      store: storePath,
      record: recordRef
    }),
    ({ store, record }) =>
      client.get("/api/awn-data/record-properties", {
        store,
        ...(record ? { record } : {})
      })
  );

  reg(
    "iblock_content_write_properties",
    "Patch YAML frontmatter of infoblock record. Send only keys to change — body and other keys preserved; awn-updated bumped when present.",
    z.object({
      store: storePath,
      record: recordRef,
      content: z.string()
    }),
    ({ store, record, content }) =>
      client.post("/api/awn-data/record-properties", {
        store,
        content,
        ...(record ? { record } : {})
      })
  );

  reg(
    "iblock_content_read_property",
    "Read one property from infoblock record.",
    z.object({
      store: storePath,
      record: recordRef,
      key: z.string().min(1)
    }),
    ({ store, record, key }) =>
      client.get("/api/awn-data/record-properties", {
        store,
        key,
        ...(record ? { record } : {})
      })
  );

  reg(
    "iblock_content_write_property",
    "Set one property on infoblock record. Body and other keys preserved; awn-updated bumped when present.",
    z.object({
      store: storePath,
      record: recordRef,
      key: z.string().min(1),
      value: z.string()
    }),
    ({ store, record, key, value }) =>
      client.post("/api/awn-data/record-properties", {
        store,
        key,
        value,
        ...(record ? { record } : {})
      })
  );
}
