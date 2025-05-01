import { defineConfig, PluginOption } from 'vite';
import { generateBlogPages } from './src/generate-blog';
import chokidar from 'chokidar';
import path from 'path';

// Vite plugin to run blog generation
const blogGeneratorPlugin = (): PluginOption => {
  return {
    name: 'blog-generator',
    async configureServer(server) {
      // Run on server start
      try {
        await generateBlogPages();
        console.log('Blog generation completed on server start');
      } catch (err) {
        console.error('Blog generation failed:', err);
      }

      // Watch for changes in /src/posts
      chokidar.watch('src/posts').on('all', async (event, filePath) => {
        console.log(`File event: ${event}, Path: ${filePath}`);
        try {
          if (event === 'add' || event === 'change') {
            await generateBlogPages();
            console.log('Blog pages regenerated due to file add/change');
          } else if (event === 'unlink') {
            const fileName = path.basename(filePath);
            if (fileName.endsWith('.md')) {
              await generateBlogPages(fileName);
              console.log(`Blog pages regenerated due to file deletion: ${fileName}`);
            }
          }
          server.ws.send({ type: 'full-reload' }); // Trigger client reload
        } catch (err) {
          console.error('Blog regeneration failed:', err);
        }
      });
    },
    async buildStart() {
      // Run during build
      try {
        await generateBlogPages();
        console.log('Blog generation completed on build start');
      } catch (err) {
        console.error('Blog generation failed:', err);
      }
    },
  };
};

export default defineConfig({
  plugins: [blogGeneratorPlugin()],
  server: {
    fs: {
      allow: ['.', './blog'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        blog: 'blog.html',
        portfolio: 'portfolio.html',
      },
    },
  },
});