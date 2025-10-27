# Development Tools Documentation

This directory contains documentation for development tools and utilities used in MUED LMS v2.

## Available Tools

### 🤖 Claude Desktop Integration
**[claude-desktop-commands.md](./claude-desktop-commands.md)**
- MCP (Model Context Protocol) server setup
- Available commands and functions
- Integration with development workflow
- Troubleshooting guide

## Tool Categories

### Development Environment
- **Next.js 15.5** - React framework
- **TypeScript 5** - Type safety
- **Bun/npm/pnpm** - Package management
- **Turbo** - Build system

### Testing Tools
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **MSW** - API mocking
- **Testing Library** - Component testing

### Code Quality
- **ESLint** - Linting
- **Prettier** - Formatting
- **TypeScript** - Type checking
- **Husky** - Git hooks

### Database Tools
- **Drizzle ORM** - Database queries
- **Drizzle Kit** - Migrations
- **Neon** - PostgreSQL hosting
- **pgAdmin** - Database management

### AI/ML Tools
- **OpenAI API** - GPT integration
- **Clerk** - Authentication
- **Stripe** - Payments
- **Vercel AI SDK** - AI utilities

## MCP Server Commands

Key MCP commands available through Claude Desktop:

### Testing
- `run_playwright_test` - Execute E2E tests
- `take_screenshot` - Capture UI screenshots
- `run_unit_tests` - Execute unit tests

### Development
- `run_dev_server` - Start development server
- `build_project` - Build for production
- `check_types` - TypeScript validation

### Database
- `run_migrations` - Apply database migrations
- `seed_database` - Seed test data

## Setup Guides

### Initial Setup
1. Install dependencies: `npm install`
2. Configure environment variables
3. Setup database connection
4. Configure authentication

### MCP Server Setup
1. Install Claude Desktop
2. Configure MCP servers in settings
3. Test connection with available commands

## Troubleshooting

### Common Issues

**MCP Server Not Responding**
- Check Claude Desktop is running
- Verify server configuration
- Review logs in `~/Library/Logs/Claude/`

**Build Failures**
- Clear `.next` cache
- Check TypeScript errors
- Verify environment variables

**Test Failures**
- Update test snapshots
- Check database state
- Review mock configurations

## Related Documentation
- [Architecture Overview](../architecture/mvp-architecture.md)
- [Testing Strategy](../TESTING.md)
- [Implementation Guide](../implementation/README.md)