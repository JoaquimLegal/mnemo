import type { MemoryStore } from "./store.js";
import type { MemoryType } from "./types.js";

export interface RememberInput {
  title: string;
  body?: string;
  tags?: string[];
  importance?: number;
  type?: MemoryType;
  agent?: string;
}

export interface RecallInput {
  query: string;
  agent?: string;
  limit?: number;
  minImportance?: number;
  tags?: string[];
}

export interface ForgetInput {
  id: string;
  agent?: string;
}

export async function remember(
  store: MemoryStore,
  input: RememberInput,
): Promise<string> {
  const memory = await store.write({
    title: input.title,
    body: input.body,
    tags: input.tags,
    importance: input.importance,
    type: input.type,
    agent: input.agent,
    source: "agent",
  });
  return `remembered ${memory.agent}/${memory.id}: ${memory.title}`;
}

export async function recall(
  store: MemoryStore,
  input: RecallInput,
): Promise<string> {
  const results = await store.search(input.query, {
    agent: input.agent,
    limit: input.limit ?? 5,
    minImportance: input.minImportance,
    tags: input.tags,
  });
  if (results.length === 0) return "no relevant memories found";
  const lines = results.map(
    (r, i) =>
      `${i + 1}. [${r.memory.agent}] (${r.score.toFixed(2)}) ${r.memory.title}\n   ${r.memory.body
        .split("\n")
        .filter((l) => !l.startsWith("#"))
        .join(" ")
        .trim()}`,
  );
  return lines.join("\n");
}

export async function searchMemories(
  store: MemoryStore,
  input: RecallInput,
): Promise<unknown[]> {
  const results = await store.search(input.query, {
    agent: input.agent,
    limit: input.limit ?? 10,
    minImportance: input.minImportance,
    tags: input.tags,
  });
  return results.map((r) => ({
    id: r.memory.id,
    agent: r.memory.agent,
    title: r.memory.title,
    body: r.memory.body,
    tags: r.memory.tags,
    importance: r.memory.importance,
    type: r.memory.type,
    createdAt: r.memory.createdAt,
    score: r.score,
  }));
}

export async function forget(
  store: MemoryStore,
  input: ForgetInput,
): Promise<string> {
  const ok = await store.delete(input.id, input.agent ?? "main");
  return ok ? `forgot ${input.id}` : `no memory ${input.id}`;
}

export async function listMemories(
  store: MemoryStore,
  input: { agent?: string; tags?: string[] },
): Promise<string> {
  const memories = await store.list(input.agent);
  const filtered = input.tags?.length
    ? memories.filter((m) => input.tags!.every((t) => m.tags.includes(t)))
    : memories;
  if (filtered.length === 0) return "no memories";
  return filtered
    .map((m) => `${m.id}  [${m.agent}]  ${m.title}`)
    .join("\n");
}

export async function status(store: MemoryStore): Promise<string> {
  await store.init();
  const memories = await store.list();
  const branch = await store.currentBranch();
  return `branch: ${branch}\nmemories: ${memories.length}`;
}
