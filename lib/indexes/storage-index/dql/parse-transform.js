function splitDqlTransform(dql) {
  const lines = String(dql || "").split(/\r?\n/);
  let transform = null;
  const dqlLines = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("@transform")) {
      const json = t.slice("@transform".length).trim();
      try {
        transform = JSON.parse(json);
      } catch {
        // ignore invalid transform line
      }
      continue;
    }
    dqlLines.push(line);
  }
  return { dql: dqlLines.join("\n").trim(), transform };
}

module.exports = { splitDqlTransform };
