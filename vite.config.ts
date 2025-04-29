import { defineConfig, PluginOption } from 'vite';
import { generateBlogPages } from './src/generate-blog';

// Vite plugin to run blog generation
const blogGeneratorPlugin = (): PluginOption => {
    return {
      name: 'blog-generator',
      async configureServer(server) {
        // Run when dev server starts
        try {
            await generateBlogPages();
            console.log('Blog generation completed successfully.');
        } catch (err) {
            console.error('Blog generation failed:', err);
        }
      },
      async buildStart() {
        // Run during build
        try {
            await generateBlogPages();
            console.log('Blog generation completed successfully.');
        } catch (err) {
            console.error('Blog generation failed:', err);
        }
      }
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