import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dpenasmi.github.io',
  base: '/demo-barberia',
  output: 'static',
  build: {
    inlineStylesheets: 'never',
  },
});