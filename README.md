# georgeanagnostou.com

Personal site — custom static site generator built with [Bun](https://bun.sh).

## Commands

```bash
bun install
bun run dev          # dev server at http://localhost:3000 (live reload)
bun run build:prod   # production build → dist/
bun run spell        # spell-check content
bun run test         # publishing and rebuild regression tests
bun run typecheck    # TypeScript checks
```

See [AGENTS.md](./AGENTS.md) for architecture, content conventions, and git workflow.

Post frontmatter requires a permanent `slug`; changing the title preserves its URL. Builds validate content and routes and replace `dist/` only after success. During development, failed builds keep the last working site visible and show an error notice.
