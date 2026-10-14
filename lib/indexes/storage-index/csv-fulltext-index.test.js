const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  rebuildCsvFulltextFromRecords,
  searchCsvRowIndex
} = require("./csv-fulltext-index");

describe("csv-fulltext-index", () => {
  it("indexes csv rows and finds by cell text", () => {
    const records = [
      {
        path: "csv:awn-databases/x/main.csv#row:2",
        csvSourcePath: "awn-databases/x/main.csv",
        fields: {
          title: { value: "Аренда офиса" },
          amount: { value: "12000" }
        }
      },
      {
        path: "csv:awn-databases/x/main.csv#row:3",
        csvSourcePath: "awn-databases/x/main.csv",
        fields: { title: { value: "Кофе" }, amount: { value: "500" } }
      }
    ];
    const index = rebuildCsvFulltextFromRecords(records);
    assert.equal(index.rowCount, 2);
    const hits = searchCsvRowIndex(index, "аренда", { limit: 10 });
    assert.ok(hits.ready);
    assert.equal(hits.hits.length, 1);
    assert.equal(hits.hits[0].path, records[0].path);
    assert.match(hits.hits[0].snippet, /аренда/i);
  });

  it("respects pathPrefix scope", () => {
    const records = [
      {
        path: "csv:a/main.csv#row:2",
        csvSourcePath: "a/main.csv",
        fields: { note: { value: "alpha" } }
      },
      {
        path: "csv:b/main.csv#row:2",
        csvSourcePath: "b/main.csv",
        fields: { note: { value: "alpha beta" } }
      }
    ];
    const index = rebuildCsvFulltextFromRecords(records);
    const hits = searchCsvRowIndex(index, "alpha", { pathPrefix: "a", limit: 10 });
    assert.equal(hits.hits.length, 1);
    assert.equal(hits.hits[0].path, records[0].path);
  });
});
