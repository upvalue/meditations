# tekne

tekne is an web application under development.

Currently, it's only a frontend.

# Architecture

It's written in React, bundled with Vite and uses Tanstack Router as the
router.

It uses pnpm as the package manager (do not use normal npm).

# Editor

Its primary interface is an editor, based on TipTap. This editor lives in the
`src/editor` folder.

The editor's goal is to be an outline editor: Everything should be part of a Line;
Lines can contain other Lines (which are rendered as nested lines).

# Tests

After running, run

> pnpm run check

To ensure there are no type errors and that tests run properly.
