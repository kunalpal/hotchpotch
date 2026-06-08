import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    '*.tsbuildinfo',
    '.agents/**',
  ]),
  // Disable no-explicit-any for test files to simplify mocking
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Server-side files: disallow console.*
  {
    files: ['src/lib/**/*.ts', 'src/app/api/**/*.ts', 'src/utils/**/*.ts'],
    rules: {
      'no-console': 'warn',
    },
  },
  // Exclude db/scripts/ (CLI logger uses console intentionally)
  {
    files: ['src/db/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // Ignore underscore-prefixed unused function arguments (intentionally unused)
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]);

export default eslintConfig;
