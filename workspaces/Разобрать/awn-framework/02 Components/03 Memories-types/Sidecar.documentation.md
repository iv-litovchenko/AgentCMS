---
AWN-SCHEMA: Type.schema
AWN-ID: "a1070b7f-cb36-40ba-a56d-d3ee19d3236e"
AWN-SLUG: MEMORY/SIDECAR
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 3
AWN-NAME: Sidecar
AWN-DESC: Метаописание не-md файла (изображения, документа, медиа).
AWN-REGISTRY: false
---

# Sidecar — метаописание не-md файла

Файл вида `<filename.ext>.sidecar.md` — метаописание (sidecar) для
бинарного файла: изображения, документа, аудио, видео и т.п.

Обычно лежит рядом с описываемым файлом, чаще всего в папке `Assets/`.

Sidecar именуется по **полному имени родителя**:

- `photo.jpg` → `photo.jpg.sidecar.md`
- `lecture.mp4` → `lecture.mp4.sidecar.md`

Создаётся по запросу.
