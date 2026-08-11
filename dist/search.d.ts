import type { Memory } from "./types.js";
export interface SearchOptions {
    agent?: string;
    limit?: number;
    tags?: string[];
    minImportance?: number;
    recencyHalfLifeDays?: number;
    weights?: {
        relevance: number;
        recency: number;
        importance: number;
    };
}
export interface SearchResult {
    memory: Memory;
    score: number;
    relevance: number;
    recency: number;
}
export declare const DEFAULT_WEIGHTS: {
    relevance: number;
    recency: number;
    importance: number;
};
export declare function tokenize(text: string): string[];
export declare function docText(memory: Memory): string;
export declare function bm25Scores(memories: Memory[], query: string): Map<string, number>;
export declare function search(memories: Memory[], query: string, opts?: SearchOptions): SearchResult[];
