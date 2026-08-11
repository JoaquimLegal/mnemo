# The git substrate

The most unusual choice in `mnemo` is using git as the memory engine. Here is
why it works.

## Auditability (the 2026 requirement)

The AI community is converging on a hard requirement: **memory must be
reproducible and auditable.** You must be able to answer "what did the agent
know, and when?". Git answers natively:

```
$ mm log
4e246fa  2026-08-11T19:19:09-03:00  mem: add 20260811-221909-4659 - User prefers tabs
0564b4e  2026-08-11T19:19:09-03:00  mem: add 20260811-221936-2d37 - We chose Postgres
```

## Branching = alternative realities

Different agents, or different experiments, get different timelines. Because
each agent's memories live in `memories/<agent>/`, you can run several agents
on one branch; when you want to fork the whole memory, you branch.

```
mm branch experiment     # git switch -c experiment
mm switch main           # git switch main
```

## Snapshots and rollback

- `mm snapshot v1` → annotated git tag.
- `mm undo` → `git revert HEAD` (keeps history; does not destroy anything).
- `mm revert <commit>` → revert any specific change.

## Identity

Commits are authored as `mnemo <mnemo@local>` via `-c user.name/user.email`,
so the store never touches your global git config.

## Implementation note

`GitBackend` (src/git.ts) is ~150 lines wrapping the `git` CLI with
`child_process.execFile`. Every method is one command:
`init`, `status --porcelain`, `add -A`, `commit`, `log --pretty=format:`,
`switch`, `switch -c`, `tag`, `revert`. Nothing clever — by design.
