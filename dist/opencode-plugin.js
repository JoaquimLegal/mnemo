const CAPTURE_PROMPT = `You are mnemo, a memory curator for AI agents.
Read the transcript below and extract what a future session must NOT re-learn or re-decide.
Return JSON matching this exact schema:
- title: short title (max 10 words)
- summary: 2-5 concise bullet sentences about what was decided, done, or learned
- tags: 1-4 short lowercase tags
- importance: 0-1 number (how valuable this is to remember later)
- type: one of "episodic", "semantic", "fact", "preference"
Do not include obvious or transient details.`;
const SCHEMA = {
    type: "object",
    properties: {
        title: { type: "string" },
        summary: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        importance: { type: "number" },
        type: { type: "string", enum: ["episodic", "semantic", "fact", "preference"] },
    },
    required: ["title", "summary", "tags", "importance", "type"],
};
const busy = new Set();
export const MnemoPlugin = async ({ client, $ }) => {
    return {
        event: async ({ event }) => {
            if (event.type === "session.idle") {
                await captureSession(client, $, event).catch(() => undefined);
            }
            else if (event.type === "session.created") {
                await seedSession(client, $, event).catch(() => undefined);
            }
        },
    };
};
export default MnemoPlugin;
async function captureSession(client, $, event) {
    if (event.type !== "session.idle")
        return;
    const sessionID = event.properties.sessionID;
    if (busy.has(sessionID))
        return;
    busy.add(sessionID);
    try {
        const out = await client.session.messages({ path: { id: sessionID }, query: { limit: 100 } });
        const messages = extract(out) ?? [];
        const transcript = messages
            .map((m) => `## ${m.info.role ?? "?"}\n${textOf(m.parts)}`)
            .filter((s) => s.trim().length > 3)
            .join("\n\n");
        const tail = transcript.slice(-24_000);
        if (!tail.trim())
            return;
        const structured = await summarize(client, tail);
        if (structured?.title) {
            await runMnemo($, [
                "new",
                structured.title,
                "--body",
                structured.summary ?? "",
                "--tags",
                (structured.tags ?? []).join(","),
                "--importance",
                String(structured.importance ?? 0.5),
                "--type",
                structured.type ?? "semantic",
                "--source",
                `session:${sessionID}`,
                "--json",
            ]);
            return;
        }
        const last = messages.at(-1);
        const snippet = last ? textOf(last.parts).trim() : "";
        if (snippet) {
            await runMnemo($, [
                "new",
                `Session ${sessionID.slice(0, 6)}`,
                "--body",
                snippet.slice(0, 2000),
                "--tags",
                "session",
                "--importance",
                "0.4",
                "--type",
                "episodic",
                "--source",
                `session:${sessionID}`,
                "--json",
            ]);
        }
    }
    finally {
        busy.delete(sessionID);
    }
}
async function seedSession(client, $, event) {
    if (event.type !== "session.created")
        return;
    const sessionID = event.properties.info.id;
    const highlights = await recentHighlights($);
    const text = `## mnemo (persistent memory)\n` +
        `You have persistent memory tools available: remember, recall, search_memories, forget, memory_status.\n` +
        `Before starting significant work or repeating an earlier decision, call recall to load what previous sessions learned.\n` +
        (highlights ? `\nRecent highlights:\n${highlights}` : "");
    await client.session
        .prompt({
        path: { id: sessionID },
        body: {
            noReply: true,
            parts: [{ type: "text", text }],
        },
    })
        .catch(() => undefined);
}
async function summarize(client, transcript) {
    let sid = "";
    try {
        const created = await client.session.create({ body: { title: "mnemo: memory" } });
        sid = created.id ?? created.data?.id ?? "";
        if (!sid)
            return null;
        busy.add(sid);
        // 1) Try structured output (OpenCode forces tool_choice: "required" here,
        //    which thinking/reasoning models reject). Fall back to plain JSON.
        const structured = await promptSummary(client, sid, transcript, true);
        if (structured?.title)
            return structured;
        // 2) Retry without `format` so thinking models (DeepSeek V4, Kimi K2, ...)
        //    can answer: ask for raw JSON and extract it ourselves.
        const plain = await promptSummary(client, sid, transcript, false);
        if (plain?.title)
            return plain;
        return null;
    }
    catch {
        return null;
    }
    finally {
        if (sid) {
            busy.delete(sid);
            await client.session.delete({ path: { id: sid } }).catch(() => undefined);
        }
    }
}
async function promptSummary(client, sid, transcript, structured) {
    const body = {
        parts: [{ type: "text", text: `${CAPTURE_PROMPT}\n\n<session>\n${transcript}\n</session>` }],
    };
    if (structured) {
        body.format = { type: "json_schema", schema: SCHEMA };
    }
    else {
        body.parts[0].text += `\n\nRespond with ONLY a single valid JSON object matching the schema above. Do not wrap it in prose or markdown.`;
    }
    try {
        const result = await client.session.prompt({
            path: { id: sid },
            body: body,
        });
        const payload = result.data ?? result;
        const info = payload.info;
        let parsed = info?.structured_output ?? null;
        if (!parsed) {
            const text = textOf(payload.parts ?? []);
            parsed = extractJson(text);
        }
        return parsed && typeof parsed.title === "string" ? parsed : null;
    }
    catch {
        return null;
    }
}
async function recentHighlights($) {
    try {
        const out = await $ `mm ls --json --limit 3`.quiet().nothrow();
        const parsed = JSON.parse(out.stdout.toString());
        if (!Array.isArray(parsed))
            return "";
        return parsed.map((m) => `- ${m.title ?? "?"} (${m.id ?? ""})`).join("\n");
    }
    catch {
        return "";
    }
}
async function runMnemo($, args) {
    await $ `mm ${args}`.quiet().nothrow();
}
function extract(value) {
    if (value === undefined || value === null)
        return null;
    const v = value;
    return v.data ?? value;
}
function textOf(parts) {
    return parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n");
}
function extractJson(text) {
    const fenced = text.match(/```json\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1] : text.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate)
        return null;
    try {
        return JSON.parse(candidate);
    }
    catch {
        return null;
    }
}
