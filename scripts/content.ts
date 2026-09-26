/** Replace template slots once; inserted content is always literal. */
export function renderLayout(layout: string, data: Record<string, string>): string {
  return layout.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => {
    if (!Object.hasOwn(data, key)) {
      throw new Error(`Unknown template variable: ${key}`);
    }
    return data[key]!;
  });
}

function requiredString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} must be a non-empty string`);
  }
  return value.trim();
}

function calendarDate(data: Record<string, unknown>, key: string): string {
  const value = requiredString(data, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${key} must use YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${key} is not a valid calendar date: ${value}`);
  }
  return value;
}

export function parsePost(raw: string, filename: string) {
  try {
    const match = raw.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (!match) throw new Error("missing YAML frontmatter between --- lines");
    const value: unknown = Bun.YAML.parse(match[1]!);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("frontmatter must be a mapping");
    }
    const data = value as Record<string, unknown>;
    const allowed = new Set(["title", "slug", "date", "updated", "description"]);
    for (const key of Object.keys(data)) {
      if (!allowed.has(key)) throw new Error(`unknown frontmatter field: ${key}`);
    }
    const title = requiredString(data, "title");
    const slug = requiredString(data, "slug");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error("slug must contain lowercase letters, numbers, and single hyphens");
    }
    const dateISO = calendarDate(data, "date");
    const updatedISO = Object.hasOwn(data, "updated") ? calendarDate(data, "updated") : null;
    if (updatedISO && updatedISO < dateISO) {
      throw new Error("updated must not be earlier than date");
    }
    const description = Object.hasOwn(data, "description") ? requiredString(data, "description") : undefined;
    return { title, slug, dateISO, updatedISO, description, markdown: match[2] ?? "" };
  } catch (error) {
    throw new Error(`${filename}: ${error instanceof Error ? error.message : error}`);
  }
}
