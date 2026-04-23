import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'designer-core',
  description: 'Headless label design engine for Node.js and browser',
  base: '/designer-core/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'GitHub', link: 'https://github.com/burnmark-io/designer-core' },
    ],
    sidebar: [
      { text: 'Introduction', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/burnmark-io/designer-core' }],
    search: { provider: 'local' },
  },
});
