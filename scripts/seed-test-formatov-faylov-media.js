#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const MEDIA_ROOT = path.join(
  __dirname,
  "..",
  "workspaces",
  "agent-cms-test",
  "awn-container",
  "test-formatov-faylov",
  "awn-storage",
  "media"
);

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const TINY_GIF = Buffer.from(
  "GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;",
  "binary"
);

const EMPTY_ZIP = Buffer.from(
  "PK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
  "binary"
);

/** @type {Record<string, string | Buffer>} */
const SAMPLES = {
  "images/example.png": TINY_PNG,
  "images/example.jpg": TINY_PNG,
  "images/example.jpeg": TINY_PNG,
  "images/example.gif": TINY_GIF,
  "images/example.webp": "",
  "images/example.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#3b82f6"/></svg>',
  "images/example.avif": "",
  "images/example.bmp": "",
  "images/example.ico": "",

  "video/example.mp4": "",
  "video/example.webm": "",
  "video/example.mov": "",
  "video/example.mkv": "",
  "video/example.avi": "",
  "video/example.m4v": "",
  "video/example.ogv": "",

  "audio/example.mp3": "",
  "audio/example.wav": "",
  "audio/example.ogg": "",
  "audio/example.m4a": "",
  "audio/example.flac": "",
  "audio/example.aac": "",
  "audio/example.opus": "",
  "audio/example.weba": "",

  "archives/example.zip": EMPTY_ZIP,
  "archives/example.rar": "",
  "archives/example.7z": "",
  "archives/example.tar": "",
  "archives/example.gz": "",
  "archives/example.tgz": "",
  "archives/example.bz2": "",
  "archives/example.xz": "",

  "documents/example.pdf": "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
  "documents/example.doc": "",
  "documents/example.docx": "",
  "documents/example.xls": "",
  "documents/example.xlsx": "",
  "documents/example.ppt": "",
  "documents/example.pptx": "",
  "documents/example.txt": "Пример текстового файла.\n",
  "documents/example.md": "# Пример Markdown\n\nТест форматов.\n",
  "documents/example.rtf": "{\\rtf1\\ansi Тест}\n",
  "documents/example.csv": "col1,col2\na,b\n",
  "documents/example.log": "[info] test log line\n",

  "code/example.js": "export const ok = true;\n",
  "code/example.mjs": "export default null;\n",
  "code/example.ts": "export type T = string;\n",
  "code/example.tsx": "export function App() { return null; }\n",
  "code/example.jsx": "export function App() { return null; }\n",
  "code/example.json": '{"ok":true}\n',
  "code/example.yaml": "key: value\n",
  "code/example.yml": "list:\n  - one\n",
  "code/example.html": "<!doctype html><title>test</title>\n",
  "code/example.css": "body { margin: 0; }\n",
  "code/example.py": "# python sample\n",
  "code/example.php": "<?php\n// PHP sample\necho 'ok';\n",
  "code/example.rb": "# ruby sample\n",
  "code/example.go": "package main\n\nfunc main() {}\n",
  "code/example.rs": "fn main() {}\n",
  "code/example.java": "class Example {}\n",
  "code/example.kt": "fun main() {}\n",
  "code/example.vue": "<template><div/></template>\n",
  "code/example.c": "int main(void) { return 0; }\n",
  "code/example.h": "/* header */\n",
  "code/example.cpp": "int main() { return 0; }\n",
  "code/example.cs": "class Example {}\n",
  "code/example.sh": "#!/bin/sh\necho ok\n",
  "code/example.sql": "SELECT 1;\n",
  "code/example.xml": "<?xml version=\"1.0\"?><root/>\n",

  "config/example.env": "KEY=value\n",
  "config/example.ini": "[section]\nkey=value\n",
  "other/example.unknown": "",
  "other/example.bin": ""
};

function writeSample(relativePath, body) {
  const full = path.join(MEDIA_ROOT, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (Buffer.isBuffer(body)) fs.writeFileSync(full, body);
  else fs.writeFileSync(full, body, "utf8");
}

function removeLegacyFlatSamples() {
  if (!fs.existsSync(MEDIA_ROOT)) return;
  for (const name of fs.readdirSync(MEDIA_ROOT)) {
    if (!name.startsWith("sample.")) continue;
    fs.unlinkSync(path.join(MEDIA_ROOT, name));
  }
}

function main() {
  fs.mkdirSync(MEDIA_ROOT, { recursive: true });
  removeLegacyFlatSamples();
  for (const [rel, body] of Object.entries(SAMPLES)) {
    writeSample(rel, body);
  }
  const count = Object.keys(SAMPLES).length;
  console.log(`seeded ${count} files under ${MEDIA_ROOT}`);
}

main();
