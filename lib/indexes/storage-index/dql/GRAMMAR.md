# DQL-lite grammar (v1)

Workspace field-catalog query language. Parsed by `dql/parse.js`, executed via SQLite and/or in-memory fallback.

## Clauses (optional, fixed order)

```
query     ::= clause*
clause    ::= fromClause | whereClause | flattenClause | groupClause | sortClause
            | limitClause | selectClause | withTextClause
fromClause    ::= "FROM" pathLiteral
pathLiteral   ::= "csv:" workspacePath | "collection:" storeRel | mdPathPrefix
whereClause   ::= "WHERE" orExpr
flattenClause ::= "FLATTEN" field
groupClause   ::= "GROUP" "BY" field agg?
agg           ::= "COUNT" | "SUM" field | "MIN" field | "MAX" field
sortClause    ::= ("SORT" | "ORDER" "BY") sortList
sortList      ::= sortItem ("," sortItem)*
sortItem      ::= field ("ASC" | "DESC")?
limitClause   ::= "LIMIT" number
selectClause  ::= ("SELECT" | "FIELDS") fieldList
withTextClause::= "WITH" "TEXT" string
```

## Expressions

```
orExpr    ::= andExpr ("OR" andExpr)*
andExpr   ::= compareExpr ("AND" compareExpr)*
compareExpr ::= "NOT"? ( "(" orExpr ")" | predicate )
predicate ::= field "LAST" number "DAYS"
            | field "CONTAINS" literal
            | field cmpOp literal
cmpOp     ::= "=" | "!=" | "<>" | ">" | ">=" | "<" | "<="
field     ::= ident | string
pathLiteral ::= ident (/ ident)* | string
literal   ::= string | number | boolean | ident
```

## Notes

- `pathPrefix` JSON/API merges into `FROM`.
- `WITH TEXT` triggers hybrid search on DQL result paths (or `FROM` scope if zero rows).
- CSV rows: indexed in `catalog.sqlite` + **csv-fulltext-index** (tokens + hash-tfidf semantic). Fallback: scan cells (`csv-cell`).
- Raw SQL from clients is rejected.

See `TODO.SQL.md`. Agent-facing summary: `workspaces/0-md/GLOBAL-SKILL-5-SEARCH.md`.

## Integration

| Channel | Call |
|---------|------|
| MCP | `query_workspace_storage({ workspaceId, dql: "..." })` |
| REST | `POST /api/storage-index/query` body `{ "dql": "..." }` |
| Preset | `registry-queries.yml` → `source: dql`, field `dql:` → `run_workspace_registry_query` |
| Preview | fenced `` ```awn-query `` / `` ```dataview `` → `dql-table.js` |

- **Fields:** frontmatter + virtual `file.name`, `file.folder`, `file.mtime`, `file.size`, `file.inlink-count`, `file.outlinks` / `file.inlinks` (link-index, memory engine).
- **Response:** `dql-query` | `dql-group` | `dql-hybrid`; `engine: sqlite | memory`. Raw SQL (`sql` / `rawSql`) → 500.
- **UI:** **DQL** button → modal **Text / Constructor / Views**. Views are stored in `.agent-cms/settings/dql-views.yml` (`GET|POST|DELETE /api/storage-index/dql-views`). Constructor → `POST /api/storage-index/dql-build`.
- **Preview transform:** `@transform {"pick":["path","awn-name"]}` (no JS eval).
- **Rebuild:** `rebuild_workspace_storage_index`. SQLite: setting `index-storage-sqlite-enabled` (default on).
