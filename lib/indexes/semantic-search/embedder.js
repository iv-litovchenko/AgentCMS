const { tokenize } = require("./tokenize");

const DIMS = 512;

function hashToken(token, dim) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = ((h >>> 0) % dim + dim) % dim;
  const sign = (h & 1) === 0 ? 1 : -1;
  return { idx, sign };
}

function normalize(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

function buildIdf(documents) {
  const df = new Map();
  const n = Math.max(documents.length, 1);
  for (const text of documents) {
    const seen = new Set(tokenize(text));
    for (const token of seen) df.set(token, (df.get(token) || 0) + 1);
  }
  const idf = Object.create(null);
  for (const [token, count] of df) {
    idf[token] = Math.log(1 + n / count);
  }
  return idf;
}

function embedText(text, idf) {
  const vec = new Float32Array(DIMS);
  const tokens = tokenize(text);
  if (!tokens.length) return Array.from(vec);

  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  let maxTf = 1;
  for (const v of tf.values()) maxTf = Math.max(maxTf, v);

  for (const [token, count] of tf) {
    const weight = (count / maxTf) * (idf?.[token] ?? 1);
    const { idx, sign } = hashToken(token, DIMS);
    vec[idx] += sign * weight;
  }
  return Array.from(normalize(vec));
}

function cosineSimilarity(a, b) {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot;
}

module.exports = {
  DIMS,
  MODEL_ID: "hash-tfidf-v1",
  buildIdf,
  embedText,
  cosineSimilarity
};
