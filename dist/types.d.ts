export type MemoryType = "episodic" | "semantic" | "fact" | "preference";
export declare const MEMORY_TYPES: readonly MemoryType[];
export interface Memory {
    id: string;
    agent: string;
    type: MemoryType;
    importance: number;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    source: string;
    title: string;
    body: string;
}
