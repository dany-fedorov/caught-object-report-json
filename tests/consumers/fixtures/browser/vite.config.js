import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  build: { outDir: 'dist', emptyOutDir: true, minify: false },
  // No `define`, no `resolve.alias`, no polyfill plugin: the package has to
  // build for the browser as published, or this run fails.
});
