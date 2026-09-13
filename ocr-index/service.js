const fs = require("fs/promises");
const path = require("path");
const { mergeFrontmatterOverrides } = require("../awn-yaml-utils");
const { loadManifest, saveManifest } = require("./store");

const OCR_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".gif"]);
const OCR_PDF_EXTENSION = ".pdf";
const OCR_ENGINE = "tesseract.js";
const OCR_MARKER = "awn-ocr-extracted";

function toPosixRel(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function sidecarRelForSource(sourceRel) {
  const normalized = toPosixRel(sourceRel);
  const lastSlash = normalized.lastIndexOf("/");
  const dir = lastSlash >= 0 ? `${normalized.slice(0, lastSlash + 1)}` : "";
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  if (!base) return null;
  return `${dir}${base}.sidecar.md`;
}

function isOcrCandidateFileName(name) {
  const base = path.basename(String(name || ""));
  const lower = base.toLowerCase();
  if (!base || lower.endsWith(".sidecar.md")) return false;
  const ext = path.extname(lower);
  return OCR_IMAGE_EXTENSIONS.has(ext) || ext === OCR_PDF_EXTENSION;
}

function shouldSkipDir(name) {
  const lower = String(name || "").toLowerCase();
  return (
    lower === ".git" ||
    lower === "node_modules" ||
    lower === ".agent-cms" ||
    lower === "history" ||
    lower.startsWith(".")
  );
}

async function collectOcrCandidateFiles(dirAbsolute, prefix = "", files = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (shouldSkipDir(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(dirAbsolute, entry.name);
    if (entry.isDirectory()) {
      await collectOcrCandidateFiles(absolute, toPosixRel(relative), files);
      continue;
    }
    if (!isOcrCandidateFileName(entry.name)) continue;
    files.push(toPosixRel(relative));
  }

  return files;
}

function splitSidecarFrontmatter(raw = "") {
  const text = String(raw).replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return {
    frontmatter: match[1],
    body: match[2].replace(/^\r?\n?/, "")
  };
}

function buildOcrFrontmatterOverrides({ sourceRel, text, engine, extractedAt, preprocessVariant, psm }) {
  const ocrText = String(text || "").trim();
  const overrides = {
    "awn-ocr-source": sourceRel,
    "awn-ocr-engine": engine,
    "awn-ocr-at": extractedAt,
    "awn-ocr-extracted": "true",
    "awn-ocr-text": ocrText,
    "awn-type": "awn.content.sidecar"
  };
  if (preprocessVariant) overrides["awn-ocr-preprocess"] = String(preprocessVariant);
  if (psm) overrides["awn-ocr-psm"] = String(psm);
  return overrides;
}

function buildSidecarContent({
  sourceRel,
  text,
  engine,
  extractedAt,
  preprocessVariant,
  psm,
  existingContent = null
}) {
  const ocrText = String(text || "").trim();
  const overrides = buildOcrFrontmatterOverrides({
    sourceRel,
    text: ocrText,
    engine,
    extractedAt,
    preprocessVariant,
    psm
  });
  const existingRaw = String(existingContent || "").trim();

  if (existingRaw) {
    const { frontmatter, body } = splitSidecarFrontmatter(existingRaw);
    const nextFrontmatter = mergeFrontmatterOverrides(frontmatter, overrides);
    const bodySuffix = body ? `\n${body}` : "";
    return `---\n${nextFrontmatter}\n---${bodySuffix}`;
  }

  const safeName = path.basename(sourceRel);
  const frontmatter = mergeFrontmatterOverrides("", {
    "awn-name": `OCR: ${safeName}`,
    ...overrides
  });
  return `---\n${frontmatter}\n---\n\n${ocrText}\n`;
}

async function extractPdfText(buffer) {
  try {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return String(data.text || "").trim();
  } catch {
    return "";
  }
}

function scoreOcrText(text) {
  const value = String(text || "").trim();
  if (!value) return 0;
  const letters = value.match(/[A-Za-zА-Яа-яЁё]/g) || [];
  const cyrillicWords = value.match(/[А-Яа-яЁё]{3,}/g) || [];
  const words = value.split(/\s+/).filter((word) => word.length >= 2 && /[A-Za-zА-Яа-яЁё]/.test(word));
  const garbage = value.match(/[|\\<>[\]{}]/g) || [];
  let score = letters.length * 2 + words.length * 6 + cyrillicWords.length * 14 - garbage.length * 10;
  if (value.length > 180 && cyrillicWords.length < 2) score -= 40;
  return score;
}

function cleanupOcrText(text) {
  const lines = String(text || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const good = lines.filter((line) => {
    const cyrillic = (line.match(/[А-Яа-яЁё]/g) || []).length;
    const latin = (line.match(/[A-Za-z]/g) || []).length;
    const garbage = (line.match(/[|\\<>[\]{}]/g) || []).length;
    const letters = cyrillic + latin;
    return letters >= 4 && garbage <= 2 && cyrillic >= Math.max(3, Math.floor(letters * 0.4));
  });

  if (good.length) return good.join("\n").trim();

  const fallback = lines.filter((line) => (line.match(/[А-Яа-яЁё]/g) || []).length >= 4);
  return fallback.join("\n").trim() || String(text || "").trim();
}

async function createOcrResizePipeline(buffer, sharp) {
  const meta = await sharp(buffer).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const minSide = Math.min(width, height);
  const scale = minSide > 0 && minSide < 1400 ? Math.min(2.5, 1400 / minSide) : 1.25;
  const resized = sharp(buffer).rotate().resize({
    width: width ? Math.round(width * scale) : undefined,
    height: height ? Math.round(height * scale) : undefined,
    fit: "inside",
    withoutEnlargement: false
  });
  return { resized, width, height, scale };
}

async function buildNamedOcrVariant(resized, width, height, scale, name) {
  switch (name) {
    case "gray-normalize":
      return {
        name,
        buffer: await resized.clone().grayscale().normalize().sharpen().png().toBuffer()
      };
    case "inverted-overlay":
      return {
        name,
        buffer: await resized.clone().grayscale().normalize().negate({ alpha: false }).sharpen().png().toBuffer()
      };
    case "high-contrast":
      return {
        name,
        buffer: await resized.clone().grayscale().linear(1.5, -48).sharpen().png().toBuffer()
      };
    case "inverted-contrast":
      return {
        name,
        buffer: await resized
          .clone()
          .grayscale()
          .linear(1.5, -48)
          .negate({ alpha: false })
          .sharpen()
          .png()
          .toBuffer()
      };
    case "caption-inverted": {
      const cropTop = Math.round(height * scale * 0.72);
      const cropHeight = Math.max(1, Math.round(height * scale * 0.28));
      const caption = resized.clone().extract({
        left: 0,
        top: cropTop,
        width: Math.round(width * scale),
        height: cropHeight
      });
      return {
        name,
        buffer: await caption.grayscale().normalize().negate({ alpha: false }).sharpen().png().toBuffer()
      };
    }
    case "caption-contrast": {
      const cropTop = Math.round(height * scale * 0.72);
      const cropHeight = Math.max(1, Math.round(height * scale * 0.28));
      const caption = resized.clone().extract({
        left: 0,
        top: cropTop,
        width: Math.round(width * scale),
        height: cropHeight
      });
      return {
        name,
        buffer: await caption.clone().grayscale().linear(1.8, -60).sharpen().png().toBuffer()
      };
    }
    default:
      return null;
  }
}

async function buildOcrVariants(buffer, sharp, { onlyNames = null } = {}) {
  const { resized, width, height, scale } = await createOcrResizePipeline(buffer, sharp);
  const baseNames = ["gray-normalize", "inverted-overlay", "high-contrast", "inverted-contrast"];
  const captionNames =
    width > 0 && height > 0 && width / height >= 1.2
      ? ["caption-inverted", "caption-contrast"]
      : [];
  const allNames = [...baseNames, ...captionNames];
  const names = Array.isArray(onlyNames) && onlyNames.length
    ? onlyNames.filter((name) => allNames.includes(name))
    : allNames;

  const variants = [];
  for (const name of names) {
    const item = await buildNamedOcrVariant(resized, width, height, scale, name);
    if (item) variants.push(item);
  }
  return variants;
}

async function loadTesseract(langs = "rus+eng") {
  try {
    const tesseract = require("tesseract.js");
    const worker = await tesseract.createWorker(langs);
    return { worker, PSM: tesseract.PSM, langs };
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      throw Object.assign(new Error("OCR requires tesseract.js package (npm install tesseract.js)"), {
        status: 503
      });
    }
    throw error;
  }
}

async function buildOcrInputs(buffer, sharp, { variantNames = null } = {}) {
  const wantAll = !Array.isArray(variantNames) || !variantNames.length;
  if (!sharp) return [{ name: "raw", buffer }];

  try {
    if (wantAll) {
      return [{ name: "raw", buffer }, ...(await buildOcrVariants(buffer, sharp))];
    }
    const selected = await buildOcrVariants(buffer, sharp, { onlyNames: variantNames });
    if (selected.length) return selected;
  } catch {
    // fall through
  }

  return [{ name: "raw", buffer }];
}

async function extractImageText(buffer, langs = "rus+eng", options = {}) {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    sharp = null;
  }

  const {
    worker: sharedWorker = null,
    terminateWorker = true,
    variantNames = null,
    psmModes: psmModesOverride = null
  } = options;

  let worker = sharedWorker;
  let PSM;
  let createdWorker = false;
  if (!worker) {
    const loaded = await loadTesseract(langs);
    worker = loaded.worker;
    PSM = loaded.PSM;
    createdWorker = true;
  } else {
    try {
      PSM = require("tesseract.js").PSM;
    } catch {
      PSM = null;
    }
  }

  const inputs = await buildOcrInputs(buffer, sharp, { variantNames });
  const defaultPsmModes = [PSM?.SPARSE_TEXT, PSM?.SINGLE_BLOCK, PSM?.AUTO].filter(Boolean);
  const psmModes = Array.isArray(psmModesOverride) && psmModesOverride.length
    ? psmModesOverride.map((mode) => String(mode))
    : defaultPsmModes.length
      ? defaultPsmModes
      : ["11", "6", "3"];
  let best = { text: "", score: 0, variant: "raw", psm: "auto" };

  try {
    for (const psm of psmModes) {
      await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
      for (const item of inputs) {
        const { data } = await worker.recognize(item.buffer);
        const text = String(data?.text || "").trim();
        const score = scoreOcrText(text);
        if (score > best.score) {
          best = { text, score, variant: item.name, psm: String(psm) };
        }
      }
    }
  } finally {
    if (createdWorker && terminateWorker) {
      await worker.terminate();
    }
  }

  return {
    ...best,
    text: cleanupOcrText(best.text)
  };
}

async function readOcrHintsFromSidecar(sidecarAbsolute) {
  if (!sidecarAbsolute) return {};
  try {
    const raw = await fs.readFile(sidecarAbsolute, "utf-8");
    const preprocess = raw.match(/^\s*awn-ocr-preprocess:\s*"([^"]+)"/m)?.[1] || null;
    const psm = raw.match(/^\s*awn-ocr-psm:\s*"([^"]+)"/m)?.[1] || null;
    return { preprocess, psm };
  } catch {
    return {};
  }
}

function createOcrIndexService(deps) {
  const { getAgentRoot, resolvePathAbsolute, manifestRelFromNodeAbsolute, onSidecarWritten } = deps;
  const runLocks = new Map();

  async function listCandidates(agentRoot) {
    return collectOcrCandidateFiles(agentRoot);
  }

  async function needsProcessing(sourceRel, { force = false } = {}) {
    const sidecarRel = sidecarRelForSource(sourceRel);
    if (!sidecarRel) return { needed: false, reason: "invalid_path" };

    const sourceAbsolute = resolvePathAbsolute(sourceRel);
    const sidecarAbsolute = resolvePathAbsolute(sidecarRel);
    if (!sourceAbsolute) return { needed: false, reason: "missing_source" };

    let sourceStat;
    try {
      sourceStat = await fs.stat(sourceAbsolute);
    } catch {
      return { needed: false, reason: "missing_source" };
    }

    if (force) return { needed: true, sidecarRel, sourceAbsolute, sidecarAbsolute };

    if (!sidecarAbsolute) return { needed: true, sidecarRel, sourceAbsolute, sidecarAbsolute: null };

    try {
      const sidecarStat = await fs.stat(sidecarAbsolute);
      const sidecarRaw = await fs.readFile(sidecarAbsolute, "utf-8");
      const hasMarker = sidecarRaw.includes(`${OCR_MARKER}: true`) || sidecarRaw.includes("awn-ocr-extracted:");
      if (hasMarker && sidecarStat.mtimeMs >= sourceStat.mtimeMs - 500) {
        return { needed: false, reason: "up_to_date", sidecarRel };
      }
    } catch {
      // sidecar missing
    }

    return { needed: true, sidecarRel, sourceAbsolute, sidecarAbsolute };
  }

  async function getStatus() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return { ready: false, reason: "Agent not selected" };

    const [candidates, manifest] = await Promise.all([listCandidates(agentRoot), loadManifest(agentRoot)]);

    let pendingCount = 0;
    for (const sourceRel of candidates) {
      const check = await needsProcessing(sourceRel, { force: false });
      if (check.needed) pendingCount += 1;
    }

    const processedCount = candidates.length - pendingCount;

    return {
      ready: processedCount > 0 || Boolean(manifest?.lastRunAt),
      model: OCR_ENGINE,
      offline: true,
      builtAt: manifest?.lastRunAt || null,
      lastRunMs: manifest?.lastRunMs ?? null,
      candidateCount: candidates.length,
      processedCount,
      pendingCount,
      failedCount: manifest?.stats?.failed || 0,
      hint:
        pendingCount > 0
          ? `${pendingCount} вложений без OCR-текста`
          : candidates.length
            ? "Все вложения обработаны"
            : "Нет изображений/PDF для OCR"
    };
  }

  async function run({ force = false, limit = 50, langs = "rus+eng", pathPrefix = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const lockKey = agentRoot;
    if (runLocks.get(lockKey)) return runLocks.get(lockKey);

    const job = (async () => {
      const started = Date.now();
      const candidates = await listCandidates(agentRoot);
      const manifest = (await loadManifest(agentRoot)) || {
        version: 1,
        processed: {},
        stats: { processed: 0, skipped: 0, failed: 0 }
      };

      const results = [];
      let processed = 0;
      let skipped = 0;
      let failed = 0;

      const prefix = toPosixRel(pathPrefix);
      let ocrWorker = null;
      let ocrPsmEnum = null;

      try {
      for (const sourceRel of candidates) {
        if (processed >= Math.max(1, Math.min(500, Number(limit) || 50))) break;
        if (prefix && !toPosixRel(sourceRel).startsWith(prefix)) continue;

        const check = await needsProcessing(sourceRel, { force });
        if (!check.needed) {
          skipped += 1;
          results.push({ path: sourceRel, status: "skipped", reason: check.reason || "up_to_date" });
          continue;
        }

        const ext = path.extname(sourceRel).toLowerCase();
        let text = "";
        let engine = OCR_ENGINE;
        let preprocessVariant = null;
        let ocrPsm = null;

        try {
          const buffer = await fs.readFile(check.sourceAbsolute);
          if (ext === OCR_PDF_EXTENSION) {
            text = await extractPdfText(buffer);
            engine = "pdf-parse";
            if (text.length < 20) {
              failed += 1;
              results.push({
                path: sourceRel,
                status: "failed",
                reason: "pdf_scan_no_text_layer"
              });
              continue;
            }
          } else if (OCR_IMAGE_EXTENSIONS.has(ext)) {
            if (!ocrWorker) {
              const loaded = await loadTesseract(langs);
              ocrWorker = loaded.worker;
              ocrPsmEnum = loaded.PSM;
            }
            let variantNames = null;
            let psmModes = null;
            if (force) {
              const hints = await readOcrHintsFromSidecar(check.sidecarAbsolute);
              if (hints.preprocess || hints.psm) {
                variantNames = hints.preprocess ? [hints.preprocess] : ["gray-normalize"];
                psmModes = hints.psm ? [hints.psm] : [String(ocrPsmEnum?.SPARSE_TEXT || "11")];
              } else {
                variantNames = ["gray-normalize"];
                psmModes = [String(ocrPsmEnum?.SPARSE_TEXT || "11")];
              }
            }
            const ocrResult = await extractImageText(buffer, langs, {
              worker: ocrWorker,
              terminateWorker: false,
              variantNames,
              psmModes
            });
            text = typeof ocrResult === "string" ? ocrResult : ocrResult?.text || "";
            preprocessVariant = typeof ocrResult === "object" ? ocrResult.variant : null;
            ocrPsm = typeof ocrResult === "object" ? ocrResult.psm : null;
          } else {
            skipped += 1;
            results.push({ path: sourceRel, status: "skipped", reason: "unsupported_type" });
            continue;
          }

          if (!text.trim()) {
            failed += 1;
            results.push({ path: sourceRel, status: "failed", reason: "empty_text" });
            continue;
          }

          const sidecarRel = check.sidecarRel;
          const sidecarAbsolute =
            check.sidecarAbsolute ||
            resolvePathAbsolute(sidecarRel) ||
            path.join(agentRoot, sidecarRel.replace(/\\/g, "/"));

          await fs.mkdir(path.dirname(sidecarAbsolute), { recursive: true });
          const extractedAt = new Date().toISOString();
          let existingContent = null;
          try {
            existingContent = await fs.readFile(sidecarAbsolute, "utf-8");
          } catch {
            existingContent = null;
          }
          await fs.writeFile(
            sidecarAbsolute,
            buildSidecarContent({
              sourceRel,
              text,
              engine,
              extractedAt,
              preprocessVariant,
              psm: ocrPsm,
              existingContent
            }),
            "utf-8"
          );

          const sidecarPath = manifestRelFromNodeAbsolute?.(sidecarAbsolute) || sidecarRel;
          if (typeof onSidecarWritten === "function") {
            onSidecarWritten(sidecarPath);
          }

          manifest.processed[sourceRel] = {
            at: extractedAt,
            chars: text.length,
            engine,
            sidecarPath
          };
          processed += 1;
          results.push({
            path: sourceRel,
            status: "processed",
            sidecarPath,
            charCount: text.length,
            engine
          });
        } catch (error) {
          failed += 1;
          results.push({
            path: sourceRel,
            status: "failed",
            reason: String(error.message || error)
          });
        }
      }
      } finally {
        if (ocrWorker) {
          await ocrWorker.terminate();
        }
      }

      manifest.lastRunAt = new Date().toISOString();
      manifest.lastRunMs = Date.now() - started;
      manifest.stats = {
        processed: (manifest.stats?.processed || 0) + processed,
        skipped: (manifest.stats?.skipped || 0) + skipped,
        failed: (manifest.stats?.failed || 0) + failed
      };
      await saveManifest(agentRoot, manifest);

      let pendingCount = 0;
      for (const sourceRel of candidates) {
        const check = await needsProcessing(sourceRel, { force: false });
        if (check.needed) pendingCount += 1;
      }

      return {
        ok: true,
        force: Boolean(force),
        limit: Math.max(1, Math.min(500, Number(limit) || 50)),
        candidateCount: candidates.length,
        processed,
        skipped,
        failed,
        pendingCount,
        lastRunMs: manifest.lastRunMs,
        results
      };
    })();

    runLocks.set(lockKey, job);
    try {
      return await job;
    } finally {
      runLocks.delete(lockKey);
    }
  }

  return {
    getStatus,
    run,
    listCandidates,
    sidecarRelForSource,
    isOcrCandidateFileName
  };
}

module.exports = { createOcrIndexService, OCR_IMAGE_EXTENSIONS, sidecarRelForSource };
