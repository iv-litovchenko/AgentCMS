import { z } from "zod";

const storePath = z
  .string()
  .min(1)
  .describe("Store relPath under awn-data/, e.g. tasks, taxonomies/statuses, agent-registry/agents");

const recordRef = z
  .string()
  .optional()
  .describe("Record id or rel path (e.g. 1, section/2). Omit for singleton stores (main.md).");

export function registerDataPropertyTools(reg, client) {
  reg(
    "zzz_read_store_properties",
    "Read full YAML frontmatter of infoblock manifest.md (awn-data store).",
    z.object({ store: storePath }),
    ({ store }) => client.get("/api/awn-data/store-properties", { store })
  );

  reg(
    "zzz_write_store_properties",
    "Patch YAML frontmatter of infoblock manifest.md. Send only keys to change — existing keys on disk are preserved.",
    z.object({
      store: storePath,
      content: z.string().describe("YAML patch, e.g. awn-name: Задачи")
    }),
    ({ store, content }) => client.post("/api/awn-data/store-properties", { store, content })
  );

  reg(
    "zzz_read_store_property",
    "Read one property from infoblock manifest.md (e.g. awn-name, awn-description).",
    z.object({
      store: storePath,
      key: z.string().min(1)
    }),
    ({ store, key }) => client.get("/api/awn-data/store-properties", { store, key })
  );

  reg(
    "zzz_write_store_property",
    "Set one property on infoblock manifest.md. Other keys preserved.",
    z.object({
      store: storePath,
      key: z.string().min(1),
      value: z.string()
    }),
    ({ store, key, value }) => client.post("/api/awn-data/store-properties", { store, key, value })
  );

  reg(
    "zzz_read_record_properties",
    "Read full YAML frontmatter of an infoblock element ({id}.md or singleton main.md).",
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
    "zzz_write_record_properties",
    "Patch YAML frontmatter of an infoblock element. Send only keys to change — body and other keys preserved; awn-updated bumped when present.",
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
    "zzz_read_record_property",
    "Read one property from an infoblock element.",
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
    "zzz_write_record_property",
    "Set one property on an infoblock element. Body and other keys preserved; awn-updated bumped when present.",
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
