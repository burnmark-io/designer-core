import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'designer-core',
  description: 'Headless label design engine for Node.js and browser',
  base: '/designer-core/',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Embedding', link: '/embedding/vanilla' },
      { text: 'Reference', link: '/reference/label-format' },
      { text: 'API', link: '/reference/api/' },
    ],
    sidebar: {
      '/': [
        { text: 'Getting Started', link: '/getting-started' },
        {
          text: 'Guide',
          items: [
            { text: 'Document Model', link: '/guide/document-model' },
            { text: 'Colour Model', link: '/guide/colour-model' },
            { text: 'Rendering', link: '/guide/rendering' },
            { text: 'Template Engine', link: '/guide/template-engine' },
            { text: 'Barcodes', link: '/guide/barcodes' },
            { text: 'Fonts', link: '/guide/fonts' },
            { text: 'Export', link: '/guide/export' },
            { text: 'CLI', link: '/guide/cli' },
          ],
        },
        {
          text: 'Embedding',
          items: [
            { text: 'Vanilla JS/TS', link: '/embedding/vanilla' },
            { text: 'Vue', link: '/embedding/vue' },
            { text: 'React', link: '/embedding/react' },
            { text: 'Custom Renderer', link: '/embedding/custom-renderer' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: '.label Format', link: '/reference/label-format' },
            { text: 'Printer Adapter', link: '/reference/printer-adapter' },
            { text: 'Barcode Formats', link: '/reference/barcode-formats' },
            { text: 'FAQ', link: '/reference/faq' },
            { text: 'API', link: '/reference/api/' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/burnmark-io/designer-core' }],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/burnmark-io/designer-core/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Not affiliated with Dymo, Brother, Avery, or any hardware vendor.',
      copyright: 'MIT License © 2025–2026 Mannes Brak',
    },
  },
});
