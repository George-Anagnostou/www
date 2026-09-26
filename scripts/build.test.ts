import { expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { readRoutes, resolveRoute, validateRoutes } from "./routes";

const root = path.resolve(import.meta.dir, "..");

test("local routing uses the deployed rewrites and rejects missing pages", async () => {
  const routes = await readRoutes(root);
  expect(resolveRoute("/about/", routes)).toBe("/pages/about.html");
  expect(resolveRoute("/writing/genesis", routes)).toBe("/pages/writing/genesis.html");
  expect(resolveRoute("/new-page", routes)).toBeNull();
  expect(() => validateRoutes(["index.html", "new-page.html"], routes)).toThrow("/new-page");
});

test("builds keep the last good output on failure and remove stale output on success", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "www-build-test-"));
  try {
    await fs.cp(path.join(root, "src"), path.join(fixture, "src"), { recursive: true });
    await fs.copyFile(path.join(root, "vercel.json"), path.join(fixture, "vercel.json"));
    await fs.symlink(path.join(root, "node_modules"), path.join(fixture, "node_modules"));
    const build = async () => {
      const process = Bun.spawn([Bun.which("bun")!, path.join(root, "scripts/build.ts")], {
        cwd: fixture, env: { ...Bun.env, NODE_ENV: "production" }, stdout: "pipe", stderr: "pipe",
      });
      const [stdout, stderr, code] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited]);
      return { code, output: stdout + stderr };
    };
    const page = path.join(fixture, "dist/pages/index.html");
    expect((await build()).code).toBe(0);
    const original = await Bun.file(page).text();
    const postFile = path.join(fixture, "src/content/blog/002.md");
    const raw = await Bun.file(postFile).text();
    await Bun.write(postFile, raw.replace("Kernighan - Books on Numbers and Computers", "A renamed title"));
    expect((await build()).code).toBe(0);
    expect(await Bun.file(path.join(fixture, "dist/pages/writing/kernighan-books-on-numbers-and-computers.html")).exists()).toBe(true);
    const renamed = await Bun.file(page).text();
    expect(renamed).toContain("A renamed title");
    expect(renamed).not.toBe(original);

    await Bun.write(postFile, raw.replace("date: 2026-09-08", "date: 2026-02-30"));
    const invalid = await build();
    expect(invalid.code).toBe(1);
    expect(invalid.output).toContain("002.md");
    expect(await Bun.file(page).text()).toBe(renamed);
    await Bun.write(postFile, raw);

    const duplicate = path.join(fixture, "src/content/blog/duplicate.md");
    await Bun.write(duplicate, raw);
    const collision = await build();
    expect(collision.code).toBe(1);
    expect(collision.output).toContain("Duplicate slug");
    await fs.rm(duplicate);

    const badImage = path.join(fixture, "src/static/images/broken.png");
    await Bun.write(badImage, "invalid image bytes");
    const imageFailure = await build();
    expect(imageFailure.code).toBe(1);
    expect(imageFailure.output).toContain("broken.png");
    expect(await Bun.file(page).text()).toBe(renamed);
    await fs.rm(badImage);

    // This fixture had a successful post and image; removing them must remove their output.
    await fs.rm(postFile);
    await fs.rm(path.join(fixture, "src/static/images/headshot.jpeg"));
    expect((await build()).code).toBe(0);
    expect(await Bun.file(path.join(fixture, "dist/pages/writing/kernighan-books-on-numbers-and-computers.html")).exists()).toBe(false);
    expect(await Bun.file(path.join(fixture, "dist/static/images/headshot.jpeg")).exists()).toBe(false);
    expect((await fs.readdir(fixture)).filter(name => name.startsWith(".dist-"))).toEqual([]);
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
}, 20000);
