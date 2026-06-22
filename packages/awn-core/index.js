/**
 * @agent-cms/core — фаза 0: re-export из корня репо.
 * Физический перенос — см. MIGRATION.md
 */
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");

function req(modulePath) {
  return require(path.join(repoRoot, modulePath));
}

module.exports = {
  manifest: req("manifest-paths"),
  yaml: req("awn-yaml-utils"),
  loaders: {
    types: req("awn-types-loader"),
    fields: {
      loader: req("awn-fields-loader"),
      registry: req("awn-field-registry")
    },
    blocks: req("awn-blocks-loader")
  },
  catalog: {
    loader: req("catalog-loader"),
    items: req("catalog-items"),
    normalize: req("catalog-normalize"),
    migration: req("catalog-migration"),
    platformAgent: req("platform-agent")
  },
  agents: req("agent-registry"),
  markdown: {
    linkRewriter: req("markdown-link-rewriter")
  }
};
