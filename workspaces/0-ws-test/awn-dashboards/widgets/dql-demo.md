---
awn-type: awn.dashboard.widget
awn-name: Записи (DQL)
awn-dashboard-present: dql
awn-dashboard-source-kind: internal
awn-dashboard-filter-limit: 20
awn-dashboard-x: 0
awn-dashboard-y: 5
awn-dashboard-w: 12
awn-dashboard-h: 3
---

@transform {"pick":["path","awn-name","awn-type"],"limit":15}
FROM .
WHERE awn-type = "awn.content.record"
SORT path ASC
LIMIT 20
