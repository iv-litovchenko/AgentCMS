const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { serializeDqlResultsCsv } = require("./export-results");

describe("export-results", () => {
  it("serializes rows to csv", () => {
    const csv = serializeDqlResultsCsv([
      { path: "a.md", fields: { "awn-name": { value: "Test" } } }
    ]);
    assert.match(csv, /path/);
    assert.match(csv, /awn-name/);
    assert.match(csv, /Test/);
  });
});
