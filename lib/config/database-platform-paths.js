/** Platform store/group paths under awn-databases/ (REFACTOR-3 § databases). */

const AWN_DATABASE_HUB = "awn-databases";

const TAXONOMIES_GROUP_REL = "0-taxonomies";
const LEGACY_TAXONOMIES_GROUP_REL = "taxonomies";
const LEGACY_AWN_TAXONOMIES_GROUP_REL = "awn-taxonomies";

const CONTENTS_GROUP_REL = "0-contents";
const LEGACY_CONTENTS_GROUP_REL = "contents";

const UI_GROUP_REL = "0-ui";
const LEGACY_UI_GROUP_REL = "ui";

const FACTS_STORE_REL = `${CONTENTS_GROUP_REL}/0-facts`;
const GLOSSARY_STORE_REL = `${CONTENTS_GROUP_REL}/0-glossary`;
const REFERENCE_STORE_REL = `${CONTENTS_GROUP_REL}/0-reference`;

const UI_SLOGANS_STORE_REL = `${UI_GROUP_REL}/0-slogans`;
const UI_HOME_TITLES_STORE_REL = `${UI_GROUP_REL}/0-home-titles`;

const DATABASE_PLATFORM_GROUP_LEGACY_TO_CANON = {
  [LEGACY_TAXONOMIES_GROUP_REL]: TAXONOMIES_GROUP_REL,
  [LEGACY_AWN_TAXONOMIES_GROUP_REL]: TAXONOMIES_GROUP_REL,
  [LEGACY_CONTENTS_GROUP_REL]: CONTENTS_GROUP_REL,
  [LEGACY_UI_GROUP_REL]: UI_GROUP_REL,
  [TAXONOMIES_GROUP_REL]: TAXONOMIES_GROUP_REL,
  [CONTENTS_GROUP_REL]: CONTENTS_GROUP_REL,
  [UI_GROUP_REL]: UI_GROUP_REL
};

/** Builtin nested platform collections (not arbitrary user slugs under a group). */
const DATABASE_PLATFORM_CHILD_LEGACY_TO_CANON = {
  facts: "0-facts",
  glossary: "0-glossary",
  reference: "0-reference",
  "home-titles": "0-home-titles",
  slogans: "0-slogans",
  tags: "0-tags",
  categories: "0-categories",
  colors: "0-colors"
};

const DATABASE_PLATFORM_STORE_LEGACY_TO_CANON = {
  ...DATABASE_PLATFORM_GROUP_LEGACY_TO_CANON,
  [`${LEGACY_CONTENTS_GROUP_REL}/facts`]: FACTS_STORE_REL,
  [`${LEGACY_CONTENTS_GROUP_REL}/glossary`]: GLOSSARY_STORE_REL,
  [`${LEGACY_CONTENTS_GROUP_REL}/reference`]: REFERENCE_STORE_REL,
  [`${LEGACY_UI_GROUP_REL}/home-titles`]: UI_HOME_TITLES_STORE_REL,
  [`${LEGACY_UI_GROUP_REL}/slogans`]: UI_SLOGANS_STORE_REL,
  [`${LEGACY_TAXONOMIES_GROUP_REL}/tags`]: `${TAXONOMIES_GROUP_REL}/0-tags`,
  [`${LEGACY_TAXONOMIES_GROUP_REL}/categories`]: `${TAXONOMIES_GROUP_REL}/0-categories`,
  [`${LEGACY_TAXONOMIES_GROUP_REL}/colors`]: `${TAXONOMIES_GROUP_REL}/0-colors`,
  [`${LEGACY_AWN_TAXONOMIES_GROUP_REL}/tags`]: `${TAXONOMIES_GROUP_REL}/0-tags`,
  [`${LEGACY_AWN_TAXONOMIES_GROUP_REL}/categories`]: `${TAXONOMIES_GROUP_REL}/0-categories`,
  [`${LEGACY_AWN_TAXONOMIES_GROUP_REL}/colors`]: `${TAXONOMIES_GROUP_REL}/0-colors`,
  [FACTS_STORE_REL]: FACTS_STORE_REL,
  [GLOSSARY_STORE_REL]: GLOSSARY_STORE_REL,
  [REFERENCE_STORE_REL]: REFERENCE_STORE_REL,
  [UI_SLOGANS_STORE_REL]: UI_SLOGANS_STORE_REL,
  [UI_HOME_TITLES_STORE_REL]: UI_HOME_TITLES_STORE_REL
};

const DATABASE_PLATFORM_GROUP_RELS = new Set([
  TAXONOMIES_GROUP_REL,
  CONTENTS_GROUP_REL,
  UI_GROUP_REL,
  LEGACY_TAXONOMIES_GROUP_REL,
  LEGACY_AWN_TAXONOMIES_GROUP_REL,
  LEGACY_CONTENTS_GROUP_REL,
  LEGACY_UI_GROUP_REL
]);

function stripAwnDatabasesHubPrefix(relPath) {
  let p = String(relPath || "")
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  const prefix = `${AWN_DATABASE_HUB}/`;
  if (p.toLowerCase().startsWith(prefix.toLowerCase())) {
    p = p.slice(prefix.length);
  }
  return p;
}

function normalizeDatabaseStoreRel(storeRel) {
  return stripAwnDatabasesHubPrefix(storeRel);
}

function resolveDatabasePlatformChildSlug(parentGroupRel, childSlug) {
  const parent = resolveDatabaseStoreRel(parentGroupRel);
  const child = String(childSlug || "").trim();
  if (!child) return child;
  if (child.startsWith("0-")) return child;
  const parentKey = normalizeDatabaseStoreRel(parent);
  const isPlatformGroup =
    parentKey === TAXONOMIES_GROUP_REL ||
    parentKey === CONTENTS_GROUP_REL ||
    parentKey === UI_GROUP_REL;
  if (!isPlatformGroup) return child;
  return DATABASE_PLATFORM_CHILD_LEGACY_TO_CANON[child] || child;
}

function resolveDatabaseStoreRel(storeRel) {
  const normalized = normalizeDatabaseStoreRel(storeRel);
  if (!normalized) return normalized;
  const direct = DATABASE_PLATFORM_STORE_LEGACY_TO_CANON[normalized];
  if (direct) return direct;

  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length) return normalized;

  const head = parts[0];
  const headCanon = DATABASE_PLATFORM_GROUP_LEGACY_TO_CANON[head] || head;
  if (parts.length === 1) {
    return DATABASE_PLATFORM_GROUP_LEGACY_TO_CANON[head] || head;
  }

  const child = parts[1];
  const childCanon = resolveDatabasePlatformChildSlug(headCanon, child);
  const tail = parts.slice(2);
  return [headCanon, childCanon, ...tail].join("/");
}

function rewriteLegacyDatabasesInRelPath(relPath) {
  let p = String(relPath || "")
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\/+/, "");
  if (!p) return p;

  const prefix = `${AWN_DATABASE_HUB}/`;
  const lower = p.toLowerCase();
  if (!lower.startsWith(prefix.toLowerCase())) return p;

  const rest = p.slice(prefix.length);
  const segments = rest.split("/");
  const maxPrefixLen = Math.min(2, segments.length);
  for (let len = maxPrefixLen; len >= 1; len -= 1) {
    const storePrefix = segments.slice(0, len).join("/");
    const resolved = resolveDatabaseStoreRel(storePrefix);
    if (resolved !== storePrefix) {
      const tail = segments.slice(len).join("/");
      return `${AWN_DATABASE_HUB}/${resolved}${tail ? `/${tail}` : ""}`;
    }
  }

  if (segments.length >= 2) {
    const resolved = resolveDatabaseStoreRel(segments.slice(0, 2).join("/"));
    const storePrefix = segments.slice(0, 2).join("/");
    if (resolved !== storePrefix) {
      const tail = segments.slice(2).join("/");
      return `${AWN_DATABASE_HUB}/${resolved}${tail ? `/${tail}` : ""}`;
    }
  }

  return p;
}

function isDatabasePlatformGroupRel(storeRel) {
  const key = resolveDatabaseStoreRel(storeRel);
  return (
    key === TAXONOMIES_GROUP_REL ||
    key === CONTENTS_GROUP_REL ||
    key === UI_GROUP_REL
  );
}

function storeRelMatchesDatabaseFilter(storeRel, filter) {
  const a = resolveDatabaseStoreRel(storeRel);
  const b = resolveDatabaseStoreRel(filter);
  if (a === b) return true;
  const rawA = normalizeDatabaseStoreRel(storeRel);
  const rawB = normalizeDatabaseStoreRel(filter);
  return rawA === rawB;
}

module.exports = {
  AWN_DATABASE_HUB,
  TAXONOMIES_GROUP_REL,
  LEGACY_TAXONOMIES_GROUP_REL,
  LEGACY_AWN_TAXONOMIES_GROUP_REL,
  CONTENTS_GROUP_REL,
  LEGACY_CONTENTS_GROUP_REL,
  UI_GROUP_REL,
  LEGACY_UI_GROUP_REL,
  FACTS_STORE_REL,
  GLOSSARY_STORE_REL,
  REFERENCE_STORE_REL,
  UI_SLOGANS_STORE_REL,
  UI_HOME_TITLES_STORE_REL,
  DATABASE_PLATFORM_GROUP_LEGACY_TO_CANON,
  DATABASE_PLATFORM_CHILD_LEGACY_TO_CANON,
  DATABASE_PLATFORM_STORE_LEGACY_TO_CANON,
  DATABASE_PLATFORM_GROUP_RELS,
  normalizeDatabaseStoreRel,
  resolveDatabaseStoreRel,
  resolveDatabasePlatformChildSlug,
  rewriteLegacyDatabasesInRelPath,
  isDatabasePlatformGroupRel,
  storeRelMatchesDatabaseFilter
};
