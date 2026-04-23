import mbtech from '@mbtech-nl/eslint-config';

export default [
  ...mbtech,
  {
    // The shared config enables both `import-x/consistent-type-specifier-style`
    // (prefer-inline) and `@typescript-eslint/no-import-type-side-effects`
    // (prefer top-level `import type` when all specifiers are types). These
    // two rules are in direct conflict for imports that contain only types.
    // We favour inline style and disable the side-effects rule locally.
    rules: {
      '@typescript-eslint/no-import-type-side-effects': 'off',
    },
  },
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
