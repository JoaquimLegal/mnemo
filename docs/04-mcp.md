# The MCP server and the OpenCode plugin

`mnemo` talks to agents in two ways.

## 1. MCP server (`mm mcp`)

Model Context Protocol over stdio. Works with any MCP client: Claude Code,
Cursor, Codex, OpenCode, etc.

| Tool | What it does |
|------|--------------|
| `remember` | persist a memory (title, body, tags, importance, type) |
| `recall` | rank relevant memories as readable text |
| `search_memories` | structured JSON results for the same query |
| `forget` | delete a memory by id |
| `list_memories` | list newest first, optional tag filter |
| `memory_status` | current branch + memory count |

The tool callbacks live in `src/tools.ts` as pure functions taking a
`MemoryStore` — which is why they are unit-tested without spinning an MCP
client.

## 2. OpenCode plugin (`mm setup-opencode`)

The plugin makes memory **automatic**, not optional. Two hooks:

### Auto-capture (`session.idle`)

When a session finishes, the plugin:

1. reads the session transcript via `client.session.messages`;
2. creates an ephemeral session and asks it (via `session.prompt` with a
   `json_schema` format) to extract `{title, summary, tags, importance, type}`;
3. writes the result with `mm new --json ...`;
4. deletes the ephemeral session, guarding against event recursion with a
   `busy` set.

If summarization fails, it falls back to storing the last exchange as an
episodic memory. The agent never has to remember to remember.

### Auto-recall (`session.created`)

At the start of every session the plugin injects a context message: "you have
memory tools; call `recall` before significant work" plus the three most recent
memory titles. Combined with the `prompts/AGENTS.md` rules, this is what turns
the second session into one that *starts* with yesterday's context.

## Why MCP plus a plugin?

The MCP server is the universal surface (works everywhere). The plugin is the
"actually functional in daily life" surface (automatic capture and seeding,
zero friction). The CLI is the human surface — because you should be able to
read, audit, and edit what your agent remembers.
