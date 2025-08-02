import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';
import yaml from 'js-yaml';
import { format, isValid, parseISO, parse } from 'date-fns';

// Interface for frontmatter metadata
interface FrontMatter {
  title?: string;
  date?: string; // ISO date string, e.g., "2025-04-28"
  lastModified?: string; // Auto-generated, e.g. "2025-05-01"
}

// Define the skeleton template
const template = (content: string, meta: FrontMatter): string => {
  // Validate and format date
  let formattedDate = '';
  if (meta.date) {
    try {
      let parsedDate = parseISO(meta.date);
      if (!isValid(parsedDate)) {
        parsedDate = parse(meta.date, 'EEE MMM dd yyyy', new Date());
      }
      if (isValid(parsedDate)) {
        formattedDate = format(parsedDate, 'MMMM dd, yyyy');
      } else {
        console.warn(`Invalid date in ${meta.title || 'post'}: ${meta.date}`);
      }
    } catch (err) {
      console.warn(`Failed to parse date in ${meta.title || 'post'}: ${meta.date}`, err);
    }
  }

  // Format lastModified
  let formattedLastModified = '';
  if (meta.lastModified) {
    try {
      const parsedLastModified = parseISO(meta.lastModified);
      if (isValid(parsedLastModified)) {
        formattedLastModified = format(parsedLastModified, 'MMM dd, yyyy');
      } else {
        console.warn(`Invalid lastModified in ${meta.title || 'post'}: ${meta.lastModified}`);
      }
    } catch (err) {
      console.warn(`Failed to parse lastModified in ${meta.title || 'post'}: ${meta.lastModified}`, err);
    }
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.title || 'Untitled'} - My Blog</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <nav class="navbar">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/blog.html">Blog</a></li>
      <li><a href="/portfolio.html">Portfolio</a></li>
    </ul>
  </nav>
  <main>
    <h1>${meta.title || 'Untitled'}</h1>
    ${formattedDate ? `<p class="post-date">Posted on ${formattedDate}</p>` : ''}
    ${formattedLastModified ? `<p class="last-modified">Last modified: ${formattedLastModified}</p>` : ''}
    ${content}
    <p><a href="/blog.html">Back to Blog List</a></p>
  </main>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;
};

const blogIndexTemplate = (postLinks: string[]): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Blog</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <nav class="navbar">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/blog.html" class="active">Blog</a></li>
      <li><a href="/portfolio.html">Portfolio</a></li>
    </ul>
  </nav>
  <main>
    <h1>My Blog</h1>
    <section id="post-list">
      ${postLinks.join('\n')}
    </section>
  </main>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;

// Delete a post's HTML file
const deletePost = async (file: string, outputDir: string): Promise<void> => {
  const htmlFile = path.join(outputDir, file.replace('.md', '.html'));
  try {
    await fs.unlink(htmlFile);
    console.log(`Deleted post: ${htmlFile}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Failed to delete ${htmlFile}:`, err);
    }
  }
};

export const generateBlogPages = async (deletedFile?: string): Promise<void> => {
  const postsDir: string = path.join(process.cwd(), 'src', 'posts');
  const outputDir: string = path.join(process.cwd(), 'blog', 'posts');
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Handle deletion
  if (deletedFile) {
    await deletePost(deletedFile, outputDir);
  }

  // Read all Markdown files
  const files: string[] = await fs.readdir(postsDir);
  const mdFiles: string[] = files.filter(file => file.endsWith('.md'));
  const posts: { file: string; meta: FrontMatter; content: string }[] = [];

  for (const file of mdFiles) {
    const filePath: string = path.join(postsDir, file);
    const rawContent: string = await fs.readFile(filePath, 'utf-8');
    
    // Get file's last modified date
    const stats = await fs.stat(filePath);
    const lastModified = format(stats.mtime, 'yyyy-MM-dd');

    // Extract frontmatter (between --- delimiters)
    const frontMatterMatch = rawContent.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
    let meta: FrontMatter = { lastModified };
    let content: string = rawContent;

    if (frontMatterMatch) {
      meta = { ...yaml.load(frontMatterMatch[1], { schema: yaml.FAILSAFE_SCHEMA }) as FrontMatter, lastModified };
      content = frontMatterMatch[2].trim();
      console.log(`File: ${file}, Raw date: ${meta.date}, Last modified: ${meta.lastModified}`);
    }
    
    const htmlContent: string = await marked.parse(content);
    posts.push({ file, meta, content: htmlContent });
  }
  
  // Sort posts by date (newest first)
  posts.sort((a, b) => {
    let dateA: Date = new Date(0);
    let dateB: Date = new Date(0);

    if (a.meta.date) {
      try {
        let parsedA = parseISO(a.meta.date);
        if (!isValid(parsedA)) {
          parsedA = parse(a.meta.date, 'EEE MMM dd yyyy', new Date());
        }
        if (isValid(parsedA)) dateA = parsedA;
        else console.warn(`Invalid date in ${a.meta.title || 'post'}: ${a.meta.date}`);
      } catch (err) {
        console.warn(`Failed to parse date in ${a.meta.title || 'post'}: ${a.meta.date}`, err);
      }
    }

    if (b.meta.date) {
      try {
        let parsedB = parseISO(b.meta.date);
        if (!isValid(parsedB)) {
          parsedB = parse(b.meta.date, 'EEE MMM dd yyyy', new Date());
        }
        if (isValid(parsedB)) dateB = parsedB;
        else console.warn(`Invalid date in ${b.meta.title || 'post'}: ${b.meta.date}`);
      } catch (err) {
        console.warn(`Failed to parse date in ${b.meta.title || 'post'}: ${b.meta.date}`, err);
      }
    }

    return dateB.getTime() - dateA.getTime(); // Newest first
  });

  // Generate individual post pages
  const postLinks: string[] = [];
  for (const post of posts) {
    const outputFile: string = path.join(outputDir, post.file.replace('.md', '.html'));
    const html: string = template(post.content, post.meta);
    await fs.writeFile(outputFile, html, 'utf-8');

    // Add to blog index with date and lastModified
    let formattedDate = '';
    let formattedLastModified = '';
    if (post.meta.date) {
      try {
        let parsedDate = parseISO(post.meta.date);
        if (!isValid(parsedDate)) {
          parsedDate = parse(post.meta.date, 'EEE MMM dd yyyy', new Date());
        }
        if (isValid(parsedDate)) {
          formattedDate = format(parsedDate, 'MMMM dd, yyyy');
        } else {
          console.warn(`Invalid date in ${post.meta.title || 'post'}: ${post.meta.date}`);
        }
      } catch (err) {
        console.warn(`Failed to parse date in ${post.meta.title || 'post'}: ${post.meta.date}`, err);
      }
    }
    if (post.meta.lastModified) {
      try {
        const parsedLastModified = parseISO(post.meta.lastModified);
        if (isValid(parsedLastModified)) {
          formattedLastModified = format(parsedLastModified, 'MMM dd, yyyy');
        } else {
          console.warn(`Invalid lastModified in ${post.meta.title || 'post'}: ${post.meta.lastModified}`);
        }
      } catch (err) {
        console.warn(`Failed to parse lastModified in ${post.meta.title || 'post'}: ${post.meta.lastModified}`, err);
      }
    }

    const link: string = `
      <p class="post-link">
        <span class="post-title"><a href="/blog/posts/${post.file.replace('.md', '.html')}">${post.meta.title || 'Untitled'}</a></span>
        <span class="post-meta">
          ${formattedDate ? `<span class="post-date">${formattedDate}</span>` : ''}
          ${formattedLastModified ? `<span class="last-modified">last modified: ${formattedLastModified}</span>` : ''}
        </span>
      </p>`;
    postLinks.push(link);
  }
  
  // Generate blog index page
  const blogIndexHtml: string = blogIndexTemplate(postLinks);
  await fs.writeFile(path.join(process.cwd(), 'blog.html'), blogIndexHtml, 'utf-8');
  console.log('Blog pages and index generated successfully!');
};

generateBlogPages().catch(console.error);