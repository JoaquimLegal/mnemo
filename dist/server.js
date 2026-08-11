import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MemoryStore, DEFAULT_ROOT } from "./store.js";
import { forget, listMemories, recall, remember, searchMemories, status, } from "./tools.js";
export function createServer(store) {
    const server = new McpServer({ name: "mnemo", version: "0.1.0" });
    server.registerTool("remember", {
        title: "remember",
        description: "Persist a memory so future sessions of this agent can recall it. Use after a decision, a preference, or a fact is established.",
        inputSchema: {
            title: z.string().describe("short title"),
            body: z.string().optional().describe("details"),
            tags: z.array(z.string()).optional(),
            importance: z.number().min(0).max(1).optional(),
            type: z
                .enum(["episodic", "semantic", "fact", "preference"])
                .optional(),
            agent: z.string().optional(),
        },
    }, async (args) => ({
        content: [{ type: "text", text: await remember(store, args) }],
    }));
    server.registerTool("recall", {
        title: "recall",
        description: "Search persisted memories relevant to the given question. Call this at the start of a task or before making a decision.",
        inputSchema: {
            query: z.string().describe("what to look for"),
            agent: z.string().optional(),
            limit: z.number().int().min(1).max(20).optional(),
            minImportance: z.number().min(0).max(1).optional(),
        },
    }, async (args) => ({
        content: [{ type: "text", text: await recall(store, args) }],
    }));
    server.registerTool("search_memories", {
        title: "search_memories",
        description: "Return structured JSON results for a memory search.",
        inputSchema: {
            query: z.string(),
            agent: z.string().optional(),
            limit: z.number().int().min(1).max(50).optional(),
            minImportance: z.number().min(0).max(1).optional(),
        },
    }, async (args) => ({
        content: [
            {
                type: "text",
                text: JSON.stringify(await searchMemories(store, args), null, 2),
            },
        ],
    }));
    server.registerTool("forget", {
        title: "forget",
        description: "Delete a memory by id.",
        inputSchema: {
            id: z.string(),
            agent: z.string().optional(),
        },
    }, async (args) => ({
        content: [{ type: "text", text: await forget(store, args) }],
    }));
    server.registerTool("list_memories", {
        title: "list_memories",
        description: "List persisted memories, newest first.",
        inputSchema: {
            agent: z.string().optional(),
            tags: z.array(z.string()).optional(),
        },
    }, async (args) => ({
        content: [{ type: "text", text: await listMemories(store, args) }],
    }));
    server.registerTool("memory_status", {
        title: "memory_status",
        description: "Show current branch and memory count.",
        inputSchema: {},
    }, async () => ({
        content: [{ type: "text", text: await status(store) }],
    }));
    return server;
}
export async function runServer() {
    const store = new MemoryStore(DEFAULT_ROOT);
    const server = createServer(store);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
    runServer().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
