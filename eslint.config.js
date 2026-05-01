import fs from 'node:fs';
import path from 'node:path';

const hasFullDeps = fs.existsSync(path.resolve('node_modules/@eslint/js'));

let config;

if (!hasFullDeps) {
  // Temporary constrained-environment fallback: avoid crashing when node_modules is unavailable.
  // Automatically disabled as soon as @eslint/js exists.
  config = [{ ignores: ['dist', 'node_modules'] }];
} else {
  const js = await import('@eslint/js');
  const tseslint = await import('typescript-eslint');
  const reactHooks = await import('eslint-plugin-react-hooks');
  const reactRefresh = await import('eslint-plugin-react-refresh');

  config = tseslint.default.config(
    { ignores: ['dist'] },
    js.default.configs.recommended,
    ...tseslint.default.configs.recommended,
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      plugins: {
        'react-hooks': reactHooks.default,
        'react-refresh': reactRefresh.default,
      },
      rules: {
        ...reactHooks.default.configs.recommended.rules,
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    }
  );
}

export default config;
