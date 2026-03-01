import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    {
        ignores: ['node_modules/', 'playwright-report/', 'test-results/'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['tests/**/*.ts', 'playwright.config.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        plugins: {
            playwright,
        },
        rules: {
            ...playwright.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/consistent-type-imports': 'warn',
            'playwright/no-networkidle': 'warn',
            'playwright/no-conditional-in-test': 'off',
        },
    },
    {
        files: ['scripts/**/*.cjs'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'no-undef': 'off', // Node.js globals like require are available
        },
    },
    eslintConfigPrettier,
];
