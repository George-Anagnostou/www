# Site Rewrite Spec

Branch: `feat/site-rewrite`
Author: George Anagnostou
Status: **Draft — pre-implementation**

---

## Overview

Full redesign and content expansion of georgeanagnostou.com from a minimal 3-page
personal site into a branded public platform. Target audiences: prospective employers
and recruiters, business partners, and the general public.

Brand pillars: fun, vibrant, high-energy — finance professional who builds software,
grew up in Silicon Valley, serious and charming.

---

## Design System

Locked before any HTML/CSS work begins. All implementation phases draw from this spec.

### Color Palette

```css
/* Dark base */
--color-bg:              #0a0a0a;   /* page background */
--color-surface:         #111111;   /* cards, elevated surfaces */
--color-surface-raised:  #1a1a1a;   /* hovered/active surface states */
--color-border:          #2a2a2a;   /* standard borders */
--color-border-subtle:   #1f1f1f;   /* very subtle dividers */

/* Text */
--color-text:            #f0f0f0;   /* primary text */
--color-text-secondary:  #999999;   /* dates, labels, secondary copy */
--color-text-muted:      #555555;   /* placeholder, disabled */

/* Accent — amber/gold (SV sun + finance gold + energy) */
--color-accent:          #F59E0B;
--color-accent-hover:    #FBBF24;
--color-accent-dim:      rgba(245, 158, 11, 0.08);  /* subtle tinted bg */

/* Semantic */
--color-link:            #F59E0B;
--color-link-hover:      #FBBF24;
```

> **RESOLVED:** Amber (#F59E0B) confirmed.

### Typography

Replace Google Fonts import in `src/layouts/base.html`:

```html
<!-- Replace Vollkorn with: -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
```

```css
--font-sans:  "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-serif: "Lora", Georgia, serif;
--font-mono:  "Consolas", "Monaco", "Courier New", monospace;
```

Rules:
- Headlines (`h1`–`h3`) and all UI elements: `--font-sans`
- Blog post body text and long-form `<article>` content: `--font-serif`
- Code: `--font-mono`
- **Vollkorn is removed entirely**

### Spacing Scale

```css
--space-1:  0.25rem;   /*  4px */
--space-2:  0.5rem;    /*  8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-24: 6rem;      /* 96px */
```

### Layout Widths

```css
--max-width:       1100px;  /* standard page container */
--max-width-text:   680px;  /* blog post reading column */
```

### Components

**Buttons:**
```css
.btn              /* base: padding, border-radius, font-weight, transition */
.btn--primary     /* accent bg (#F59E0B), dark text, hover: accent-hover */
.btn--ghost       /* transparent bg, accent border + text, hover: accent-dim bg */
```

**Section Label:**
```css
.section-label    /* small caps or uppercase letter-spacing, accent color, used above
                     section headings as an eyebrow */
```

---

## Page Map

### Current → New

| Current URL | Current File | New URL | New File |
|---|---|---|---|
| `/` | `src/pages/index.html` | `/` | `src/pages/index.html` (rewrite) |
| `/pages/portfolio.html` | `src/pages/portfolio.html` | `/projects` | `src/pages/projects.html` (new file) |
| `/content/blog.html` | generated | `/writing` | generated (rename target) |
| — | — | `/about` | `src/pages/about.html` (new) |
| — | — | `/work` | `src/pages/work.html` (new) |
| — | — | `/now` | `src/pages/now.html` (new) |
| — | — | `/uses` | `src/pages/uses.html` (new) |
| — | — | `/contact` | `src/pages/contact.html` (new) |

`portfolio.html` is deleted after `projects.html` is created.

---

## Phase 1 — Design System & CSS Foundation

**Goal:** Establish the new visual identity in CSS only. No HTML changes yet.
All existing pages will look broken after this phase — that is expected.

### Task 1.1 — Rewrite `src/static/css/style.css`

Replace the entire file. No existing rules are preserved verbatim — some are
reimplemented with new values.

**Subtask 1.1.1 — CSS custom properties block**
Write the full `:root { }` block containing all color, font, spacing, and layout
variables defined in the Design System above.

**Subtask 1.1.2 — Global reset and base styles**
```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg); color: var(--color-text);
       font-family: var(--font-sans); font-size: 18px; line-height: 1.6;
       min-height: 100vh; display: flex; flex-direction: column; }
img { max-width: 100%; display: block; }
p { margin: 0 0 var(--space-4); }
```

**Subtask 1.1.3 — Typography scale**
All heading sizes, weights, and line-heights using `--font-sans`.
`h1`: 3rem / font-weight 800 / line-height 1.1
`h2`: 2rem / font-weight 700 / line-height 1.2
`h3`: 1.4rem / font-weight 600 / line-height 1.3
Mobile (`max-width: 640px`): h1 → 2.25rem, h2 → 1.6rem

**Subtask 1.1.4 — Link styles**
```css
a { color: var(--color-link); text-decoration: none; }
a:hover { color: var(--color-link-hover); text-decoration: underline; }
a:visited { color: var(--color-link); }
a:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
```

**Subtask 1.1.5 — `.container` utility**
```css
.container { max-width: var(--max-width); margin: 0 auto;
             padding: 0 var(--space-6); width: 100%; }
```
This replaces the inline `max-width: 800px` on `main` and `.site-header`.

**Subtask 1.1.6 — Button component styles**
`.btn`, `.btn--primary`, `.btn--ghost` as specified in Design System.

**Subtask 1.1.7 — Section label style**
```css
.section-label { display: block; font-size: 0.75rem; font-weight: 700;
                 letter-spacing: 0.12em; text-transform: uppercase;
                 color: var(--color-accent); margin-bottom: var(--space-3); }
```

**Subtask 1.1.8 — Article / blog post styles (dark-mode adapted)**
Reimport all article styles from current CSS but adapted to dark background:
- `article code` background: `#1e1e1e`, color: `#e8e8e8`
- `article pre` background: `#1e1e1e`, border: `1px solid var(--color-border)`
- Body text in `article` uses `--font-serif`

**Subtask 1.1.9 — Responsive breakpoints**
Define breakpoints as comments at top of file for consistency:
```
sm: 480px  |  md: 768px  |  lg: 1024px
```
Use `min-width` throughout (mobile-first).

---

## Phase 2 — Navigation & Layout Shell

**Goal:** Update the global header, footer, and base.html to use the new design.
All pages will have a working nav after this phase.

### Task 2.1 — Rewrite `src/layouts/base.html`

**Subtask 2.1.1 — Update `<head>`**
- Replace Vollkorn Google Fonts link with Inter + Lora import (see Design System)
- Add `<meta name="description" content="">` (empty for now, filled per-page in Phase 3+)
- Add Open Graph meta tags:
  ```html
  <meta property="og:title" content="{{ title }}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://georgeanagnostou.com{{ path }}" />
  <meta property="og:description" content="{{ description }}" />
  ```
  Note: `{{ path }}` and `{{ description }}` are new template variables — requires
  `scripts/build.ts` update (see Task 7.1).
- Favicon: add `<link rel="icon" ...>` once asset exists (placeholder for now)

**Subtask 2.1.2 — Update `<body>` structure**
Change `<main>` to not have a max-width itself — sections control their own widths
via `.container`. The full-bleed hero requires this.
```html
<body>
  {{ header }}
  <main>{{ content }}</main>
  <footer>{{ footer }}</footer>
  {{ liveReload }}
</body>
```
Remove the `max-width` and `padding` from `main` in CSS (it moves to `.container`).

### Task 2.2 — Rewrite `src/partials/header.html`

**Subtask 2.2.1 — New header structure**
```html
<header class="site-header">
  <div class="site-header__inner container">
    <a href="/" class="site-header__logo">George Anagnostou</a>
    <nav class="site-nav" aria-label="Main navigation">
      <ul class="site-nav__list">
        <li><a href="/about">About</a></li>
        <li><a href="/work">Work</a></li>
        <li><a href="/projects">Projects</a></li>
        <li><a href="/writing">Writing</a></li>
        <li><a href="/now">Now</a></li>
      </ul>
    </nav>
    <a href="/contact" class="btn btn--primary site-header__cta">Contact →</a>
    <button class="site-nav__toggle" aria-label="Open menu" aria-expanded="false">
      ☰
    </button>
  </div>
</header>
```

**Subtask 2.2.2 — Header CSS** (in `style.css`)
```css
.site-header { position: sticky; top: 0; z-index: 100;
               background: rgba(10,10,10,0.85); backdrop-filter: blur(12px);
               border-bottom: 1px solid var(--color-border); }
.site-header__inner { display: flex; align-items: center; gap: var(--space-6);
                       padding-top: var(--space-4); padding-bottom: var(--space-4); }
.site-header__logo { font-weight: 700; font-size: 1.1rem; color: var(--color-text);
                      flex-shrink: 0; }
.site-header__logo:hover { text-decoration: none; color: var(--color-accent); }
.site-nav { flex-grow: 1; }
.site-nav__list { list-style: none; margin: 0; padding: 0;
                   display: flex; gap: var(--space-6); }
.site-nav__list a { color: var(--color-text-secondary); font-size: 0.95rem;
                     font-weight: 500; transition: color 0.2s; }
.site-nav__list a:hover { color: var(--color-text); text-decoration: none; }
.site-header__cta { margin-left: auto; }
/* Mobile toggle — hidden on desktop */
.site-nav__toggle { display: none; }
```

**Subtask 2.2.3 — Mobile nav CSS**
At `max-width: 768px`:
- Hide `.site-nav` and `.site-header__cta` by default
- Show `.site-nav__toggle` (hamburger button)
- When `aria-expanded="true"` on toggle, show nav as dropdown below header
- Implement toggle with 10 lines of inline `<script>` at bottom of header partial
  (no framework — just `toggle.setAttribute('aria-expanded', ...)` and
  `nav.classList.toggle('is-open')`)

> **RESOLVED:** Pure CSS/HTML preferred over JS. Use `<details>/<summary>` pattern.
> General rule: always lean toward standard, semantic HTML over scripted solutions.

### Task 2.3 — Rewrite `src/partials/footer.html`

**Subtask 2.3.1 — New footer structure**
Three-column layout on desktop, stacked on mobile:
- Col 1: Name + one-line description
- Col 2: Page links (same as nav)
- Col 3: Social links (GitHub, LinkedIn) + email

**Subtask 2.3.2 — Footer CSS**
```css
footer { border-top: 1px solid var(--color-border); margin-top: var(--space-24);
         padding: var(--space-12) 0; }
.footer-inner { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-8); }
/* Mobile: single column */
@media (max-width: 768px) { .footer-inner { grid-template-columns: 1fr; } }
.footer-brand { font-size: 1rem; font-weight: 700; margin-bottom: var(--space-2); }
.footer-tagline { color: var(--color-text-secondary); font-size: 0.9rem; }
```

**Subtask 2.3.3 — Add email to footer**
Add `george@[domain]` plaintext email link to footer social section.
> **RESOLVED:** anagnostougeorgejohn@gmail.com

---

## Phase 3 — Homepage Rebuild

**Goal:** Rewrite `src/pages/index.html` from scratch.
The page currently has one `<div class="about-section">` with ~10 lines.
The new page has 6 sections.

### Task 3.1 — Hero Section

**Subtask 3.1.1 — HTML**
```html
<section class="hero">
  <div class="container hero__content">
    <p class="hero__eyebrow">San Francisco Bay Area</p>
    <h1 class="hero__headline">
      Finance background.<br>
      Builder's mind.<br>
      Both at once.
    </h1>
    <p class="hero__sub">
      I'm George — wealth management professional and software engineer.
      I build at the intersection of capital and code.
    </p>
    <div class="hero__actions">
      <a href="/work" class="btn btn--primary">See my work</a>
      <a href="/writing" class="btn btn--ghost">Read my writing</a>
    </div>
  </div>
</section>
```
> **RESOLVED:** "Finance background. Builder's mind. Both at once." confirmed.

**Subtask 3.1.2 — CSS**
```css
.hero { padding: var(--space-24) 0 var(--space-16); min-height: 60vh;
        display: flex; align-items: center; }
.hero__eyebrow { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.1em;
                  text-transform: uppercase; color: var(--color-accent);
                  margin-bottom: var(--space-4); }
.hero__headline { font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 800;
                   line-height: 1.05; margin-bottom: var(--space-6);
                   max-width: 700px; }
.hero__sub { font-size: 1.2rem; color: var(--color-text-secondary);
              max-width: 520px; margin-bottom: var(--space-8); line-height: 1.6; }
.hero__actions { display: flex; gap: var(--space-4); flex-wrap: wrap; }
```

### Task 3.2 — Identity Bar

**Subtask 3.2.1 — HTML**
```html
<section class="identity-bar">
  <div class="container">
    <dl class="identity-bar__grid">
      <div class="identity-stat">
        <dt class="identity-stat__number">N+</dt>
        <dd class="identity-stat__label">Years in Finance</dd>
      </div>
      <div class="identity-stat">
        <dt class="identity-stat__number">5</dt>
        <dd class="identity-stat__label">Projects Shipped</dd>
      </div>
      <div class="identity-stat">
        <dt class="identity-stat__number">4</dt>
        <dd class="identity-stat__label">Languages in Production</dd>
      </div>
      <div class="identity-stat">
        <dt class="identity-stat__number">Bay Area</dt>
        <dd class="identity-stat__label">Born & Raised</dd>
      </div>
    </dl>
  </div>
</section>
```
> **RESOLVED:** 4 years in finance. Client focus: VC funds, portfolio companies,
> founders, investors. No AUM/client count published. Fourth stat: "VC" as the
> client specialization signal ("VC-Focused" or "Venture Clients").

**Subtask 3.2.2 — CSS**
```css
.identity-bar { border-top: 1px solid var(--color-border);
                border-bottom: 1px solid var(--color-border);
                padding: var(--space-8) 0; }
.identity-bar__grid { display: grid; grid-template-columns: repeat(4, 1fr);
                       gap: var(--space-6); list-style: none; margin: 0; padding: 0; }
.identity-stat__number { font-size: 2rem; font-weight: 800; color: var(--color-accent);
                           display: block; margin: 0; }
.identity-stat__label { font-size: 0.8rem; color: var(--color-text-secondary);
                          text-transform: uppercase; letter-spacing: 0.08em;
                          margin: 0; }
@media (max-width: 640px) { .identity-bar__grid { grid-template-columns: repeat(2, 1fr); } }
```

### Task 3.3 — What I Do (Two Columns)

**Subtask 3.3.1 — HTML**
Two equal columns inside a `.container`. Left = Finance, Right = Engineering.
Each column has an `<h2>`, a short paragraph, and a `<ul>` of bullet skills.
Not a full skills matrix — just the highlight reel.

**Subtask 3.3.2 — CSS**
```css
.what-i-do { padding: var(--space-16) 0; }
.what-i-do__grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-12); }
.what-i-do__col h2 { font-size: 1.3rem; margin-bottom: var(--space-4);
                      color: var(--color-accent); }
.what-i-do__col ul { list-style: none; padding: 0; color: var(--color-text-secondary); }
.what-i-do__col li { padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-subtle); }
@media (max-width: 768px) { .what-i-do__grid { grid-template-columns: 1fr; } }
```

> **OPEN QUESTION (What I Do content):** Need the actual skill lists filled in.
> Finance side: portfolio construction, Bloomberg, client management, financial
> modeling, etc. — what are the most important to you? Engineering side: Go,
> TypeScript, Rust, Bun, SQL — what else?

### Task 3.4 — Featured Project

**Subtask 3.4.1 — HTML**
One project, full-width card with image, description, tech tags, and CTA links.
Countries (countries.georgeanagnostou.com) is the natural candidate — it's live
and has a screenshot. Or swap for a more finance-relevant project if one exists.

**Subtask 3.4.2 — CSS**
```css
.featured-project { padding: var(--space-12) 0; }
.featured-project__card { background: var(--color-surface);
                            border: 1px solid var(--color-border);
                            border-radius: 12px; overflow: hidden;
                            display: grid; grid-template-columns: 1fr 1fr;
                            gap: 0; }
.featured-project__image img { width: 100%; height: 100%; object-fit: cover; }
.featured-project__body { padding: var(--space-8); }
@media (max-width: 768px) { .featured-project__card { grid-template-columns: 1fr; } }
```

### Task 3.5 — Recent Writing

**Subtask 3.5.1 — HTML**
Static list of 2–3 posts with title and date. These are hardcoded for now.

> **RESOLVED:** Hardcoded for now. Add to roadmap: when post count grows, inject
> recent posts into homepage via build.ts at build time (same pattern as blog index).

**Subtask 3.5.2 — CSS**
Simple list. Post title in `--color-text`, date in `--color-text-secondary`.
Hover: title underline + color shifts to `--color-accent`.

### Task 3.6 — Currently Section

**Subtask 3.6.1 — HTML**
Three mini-sections: Building, Reading, Thinking about.
Filled with real content (see Phase 6).

**Subtask 3.6.2 — CSS**
```css
.currently { padding: var(--space-12) 0; }
.currently__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-6); }
.currently__label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
                     letter-spacing: 0.1em; color: var(--color-accent);
                     display: block; margin-bottom: var(--space-2); }
@media (max-width: 640px) { .currently__grid { grid-template-columns: 1fr; } }
```

---

## Phase 4 — New Pages

### Task 4.1 — `/about` (`src/pages/about.html`)

**Content structure (all content is placeholders until Phase 6):**

1. **Page hero** — `<h1>` + one punchy subhead, no image yet (add photo later)
2. **Origin** — paragraph on growing up in Silicon Valley. Name-drop the era,
   the culture, what you absorbed. This is the contextual foundation.
3. **Finance chapter** — how you got into wealth management, what you built,
   what you mastered.
4. **The technical turn** — when engineering became serious, not just a hobby.
   What changed.
5. **What I'm after** — direct, 2-3 sentences. What you're building toward
   professionally.
6. **Outside work** — short list or paragraph. Real interests, not LinkedIn
   buzzwords. Humanizes you.
7. **Photo** — a photo or two beyond the headshot. Placeholder `<figure>`
   with comment until asset is ready.
8. **Contact CTA** at the bottom — "Want to talk? → /contact"

**CSS:** No new component classes needed. Uses `.container`, standard typography,
and a new `.page-hero` section reused across all inner pages:
```css
.page-hero { padding: var(--space-12) 0 var(--space-8); }
.page-hero h1 { margin-bottom: var(--space-4); }
.page-hero .lead { font-size: 1.2rem; color: var(--color-text-secondary);
                    max-width: 600px; }
```

> **RESOLVED:** More photos exist but use placeholder `<figure>` elements for now.
> Replace with real assets in a follow-up pass.

### Task 4.2 — `/work` (`src/pages/work.html`)

This is the recruiter/employer page. Must be thorough and quantified.

**Content structure:**

1. **Page hero** — `<h1>Work</h1>` + 1-line subhead: "Professional experience
   across finance and software."
2. **What I'm looking for** — 2–4 sentence direct statement. Roles at the
   intersection of finance and engineering. Openness to conversations.
3. **Experience timeline** — chronological, most recent first. For each role:
   - Company name, title, date range
   - 3–5 bullet achievements, with numbers where possible
   - Not a résumé dump — narrative voice
4. **Skills** — two sections:
   - Finance: listed as tags/pills
   - Engineering: listed as tags/pills, grouped by type (Languages, Tools,
     Concepts)
5. **Resume** — prominent CTA button linking to `/static/files/resume.pdf`
   (existing file)

**HTML structure for timeline:**
```html
<ol class="timeline">
  <li class="timeline__item">
    <div class="timeline__meta">
      <span class="timeline__company">Company Name</span>
      <span class="timeline__title">Job Title</span>
      <span class="timeline__dates">Month YYYY – Present</span>
    </div>
    <ul class="timeline__bullets">
      <li>Achievement with a number.</li>
    </ul>
  </li>
</ol>
```

**CSS:**
```css
.timeline { list-style: none; padding: 0; margin: 0;
             border-left: 2px solid var(--color-border); padding-left: var(--space-6); }
.timeline__item { position: relative; margin-bottom: var(--space-8); }
.timeline__item::before { content: ""; position: absolute; left: calc(-1 * var(--space-6) - 5px);
                            top: 6px; width: 10px; height: 10px; border-radius: 50%;
                            background: var(--color-accent); }
.timeline__company { font-weight: 700; display: block; margin-bottom: var(--space-1); }
.timeline__title { display: block; color: var(--color-text-secondary); font-size: 0.95rem; }
.timeline__dates { display: block; font-size: 0.8rem; color: var(--color-text-muted);
                    margin-top: var(--space-1); margin-bottom: var(--space-3); }
```

> **RESOLVED:** JP Morgan. Specialization in distributions in kind (DIK). Two
> engineering achievements to feature:
> (1) Built Python webapp to process distributions in kind.
> (2) Built form prefill tool now deployed division-wide.
> Availability signal and exact title/dates TBD in Phase 6 content drafting.

### Task 4.3 — `/projects` (`src/pages/projects.html`)

Replaces `portfolio.html`. The projects page gets more depth.

**Subtask 4.3.1 — Delete `src/pages/portfolio.html`**
Remove the file. All links to `/pages/portfolio.html` and `/portfolio` in
existing pages are updated to `/projects`.

**Subtask 4.3.2 — Create `src/pages/projects.html`**

**Content structure:**
1. **Page hero** — "Projects" + subhead
2. **Featured project** — one project with full expanded card (larger than grid,
   includes a case study: problem → approach → result). Countries is the candidate
   unless a finance project exists.
3. **All projects grid** — the rest as cards. Cards are updated from current design:
   dark background, accent borders on hover, same info (title, desc, tags, links)
4. **"What I'm building now"** — a single card or callout at the bottom linking
   to `/now`

**CSS for projects grid** (replaces old `.project-grid` / `.project-card`):
```css
.projects-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                  gap: var(--space-6); margin-top: var(--space-8); }
.project-card { background: var(--color-surface); border: 1px solid var(--color-border);
                border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;
                transition: border-color 0.2s, transform 0.2s; }
.project-card:hover { border-color: var(--color-accent); transform: translateY(-3px); }
/* All child elements: __image, __body, __tags, __links — same structure as current
   but restyled for dark theme. Tags: dark bg (#1a1a1a), accent text. */
```

**CSS for featured/case study card:**
```css
.project-featured { background: var(--color-surface); border: 1px solid var(--color-border);
                     border-radius: 12px; overflow: hidden; margin-bottom: var(--space-12); }
.project-featured__image img { width: 100%; max-height: 360px; object-fit: cover; }
.project-featured__body { padding: var(--space-8); }
.project-featured__case-study h3 { font-size: 0.8rem; text-transform: uppercase;
                                     letter-spacing: 0.1em; color: var(--color-accent); }
```

### Task 4.4 — `/now` (`src/pages/now.html`)

**Content structure:**
- `<h1>Now</h1>` + last-updated date (hardcoded string, update manually each time)
- Brief explanation of what a /now page is (one sentence, link to nownownow.com)
- **Building** — what you're working on
- **Reading** — current book(s), format: title by author
- **Learning** — current technical or professional focus
- **Thinking about** — an open question or idea occupying headspace
- **Listening to** — optional, music or podcasts

Content is personal and updated manually. No special build pipeline needed.

> **OPEN QUESTION (now content):** Provide your current answers for all 5 sections
> in Phase 6.

### Task 4.5 — `/uses` (`src/pages/uses.html`)

**Content structure:**
- `<h1>Uses</h1>` + one-line intro ("The tools I use daily.")
- **Hardware** — machine specs, monitor, peripherals
- **Development** — editor, terminal emulator, shell, key extensions/plugins
- **Finance tools** — Bloomberg, research tools, portfolio platforms
- **This site** — brief mention of the stack (Bun, TypeScript, custom SSG, Vercel)
- **Apps** — key productivity/workflow apps

Each section: `<h2>` heading + `<ul>` list. Items can be plain text or linked.

**CSS:** No new classes needed. Inherits base styles + `.container` + `.page-hero`.

### Task 4.6 — `/contact` (`src/pages/contact.html`)

**Content structure:**
- `<h1>Contact</h1>` + 2 sentences on who/what you want to hear from
- **Email** — plaintext address as an `<a href="mailto:...">` link. No form.
- **LinkedIn** — link, same as footer
- **GitHub** — link
- Optional: brief note on response time ("I respond within a few days.")

**CSS:** No new classes. Simple, minimal layout. The absence of a contact form
is intentional — low friction, direct.

---

## Phase 5 — Blog System Enhancements

### Task 5.1 — Add `category` frontmatter field

**Subtask 5.1.1 — Update `scripts/build.ts`**

Extend the `frontmatter` type and parse `category`:
```typescript
const frontmatter = yaml.load(frontmatterMatch[1]) as {
  title: string;
  date: Date;
  category?: string;  // new — optional, defaults to "general"
};
const category = frontmatter.category ?? "general";
```

Pass `category` to the post template render call:
```typescript
const renderedPostContent = renderLayout(postLayout, {
  title: frontmatter.title,
  date: frontmatter.date,
  dateString: frontmatter.date.toLocaleString("en-US", dateOptions),
  category,        // new
  content: htmlContent,
});
```

Pass `category` to the blog index post data:
```typescript
posts.push({ title, date, dateString, url, category });
```

And to the blog index list item template inside `build.ts`:
```typescript
`<li class="post-item" data-category="${post.category}">
   <span class="post-category">${post.category}</span>
   <span class="post-title"><a href="${post.url}">${post.title}</a></span>
   <span class="post-date"><small>${post.dateString}</small></span>
 </li>`
```

**Subtask 5.1.2 — Update `src/layouts/post.html`**

Add the category badge below the title:
```html
<h1 class="blog-post-title">{{ title }}</h1>
<div class="blog-post-meta">
  <span class="post-category post-category--badge">{{ category }}</span>
  <span class="blog-post-date">{{ dateString }}</span>
</div>
<hr />
<article>{{ content }}</article>
```

**Subtask 5.1.3 — Update `src/layouts/blog-index.html`**

Add a filter bar above the post list:
```html
<div class="blog-filters" id="blog-filters">
  <button class="filter-btn is-active" data-filter="all">All</button>
  <button class="filter-btn" data-filter="finance">Finance</button>
  <button class="filter-btn" data-filter="engineering">Engineering</button>
  <button class="filter-btn" data-filter="personal">Personal</button>
  <button class="filter-btn" data-filter="silicon-valley">Silicon Valley</button>
</div>
<ul class="post-list">
  {{ postListHtml }}
</ul>
<script>
  /* ~15 lines: filter .post-item by data-category on button click */
</script>
```

**Subtask 5.1.4 — CSS for blog index and post**

```css
.post-category { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
                  text-transform: uppercase; color: var(--color-accent); }
.post-category--badge { background: var(--color-accent-dim); color: var(--color-accent);
                          padding: 2px 8px; border-radius: 999px; }
.filter-btn { background: none; border: 1px solid var(--color-border); color: var(--color-text-secondary);
               padding: var(--space-2) var(--space-4); border-radius: 999px; cursor: pointer;
               font-size: 0.85rem; transition: all 0.15s; }
.filter-btn.is-active, .filter-btn:hover { border-color: var(--color-accent);
                                            color: var(--color-accent); }
```

**Subtask 5.1.5 — Update `src/content/blog/001.md` frontmatter**

Add `category: personal` to the existing Genesis post frontmatter.

### Task 5.2 — Rename `/content/blog.html` → `/writing`

The blog index currently lives at `/content/blog.html`. The nav links to `/writing`.
This requires changes in two places:

**Subtask 5.2.1 — Update `scripts/build.ts`**

Change the output path for the blog index from:
```typescript
path.join(DIST_DIR, "content/blog.html")
```
to:
```typescript
path.join(DIST_DIR, "pages/writing.html")
```
This means the blog index becomes a regular page at `dist/pages/writing.html`.

**Subtask 5.2.2 — Update `vercel.json`** (see Phase 7)

Add `/writing` → `/pages/writing.html` rewrite.

**Subtask 5.2.3 — Update `scripts/dev.ts`** (see Phase 7)

Add route: `/writing` → `/pages/writing.html`.

**Subtask 5.2.4 — Update any hardcoded `/content/blog.html` links**

Grep for `content/blog` across all `src/` files and update to `/writing`.
Currently in `src/pages/index.html`. Will also appear in new homepage HTML.

---

## Phase 6 — Content

> This phase is all writing, no code. Work through each page and write the real
> copy. Placeholder comments in the HTML make it clear what needs to go where.

### Task 6.1 — About Page Copy
- Origin / Silicon Valley paragraph
- Finance chapter paragraph(s)
- The technical turn paragraph
- What I'm after (2–3 sentences)
- Outside work list (3–5 real things)
- Decide on and provide second photo asset (or confirm headshot only for now)

### Task 6.2 — Work Page Copy
- "What I'm looking for" statement
- Full employment history: companies, titles, dates, bullet achievements
- Finance skills list
- Engineering skills list
- Confirm resume PDF is current (`src/static/files/resume.pdf`)

### Task 6.3 — Now Page Copy
- Building: ___
- Reading: ___
- Learning: ___
- Thinking about: ___
- Listening to: ___ (optional)

### Task 6.4 — Uses Page Copy
- Hardware specs
- Dev setup (editor, terminal, shell, key tools/extensions)
- Finance tools
- Apps

### Task 6.5 — Contact Page Copy
- 2-sentence intro
- Public email address
- Confirm LinkedIn URL: `https://www.linkedin.com/in/george-anagnostou-2478ba341/`

### Task 6.6 — Homepage Copy
- Finalize hero headline (see open question in Task 3.1)
- Fill in stats for identity bar (Task 3.2)
- Write the two-column skill lists (Task 3.3)
- Choose featured project and write its case study snippet (Task 3.4)
- Fill in "Currently" section (Task 3.6)
- Select 2–3 posts for Recent Writing (Task 3.5) — can reuse genesis + new posts

### Task 6.7 — New Blog Posts
Suggested first batch (write 2–3 before launch):
- One post on the finance × tech intersection — your personal perspective
- One post on a project: what you built, why, what you learned
- One post on Silicon Valley — growing up there, what it means to you

### Task 6.8 — Update `src/content/blog/001.md` category
Add `category: personal` to frontmatter (code change is in Task 5.1.5,
this task is the editorial decision).

---

## Phase 7 — Build System & Infrastructure

### Task 7.1 — Extend `scripts/build.ts` for new template variables

**Subtask 7.1.1 — Add `description` and `path` variables to page rendering**

For pages in `src/pages/`, the build currently only passes:
`{ title, content, header, footer, liveReload }`

Extend to also pass `description` and `path`. Since per-page meta descriptions
require per-page authorship, use a simple convention: each page file may contain
an HTML comment `<!-- description: My page description here -->` on its first line.
The build script strips and parses this comment, then passes the value.

```typescript
const descriptionMatch = pageContent.match(/<!--\s*description:\s*(.+?)\s*-->/);
const description = descriptionMatch ? descriptionMatch[1] : "George Anagnostou";
const pagePath = "/" + path.parse(file).name;  // e.g. /about, /work
```

**Subtask 7.1.2 — Apply same to blog posts**

Blog posts already have frontmatter. Add optional `description` field to frontmatter.
Fall back to the first 160 characters of the rendered text content if not provided.

### Task 7.2 — Update `vercel.json` routing

Add clean URL rewrites for all new pages:
```json
{
  "rewrites": [
    { "source": "/",          "destination": "/pages/index.html" },
    { "source": "/about",     "destination": "/pages/about.html" },
    { "source": "/work",      "destination": "/pages/work.html" },
    { "source": "/projects",  "destination": "/pages/projects.html" },
    { "source": "/writing",   "destination": "/pages/writing.html" },
    { "source": "/now",       "destination": "/pages/now.html" },
    { "source": "/uses",      "destination": "/pages/uses.html" },
    { "source": "/contact",   "destination": "/pages/contact.html" }
  ]
}
```
Note: individual blog post URLs (`/content/blog/slug.html`) are not affected —
those are direct file paths and work without rewrites.

> **RESOLVED:** Punted to a future task. Blog posts stay at `/content/blog/slug.html`
> for this rewrite.

### Task 7.3 — Update `scripts/dev.ts` routing

Add a generic route resolver so all clean URLs work in local dev:
```typescript
if (filePath === "/") {
  filePath = "/pages/index.html";
} else if (!filePath.includes(".")) {
  // /about → /pages/about.html, /writing → /pages/writing.html, etc.
  filePath = `/pages${filePath}.html`;
}
```
This replaces the current single-line root redirect with a two-branch pattern
that handles all clean URL pages generically.

### Task 7.4 — SEO and social meta

**Subtask 7.4.1 — Favicon**
Create/source a favicon. Simplest option: a monogram "GA" or just the letter "G"
in amber on a dark background.
> **RESOLVED:** Create a "GA" amber monogram as an SVG favicon.
> Place at `src/static/favicon.svg`.

**Subtask 7.4.2 — Verify Open Graph tags render correctly in build**
After Task 7.1.1 is implemented, test with a social sharing preview tool that
`og:title` and `og:description` appear correctly.

---

## Phase 8 — Polish & Launch Prep

### Task 8.1 — Accessibility audit

- All images have `alt` text
- All interactive elements are keyboard-reachable
- Color contrast: verify amber (#F59E0B) on dark (#0a0a0a) meets WCAG AA for normal
  text (requires contrast ≥ 4.5:1). Amber on near-black passes — verify.
- Skip navigation link: `<a href="#main-content" class="skip-nav">Skip to content</a>`
  hidden until focused

### Task 8.2 — Performance

- Images: convert `headshot.jpeg` to WebP if possible. Add `loading="lazy"` to
  project card images. Add `width` and `height` attributes to prevent layout shift.
- Fonts: `display=swap` is already in the Google Fonts URL (keep it).
- Verify build output HTML is not bloated.

### Task 8.3 — Final review checklist

- [ ] All 7 pages render correctly in local dev
- [ ] All nav links work on mobile and desktop
- [ ] Dark theme renders correctly across Chrome, Firefox, Safari
- [ ] Resume PDF link opens correctly
- [ ] Social links (GitHub, LinkedIn) open in new tab
- [ ] Blog posts render with correct category badge
- [ ] Category filter buttons work on writing page
- [ ] All Open Graph meta tags populated
- [ ] Vercel preview deployment builds without errors
- [ ] Clean URLs work on Vercel (`/about`, `/work`, etc.)

---

## Open Questions Summary

All pre-implementation questions resolved. See inline RESOLVED notes above.

| # | Question | Resolution |
|---|---|---|
| 1 | Accent color | Amber #F59E0B |
| 2 | Hero headline | "Finance background. Builder's mind. Both at once." |
| 3 | Public email | anagnostougeorgejohn@gmail.com |
| 4 | Identity bar stats | 4 yrs finance, 5 projects, 4 languages, "VC-Focused" |
| 5 | Work page content | JP Morgan, DIK specialization, Python webapp, form prefill tool |
| 6 | Mobile nav approach | Pure CSS `<details>/<summary>` — no JS |
| 7 | About page photo | Placeholders for now, real photos in follow-up |
| 8 | Homepage recent writing | Hardcoded; future task to inject via build.ts |
| 9 | Blog post clean URLs | Punted to future task |
| 10 | Favicon | GA amber monogram SVG at `src/static/favicon.svg` |

---

## File Change Summary

### New files
```
src/pages/about.html
src/pages/work.html
src/pages/projects.html
src/pages/now.html
src/pages/uses.html
src/pages/contact.html
```

### Modified files
```
src/layouts/base.html           (head, OG tags, font import)
src/layouts/post.html           (category badge)
src/layouts/blog-index.html     (filter bar, category display)
src/partials/header.html        (full nav rewrite)
src/partials/footer.html        (three-column, email added)
src/static/css/style.css        (complete rewrite)
src/pages/index.html            (complete rewrite)
src/content/blog/001.md         (add category frontmatter)
scripts/build.ts                (category parsing, description, blog output path)
scripts/dev.ts                  (generic route resolver)
vercel.json                     (new route rewrites)
```

### Deleted files
```
src/pages/portfolio.html
```

---

## Implementation Order

Phases must be executed in order — each phase depends on the previous.
Within a phase, tasks are also ordered.

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
 CSS       Nav        Home      Pages     Blog       Content   Infra     Polish
```

Content (Phase 6) can be drafted in parallel with Phases 1–5 since it requires
no code. All open questions should be resolved before the phase that first
requires them.

---

## Tech Stack Decisions

Locked before implementation. No changes to the stack for this rewrite.

| Concern | Decision |
|---|---|
| SSG | Keep custom Bun/TypeScript build — no framework |
| CSS | Single `src/static/css/style.css` — vanilla, no preprocessor |
| Fonts | Google Fonts (Inter + Lora) — self-hosting is a future performance pass |
| Mobile nav | Pure CSS `<details>/<summary>` — no JS |
| Writing page filter | Small inline JS (~15 lines) — pure-CSS alternatives are semantically worse |
| New build dependencies | None — extend existing `build.ts` only |
| Build script language | **TypeScript (keep).** Rewriting in Go is a future standalone project. |

### Note: Go SSG (future task)

Rewriting `scripts/build.ts` and `scripts/dev.ts` in Go is a legitimate and
appealing future project. Blockers for doing it now:
1. Vercel build pipeline requires restructuring (`go build && ./ssg` vs `bun run build:prod`)
2. Go's `html/template` syntax conflicts with the current `{{ variable }}` template convention
3. Scope: ~250 lines of build tooling rewrite on top of an already large site rewrite

Suggested future approach: after this rewrite ships, do the Go SSG as a clean
standalone project. Libraries: `github.com/yuin/goldmark` (Markdown),
`gopkg.in/yaml.v3` (frontmatter), `github.com/fsnotify/fsnotify` (file watch),
`net/http` (dev server).
