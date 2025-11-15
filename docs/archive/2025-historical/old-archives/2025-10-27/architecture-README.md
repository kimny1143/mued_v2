# Architecture Documentation

This directory contains system architecture and design documentation for MUED LMS v2.

## Core Architecture Documents

### 🏗️ System Architecture
**[mvp-architecture.md](./mvp-architecture.md)**
- Complete system architecture overview
- Technology stack details
- Database schema design
- API structure and patterns
- Security implementation
- Performance optimization strategies

### 📐 Business Logic
**[business-logic-specification.md](./business-logic-specification.md)**
- Core business rules and workflows
- Subscription management logic
- Payment processing flows
- User role permissions
- Quota and usage tracking

### 🔌 Integration Architecture
**[mcp-feasibility-analysis.md](./mcp-feasibility-analysis.md)**
- Model Context Protocol (MCP) integration analysis
- Claude Desktop integration patterns
- AI service architecture
- Real-time communication design

### 📅 Historical Architecture
**[comprehensive-analysis-report-20251018.md](./comprehensive-analysis-report-20251018.md)**
- Point-in-time architecture analysis from 2025-10-18
- Historical context for architectural decisions

## Architecture Principles

### 1. Separation of Concerns
- **Presentation Layer**: Next.js App Router, React components
- **Business Logic Layer**: Service classes, use cases
- **Data Access Layer**: Repository pattern with Drizzle ORM
- **Infrastructure Layer**: External services (Stripe, OpenAI, Clerk)

### 2. Scalability Patterns
- Stateless application servers
- Database connection pooling
- Caching strategies (Redis planned)
- CDN for static assets

### 3. Security by Design
- Authentication: Clerk with JWT tokens
- Authorization: Role-based access control (RBAC)
- Data Protection: Row-level security (RLS)
- API Security: Rate limiting, input validation

### 4. Performance Targets
- Page Load: < 3 seconds
- API Response: < 500ms (p95)
- Database Queries: < 100ms (p95)
- Core Web Vitals: All green

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5 with App Router
- **UI Library**: React 19
- **Styling**: TailwindCSS 4
- **Components**: Shadcn/UI
- **State Management**: React Context + Hooks

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle
- **Authentication**: Clerk
- **Payments**: Stripe

### Infrastructure
- **Hosting**: Vercel
- **Database**: Neon (PostgreSQL)
- **File Storage**: Vercel Blob (planned)
- **Monitoring**: Vercel Analytics
- **CI/CD**: GitHub Actions

## Architectural Decisions

### Why Next.js App Router?
- Server Components for better performance
- Built-in API routes
- Excellent developer experience
- Strong TypeScript support

### Why Drizzle ORM?
- Type-safe database queries
- Excellent performance
- Simple migration system
- Good PostgreSQL support

### Why Clerk for Auth?
- Production-ready authentication
- Built-in user management
- Webhook support
- Easy integration with Next.js

### Why Neon for Database?
- Serverless PostgreSQL
- Automatic scaling
- Branch deployments
- Cost-effective for MVPs

## System Diagrams

### High-Level Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Vercel    │────▶│    Neon     │
│  (Browser)  │     │  (Next.js)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌─────────┐   ┌─────────┐
              │  Clerk  │   │ Stripe  │
              │  (Auth) │   │(Payment)│
              └─────────┘   └─────────┘
```

## Related Documentation
- [Implementation Plans](../implementation/)
- [Database Design](../database/)
- [Testing Strategy](../TESTING.md)
- [Feature Specifications](../features/)