#!/usr/bin/env python3
"""Optional GLiNER extraction. Requires: pip install gliner"""
import json
import sys

def main():
    try:
        payload = json.load(sys.stdin)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": f"bad stdin: {exc}", "mentions": []}))
        return

    text = str(payload.get("text") or "")
    labels = payload.get("labels") or ["person", "organization", "project", "date", "money"]
    if not text.strip():
        print(json.dumps({"ok": True, "mentions": []}))
        return

    try:
        from gliner import GLiNER
    except ImportError:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "gliner not installed (pip install gliner)",
                    "mentions": [],
                }
            )
        )
        return

    try:
        model = GLiNER.from_pretrained("urchade/gliner_medium-v2.1")
        entities = model.predict_entities(text, labels, threshold=0.4)
        mentions = []
        for ent in entities:
            label = str(ent.get("text") or "").strip()
            if not label:
                continue
            start = int(ent.get("start", 0))
            end = int(ent.get("end", start + len(label)))
            mentions.append(
                {
                    "type": str(ent.get("label") or "entity"),
                    "label": label,
                    "start": start,
                    "end": end,
                }
            )
        print(json.dumps({"ok": True, "mentions": mentions}))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc), "mentions": []}))


if __name__ == "__main__":
    main()
