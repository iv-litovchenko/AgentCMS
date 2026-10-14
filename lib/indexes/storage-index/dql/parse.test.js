const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseDql } = require("./parse");
const { createMemoryEvaluator } = require("./eval-memory");

describe("parseDql", () => {
  it("parses FROM WHERE OR", () => {
    const plan = parseDql(`
      FROM "awn-container/finansy"
      WHERE awn-type = "awn.page.topic" OR awn-type = "awn.content.record"
      LIMIT 10
    `);
    assert.equal(plan.from, "awn-container/finansy");
    assert.equal(plan.limit, 10);
    assert.equal(plan.where.type, "or");
  });

  it("parses GROUP BY and FLATTEN", () => {
    const plan = parseDql(`
      FROM fin
      FLATTEN awn-tags
      GROUP BY awn-type COUNT
    `);
    assert.equal(plan.flatten, "awn-tags");
    assert.equal(plan.groupBy, "awn-type");
    assert.equal(plan.aggregate.fn, "count");
  });

  it("parses LAST N DAYS", () => {
    const plan = parseDql("WHERE awn-create LAST 7 DAYS");
    assert.equal(plan.where.type, "relative-days");
    assert.equal(plan.where.days, 7);
  });

  it("parses multi SORT", () => {
    const plan = parseDql("SORT awn-create DESC, path ASC");
    assert.ok(Array.isArray(plan.sort));
    assert.equal(plan.sort.length, 2);
  });
});

describe("memory evaluator", () => {
  const records = [
    { path: "a/topic.md", fields: { "awn-type": { value: "awn.page.topic" } } },
    { path: "a/rashody/x.md", fields: { "awn-type": { value: "awn.content.record" } } },
    { path: "b/other.md", fields: { "awn-type": { value: "awn.page.topic" } } }
  ];

  it("filters by FROM prefix and OR", () => {
    const plan = parseDql(`
      FROM a
      WHERE awn-type = "awn.page.topic" OR awn-type = "awn.content.record"
    `);
    const { filterRecords } = createMemoryEvaluator("", new Map());
    const rows = filterRecords(records, plan);
    assert.equal(rows.length, 2);
  });
});
