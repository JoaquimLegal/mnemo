import type { MemoryStore } from "./store.js";
import type { MemoryType } from "./types.js";
export interface RememberInput {
    title: string;
    body?: string;
    tags?: string[];
    importance?: number;
    type?: MemoryType;
    agent?: string;
}
export interface RecallInput {
    query: string;
    agent?: string;
    limit?: number;
    minImportance?: number;
    tags?: string[];
}
export interface ForgetInput {
    id: string;
    agent?: string;
}
export declare function remember(store: MemoryStore, input: RememberInput): Promise<string>;
export declare function recall(store: MemoryStore, input: RecallInput): Promise<string>;
export declare function searchMemories(store: MemoryStore, input: RecallInput): Promise<unknown[]>;
export declare function forget(store: MemoryStore, input: ForgetInput): Promise<string>;
export declare function listMemories(store: MemoryStore, input: {
    agent?: string;
    tags?: string[];
}): Promise<string>;
export declare function status(store: MemoryStore): Promise<string>;
