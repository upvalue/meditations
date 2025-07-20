# tekne

Tekne is a freestyle productivity application structured as an outline editor
(like Logseq) which allows users to tag chunks of text, record structured data
(such as time spent on a task) and search or navigate through that data easily.

# Architecture

It's written in React, bundled with Vite and uses Tanstack Router as the
router. It uses Jotai for state management. It uses TRPC to communicate with the
backend.

It uses pnpm as the package manager (do not use normal npm).

# Editor

Its primary interface is an editor written on top of Codemirror, and the code
for this editor lives in `src/editor`. Data is structured as a document which
contains multiple lines.

The synchronization between Codemirror (which has its own DOM rendering and
management system) and React is custom:

- lines can update the overall editor state, which lives in Jotai
- changes to the overall editor state are synchronized to Codemirror by glue code which destroys and recreates Codemirror when the line changes externally
- any changes on the individual line content change React state via a codemirror extension (but do not destroy and recreate the editor)

# Tests

After running, run

> pnpm run check

To ensure there are no type errors and that tests run properly.
