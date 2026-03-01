# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands use `bun` as the runtime (not npm/node).

```bash
bun run dev-local      # Development server at http://localhost:3000 with live reload
bun run build          # Build for development (incremental, doesn't clean dist)
bun run build:prod     # Production build (cleans dist first)
```

There are no tests or linting configured.

## Architecture

This is a custom static site generator written in TypeScript, built and run entirely with Bun. There is no framework.

**Build pipeline** (`scripts/build.ts`):
1. Copies `src/static/` → `dist/static/` verbatim
2. Processes `src/pages/*.html` → `dist/pages/*.html` by wrapping each in `base.html` layout (page title is derived from filename)
3. Processes `src/content/blog/*.md` → `dist/content/blog/*.html` by parsing YAML frontmatter, converting Markdown to HTML, and wrapping in `post.html` then `base.html`
4. Generates `dist/content/blog.html` as a blog index listing all posts sorted by date

**Templating** is a simple `{{ variable }}` replacement — no loops, no conditionals in templates. Logic lives in the build script.

**Dev server** (`scripts/dev.ts`): Bun HTTP server on port 3000, routes `/` → `dist/pages/index.html`. Uses chokidar to watch `src/` and trigger rebuilds; sends live-reload signals to connected browsers via WebSocket (the `src/partials/live-reload.html` partial injects the client-side WebSocket listener, included only in dev builds).

**Layouts/Partials**: `src/layouts/base.html` is the outer shell (injected into every page via `{{ header }}`, `{{ footer }}`, `{{ content }}`, `{{ liveReload }}`). `src/layouts/post.html` and `src/layouts/blog-index.html` are inner layouts composed into `base.html`.

**Deployment**: Vercel. `vercel.json` rewrites `/` → `/pages/index.html`. The `dist/` directory is the deployment artifact.

## Adding Content

- **New page**: add an HTML file to `src/pages/` — the filename becomes the page title (hyphens → spaces, title-cased)
- **New blog post**: add a `.md` file to `src/content/blog/` with YAML frontmatter containing `title` and `date`
- **Static assets**: place in `src/static/` and reference as `/static/...` in HTML
