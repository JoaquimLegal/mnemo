import { promises as fs } from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { parse, stringify } from "./frontmatter.js";
import { GitBackend } from "./git.js";
import { search as rankSearch } from "./search.js";
import { MEMORY_TYPES } from "./types.js";
export const DEFAULT_ROOT = ".mnemo";
export const H1_RE = /^#\s+(.+)$/m;
export class MemoryStore {
    root;
    git;
    withGit;
    constructor(root = DEFAULT_ROOT, options = {}) {
        this.root = root;
        this.withGit = options.git ?? true;
        this.git = this.withGit ? new GitBackend(root, options.gitConfig) : null;
    }
    get memoriesDir() {
        return path.join(this.root, "memories");
    }
    async init() {
        await fs.mkdir(this.memoriesDir, { recursive: true });
        if (this.git)
            await this.git.init();
    }
    async write(input) {
        await this.init();
        const agent = input.agent ?? "main";
        const now = input.createdAt ?? new Date().toISOString();
        const id = generateId(now, input.title);
        const memory = {
            id,
            agent,
            type: MEMORY_TYPES.includes(input.type ?? "episodic") ? input.type : "episodic",
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
    async read(id, agent = "main") {
        const file = this.pathFor(id, agent);
        let text;
        try {
            text = await fs.readFile(file, "utf8");
        }
        catch {
            return null;
        }
        const { data, body } = parse(text);
        return fromFile(data, body, agent);
    }
    async list(agent) {
        await this.init();
        const out = [];
        const agents = agent ? [agent] : await this.agents();
        for (const a of agents) {
            const dir = path.join(this.memoriesDir, a);
            const files = await fs.readdir(dir).catch(() => []);
            for (const f of files) {
                if (!f.endsWith(".md"))
                    continue;
                const m = await this.read(f.slice(0, -3), a);
                if (m)
                    out.push(m);
            }
        }
        return out.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    }
    async agents() {
        await this.init();
        const entries = await fs.readdir(this.memoriesDir).catch(() => []);
        const agents = [];
        for (const e of entries) {
            const st = await fs.stat(path.join(this.memoriesDir, e)).catch(() => null);
            if (st?.isDirectory())
                agents.push(e);
        }
        return agents.sort();
    }
    async delete(id, agent = "main") {
        const file = this.pathFor(id, agent);
        try {
            await fs.unlink(file);
        }
        catch {
            return false;
        }
        await this.git?.commitIfChanged(`mem: rm ${id}`);
        return true;
    }
    async log(limit = 30) {
        if (!this.git)
            return [];
        await this.init();
        return this.git.log(limit);
    }
    async undo() {
        if (!this.git)
            return false;
        await this.init();
        if ((await this.git.commitCount()) < 2)
            return false;
        await this.git.revert("HEAD");
        return true;
    }
    async branches() {
        if (!this.git)
            return [];
        await this.init();
        return this.git.branches();
    }
    async currentBranch() {
        if (!this.git)
            return "main";
        await this.init();
        return this.git.currentBranch();
    }
    async switchAgent(name) {
        if (!this.git)
            return;
        await this.init();
        await this.git.switchBranch(name);
    }
    async newAgent(name) {
        if (!this.git)
            return;
        await this.init();
        await this.git.newBranch(name);
    }
    async snapshot(tag) {
        if (!this.git)
            return;
        await this.init();
        await this.git.tag(tag);
    }
    async tags() {
        if (!this.git)
            return [];
        await this.init();
        return this.git.tags();
    }
    async revert(commit) {
        if (!this.git)
            return;
        await this.init();
        await this.git.revert(commit);
    }
    async search(query, opts = {}) {
        const memories = await this.list(opts.agent);
        return rankSearch(memories, query, opts);
    }
    pathFor(id, agent = "main") {
        return path.join(this.memoriesDir, agent, `${id}.md`);
    }
}
function toFile(memory) {
    const data = {
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
function fromFile(data, body, agent) {
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
function extractTitle(body, data) {
    const m = body.match(H1_RE);
    if (m)
        return m[1].trim();
    const firstLine = body.split(/\r?\n/).find((l) => l.trim());
    if (firstLine)
        return firstLine.trim().slice(0, 80);
    return String(data.id ?? "untitled");
}
function isMemoryType(v) {
    return MEMORY_TYPES.includes(v);
}
function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}
export function generateId(iso, seed) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
        `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
    const h = createHash("md5").update(`${iso}|${seed}`).digest("hex").slice(0, 4);
    return `${ts}-${h}`;
}
async function atomicWrite(file, content) {
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, content, "utf8");
    await fs.rename(tmp, file);
}
