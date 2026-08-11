import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const execFileP = promisify(execFile);

export interface GitConfig {
  userName?: string;
  userEmail?: string;
}

export interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
}

const DEFAULT_USER = { name: "mnemo", email: "mnemo@local" };

export class GitBackend {
  readonly cwd: string;
  private readonly cfg: GitConfig;

  constructor(cwd: string, cfg: GitConfig = {}) {
    this.cwd = cwd;
    this.cfg = { ...DEFAULT_USER, ...cfg };
  }

  private async run(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileP("git", args, { cwd: this.cwd });
      return stdout.trim();
    } catch (err) {
      const e = err as { stderr?: string; message?: string };
      const detail = (e.stderr ?? e.message ?? "").toString().trim();
      throw new Error(`git ${args[0]}: ${detail}`);
    }
  }

  private identityArgs(): string[] {
    return [
      "-c",
      `user.name=${this.cfg.userName}`,
      "-c",
      `user.email=${this.cfg.userEmail}`,
    ];
  }

  async isRepo(): Promise<boolean> {
    try {
      await fs.stat(path.join(this.cwd, ".git"));
      return true;
    } catch {
      return false;
    }
  }

  async init(): Promise<void> {
    await fs.mkdir(this.cwd, { recursive: true });
    if (!(await this.isRepo())) {
      await this.run(["init", "-b", "main"]);
    }
  }

  async hasChanges(): Promise<boolean> {
    const status = await this.run(["status", "--porcelain"]);
    return status.length > 0;
  }

  async commit(message: string): Promise<string> {
    await this.run(["add", "-A"]);
    const hash = await this.run([...this.identityArgs(), "commit", "-m", message, "--quiet"]);
    return hash;
  }

  async commitIfChanged(message: string): Promise<string | null> {
    if (!(await this.hasChanges())) return null;
    return this.commit(message);
  }

  async log(limit = 30): Promise<GitLogEntry[]> {
    const out = await this.run([
      "log",
      "--pretty=format:%h|%ad|%s",
      "--date=iso-strict",
      "-n",
      String(limit),
    ]);
    if (!out) return [];
    return out.split("\n").map((line) => {
      const [hash, date, ...rest] = line.split("|");
      return { hash, date, message: rest.join("|") };
    });
  }

  async commitCount(): Promise<number> {
    try {
      const out = await this.run(["rev-list", "--count", "HEAD"]);
      return Number(out) || 0;
    } catch {
      return 0;
    }
  }

  async branches(): Promise<string[]> {
    const out = await this.run(["branch", "--list", "--format=%(refname:short)"]);
    return out ? out.split("\n") : [];
  }

  async currentBranch(): Promise<string> {
    return this.run(["branch", "--show-current"]);
  }

  async switchBranch(name: string): Promise<void> {
    await this.run(["switch", name]);
  }

  async newBranch(name: string): Promise<void> {
    await this.run(["switch", "-c", name]);
  }

  async tag(name: string): Promise<void> {
    await this.run([...this.identityArgs(), "tag", "-a", name, "-m", `snapshot ${name}`]);
  }

  async tags(): Promise<string[]> {
    const out = await this.run(["tag", "--list"]);
    return out ? out.split("\n") : [];
  }

  async revert(commit: string): Promise<void> {
    await this.run([...this.identityArgs(), "revert", "--no-edit", commit]);
  }

  async diffStat(ref = "HEAD"): Promise<string> {
    return this.run(["diff", ref, "--stat"]);
  }
}
