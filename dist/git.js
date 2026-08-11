import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import * as path from "node:path";
const execFileP = promisify(execFile);
const DEFAULT_USER = { name: "mnemo", email: "mnemo@local" };
export class GitBackend {
    cwd;
    cfg;
    constructor(cwd, cfg = {}) {
        this.cwd = cwd;
        this.cfg = { ...DEFAULT_USER, ...cfg };
    }
    async run(args) {
        try {
            const { stdout } = await execFileP("git", args, { cwd: this.cwd });
            return stdout.trim();
        }
        catch (err) {
            const e = err;
            const detail = (e.stderr ?? e.message ?? "").toString().trim();
            throw new Error(`git ${args[0]}: ${detail}`);
        }
    }
    identityArgs() {
        return [
            "-c",
            `user.name=${this.cfg.userName}`,
            "-c",
            `user.email=${this.cfg.userEmail}`,
        ];
    }
    async isRepo() {
        try {
            await fs.stat(path.join(this.cwd, ".git"));
            return true;
        }
        catch {
            return false;
        }
    }
    async init() {
        await fs.mkdir(this.cwd, { recursive: true });
        if (!(await this.isRepo())) {
            await this.run(["init", "-b", "main"]);
        }
    }
    async hasChanges() {
        const status = await this.run(["status", "--porcelain"]);
        return status.length > 0;
    }
    async commit(message) {
        await this.run(["add", "-A"]);
        const hash = await this.run([...this.identityArgs(), "commit", "-m", message, "--quiet"]);
        return hash;
    }
    async commitIfChanged(message) {
        if (!(await this.hasChanges()))
            return null;
        return this.commit(message);
    }
    async log(limit = 30) {
        const out = await this.run([
            "log",
            "--pretty=format:%h|%ad|%s",
            "--date=iso-strict",
            "-n",
            String(limit),
        ]);
        if (!out)
            return [];
        return out.split("\n").map((line) => {
            const [hash, date, ...rest] = line.split("|");
            return { hash, date, message: rest.join("|") };
        });
    }
    async commitCount() {
        try {
            const out = await this.run(["rev-list", "--count", "HEAD"]);
            return Number(out) || 0;
        }
        catch {
            return 0;
        }
    }
    async branches() {
        const out = await this.run(["branch", "--list", "--format=%(refname:short)"]);
        return out ? out.split("\n") : [];
    }
    async currentBranch() {
        return this.run(["branch", "--show-current"]);
    }
    async switchBranch(name) {
        await this.run(["switch", name]);
    }
    async newBranch(name) {
        await this.run(["switch", "-c", name]);
    }
    async tag(name) {
        await this.run([...this.identityArgs(), "tag", "-a", name, "-m", `snapshot ${name}`]);
    }
    async tags() {
        const out = await this.run(["tag", "--list"]);
        return out ? out.split("\n") : [];
    }
    async revert(commit) {
        await this.run([...this.identityArgs(), "revert", "--no-edit", commit]);
    }
    async diffStat(ref = "HEAD") {
        return this.run(["diff", ref, "--stat"]);
    }
}
