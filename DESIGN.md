---
name: George Anagnostou
description: A light, personal reading space with serif type and blue links.
colors:
  bg: "#f5f5f5"
  surface: "#ffffff"
  border: "#dddddd"
  border-subtle: "#eeeeee"
  text: "#333333"
  text-secondary: "#666666"
  text-muted: "#6b6b6b"
  accent: "#0066cc"
  accent-hover: "#004d99"
  accent-dim: "rgba(0, 102, 204, 0.06)"
  code-bg: "#f0f0f0"
  pre-bg: "#1e1e1e"
  pre-text: "#e8e8e8"
typography:
  headline:
    fontFamily: '"Vollkorn", Georgia, "Times New Roman", Times, serif'
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: '"Vollkorn", Georgia, "Times New Roman", Times, serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: '"Vollkorn", Georgia, "Times New Roman", Times, serif'
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  article:
    fontFamily: '"Vollkorn", Georgia, "Times New Roman", Times, serif'
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.6
  terminal:
    fontFamily: '"Consolas", "Monaco", "Courier New", monospace'
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  focus: "2px"
  media: "4px"
  screenshot: "6px"
  pre: "8px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-6: "1.5rem"
  space-8: "2rem"
  space-10: "2.5rem"
  space-12: "3rem"
  space-16: "4rem"
components:
  text-link:
    textColor: "{colors.accent}"
  text-link-hover:
    textColor: "{colors.accent-hover}"
  breadcrumb:
    backgroundColor: "{colors.bg}"
    padding: "1rem 1.5rem"
  directory-link:
    textColor: "{colors.accent}"
    padding: "0.75rem 0"
  writing-row:
    padding: "0.5rem 0"
  project-terminal:
    backgroundColor: "{colors.pre-bg}"
    textColor: "{colors.pre-text}"
    typography: "{typography.terminal}"
    rounded: "{rounded.media}"
    padding: "1rem"
---

# Design System: George Anagnostou

## Overview

**Creative North Star: "A personal reading space"**

Keep the site light, curious, and approachable. The incumbent identity uses serif reading text, familiar blue links, a quiet gray background, and a narrow column. Personality comes through writing, real photographs, project evidence, and the small shrimp footer.

This document records the implemented visual system. Page strategy belongs in `PRODUCT.md` and the surface briefs; CSS in `src/static/css/` supplies the implementation.

**Key Characteristics:**

- Serif reading text with restrained sans-serif metadata and monospace technical details.
- Open sections separated by space and fine rules.
- Visible links, keyboard focus, and wrapping content on small screens.

## Colors

### Primary

The blue `accent` identifies links, breadcrumb code, focus outlines, and quote rules. `accent-hover` darkens ordinary links on hover; `accent-dim` supplies the faint blockquote background. Link tokens in CSS alias the same blue values.

### Neutral

`bg` is the page canvas; `surface` backs images and placeholders. `text`, `text-secondary`, and `text-muted` distinguish main reading content, supporting descriptions, and metadata. `border` separates stronger sections; `border-subtle` supplies quieter divisions. Inline code uses `code-bg` with the main text color; terminal and fenced-code surfaces use `pre-bg` and `pre-text`.

## Typography

Vollkorn carries headings and prose, with Georgia and traditional serif fallbacks. System sans-serif keeps dates and labels compact; the monospace stack marks filesystem paths, code, and project technologies. The font stylesheet loads Vollkorn regular, medium, semibold, and regular italic.

The frontmatter records base roles, not an invented type scale. Ordinary headings use the headline and title roles; third-level headings are (1.2rem). Post titles vary with `clamp(1.75rem, 4vw, 2.25rem)` and a tighter line height (1.15). Writing descriptions are small italic serif text (0.92rem); dates use tabular numerals. About prose uses a generous line height (1.75).

## Layout

Use a centered, fluid column capped at (45rem), including horizontal padding (1.5rem) on each side. Long-form content is capped at (42rem). Sections usually separate with the larger spacing tokens; paragraph and row spacing use the smaller steps. Keep project screenshots full-column and portraits capped at (18rem).

Responsive changes follow content needs: directory links stack their name above their description at widths up to (420px); experience timelines stack dates above details up to (480px); writing rows stack date, title, and description up to (640px). About's image-and-caption aside becomes two columns from (640px). Titles and descriptions wrap; code blocks scroll horizontally.

## Elevation & Depth

The implemented system has no shadows. Whitespace, typography, fine borders, and occasional background changes establish hierarchy. Sections remain open on the page canvas; dark code surfaces provide contrast where technical content needs it.

## Shapes

Rows and sections use straight rules rather than enclosing cards. Images have fine borders and gently rounded corners; screenshot media may use the larger screenshot radius. Code blocks use the pre radius, while project terminal examples use the media radius. Blockquotes combine a blue left rule with rounded right corners (6px).

## Components

### Links and keyboard access

Ordinary links are underlined with a slight offset (0.15em) and thin decoration (0.06em). A short color/decoration transition (0.15s ease) accompanies interaction. Visited links retain their ordinary blue color. Keyboard focus uses a blue outline (2px) offset from the target (3px). A skip link appears on focus. Reduced-motion styles remove smooth scrolling and link/skip-link transitions; the existing footer opacity transition is separate.

### Navigation

Inner-page breadcrumbs combine George's serif name with a monospace filesystem-style path. The home link is semibold; path links and the current page use secondary text. The homepage omits this header. Its directory uses one full-row link for the name and description, with a rule between rows. Names are underlined at rest and receive thicker underlines on hover or keyboard focus. Keep the destination label and description within the same link.

### Writing rows

Each row places an ISO date in a (6rem) column beside a wrapping title, with an italic description beneath the title. The horizontal gap is (2rem). The same pattern appears in the writing index and homepage teaser. The title is semibold and becomes accent blue on hover.

### Media and technical content

Use real photos and screenshots with visible captions where supplied, explicit image dimensions, and asynchronous decoding. Load below-the-fold images lazily. Project technology labels are plain, wrapping monospace text rather than filled pills. Terminal examples preserve whitespace and scroll horizontally; focusable examples receive the same blue outline as links. Inline code, fenced code, and blockquotes follow the color and shape treatments above.

## Do's and Don'ts

- Do preserve the serif, blue-link, narrow-column identity.
- Do use spacing and fine rules to organize open reading sections.
- Do retain visible link cues, keyboard outlines, and responsive wrapping.
- Do use existing tokens and modular component or page styles.
- Don't replace the reading column with a dashboard or promotional card grid.
- Don't add shadows, decorative gradients, or new accent colors without an intentional visual-system change.
- Don't hide supplied captions or nest interactive controls inside directory links.
