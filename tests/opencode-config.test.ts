import { describe, it, expect } from "vitest";
import { mergeMCPConfig, MNEMO_MCP_SERVER } from "../src/opencode-config.js";

describe("mergeMCPConfig", () => {
  it("produces a config that matches the current OpenCode MCP schema", () => {
    const cfg = mergeMCPConfig(undefined);
    expect(cfg.mnemo).toEqual({
      type: "local",
      command: ["mm", "mcp"],
      enabled: true,
    });
  });

  it("uses an array command and the required enabled flag", () => {
    expect(Array.isArray(MNEMO_MCP_SERVER.command)).toBe(true);
    expect(MNEMO_MCP_SERVER.enabled).toBe(true);
    expect(MNEMO_MCP_SERVER.type).toBe("local");
  });

  it("merges without clobbering existing servers", () => {
    const existing = {
      github: { type: "remote", url: "https://example.com", enabled: true },
    };
    const cfg = mergeMCPConfig(existing);
    expect(cfg.github).toEqual(existing.github);
    expect(cfg.mnemo).toBeDefined();
  });
});
