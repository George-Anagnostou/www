import path from "node:path";
import type { ServerWebSocket } from "bun";
import chokidar from "chokidar";
import { createBuildQueue } from "./build-queue";
import { readRoutes, resolveRoute } from "./routes";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const clients = new Set<ServerWebSocket<undefined>>();
let routes = await readRoutes(ROOT).catch(() => []);
let buildFailed = false;

const requestBuild = createBuildQueue(async () => {
  console.log("Building site...");
  const proc = Bun.spawn([process.execPath, "run", "build"], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`Build failed (exit ${exitCode}); keeping the last successful site.`);
  routes = await readRoutes(ROOT);
  buildFailed = false;
  for (const client of clients) client.send("reload");
}, error => {
  buildFailed = true;
  console.error(error);
  for (const client of clients) client.send("build-error");
});

// Watch before the first build so edits made during startup are queued too.
let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
const watcher = chokidar.watch([
  path.join(ROOT, "src"),
  path.join(ROOT, "scripts"),
  path.join(ROOT, "vercel.json"),
  path.join(ROOT, "package.json"),
  path.join(ROOT, "bun.lock"),
], { ignoreInitial: true });
watcher.on("all", () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => { void requestBuild(); }, 100);
});
await new Promise<void>(resolve => watcher.once("ready", resolve));
await requestBuild();

const server = Bun.serve<undefined>({
  hostname: "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/__reload" && server.upgrade(req)) return;
    const destination = resolveRoute(url.pathname, routes);
    if (!destination) return new Response("Page not found. Return to / to browse the site.", { status: 404 });
    const fullPath = path.resolve(DIST_DIR, `.${destination}`);
    if (!fullPath.startsWith(`${DIST_DIR}${path.sep}`)) return new Response("Not found", { status: 404 });
    const file = Bun.file(fullPath);
    if (!(await file.exists())) {
      return new Response(buildFailed ? "Build failed. Check the terminal and save a correction to try again." : "Page not found. Return to / to browse the site.", { status: buildFailed ? 503 : 404 });
    }
    return new Response(file, { headers: { "Cache-Control": "no-store" } });
  },
  websocket: {
    message() {},
    open(ws) {
      clients.add(ws);
      if (buildFailed) ws.send("build-error");
    },
    close(ws) { clients.delete(ws); },
  },
});
console.log(`Server running at http://localhost:${server.port}`);

async function shutdown() {
  clearTimeout(debounceTimeout);
  await watcher.close();
  server.stop(true);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
