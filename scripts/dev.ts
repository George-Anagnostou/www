import path from "path";
import fs from "fs";

const SRC_DIR = path.join(process.cwd(), "src");
const DIST_DIR = path.join(process.cwd(), "dist");

async function cleanDist() {
  console.log("Cleaning dist directory...");
  await fs.promises.rm(DIST_DIR, { recursive: true, force: true });
  await fs.promises.mkdir(DIST_DIR, { recursive: true });
}

async function runBuild(): Promise<void> {
  console.log("Running build script...");
  return new Promise((resolve, reject) => {
    const proc = Bun.spawn(["bun", "run", "scripts/build.ts"], {
      onExit: () => {
        console.log("Build finished.");
        resolve();
      },
      env: { ...process.env, NODE_ENV: "development" },
    });
  });
}

function watchFiles() {
  console.log("Watching for changes in src/...");
  let timeout: NodeJS.Timeout | null = null;
  fs.watch(SRC_DIR, { recursive: true }, (event, filename) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log(`Change detected in ${filename}.`);
      runBuild();
    }, 100);
  });
}

function startServer() {
  console.log("Starting dev server...");
  Bun.serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);
      let filePath = url.pathname;
      if (filePath === "/") filePath = "/index.html";
      const fullPath = path.join(DIST_DIR, filePath);
      const file = Bun.file(fullPath);
      const fileExists = await file.exists();
      if (!fileExists) {
        return new Response("404 Not Found", { status: 404 });
      }
      return new Response(file);
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
