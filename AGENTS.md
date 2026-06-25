# AGENTS.md

Instructions for AI coding agents working in this repository.

## Commands

All commands use `bun` as the runtime (not npm/node).

```bash
bun run dev-local      # Development server at http://localhost:3000 with live reload
bun run build          # Build for development (incremental, doesn't clean dist)
bun run build:prod     # Production build (cleans dist first)
bun run spell          # Spell-check configured content files
```

There are no tests or linting configured.

## Architecture

This is a custom static site generator written in TypeScript, built and run entirely with Bun. There is no framework.

**Build pipeline** (`scripts/build.ts`):
1. Copies `src/static/` → `dist/static/` verbatim
2. Processes `src/pages/*.html` → `dist/pages/*.html` by wrapping each in `base.html` layout. Page title is derived from filename (`about.html` → `About — George Anagnostou`); homepage (`index.html`) gets `George Anagnostou`. An optional `<!-- description: ... -->` HTML comment on the first line sets the meta description (stripped from rendered output).
3. Processes `src/content/blog/*.md` → `dist/content/blog/*.html` by parsing YAML frontmatter (`title`, `date`, optional `category` and `description`), converting Markdown to HTML, and wrapping in `post.html` then `base.html`
4. Generates `dist/pages/writing.html` as the blog index, sorted by date. Filter buttons are derived dynamically from the categories present in posts — no hardcoded list.

**Templating** is a simple `{{ variable }}` replacement — no loops, no conditionals in templates. Logic lives in the build script.

**Dev server** (`scripts/dev.ts`): Bun HTTP server on port 3000. Extension-free paths resolve to `/pages/{path}.html` (mirrors Vercel rewrites). Uses chokidar to watch `src/` and trigger rebuilds; sends live-reload signals via WebSocket (injected only in dev builds via `src/partials/live-reload.html`).

**Layouts/Partials**: `src/layouts/base.html` is the outer shell. `src/layouts/post.html` and `src/layouts/blog-index.html` are inner layouts composed into `base.html`. Partials: `src/partials/header.html`, `src/partials/footer.html`, `src/partials/live-reload.html`.

**Deployment**: Vercel. `vercel.json` has rewrite rules for all clean URLs (`/about` → `/pages/about.html`, etc.). The `dist/` directory is the deployment artifact.

## Adding Content

- **New page**: add an HTML file to `src/pages/` — the filename becomes the page title. Add a corresponding rewrite rule to `vercel.json`; the generic route resolver in `scripts/dev.ts` handles it locally.
- **New blog post**: add a `.md` file to `src/content/blog/` with YAML frontmatter:
  ```yaml
  ---
  title: Post Title
  date: YYYY-MM-DD
  category: finance   # free-form; creates a filter button automatically
  description: Optional meta description for SEO and social sharing.
  ---
  ```
- **Static assets**: place in `src/static/` and reference as `/static/...` in HTML
- **Content placeholders**: see `CONTENT_TODO.md` for pending fill-ins

## Git Workflow

### Guiding principle

`master` is production — merges to `master` deploy to the live site. **Never commit or merge directly to `master`.** All changes go through a feature branch and a pull request.

### Branch naming conventions

| Prefix | Use for | Examples |
|---|---|---|
| `feat/` | New features or pages | `feat/add-dark-mode`, `feat/add-contact-form` |
| `fix/` | Bug fixes | `fix/mobile-nav-overflow`, `fix/broken-og-tags` |
| `content/` | Copy updates, placeholder fill-ins, page edits | `content/fill-uses-page`, `content/update-now-march` |
| `post/` | New blog posts | `post/sv-reflection`, `post/countries-writeup` |
| `chore/` | Maintenance with no user-visible change | `chore/update-dependencies`, `chore/clean-dist` |
| `docs/` | Changes to AGENTS.md, README, specs | `docs/update-architecture-notes` |
| `refactor/` | Code restructuring without behavior change | `refactor/split-build-script` |

### Standard workflow

```bash
git checkout master && git pull
git checkout -b content/update-now
# ... make changes ...
git add <files>
git commit -m "content: update now page for June 2026"
git push -u origin content/update-now
# open a PR on GitHub: content/update-now → master
# review, then merge via the PR (do not merge locally into master)
git branch -d content/update-now   # after PR is merged
```

### Commit message format

```
<type>: <short description>

Optional longer body if the change needs explanation.
```

Types mirror branch prefixes: `feat`, `fix`, `content`, `post`, `chore`, `docs`, `refactor`.
Keep the subject line under 72 characters. Use the imperative mood ("add x", not "added x").

### What goes where

| Change | Branch type | Merge strategy |
|---|---|---|
| Site code (CSS, build script, layouts) | `feat/` or `fix/` | Branch → PR → merge |
| New page | `feat/` | Branch → PR → merge |
| Content fill-ins (uses, now, about) | `content/` | Branch → PR → merge |
| New blog post | `post/` | Branch → PR → merge |
| AGENTS.md / docs | `docs/` | Branch → PR → merge |

## Spell Checking

[cspell](https://cspell.org/) is configured in `.cspell.json` and checks `src/**/*.md`, `src/**/*.html`, `AGENTS.md`, and `CONTENT_TODO.md`.

```bash
bun run spell           # manual run across all configured files
bun run spell <file>    # check a specific file
```

A pre-commit hook in `hooks/pre-commit` runs cspell automatically on staged `.md` and `.html` files.

**One-time setup** (run once per clone):
```bash
git config core.hooksPath hooks
```

To add a word to the allowlist, edit the `words` array in `.cspell.json`.