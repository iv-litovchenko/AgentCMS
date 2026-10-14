const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseDql } = require("./parse");
const { compileDqlSqlite } = require("./compile-sqlite");

describe("compileDqlSqlite golden", () => {
  it("FROM + WHERE eq", () => {
    const plan = parseDql('FROM fin WHERE awn-type = "awn.page.topic" LIMIT 10');
    const { sql, countSql, params, countParams } = compileDqlSqlite(plan);
    assert.match(sql, /FROM records r/);
    assert.match(sql, /LIMIT \?/);
    assert.equal(params.length, countParams.length + 1);
    assert.match(countSql, /COUNT\(\*\)/);
    assert.ok(params.some((p) => String(p).startsWith("fin")));
  });

  it("OR uses parentheses in SQL", () => {
    const plan = parseDql('WHERE awn-type = "a" OR awn-type = "b"');
    const { sql } = compileDqlSqlite(plan);
    assert.match(sql, / OR /);
  });
});
