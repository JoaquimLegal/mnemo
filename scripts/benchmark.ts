import { search, type SearchResult } from "../src/search.js";
import type { Memory } from "../src/types.js";

const TOPICS = [
  "postgres transactions",
  "docker compose deployment",
  "pino structured logging",
  "auth tokens rotation",
  "rate limiting redis",
  "feature flags launch",
  "backup strategy s3",
  "ci pipeline caching",
  "migration strategy rollback",
  "error tracking sentry",
];

function makeMemory(topic: string, daysAgo: number, importance: number): Memory {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  const [title, body] = topic.split(" ");
  return {
    id: topic.replace(/\s+/g, "-") + daysAgo,
    agent: "main",
    type: "semantic",
    importance,
    tags: ["synthetic"],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: "bench",
    title: `${title} ${body}`,
    body: `notes about ${topic} for the project, remember ${topic}`,
  };
}

function buildCorpus(count: number): Memory[] {
  const out: Memory[] = [];
  for (let i = 0; i < count; i++) {
    const topic = TOPICS[i % TOPICS.length];
    out.push(makeMemory(topic, i, 0.3 + ((i * 7) % 60) / 100));
  }
  return out;
}

function recallAtK(results: SearchResult[], expectedId: string, k: number): boolean {
  return results.slice(0, k).some((r) => r.memory.id === expectedId);
}

for (const size of [100, 1_000]) {
  const corpus = buildCorpus(size);
  let hits = 0;
  const queries = TOPICS.map((t) => t.split(" ")[0]);
  for (const q of queries) {
    const expected = corpus.find((m) => m.id.startsWith(q));
    if (!expected) continue;
    const results = search(corpus, q, { limit: 10 });
    if (recallAtK(results, expected.id, 1)) hits++;
  }
  const total = queries.length;
  const pct = ((hits / total) * 100).toFixed(1);
  console.log(`corpus=${size}  recall@1: ${hits}/${total} (${pct}%)`);
}
