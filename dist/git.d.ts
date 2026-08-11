export interface GitConfig {
    userName?: string;
    userEmail?: string;
}
export interface GitLogEntry {
    hash: string;
    date: string;
    message: string;
}
export declare class GitBackend {
    readonly cwd: string;
    private readonly cfg;
    constructor(cwd: string, cfg?: GitConfig);
    private run;
    private identityArgs;
    isRepo(): Promise<boolean>;
    init(): Promise<void>;
    hasChanges(): Promise<boolean>;
    commit(message: string): Promise<string>;
    commitIfChanged(message: string): Promise<string | null>;
    log(limit?: number): Promise<GitLogEntry[]>;
    commitCount(): Promise<number>;
    branches(): Promise<string[]>;
    currentBranch(): Promise<string>;
    switchBranch(name: string): Promise<void>;
    newBranch(name: string): Promise<void>;
    tag(name: string): Promise<void>;
    tags(): Promise<string[]>;
    revert(commit: string): Promise<void>;
    diffStat(ref?: string): Promise<string>;
}
