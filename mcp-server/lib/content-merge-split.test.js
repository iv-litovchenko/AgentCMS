import test from "node:test";
import assert from "node:assert/strict";
import {
  splitMarkdownBodyByH1,
  planSplitFiles,
  mergeMarkdownBodies,
  stripTitleOrdinalSuffix,
  planMergeFile
} from "./content-merge-split.js";

test("splitMarkdownBodyByH1 splits on single-hash headings only", () => {
  const body = "Intro\n\n# One\nA\n\n## not h1\n\n# Two\nB";
  const { preamble, sections } = splitMarkdownBodyByH1(body);
  assert.equal(preamble, "Intro");
  assert.equal(sections.length, 2);
  assert.match(sections[0].body, /^# One/);
  assert.match(sections[1].body, /^# Two/);
});

test("planSplitFiles titles use base title with ordinals", () => {
  const props = "title: My Project\ntags: [x]";
  const body = "# Part A\nA\n\n# Part B\nB";
  const files = planSplitFiles({
    properties: props,
    sourceRef: "notes/my-project.md",
    body,
    includePreamble: false
  });
  assert.equal(files.length, 2);
  assert.equal(files[0].title, "My Project (1)");
  assert.equal(files[1].title, "My Project (2)");
  assert.equal(files[0].ref, "notes/my-project-1.md");
});

test("stripTitleOrdinalSuffix", () => {
  assert.equal(stripTitleOrdinalSuffix("Foo (2)"), "Foo");
});

test("planMergeFile joins bodies", () => {
  const merged = planMergeFile({
    targetProperties: "title: Target",
    bodies: ["# A\n1", "# B\n2"],
    mergeTags: false,
    otherPropertiesList: []
  });
  assert.match(merged.body, /# A[\s\S]+---[\s\S]+# B/);
});
