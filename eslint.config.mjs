// ESLint Flat Config for Next.js + TypeScript (ESLint v9)
// Use Next.js plugin flat config directly to avoid @rushstack/eslint-patch issues
// and add TypeScript parser for TS/TSX files.

import nextPlugin from '@next/eslint-plugin-next';
const { flatConfig: next } = nextPlugin;
import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
  // ignore dev/seed scripts
  'scripts/dev/**',
  // ignore prisma seed/build outputs (ts/js)
  'prisma/**/*.ts',
  'prisma/**/*.js',
      '*.config.js',
      '*.config.cjs',
      'tsconfig.tsbuildinfo',
    ],
  },
  // Next.js recommended rules (Core Web Vitals)
  next.coreWebVitals,
  // Enable TypeScript parsing for TS/TSX files
  {
    files: ['**/*.ts', '**/*.tsx']
    ,languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        React: true,
        JSX: true,
      },
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        project: false,
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        React: true,
        JSX: true,
      },
    },
    rules: {
      // General cleanliness
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'warn',
      // TypeScript-ish rules (handled via typechecker mostly)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
