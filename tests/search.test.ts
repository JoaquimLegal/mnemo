import { describe, expect, it } from "vitest";
import type { Memory } from "../src/types.js";
import { bm25Scores, docText, search, tokenize } from "../src/search.js";

function mem(overrides: Partial<Memory>): Memory {
  const now = new Date().toISOString();
  return {
    id: Math.random().toString(36).slice(2, 8),
    agent: "main",
    type: "episodic",
    importance: 0.5,
    tags: [],
    createdAt: now,
    updatedAt: now,
    source: "test",
    title: "",
    body: "",
    ...overrides,
  };
}

describe("tokenize", () => {
  it("lowercases and strips punctuation", () => {
    expect(tokenize("We chose Postgres, over Mongo!")).toEqual([
      "chose",
      "postgres",
      "mongo",
    ]);
  });

  it("drops english stopwords", () => {
    expect(tokenize("what was our database decision")).toEqual(["database", "decision"]);
  });
});

describe("bm25Scores", () => {
  it("scores only matching documents", () => {
    const memories = [
      mem({ title: "Postgres decision", body: "we picked postgres for transactions" }),
      mem({ title: "Deploy flow", body: "run make deploy to ship" }),
    ];
    const scores = bm25Scores(memories, "postgres transactions");
    expect(scores.size).toBe(1);
    expect(scores.has(memories[0].id)).toBe(true);
  });
});

describe("search", () => {
  it("ranks the relevant memory first", () => {
    const memories = [
      mem({ title: "Deploy flow", body: "run make deploy to ship to production" }),
      mem({ title: "Postgres decision", body: "we picked postgres over mongo for transactions" }),
      mem({ title: "Logging", body: "use pino for structured logs" }),
    ];
    const results = search(memories, "why postgres instead of mongo", { limit: 3 });
    expect(results[0].memory.id).toBe(memories[1].id);
  });

  it("boosts recent memories when relevance ties", () => {
    const old = mem({
      title: "tabs",
      createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    });
    const recent = mem({ title: "tabs", createdAt: new Date().toISOString() });
    const results = search([old, recent], "tabs", { limit: 2 });
    expect(results[0].memory.id).toBe(recent.id);
  });

  it("prefers important memories over merely recent ones", () => {
    const unimportant = mem({ title: "tabs", importance: 0.1 });
    const important = mem({ title: "tabs", importance: 0.95, createdAt: new Date(Date.now() - 40 * 86_400_000).toISOString() });
    const results = search([unimportant, important], "tabs", { limit: 2 });
    expect(results[0].memory.id).toBe(important.id);
  });

  it("filters by tags and agent", () => {
    const memories = [
      mem({ title: "a", tags: ["db"], agent: "planner" }),
      mem({ title: "b", tags: ["db", "ops"], agent: "main" }),
    ];
    const results = search(memories, "a b", { tags: ["db", "ops"] });
    expect(results).toHaveLength(1);
    expect(results[0].memory.id).toBe(memories[1].id);
  });

  it("applies minImportance filter", () => {
    const memories = [mem({ title: "x", importance: 0.2 }), mem({ title: "x", importance: 0.8 })];
    const results = search(memories, "x", { minImportance: 0.5 });
    expect(results).toHaveLength(1);
    expect(results[0].memory.importance).toBe(0.8);
  });
});

describe("docText", () => {
  it("weights the title twice", () => {
    const text = docText(mem({ title: "postgres", body: "other words" }));
    expect(text.match(/postgres/g)).toHaveLength(2);
  });
});
