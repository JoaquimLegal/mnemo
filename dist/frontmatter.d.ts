export interface Frontmatter {
    [key: string]: unknown;
}
export declare function parse(text: string): {
    data: Frontmatter;
    body: string;
};
export declare function stringify(data: Frontmatter, body?: string): string;
