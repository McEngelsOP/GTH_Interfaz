import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/workflowBrowser', outputDir: 'test-results-workflow', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5181', viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.GTH_TEST_BROWSER_PATH ? { executablePath: process.env.GTH_TEST_BROWSER_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] } : {} },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5181', url: 'http://127.0.0.1:5181',
    env: { VITE_SUPABASE_URL: 'https://workflow-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-public-key' } },
});
