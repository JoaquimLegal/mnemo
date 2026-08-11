import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MemoryStore } from "./store.js";
export declare function createServer(store: MemoryStore): McpServer;
export declare function runServer(): Promise<void>;
