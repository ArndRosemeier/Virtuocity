import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'coverage/**', '*.cjs'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Keep files and functions small so duplication and god-objects stay visible.
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 12],
      'max-params': ['error', 4],
      '@typescript-eslint/consistent-type-imports': 'error',
      // Modules talk to each other only through the public entry of a package.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@virtuocity/*/src/*', '../../*'],
              message: 'Import packages via their public entry point.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
);
