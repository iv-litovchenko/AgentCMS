# Sidebar stack — design examples

10 standalone HTML demos for the upper sidebar stack (agent toolbar, avatar/NOTE, tree tools, search, menu tree).

## Open

```
http://127.0.0.1:3000/examples/sidebar-stack/
```

Symlink: `public/examples/sidebar-stack` → `examples/sidebar-stack`.

## Blocks mocked

1. `.sidebar-agent-toolbar` — agent select, picker, view select, utility buttons
2. `.sidebar-agent-avatar-block` — preview + NOTE.md
3. `.sidebar-slab-menu-tools` — tree / bookmarks / refresh / pin
4. `.sidebar-menu-before-tree` — search bar
5. `#menu` — topic tree

## Variants

| # | Folder | Idea |
|---|--------|------|
| 01 | `01-current` | Production layout |
| 02 | `02-compact` | Reduced height |
| 03 | `03-cards` | Card gaps on gray canvas |
| 04 | `04-unified` | Single white slab |
| 05 | `05-hero` | Large agent portrait |
| 06 | `06-chips` | View mode chips |
| 07 | `07-merged-tools` | Tools inline with search |
| 08 | `08-split` | Narrow agent column |
| 09 | `09-minimal` | Borderless ghost UI |
| 10 | `10-accent` | Colored accent bands |

Shared mock body: `_stack-body.html` (included in each variant via shell generator).
