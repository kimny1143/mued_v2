# MUED Browser Debug MCP Server

## Overview

The `mued-browser-debug` MCP server provides automated browser error detection and debugging capabilities for the MUED LMS application. It uses Playwright to load pages, capture console errors, monitor network requests, and detect runtime issues.

## Installation

The MCP server is already included in the project. To register it with Claude Desktop:

```bash
# Add to Claude Desktop configuration
# Path: ~/Library/Application Support/Claude/claude_desktop_config.json

{
  "mcpServers": {
    "mued_browser_debug": {
      "command": "node",
      "args": ["/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-browser-debug.js"]
    }
  }
}
```

## Available Tools

### 1. debug_page

Comprehensive page debugging that detects console errors, network issues, and runtime errors.

**Parameters:**
- `url` (string, optional): Base URL to test (default: http://localhost:3001)
- `path` (string, optional): Path to append to URL (e.g., /dashboard/library)
- `waitForSelector` (string, optional): CSS selector to wait for before capturing
- `timeout` (number, optional): Timeout in milliseconds (default: 30000)

**Returns:**
- `success`: boolean - whether the page loaded without errors
- `errors`: Array of error objects with message, stack trace, and type
- `consoleLogs`: Array of console messages
- `networkRequests`: Array of network requests (API calls, failed resources)
- `screenshot`: Path to screenshot taken during debugging
- `summary`: Human-readable summary of findings

**Example Usage:**
```
"Debug the library page for errors"
→ Uses debug_page tool with path: "/dashboard/library"
```

### 2. capture_api_response

Captures specific API responses for debugging data issues.

**Parameters:**
- `url` (string, required): Page URL to load
- `apiPattern` (string, required): API URL pattern to capture (e.g., "**/api/content**")

**Returns:**
- `capturedCount`: Number of matching requests captured
- `requests`: Array of captured requests with headers, body, and response

**Example Usage:**
```
"Capture all API responses on the dashboard"
→ Uses capture_api_response with apiPattern: "**/api/**"
```

### 3. check_console_errors

Quick check for console errors and warnings only.

**Parameters:**
- `url` (string, required): Page URL to check

**Returns:**
- `hasErrors`: boolean - whether errors were found
- `errorCount`: Number of errors
- `warningCount`: Number of warnings
- `errors`: Array of error messages
- `warnings`: Array of warning messages

**Example Usage:**
```
"Check if there are any console errors on the homepage"
→ Uses check_console_errors with url: "http://localhost:3001"
```

## Error Types Detected

The server categorizes errors into the following types:

1. **runtime**: JavaScript runtime errors (e.g., "Cannot read properties of undefined")
2. **type-error**: Type-related errors (e.g., "is not a function")
3. **network**: Network request failures
4. **syntax**: JavaScript syntax errors
5. **reference**: Reference errors (undefined variables)
6. **async**: Promise and async/await errors
7. **console-error**: Errors logged via console.error()
8. **navigation**: Page navigation failures
9. **react-error-boundary**: React error boundary catches
10. **next-error**: Next.js specific errors
11. **hydration-error**: React hydration mismatches

## Testing

Run the test suite to verify the MCP server is working correctly:

```bash
# Run the test suite
node tests/mcp/mued-browser-debug.test.js
```

The test suite covers:
1. Normal page loading (no errors)
2. Console error detection
3. Runtime error detection
4. API response capture
5. Console-only error checking
6. 404 page handling

## Common Use Cases

### 1. Debug a specific page after changes
```
"Debug the library page to see if my recent changes caused any errors"
```

### 2. Monitor API responses
```
"Capture the content API responses on the materials page to debug the data structure"
```

### 3. Quick error check before deployment
```
"Check all main pages for console errors"
```

### 4. Debug user-reported issues
```
"User reports the booking calendar is broken - debug that page"
```

## Troubleshooting

### Server not connecting
1. Check that the server file exists:
   ```bash
   ls -la /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-browser-debug.js
   ```

2. Test the server manually:
   ```bash
   node /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-browser-debug.js
   ```

3. Check Claude Desktop logs:
   ```bash
   tail -f ~/Library/Logs/Claude/mcp-server-mued_browser_debug.log
   ```

### Development server not running
Ensure the Next.js development server is running:
```bash
npm run dev
```

The server will automatically add `?test=true` to URLs to bypass authentication during testing.

### Screenshot not generated
Screenshots are saved to `/tmp/browser-debug-{timestamp}.png`. Ensure the `/tmp` directory is writable.

## Integration with Development Workflow

This MCP server is designed to work seamlessly with the MUED development workflow:

1. **During Development**: Use `debug_page` after making changes to immediately catch errors
2. **Before Commits**: Run a quick `check_console_errors` on modified pages
3. **PR Reviews**: Use the server to validate that PR changes don't introduce errors
4. **Production Debugging**: Capture API responses to understand data flow issues

## Source Code

- **MCP Server**: `/scripts/mcp/mued-browser-debug.js`
- **Test Suite**: `/tests/mcp/mued-browser-debug.test.js`
- **Documentation**: `/docs/mcp-browser-debug.md` (this file)