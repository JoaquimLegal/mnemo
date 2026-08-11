export const DEFAULT_WEIGHTS = { relevance: 0.5, recency: 0.2, importance: 0.3 };
const STOPWORDS = new Set([
    "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been",
    "to", "of", "in", "on", "at", "for", "with", "from", "by", "about", "as", "if",
    "then", "than", "that", "this", "these", "those", "it", "its", "which", "what",
    "who", "whom", "when", "where", "why", "how", "do", "does", "did", "doing",
    "we", "you", "your", "they", "them", "he", "she", "our", "their", "us", "not",
    "no", "so", "too", "very", "just", "would", "should", "could", "can", "may",
    "might", "have", "has", "had", "will", "shall", "into", "over", "under",
]);
export function tokenize(text) {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
export function docText(memory) {
    return `${memory.title} ${memory.title} ${memory.body} ${memory.tags.join(" ")}`;
}
export function bm25Scores(memories, query) {
    const docs = memories.map((m) => ({ id: m.id, text: docText(m) }));
    const N = docs.length;
    const tokens = docs.map((d) => tokenize(d.text));
    const avgLen = N ? tokens.reduce((s, t) => s + t.length, 0) / N : 0;
    const k1 = 1.2;
    const b = 0.75;
    const df = new Map();
    for (const toks of tokens) {
        for (const t of new Set(toks))
            df.set(t, (df.get(t) ?? 0) + 1);
    }
    const qTerms = tokenize(query);
    const scores = new Map();
    for (let i = 0; i < N; i++) {
        const freq = new Map();
        for (const t of tokens[i])
            freq.set(t, (freq.get(t) ?? 0) + 1);
        const len = tokens[i].length;
        let s = 0;
        for (const q of qTerms) {
            if (!freq.has(q) || !df.has(q))
                continue;
            const idf = Math.log(1 + (N - df.get(q) + 0.5) / (df.get(q) + 0.5));
            const tf = (freq.get(q) * (k1 + 1)) /
                (freq.get(q) + k1 * (1 - b + b * (len / (avgLen || 1))));
            s += idf * tf;
        }
        if (s > 0)
            scores.set(docs[i].id, s);
    }
    return scores;
}
export function search(memories, query, opts = {}) {
    const limit = opts.limit ?? 10;
    const halfLife = opts.recencyHalfLifeDays ?? 30;
    const w = opts.weights ?? DEFAULT_WEIGHTS;
    const now = Date.now();
    const bm = bm25Scores(memories, query);
    let maxBm = 1;
    for (const s of bm.values())
        if (s > maxBm)
            maxBm = s;
    const qTerms = tokenize(query);
    const requireMatch = qTerms.length > 0;
    const out = [];
    for (const m of memories) {
        if (opts.agent && m.agent !== opts.agent)
            continue;
        if (opts.tags?.length && !opts.tags.every((t) => m.tags.includes(t)))
            continue;
        if (opts.minImportance != null && m.importance < opts.minImportance)
            continue;
        if (requireMatch && !bm.has(m.id))
            continue;
        const relevance = (bm.get(m.id) ?? 0) / maxBm;
        const ageDays = Math.max(0, (now - Date.parse(m.createdAt)) / 86_400_000);
        const recency = Math.exp(-ageDays / halfLife);
        const score = w.relevance * relevance + w.recency * recency + w.importance * m.importance;
        out.push({ memory: m, score, relevance, recency });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
