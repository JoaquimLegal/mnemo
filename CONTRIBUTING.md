# Contributing

Thanks for wanting to make `mnemo` better! Every PR counts.

## Dev setup

```sh
git clone https://github.com/JoaquimLegal/mnemo
cd mnemo
npm install
npm run build
```

## Rules of the road

- **Keep it zero-dep.** Runtime dependencies are a hard constraint: the core
  store, git layer, search, and CLI must stay dependency-free (only the MCP SDK
  is allowed). If you add a dependency, justify it in the PR.
- **Everything is pure & testable.** Tool logic lives in `src/tools.ts` as
  functions over `MemoryStore`. Add a test in `tests/` for every new behavior.
- **Green first, then push.** `npm test` (32 tests) and `npm run build` must
  pass before you open the PR.
- **Docs travel with code.** If you change search ranking, git behavior, or the
  MCP surface, update the matching file in `docs/`.
- **Format:** 2-space indent, no semicolon style debates, English comments (or
  none — comments are rare by design).

## Reproduce the demo

The GIF in the README is generated, never hand-edited:

```sh
# needs: vhs (github.com/charmbracelet/vhs) + ttyd
vhs -o demo.gif scripts/demo.tape
```

## Ideas welcome

Open an issue for bugs or ideas before a big PR. Good starting points:
auto-compaction of many small memories, more embedders, real-session benchmarks.
