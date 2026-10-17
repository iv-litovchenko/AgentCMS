function walkExpr(node, visitor) {
  if (!node) return;
  visitor(node);
  switch (node.type) {
    case "and":
    case "or":
      walkExpr(node.left, visitor);
      walkExpr(node.right, visitor);
      break;
    case "not":
    case "group":
      walkExpr(node.expr, visitor);
      break;
    default:
      break;
  }
}

function exprUsesLinkFields(node) {
  let found = false;
  walkExpr(node, (n) => {
    if (n.type === "compare" && (n.field === "file.inlinks" || n.field === "file.outlinks")) {
      found = true;
    }
  });
  return found;
}

module.exports = { walkExpr, exprUsesLinkFields };
