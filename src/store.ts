import { promises as fs } from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { parse, stringify, type Frontmatter } from "./frontmatter.js";
import { GitBackend, type GitConfig, type GitLogEntry } from "./git.js";
import { search as rankSearch, type SearchOptions, type SearchResult } from "./search.js";
import { MEMORY_TYPES, type Memory, type MemoryType } from "./types.js";

export const DEFAULT_ROOT = ".mnemo";
export const H1_RE = /^#\s+(.+)$/m;

export interface NewMemoryInput {
  title: string;
  body?: string;
  agent?: string;
  type?: MemoryType;
  importance?: number;
  tags?: string[];
  source?: string;
  createdAt?: string;
}

export interface MemoryStoreOptions {
  git?: boolean;
  gitConfig?: GitConfig;
}

export class MemoryStore {
  readonly root: string;
  readonly git: GitBackend | null;
  private readonly withGit: boolean;

  constructor(root = DEFAULT_ROOT, options: MemoryStoreOptions = {}) {
    this.root = root;
    this.withGit = options.git ?? true;
    this.git = this.withGit ? new GitBackend(root, options.gitConfig) : null;
  }

  get memoriesDir(): string {
    return path.join(this.root, "memories");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.memoriesDir, { recursive: true });
    if (this.git) await this.git.init();
  }

  async write(input: NewMemoryInput): Promise<Memory> {
    await this.init();
    const agent = input.agent ?? "main";
    const now = input.createdAt ?? new Date().toISOString();
    const id = generateId(now, input.title);
    const memory: Memory = {
      id,
      agent,
      type: MEMORY_TYPES.includes(input.type ?? "episodic") ? (input.type as MemoryType) : "episodic",
      importance: clamp(input.importance ?? 0.5, 0, 1),
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      source: input.source ?? "cli",
      title: input.title,
      body: `# ${input.title}\n\n${(input.body ?? "").trim()}`.trim(),
    };
    const file = this.pathFor(id, agent);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await atomicWrite(file, toFile(memory));
    await this.git?.commitIfChanged(`mem: add ${id} - ${memory.title}`);
    return memory;
  }

  async read(id: string, agent = "main"): Promise<Memory | null> {
    const file = this.pathFor(id, agent);
    let text: string;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      return null;
    }
    const { data, body } = parse(text);
    return fromFile(data, body, agent);
  }

  async list(agent?: string): Promise<Memory[]> {
    await this.init();
    const out: Memory[] = [];
    const agents = agent ? [agent] : await this.agents();
    for (const a of agents) {
      const dir = path.join(this.memoriesDir, a);
      const files = await fs.readdir(dir).catch(() => []);
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const m = await this.read(f.slice(0, -3), a);
        if (m) out.push(m);
      }
    }
    return out.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  }

  async agents(): Promise<string[]> {
    await this.init();
    const entries = await fs.readdir(this.memoriesDir).catch(() => []);
    const agents: string[] = [];
    for (const e of entries) {
      const st = await fs.stat(path.join(this.memoriesDir, e)).catch(() => null);
      if (st?.isDirectory()) agents.push(e);
    }
    return agents.sort();
  }

  async delete(id: string, agent = "main"): Promise<boolean> {
    const file = this.pathFor(id, agent);
    try {
      await fs.unlink(file);
    } catch {
      return false;
    }
    await this.git?.commitIfChanged(`mem: rm ${id}`);
    return true;
  }

  async log(limit = 30): Promise<GitLogEntry[]> {
    if (!this.git) return [];
    await this.init();
    return this.git.log(limit);
  }

  async undo(): Promise<boolean> {
    if (!this.git) return false;
    await this.init();
    if ((await this.git.commitCount()) < 2) return false;
    await this.git.revert("HEAD");
    return true;
  }

  async branches(): Promise<string[]> {
    if (!this.git) return [];
    await this.init();
    return this.git.branches();
  }

  async currentBranch(): Promise<string> {
    if (!this.git) return "main";
    await this.init();
    return this.git.currentBranch();
  }

  async switchAgent(name: string): Promise<void> {
    if (!this.git) return;
    await this.init();
    await this.git.switchBranch(name);
  }

  async newAgent(name: string): Promise<void> {
    if (!this.git) return;
    await this.init();
    await this.git.newBranch(name);
  }

  async snapshot(tag: string): Promise<void> {
    if (!this.git) return;
    await this.init();
    await this.git.tag(tag);
  }

  async tags(): Promise<string[]> {
    if (!this.git) return [];
    await this.init();
    return this.git.tags();
  }

  async revert(commit: string): Promise<void> {
    if (!this.git) return;
    await this.init();
    await this.git.revert(commit);
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const memories = await this.list(opts.agent);
    return rankSearch(memories, query, opts);
  }

  pathFor(id: string, agent = "main"): string {
    return path.join(this.memoriesDir, agent, `${id}.md`);
  }
}

function toFile(memory: Memory): string {
  const data: Frontmatter = {
    id: memory.id,
    agent: memory.agent,
    type: memory.type,
    importance: memory.importance,
    tags: memory.tags,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    source: memory.source,
  };
  return stringify(data, memory.body);
}

function fromFile(data: Frontmatter, body: string, agent: string): Memory {
  const title = extractTitle(body, data);
  return {
    id: String(data.id ?? ""),
    agent: String(data.agent ?? agent),
    type: isMemoryType(data.type) ? data.type : "episodic",
    importance: clamp(Number(data.importance ?? 0.5) || 0.5, 0, 1),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
    source: String(data.source ?? ""),
    title,
    body,
  };
}

function extractTitle(body: string, data: Frontmatter): string {
  const m = body.match(H1_RE);
  if (m) return m[1].trim();
  const firstLine = body.split(/\r?\n/).find((l) => l.trim());
  if (firstLine) return firstLine.trim().slice(0, 80);
  return String(data.id ?? "untitled");
}

function isMemoryType(v: unknown): v is MemoryType {
  return MEMORY_TYPES.includes(v as MemoryType);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function generateId(iso: string, seed: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  const h = createHash("md5").update(`${iso}|${seed}`).digest("hex").slice(0, 4);
  return `${ts}-${h}`;
}

async function atomicWrite(file: string, content: string): Promise<void> {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, file);
}
