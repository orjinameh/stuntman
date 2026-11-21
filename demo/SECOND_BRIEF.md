# Notes: product brief

A tiny notes app, one Node.js file, no dependencies, in-memory state.

- `/` lists notes and has a form to add one (field `text`).
- Each note has a "Delete" button that removes it from the list.
- `GET /notes` shows the list as a table; `POST /admin/reset` restores one seed note; `GET /health`.
- Port from `PORT`, default 3100.
