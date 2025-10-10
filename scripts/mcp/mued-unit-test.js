#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");

const execAsync = promisify(exec);

// Project root directory (where this script is located: /scripts/mcp/)
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Create an MCP server for Unit tests
const server = new McpServer({
  name: "mued-unit-test",
  version: "1.0.0"
});

// Helper function to generate timestamp
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

// Helper function to ensure reports directory exists
async function ensureReportsDir() {
  const reportsDir = path.join(PROJECT_ROOT, 'tests', 'reports');
  try {
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create reports directory: ${error.message}`);
  }
  return reportsDir;
}

// Helper function to parse Vitest output
function parseVitestOutput(output) {
  const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    failures: []
  };

  // Parse test counts
  const passedMatch = output.match(/✓\s+(\d+)\s+test/);
  const failedMatch = output.match(/✗\s+(\d+)\s+test/);
  const skippedMatch = output.match(/↓\s+(\d+)\s+test/);
  const durationMatch = output.match(/Duration\s+([\d.]+)s/i);
  const timeMatch = output.match(/Time:\s+([\d.]+)s/i);

  if (passedMatch) stats.passed = parseInt(passedMatch[1]);
  if (failedMatch) stats.failed = parseInt(failedMatch[1]);
  if (skippedMatch) stats.skipped = parseInt(skippedMatch[1]);

  stats.total = stats.passed + stats.failed + stats.skipped;

  if (durationMatch) {
    stats.duration = parseFloat(durationMatch[1]) * 1000;
  } else if (timeMatch) {
    stats.duration = parseFloat(timeMatch[1]) * 1000;
  }

  // Parse failure details
  const failureRegex = /FAIL\s+([^\s]+)\s+>(.+?)(?=\n\s*(?:FAIL|✓|✗|$))/gs;
  let match;
  while ((match = failureRegex.exec(output)) !== null) {
    const [, file, details] = match;

    // Extract test name and error from details
    const errorMatch = details.match(/>\s*(.+?)\n[\s\S]*?Error:\s*(.+?)(?:\n|$)/);
    if (errorMatch) {
      stats.failures.push({
        file: file.trim(),
        test: errorMatch[1].trim(),
        error: errorMatch[2].trim()
      });
    }
  }

  return stats;
}

// Helper function to parse coverage output
function parseCoverageOutput(output) {
  const coverage = {
    statements: { pct: 0, covered: 0, total: 0 },
    branches: { pct: 0, covered: 0, total: 0 },
    functions: { pct: 0, covered: 0, total: 0 },
    lines: { pct: 0, covered: 0, total: 0 }
  };

  // Parse coverage summary
  const stmtMatch = output.match(/Statements\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);
  const branchMatch = output.match(/Branches\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);
  const funcMatch = output.match(/Functions\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);
  const lineMatch = output.match(/Lines\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);

  if (stmtMatch) {
    coverage.statements = {
      pct: parseFloat(stmtMatch[1]),
      covered: parseInt(stmtMatch[2]),
      total: parseInt(stmtMatch[3])
    };
  }

  if (branchMatch) {
    coverage.branches = {
      pct: parseFloat(branchMatch[1]),
      covered: parseInt(branchMatch[2]),
      total: parseInt(branchMatch[3])
    };
  }

  if (funcMatch) {
    coverage.functions = {
      pct: parseFloat(funcMatch[1]),
      covered: parseInt(funcMatch[2]),
      total: parseInt(funcMatch[3])
    };
  }

  if (lineMatch) {
    coverage.lines = {
      pct: parseFloat(lineMatch[1]),
      covered: parseInt(lineMatch[2]),
      total: parseInt(lineMatch[3])
    };
  }

  return coverage;
}

// Helper function to generate markdown report
async function generateMarkdownReport(stats, coverage, output, timestamp) {
  const reportsDir = await ensureReportsDir();
  const reportPath = path.join(reportsDir, `unit-${timestamp}.md`);

  let markdown = `# Unit Test Report

**Generated:** ${new Date().toLocaleString()}
**Test Framework:** Vitest
**Total Tests:** ${stats.total}
**Duration:** ${(stats.duration / 1000).toFixed(2)}s

## Test Results

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Passed | ${stats.passed} | ${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}% |
| ❌ Failed | ${stats.failed} | ${stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}% |
| ⏭️ Skipped | ${stats.skipped} | ${stats.total > 0 ? ((stats.skipped / stats.total) * 100).toFixed(1) : 0}% |

`;

  // Add coverage section if available
  if (coverage && coverage.lines.total > 0) {
    markdown += `## Code Coverage

| Type | Coverage | Covered/Total | Threshold |
|------|----------|---------------|-----------|
| Lines | ${coverage.lines.pct.toFixed(2)}% | ${coverage.lines.covered}/${coverage.lines.total} | ${coverage.lines.pct >= 70 ? '✅' : '⚠️'} 70% |
| Statements | ${coverage.statements.pct.toFixed(2)}% | ${coverage.statements.covered}/${coverage.statements.total} | ${coverage.statements.pct >= 70 ? '✅' : '⚠️'} 70% |
| Functions | ${coverage.functions.pct.toFixed(2)}% | ${coverage.functions.covered}/${coverage.functions.total} | ${coverage.functions.pct >= 70 ? '✅' : '⚠️'} 70% |
| Branches | ${coverage.branches.pct.toFixed(2)}% | ${coverage.branches.covered}/${coverage.branches.total} | ${coverage.branches.pct >= 70 ? '✅' : '⚠️'} 70% |

`;

    // Add coverage warnings
    const belowThreshold = [];
    if (coverage.lines.pct < 70) belowThreshold.push('Lines');
    if (coverage.statements.pct < 70) belowThreshold.push('Statements');
    if (coverage.functions.pct < 70) belowThreshold.push('Functions');
    if (coverage.branches.pct < 70) belowThreshold.push('Branches');

    if (belowThreshold.length > 0) {
      markdown += `### ⚠️ Coverage Warnings\n\n`;
      markdown += `The following coverage metrics are below the 70% threshold:\n`;
      markdown += belowThreshold.map(metric => `- ${metric}`).join('\n');
      markdown += `\n\n`;
    }
  }

  // Add failures section
  if (stats.failures.length > 0) {
    markdown += `## Failed Tests\n\n`;
    for (const failure of stats.failures) {
      markdown += `### ❌ ${failure.test}\n`;
      markdown += `- **File:** \`${failure.file}\`\n`;
      markdown += `- **Error:** ${failure.error}\n\n`;
    }
  }

  // Add console output
  markdown += `## Console Output\n\n\`\`\`\n${output}\n\`\`\`\n`;

  // Add report files section
  markdown += `\n## Report Files\n\n`;
  markdown += `- HTML Coverage Report: \`coverage/index.html\`\n`;
  markdown += `- JSON Coverage Report: \`coverage/coverage-final.json\`\n`;
  markdown += `- Test Results: \`test-results/index.html\`\n`;
  markdown += `- This Report: \`${reportPath}\`\n`;

  try {
    await fs.writeFile(reportPath, markdown, 'utf-8');
    return { markdown, reportPath };
  } catch (error) {
    console.error(`Failed to write markdown report: ${error.message}`);
    return { markdown, reportPath: null };
  }
}

// Tool: Run all unit tests
server.registerTool(
  "run_unit_tests",
  {
    title: "Run Unit Tests",
    description: "Execute all unit tests with Vitest and generate coverage report",
    inputSchema: {}
  },
  async () => {
    const timestamp = getTimestamp();

    try {
      // Run Vitest with coverage
      const { stdout, stderr } = await execAsync(
        'npx vitest run --coverage',
        {
          cwd: PROJECT_ROOT,
          env: { ...process.env, CI: 'true' },
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }
      );

      const output = stdout + (stderr ? `\n\nStderr:\n${stderr}` : '');

      // Parse test results
      const stats = parseVitestOutput(output);

      // Parse coverage results
      const coverage = parseCoverageOutput(output);

      // Generate markdown report
      const { markdown } = await generateMarkdownReport(stats, coverage, output, timestamp);

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
      const output = (error.stdout || '') + (error.stderr ? `\n\nStderr:\n${error.stderr}` : '');

      // Parse what we can from the output
      const stats = parseVitestOutput(output);
      const coverage = parseCoverageOutput(output);

      const { markdown } = await generateMarkdownReport(stats, coverage, output, timestamp);

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

// Tool: Run specific test file
server.registerTool(
  "run_test_file",
  {
    title: "Run Test File",
    description: "Execute a specific test file with Vitest",
    inputSchema: {
      filePath: z.string().describe("Path to test file (e.g., 'lib/utils.test.ts')")
    }
  },
  async ({ filePath }) => {
    const timestamp = getTimestamp();

    try {
      // Run specific test file
      const { stdout, stderr } = await execAsync(
        `npx vitest run ${filePath}`,
        {
          cwd: PROJECT_ROOT,
          env: { ...process.env, CI: 'true' },
          maxBuffer: 10 * 1024 * 1024
        }
      );

      const output = stdout + (stderr ? `\n\nStderr:\n${stderr}` : '');

      // Parse test results
      const stats = parseVitestOutput(output);

      let markdown = `# Unit Test Report - ${path.basename(filePath)}\n\n`;
      markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
      markdown += `**Test File:** \`${filePath}\`\n\n`;

      markdown += `## Results\n\n`;
      markdown += `- ✅ Passed: ${stats.passed}\n`;
      markdown += `- ❌ Failed: ${stats.failed}\n`;
      markdown += `- ⏭️ Skipped: ${stats.skipped}\n`;
      markdown += `- ⏱️ Duration: ${(stats.duration / 1000).toFixed(2)}s\n\n`;

      if (stats.failures.length > 0) {
        markdown += `## Failed Tests\n\n`;
        for (const failure of stats.failures) {
          markdown += `### ${failure.test}\n`;
          markdown += `\`\`\`\n${failure.error}\n\`\`\`\n\n`;
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
      const output = (error.stdout || '') + (error.stderr ? `\n\n${error.stderr}` : '');

      return {
        content: [
          {
            type: "text",
            text: `# Test Execution Failed\n\n**Test File:** ${filePath}\n**Error:** ${error.message}\n\n## Output\n\`\`\`\n${output}\n\`\`\``
          }
        ]
      };
    }
  }
);

// Tool: Run coverage report only
server.registerTool(
  "run_coverage_report",
  {
    title: "Generate Coverage Report",
    description: "Generate code coverage report without running tests",
    inputSchema: {}
  },
  async () => {
    try {
      // Check if coverage data exists
      const coveragePath = path.join(PROJECT_ROOT, 'coverage');
      let hasCoverage = false;

      try {
        await fs.access(coveragePath);
        hasCoverage = true;
      } catch {}

      if (!hasCoverage) {
        // Run tests with coverage to generate data
        const { stdout, stderr } = await execAsync(
          'npx vitest run --coverage',
          {
            cwd: PROJECT_ROOT,
            env: { ...process.env, CI: 'true' },
            maxBuffer: 10 * 1024 * 1024
          }
        );

        const output = stdout + (stderr ? `\n\nStderr:\n${stderr}` : '');
        const coverage = parseCoverageOutput(output);

        let markdown = `# Coverage Report\n\n`;
        markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

        if (coverage && coverage.lines.total > 0) {
          markdown += `## Code Coverage Summary\n\n`;
          markdown += `| Type | Coverage | Covered/Total | Status |\n`;
          markdown += `|------|----------|---------------|--------|\n`;
          markdown += `| Lines | ${coverage.lines.pct.toFixed(2)}% | ${coverage.lines.covered}/${coverage.lines.total} | ${coverage.lines.pct >= 70 ? '✅' : '⚠️ Below threshold'} |\n`;
          markdown += `| Statements | ${coverage.statements.pct.toFixed(2)}% | ${coverage.statements.covered}/${coverage.statements.total} | ${coverage.statements.pct >= 70 ? '✅' : '⚠️ Below threshold'} |\n`;
          markdown += `| Functions | ${coverage.functions.pct.toFixed(2)}% | ${coverage.functions.covered}/${coverage.functions.total} | ${coverage.functions.pct >= 70 ? '✅' : '⚠️ Below threshold'} |\n`;
          markdown += `| Branches | ${coverage.branches.pct.toFixed(2)}% | ${coverage.branches.covered}/${coverage.branches.total} | ${coverage.branches.pct >= 70 ? '✅' : '⚠️ Below threshold'} |\n\n`;

          // Check thresholds
          const avgCoverage = (coverage.lines.pct + coverage.statements.pct + coverage.functions.pct + coverage.branches.pct) / 4;

          if (avgCoverage >= 70) {
            markdown += `### ✅ Coverage meets threshold requirements\n\n`;
          } else {
            markdown += `### ⚠️ Coverage is below 70% threshold\n\n`;
            markdown += `Average coverage: ${avgCoverage.toFixed(2)}%\n\n`;
          }
        }

        markdown += `## View Reports\n\n`;
        markdown += `- HTML Report: Open \`coverage/index.html\` in your browser\n`;
        markdown += `- JSON Report: \`coverage/coverage-final.json\`\n`;
        markdown += `- LCOV Report: \`coverage/lcov.info\`\n\n`;

        markdown += `## Console Output\n\n\`\`\`\n${output}\n\`\`\``;

        return {
          content: [
            {
              type: "text",
              text: markdown
            }
          ]
        };
      } else {
        // Read existing coverage summary
        try {
          const summaryPath = path.join(coveragePath, 'coverage-summary.json');
          const summaryData = await fs.readFile(summaryPath, 'utf-8');
          const summary = JSON.parse(summaryData);

          let markdown = `# Coverage Report (Cached)\n\n`;
          markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

          if (summary.total) {
            const total = summary.total;
            markdown += `## Code Coverage Summary\n\n`;
            markdown += `| Type | Coverage | Covered/Total | Status |\n`;
            markdown += `|------|----------|---------------|--------|\n`;
            markdown += `| Lines | ${total.lines.pct.toFixed(2)}% | ${total.lines.covered}/${total.lines.total} | ${total.lines.pct >= 70 ? '✅' : '⚠️'} |\n`;
            markdown += `| Statements | ${total.statements.pct.toFixed(2)}% | ${total.statements.covered}/${total.statements.total} | ${total.statements.pct >= 70 ? '✅' : '⚠️'} |\n`;
            markdown += `| Functions | ${total.functions.pct.toFixed(2)}% | ${total.functions.covered}/${total.functions.total} | ${total.functions.pct >= 70 ? '✅' : '⚠️'} |\n`;
            markdown += `| Branches | ${total.branches.pct.toFixed(2)}% | ${total.branches.covered}/${total.branches.total} | ${total.branches.pct >= 70 ? '✅' : '⚠️'} |\n\n`;
          }

          markdown += `## View Reports\n\n`;
          markdown += `- HTML Report: Open \`coverage/index.html\` in your browser\n`;
          markdown += `- Regenerate: Run \`run_unit_tests\` to update coverage data\n`;

          return {
            content: [
              {
                type: "text",
                text: markdown
              }
            ]
          };
        } catch {
          return {
            content: [
              {
                type: "text",
                text: "Coverage data exists but could not be parsed. Run `run_unit_tests` to regenerate."
              }
            ]
          };
        }
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error generating coverage report: ${error.message}`
          }
        ]
      };
    }
  }
);

// Tool: Run watch mode for development
server.registerTool(
  "run_test_watch",
  {
    title: "Run Tests in Watch Mode",
    description: "Start Vitest in watch mode for development (Note: This will run continuously)",
    inputSchema: {
      pattern: z.string().optional().describe("Optional pattern to filter tests (e.g., 'utils')")
    }
  },
  async ({ pattern }) => {
    return {
      content: [
        {
          type: "text",
          text: `# Watch Mode Instructions

To run tests in watch mode, execute the following command in your terminal:

\`\`\`bash
npx vitest${pattern ? ` --grep "${pattern}"` : ''}
\`\`\`

This will:
- Start Vitest in watch mode
- Re-run tests automatically when files change
- Show test results in real-time
- Allow interactive filtering and re-running

Press:
- \`a\` to run all tests
- \`f\` to run only failed tests
- \`p\` to filter by a filename pattern
- \`t\` to filter by a test name pattern
- \`q\` to quit

Note: Watch mode is designed for interactive terminal use and cannot be fully automated through MCP.`
        }
      ]
    };
  }
);

// Main function
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Unit Test Server started successfully");
}

main().catch(console.error);