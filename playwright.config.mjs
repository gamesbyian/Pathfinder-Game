import { defineConfig, devices } from 'playwright/test';

// Allow overriding the browser executable for environments where browsers are
// pre-installed at a path that doesn't match the Playwright version expectation.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4000',
        trace: 'on-first-retry',
        ignoreHTTPSErrors: true,
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    executablePath,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                },
            },
        },
    ],
    webServer: {
        command: 'npx serve . -p 4000 --no-request-logging',
        url: 'http://localhost:4000',
        reuseExistingServer: !process.env.CI,
        timeout: 10000,
    },
});
