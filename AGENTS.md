# AGENTS.md

Instructions for AI coding agents working in this repository.

## Commands

All commands use `bun` as the runtime (not npm/node).

```bash
bun run dev            # Dev server at http://localhost:3000 with live reload
bun run build          # Incremental build (used by dev watcher; doesn't clean dist)
bun run build:prod     # Production build (cleans dist first) — what Vercel runs
bun run images         # Optimize all images in src/static/images/ (also runs on commit + build)
bun run spell          # Spell-check configured content files
```

There are no tests or linting configured.

## Architecture

This is a custom static site generator written in TypeScript, built and run entirely with Bun. There is no framework.

**Build pipeline** (`scripts/build.ts`):
1. Copies `src/static/` → `dist/static/` (skips `.DS_Store`). Images under `static/images/` are optimized via `scripts/optimize-images.ts` (sharp) on the way to `dist/`.
2. Processes `src/pages/*.html` → `dist/pages/*.html` by wrapping each in `base.html` layout. Page title is derived from filename (`about.html` → `About — George Anagnostou`); homepage (`index.html`) gets `George Anagnostou`. An optional `<!-- description: ... -->` HTML comment on the first line sets the meta description (stripped from rendered output).
3. Processes `src/content/blog/*.md` → `dist/content/blog/*.html` by parsing YAML frontmatter (`title`, `date`, optional `updated`, optional `description`), converting Markdown to HTML, and wrapping in `post.html` then `base.html`. Frontmatter strings injected into HTML are escaped in `scripts/build.ts`.
4. Generates `dist/pages/writing.html` as the blog index, sorted by published `date` (newest first). List rows match the homepage writing teaser: ISO date, description, title.

**Templating** is a simple `{{ variable }}` replacement — no loops, no conditionals in templates. Logic lives in the build script.

**Dev server** (`scripts/dev.ts`): Bun HTTP server on port 3000. Extension-free paths resolve to `/pages/{path}.html` (mirrors Vercel rewrites). Uses chokidar to watch `src/` and trigger rebuilds; sends live-reload signals via WebSocket (injected only in dev builds via `src/partials/live-reload.html`).

**Layouts/Partials**: `src/layouts/base.html` is the outer shell. `src/layouts/post.html` and `src/layouts/blog-index.html` are inner layouts composed into `base.html`. Partials: `src/partials/header.html`, `src/partials/footer.html` (minimal shrimp spacer), `src/partials/live-reload.html`.

**Deployment**: Vercel. `vercel.json` has rewrite rules for all clean URLs (`/about` → `/pages/about.html`, etc.). The `dist/` directory is the deployment artifact.

**Navigation**: The homepage (`index.html`) is a README-shaped index — short intro, Experience / Projects / Writing sections, prose explore links (`index-explore`), and five recent posts injected at build time via `{{ indexWritingHtml }}`. The site header is **not rendered** on the homepage (no breadcrumb bar). Inner pages show filesystem-style breadcrumbs in accent blue: `George Anagnostou ~/experience`, `George Anagnostou ~/writing/genesis` (blog posts nest under `writing/`). Breadcrumbs are rendered per page in `scripts/build.ts`.

**Site pages** (all rewrites in `vercel.json`):

| Route | Source | Role |
|---|---|---|
| `/` | `src/pages/index.html` | README-shaped homepage; JSON-LD `Person` block |
| `/about` | `src/pages/about.html` | Personal essay; `#now` links to `/now`; `#contact` footer |
| `/experience` | `src/pages/experience.html` | Full timeline (professional, university, education) + resume PDF |
| `/projects` | `src/pages/projects.html` | Side projects (card grid + featured Countries) |
| `/writing` | generated `writing.html` | Blog index |
| `/now` | `src/pages/now.html` | Current focus (nownownow-style) |
| `/content/blog/*.html` | `src/content/blog/*.md` | Individual posts (no clean URL rewrite yet) |

There is no `/uses` or `/contact` route — that content lives on `/about` or was dropped.

## Adding Content

- **New page**: add an HTML file to `src/pages/` — the filename becomes the page title. Add a corresponding rewrite rule to `vercel.json`; the generic route resolver in `scripts/dev.ts` handles it locally.
- **New blog post**: add a `.md` file to `src/content/blog/` with YAML frontmatter:
  ```yaml
  ---
  title: Post Title
  date: YYYY-MM-DD
  updated: YYYY-MM-DD   # optional; shown on post page only when after date
  description: One-line teaser for lists, SEO, and social sharing.
  ---
  ```
  Dates display as `yyyy-mm-dd`. Lists sort and show published `date` only.
- **Static assets**: place in `src/static/` and reference as `/static/...` in HTML
- **Content placeholders**: see `CONTENT_TODO.md` for pending fill-ins

## Images

**Storage:** `src/static/images/` — drop originals here; the build pipeline resizes them automatically.

**Optimization** (`scripts/optimize-images.ts`, via [sharp](https://sharp.pixelplumbing.com/)):
- Runs on every `bun run build` / `bun run build:prod` when copying to `dist/static/images/`
- Runs on staged images in the pre-commit hook (rewrites `src/` in place, then re-stages)
- Run manually: `bun run images`

Classification is automatic from aspect ratio and file type:
- **Portrait** (height ≥ width, JPEG/WebP): 480px max longest edge
- **Landscape** (width > height, JPEG/WebP): 720px max width
- **Screenshot** (PNG): 720px max width, stays PNG

After adding or replacing an image, set `width` and `height` on the `<img>` to match the dimensions logged by the optimizer (or read with `sips -g pixelWidth -g pixelHeight` on macOS).

**HTML pattern** — always set `width` and `height` to the file's pixel dimensions (prevents layout shift). Use `decoding="async"`; add `loading="lazy"` below the fold.

```html
<figure class="media media--portrait">
  <img src="/static/images/headshot.jpeg" alt="…" width="453" height="480" decoding="async" />
  <figcaption>Optional caption</figcaption>
</figure>
```

**Modifiers** (see `src/static/css/components/media.css`):
- `media--portrait` — headshots, narrow max-width
- `media--landscape` — wide photos, full column width
- `media--screenshot` — project demos
- `media--placeholder` — empty slot until an image exists

Blog post images: wrap in `<figure class="media">` in Markdown HTML or use standard `![]()` and style via `article img` if needed later.

## CSS

Styles are modular under `src/static/css/`. `style.css` is the entry point — it `@import`s everything else. Do not add rules directly to `style.css`.

```
src/static/css/
  style.css              # import hub only
  tokens.css             # design tokens (:root variables)
  base.css               # reset, typography, layout utilities
  components/            # reusable UI (header, footer, media, cards, blog)
  pages/                 # page-specific (home, experience, about, now-uses, projects)
```

When adding a new component, create `components/name.css` and add an `@import` to `style.css`.

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
| Content fill-ins (now, about, experience) | `content/` | Branch → PR → merge |
| New blog post | `post/` | Branch → PR → merge |
| AGENTS.md / docs | `docs/` | Branch → PR → merge |

## Spell Checking

[cspell](https://cspell.org/) is configured in `.cspell.json` and checks `src/**/*.md`, `src/**/*.html`, `AGENTS.md`, and `CONTENT_TODO.md`.

```bash
bun run spell           # manual run across all configured files
bun run spell <file>    # check a specific file
```

A pre-commit hook in `hooks/pre-commit` runs cspell on staged `.md` and `.html` files and optimizes staged images under `src/static/images/`.

**One-time setup** (run once per clone):
```bash
git config core.hooksPath hooks
```

To add a word to the allowlist, edit the `words` array in `.cspell.json`.