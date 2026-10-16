const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildDqlFromBuilder } = require("./build-query");

describe("buildDqlFromBuilder", () => {
  it("builds FROM WHERE WITH TEXT", () => {
    const dql = buildDqlFromBuilder({
      from: "awn-container/finansy",
      conditions: [{ field: "awn-type", op: "eq", value: "awn.hub.topic" }],
      withText: "аренда",
      limit: 20
    });
    assert.match(dql, /FROM awn-container\/finansy/);
    assert.match(dql, /awn-type = "awn.hub.topic"/);
    assert.match(dql, /WITH TEXT "аренда"/);
    assert.match(dql, /LIMIT 20/);
  });
});
