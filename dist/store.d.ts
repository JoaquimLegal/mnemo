import { GitBackend, type GitConfig, type GitLogEntry } from "./git.js";
import { type SearchOptions, type SearchResult } from "./search.js";
import { type Memory, type MemoryType } from "./types.js";
export declare const DEFAULT_ROOT = ".mnemo";
export declare const H1_RE: RegExp;
export interface NewMemoryInput {
    title: string;
    body?: string;
    agent?: string;
    type?: MemoryType;
    importance?: number;
    tags?: string[];
    source?: string;
    createdAt?: string;
}
export interface MemoryStoreOptions {
    git?: boolean;
    gitConfig?: GitConfig;
}
export declare class MemoryStore {
    readonly root: string;
    readonly git: GitBackend | null;
    private readonly withGit;
    constructor(root?: string, options?: MemoryStoreOptions);
    get memoriesDir(): string;
    init(): Promise<void>;
    write(input: NewMemoryInput): Promise<Memory>;
    read(id: string, agent?: string): Promise<Memory | null>;
    list(agent?: string): Promise<Memory[]>;
    agents(): Promise<string[]>;
    delete(id: string, agent?: string): Promise<boolean>;
    log(limit?: number): Promise<GitLogEntry[]>;
    undo(): Promise<boolean>;
    branches(): Promise<string[]>;
    currentBranch(): Promise<string>;
    switchAgent(name: string): Promise<void>;
    newAgent(name: string): Promise<void>;
    snapshot(tag: string): Promise<void>;
    tags(): Promise<string[]>;
    revert(commit: string): Promise<void>;
    search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
    pathFor(id: string, agent?: string): string;
}
export declare function generateId(iso: string, seed: string): string;
