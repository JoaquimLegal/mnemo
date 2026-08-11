import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryStore, generateId } from "../src/store.js";

let dir: string;
let store: MemoryStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "mnemo-"));
  store = new MemoryStore(path.join(dir, ".mnemo"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("MemoryStore", () => {
  it("writes and reads a memory with H1 title", async () => {
    const written = await store.write({
      title: "We chose Postgres",
      body: "over Mongo, because of transactions.",
      tags: ["decision", "db"],
      importance: 0.9,
      type: "semantic",
    });
    const read = await store.read(written.id);
    expect(read).not.toBeNull();
    expect(read!.title).toBe("We chose Postgres");
    expect(read!.body).toContain("# We chose Postgres");
    expect(read!.body).toContain("over Mongo");
    expect(read!.tags).toEqual(["decision", "db"]);
    expect(read!.importance).toBe(0.9);
    expect(read!.type).toBe("semantic");
  });

  it("isolates memories by agent", async () => {
    await store.write({ title: "planner note", agent: "planner" });
    await store.write({ title: "implementer note", agent: "implementer" });
    const planner = await store.list("planner");
    const all = await store.list();
    expect(planner).toHaveLength(1);
    expect(planner[0].title).toBe("planner note");
    expect(all).toHaveLength(2);
  });

  it("deletes a memory", async () => {
    const m = await store.write({ title: "tmp" });
    expect(await store.read(m.id)).not.toBeNull();
    expect(await store.delete(m.id)).toBe(true);
    expect(await store.read(m.id)).toBeNull();
    expect(await store.delete(m.id)).toBe(false);
  });

  it("clamps importance to [0,1]", async () => {
    const high = await store.write({ title: "a", importance: 5 });
    const low = await store.write({ title: "b", importance: -1 });
    expect(high.importance).toBe(1);
    expect(low.importance).toBe(0);
  });

  it("sorts list newest first", async () => {
    const a = await store.write({ title: "a", createdAt: "2026-01-01T00:00:00Z" });
    const b = await store.write({ title: "b", createdAt: "2026-06-01T00:00:00Z" });
    const list = await store.list();
    expect(list.map((m) => m.id)).toEqual([b.id, a.id]);
  });
});

describe("generateId", () => {
  it("is deterministic for same input and unique for different", () => {
    expect(generateId("2026-08-11T12:00:00Z", "x")).toBe(generateId("2026-08-11T12:00:00Z", "x"));
    expect(generateId("2026-08-11T12:00:00Z", "x")).not.toBe(generateId("2026-08-11T12:00:00Z", "y"));
  });
});
