import fs from "fs/promises";
import path from "path";
import { marked } from "marked";
import yaml from "js-yaml";

const SRC_DIR = path.join(process.cwd(), "src");
const DIST_DIR = path.join(process.cwd(), "dist");

function renderLayout(layout: string, data: Record<string, any>): string {
  let output = layout;
  for (const key in data) {
    const regex = new RegExp(`{{ ${key} }}`, "g");
    output = output.replace(regex, data[key]);
  }
  return output;
}

async function cleanDistDir() {
  // clean dist directory
  if (process.env.NODE_ENV !== "development") {
    console.log("Cleaning up dist directory...");
    await fs.rm(DIST_DIR, { recursive: true, force: true });
    await fs.mkdir(DIST_DIR, { recursive: true });
  }
}

async function copyStatic() {
  // copy static assets
  const staticSrc = path.join(SRC_DIR, "static");
  const staticDest = path.join(DIST_DIR, "static");
  console.log("Copying static assets...");
  await fs.cp(staticSrc, staticDest, { recursive: true });
}

async function main() {
  console.log(`NODE_ENV = ${process.env.NODE_ENV}`);
  try {
    console.log("Starting build...");
    await cleanDistDir();
    await copyStatic();
    // copy to-level HTML files

    // load layouts
    const layoutsDir = path.join(SRC_DIR, "layouts");
    const baseLayout = await Bun.file(
      path.join(layoutsDir, "base.html"),
    ).text();
    const postLayout = await Bun.file(
      path.join(layoutsDir, "post.html"),
    ).text();
    const blogIndexLayoutContent = await Bun.file(
      path.join(layoutsDir, "blog-index.html"),
    ).text();

    const partialsDir = path.join(SRC_DIR, "partials");
    const navbarHtml = await Bun.file(
      path.join(partialsDir, "navbar.html"),
    ).text();
    const liveReload = await Bun.file(
      path.join(partialsDir, "live-reload.html"),
    ).text();

    console.log("Processing custom pages from src/pages...");
    const pagesSrcDir = path.join(SRC_DIR, "pages");
    const pagesDistDir = path.join(DIST_DIR, "pages");
    await fs.mkdir(pagesDistDir, { recursive: true });
    const pageFiles = await fs.readdir(pagesSrcDir);
    for (const file of pageFiles) {
      if (file.endsWith(".html")) {
        const srcPath = path.join(pagesSrcDir, file);
        const pageContent = await Bun.file(srcPath).text();
        const pageTitle = path
          .parse(file)
          .name.replace(/-/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "); // title from filename
        const finalPageHtml = renderLayout(baseLayout, {
          title: pageTitle,
          content: pageContent,
          navbar: navbarHtml,
          liveReload: liveReload,
        });
        const destPath = path.join(pagesDistDir, file);
        await Bun.write(destPath, finalPageHtml);
        console.log(`- Processed page: ${file}`);
      }
    }

    console.log("Processing blog post sfrom src/content/blog...");
    const blogSrcDir = path.join(SRC_DIR, "content/blog");
    const blogDestDir = path.join(DIST_DIR, "content/blog");
    await fs.mkdir(blogDestDir, { recursive: true });
    const blogPostFiles = await fs.readdir(blogSrcDir);
    const posts = [];
    for (const file of blogPostFiles) {
      if (file.endsWith(".md")) {
        const srcPath = path.join(blogSrcDir, file);
        const rawContent = await Bun.file(srcPath).text();

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

        const renderedPostContent = renderLayout(postLayout, {
          title: frontmatter.title,
          dateString: frontmatter.date,
          content: htmlContent,
        });

        const finalBlogPageHtml = renderLayout(baseLayout, {
          title: frontmatter.title,
          content: renderedPostContent,
          navbar: navbarHtml,
          liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
        });

        const destFile = file.replace(".md", ".html");
        const destPath = path.join(blogDestDir, destFile);
        await fs.writeFile(destPath, finalBlogPageHtml);
        console.log(`- Processed blog post: ${destFile}`);

        posts.push({
          title: frontmatter.title,
          dateString: frontmatter.date,
          dateObject: new Date(frontmatter.date),
          url: `/content/blog/${destFile}`,
        });
        posts.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());

        console.log("Generating blog index page...");
        const postListHtml = posts
          .map((post) => {
            return `
              <li>
                <a href=${post.url}>${post.title}</a>
                <small>${post.dateString}</small>
              </li>
            `;
          })
          .join("");

        const blogIndexContent = renderLayout(blogIndexLayoutContent, {
          postListHtml: postListHtml,
        });

        const finalBlogIndexHtml = renderLayout(baseLayout, {
          title: "George's Blog",
          content: blogIndexContent,
          navbar: navbarHtml,
          liveReload: liveReload,
        });

        await fs.writeFile(
          path.join(DIST_DIR, "content/blog.html"),
          finalBlogIndexHtml,
        );
        console.log("- Generated blog.html");
      }
    }

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

main();
