import type { Memory } from "./types.js";
import { type SearchOptions, type SearchResult } from "./search.js";
type EmbedFn = (text: string) => Promise<number[]>;
export declare function getEmbedder(): Promise<EmbedFn>;
export declare function semanticSearch(memories: Memory[], query: string, opts?: SearchOptions): Promise<SearchResult[]>;
export {};
