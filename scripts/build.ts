import fs from "fs/promises";
import path from "path";

const SRC_DIR = path.join(process.cwd(), "src");
const DIST_DIR = path.join(process.cwd(), "dist");

async function main() {
  try {
    console.log("Starting build...");

    // clean dist directory
    console.log("Cleaning up dist directory...");
    await fs.rm(DIST_DIR, { recursive: true, force: true });
    await fs.mkdir(DIST_DIR, { recursive: true });

    // copy static assets
    const staticSrc = path.join(SRC_DIR, "static");
    const staticDest = path.join(DIST_DIR, "static");
    console.log("Copying static assets...");
    await fs.cp(staticSrc, staticDest, { recursive: true });

    // copy to-level HTML files
    console.log("Copying root HTML files...");
    const srcFiles = await fs.readdir(SRC_DIR);
    for (const file of srcFiles) {
      if (file.endsWith(".html")) {
        const srcPath = path.join(SRC_DIR, file);
        const destPath = path.join(DIST_DIR, file);
        await fs.copyFile(srcPath, destPath);
        console.log(`- Copied ${file}`);
      }
    }

    // build and copy md files
    console.log("Building HTML files from md files");
    const blogMdPath = path.join(SRC_DIR, "blog");
    const blogMdFiles = await fs.readdir(blogMdPath);
    for (const file of blogMdFiles) {
      if (file.endsWith(".md")) {
        // process md
        console.log(`- processed ${file}`);
      }
    }

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

main();
