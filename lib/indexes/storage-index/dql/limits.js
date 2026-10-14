const MAX_DQL_LENGTH = 8000;
const MAX_LIMIT = 500;
const MAX_SORT_FIELDS = 4;
const MAX_AST_DEPTH = 12;
const MAX_AST_NODES = 80;

function walkExpr(node, state, depth = 0) {
  if (!node) return;
  if (depth > MAX_AST_DEPTH) {
    throw new Error(`DQL: expression too deep (max ${MAX_AST_DEPTH})`);
  }
  state.count += 1;
  if (state.count > MAX_AST_NODES) {
    throw new Error(`DQL: expression too large (max ${MAX_AST_NODES} nodes)`);
  }
  switch (node.type) {
    case "and":
    case "or":
      walkExpr(node.left, state, depth + 1);
      walkExpr(node.right, state, depth + 1);
      break;
    case "not":
    case "group":
      walkExpr(node.expr, state, depth + 1);
      break;
    default:
      break;
  }
}

function validateDqlInput(dqlString) {
  const text = String(dqlString || "");
  if (!text.trim()) throw new Error("DQL: empty query");
  if (text.length > MAX_DQL_LENGTH) {
    throw new Error(`DQL: query too long (max ${MAX_DQL_LENGTH} chars)`);
  }
}

function normalizePlanLimits(plan) {
  const next = { ...plan };
  const limit = Number(next.limit ?? 50);
  next.limit = Number.isFinite(limit) ? Math.min(MAX_LIMIT, Math.max(1, limit)) : 50;
  if (Array.isArray(next.sort)) {
    next.sort = next.sort.slice(0, MAX_SORT_FIELDS);
  }
  if (next.where) {
    walkExpr(next.where, { count: 0 });
  }
  return next;
}

module.exports = {
  MAX_DQL_LENGTH,
  MAX_LIMIT,
  validateDqlInput,
  normalizePlanLimits
};
