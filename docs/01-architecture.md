# Architecture

`mnemo` is deliberately small. One idea, a handful of modules, zero runtime
dependencies outside the MCP SDK.

## The core idea

> **An agent's memory is a folder of Markdown files, versioned by git.**

Everything else is tooling around that idea:

- each memory is one Markdown file with YAML-ish frontmatter (id, agent, type,
  importance, tags, timestamps, source) and an H1 title + body;
- the store root (`.mnemo/`) **is a git repository**, so every change is an
  audit event with a hash, timestamp, and message;
- `git` gives us, for free: history, diff review, branching (alternative
  timelines), tags (named snapshots), and rollback (`revert`).

## Modules

```
src/
  frontmatter.ts    parse/serialize the metadata header of each memory file
  types.ts          Memory shape and MemoryType union
  store.ts          MemoryStore: read/write/list/delete + git plumbing glue
  git.ts            GitBackend: thin wrapper over the git CLI (transparent)
  search.ts         BM25 scoring + hybrid rank (relevance · recency · importance)
  semantic.ts       optional embeddings via @huggingface/transformers
  tools.ts          pure tool logic shared by the MCP server and tests
  server.ts         MCP server (stdio), exposes the tools over Model Context Protocol
  opencode-plugin.ts OpenCode plugin: auto-capture on session end + recall seed
  cli.ts            the `mm` binary: humans drive the same store from a terminal
```

## Why the git CLI instead of a git library?

A library is a black box. Shelling out to `git` means every operation is
readable by anyone who knows git — which is the audience — and it keeps the
dependency surface to zero. The transparency is part of the pitch: `git log`
in `.mnemo` IS the memory audit trail.

## Lifecycle of a memory

1. an agent calls `remember` (or a human runs `mm new`);
2. `MemoryStore.write` renders the file, writes it atomically (`<file>.tmp` +
   `rename`), then runs `git add -A && git commit -m "mem: add <id> - <title>"`;
3. search finds it later via BM25 + recency/importance rank;
4. `undo`/`revert` removes it as a new commit, preserving the trail.
