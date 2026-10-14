const KEYWORDS = new Set([
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "SORT",
  "ORDER",
  "BY",
  "LIMIT",
  "SELECT",
  "FIELDS",
  "CONTAINS",
  "ASC",
  "DESC",
  "TRUE",
  "FALSE",
  "NULL",
  "FLATTEN",
  "GROUP",
  "COUNT",
  "SUM",
  "MIN",
  "MAX",
  "LAST",
  "DAYS"
]);

function isIdentStart(ch) {
  return /[a-zA-Z_]/.test(ch);
}

function isIdentPart(ch) {
  return /[a-zA-Z0-9_.-]/.test(ch);
}

function tokenize(input) {
  const src = String(input || "").trim();
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "(" || ch === ")" || ch === ",") {
      tokens.push({ type: "punct", value: ch });
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      let value = "";
      while (i < src.length) {
        if (src[i] === "\\" && i + 1 < src.length) {
          value += src[i + 1];
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i += 1;
          break;
        }
        value += src[i];
        i += 1;
      }
      tokens.push({ type: "string", value });
      continue;
    }
    if (ch === "=" || ch === ">" || ch === "<" || ch === "!") {
      let op = ch;
      if (i + 1 < src.length && src[i + 1] === "=") {
        op += "=";
        i += 2;
      } else {
        i += 1;
      }
      tokens.push({ type: "op", value: op });
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let num = "";
      while (i < src.length && /[0-9.]/.test(src[i])) {
        num += src[i];
        i += 1;
      }
      tokens.push({ type: "number", value: Number(num) });
      continue;
    }
    if (isIdentStart(ch)) {
      let ident = "";
      while (i < src.length && isIdentPart(src[i])) {
        ident += src[i];
        i += 1;
      }
      while (i < src.length && src[i] === "/" && isIdentStart(src[i + 1] || "")) {
        ident += "/";
        i += 1;
        while (i < src.length && isIdentPart(src[i])) {
          ident += src[i];
          i += 1;
        }
      }
      const upper = ident.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokens.push({ type: "keyword", value: upper });
      } else {
        tokens.push({ type: "ident", value: ident });
      }
      continue;
    }
    throw new Error(`DQL: unexpected character "${ch}" at ${i + 1}`);
  }
  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  next() {
    return this.tokens[this.pos++];
  }

  expectKeyword(word) {
    const t = this.next();
    if (!t || t.type !== "keyword" || t.value !== word) {
      throw new Error(`DQL: expected ${word}`);
    }
  }

  matchKeyword(word) {
    const t = this.peek();
    if (t && t.type === "keyword" && t.value === word) {
      this.pos += 1;
      return true;
    }
    return false;
  }

  parseLiteral() {
    const t = this.next();
    if (!t) throw new Error("DQL: expected value");
    if (t.type === "string" || t.type === "number") return t.value;
    if (t.type === "keyword") {
      if (t.value === "TRUE") return true;
      if (t.value === "FALSE") return false;
      if (t.value === "NULL") return null;
    }
    if (t.type === "ident") return t.value;
    throw new Error("DQL: expected literal");
  }

  parseField() {
    const t = this.next();
    if (!t) throw new Error("DQL: expected field");
    if (t.type === "ident") return t.value;
    if (t.type === "string") return t.value;
    throw new Error("DQL: expected field name");
  }

  parseCompare() {
    if (this.matchKeyword("NOT")) {
      const inner = this.parseCompare();
      return { type: "not", expr: inner };
    }
    if (this.peek()?.type === "punct" && this.peek().value === "(") {
      this.next();
      const expr = this.parseOr();
      const close = this.next();
      if (!close || close.type !== "punct" || close.value !== ")") {
        throw new Error("DQL: expected )");
      }
      return { type: "group", expr };
    }

    const field = this.parseField();
    if (this.matchKeyword("LAST")) {
      const days = this.parseLiteral();
      if (!this.matchKeyword("DAYS")) throw new Error("DQL: expected DAYS after LAST");
      return { type: "relative-days", field, days: Number(days) };
    }
    if (this.matchKeyword("CONTAINS")) {
      const value = this.parseLiteral();
      return { type: "compare", field, op: "contains", value };
    }

    const opToken = this.next();
    if (!opToken || opToken.type !== "op") {
      throw new Error(`DQL: expected operator after ${field}`);
    }
    const opMap = {
      "=": "eq",
      "!=": "ne",
      "<>": "ne",
      ">": "gt",
      ">=": "gte",
      "<": "lt",
      "<=": "lte"
    };
    const op = opMap[opToken.value];
    if (!op) throw new Error(`DQL: unsupported operator ${opToken.value}`);
    const value = this.parseLiteral();
    return { type: "compare", field, op, value };
  }

  parseAnd() {
    let left = this.parseCompare();
    while (this.matchKeyword("AND")) {
      left = { type: "and", left, right: this.parseCompare() };
    }
    return left;
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.matchKeyword("OR")) {
      left = { type: "or", left, right: this.parseAnd() };
    }
    return left;
  }

  parseSelectList() {
    const fields = [];
    fields.push(this.parseField());
    while (this.peek()?.type === "punct" && this.peek().value === ",") {
      this.next();
      fields.push(this.parseField());
    }
    return fields;
  }

  parseSortList() {
    const sorts = [];
    do {
      const field = this.parseField();
      let dir = "asc";
      if (this.matchKeyword("DESC")) dir = "desc";
      else this.matchKeyword("ASC");
      sorts.push({ field, dir });
    } while (this.peek()?.type === "punct" && this.peek().value === "," && (this.next(), true));
    return sorts;
  }

  parse() {
    const plan = {
      dqlVersion: 1,
      from: null,
      where: null,
      flatten: null,
      groupBy: null,
      aggregate: null,
      sort: null,
      limit: 50,
      select: null
    };

    if (this.matchKeyword("FROM")) {
      const lit = this.parseLiteral();
      plan.from = String(lit || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
    }

    if (this.matchKeyword("WHERE")) {
      plan.where = this.parseOr();
    }

    if (this.matchKeyword("FLATTEN")) {
      plan.flatten = this.parseField();
    }

    if (this.matchKeyword("GROUP")) {
      this.expectKeyword("BY");
      plan.groupBy = this.parseField();
      if (this.matchKeyword("SUM")) {
        plan.aggregate = { fn: "sum", field: this.parseField() };
      } else if (this.matchKeyword("MIN")) {
        plan.aggregate = { fn: "min", field: this.parseField() };
      } else if (this.matchKeyword("MAX")) {
        plan.aggregate = { fn: "max", field: this.parseField() };
      } else if (this.matchKeyword("COUNT")) {
        plan.aggregate = { fn: "count" };
      } else {
        plan.aggregate = { fn: "count" };
      }
    }

    if (this.matchKeyword("SORT") || (this.matchKeyword("ORDER") && this.expectKeyword("BY"))) {
      const sorts = this.parseSortList();
      plan.sort = sorts.length === 1 ? sorts[0] : sorts;
    }

    if (this.matchKeyword("LIMIT")) {
      const n = this.parseLiteral();
      plan.limit = Math.min(500, Math.max(1, Number(n) || 50));
    }

    if (this.matchKeyword("SELECT") || this.matchKeyword("FIELDS")) {
      plan.select = this.parseSelectList();
    }

    if (this.pos < this.tokens.length) {
      throw new Error(`DQL: unexpected token ${this.tokens[this.pos].value}`);
    }

    return plan;
  }
}

function parseDql(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) throw new Error("DQL: empty query");
  const tokens = tokenize(trimmed);
  return new Parser(tokens).parse();
}

module.exports = { parseDql, tokenize };
