const test = require("node:test");
const assert = require("node:assert/strict");
const { paginateItems, parseListPagination } = require("./contents-list-pagination.js");
const { filterItemsByAdvancedQuery } = require("./contents-list-filters.js");
const { sortListItems } = require("./contents-list-sort.js");
const { resolveListParentContext, sectionMatchesParent } = require("./contents-list-parent.js");
const { encodeListCursor, decodeListCursor, resolvePaginationStart } = require("./contents-list-cursor.js");
const { applyDatabaseRecordsListQuery } = require("./contents-list-records.js");

test("paginateItems returns nextCursor with sort", () => {
  const items = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
    { id: "c", title: "C" }
  ];
  const page = paginateItems(items, parseListPagination({ limit: 2, offset: 0 }), { sort: "name" });
  assert.equal(page.items.length, 2);
  assert.equal(page.hasMore, true);
  assert.ok(page.nextCursor);
  const decoded = decodeListCursor(page.nextCursor);
  assert.equal(decoded.sort, "name");
  assert.equal(decoded.after.id, "b");
});

test("stable cursor continues after anchor id", () => {
  const items = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
    { id: "c", title: "C" }
  ];
  const c1 = paginateItems(items, parseListPagination({ limit: 1 }), { sort: "name" });
  const page2 = paginateItems(items, parseListPagination({ limit: 2, cursor: c1.nextCursor }), {
    sort: "name"
  });
  assert.deepEqual(page2.items.map((i) => i.id), ["b", "c"]);
});

test("filter ext and status", () => {
  const items = [
    { kind: "entry", id: "1", title: "A", ref: "a.md", ext: ".md", status: "draft" },
    { kind: "entry", id: "2", title: "B", ref: "b.png", ext: ".png", status: "done" }
  ];
  const md = filterItemsByAdvancedQuery(items, { entryType: "md" });
  assert.equal(md.length, 1);
  const done = filterItemsByAdvancedQuery(items, { status: "done" });
  assert.equal(done[0].id, "2");
});

test("sort manual uses sortOrder", () => {
  const items = [
    { id: "b", title: "B" },
    { id: "a", title: "A" }
  ];
  const sorted = sortListItems(items, { sort: "manual" }, { sortOrder: ["a", "b"] });
  assert.deepEqual(sorted.map((i) => i.id), ["a", "b"]);
});

test("resolveListParentContext finds section by id and path", () => {
  const items = [
    { kind: "section", id: "sec1", ref: "inbox/sec1/manifest.md", parent: null },
    { kind: "entry", id: "n1", parent: "sec1", ref: "inbox/sec1/n1.md" }
  ];
  assert.ok(sectionMatchesParent(items[0], "sec1"));
  assert.ok(sectionMatchesParent(items[0], "inbox/sec1"));
  const ctx = resolveListParentContext(items, "sec1");
  assert.equal(ctx.error, null);
  assert.equal(ctx.parentKey, "sec1");
  const bad = resolveListParentContext(items, "missing");
  assert.ok(bad.error);
});

test("applyDatabaseRecordsListQuery 404 on bad parent", () => {
  const payload = {
    store: "tasks",
    kind: "collection",
    records: [{ id: "1", title: "One", parent: null, isSection: false, fileName: "1.md" }]
  };
  const out = applyDatabaseRecordsListQuery(payload, { listMode: "entries", parent: "nope", limit: 10 });
  assert.equal(out.status, 404);
  assert.match(out.error, /Section not found/);
});
