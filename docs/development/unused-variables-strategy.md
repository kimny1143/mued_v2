# Unused Variables Handling Strategy

## Overview

This document outlines the strategy for handling unused variables in the MUED LMS codebase to maintain clean, maintainable code while allowing for legitimate use cases.

## Current Configuration

### ESLint Rules

The project uses the following ESLint configuration for unused variables:

```json
{
  "@typescript-eslint/no-unused-vars": ["error", {
    "argsIgnorePattern": "^_",
    "varsIgnorePattern": "^_",
    "ignoreRestSiblings": true,
    "args": "after-used",
    "caughtErrors": "none"
  }],
  "@typescript-eslint/no-unused-imports": "error"
}
```

### Key Features

1. **Underscore Convention**: Variables and parameters prefixed with `_` are ignored
2. **Rest Siblings**: Destructured rest parameters are ignored
3. **Auto-fixable**: Unused imports can be automatically removed
4. **Error Level**: Set to "error" to enforce clean code in CI/CD

## Strategy Guidelines

### 1. Handling Different Types of Unused Variables

#### Unused Imports
```typescript
// ❌ Bad - Unused import
import { useState, useEffect } from 'react';

// ✅ Good - Remove unused imports
import { useState } from 'react';
```

#### Unused Function Parameters
```typescript
// ❌ Bad - Unused parameter
function handleClick(event, index) {
  console.log(event);
}

// ✅ Good - Prefix with underscore
function handleClick(event, _index) {
  console.log(event);
}

// ✅ Good - Use void operator for event handlers
onClick={() => handleClick()}
```

#### Unused Destructured Variables
```typescript
// ❌ Bad - Unused destructured variable
const { data, error, loading } = useQuery();
console.log(data);

// ✅ Good - Use rest parameters
const { data, ...rest } = useQuery();

// ✅ Good - Prefix with underscore
const { data, _error, _loading } = useQuery();
```

#### Legitimate Unused Variables
```typescript
// For required but unused parameters in implementations
export async function POST(_request: Request) {
  // Implementation that doesn't need request
  return new Response('OK');
}

// For type imports that are only used in type positions
import type { User } from '@/types';
```

### 2. Auto-fixable Rules

The following issues can be automatically fixed:

- **Unused imports**: Removed by `@typescript-eslint/no-unused-imports`
- **Import ordering**: Organized by `import/order` rule
- **Const preference**: Variables that are never reassigned

Run auto-fix with:
```bash
npm run lint -- --fix
```

### 3. Manual Fix Patterns

#### Pattern 1: Intentionally Unused Parameters
```typescript
// Before
app.use((req, res, next) => {
  console.log('Middleware');
  next();
});

// After
app.use((_req, _res, next) => {
  console.log('Middleware');
  next();
});
```

#### Pattern 2: Placeholder Implementations
```typescript
// Before
interface Handler {
  onSuccess(data: any): void;
  onError(error: Error): void;
}

class MyHandler implements Handler {
  onSuccess(data: any) {
    // TODO: Implement
  }
  onError(error: Error) {
    // TODO: Implement
  }
}

// After
class MyHandler implements Handler {
  onSuccess(_data: any) {
    // TODO: Implement
  }
  onError(_error: Error) {
    // TODO: Implement
  }
}
```

#### Pattern 3: Event Handlers
```typescript
// Before
<button onClick={(e) => console.log('clicked')}>

// After (if event is not used)
<button onClick={() => console.log('clicked')}>

// Or with underscore
<button onClick={(_e) => console.log('clicked')}>
```

### 4. ESLint Disable Comments

For exceptional cases where the rules cannot be followed:

```typescript
// Disable for next line only
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Disable for entire file (use sparingly)
/* eslint-disable @typescript-eslint/no-unused-vars */
```

## Implementation Steps

### Phase 1: Setup (Completed)
- [x] Update ESLint configuration
- [x] Add auto-fixable rules
- [x] Create cleanup script

### Phase 2: Initial Cleanup
1. Run the cleanup script:
   ```bash
   node scripts/fix-unused-variables.js
   ```

2. Review auto-fix results
3. Manually fix remaining issues following the patterns above

### Phase 3: Ongoing Maintenance
1. Run linting before commits
2. Fix issues immediately when they arise
3. Use pre-commit hooks to catch issues early

## Common Scenarios

### API Route Handlers
```typescript
// Next.js API routes often have unused params
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // Only using params, not request
  return Response.json({ id: params.id });
}
```

### React Component Props
```typescript
// Component with optional props
interface Props {
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

function Card({ title, _subtitle, _onClick }: Props) {
  // Only using title for now
  return <h1>{title}</h1>;
}
```

### Type-Only Imports
```typescript
// These are automatically handled by TypeScript
import type { User, Post } from '@/types';

// Used only in type positions
function getUser(): User { ... }
```

## Tools and Scripts

### Cleanup Script
Located at `scripts/fix-unused-variables.js`:
- Checks for required ESLint plugins
- Runs auto-fix
- Generates detailed report
- Provides fix suggestions

### VSCode Integration
Add to `.vscode/settings.json`:
```json
{
  "editor.codeActionsOnSave": {
    "source.removeUnusedImports": true,
    "source.fixAll.eslint": true
  }
}
```

## Best Practices

1. **Fix immediately**: Don't let unused variables accumulate
2. **Use underscore convention**: Clear intent for unused parameters
3. **Remove truly unused code**: Don't just silence warnings
4. **Document exceptions**: Add comments explaining why variables are unused
5. **Regular cleanup**: Run the cleanup script periodically

## CI/CD Integration

The linting is enforced in CI/CD:
- Pull requests will fail if unused variables exist
- Use `npm run lint` locally before pushing
- Auto-fix what you can, manually fix the rest

## Exceptions and Edge Cases

### Legitimate Unused Variables
- Interface implementations requiring all parameters
- Event handlers where event object is not needed
- Placeholder/stub implementations during development
- Variables used only in development/debug mode

### When to Use eslint-disable
- Generated code that cannot be modified
- Third-party type definitions with unused parameters
- Temporary development code (remove before merging)

## Summary

By following this strategy:
1. Code remains clean and maintainable
2. Legitimate unused variables are clearly marked
3. Auto-fixable issues are resolved automatically
4. Manual fixes follow consistent patterns
5. CI/CD enforces the standards

Remember: The goal is not just to silence warnings, but to maintain high-quality, intentional code.