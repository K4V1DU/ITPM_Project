// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'html',

  use: {
    headless: false,   // show the browser
    slowMo: 8000,       // slow down so you can watch
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome',  // use your installed Chrome
      },
    },
  ],

});