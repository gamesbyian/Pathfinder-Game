import { defineConfig, devices } from 'playwright/test';

// Allow overriding the browser executable for environments where browsers are
// pre-installed at a path that doesn't match the Playwright version expectation.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

const launchOptions = {
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
};

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
            // Default functional e2e — excludes the visual baselines (those are an opt-in
            // developer harness, not run by `npm run test:e2e` / CI).
            name: 'chromium',
            testIgnore: '**/visual.spec.mjs',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions,
            },
        },
        {
            // Visual-regression baselines (modal layout). Fixed viewport for determinism.
            name: 'visual',
            testMatch: '**/visual.spec.mjs',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 900 },
                deviceScaleFactor: 1,
                launchOptions,
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
