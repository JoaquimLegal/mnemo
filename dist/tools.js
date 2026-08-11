export async function remember(store, input) {
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
export async function recall(store, input) {
    const results = await store.search(input.query, {
        agent: input.agent,
        limit: input.limit ?? 5,
        minImportance: input.minImportance,
        tags: input.tags,
    });
    if (results.length === 0)
        return "no relevant memories found";
    const lines = results.map((r, i) => `${i + 1}. [${r.memory.agent}] (${r.score.toFixed(2)}) ${r.memory.title}\n   ${r.memory.body
        .split("\n")
        .filter((l) => !l.startsWith("#"))
        .join(" ")
        .trim()}`);
    return lines.join("\n");
}
export async function searchMemories(store, input) {
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
export async function forget(store, input) {
    const ok = await store.delete(input.id, input.agent ?? "main");
    return ok ? `forgot ${input.id}` : `no memory ${input.id}`;
}
export async function listMemories(store, input) {
    const memories = await store.list(input.agent);
    const filtered = input.tags?.length
        ? memories.filter((m) => input.tags.every((t) => m.tags.includes(t)))
        : memories;
    if (filtered.length === 0)
        return "no memories";
    return filtered
        .map((m) => `${m.id}  [${m.agent}]  ${m.title}`)
        .join("\n");
}
export async function status(store) {
    await store.init();
    const memories = await store.list();
    const branch = await store.currentBranch();
    return `branch: ${branch}\nmemories: ${memories.length}`;
}
