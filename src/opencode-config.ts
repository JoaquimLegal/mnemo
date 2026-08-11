export interface OpenCodeServerEntry {
  type: "local" | "remote";
  command?: string[];
  enabled?: boolean;
  url?: string;
  headers?: Record<string, string>;
}

export const MNEMO_MCP_SERVER = {
  type: "local",
  command: ["mm", "mcp"],
  enabled: true,
} as const satisfies OpenCodeServerEntry;

export function mergeMCPConfig(
  existing: Record<string, unknown> | undefined,
  serverName = "mnemo",
  entry: OpenCodeServerEntry = MNEMO_MCP_SERVER,
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    [serverName]: entry,
  };
}
