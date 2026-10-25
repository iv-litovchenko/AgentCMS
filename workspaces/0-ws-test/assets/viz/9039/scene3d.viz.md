---
viz-kind: scene3d
viz-about: awn-topics/testim-atlas-vizualiztsiyu/awn-storage/main/razdel-test-karty/1.md
awn-type: awn.content.record
awn-name: 1
---

Кратко опишите, что моделируете (комната, стенд, схема объекта).

```scene3d
{
  "version": 1,
  "objects": [
    { "type": "box", "size": [4, 0.08, 3], "position": [0, 0, 0], "color": "#cbd5e1", "name": "пол" },
    { "type": "box", "size": [1, 1, 1], "position": [0, 0.54, 0], "color": "#7c6cff", "name": "блок" },
    { "type": "sphere", "radius": 0.35, "position": [1.1, 0.35, 0.4], "color": "#f97316", "name": "шар" },
    { "type": "cylinder", "radiusTop": 0.25, "radiusBottom": 0.25, "height": 0.9, "position": [-0.9, 0.45, -0.5], "color": "#22c55e", "name": "столб" }
  ]
}
```

**Поля:** `box` (`size`), `sphere` (`radius`), `cylinder` / `cone`, `plane` (`size`), `gltf` (`url` — путь в `awn-storage/…`).