# Launch kit

Ready-to-post copy. Repo: https://github.com/JoaquimLegal/mnemo
Package: `npm i -g mnemo-mem` · Demo GIF: `demo.gif`

---

## Show HN

**Title:** Show HN: Mnemo — give your AI agents a git repo as a brain

**Body:**

Hi HN,

LLM agents are stateless. Every session they forget everything you already
decided — you burn tokens re-explaining context and watch them re-open settled
questions.

**Mnemo** is persistent, local-first memory for AI agents. Instead of a vector
DB, memory is a folder of Markdown files inside a git repo (`.mnemo/`). That one
decision buys you, for free:

- auditability — `git log` shows exactly what the agent knew, and when
- branching — fork an alternative memory timeline with `mm branch experiment`
- snapshots & rollback — `mm snapshot v1`, `mm undo`
- zero cloud, zero lock-in — memory is a folder you own

It ships three surfaces:
- **CLI** (`mm`) for humans
- **MCP server** (`mm mcp`) for any agent — Claude Code, Cursor, Codex
- **OpenCode plugin** (`mm setup-opencode`) that auto-captures a summary at the
  end of each session and seeds the next one with the recent highlights — memory
  happens without you maintaining it

Search is classic BM25 + a recency/importance rank, ~90% recall@1 on synthetic
corpora, and the core has zero runtime deps. Semantic embeddings are optional.

```sh
npm i -g mnemo-mem
mm init
mm setup-opencode   # then restart OpenCode
```

The thing I'd love feedback on: what should auto-compaction look like? Right now
small memories accumulate; I'm thinking periodic "executive summary" memories.
Open to any other design criticism.

---

## r/programming

**Title:** I gave my AI coding agents a git repo as memory (MCP + OpenCode plugin)

**Body:**

Every coding agent I use (OpenCode, Claude Code, Cursor) forgets everything
between sessions. I got tired of re-explaining the same decisions, so I built a
tool that makes memory:

1. a folder of Markdown files (`memories/<agent>/<id>.md`)
2. versioned by git — so every "remember" is an auditable commit
3. searchable with BM25 + recency/importance ranking
4. exposed as an MCP server + an automatic OpenCode plugin

The MCP server works with any agent that speaks MCP. The OpenCode plugin
summarizes each session on idle and seeds the next one, so the agent actually
remembers. Human-readable, diffable, branchable, rollback-able. Zero runtime
dependencies in the core.

```sh
npm i -g mnemo-mem
mm init && mm setup-opencode
```

What I'm curious about: does anyone else think git is the right substrate for
agent memory vs vector DBs? And how would you handle consolidation when memories
accumulate?

---

## X (thread)

Post 1 (hook):
Your AI agent's memory is just a git repo. 🧠🗂️
Every session it auto-saves what it learned. Every new session it starts already knowing.

Post 2 (what you get):
Audit log? `git log`.
Rollback? `mm undo`.
Fork a different reality? `mm branch experiment`.
No cloud. No vector DB. Just Markdown + git.

Post 3 (call to action + GIF):
`npm i -g mnemo-mem && mm setup-opencode`
MCP server for Claude Code / Cursor / Codex. Auto-capture plugin for OpenCode.
→ github.com/JoaquimLegal/mnemo
[attach demo.gif]

Post 4 (ask):
Feedback I want: consolidation. Should memories auto-compress into executive
summaries? RT if you'd use this. 🙏

---

## Timing & tips

- **HN**: submit early (7–9am EST weekday). Title is what matters — "git repo as
  a brain" does the work. Reply to every comment; HN ranks engagement.
- **r/programming**: post Monday–Thursday, 8–11am EST. The title should be a
  claim, not a pitch.
- **X**: right after the HN post goes live; tag @opencode_ai / Claude Code devs
  in replies. Pin the thread.
- Cross-post the HN link to Lobsters + r/LocalLLaMA (memory is a hot topic there).

## Short links to include

- Repo: https://github.com/JoaquimLegal/mnemo
- Install: `npm i -g mnemo-mem`
- GIF: https://github.com/JoaquimLegal/mnemo/blob/main/demo.gif
