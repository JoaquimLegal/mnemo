export const MNEMO_MCP_SERVER = {
    type: "local",
    command: ["mm", "mcp"],
    enabled: true,
};
export function mergeMCPConfig(existing, serverName = "mnemo", entry = MNEMO_MCP_SERVER) {
    return {
        ...(existing ?? {}),
        [serverName]: entry,
    };
}
