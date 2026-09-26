import { describe, expect, test } from "bun:test";
import { parsePost, renderLayout } from "./content";

const post = (fields = "") => `---\ntitle: Original title\nslug: permanent-url\ndate: 2024-02-29\n${fields}---\nBody`;

describe("post metadata", () => {
  test("title edits preserve explicit URLs; quoted dates and multiline YAML work", () => {
    const original = parsePost(post(), "post.md");
    const renamed = parsePost(post('description: >-\n  Two lines\n  of description\n').replace("Original title", "New title").replace("2024-02-29", '"2024-02-29"'), "post.md");
    expect(renamed.slug).toBe(original.slug);
    expect(renamed.description).toBe("Two lines of description");
    expect(parsePost(post().replaceAll("\n", "\r\n"), "windows.md").dateISO).toBe("2024-02-29");
  });
  test.each([
    [post().replace("slug: permanent-url\n", ""), "slug"],
    [post().replace("permanent-url", "../escape"), "slug"],
    [post().replace("2024-02-29", "2025-02-29"), "calendar date"],
    [post().replace("2024-02-29", "2024-13-01"), "calendar date"],
    [post("updated: 2024-01-01\n"), "earlier"],
    [post("description: [not, text]\n"), "description"],
    [post("descripton: typo\n"), "unknown frontmatter"],
    ["No frontmatter", "missing YAML"],
  ])("rejects invalid authored metadata with filename", (raw, message) => {
    expect(() => parsePost(raw, "broken.md")).toThrow(message);
    expect(() => parsePost(raw, "broken.md")).toThrow("broken.md");
  });
});

test("template content stays literal, including dollar syntax and template examples", () => {
  const content = "$& $$ $` $' {{ title }}";
  expect(renderLayout("{{content}} — {{ title }}", { content, title: "Real title" })).toBe(`${content} — Real title`);
  expect(() => renderLayout("{{ missing }}", {})).toThrow("Unknown template variable: missing");
});
