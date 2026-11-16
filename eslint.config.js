import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

// Linter mínimo: atrapa variables y componentes no definidos (ReferenceError en
// la app) y usos incorrectos de hooks. A propósito no incluye reglas de estilo.
export default [
  { ignores: ['dist/**', 'dev-dist/**', 'android/**', 'node_modules/**', 'contenido_didactico_oficial/**', 'docs/**'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, __APP_VERSION__: 'readonly', __BUILD_ID__: 'readonly' },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
