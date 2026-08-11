import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../src/store.js";
import { forget, listMemories, recall, remember, searchMemories, status } from "../src/tools.js";

let dir: string;
let store: MemoryStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "mnemo-tools-"));
  store = new MemoryStore(path.join(dir, ".mnemo"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("tool functions", () => {
  it("remember persists and returns the id", async () => {
    const out = await remember(store, {
      title: "We chose Postgres",
      body: "over Mongo for transactions",
      tags: ["decision", "db"],
      importance: 0.9,
    });
    expect(out).toContain("remembered");
    const memories = await store.list();
    expect(memories).toHaveLength(1);
    expect(memories[0].source).toBe("agent");
  });

  it("recall returns the relevant memory in text form", async () => {
    await remember(store, { title: "Deploy with make deploy" });
    await remember(store, { title: "Postgres decision", body: "transactions over mongo" });
    const out = await recall(store, { query: "what was our database decision", limit: 3 });
    expect(out).toContain("Postgres decision");
    expect(out).toContain("1.");
  });

  it("recall says nothing found for a miss", async () => {
    await remember(store, { title: "something unrelated" });
    const out = await recall(store, { query: "quantum mechanics of otters" });
    expect(out).toBe("no relevant memories found");
  });

  it("searchMemories returns structured results", async () => {
    await remember(store, { title: "auth rotation" });
    const results = (await searchMemories(store, { query: "auth", limit: 5 })) as {
      id: string;
      title: string;
      score: number;
    }[];
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("auth rotation");
    expect(typeof results[0].score).toBe("number");
  });

  it("forget deletes a memory", async () => {
    const m = await store.write({ title: "temp" });
    expect(await forget(store, { id: m.id })).toContain("forgot");
    expect(await store.list()).toHaveLength(0);
  });

  it("listMemories formats lines and filters by tags", async () => {
    const a = await store.write({ title: "aaa", tags: ["x"] });
    const b = await store.write({ title: "bbb", tags: ["y"] });
    const all = await listMemories(store, {});
    expect(all).toContain("aaa");
    expect(all).toContain("bbb");
    const filtered = await listMemories(store, { tags: ["y"] });
    expect(filtered).toContain(b.id);
    expect(filtered).not.toContain(a.id);
  });

  it("status reports branch and count", async () => {
    await remember(store, { title: "one" });
    await remember(store, { title: "two" });
    const out = await status(store);
    expect(out).toContain("branch: main");
    expect(out).toContain("memories: 2");
  });
});
