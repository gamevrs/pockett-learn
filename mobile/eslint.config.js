// The website's eslint.config.mjs one directory up ignores mobile/**, so the app carries its own:
// Expo's recommended rules for React Native.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'ios/*', 'android/*', 'coverage/*'] },
  {
    // Build scripts run in Node, not the app.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
]);
