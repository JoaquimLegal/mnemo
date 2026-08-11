# Persistent memory (mnemo)

This project uses `mnemo`, a git-native persistent memory. Your memory is stored
in `.mnemo/` and survives across sessions.

Rules you must follow:

1. **Before starting significant work**, call the `recall` tool with a short
   query describing the task. Previous sessions may have already made decisions
   or learned facts you need.
2. **Before making a decision that could be revisited**, call `recall` to check
   whether an earlier session already settled it. Do not re-litigate decisions
   recorded in memory.
3. **After establishing a durable fact, decision, or user preference**, call the
   `remember` tool to persist it (title, concise body, tags, importance 0-1).
   Keep memories short and self-contained.
4. Use `search_memories` when you need structured results, and `forget` to
   remove stale or wrong memories.
5. When you notice a decision being repeated across sessions, `remember` it so
   future sessions start from that knowledge.
