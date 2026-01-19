# Test Strategy Report: MUEDnote Spotlight Input MVP

**Date**: 2025-12-02
**Version**: 1.0
**Reviewer**: Test Architect

---

## Executive Summary

This report provides a comprehensive test strategy for the MUEDnote Spotlight Input MVP, a Tauri-based desktop application. The strategy covers unit, integration, and E2E testing approaches, considering the unique challenges of testing desktop applications with Rust backends and React frontends.

---

## 1. Current Test Configuration

### 1.1 apps/muednote-v3 Test Status

**Current State**: No dedicated test infrastructure exists for the muednote-v3 application.

**Existing Files**:
- `/apps/muednote-v3/package.json` - No test scripts defined
- `/apps/muednote-v3/src-tauri/Cargo.toml` - No test dependencies

**Frontend Components** (4 files):
- `src/main.tsx` - Entry point
- `src/App.tsx` - Main application component (183 lines)
- `src/components/FragmentInput.tsx` - Core input component (141 lines)
- `src/utils/tauri.ts` - Tauri API wrapper (23 lines)

**Backend** (Rust):
- `src-tauri/src/lib.rs` - Core commands (~280 lines)
  - `fetch_messages` - Database query
  - `process_fragment` - Fragment processing with DB write
  - `delete_message` - Message deletion
  - `toggle_visibility`, `show_overlay`, `hide_overlay` - Window management

### 1.2 Project-Wide Test Configuration

**Unit/Integration Tests (Vitest)**:
- Configuration: `/vitest.config.ts`
- Test directory: `/tests/unit/`, `/tests/integration/`
- Setup file: `/tests/setup/vitest.setup.ts`
- Coverage thresholds: branches 10%, functions 60%, lines 10%, statements 10%

**E2E Tests (Playwright)**:
- Configuration: `/playwright.config.ts`
- Test directory: `/tests/` (*.spec.ts), `/e2e/`
- Existing MUEDnote E2E: `/e2e/muednote-phase1.spec.ts` (319 lines, web version)

**Test Infrastructure**:
- jsdom for unit tests
- Testcontainers for integration tests
- MSW for API mocking
- Clerk authentication mocks
- Testing Library (React)

---

## 2. Test Strategy Proposal

### 2.1 Unit Tests

#### 2.1.1 Frontend Unit Tests (Vitest)

**Target Files**:
| File | Test Priority | Complexity |
|------|---------------|------------|
| `FragmentInput.tsx` | Critical | High |
| `App.tsx` | High | Medium |
| `tauri.ts` | Medium | Low |

**Recommended Approach**:

1. **Mock Tauri APIs** using `@tauri-apps/api/mocks`:
```typescript
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { vi } from 'vitest';

beforeEach(() => {
  mockIPC((cmd, args) => {
    if (cmd === 'process_fragment') {
      return { ...args.fragment, processed: true };
    }
    if (cmd === 'fetch_messages') {
      return [];
    }
    return null;
  });
});

afterEach(() => {
  clearMocks();
});
```

2. **Test Categories**:

**FragmentInput Component Tests**:
- Input rendering and visibility states
- Keyboard event handling (Enter, Escape)
- Form submission flow
- Loading state during processing
- Auto-hide timeout behavior (5 seconds)

**App Component Tests**:
- Dashboard toggle functionality
- Window resize logic
- Message loading states
- Error handling states
- Message deletion flow

**tauri.ts Utility Tests**:
- `isTauri()` detection in web vs Tauri context
- `tauriListen()` event subscription
- `tauriInvoke()` command invocation

**Recommended Test Configuration** (add to `apps/muednote-v3/`):
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

**Coverage Target**: 80% for critical path components

#### 2.1.2 Backend Unit Tests (Rust)

**Target Functions**:
| Function | Test Priority | Dependencies |
|----------|---------------|--------------|
| `process_fragment` | Critical | Database |
| `fetch_messages` | High | Database |
| `delete_message` | High | Database |
| Window commands | Medium | Tauri AppHandle |

**Recommended Approach**:

1. **Use `tauri::test` module** (unstable feature):
```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Unit test for Fragment structure
    #[test]
    fn test_fragment_serialization() {
        let fragment = Fragment {
            id: "test-123".to_string(),
            content: "Test content".to_string(),
            timestamp: 1234567890,
            processed: None,
        };

        let json = serde_json::to_string(&fragment).unwrap();
        assert!(json.contains("test-123"));
    }
}
```

2. **Database-dependent tests** require testcontainers or mock:
```rust
#[tokio::test]
async fn test_process_fragment_with_mock_db() {
    // Use sqlx::test or testcontainers
}
```

**Add to Cargo.toml**:
```toml
[dev-dependencies]
tokio-test = "0.4"
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "test-helpers"] }
```

### 2.2 Integration Tests

#### 2.2.1 API Communication Tests

**Test Scenarios**:

1. **Frontend-Backend IPC Integration**:
   - Fragment submission -> Database save -> Confirmation
   - Message fetch -> Display in dashboard
   - Message deletion -> UI update

2. **Database Integration** (using testcontainers):
```typescript
// tests/integration/muednote/fragment-processing.test.ts
describe('Fragment Processing Integration', () => {
  it('should save fragment to database and return processed result', async () => {
    // Use actual database with testcontainers
  });
});
```

3. **Event System Integration**:
   - Global hotkey trigger -> Console toggle
   - Event emission -> UI state change

#### 2.2.2 State Management Tests

**Test Scenarios**:
- Session management (active session creation/reuse)
- Message state consistency across views
- Window state persistence

### 2.3 E2E Tests

#### 2.3.1 Tauri E2E Testing Options

**Option A: WebdriverIO (Recommended)**

Based on [Tauri v2 Documentation](https://v2.tauri.app/develop/tests/webdriver/example/webdriverio/):

```javascript
// wdio.conf.js
const path = require('path');

exports.config = {
  specs: ['./e2e/**/*.spec.ts'],
  runner: 'local',
  capabilities: [{
    maxInstances: 1,
    'tauri:options': {
      application: path.resolve(__dirname, './src-tauri/target/release/muednote-v3'),
    },
  }],
  framework: 'mocha',
  services: ['tauri'],
};
```

**Limitations**:
- macOS lacks desktop WebDriver client support (per [official docs](https://v2.tauri.app/develop/tests/))
- Global hotkey testing may require system-level automation

**Option B: Selenium with tauri-driver**

For Linux/Windows CI environments:
```typescript
// e2e/muednote-spotlight.spec.ts
describe('MUEDnote Spotlight Input', () => {
  it('should show input bar on hotkey', async () => {
    // Use selenium with tauri-driver
  });
});
```

**Option C: Hybrid Approach (Recommended for macOS)**

1. **Web-based E2E** for UI logic (Playwright with Vite dev server)
2. **Manual/Scripted tests** for system integration (global hotkeys)

```typescript
// e2e/muednote-spotlight-web.spec.ts
import { test, expect } from '@playwright/test';

test.describe('MUEDnote Spotlight Input (Web Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173'); // Vite dev server
  });

  test('should render input bar', async ({ page }) => {
    await expect(page.locator('.fragment-input')).toBeVisible();
  });

  test('should submit on Enter key', async ({ page }) => {
    await page.locator('.fragment-input').fill('Test input');
    await page.keyboard.press('Enter');
    // Verify processing state
  });
});
```

### 2.4 Manual Test Items

Due to Tauri E2E limitations, these require manual testing:

| Test ID | Category | Test Case | Priority |
|---------|----------|-----------|----------|
| M-01 | Hotkey | Cmd+Shift+Space shows input bar | Critical |
| M-02 | Hotkey | Cmd+Shift+D toggles dashboard | High |
| M-03 | Window | Input bar appears near cursor | Medium |
| M-04 | Window | Window remains topmost (menu bar) | Medium |
| M-05 | Timeout | 5-second auto-hide works correctly | High |
| M-06 | System | App survives sleep/wake cycle | Low |
| M-07 | System | App handles display changes (external monitor) | Low |

---

## 3. Test Case Design

### 3.1 Hotkey Functionality

| Test ID | Description | Expected Result | Type |
|---------|-------------|-----------------|------|
| HK-01 | Press Cmd+Shift+Space when hidden | Input bar appears | Manual |
| HK-02 | Press Cmd+Shift+Space when visible | Input bar hides | Manual |
| HK-03 | Press hotkey while in another app | Input bar appears with focus | Manual |
| HK-04 | Press hotkey with modifier variations | Only exact combo works | Manual |
| HK-05 | Event emission on shortcut press | `toggle-console` event emitted | Unit |

### 3.2 Input Bar UI

| Test ID | Description | Expected Result | Type |
|---------|-------------|-----------------|------|
| UI-01 | Initial render shows placeholder | "..." placeholder visible | Unit |
| UI-02 | Input receives focus on show | Cursor in input field | Integration |
| UI-03 | Text entry works correctly | Characters appear in field | Unit |
| UI-04 | Escape key closes bar | Bar hidden, input cleared | Unit |
| UI-05 | Enter submits content | Form submission triggered | Unit |
| UI-06 | Loading spinner during processing | Spinner visible, input disabled | Unit |
| UI-07 | Bar dimensions (400-480px x 36px) | Correct sizing | E2E |
| UI-08 | Drag handle allows window move | Window draggable | Manual |

### 3.3 API Communication

| Test ID | Description | Expected Result | Type |
|---------|-------------|-----------------|------|
| API-01 | Submit fragment creates session | New session in DB | Integration |
| API-02 | Submit fragment saves message | Message in chat_messages | Integration |
| API-03 | Fetch messages returns history | Array of ChatMessage | Integration |
| API-04 | Delete message removes from DB | Message no longer exists | Integration |
| API-05 | Error handling on DB failure | User sees error message | Integration |
| API-06 | Timestamp included in request | ISO timestamp in payload | Unit |

### 3.4 Background Operation

| Test ID | Description | Expected Result | Type |
|---------|-------------|-----------------|------|
| BG-01 | App runs in menu bar | Tray icon visible | Manual |
| BG-02 | Memory usage under 100MB | Resource monitoring | Performance |
| BG-03 | CPU idle < 1% when inactive | Resource monitoring | Performance |
| BG-04 | Database connection pooling | Max 5 connections | Unit |
| BG-05 | Connection timeout 30s | Proper error on timeout | Integration |

### 3.5 Edge Cases

| Test ID | Description | Expected Result | Type |
|---------|-------------|-----------------|------|
| EC-01 | Empty input submission | Submission blocked | Unit |
| EC-02 | Very long input (>1000 chars) | Handles gracefully | Unit |
| EC-03 | Unicode/emoji input | Correctly processed | Unit |
| EC-04 | Rapid repeated submissions | No race conditions | Integration |
| EC-05 | Network disconnection | Error shown, graceful retry | Integration |
| EC-06 | Database connection lost | Reconnection attempt | Integration |
| EC-07 | Multiple instances prevention | Only one app runs | Manual |
| EC-08 | Concurrent hotkey presses | No state corruption | Integration |
| EC-09 | Input with SQL injection attempt | Safely parameterized | Security |
| EC-10 | XSS in message content | Content sanitized | Security |

---

## 4. Test Environment and Tools

### 4.1 Recommended Tools

| Category | Tool | Purpose | Status |
|----------|------|---------|--------|
| Unit (Frontend) | Vitest | React component testing | Add |
| Unit (Backend) | cargo test | Rust unit testing | Add |
| Integration | Vitest + Testcontainers | DB integration | Extend |
| E2E (Web) | Playwright | UI automation | Extend |
| E2E (Desktop) | WebdriverIO + tauri-driver | Full app testing | Evaluate |
| Performance | Custom scripts | Memory/CPU monitoring | Add |
| Security | sqlx parameterized queries | SQL injection prevention | Verify |

### 4.2 Required Dependencies

**Frontend (package.json)**:
```json
{
  "devDependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "vitest": "^3.2.4",
    "@vitest/coverage-v8": "^3.2.4",
    "jsdom": "^27.0.0"
  }
}
```

**Backend (Cargo.toml)**:
```toml
[dev-dependencies]
tokio-test = "0.4"
```

### 4.3 CI/CD Integration

**GitHub Actions Workflow**:
```yaml
name: MUEDnote Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: cd apps/muednote-v3 && npm install
      - name: Run frontend tests
        run: cd apps/muednote-v3 && npm run test
      - name: Run Rust tests
        run: cd apps/muednote-v3/src-tauri && cargo test

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: muednote_test
    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest # Note: macOS WebDriver not supported
    steps:
      - uses: actions/checkout@v4
      - uses: tauri-apps/tauri-action@v0
        with:
          projectPath: apps/muednote-v3
      # WebdriverIO E2E tests (Linux only)
```

**MCP Integration Consideration**:

The existing MCP servers (`mued_unit_test`, `mued_e2e`) can be extended:
```javascript
// scripts/mcp/muednote-test-server.js
server.registerTool("run_muednote_tests", {
  description: "Run MUEDnote Spotlight tests",
  inputSchema: { type: "object", properties: { testType: { type: "string" } } }
}, async ({ testType }) => {
  // Execute appropriate test suite
});
```

---

## 5. Risks and Concerns

### 5.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| macOS WebDriver unsupported | E2E gaps | Use web-mode E2E + manual tests |
| Global hotkey testing | Cannot automate | Document manual test procedures |
| Database state in tests | Flaky tests | Use isolated test databases |
| Tauri mock limitations | Incomplete coverage | Supplement with integration tests |
| Window positioning tests | Platform-specific | Platform-conditional assertions |

### 5.2 Coverage Gaps

1. **Global Hotkey Registration**: Cannot be unit tested; requires system-level testing
2. **Window Manager Interaction**: Platform-specific behavior varies
3. **Menu Bar Integration**: macOS-specific, manual testing required
4. **Focus Management**: Cross-application focus is difficult to automate

### 5.3 Recommendations

1. **Prioritize Frontend Unit Tests**: Highest ROI, fastest feedback
2. **Implement Backend Integration Tests**: Critical for data integrity
3. **Create Manual Test Checklist**: For system integration scenarios
4. **Consider Visual Regression**: For UI consistency across updates
5. **Monitor Real Usage**: Add telemetry for production error tracking

---

## 6. Conclusion

### 6.1 Feasibility Assessment

| Test Type | Feasibility | Effort | Coverage |
|-----------|-------------|--------|----------|
| Frontend Unit | High | Low | High |
| Backend Unit | High | Medium | Medium |
| Integration | High | Medium | High |
| E2E (Web mode) | High | Low | Medium |
| E2E (Desktop) | Low (macOS) | High | High |
| Performance | Medium | Medium | Medium |

### 6.2 Recommended Implementation Order

1. **Phase 1 (Week 1)**:
   - Add Vitest configuration to muednote-v3
   - Create unit tests for `FragmentInput.tsx`
   - Create unit tests for `tauri.ts` utilities

2. **Phase 2 (Week 2)**:
   - Add Rust unit tests for data structures
   - Create integration tests for `process_fragment`
   - Set up testcontainers for database tests

3. **Phase 3 (Week 3)**:
   - Extend Playwright for web-mode E2E
   - Create manual test checklist
   - Document test procedures

4. **Phase 4 (Optional)**:
   - Evaluate WebdriverIO for Linux CI
   - Add performance monitoring
   - Implement visual regression testing

### 6.3 Test Coverage Target

| Component | Target Coverage |
|-----------|-----------------|
| FragmentInput.tsx | 90% |
| App.tsx | 80% |
| tauri.ts | 100% |
| lib.rs (testable) | 70% |
| Integration flows | 5 critical paths |

### 6.4 Final Recommendations

1. **Start with frontend unit tests** - They provide immediate value with low effort
2. **Mock Tauri APIs comprehensively** - Use `@tauri-apps/api/mocks` for reliable tests
3. **Accept manual testing for system integration** - Document procedures clearly
4. **Integrate with existing CI/CD** - Extend current workflows rather than creating new ones
5. **Track coverage metrics** - Set thresholds and monitor trends

---

## References

- [Tauri v2 Testing Documentation](https://v2.tauri.app/develop/tests/)
- [Mocking Tauri APIs](https://v2.tauri.app/develop/tests/mocking/)
- [WebdriverIO Example](https://v2.tauri.app/develop/tests/webdriver/example/webdriverio/)
- [Tauri E2E Discussion](https://github.com/tauri-apps/tauri/discussions/10123)
- [Vitest for Tauri Setup Guide](https://yonatankra.com/how-to-setup-vitest-in-a-tauri-project/)

---

*Report generated by Test-Driven Development Architect*
