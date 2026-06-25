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
    const headerHtml = await Bun.file(
      path.join(partialsDir, "header.html"),
    ).text();
    const rawFooterHtml = await Bun.file(
      path.join(partialsDir, "footer.html"),
    ).text();
    // Pre-render footer with the current year for the copyright notice
    const footerHtml = renderLayout(rawFooterHtml, {
      year: new Date().getFullYear().toString(),
    });
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
        const rawPageContent = await Bun.file(srcPath).text();
        // Strip meta description comment from rendered page body
        const pageContent = rawPageContent.replace(
          /<!--\s*description:\s*.+?\s*-->\s*/,
          "",
        );
        const pageName = path
          .parse(file)
          .name.replace(/-/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        // Homepage gets just the name; all other pages get "Page — George Anagnostou"
        const pageTitle =
          pageName === "Index"
            ? "George Anagnostou"
            : `${pageName} — George Anagnostou`;
        // Extract description from HTML comment: <!-- description: ... -->
        const descriptionMatch = rawPageContent.match(
          /<!--\s*description:\s*(.+?)\s*-->/,
        );
        const description = descriptionMatch
          ? descriptionMatch[1]
          : "George Anagnostou — wealth management, software, Bay Area.";
        const finalPageHtml = renderLayout(baseLayout, {
          title: pageTitle,
          content: pageContent,
          description,
          header: headerHtml,
          footer: footerHtml,
          liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
        });
        const destPath = path.join(pagesDistDir, file);
        await Bun.write(destPath, finalPageHtml);
        console.log(`- Processed page: ${file}`);
      }
    }

    console.log("Processing blog posts from src/content/blog...");
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
          date: Date;
          category?: string;
          description?: string;
        };
        const category = frontmatter.category ?? "general";

        const markdownContent = frontmatterMatch[2] ?? "";
        const htmlContent = marked.parse(markdownContent) as string;

        let dateOptions: Intl.DateTimeFormatOptions = {
          year: "numeric",
          month: "long",
          day: "numeric",
        };
        const renderedPostContent = renderLayout(postLayout, {
          title: frontmatter.title,
          date: frontmatter.date,
          dateString: frontmatter.date.toLocaleString("en-US", dateOptions),
          category,
          content: htmlContent,
        });

        const postDescription =
          frontmatter.description ??
          `${frontmatter.title} — by George Anagnostou`;
        const finalBlogPageHtml = renderLayout(baseLayout, {
          title: `${frontmatter.title} — George Anagnostou`,
          content: renderedPostContent,
          description: postDescription,
          header: headerHtml,
          footer: footerHtml,
          liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
        });

        const destFile = file.replace(".md", ".html");
        const destPath = path.join(blogDestDir, destFile);
        await fs.writeFile(destPath, finalBlogPageHtml);
        console.log(`- Processed blog post: ${destFile}`);

        posts.push({
          title: frontmatter.title,
          date: frontmatter.date,
          dateString: frontmatter.date.toLocaleString("en-US", dateOptions),
          url: `/content/blog/${destFile}`,
          category,
        });
      }
    }

    if (posts.length > 0) {
      posts.sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log("Generating blog index page...");
      const postListHtml = posts
        .map((post) => {
          return `
              <li class="post-item">
                <span class="post-title"><a href="${post.url}">${post.title}</a></span>
                <span class="post-date">${post.dateString}</span>
              </li>
            `;
        })
        .join("");

      const blogIndexContent = renderLayout(blogIndexLayoutContent, {
          postListHtml,
        });

      const finalBlogIndexHtml = renderLayout(baseLayout, {
        title: "Writing — George Anagnostou",
        content: blogIndexContent,
        description: "Writing by George Anagnostou.",
        header: headerHtml,
        footer: footerHtml,
        liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
      });

      await fs.writeFile(
        path.join(DIST_DIR, "pages/writing.html"),
        finalBlogIndexHtml,
      );
      console.log("- Generated writing.html");
    }

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

main();
