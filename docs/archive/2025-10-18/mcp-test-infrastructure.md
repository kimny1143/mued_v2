# MCP Test Infrastructure Documentation

## Overview

The MUED LMS v2 project uses a Model Context Protocol (MCP) based testing infrastructure that enables automated test execution directly from Claude Desktop. This eliminates the need for manual command execution and provides comprehensive test reporting.

## Architecture

### Core Principles

1. **MCP-First Design**: All test execution happens through MCP servers
2. **Zero Manual Intervention**: Tests run entirely through Claude Desktop
3. **Comprehensive Reporting**: Automatic generation of markdown and HTML reports
4. **Pattern Compliance**: All servers follow `McpServer` + `registerTool()` pattern

### MCP Server Structure

```
/scripts/mcp/
├── mued-playwright-e2e.js    # E2E test execution with Playwright
├── mued-unit-test.js         # Unit test execution with Vitest
├── test-server.js            # API health checks and basic tests
├── mued-playwright-screenshot.js # Screenshot capture for documentation
└── [legacy servers]          # To be reviewed for removal
```

## MCP Servers

### 1. E2E Test Server (`mued-playwright-e2e.js`)

**Purpose**: Execute Playwright end-to-end tests with detailed reporting

**Tools Available**:

#### `run_all_e2e_tests`
- Executes all E2E tests in the `/tests` directory
- Generates HTML and JSON reports
- Creates timestamped markdown report in `/tests/reports/`
- Returns test summary with pass/fail statistics

**Usage Example**:
```
Claude: Please run all E2E tests
Response: Executes tests and returns formatted report
```

#### `run_specific_e2e_test`
- Runs a single test file
- Parameters: `testFile` (string) - file name or path
- Provides detailed output for debugging

**Usage Example**:
```
Claude: Run the mued-improved.spec.ts test file
Response: Executes specific test and returns results
```

#### `run_e2e_suite`
- Runs tests by category
- Parameters: `suite` (enum) - auth, booking, materials, dashboard, all
- Uses grep patterns to filter relevant tests

**Usage Example**:
```
Claude: Run the authentication test suite
Response: Executes auth-related tests only
```

#### `generate_e2e_report`
- Displays existing test reports
- Shows last run summary
- Lists available report files

### 2. Unit Test Server (`mued-unit-test.js`)

**Purpose**: Execute Vitest unit tests with coverage reporting

**Tools Available**:

#### `run_unit_tests`
- Executes all unit tests with coverage
- Checks coverage thresholds (70% minimum)
- Generates coverage reports (HTML, JSON, LCOV)
- Creates timestamped markdown report

**Usage Example**:
```
Claude: Run all unit tests with coverage
Response: Executes tests and returns coverage summary
```

#### `run_test_file`
- Runs a specific test file
- Parameters: `filePath` (string) - path to test file
- Useful for focused testing during development

**Usage Example**:
```
Claude: Run the lib/utils.test.ts file
Response: Executes specific test file
```

#### `run_coverage_report`
- Generates coverage report without running tests
- Uses cached coverage data if available
- Highlights areas below threshold

**Usage Example**:
```
Claude: Show me the current coverage report
Response: Displays coverage metrics and warnings
```

#### `run_test_watch`
- Provides instructions for watch mode
- Cannot be fully automated (requires terminal)
- Includes command for manual execution

### 3. API Test Server (`test-server.js`)

**Purpose**: Basic API health checks and integration tests

**Tools Available**:
- `test_health`: Server health check
- `test_api`: Test specific API endpoints
- `test_booking`: Test booking flow
- `run_test_suite`: Run complete test suite

### 4. Screenshot Server (`mued-playwright-screenshot.js`)

**Purpose**: Capture high-quality screenshots for documentation

**Tools Available**:
- `capture_screenshots`: Takes viewport and fullpage screenshots
- Generates screenshots for all major pages
- Saves to `/screenshots/figma/` directory

## Report Structure

### E2E Test Reports

Location: `/tests/reports/e2e-[timestamp].md`

Contains:
- Test execution summary
- Pass/fail/skip statistics
- Execution duration
- Failed test details with error messages
- Console output for debugging
- Links to HTML reports

### Unit Test Reports

Location: `/tests/reports/unit-[timestamp].md`

Contains:
- Test execution summary
- Code coverage metrics (lines, statements, functions, branches)
- Coverage threshold warnings
- Failed test details
- Console output
- Links to coverage reports

### Coverage Reports

HTML Report: `/coverage/index.html`
- Interactive line-by-line coverage
- File-by-file breakdown
- Uncovered line highlighting

JSON Report: `/coverage/coverage-final.json`
- Machine-readable coverage data
- Used for CI/CD integration

## Claude Desktop Configuration

Add the following to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "mued_playwright_e2e": {
      "command": "node",
      "args": ["/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-playwright-e2e.js"]
    },
    "mued_unit_test": {
      "command": "node",
      "args": ["/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-unit-test.js"]
    },
    "mued_test": {
      "command": "node",
      "args": ["/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/test-server.js"]
    },
    "mued_screenshot": {
      "command": "node",
      "args": ["/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-playwright-screenshot.js"]
    }
  }
}
```

## Testing Workflow

### Complete Test Run

1. **Start Development Server**
   ```
   Claude: Ensure the dev server is running at localhost:3000
   ```

2. **Run E2E Tests**
   ```
   Claude: Run all E2E tests
   ```

3. **Run Unit Tests**
   ```
   Claude: Run unit tests with coverage
   ```

4. **Review Reports**
   ```
   Claude: Show me the test reports from the last run
   ```

### Focused Testing

1. **Test Specific Feature**
   ```
   Claude: Run the booking test suite
   ```

2. **Debug Failed Test**
   ```
   Claude: Run the mued-improved.spec.ts test file
   ```

3. **Check Coverage**
   ```
   Claude: Generate coverage report
   ```

## Troubleshooting

### Common Issues

#### MCP Server Not Found
- Verify server file exists at specified path
- Check Claude Desktop configuration
- Restart Claude Desktop after config changes

#### Tests Not Running
- Ensure dev server is running (localhost:3000)
- Check Node.js and npm are installed
- Verify test dependencies are installed

#### No Reports Generated
- Check write permissions for `/tests/reports/`
- Ensure tests complete (even with failures)
- Look for errors in console output section

#### Coverage Below Threshold
- Run `run_coverage_report` to identify gaps
- Focus on untested files/functions
- Add unit tests for critical paths

### Debug Commands

Check MCP server status:
```
Claude: Test the health of the MUED server
```

Verify test configuration:
```bash
npx playwright --version
npx vitest --version
```

Manual test execution (fallback):
```bash
npx playwright test
npx vitest run --coverage
```

## Best Practices

### Test Organization

1. **E2E Tests**: Place in `/tests/*.spec.ts`
2. **Unit Tests**: Co-locate with source files as `*.test.ts`
3. **Integration Tests**: Use `/tests/integration/` directory

### Test Writing

1. **Descriptive Names**: Use clear, specific test descriptions
2. **Isolated Tests**: Each test should be independent
3. **Proper Cleanup**: Reset state between tests
4. **Meaningful Assertions**: Test behavior, not implementation

### Coverage Goals

- **Minimum**: 70% for all metrics
- **Target**: 80%+ for critical paths
- **Priority**: Business logic > UI components > Utilities

### Report Management

1. **Regular Review**: Check reports after each test run
2. **Track Trends**: Monitor coverage over time
3. **Clean Old Reports**: Remove reports older than 30 days
4. **Document Failures**: Add comments to flaky tests

## MCP Server Cleanup Recommendations

### Servers to Keep

1. **mued-playwright-e2e.js** ✅
   - Essential for E2E testing
   - Well-structured and functional

2. **mued-unit-test.js** ✅
   - Essential for unit testing
   - Provides coverage reporting

3. **test-server.js** ✅
   - Useful for API health checks
   - Simple integration tests

4. **mued-playwright-screenshot.js** ✅
   - Valuable for documentation
   - Generates visual assets

### Servers to Remove

1. **working-test.js** ❌
   - Duplicate of test-server.js functionality
   - Incomplete implementation

2. **debug-server.js** ❌
   - Temporary debugging tool
   - Functionality covered by E2E server

3. **debug-login.js** ❌
   - Specific debugging tool
   - No longer needed with improved E2E tests

4. **mued-complete-server.js** ⚠️
   - Review for unique features
   - Consider merging useful parts into E2E server

## Future Enhancements

### Planned Features

1. **Performance Testing**
   - Add Lighthouse integration
   - Monitor Core Web Vitals
   - Track bundle size

2. **Visual Regression Testing**
   - Integrate Percy or similar
   - Automated screenshot comparison
   - UI change detection

3. **Accessibility Testing**
   - Automated axe-core checks
   - WCAG compliance reports
   - Keyboard navigation tests

4. **Test Analytics**
   - Historical trend tracking
   - Flaky test detection
   - Test execution time optimization

### Integration Opportunities

1. **CI/CD Pipeline**
   - GitHub Actions integration
   - Automatic PR test runs
   - Coverage enforcement

2. **Monitoring**
   - Real-time test status
   - Slack/Discord notifications
   - Dashboard creation

3. **Documentation**
   - Auto-generate test documentation
   - Living test specifications
   - Example usage generation

## Conclusion

The MCP test infrastructure provides a complete, automated testing solution for the MUED LMS v2 project. By centralizing test execution through Claude Desktop, it eliminates manual processes while providing comprehensive reporting and analysis.

For questions or issues, refer to the troubleshooting section or check the individual MCP server implementations in `/scripts/mcp/`.