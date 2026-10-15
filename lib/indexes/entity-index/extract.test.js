const test = require("node:test");
const assert = require("node:assert/strict");
const { extractMentionsFromContent } = require("./extract");

test("extractMentionsFromContent finds dates, wikilinks, money, hashtags", () => {
  const content = `---
tags: [demo, yaml-tag]
author: Иван Тестов
---

# Заметка

Встреча [[Проект Alpha]] 15.03.2026.
Купил ноутбук за 80 000 ₽.
Ссылка https://example.com и #inline-tag
`;
  const mentions = extractMentionsFromContent(content, "notes/demo.md");
  const types = new Set(mentions.map((m) => m.type));
  assert.ok(types.has("date"));
  assert.ok(types.has("topic"));
  assert.ok(
    mentions.some((m) => m.type === "money"),
    `money types: ${[...types].join(",")}`
  );
  assert.ok(types.has("url"));
  assert.ok(types.has("tag"));
  assert.ok(mentions.some((m) => m.type === "person" && m.label.includes("Иван")));
});
