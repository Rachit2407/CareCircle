import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const HEX = String.raw`#[0-9a-fA-F]{3,8}\b`;

const forbiddenGlobals = [
  { name: 'fetch', message: 'Call the backend only through src/services/api-client.ts.' },
  { name: 'localStorage', message: 'No sensitive data in browser storage (spec section 9).' },
  { name: 'sessionStorage', message: 'No sensitive data in browser storage (spec section 9).' },
];

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Privacy: nothing may be written to the console (spec section 7).
      'no-console': 'error',
      'no-restricted-globals': ['error', ...forbiddenGlobals],
      // Tokens only: raw hex colours live in src/styles/tokens.ts.
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${HEX}/]`,
          message: 'No raw hex colours in feature code. Use a token from src/styles/tokens.ts.',
        },
      ],
    },
  },
  {
    files: ['src/styles/tokens.ts', 'tailwind.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  { files: ['src/services/api-client.ts'], rules: { 'no-restricted-globals': 'off' } },
  {
    files: ['src/services/mock/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...forbiddenGlobals.filter((g) => g.name !== 'sessionStorage'),
      ],
    },
  },
  { files: ['*.config.{js,ts}'], languageOptions: { globals: globals.node } },
);
