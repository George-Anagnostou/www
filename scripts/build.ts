import fs from "fs/promises";
import path from "path";
import { marked } from "marked";

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

const PAGE_URLS: Record<string, string> = {
  about: "/about",
  work: "/work",
  skills: "/skills",
  projects: "/projects",
  writing: "/writing",
  now: "/now",
  uses: "/uses",
  contact: "/contact",
};

function parseFrontmatterValue(raw: string): string {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontmatter(frontmatterYaml: string): {
  title: string;
  description?: string;
} {
  const titleMatch = frontmatterYaml.match(/^title:\s*(.+)$/m);
  if (!titleMatch) throw new Error("missing title");
  const descriptionMatch = frontmatterYaml.match(/^description:\s*(.+)$/m);
  return {
    title: parseFrontmatterValue(titleMatch[1]),
    description: descriptionMatch
      ? parseFrontmatterValue(descriptionMatch[1])
      : undefined,
  };
}

function parsePostDateISO(frontmatterYaml: string): string | null {
  const match = frontmatterYaml.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
  return match?.[1] ?? null;
}

function formatPostDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function renderCrumbRest(segments: string[]): string {
  if (segments.length === 0) return "";
  return segments
    .map((seg, i) => {
      const isLast = i === segments.length - 1;
      const prefix = i > 0 ? "/" : "";
      if (isLast) {
        return `${prefix}<span class="site-crumb__page">${seg}</span>`;
      }
      const url = PAGE_URLS[seg] ?? `/${seg}`;
      return `${prefix}<a href="${url}" class="site-crumb__link">${seg}</a>`;
    })
    .join("");
}

function renderHeader(
  headerTemplate: string,
  pathSegments: string[],
): string {
  const crumbRest = renderCrumbRest(pathSegments);
  return renderLayout(headerTemplate, { crumbRest });
}

async function cleanDistDir() {
  if (process.env.NODE_ENV !== "development") {
    console.log("Cleaning up dist directory...");
    await fs.rm(DIST_DIR, { recursive: true, force: true });
    await fs.mkdir(DIST_DIR, { recursive: true });
  }
}

async function copyStaticRecursive(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyStaticRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function copyStatic() {
  const staticSrc = path.join(SRC_DIR, "static");
  const staticDest = path.join(DIST_DIR, "static");
  console.log("Copying static assets...");
  await copyStaticRecursive(staticSrc, staticDest);
}

async function main() {
  try {
    console.log("Starting build...");
    await cleanDistDir();
    await copyStatic();

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
    const headerTemplate = await Bun.file(
      path.join(partialsDir, "header.html"),
    ).text();
    const rawFooterHtml = await Bun.file(
      path.join(partialsDir, "footer.html"),
    ).text();
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
        const pageTitle =
          pageName === "Index"
            ? "George Anagnostou"
            : `${pageName} — George Anagnostou`;
        const descriptionMatch = rawPageContent.match(
          /<!--\s*description:\s*(.+?)\s*-->/,
        );
        const description = descriptionMatch
          ? descriptionMatch[1]
          : "George Anagnostou — wealth management, software, Bay Area.";
        const pageSlug = path.parse(file).name;
        const bodyClass =
          pageSlug === "index" ? "page--index" : `page--${pageSlug}`;
        const headerHtml = renderHeader(
          headerTemplate,
          pageSlug === "index" ? [] : [pageSlug],
        );
        const finalPageHtml = renderLayout(baseLayout, {
          title: pageTitle,
          content: pageContent,
          description,
          bodyClass,
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
    const posts: {
      title: string;
      dateISO: string;
      dateString: string;
      url: string;
    }[] = [];

    for (const file of blogPostFiles) {
      if (!file.endsWith(".md")) continue;

      const srcPath = path.join(blogSrcDir, file);
      const rawContent = await Bun.file(srcPath).text();
      const frontmatterMatch = rawContent.match(
        /^---\n([\s\S]+?)\n---\n([\s\S]*)$/,
      );
      if (!frontmatterMatch) {
        console.warn(`- Skipping ${file}: no frontmatter found.`);
        continue;
      }

      const frontmatterYaml = frontmatterMatch[1];
      let frontmatter: { title: string; description?: string };
      try {
        frontmatter = parseFrontmatter(frontmatterYaml);
      } catch {
        console.warn(`- Skipping ${file}: missing title in frontmatter.`);
        continue;
      }
      const dateISO = parsePostDateISO(frontmatterYaml);
      if (!dateISO) {
        console.warn(`- Skipping ${file}: missing or invalid date.`);
        continue;
      }
      const dateString = formatPostDate(dateISO);

      const markdownContent = frontmatterMatch[2] ?? "";
      const htmlContent = marked.parse(markdownContent) as string;
      const renderedPostContent = renderLayout(postLayout, {
        title: frontmatter.title,
        dateString,
        content: htmlContent,
      });

      const postDescription =
        frontmatter.description ??
        `${frontmatter.title} — by George Anagnostou`;
      const postCrumb = frontmatter.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const finalBlogPageHtml = renderLayout(baseLayout, {
        title: `${frontmatter.title} — George Anagnostou`,
        content: renderedPostContent,
        description: postDescription,
        bodyClass: "page--post",
        header: renderHeader(headerTemplate, [
          "writing",
          postCrumb || "post",
        ]),
        footer: footerHtml,
        liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
      });

      const destFile = file.replace(".md", ".html");
      await Bun.write(path.join(blogDestDir, destFile), finalBlogPageHtml);
      console.log(`- Processed blog post: ${destFile}`);

      posts.push({
        title: frontmatter.title,
        dateISO,
        dateString,
        url: `/content/blog/${destFile}`,
      });
    }

    posts.sort((a, b) => b.dateISO.localeCompare(a.dateISO));

    console.log("Generating blog index page...");
    const postListHtml = posts
      .map(
        (post) => `
              <li class="post-item">
                <span class="post-title"><a href="${post.url}">${post.title}</a></span>
                <span class="post-date">${post.dateString}</span>
              </li>
            `,
      )
      .join("");

    const blogIndexContent = renderLayout(blogIndexLayoutContent, {
      postListHtml,
    });
    const finalBlogIndexHtml = renderLayout(baseLayout, {
      title: "Writing — George Anagnostou",
      content: blogIndexContent,
      description: "Writing by George Anagnostou.",
      bodyClass: "page--writing",
      header: renderHeader(headerTemplate, ["writing"]),
      footer: footerHtml,
      liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
    });
    await Bun.write(path.join(DIST_DIR, "pages/writing.html"), finalBlogIndexHtml);
    console.log("- Generated writing.html");

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

main();