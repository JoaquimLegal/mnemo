export interface OpenCodeServerEntry {
    type: "local" | "remote";
    command?: string[];
    enabled?: boolean;
    url?: string;
    headers?: Record<string, string>;
}
export declare const MNEMO_MCP_SERVER: {
    readonly type: "local";
    readonly command: ["mm", "mcp"];
    readonly enabled: true;
};
export declare function mergeMCPConfig(existing: Record<string, unknown> | undefined, serverName?: string, entry?: OpenCodeServerEntry): Record<string, unknown>;
