# Database Documentation

## Overview

This directory contains comprehensive documentation for the MUED LMS database architecture, focusing on the **MUEDnote AI Interview-driven logging system**.

---

## Documents

### 1. [Session/Interview Schema](./session-interview-schema.md)

**Complete technical specification** for MUEDnote Phase 2.

**Contents:**
- Architecture overview
- ER diagrams
- Table definitions with TypeScript types
- JSONB structure specifications
- Index strategy and rationale
- Row Level Security (RLS) policies
- Integration with existing `log_entries` table
- Performance optimization guide
- Migration guide
- Usage examples
- Troubleshooting

**Audience:** Database architects, backend developers, DevOps

---

### 2. [Quick Start Guide](./session-quickstart.md)

**5-minute setup guide** for developers.

**Contents:**
- Migration commands
- Basic CRUD examples
- Common query patterns
- Quick troubleshooting tips
- Next steps

**Audience:** Frontend/backend developers, QA engineers

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 MUED LMS Database                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Core Tables (Phase 0)                                   │
│  ├─ users                                                │
│  ├─ lesson_slots                                         │
│  ├─ reservations                                         │
│  ├─ messages                                             │
│  ├─ materials                                            │
│  ├─ subscriptions                                        │
│  └─ learning_metrics                                     │
│                                                          │
│  MUEDnote Phase 1                                        │
│  └─ log_entries                 (General logs)           │
│                                                          │
│  MUEDnote Phase 2 (Session/Interview) ⭐ NEW             │
│  ├─ sessions                    (AI Interview sessions)  │
│  ├─ session_analyses            (Analyzer output)        │
│  ├─ interview_questions         (AI-generated Qs)        │
│  └─ interview_answers           (User responses)         │
│                                                          │
│  RAG/AI Phase 2                                          │
│  ├─ ai_dialogue_log             (AI chat history)        │
│  ├─ provenance                  (Data lineage)           │
│  └─ rag_metrics_history         (Daily metrics)          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Status

| Migration | Status | Description |
|-----------|--------|-------------|
| 0000-0005 | ✅ Applied | Core tables |
| 0006-0008 | ✅ Applied | RAG/AI metrics |
| 0009 | ✅ Applied | log_entries (Phase 1) |
| **0010** | 🆕 **Ready** | **sessions/interview tables** |
| **0011** | 🆕 **Ready** | **RLS policies** |

---

## Quick Commands

```bash
# Test database connection
npm run db:test-connection

# Run Session/Interview migration
npm run db:migrate:sessions

# Rollback Session/Interview migration
npm run db:rollback:sessions

# Open Drizzle Studio
npm run db:studio

# Generate Drizzle types
npm run db:generate
```

---

## Key Features

### 1. AI Interview-Driven Logging

- **Structured Q&A**: AIが質問を生成、ユーザーが回答
- **Non-intrusive**: 最小限の入力で最大限の情報を引き出す
- **Contextual**: 過去の回答をRAGで活用

### 2. Flexible Data Model

- **JSONB for metadata**: DAWメタデータ、分析結果を柔軟に保存
- **Polymorphic references**: 複数のエンティティに対応
- **Version tracking**: 分析アルゴリズムのバージョン管理

### 3. Strong Security

- **Row Level Security (RLS)**: ユーザーごとのデータ分離
- **Role-based access**: Student/Mentor/Admin の権限管理
- **Privacy controls**: 公開/非公開、メンター共有の設定

### 4. Performance Optimized

- **Strategic indexes**: 頻繁なクエリパターンに対応
- **GIN indexes for JSONB**: メタデータ検索の高速化
- **Materialized views**: 複雑な集計クエリの最適化

---

## Schema Evolution

### Phase 1: General Logging
- `log_entries` - 自由記述のログ

### Phase 2: Structured Interview ⭐ Current
- `sessions` - AI Interview-driven sessions
- `session_analyses` - Analyzer output
- `interview_questions` - AI-generated questions
- `interview_answers` - User responses

### Phase 3: Auto-Material Generation (Planned)
- Interview回答から教材自動生成
- パーソナライズされた練習プラン
- 弱点分析とレコメンデーション

---

## Testing

### Unit Tests

```bash
npm run test:unit -- tests/unit/db/sessions
```

### Integration Tests

```bash
npm run test:integration -- tests/integration/sessions
```

### E2E Tests

```bash
npm run test:e2e -- tests/e2e/sessions
```

---

## Monitoring

### Query Performance

```sql
-- Slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%sessions%'
ORDER BY mean_time DESC
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('sessions', 'interview_questions')
ORDER BY idx_scan ASC;
```

### Table Size

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Contributing

### Adding New Tables

1. Define schema in `db/schema/*.ts`
2. Create migration SQL in `db/migrations/NNNN_description.sql`
3. Create rollback SQL in `db/migrations/rollback_NNNN_description.sql`
4. Add TypeScript migration script in `scripts/migrate-*.ts`
5. Update documentation
6. Add tests

### Schema Design Principles

- **Normalization**: Typically 3NF, denormalize only with justification
- **Indexes**: Foreign keys, frequent WHERE/ORDER BY columns
- **RLS**: Default deny, explicit grants
- **JSONB**: Use for flexible/evolving data structures
- **Comments**: Add SQL comments for documentation

---

## Resources

- [Neon PostgreSQL Docs](https://neon.tech/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [JSONB Indexing](https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING)

---

## Contact

For questions or issues:

- **Database Team**: [Database Issues](https://github.com/your-repo/issues?label=database)
- **Architecture Questions**: See [CLAUDE.md](../../CLAUDE.md)

---

**Last Updated**: 2025-11-19
