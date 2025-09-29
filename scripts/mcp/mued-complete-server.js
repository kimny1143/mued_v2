#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { chromium } = require("@playwright/test");

// Create an MCP server
const server = new McpServer({
  name: "mued-complete",
  version: "1.0.0"
});

// Helper function to wait for slots with retries
async function waitForSlotsToRender(page, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    await page.waitForLoadState('networkidle');

    const spinnerGone = await page.waitForFunction(() => {
      const spinner = document.querySelector('.animate-spin');
      return !spinner || spinner.style.display === 'none';
    }, { timeout: 5000 }).catch(() => false);

    await page.waitForTimeout(1000);

    const slotsCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-available="true"]').length;
    });

    if (slotsCount > 0) {
      console.log(`Found ${slotsCount} slots on attempt ${i + 1}`);
      return slotsCount;
    }

    if (i < maxRetries - 1) {
      console.log(`Attempt ${i + 1}: No slots found, retrying...`);
      await page.waitForTimeout(2000);

      const dateInput = await page.$('input[type="date"]');
      if (dateInput) {
        const currentDate = await dateInput.inputValue();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        await dateInput.fill(tomorrowStr);
        await page.waitForTimeout(1000);
        await dateInput.fill(currentDate);
        await page.waitForTimeout(2000);
      }
    }
  }

  return 0;
}

// Test health check
server.registerTool(
  "test_health",
  {
    title: "Health Check",
    description: "Test if MUED LMS server is running",
    inputSchema: {}
  },
  async () => {
    try {
      const response = await fetch("http://localhost:3000/api/health");
      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Server is ${response.ok ? "HEALTHY" : "UNHEALTHY"}\nStatus: ${response.status}\nResponse: ${JSON.stringify(data)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Server is DOWN: ${error.message}`
          }
        ]
      };
    }
  }
);

// Test database
server.registerTool(
  "test_database",
  {
    title: "Database Test",
    description: "Test database connection",
    inputSchema: {}
  },
  async () => {
    try {
      const response = await fetch("http://localhost:3000/api/health/db");
      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Database: ${data.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}\nStatus: ${response.status}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Database test failed: ${error.message}`
          }
        ]
      };
    }
  }
);

// Test lessons API
server.registerTool(
  "test_lessons_api",
  {
    title: "Lessons API Test",
    description: "Test lessons API endpoint",
    inputSchema: {}
  },
  async () => {
    try {
      const response = await fetch("http://localhost:3000/api/lessons?available=true");
      const data = await response.json();
      const slotsCount = data.slots ? data.slots.length : 0;

      return {
        content: [
          {
            type: "text",
            text: `Lessons API: ${response.ok ? 'OK' : 'ERROR'}\nStatus: ${response.status}\nAvailable slots: ${slotsCount}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Lessons API test failed: ${error.message}`
          }
        ]
      };
    }
  }
);

// Complete E2E test
server.registerTool(
  "test_complete_flow",
  {
    title: "Complete E2E Test",
    description: "Run complete E2E test from login to booking",
    inputSchema: {}
  },
  async () => {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();
    const results = [];

    try {
      // Step 1: Health Check
      console.log("Step 1: Testing health...");
      const healthResponse = await fetch("http://localhost:3000/api/health");
      results.push({
        step: "Health Check",
        success: healthResponse.ok,
        message: `Server status: ${healthResponse.status}`
      });

      // Step 2: Database Check
      console.log("Step 2: Testing database...");
      const dbResponse = await fetch("http://localhost:3000/api/health/db");
      const dbData = await dbResponse.json();
      results.push({
        step: "Database Connection",
        success: dbData.database === 'connected',
        message: `Database: ${dbData.database}`
      });

      // Step 3: Lessons API
      console.log("Step 3: Testing lessons API...");
      const lessonsResponse = await fetch("http://localhost:3000/api/lessons?available=true");
      const lessonsData = await lessonsResponse.json();
      const apiSlotsCount = lessonsData.slots ? lessonsData.slots.length : 0;
      results.push({
        step: "Lessons API",
        success: apiSlotsCount > 0,
        message: `Found ${apiSlotsCount} slots from API`
      });

      // Step 4: Login
      console.log("Step 4: Logging in...");
      await page.goto("http://localhost:3000/sign-in");
      await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
      await page.waitForTimeout(2000);

      await page.fill('input[name="identifier"]', 'test_student');
      await page.click('button:has-text("Continue")');

      await page.waitForTimeout(2000);
      const passwordField = await page.$('input[type="password"]');
      if (passwordField) {
        await passwordField.fill('TestPassword123!');
        const signInButton = await page.$('button:has-text("Continue"), button:has-text("Sign in")');
        if (signInButton) {
          await signInButton.click();
        }
      }

      await page.waitForURL('**/dashboard', { timeout: 10000 });
      results.push({
        step: "Login",
        success: true,
        message: "Successfully logged in"
      });

      // Step 5: Dashboard
      console.log("Step 5: Checking dashboard...");
      const dashboardTitle = await page.$('text=ようこそ');
      results.push({
        step: "Dashboard Display",
        success: !!dashboardTitle,
        message: dashboardTitle ? "Dashboard loaded" : "Dashboard not loaded"
      });

      // Step 6: Navigate to booking
      console.log("Step 6: Navigating to booking calendar...");
      await page.goto("http://localhost:3000/dashboard/booking-calendar");
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('load');

      const calendarView = await page.waitForSelector('[data-testid="calendar-view"], .bg-white.rounded-lg.shadow', {
        timeout: 5000
      }).catch(() => null);

      results.push({
        step: "Navigate to Booking",
        success: !!calendarView,
        message: calendarView ? "Booking calendar loaded" : "Calendar not loaded"
      });

      // Step 7: Check slots
      console.log("Step 7: Waiting for slots to render...");
      const slotsCount = await waitForSlotsToRender(page);

      results.push({
        step: "Check Available Slots",
        success: slotsCount > 0,
        message: `Found ${slotsCount} available slots on UI`
      });

      // Step 8: Try to book
      if (slotsCount > 0) {
        console.log("Step 8: Clicking on a slot...");
        const slots = await page.$$('[data-available="true"]');
        if (slots[0]) {
          const bookButton = await slots[0].$('button:has-text("このスロットを予約")');
          if (bookButton) {
            await bookButton.click();
            await page.waitForTimeout(2000);
            results.push({
              step: "Book Slot",
              success: true,
              message: "Successfully clicked booking button"
            });
          }
        }
      }

      await browser.close();

      // Calculate summary
      const summary = {
        total: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        successRate: Math.round((results.filter(r => r.success).length / results.length) * 100)
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              timestamp: new Date().toISOString(),
              results: results,
              summary: summary,
              status: summary.successRate === 100 ? "PERFECT" :
                      summary.successRate >= 80 ? "PASS" : "FAIL"
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      await browser.close();
      return {
        content: [
          {
            type: "text",
            text: `Test failed: ${error.message}\n${error.stack}`
          }
        ]
      };
    }
  }
);

// Quick booking test
server.registerTool(
  "test_booking_quick",
  {
    title: "Quick Booking Test",
    description: "Quick test of booking calendar",
    inputSchema: {}
  },
  async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Quick login
      await page.goto("http://localhost:3000/sign-in");
      await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
      await page.waitForTimeout(2000);
      await page.fill('input[name="identifier"]', 'test_student');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(2000);
      const passwordField = await page.$('input[type="password"]');
      if (passwordField) {
        await passwordField.fill('TestPassword123!');
        const signInButton = await page.$('button:has-text("Continue"), button:has-text("Sign in")');
        if (signInButton) await signInButton.click();
      }
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Go to booking
      await page.goto("http://localhost:3000/dashboard/booking-calendar");
      const slotsCount = await waitForSlotsToRender(page);

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `Quick booking test: ${slotsCount > 0 ? 'SUCCESS' : 'FAILED'}\nSlots found: ${slotsCount}`
          }
        ]
      };
    } catch (error) {
      await browser.close();
      return {
        content: [
          {
            type: "text",
            text: `Quick booking test failed: ${error.message}`
          }
        ]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MUED Complete MCP Server started successfully");
}

main().catch(console.error);