(function initMarkdownItTaskLists(global) {
  const TASK_PREFIX_RE = /^\[([ xX])\]\s+/;

  function stripTaskPrefixFromInline(inlineToken) {
    const match = inlineToken.content.match(TASK_PREFIX_RE);
    if (!match) return null;

    inlineToken.content = inlineToken.content.slice(match[0].length);
    if (Array.isArray(inlineToken.children)) {
      for (const child of inlineToken.children) {
        if (child.type !== "text") continue;
        if (!TASK_PREFIX_RE.test(child.content)) continue;
        child.content = child.content.replace(TASK_PREFIX_RE, "");
        break;
      }
    }

    return match[1].toLowerCase() === "x";
  }

  function findInlineTokenForListItem(tokens, listItemIndex) {
    for (let i = listItemIndex + 1; i < tokens.length; i += 1) {
      if (tokens[i].type === "list_item_close") break;
      if (tokens[i].type === "inline") return i;
    }
    return -1;
  }

  function markParentListAsTaskList(tokens, listItemIndex) {
    for (let i = listItemIndex - 1; i >= 0; i -= 1) {
      const type = tokens[i].type;
      if (type === "bullet_list_open" || type === "ordered_list_open") {
        tokens[i].attrJoin("class", "contains-task-list");
        return;
      }
      if (type === "list_item_close" || type === "bullet_list_close" || type === "ordered_list_close") {
        break;
      }
    }
  }

  function markdownItTaskLists(md) {
    md.core.ruler.after("inline", "task-lists", function taskLists(state) {
      const tokens = state.tokens;
      for (let i = 0; i < tokens.length; i += 1) {
        if (tokens[i].type !== "list_item_open") continue;

        const inlineIndex = findInlineTokenForListItem(tokens, i);
        if (inlineIndex < 0) continue;

        const checked = stripTaskPrefixFromInline(tokens[inlineIndex]);
        if (checked === null) continue;

        tokens[i].attrJoin("class", "task-list-item");
        if (checked) tokens[i].attrJoin("class", "checked");
        markParentListAsTaskList(tokens, i);
      }
    });

    const defaultListItemOpen =
      md.renderer.rules.list_item_open ||
      function renderListItemOpen(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    md.renderer.rules.list_item_open = function renderTaskListItemOpen(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const className = token.attrGet("class") || "";
      const html = defaultListItemOpen(tokens, idx, options, env, self);
      if (!className.includes("task-list-item")) return html;

      const checked = className.includes("checked");
      const checkbox =
        '<input type="checkbox" class="task-list-item-checkbox" disabled' +
        (checked ? " checked" : "") +
        ">";
      return html.replace(/^(<li[^>]*>)/, `$1${checkbox}`);
    };
  }

  global.markdownItTaskLists = markdownItTaskLists;
})(window);
