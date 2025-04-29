import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';

// Define the skeleton template
const template = (content: string, title: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - My Blog</title>
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
    ${content}
    <p><a href="/blog.html">Back to Blog List</a></p>
  </main>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;

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

export const generateBlogPages = async (): Promise<void> => {
  const postsDir: string = path.join(process.cwd(), 'src', 'posts');
  const outputDir: string = path.join(process.cwd(), 'blog', 'posts');
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Read all Markdown files
  const files: string[] = await fs.readdir(postsDir);
  const mdFiles: string[] = files.filter(file => file.endsWith('.md'));
  const postLinks: string[] = [];

  for (const file of mdFiles) {
    const filePath: string = path.join(postsDir, file);
    const content: string = await fs.readFile(filePath, 'utf-8');
    const htmlContent: string = await marked.parse(content);
    const titleMatch: RegExpMatchArray | null = content.match(/^#\s+(.+)$/m);
    const title: string = titleMatch ? titleMatch[1] : 'Untitled';
    const outputFile: string = path.join(outputDir, file.replace('.md', '.html'));
    const html: string = template(htmlContent, title);
    await fs.writeFile(outputFile, html);

    // Add to blog index
    const link: string = `<p><a href="/blog/posts/${file.replace('.md', '.html')}">${title}</a></p>`;
    postLinks.push(link);
  }

  // Generate blog index
  const blogIndexHtml: string = blogIndexTemplate(postLinks);
  await fs.writeFile(path.join(process.cwd(), 'blog.html'), blogIndexHtml);

  console.log('Blog pages and index generated!');
};

generateBlogPages().catch(console.error);