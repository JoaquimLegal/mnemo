# mnemo

> **Give your AI agents a git repo as a brain.**

`mnemo` is persistent, local-first memory for AI agents (OpenCode, Claude Code,
Cursor, Codex…). Agents remember by writing **Markdown files into a git repo** —
so you get auditability, branching, snapshots, and rollback for free.

<!--
![demo](https://user-images.githubusercontent.com/placeholder/mnemo-demo.gif)
-->

```
$ mm new "We chose Postgres" --body "over Mongo, because of transactions" --tags decision,db --importance 0.9
wrote main/20260811-221936-2d37

$ mm search "which database did we pick"
20260811-221936-2d37  0.81  [main]  We chose Postgres

$ mm log
4e246fa  mem: add 20260811-221936-2d37 - We chose Postgres

$ mm undo        # revert the last change — history is preserved
$ mm branch exp  # fork an alternative memory timeline
```

## Why

LLM agents are stateless: every session forgets everything. You repeat
decisions, preferences, and context over and over — burning tokens and letting
the agent **re-open settled questions**.

`mnemo` fixes the pain points:

- **Cross-session onboarding** — a new session reads yesterday's memories and *starts* knowing.
- **Multi-agent shared reality** — the planner writes decisions, the implementer reads them.
- **Auditability** — `git log` shows exactly what the agent knew, and when. (The requirement the agent community keeps asking for in 2026.)
- **Token economy** — recall the 3 memories that matter instead of re-reading the whole project.
- **100% local** — memory is a folder on your machine. No cloud, no lock-in.

## How

```
              ┌─────────────────────┐
  agent ─────▶│  MCP server (mm mcp) │──┐
              └─────────────────────┘  │
              ┌─────────────────────┐  │   .mnemo/          (a git repo)
  OpenCode ──▶│  plugin (auto)       │──┼──▶ memories/<agent>/<id>.md
  plugin      │  capture + seed      │  │        └── frontmatter + markdown
              └─────────────────────┘  │   search: BM25 + recency + importance
  human ─────▶│  mm CLI               │──┘   audit:  git log / diff / revert
              └─────────────────────┘
```

Every memory is a human-readable Markdown file with metadata, and every
mutation is a git commit. Search is classic **BM25** plus a recency/importance
rank — zero dependencies, ~90% recall@1 on synthetic corpora.

## Install & use

```sh
npm i -g mnemo

# in your project:
mm init
mm setup-opencode        # installs the OpenCode plugin + MCP config, then restart OpenCode
```

The OpenCode plugin makes memory **automatic**: at the end of a session it
summarizes what was decided/learned and stores it; at the start of the next
session it seeds the agent with the recent highlights. You don't maintain
memory — it happens.

For other agents, add the MCP server:

```json
{ "mcpServers": { "mnemo": { "command": "mm", "args": ["mcp"] } } }
```

And drop [`prompts/AGENTS.md`](prompts/AGENTS.md) into your project so agents
know to call `recall` before work and `remember` after decisions.

### CLI reference

```
mm init / new / ls / search / cat / rm
mm log | undo | revert <commit> | snapshot <tag> | tags | branches | branch | switch
mm mcp | setup-opencode
```

## Documentation

- [`docs/01-architecture.md`](docs/01-architecture.md) — the one idea, module by module
- [`docs/02-git-substrate.md`](docs/02-git-substrate.md) — why git, not a vector DB
- [`docs/03-search.md`](docs/03-search.md) — BM25 + hybrid ranking, with math
- [`docs/04-mcp.md`](docs/04-mcp.md) — the MCP tools and the OpenCode plugin

## Roadmap

- [x] Core store (Markdown + frontmatter, per-agent profiles)
- [x] Git substrate (auto-commit, branches, undo, snapshots)
- [x] Search (BM25 + recency/importance ranking, optional embeddings)
- [x] MCP server + OpenCode plugin (auto-capture + auto-recall)
- [ ] Consolidation (auto-compress many small memories into an executive summary)
- [ ] Semantic search defaults, more embedders
- [ ] Benchmarks on real agent sessions

## Develop

```sh
npm install
npm test              # vitest — 32 tests
npm run build         # tsc
npm run benchmark     # recall@k on 100/1000-memory corpora
bash scripts/demo.sh  # watch it work
```

## License

MIT — © 2026 JoaquimLegal
