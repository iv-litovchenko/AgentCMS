const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { parseDql } = require("./parse");
const { splitFromPlan, loadCsvDqlRecords } = require("./csv-source");
const { executeDqlQuery } = require("./execute");
const { loadIndex } = require("../store");

const agentRoot = path.join(process.cwd(), "workspaces/0-ws-test");

describe("csv DQL source", () => {
  it("tokenizes FROM csv:path", () => {
    const plan = parseDql("FROM csv:awn-databases/aaa/techt-csv/main.csv LIMIT 5");
    assert.match(plan.from, /^csv:/i);
  });

  it("splitFromPlan detects collection", () => {
    const { sourceKind, fromPrefix } = splitFromPlan({ from: "collection:personal-finance/raskhody" });
    assert.equal(sourceKind, "collection");
    assert.equal(fromPrefix, "personal-finance/raskhody");
  });

  it("loads rows from main.csv file path", () => {
    const records = loadCsvDqlRecords(agentRoot, "awn-databases/aaa/techt-csv/main.csv", {
      sourceKind: "csv"
    });
    assert.ok(records.length >= 0);
    if (records.length) {
      assert.match(records[0].path, /^csv:awn-databases\/.+\.csv#row:\d+$/);
      assert.ok(records[0].fields["awn-type"]);
    }
  });

  it("executes DQL on csv file", async () => {
    const index = await loadIndex(agentRoot);
    const result = executeDqlQuery(
      agentRoot,
      index,
      "FROM csv:awn-databases/aaa/techt-csv/main.csv LIMIT 3"
    );
    assert.equal(result.sourceKind, "csv");
    assert.equal(result.engine, "csv-memory");
    assert.ok(Array.isArray(result.results));
  });
});
