const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { pathMatchesFromPrefix, compileFromPrefixSql } = require("./path-prefix");

describe("path-prefix", () => {
  it("matches md and csv paths for folder FROM", () => {
    assert.equal(pathMatchesFromPrefix("awn-databases/foo/x.md", "awn-databases/foo"), true);
    assert.equal(pathMatchesFromPrefix("csv:awn-databases/foo/main.csv#row:2", "awn-databases/foo"), true);
    assert.equal(pathMatchesFromPrefix("awn-topics/bar.md", "awn-databases/foo"), false);
  });

  it("compiles dual LIKE for md prefix", () => {
    const compiled = compileFromPrefixSql("awn-databases/foo");
    assert.match(compiled.sql, /OR/);
    assert.equal(compiled.params.length, 2);
  });

  it("matches union FROM prefixes", () => {
    assert.equal(
      pathMatchesFromPrefix("csv:awn-databases/a/x.csv#row:2", "awn-databases/a|awn-topics/b"),
      true
    );
    assert.equal(pathMatchesFromPrefix("awn-topics/b/x.md", "awn-databases/a|awn-topics/b"), true);
  });
});
