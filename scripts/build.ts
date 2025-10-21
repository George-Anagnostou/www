import fs from "fs/promises";
import path from "path";
import { marked } from "marked";
import yaml from "js-yaml";

const SRC_DIR = path.join(process.cwd(), "src");
const DIST_DIR = path.join(process.cwd(), "dist");

async function main() {
  try {
    console.log("Starting build...");

    // clean dist directory
    if (process.env.NODE_ENV !== "development") {
      console.log("Cleaning up dist directory...");
      await fs.rm(DIST_DIR, { recursive: true, force: true });
      await fs.mkdir(DIST_DIR, { recursive: true });
    }

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
    const blogSrcDir = path.join(SRC_DIR, "blog");
    const blogDestDir = path.join(DIST_DIR, "blog");
    await fs.mkdir(blogDestDir, { recursive: true });
    const blogPostFiles = await fs.readdir(blogSrcDir);
    for (const file of blogPostFiles) {
      if (file.endsWith(".md")) {
        // process md
        const srcPath = path.join(blogSrcDir, file);
        const rawContent = await fs.readFile(srcPath, "utf-8");

        const frontmatterMatch = rawContent.match(
          /^---\n([\s\S]+?)\n---\n([\s\S]*)$/,
        );
        if (!frontmatterMatch) {
          console.warn(`- Skipping ${file}: no frontmatter found.`);
          continue;
        }

        const frontmatter = yaml.load(frontmatterMatch[1]) as {
          title: string;
          date: string;
        };
        const markdownContent = frontmatterMatch[2];
        const htmlContent = await marked.parse(markdownContent);
        const finalHtml = blogPostLayout({
          title: frontmatter.title,
          date: frontmatter.date,
          content: htmlContent,
        });

        const destFile = file.replace(".md", ".html");
        const destPath = path.join(blogDestDir, destFile);
        await fs.writeFile(destPath, finalHtml);
        console.log(`- Processed and wrote ${destFile}`);
      }
    }

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

const blogPostLayout = (post: {
  title: string;
  date: string;
  content: string;
}): string => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${post.title}</title>
      <link rel="stylesheet" href="/static/css/style.css">
    </head>
    <body>
      <main>
        <h1>${post.title}</h1>
        <p><em>Published on ${post.date}</em></p>
        <hr>
        ${post.content}
      </main>
    </body>
  </html>
`;

main();
