# Content Todo

All pending content lives in one place: **`src/data/site.json`**

Edit that file directly. `null` = not yet filled (renders as "Coming soon." on the site).
Arrays (`[]`) work the same way — add strings as list items.

---

## Checklist

- [ ] `currently.building` — what you're actively working on (shown on homepage + now page)
- [ ] `currently.reading` — book or article (shown on homepage + now page)
- [ ] `currently.thinking` — an open question or idea (shown on homepage + now page)
- [ ] `currently.learning` — technical or otherwise (now page only)
- [ ] `currently.listening` — music, podcast, anything (now page only, optional)
- [ ] `about.outside_work` — 3–5 specific personal interests (about page)
- [ ] `work.jpm_start_date` — e.g. `"June 2022"` (work page)
- [ ] `uses.computer` — machine model, chip, RAM
- [ ] `uses.monitor` — model or size/type
- [ ] `uses.keyboard`
- [ ] `uses.mouse`
- [ ] `uses.editor` — what you write code in
- [ ] `uses.terminal` — terminal emulator
- [ ] `uses.shell` — zsh, fish, bash, etc.
- [ ] `uses.apps` — key productivity/utility apps (array of strings)

---

## About: Second Photo

A candid photo for the about page. Drop the file in `src/static/images/` and add
an `<img>` tag in `src/pages/about.html` (replacing the placeholder figure).

---

## Blog Posts

Aim for 2–3 posts before going public. Use a `post/` branch for each.
One post exists: `src/content/blog/001.md`

Suggested angles:
1. **Finance x Tech** — what each side misunderstands about the other
2. **Project writeup** — why you built Countries, what you hit, what you'd change
3. **Silicon Valley** — what growing up there gave you, what you think of it now
