const crypto = require("crypto");

const FEATURE_SIZE = 128;

function hashSeed(text) {
  const digest = crypto.createHash("sha256").update(String(text)).digest();
  let state = digest.readUInt32BE(0);
  const out = [];
  for (let i = 0; i < FEATURE_SIZE; i += 1) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    out.push((state / 0xffffffff) * 2 - 1);
  }
  return normalizeVector(out);
}

function normalizeVector(values) {
  let norm = 0;
  for (const value of values) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return values.map((value) => value / norm);
}

function addNoise(features, amount = 0.07) {
  const noisy = features.map((value) => {
    const delta = (Math.random() * 2 - 1) * amount;
    return value + delta;
  });
  return normalizeVector(noisy);
}

function averageVectors(vectors) {
  if (!vectors.length) return [];
  const size = vectors[0].length;
  const sum = new Array(size).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < size; i += 1) sum[i] += vector[i];
  }
  return normalizeVector(sum.map((value) => value / vectors.length));
}

function createMockDriver() {
  return {
    name: "mock",
    label: "Mock USB scanner (demo)",
    featureSize: FEATURE_SIZE,
    async captureEnrollSample(sessionSeed, scanIndex) {
      const base = hashSeed(`${sessionSeed}:enroll`);
      const sample = addNoise(base, 0.04 + scanIndex * 0.01);
      return {
        features: sample,
        quality: 0.9 - scanIndex * 0.03,
        driver: "mock"
      };
    },
    async captureVerifySample(referenceFeatures) {
      if (!Array.isArray(referenceFeatures) || !referenceFeatures.length) {
        const random = hashSeed(`verify:${Date.now()}:${Math.random()}`);
        return { features: random, quality: 0.4, driver: "mock" };
      }
      return {
        features: addNoise(referenceFeatures, 0.06),
        quality: 0.88,
        driver: "mock"
      };
    },
    averageVectors
  };
}

module.exports = {
  FEATURE_SIZE,
  createMockDriver,
  hashSeed,
  addNoise,
  averageVectors
};
