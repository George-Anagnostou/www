import fs from "fs/promises";
import path from "path";
import { marked } from "marked";

const SRC_DIR = path.join(process.cwd(), "src");
const DIST_DIR = path.join(process.cwd(), "dist");

type BlogPost = {
  title: string;
  dateISO: string;
  description: string;
  url: string;
};

const INDEX_WRITING_DESCRIPTION_FALLBACK =
  "A note that seemed worth posting.";

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

function parseFrontmatterDateISO(
  frontmatterYaml: string,
  field: "date" | "updated",
): string | null {
  const match = frontmatterYaml.match(
    new RegExp(`^${field}:\\s*(\\d{4}-\\d{2}-\\d{2})`, "m"),
  );
  return match?.[1] ?? null;
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

function renderPostDateHtml(
  dateISO: string,
  updatedISO: string | null,
): string {
  const published = `<time class="blog-post-date" datetime="${dateISO}">${dateISO}</time>`;
  if (!updatedISO || updatedISO <= dateISO) {
    return published;
  }
  return `${published}<span class="blog-post-meta__sep" aria-hidden="true">·</span><time class="blog-post-date blog-post-date--updated" datetime="${updatedISO}">Updated ${updatedISO}</time>`;
}

function renderIndexWritingHtml(posts: BlogPost[], limit = 5): string {
  const recent = posts.slice(0, limit);
  if (recent.length === 0) {
    return '<p><em class="text-muted">No posts yet.</em></p>';
  }
  return `<ul class="index-writing">\n${recent
    .map(
      (post) =>
        `        <li class="index-writing__item">
          <time class="index-writing__date" datetime="${post.dateISO}">${post.dateISO}</time>
          <span class="index-writing__desc">${post.description}</span>
          <a class="index-writing__title" href="${post.url}">${post.title}</a>
        </li>`,
    )
    .join("\n")}\n      </ul>`;
}

function renderPostListHtml(posts: BlogPost[]): string {
  return posts
    .map(
      (post) => `
              <li class="post-item">
                <span class="post-title"><a href="${post.url}">${post.title}</a></span>
                <time class="post-date" datetime="${post.dateISO}">${post.dateISO}</time>
              </li>
            `,
    )
    .join("");
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

async function processBlogPosts(
  baseLayout: string,
  postLayout: string,
  headerTemplate: string,
  footerHtml: string,
  liveReload: string,
): Promise<BlogPost[]> {
  console.log("Processing blog posts from src/content/blog...");
  const blogSrcDir = path.join(SRC_DIR, "content/blog");
  const blogDestDir = path.join(DIST_DIR, "content/blog");
  await fs.mkdir(blogDestDir, { recursive: true });
  const blogPostFiles = await fs.readdir(blogSrcDir);
  const posts: BlogPost[] = [];

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
    const dateISO = parseFrontmatterDateISO(frontmatterYaml, "date");
    if (!dateISO) {
      console.warn(`- Skipping ${file}: missing or invalid date.`);
      continue;
    }
    const updatedISO = parseFrontmatterDateISO(frontmatterYaml, "updated");
    if (updatedISO && updatedISO < dateISO) {
      console.warn(
        `- ${file}: updated (${updatedISO}) is before date (${dateISO}); ignoring updated.`,
      );
    }
    const effectiveUpdatedISO =
      updatedISO && updatedISO > dateISO ? updatedISO : null;
    const postDateHtml = renderPostDateHtml(dateISO, effectiveUpdatedISO);

    const markdownContent = frontmatterMatch[2] ?? "";
    const htmlContent = marked.parse(markdownContent) as string;
    const renderedPostContent = renderLayout(postLayout, {
      title: frontmatter.title,
      postDateHtml,
      content: htmlContent,
    });

    const postDescription =
      frontmatter.description ?? `${frontmatter.title} — by George Anagnostou`;
    const postCrumb = frontmatter.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const finalBlogPageHtml = renderLayout(baseLayout, {
      title: `${frontmatter.title} — George Anagnostou`,
      content: renderedPostContent,
      description: postDescription,
      bodyClass: "page--post",
      header: renderHeader(headerTemplate, ["writing", postCrumb || "post"]),
      footer: footerHtml,
      liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
    });

    const destFile = file.replace(".md", ".html");
    await Bun.write(path.join(blogDestDir, destFile), finalBlogPageHtml);
    console.log(`- Processed blog post: ${destFile}`);

    posts.push({
      title: frontmatter.title,
      dateISO,
      description:
        frontmatter.description ?? INDEX_WRITING_DESCRIPTION_FALLBACK,
      url: `/content/blog/${destFile}`,
    });
  }

  posts.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  return posts;
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
    const liveReload = await Bun.file(
      path.join(partialsDir, "live-reload.html"),
    ).text();
    const footerHtml = await Bun.file(
      path.join(partialsDir, "footer.html"),
    ).text();

    const posts = await processBlogPosts(
      baseLayout,
      postLayout,
      headerTemplate,
      footerHtml,
      liveReload,
    );

    console.log("Generating blog index page...");
    const blogIndexContent = renderLayout(blogIndexLayoutContent, {
      postListHtml: renderPostListHtml(posts),
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

    console.log("Processing custom pages from src/pages...");
    const pagesSrcDir = path.join(SRC_DIR, "pages");
    const pagesDistDir = path.join(DIST_DIR, "pages");
    await fs.mkdir(pagesDistDir, { recursive: true });
    const pageFiles = await fs.readdir(pagesSrcDir);
    for (const file of pageFiles) {
      if (!file.endsWith(".html")) continue;

      const srcPath = path.join(pagesSrcDir, file);
      const rawPageContent = await Bun.file(srcPath).text();
      let pageContent = rawPageContent.replace(
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

      if (pageSlug === "index") {
        pageContent = renderLayout(pageContent, {
          indexWritingHtml: renderIndexWritingHtml(posts),
        });
      }

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

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

main();