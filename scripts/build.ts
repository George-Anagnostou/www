import fs from "fs/promises";
import path from "path";
import { marked } from "marked";
import { parsePost, renderLayout } from "./content";
import { readRoutes, validateRoutes } from "./routes";
import {
  isOptimizableImage,
  logOptimizedImages,
  optimizeImageFile,
  optimizeImagesInDir,
} from "./optimize-images";

const SRC_DIR = path.join(process.cwd(), "src");
const OUTPUT_DIR = path.join(process.cwd(), "dist");
let DIST_DIR: string;

type BlogPost = {
  title: string;
  dateISO: string;
  description: string;
  url: string;
};

const INDEX_WRITING_DESCRIPTION_FALLBACK =
  "A note that seemed worth posting.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PAGE_URLS: Record<string, string> = {
  about: "/about",
  experience: "/experience",
  projects: "/projects",
  writing: "/writing",
  now: "/now",
};

function renderCrumbRest(segments: string[]): string {
  if (segments.length === 0) return "";
  return segments
    .map((seg, i) => {
      const isLast = i === segments.length - 1;
      const prefix = i > 0 ? "/" : "";
      if (isLast) {
        return `${prefix}<span class="site-crumb__page">${escapeHtml(seg)}</span>`;
      }
      const url = PAGE_URLS[seg] ?? `/${seg}`;
      return `${prefix}<a href="${url}" class="site-crumb__link">${escapeHtml(seg)}</a>`;
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

function renderWritingListItem(post: BlogPost): string {
  return `        <li class="writing-list__item">
          <time class="writing-list__date" datetime="${post.dateISO}">${post.dateISO}</time>
          <a class="writing-list__title" href="${post.url}">${escapeHtml(post.title)}</a>
          <span class="writing-list__desc">${escapeHtml(post.description)}</span>
        </li>`;
}

function renderWritingListHtml(
  posts: BlogPost[],
  options: { limit?: number; emptyMessage?: string } = {},
): string {
  const { limit, emptyMessage = "No posts yet." } = options;
  const items = limit ? posts.slice(0, limit) : posts;
  if (items.length === 0) {
    return `<p><em class="text-muted">${escapeHtml(emptyMessage)}</em></p>`;
  }
  return `<ul class="writing-list">\n${items.map(renderWritingListItem).join("\n")}\n      </ul>`;
}

function renderIndexWritingHtml(posts: BlogPost[], limit = 3): string {
  return renderWritingListHtml(posts, { limit });
}

function renderPostListHtml(posts: BlogPost[]): string {
  return renderWritingListHtml(posts);
}

async function publishBuild() {
  const backup = path.join(process.cwd(), `.dist-previous-${crypto.randomUUID()}`);
  let hasPrevious = false;
  try {
    await fs.rename(OUTPUT_DIR, backup);
    hasPrevious = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await fs.rename(DIST_DIR, OUTPUT_DIR);
  } catch (error) {
    if (hasPrevious) await fs.rename(backup, OUTPUT_DIR);
    throw error;
  }
  if (hasPrevious) await fs.rm(backup, { recursive: true, force: true });
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
  await fs.mkdir(staticDest, { recursive: true });

  for (const entry of await fs.readdir(staticSrc, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const srcPath = path.join(staticSrc, entry.name);
    const destPath = path.join(staticDest, entry.name);
    if (entry.name === "images" && entry.isDirectory()) {
      logOptimizedImages(await optimizeImagesInDir(srcPath, destPath));
    } else if (entry.isDirectory()) {
      await copyStaticRecursive(srcPath, destPath);
    } else if (isOptimizableImage(srcPath)) {
      await optimizeImageFile(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function buildBrowserScripts() {
  console.log("Building browser scripts...");

  const result = await Bun.build({
    entrypoints: [path.join(SRC_DIR, "browser/analytics.ts")],
    outdir: path.join(DIST_DIR, "static/js"),
    target: "browser",
    minify: process.env.NODE_ENV !== "development",
    sourcemap: process.env.NODE_ENV === "development" ? "linked" : "none",
    define: {
      __VERCEL_ANALYTICS_MODE__: JSON.stringify(
        process.env.NODE_ENV === "development" ? "development" : "production",
      ),
    },
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error("Failed to build browser scripts.");
  }
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
  const blogDestDir = path.join(DIST_DIR, "pages/writing");
  await fs.mkdir(blogDestDir, { recursive: true });
  const blogPostFiles = await fs.readdir(blogSrcDir);
  const posts: BlogPost[] = [];
  const slugs = new Map<string, string>();

  for (const file of blogPostFiles) {
    if (!file.endsWith(".md")) continue;

    const srcPath = path.join(blogSrcDir, file);
    const rawContent = await Bun.file(srcPath).text();
    const frontmatter = parsePost(rawContent, srcPath);
    const { dateISO, updatedISO, slug: postSlug } = frontmatter;
    const previous = slugs.get(postSlug);
    if (previous) throw new Error(`Duplicate slug "${postSlug}" in ${previous} and ${file}`);
    slugs.set(postSlug, file);
    const postDateHtml = renderPostDateHtml(dateISO, updatedISO);
    const htmlContent = marked.parse(frontmatter.markdown) as string;
    const renderedPostContent = renderLayout(postLayout, {
      title: escapeHtml(frontmatter.title),
      postDateHtml,
      content: htmlContent,
    });

    const postDescription =
      frontmatter.description ?? `${frontmatter.title} — by George Anagnostou`;
    const finalBlogPageHtml = renderLayout(baseLayout, {
      title: escapeHtml(`${frontmatter.title} — George Anagnostou`),
      content: renderedPostContent,
      description: escapeHtml(postDescription),
      bodyClass: "page--post",
      header: renderHeader(headerTemplate, ["writing", postSlug]),
      footer: footerHtml,
      liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
    });

    const destFile = `${postSlug}.html`;
    await Bun.write(path.join(blogDestDir, destFile), finalBlogPageHtml);
    console.log(`- Processed blog post: ${destFile} → /writing/${postSlug}`);

    posts.push({
      title: frontmatter.title,
      dateISO,
      description:
        frontmatter.description ?? INDEX_WRITING_DESCRIPTION_FALLBACK,
      url: `/writing/${postSlug}`,
    });
  }

  posts.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  return posts;
}

async function main() {
  try {
    console.log("Starting build...");
    DIST_DIR = await fs.mkdtemp(path.join(process.cwd(), ".dist-build-"));
    const sourcePages = (await fs.readdir(path.join(SRC_DIR, "pages"))).filter(file => file.endsWith(".html"));
    if (sourcePages.includes("writing.html")) throw new Error("src/pages/writing.html conflicts with the generated writing index");
    validateRoutes(sourcePages, await readRoutes(process.cwd()));
    await copyStatic();
    await buildBrowserScripts();

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
      title: escapeHtml("Writing — George Anagnostou"),
      content: blogIndexContent,
      description: escapeHtml("Writing by George Anagnostou."),
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
        ? descriptionMatch[1]!
        : "George Anagnostou — wealth management, software, Bay Area.";
      const pageSlug = path.parse(file).name;
      const bodyClass =
        pageSlug === "index" ? "page--index" : `page--${pageSlug}`;

      if (pageSlug === "index") {
        pageContent = renderLayout(pageContent, {
          indexWritingHtml: renderIndexWritingHtml(posts),
        });
      }

      const headerHtml =
        pageSlug === "index"
          ? ""
          : renderHeader(headerTemplate, [pageSlug]);
      const finalPageHtml = renderLayout(baseLayout, {
        title: escapeHtml(pageTitle),
        content: pageContent,
        description: escapeHtml(description),
        bodyClass,
        header: headerHtml,
        footer: footerHtml,
        liveReload: process.env.NODE_ENV === "development" ? liveReload : "",
      });
      const destPath = path.join(pagesDistDir, file);
      await Bun.write(destPath, finalPageHtml);
      console.log(`- Processed page: ${file}`);
    }

    await publishBuild();
    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exitCode = 1;
  } finally {
    if (DIST_DIR) await fs.rm(DIST_DIR, { recursive: true, force: true });
  }
}

main();
