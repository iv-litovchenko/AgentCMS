---
awn-type: awn.dashboard.widget
awn-name: Страницы (DQL)
awn-dashboard-present: dql
awn-dashboard-source-kind: internal
awn-dashboard-filter-limit: 15
awn-dashboard-x: 0
awn-dashboard-y: 3
awn-dashboard-w: 12
awn-dashboard-h: 2
---

@transform {"pick":["path","awn-name"]}
FROM .
WHERE awn-type = "awn.content.page"
LIMIT 15
