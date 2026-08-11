import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../src/store.js";

let dir: string;
let store: MemoryStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "mnemo-git-"));
  store = new MemoryStore(path.join(dir, ".mnemo"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("git integration", () => {
  it("auto-commits every write with an audit message", async () => {
    const m = await store.write({ title: "decision A" });
    const log = await store.log();
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain("mem: add");
    expect(log[0].message).toContain(m.id);
  });

  it("auto-commits deletions", async () => {
    const m = await store.write({ title: "temp" });
    await store.delete(m.id);
    const log = await store.log();
    expect(log[0].message).toContain("mem: rm");
  });

  it("undo reverts only the last change", async () => {
    const a = await store.write({ title: "keep me" });
    const b = await store.write({ title: "remove me" });
    expect(await store.read(a.id)).not.toBeNull();
    expect(await store.read(b.id)).not.toBeNull();

    expect(await store.undo()).toBe(true);

    expect(await store.read(a.id)).not.toBeNull();
    expect(await store.read(b.id)).toBeNull();
  });

  it("undo is a no-op when there is only one commit", async () => {
    await store.write({ title: "only one" });
    expect(await store.undo()).toBe(false);
  });

  it("branches give isolated timelines once they diverge", async () => {
    await store.write({ title: "on main" });
    await store.newAgent("experiment");
    expect(await store.currentBranch()).toBe("experiment");
    expect(await store.list()).toHaveLength(1);
    expect((await store.list())[0].title).toBe("on main");

    await store.write({ title: "on experiment" });
    await store.switchAgent("main");
    expect(await store.list()).toHaveLength(1);
    expect((await store.list())[0].title).toBe("on main");

    await store.switchAgent("experiment");
    expect(await store.list()).toHaveLength(2);
  });

  it("snapshots are listed as tags", async () => {
    await store.write({ title: "shipped" });
    await store.snapshot("v1");
    const tags = await store.tags();
    expect(tags).toContain("v1");
  });
});
