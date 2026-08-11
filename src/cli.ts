#!/usr/bin/env node
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { MemoryStore, DEFAULT_ROOT } from "./store.js";
import { MEMORY_TYPES } from "./types.js";
import { mergeMCPConfig } from "./opencode-config.js";

function usage(): void {
  console.log(`mnemo - git-native memory for AI agents

Usage:
  mm init                          create a memory store in .mnemo/
  mm new "<title>" [options]       create a memory
  mm ls [options]                  list memories (newest first)
  mm search "<query>" [options]    rank memories by relevance
  mm cat <id> [--agent <name>]     show a memory
  mm rm <id> [--agent <name>]      delete a memory

Git (every mutation is auto-committed):
  mm log [--limit N]               audit trail of what the agent knew, and when
  mm undo                          revert the last memory change
  mm revert <commit>               revert a specific commit
  mm snapshot <tag>                tag a moment as a named snapshot
  mm tags                          list snapshots
  mm branches                      list memory timelines
  mm branch <name>                 create + switch to a new timeline
  mm switch <name>                 switch timeline

Integrations:
  mm mcp                           run the MCP server (stdio)
  mm setup-opencode                install the OpenCode plugin + MCP config

Options:
  --agent <name>       agent/profile (default: main)
  --body <text>        body text
  --type <type>        ${MEMORY_TYPES.join(" | ")}
  --importance <0-1>   how important this is (default: 0.5)
  --tags <a,b,c>       comma separated tags
  --help               show this help
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? "help";

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    usage();
    return;
  }

  if (cmd === "--version" || cmd === "-v") {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { name?: string; version?: string };
    console.log(`${pkg.name ?? "mnemo"} ${pkg.version ?? "0.0.0"}`);
    return;
  }

  const store = new MemoryStore(DEFAULT_ROOT);

  switch (cmd) {
    case "init": {
      await store.init();
      console.log(`created ${DEFAULT_ROOT}/`);
      return;
    }
    case "new": {
      const { positionals, values } = parseArgs({
        args: argv.slice(1),
        allowPositionals: true,
        options: {
          body: { type: "string" },
          agent: { type: "string" },
          type: { type: "string" },
          importance: { type: "string" },
          tags: { type: "string" },
          source: { type: "string" },
          json: { type: "boolean" },
        },
      });
      const title = positionals[0];
      if (!title) {
        console.error("usage: mm new \"<title>\" [options]");
        process.exit(1);
      }
      const memory = await store.write({
        title,
        body: values.body,
        agent: values.agent,
        type: values.type as never,
        importance: values.importance ? Number(values.importance) : undefined,
        tags: values.tags?.split(",").map((t) => t.trim()).filter(Boolean),
        source: values.source,
      });
      if (values.json) {
        console.log(JSON.stringify(memory, null, 2));
      } else {
        console.log(`wrote ${memory.agent}/${memory.id}`);
      }
      return;
    }
    case "ls": {
      const { values } = parseArgs({
        args: argv.slice(1),
        options: {
          agent: { type: "string" },
          tags: { type: "string" },
          limit: { type: "string" },
          json: { type: "boolean" },
        },
      });
      const wanted = values.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
      const limit = values.limit ? Number(values.limit) : undefined;
      let memories = (await store.list(values.agent)).filter(
        (m) => wanted.length === 0 || wanted.every((t) => m.tags.includes(t)),
      );
      if (limit) memories = memories.slice(0, limit);
      if (values.json) {
        console.log(JSON.stringify(memories, null, 2));
      } else {
        for (const m of memories) {
          console.log(`${m.id}  ${m.importance.toFixed(2)}  [${m.agent}]  ${m.title}`);
        }
        if (memories.length === 0) console.log("(no memories)");
      }
      return;
    }
    case "search": {
      const { positionals, values } = parseArgs({
        args: argv.slice(1),
        allowPositionals: true,
        options: {
          agent: { type: "string" },
          limit: { type: "string" },
          tags: { type: "string" },
          "min-importance": { type: "string" },
          semantic: { type: "boolean" },
          json: { type: "boolean" },
        },
      });
      const query = positionals.join(" ");
      if (!query) {
        console.error('usage: mm search "<query>" [options]');
        process.exit(1);
      }
      const agent = values.agent;
      const tags = values.tags?.split(",").map((t) => t.trim()).filter(Boolean);
      const minImportance = values["min-importance"] ? Number(values["min-importance"]) : undefined;
      const limit = values.limit ? Number(values.limit) : 10;
      let results;
      if (values.semantic) {
        const { semanticSearch } = await import("./semantic.js");
        results = await semanticSearch(await store.list(agent), query, {
          limit,
          tags,
          minImportance,
          agent,
        });
      } else {
        results = await store.search(query, { limit, tags, minImportance, agent });
      }
      if (values.json) {
        console.log(
          JSON.stringify(
            results.map((r) => ({ ...r.memory, score: r.score })),
            null,
            2,
          ),
        );
        return;
      }
      for (const r of results) {
        const { memory } = r;
        console.log(
          `${memory.id}  ${r.score.toFixed(3)}  [${memory.agent}]  ${memory.title}`,
        );
      }
      if (results.length === 0) console.log("(no matches)");
      return;
    }
    case "cat": {
      const { positionals, values } = parseArgs({
        args: argv.slice(1),
        allowPositionals: true,
        options: { agent: { type: "string" } },
      });
      const id = positionals[0];
      if (!id) {
        console.error("usage: mm cat <id> [--agent <name>]");
        process.exit(1);
      }
      const memory = await store.read(id, values.agent ?? "main");
      if (!memory) {
        console.error(`no memory ${id}`);
        process.exit(1);
      }
      console.log(memory.body);
      return;
    }
    case "rm": {
      const { positionals, values } = parseArgs({
        args: argv.slice(1),
        allowPositionals: true,
        options: { agent: { type: "string" } },
      });
      const id = positionals[0];
      if (!id) {
        console.error("usage: mm rm <id> [--agent <name>]");
        process.exit(1);
      }
      const ok = await store.delete(id, values.agent ?? "main");
      console.log(ok ? `removed ${id}` : `no memory ${id}`);
      return;
    }
    case "log": {
      const { values } = parseArgs({ args: argv.slice(1), options: { limit: { type: "string" } } });
      const entries = await store.log(values.limit ? Number(values.limit) : 30);
      for (const e of entries) console.log(`${e.hash}  ${e.date}  ${e.message}`);
      if (entries.length === 0) console.log("(no commits yet)");
      return;
    }
    case "undo": {
      const ok = await store.undo();
      console.log(ok ? "reverted last change" : "nothing to undo");
      return;
    }
    case "revert": {
      const { positionals } = parseArgs({ args: argv.slice(1), allowPositionals: true });
      const commit = positionals[0];
      if (!commit) {
        console.error("usage: mm revert <commit>");
        process.exit(1);
      }
      await store.revert(commit);
      console.log(`reverted ${commit}`);
      return;
    }
    case "snapshot": {
      const { positionals } = parseArgs({ args: argv.slice(1), allowPositionals: true });
      const tag = positionals[0];
      if (!tag) {
        console.error("usage: mm snapshot <tag>");
        process.exit(1);
      }
      await store.snapshot(tag);
      console.log(`snapshot ${tag}`);
      return;
    }
    case "tags": {
      const tags = await store.tags();
      for (const t of tags) console.log(t);
      if (tags.length === 0) console.log("(no snapshots)");
      return;
    }
    case "branches": {
      const branches = await store.branches();
      const current = await store.currentBranch();
      for (const b of branches) console.log(`${b === current ? "*" : " "} ${b}`);
      if (branches.length === 0) console.log("(no branches)");
      return;
    }
    case "branch": {
      const { positionals } = parseArgs({ args: argv.slice(1), allowPositionals: true });
      const name = positionals[0];
      if (!name) {
        console.error("usage: mm branch <name>");
        process.exit(1);
      }
      await store.newAgent(name);
      console.log(`switched to new timeline ${name}`);
      return;
    }
    case "switch": {
      const { positionals } = parseArgs({ args: argv.slice(1), allowPositionals: true });
      const name = positionals[0];
      if (!name) {
        console.error("usage: mm switch <name>");
        process.exit(1);
      }
      await store.switchAgent(name);
      console.log(`switched to timeline ${name}`);
      return;
    }
    case "mcp": {
      const { runServer } = await import("./server.js");
      await runServer();
      return;
    }
    case "setup-opencode": {
      await setupOpenCode();
      return;
    }
    default:
      console.error(`unknown command: ${cmd}`);
      usage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function setupOpenCode(): Promise<void> {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const pluginSource = path.join(root, "opencode-plugin.js");
  const pluginExists = await fs
    .stat(pluginSource)
    .then(() => true)
    .catch(() => false);
  if (!pluginExists) {
    console.error(
      `plugin not found at ${pluginSource} — run "npm run build" first or reinstall mnemo`,
    );
    process.exit(1);
  }

  const pluginDir = path.join(process.cwd(), ".opencode", "plugins");
  await fs.mkdir(pluginDir, { recursive: true });
  await fs.copyFile(pluginSource, path.join(pluginDir, "mnemo.js"));
  console.log(`installed plugin → ${path.join(pluginDir, "mnemo.js")}`);

  const configPath = path.join(process.cwd(), "opencode.json");
  let config: { mcp?: Record<string, unknown> } = {};
  try {
    config = JSON.parse(await fs.readFile(configPath, "utf8"));
  } catch {
    /* new file */
  }
  config.mcp = mergeMCPConfig(config.mcp);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`configured MCP → ${configPath}`);

  await new MemoryStore(DEFAULT_ROOT).init();
  const memoriesDir = path.join(process.cwd(), ".mnemo");
  console.log(`memory store ready → ${memoriesDir}`);
  console.log("restart OpenCode for the plugin and MCP server to load");
}
