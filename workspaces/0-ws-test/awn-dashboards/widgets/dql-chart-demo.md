---
awn-type: awn.dashboard.widget
awn-name: Типы (DQL chart)
awn-dashboard-present: dql-chart
awn-dashboard-chart-type: bar
awn-dashboard-source-kind: internal
awn-dashboard-filter-limit: 20
awn-dashboard-x: 0
awn-dashboard-y: 6
awn-dashboard-w: 6
awn-dashboard-h: 3
---

FROM awn-databases
GROUP BY source_kind COUNT
LIMIT 10
