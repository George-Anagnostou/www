import path from "path";
import fs from "fs";
import chokidar from "chokidar";

const SRC_DIR = path.join(process.cwd(), "src");
const DIST_DIR = path.join(process.cwd(), "dist");

const clients = new Set<any>();
let buildInProgress = false;

async function cleanDist() {
  console.log("Cleaning dist directory...");
  await fs.promises.rm(DIST_DIR, { recursive: true, force: true });
  await fs.promises.mkdir(DIST_DIR, { recursive: true });
}

async function runBuild(): Promise<void> {
  if (buildInProgress) return;
  buildInProgress = true;
  console.log("Running build script...");
  return new Promise((resolve, reject) => {
    const proc = Bun.spawn(["bun", "run", "build"], {
      onExit(_proc, exitCode, signalCode) {
        buildInProgress = false;
        if (exitCode !== 0) {
          console.error(`Build failed (exit ${exitCode ?? signalCode}).`);
          reject(new Error(`Build failed with exit code ${exitCode}`));
          return;
        }
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
  const watcher = chokidar.watch(SRC_DIR, { ignoreInitial: true });

  watcher.on("all", () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      console.log("Source changed — rebuilding...");
      runBuild().catch((err) => console.error(err.message));
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
      let filePath = url.pathname;
      if (filePath === "/") {
        filePath = "/pages/index.html";
      } else if (!filePath.includes(".")) {
        filePath = `/pages${filePath}.html`;
      }
      const fullPath = path.join(DIST_DIR, filePath.substring(1));
      const file = Bun.file(fullPath);
      if (!(await file.exists())) {
        return new Response("404 Not Found", { status: 404 });
      }
      return new Response(file);
    },
    websocket: {
      open(ws) {
        clients.add(ws);
      },
      close(ws) {
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