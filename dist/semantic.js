import { docText } from "./search.js";
let cached = null;
export async function getEmbedder() {
    if (cached)
        return cached;
    try {
        const { pipeline } = await import("@huggingface/transformers");
        const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        cached = async (text) => {
            const out = await pipe(text, { pooling: "mean", normalize: true });
            return Array.from(out.data);
        };
        return cached;
    }
    catch {
        throw new Error("semantic search requires @huggingface/transformers — run: npm i @huggingface/transformers");
    }
}
export async function semanticSearch(memories, query, opts = {}) {
    const embed = await getEmbedder();
    const limit = opts.limit ?? 10;
    const cache = new Map();
    const embedCached = async (text) => {
        let v = cache.get(text);
        if (!v) {
            v = await embed(text);
            cache.set(text, v);
        }
        return v;
    };
    const q = await embedCached(query);
    const scored = [];
    for (const m of memories) {
        if (opts.agent && m.agent !== opts.agent)
            continue;
        if (opts.tags?.length && !opts.tags.every((t) => m.tags.includes(t)))
            continue;
        if (opts.minImportance != null && m.importance < opts.minImportance)
            continue;
        const e = await embedCached(docText(m));
        const score = cosine(q, e);
        scored.push({ memory: m, score, relevance: score, recency: 0 });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
function cosine(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
