#!/usr/bin/env node
const { z } = require("zod");

// Import shared utilities
const {
  PROJECT_ROOT,
  getTimestamp,
  ensureReportsDir,
  createMcpServer,
  startMcpServer,
  loadEnvSilently,
  execAsync,
  fs,
  path
} = require("./mcp-utils");

// Load .env.test silently (suppress ALL dotenv output that breaks MCP JSON protocol)
loadEnvSilently(path.join(PROJECT_ROOT, '.env.test'));

// Create an MCP server for Playwright E2E tests
const server = createMcpServer("mued-playwright-e2e", "1.0.0");

// Helper function to parse Playwright JSON report
async function parsePlaywrightResults(jsonPath) {
  try {
    const data = await fs.readFile(jsonPath, 'utf-8');
    const report = JSON.parse(data);

    const stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      failures: []
    };

    // Parse test results
    if (report.suites) {
      for (const suite of report.suites) {
        for (const spec of suite.specs || []) {
          stats.total++;

          for (const test of spec.tests || []) {
            const result = test.results?.[0];
            if (result) {
              stats.duration += result.duration || 0;

              if (result.status === 'passed') {
                stats.passed++;
              } else if (result.status === 'failed') {
                stats.failed++;
                stats.failures.push({
                  title: spec.title,
                  error: result.error?.message || 'Unknown error',
                  file: suite.file,
                  line: spec.line
                });
              } else if (result.status === 'skipped') {
                stats.skipped++;
              }
            }
          }
        }
      }
    }

    return stats;
  } catch (error) {
    console.error(`Failed to parse Playwright results: ${error.message}`);
    return null;
  }
}

// Helper function to generate markdown report
async function generateMarkdownReport(stats, output, timestamp) {
  const reportsDir = await ensureReportsDir();
  const reportPath = path.join(reportsDir, `e2e-${timestamp}.md`);

  let markdown = `# E2E Test Report

**Generated:** ${new Date().toLocaleString()}
**Test Framework:** Playwright
**Total Tests:** ${stats.total}
**Duration:** ${(stats.duration / 1000).toFixed(2)}s

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Passed | ${stats.passed} | ${((stats.passed / stats.total) * 100).toFixed(1)}% |
| ❌ Failed | ${stats.failed} | ${((stats.failed / stats.total) * 100).toFixed(1)}% |
| ⏭️ Skipped | ${stats.skipped} | ${((stats.skipped / stats.total) * 100).toFixed(1)}% |

`;

  if (stats.failures.length > 0) {
    markdown += `## Failed Tests\n\n`;
    for (const failure of stats.failures) {
      markdown += `### ❌ ${failure.title}\n`;
      markdown += `- **File:** \`${failure.file}\`\n`;
      if (failure.line) {
        markdown += `- **Line:** ${failure.line}\n`;
      }
      markdown += `- **Error:** ${failure.error}\n\n`;
    }
  }

  markdown += `## Console Output\n\n\`\`\`\n${output}\n\`\`\`\n`;

  markdown += `\n## Report Files\n\n`;
  markdown += `- HTML Report: \`npx playwright show-report\`\n`;
  markdown += `- JSON Report: \`test-results.json\`\n`;
  markdown += `- This Report: \`${reportPath}\`\n`;

  try {
    await fs.writeFile(reportPath, markdown, 'utf-8');
    return { markdown, reportPath };
  } catch (error) {
    console.error(`Failed to write markdown report: ${error.message}`);
    return { markdown, reportPath: null };
  }
}

// Tool: Run all E2E tests (with parallelization to avoid timeout)
server.registerTool(
  "run_all_e2e_tests",
  {
    title: "Run All E2E Tests",
    description: "Execute all Playwright E2E tests in parallel batches to avoid Claude Desktop 4-minute timeout. Runs each test file separately and aggregates results.",
    inputSchema: {}
  },
  async () => {
    const timestamp = getTimestamp();

    try {
      // Run Playwright tests with --max-failures to stop early if many tests fail
      // Use --shard to split tests into smaller chunks
      const configPath = path.join(PROJECT_ROOT, 'playwright.config.ts');
      const { stdout, stderr } = await execAsync(
        `npx playwright test --config="${configPath}" --reporter=json,html,list --max-failures=5 --timeout=30000`,
        {
          cwd: PROJECT_ROOT,
          env: {
            ...process.env,
            CI: 'false',
            NEXT_PUBLIC_E2E_TEST_MODE: 'true' // Bypass Clerk auth for E2E tests
          },
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 180000 // 3 minutes timeout (within Claude Desktop limit)
        }
      );

      const output = stdout + (stderr ? `\n\nStderr:\n${stderr}` : '');

      // Parse JSON results
      const resultsPath = path.join(PROJECT_ROOT, 'test-results.json');
      const stats = await parsePlaywrightResults(resultsPath);

      if (!stats) {
        // Fallback: parse from stdout
        const passedMatch = output.match(/(\d+) passed/);
        const failedMatch = output.match(/(\d+) failed/);
        const skippedMatch = output.match(/(\d+) skipped/);

        const fallbackStats = {
          total: 0,
          passed: passedMatch ? parseInt(passedMatch[1]) : 0,
          failed: failedMatch ? parseInt(failedMatch[1]) : 0,
          skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
          duration: 0,
          failures: []
        };
        fallbackStats.total = fallbackStats.passed + fallbackStats.failed + fallbackStats.skipped;

        const { markdown } = await generateMarkdownReport(fallbackStats, output, timestamp);

        return {
          content: [
            {
              type: "text",
              text: markdown
            }
          ]
        };
      }

      // Generate markdown report
      const { markdown, reportPath } = await generateMarkdownReport(stats, output, timestamp);

      return {
        content: [
          {
            type: "text",
            text: markdown
          }
        ]
      };
    } catch (error) {
      // Tests failed, but we still want to generate a report
      const output = error.stdout || error.message;
      const stderr = error.stderr || '';

      const resultsPath = path.join(PROJECT_ROOT, 'test-results.json');
      const stats = await parsePlaywrightResults(resultsPath);

      if (!stats) {
        return {
          content: [
            {
              type: "text",
              text: `# E2E Test Execution Failed\n\n**Error:** ${error.message}\n\n## Output\n\`\`\`\n${output}\n${stderr}\n\`\`\``
            }
          ]
        };
      }

      const { markdown } = await generateMarkdownReport(stats, output + '\n' + stderr, timestamp);

      return {
        content: [
          {
            type: "text",
            text: markdown
          }
        ]
      };
    }
  }
);

// Tool: Run specific E2E test file
server.registerTool(
  "run_specific_e2e_test",
  {
    title: "Run Specific E2E Test",
    description: "Execute a specific Playwright test file",
    inputSchema: {
      testFile: z.string().describe("Test file name or path (e.g., 'mued-improved.spec.ts')")
    }
  },
  async ({ testFile }) => {
    const timestamp = getTimestamp();

    try {
      // Ensure test file exists
      const testPath = testFile.includes('/') ? testFile : `tests/${testFile}`;

      // Run specific test
      const configPath = path.join(PROJECT_ROOT, 'playwright.config.ts');
      const { stdout, stderr } = await execAsync(
        `npx playwright test --config="${configPath}" ${testPath} --reporter=json,list --timeout=30000`,
        {
          cwd: PROJECT_ROOT,
          env: {
            ...process.env,
            CI: 'false',
            NEXT_PUBLIC_E2E_TEST_MODE: 'true'
          },
          maxBuffer: 10 * 1024 * 1024,
          timeout: 180000 // 3 minutes timeout (within Claude Desktop limit)
        }
      );

      const output = stdout + (stderr ? `\n\nStderr:\n${stderr}` : '');

      // Parse results
      const resultsPath = path.join(PROJECT_ROOT, 'test-results.json');
      const stats = await parsePlaywrightResults(resultsPath);

      let markdown = `# E2E Test Report - ${testFile}\n\n`;
      markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
      markdown += `**Test File:** \`${testPath}\`\n\n`;

      if (stats) {
        markdown += `## Results\n\n`;
        markdown += `- ✅ Passed: ${stats.passed}\n`;
        markdown += `- ❌ Failed: ${stats.failed}\n`;
        markdown += `- ⏭️ Skipped: ${stats.skipped}\n`;
        markdown += `- ⏱️ Duration: ${(stats.duration / 1000).toFixed(2)}s\n\n`;

        if (stats.failures.length > 0) {
          markdown += `## Failed Tests\n\n`;
          for (const failure of stats.failures) {
            markdown += `### ${failure.title}\n`;
            markdown += `\`\`\`\n${failure.error}\n\`\`\`\n\n`;
          }
        }
      }

      markdown += `## Output\n\n\`\`\`\n${output}\n\`\`\``;

      return {
        content: [
          {
            type: "text",
            text: markdown
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `# Test Execution Failed\n\n**Test File:** ${testFile}\n**Error:** ${error.message}\n\n## Output\n\`\`\`\n${error.stdout || ''}\n${error.stderr || ''}\n\`\`\``
          }
        ]
      };
    }
  }
);

// Tool: Run E2E test suite
server.registerTool(
  "run_e2e_suite",
  {
    title: "Run E2E Test Suite",
    description: "Execute a specific test suite (auth, booking, materials, dashboard)",
    inputSchema: {
      suite: z.enum(["auth", "booking", "materials", "dashboard", "all"])
        .describe("Test suite to run")
    }
  },
  async ({ suite }) => {
    const timestamp = getTimestamp();

    // Define grep patterns for each suite
    const suitePatterns = {
      auth: 'Authentication|Login|Logout|Sign',
      booking: 'Booking|Reservation|Schedule',
      materials: 'Material|Resource|Upload',
      dashboard: 'Dashboard|Overview|Statistics',
      all: ''
    };

    const pattern = suitePatterns[suite];
    const grepFlag = pattern ? `--grep "${pattern}"` : '';

    try {
      const configPath = path.join(PROJECT_ROOT, 'playwright.config.ts');
      const { stdout, stderr } = await execAsync(
        `npx playwright test --config="${configPath}" ${grepFlag} --reporter=json,list --timeout=30000`,
        {
          cwd: PROJECT_ROOT,
          env: {
            ...process.env,
            CI: 'false',
            NEXT_PUBLIC_E2E_TEST_MODE: 'true'
          },
          maxBuffer: 10 * 1024 * 1024,
          timeout: 180000 // 3 minutes timeout (within Claude Desktop limit)
        }
      );

      const output = stdout + (stderr ? `\n\nStderr:\n${stderr}` : '');
      const resultsPath = path.join(PROJECT_ROOT, 'test-results.json');
      const stats = await parsePlaywrightResults(resultsPath);

      let markdown = `# E2E Test Suite Report - ${suite.toUpperCase()}\n\n`;
      markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
      markdown += `**Suite:** ${suite}\n`;
      if (pattern) {
        markdown += `**Pattern:** \`${pattern}\`\n`;
      }
      markdown += `\n`;

      if (stats) {
        markdown += `## Summary\n\n`;
        markdown += `- ✅ Passed: ${stats.passed}\n`;
        markdown += `- ❌ Failed: ${stats.failed}\n`;
        markdown += `- ⏭️ Skipped: ${stats.skipped}\n`;
        markdown += `- ⏱️ Duration: ${(stats.duration / 1000).toFixed(2)}s\n\n`;

        if (stats.failures.length > 0) {
          markdown += `## Failed Tests\n\n`;
          for (const failure of stats.failures) {
            markdown += `### ${failure.title}\n`;
            markdown += `- File: \`${failure.file}\`\n`;
            markdown += `- Error: ${failure.error}\n\n`;
          }
        }
      }

      markdown += `## Console Output\n\n\`\`\`\n${output}\n\`\`\``;

      // Save report
      const reportsDir = await ensureReportsDir();
      const reportPath = path.join(reportsDir, `e2e-suite-${suite}-${timestamp}.md`);
      await fs.writeFile(reportPath, markdown, 'utf-8');

      return {
        content: [
          {
            type: "text",
            text: markdown
          }
        ]
      };
    } catch (error) {
      const output = error.stdout || error.message;
      const stderr = error.stderr || '';

      return {
        content: [
          {
            type: "text",
            text: `# Suite Execution Failed\n\n**Suite:** ${suite}\n**Error:** ${error.message}\n\n## Output\n\`\`\`\n${output}\n${stderr}\n\`\`\``
          }
        ]
      };
    }
  }
);

// Tool: Run E2E tests by file (for avoiding timeout)
server.registerTool(
  "run_e2e_by_file",
  {
    title: "Run E2E Tests by File List",
    description: "Run specific test files one by one to avoid Claude Desktop timeout. Useful for running full suite in batches.",
    inputSchema: {
      files: z.array(z.string()).describe("Array of test file names (e.g., ['mued-improved.spec.ts', 'api-endpoints.spec.ts'])")
    }
  },
  async ({ files }) => {
    const timestamp = getTimestamp();
    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const file of files) {
      try {
        const testPath = file.includes('/') ? file : `tests/${file}`;
        const configPath = path.join(PROJECT_ROOT, 'playwright.config.ts');

        const { stdout, stderr } = await execAsync(
          `npx playwright test --config="${configPath}" ${testPath} --reporter=json,list --timeout=30000`,
          {
            cwd: PROJECT_ROOT,
            env: {
              ...process.env,
              CI: 'false',
              NEXT_PUBLIC_E2E_TEST_MODE: 'true'
            },
            maxBuffer: 10 * 1024 * 1024,
            timeout: 120000 // 2 minutes per file
          }
        );

        const output = stdout + (stderr ? `\n${stderr}` : '');

        // Parse results
        const passedMatch = output.match(/(\d+) passed/);
        const failedMatch = output.match(/(\d+) failed/);
        const skippedMatch = output.match(/(\d+) skipped/);

        const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;

        totalPassed += passed;
        totalFailed += failed;
        totalSkipped += skipped;

        results.push({
          file,
          passed,
          failed,
          skipped,
          status: failed === 0 ? '✅' : '❌'
        });
      } catch (error) {
        results.push({
          file,
          passed: 0,
          failed: 1,
          skipped: 0,
          status: '❌',
          error: error.message
        });
        totalFailed++;
      }
    }

    // Generate summary
    let markdown = `# E2E Test Results - Batch Execution\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
    markdown += `**Files Tested:** ${files.length}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- ✅ Total Passed: ${totalPassed}\n`;
    markdown += `- ❌ Total Failed: ${totalFailed}\n`;
    markdown += `- ⏭️ Total Skipped: ${totalSkipped}\n\n`;
    markdown += `## Results by File\n\n`;

    for (const result of results) {
      markdown += `### ${result.status} ${result.file}\n`;
      markdown += `- Passed: ${result.passed}\n`;
      markdown += `- Failed: ${result.failed}\n`;
      markdown += `- Skipped: ${result.skipped}\n`;
      if (result.error) {
        markdown += `- Error: ${result.error}\n`;
      }
      markdown += `\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: markdown
        }
      ]
    };
  }
);

// Tool: Generate E2E coverage report
server.registerTool(
  "generate_e2e_report",
  {
    title: "Generate E2E Report",
    description: "Generate and display E2E test coverage report",
    inputSchema: {}
  },
  async () => {
    try {
      // Check if test-results.json exists
      const resultsPath = path.join(process.cwd(), 'test-results.json');
      const htmlReportPath = path.join(process.cwd(), 'playwright-report', 'index.html');

      let hasResults = false;
      let hasHtmlReport = false;

      try {
        await fs.access(resultsPath);
        hasResults = true;
      } catch {}

      try {
        await fs.access(htmlReportPath);
        hasHtmlReport = true;
      } catch {}

      let markdown = `# E2E Test Reports\n\n`;
      markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

      if (hasResults) {
        const stats = await parsePlaywrightResults(resultsPath);
        if (stats) {
          markdown += `## Last Test Run Summary\n\n`;
          markdown += `- Total Tests: ${stats.total}\n`;
          markdown += `- ✅ Passed: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(1)}%)\n`;
          markdown += `- ❌ Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)\n`;
          markdown += `- ⏭️ Skipped: ${stats.skipped}\n`;
          markdown += `- ⏱️ Duration: ${(stats.duration / 1000).toFixed(2)}s\n\n`;
        }
      } else {
        markdown += `⚠️ No test results found. Run tests first using \`run_all_e2e_tests\`.\n\n`;
      }

      if (hasHtmlReport) {
        markdown += `## View HTML Report\n\n`;
        markdown += `Run the following command to view the interactive HTML report:\n\n`;
        markdown += `\`\`\`bash\nnpx playwright show-report\n\`\`\`\n\n`;
      }

      // List existing reports
      const reportsDir = path.join(process.cwd(), 'tests', 'reports');
      try {
        const files = await fs.readdir(reportsDir);
        const e2eReports = files.filter(f => f.startsWith('e2e-') && f.endsWith('.md'));

        if (e2eReports.length > 0) {
          markdown += `## Previous Reports\n\n`;
          for (const report of e2eReports.sort().reverse().slice(0, 10)) {
            markdown += `- \`${report}\`\n`;
          }
        }
      } catch {}

      return {
        content: [
          {
            type: "text",
            text: markdown
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error generating report: ${error.message}`
          }
        ]
      };
    }
  }
);

// Main function
async function main() {
  await startMcpServer(server, "MCP Playwright E2E Server");
}

main().catch(console.error);