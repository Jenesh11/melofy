const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'regressions.spec.cjs',
  timeout: 45000,
  workers: 1,
  reporter: 'list',
  outputDir: '../../test-results/browser',
  use: { channel: 'chrome', headless: true, baseURL: 'http://127.0.0.1:4319', screenshot: 'only-on-failure' },
  webServer: { command: 'node tests/browser/serve.cjs', cwd: require('node:path').resolve(__dirname, '../..'), url: 'http://127.0.0.1:4319', reuseExistingServer: false, timeout: 30000 },
});
