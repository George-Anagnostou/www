import path from "path";
import fs from "fs";
import chokidar from "chokidar";

const SRC_DIR = path.join(process.cwd(), "src");
const DIST_DIR = path.join(process.cwd(), "dist");

const clients = new Set<any>();

async function cleanDist() {
  console.log("Cleaning dist directory...");
  await fs.promises.rm(DIST_DIR, { recursive: true, force: true });
  await fs.promises.mkdir(DIST_DIR, { recursive: true });
}

async function runBuild(): Promise<void> {
  console.log("Running build script...");
  return new Promise((resolve, reject) => {
    const proc = Bun.spawn(["bun", "run", "build"], {
      onExit: () => {
        console.log("Build finished. Sending reload signal...");
        for (const client of clients) {
          client.send("reload");
        }
        resolve();
      },
      env: { ...process.env, NODE_ENV: "development" },
    });
  });
}

function watchFiles() {
  console.log("Watching for changes in src/...");
  let debounceTimeout: NodeJS.Timeout | null = null;
  const watcher = chokidar.watch(SRC_DIR, {
    ignoreInitial: true,
    ignored: ["**/*.bck"],
  });

  watcher.on("all", (event, path) => {
    console.log(`[Watcher] Event: '${event}' on path: '${path}'`);
    if (debounceTimeout) clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
      console.log("Change detected, running build...");
      runBuild();
    }, 100);
  });
}

function startServer() {
  console.log("Starting dev server...");
  Bun.serve({
    port: 3000,
    async fetch(req, server) {
      if (server.upgrade(req)) {
        return;
      }
      const url = new URL(req.url);
      console.log(`URL: ${url}`);
      let filePath = url.pathname;
      if (filePath === "/") filePath = "/index.html";
      const fullPath = path.join(DIST_DIR, filePath.substring(1)); // eliminate leading "/"
      const file = Bun.file(fullPath);
      const fileExists = await file.exists();
      if (!fileExists) {
        return new Response("404 Not Found", { status: 404 });
      }
      console.log(`[Server] Serving file: ${file.name}`);
      return new Response(file);
    },
    websocket: {
      open(ws) {
        console.log("[WebSocket] Client connected.");
        clients.add(ws);
      },
      close(ws) {
        console.log("[WebSocket] Client disconnected.");
        clients.delete(ws);
      },
    },
  });
  console.log("Server running at http://localhost:3000");
}

async function startDev() {
  await cleanDist();
  await runBuild();
  watchFiles();
  startServer();
}

startDev();
