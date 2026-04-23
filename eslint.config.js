import mbtech from '@mbtech-nl/eslint-config';

export default [
  ...mbtech,
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      'docs/reference/api/**',
    ],
  },
];
