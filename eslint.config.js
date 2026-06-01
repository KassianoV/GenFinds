import { defineConfig } from 'eslint/config'
import tsEslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'

export default defineConfig([
  { ignores: ['dist', 'dist-electron', 'out', 'node_modules', 'android'] },
  ...tsEslint,
  eslintConfigPrettier,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  }
])
