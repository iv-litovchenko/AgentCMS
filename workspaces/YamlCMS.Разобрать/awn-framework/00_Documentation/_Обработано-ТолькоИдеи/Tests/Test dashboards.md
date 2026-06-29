
## Datativew (вставка датавью)
```dataview
TABLE status, priority, assignee, due_date, tags
FROM "v3/awn-tests/mdbase-demo/tasks"
WHERE contains(tags, "urgent")
SORT due_date asc
```

## Insert database
![](AGENTS.Bases.base)

![[mdbase-all.base]]
