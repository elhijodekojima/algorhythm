import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Enforce no any
      '@typescript-eslint/no-explicit-any': 'error',
      // No unused vars
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Explicit return types on functions
      '@typescript-eslint/explicit-function-return-type': 'warn',
      // No non-null assertions without justification
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Prefer interface over type for object shapes
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
    },
  },
];
