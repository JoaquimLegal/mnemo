# Search & ranking

`mnemo` retrieves memories with a classic, dependency-free pipeline:

**tokenize → BM25 → hybrid rank.**

## Tokenizer

Lowercase, split on non-alphanumeric, drop single characters and a small
English stopword list. Stopwords matter a lot in practice: an agent asking
*"what was our database decision"* produces query terms `database decision`
instead of `what was our database decision` — which is what makes BM25 work on
natural language.

## BM25

Classic Okapi BM25 over `title + title + body + tags` (title appears twice, a
cheap way to weight it). Parameters `k1 = 1.2`, `b = 0.75`. It is ~40 lines of
code and outperforms plain cosine over tf-idf for keyword queries.

```
score(d, q) = Σ idf(q) · tf(q,d)·(k1+1) / (tf(q,d) + k1·(1 - b + b·|d|/avgdl))
```

## Hybrid rank

BM25 alone ignores *when* a memory was created and *how important* it was. The
final score blends three signals:

```
score = 0.5 · relevance + 0.2 · recency + 0.3 · importance
```

- `relevance` = normalized BM25 (0..1);
- `recency` = `exp(-age_days / 30)` — an exponential decay with a 30-day
  half-life;
- `importance` = the memory's own 0..1 field.

Weighting is deliberate: relevance dominates, but a recent or important memory
can win ties. This is what makes `recall` feel like an agent that "sort of
remembers where the important stuff lives".

## Precision first

When the query has any term, results without a BM25 match are excluded. A
"recall" that surfaces unrelated memories is worse than one that says *"no
relevant memories found"* — the agent then knows to investigate instead of
trusting noise.

## Semantic (optional)

Install `@huggingface/transformers` to enable `mm search --semantic`, which
embeds the query and each memory (`all-MiniLM-L6-v2`, mean pooling) and ranks
by cosine similarity. Useful for queries with no shared vocabulary. The module
is lazily imported, so the base install stays dependency-free.
