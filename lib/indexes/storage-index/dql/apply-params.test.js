const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { applyDqlParams } = require("./apply-params");

describe("applyDqlParams", () => {
  it("replaces $from", () => {
    const dql = applyDqlParams('FROM $from\nWHERE source_kind = "csv-row"', {
      from: "awn-databases/aaa/techt-csv"
    });
    assert.match(dql, /FROM awn-databases\/aaa\/techt-csv/);
  });
});
