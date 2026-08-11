export interface Frontmatter {
  [key: string]: unknown;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parse(text: string): { data: Frontmatter; body: string } {
  const m = text.match(FM_RE);
  if (!m) return { data: {}, body: text };
  const data: Frontmatter = {};
  const lines = m[1].split(/\r?\n/);
  let currentKey: string | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const listItem = line.match(/^-\s+(.*)$/);
    if (listItem && currentKey) {
      const arr = Array.isArray(data[currentKey]) ? (data[currentKey] as unknown[]) : [];
      arr.push(parseScalar(listItem[1]));
      data[currentKey] = arr;
      continue;
    }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    currentKey = kv[1];
    const v = kv[2].trim();
    if (v === "") {
      data[currentKey] = [];
      continue;
    }
    data[currentKey] = parseScalar(v);
  }
  return { data, body: m[2] };
}

export function stringify(data: Frontmatter, body = ""): string {
  const order = ["id", "agent", "type", "importance", "tags", "createdAt", "updatedAt", "source"];
  const keys = order.filter((k) => k in data);
  const rest = Object.keys(data).filter((k) => !order.includes(k));
  const lines: string[] = ["---"];
  for (const k of [...keys, ...rest]) {
    lines.push(serializeValue(k, data[k]));
  }
  lines.push("---");
  const out = [lines.join("\n")];
  if (body.trim()) out.push("", body.trim());
  return out.join("\n") + "\n";
}

function parseScalar(v: string): unknown {
  if (v.startsWith("[") && v.endsWith("]")) {
    try {
      return JSON.parse(v);
    } catch {
      return splitInlineArray(v.slice(1, -1)).map(parseScalar);
    }
  }
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function splitInlineArray(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      inQuote = !inQuote;
      cur += c;
    } else if (c === "," && !inQuote) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

function serializeValue(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    return `${key}: [${value.map((v) => JSON.stringify(v)).join(", ")}]`;
  }
  if (typeof value === "string") {
    if (/[\n:]/.test(value)) return `${key}: ${JSON.stringify(value)}`;
    return `${key}: ${value}`;
  }
  return `${key}: ${JSON.stringify(value)}`;
}
