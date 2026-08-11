import { describe, expect, it } from "vitest";
import { parse, stringify } from "../src/frontmatter.js";

describe("frontmatter parse", () => {
  it("parses scalars, arrays and booleans", () => {
    const { data, body } = parse(`---
id: abc-123
importance: 0.7
tags: [alpha, "two words", 3]
active: true
---

# Hello

Some body.
`);
    expect(data.id).toBe("abc-123");
    expect(data.importance).toBe(0.7);
    expect(data.tags).toEqual(["alpha", "two words", 3]);
    expect(data.active).toBe(true);
    expect(body).toContain("# Hello");
  });

  it("parses block-style lists", () => {
    const { data } = parse(`---
tags:
  - alpha
  - beta
---
body`);
    expect(data.tags).toEqual(["alpha", "beta"]);
  });

  it("returns empty data and raw body when no frontmatter", () => {
    const { data, body } = parse("just text");
    expect(data).toEqual({});
    expect(body).toBe("just text");
  });
});

describe("frontmatter stringify", () => {
  it("round-trips through parse", () => {
    const input = {
      id: "x-1",
      importance: 0.7,
      tags: ["alpha", "beta"],
      note: "has: colon",
    };
    const text = stringify(input, "# Title\n\nbody");
    const { data, body } = parse(text);
    expect(data).toEqual(input);
    expect(body).toContain("# Title");
  });
});
