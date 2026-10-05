/** Canonical field-schema overlay filename and legacy read aliases. */
const SCHEMA_FILE = "schema.yml";
/** @deprecated alias — same as SCHEMA_FILE */
const SCHEMA_MOD_FILE = SCHEMA_FILE;
const LEGACY_SCHEMA_MOD_FILE = "schema-mod.yml";
/** @deprecated orthographic alias — read-only fallback */
const LEGACY_SCHEME_MOD_FILE = "scheme-mod.yml";
const LEGACY_SHEMAMOD_FILE = "shemamod.yml";
const LEGACY_CONFIGURATION_SCHEMA_FILE = "configuration-schema.yml";

const SCHEMA_FILE_ALIASES = [
  SCHEMA_FILE,
  LEGACY_SCHEMA_MOD_FILE,
  LEGACY_SCHEME_MOD_FILE,
  LEGACY_SHEMAMOD_FILE,
  LEGACY_CONFIGURATION_SCHEMA_FILE
];

/** @deprecated use SCHEMA_FILE_ALIASES */
const SCHEMA_MOD_FILE_ALIASES = SCHEMA_FILE_ALIASES;

function isSchemaModFileName(name) {
  const lower = String(name || "").toLowerCase();
  return SCHEMA_FILE_ALIASES.some((item) => lower === item.toLowerCase());
}

function listSchemaModFileNames() {
  return [...SCHEMA_FILE_ALIASES];
}

module.exports = {
  SCHEMA_FILE,
  SCHEMA_MOD_FILE,
  LEGACY_SCHEMA_MOD_FILE,
  LEGACY_SCHEME_MOD_FILE,
  LEGACY_SHEMAMOD_FILE,
  LEGACY_CONFIGURATION_SCHEMA_FILE,
  SCHEMA_FILE_ALIASES,
  SCHEMA_MOD_FILE_ALIASES,
  isSchemaModFileName,
  listSchemaModFileNames
};
