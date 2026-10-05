const MATCH_THRESHOLD = 0.86;

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findBestMatch(probe, templates) {
  let best = null;
  for (const row of templates) {
    const features = row?.template?.features;
    if (!Array.isArray(features)) continue;
    const score = cosineSimilarity(probe, features);
    if (!best || score > best.score) {
      best = {
        id: row.id,
        login: row.login,
        fingerLabel: row.fingerLabel,
        score
      };
    }
  }
  if (!best) return null;
  return {
    ...best,
    matched: best.score >= MATCH_THRESHOLD
  };
}

module.exports = {
  MATCH_THRESHOLD,
  cosineSimilarity,
  findBestMatch
};
