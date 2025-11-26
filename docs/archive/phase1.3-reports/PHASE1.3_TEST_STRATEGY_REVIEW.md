# Phase 1.3 Test Strategy Review

**Document Version**: 1.0.0
**Review Date**: 2025-11-20
**Reviewer**: Claude Code (Sonnet 4.5)
**Target**: Phase 1.3 Implementation Plan - InterviewerService + RAGService + Interview API

---

## Executive Summary

**Overall Assessment**: ⭐⭐⭐⭐ (4/5) - **GOOD with Critical Gaps**

Phase 1.3's test strategy demonstrates solid foundations but **requires significant enhancement** in RAG-specific testing, performance verification, and pgvector integration patterns. The proposed >80% coverage target is achievable but needs concrete implementation strategies.

### Key Strengths ✅
- Well-defined testing phases aligned with implementation schedule
- Clear separation of unit, integration, and E2E tests
- Existing Phase 1.2 patterns (41/41 tests passing) provide strong foundation
- Performance targets are measurable and realistic

### Critical Gaps 🔴
1. **No RAG-specific test strategy** (embedding quality, retrieval accuracy, semantic evaluation)
2. **pgvector testing approach undefined** (mock vs. testcontainer strategy)
3. **Performance measurement implementation missing** (how to assert <500ms, <3s targets)
4. **Database transaction testing underspecified** (rollback scenarios, race conditions)
5. **OpenAI API mock strategy incomplete** (embeddings vs. chat completions have different patterns)

### Recommended Actions
1. **Add RAG Quality Metrics** (Recall@K, MRR, citation accuracy)
2. **Define pgvector Test Infrastructure** (testcontainers for integration, mocks for unit)
3. **Implement Performance Assertion Utilities** (Vitest custom matchers, Playwright timing APIs)
4. **Expand Error Scenario Coverage** (rate limits, API timeouts, embedding dimension mismatches)
5. **Create Test Data Fixtures** (sample embeddings, question templates, session data)

---

## 1. Unit Test Strategy Review

### 1.1 InterviewerService Unit Tests

**Current Plan** (from PHASE1.3_IMPLEMENTATION_PLAN.md):
```
✅ Task 1.5: ユニットテスト
- [ ] 質問生成テスト（全7 focusArea）
- [ ] テンプレートシステムテスト
- [ ] フォールバックテスト
- [ ] エッジケーステスト
```

**Gap Analysis**:
- ❌ **No test case examples provided** → Unclear what "質問生成テスト" actually validates
- ❌ **No RAGService integration testing** → How to mock `ragService.findSimilarLogs()`?
- ❌ **No confidence scoring test** → How is 0.0-1.0 confidence calculated?
- ❌ **No prompt injection test** → What if userShortNote contains malicious JSON?

**Recommended Test Cases** (29+ tests, following Phase 1.2 AnalyzerService pattern):

```typescript
// lib/services/interviewer.service.test.ts

describe('InterviewerService', () => {
  describe('正常系 - Question Generation', () => {
    describe.each([
      'harmony', 'melody', 'rhythm', 'mix', 'emotion', 'image', 'structure'
    ])('Focus Area: %s', (focusArea) => {
      it(`should generate 2-3 questions for ${focusArea}`, async () => {
        // Mock OpenAI response
        const mockQuestions = [
          { text: 'Question 1', focus: focusArea, depth: 'shallow' },
          { text: 'Question 2', focus: focusArea, depth: 'medium' },
        ];

        vi.mocked(openai.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [{ message: { content: JSON.stringify({ questions: mockQuestions }) } }]
          },
          usage: { /* ... */ }
        });

        const result = await interviewer.generateQuestions({
          sessionId: 'test-123',
          focusArea,
          intentHypothesis: 'Test intent',
          userShortNote: 'Test note',
        });

        expect(result.questions).toHaveLength(2);
        expect(result.questions[0].focus).toBe(focusArea);
        expect(result.generationMethod).toBe('ai');
        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should include RAG context in question generation', async () => {
      // Mock RAG similar logs
      const mockSimilarLogs = [
        { sessionId: 'old-1', userShortNote: 'Similar note 1', similarity: 0.85 },
        { sessionId: 'old-2', userShortNote: 'Similar note 2', similarity: 0.78 },
      ];

      vi.mocked(ragService.findSimilarLogs).mockResolvedValue(mockSimilarLogs);

      const result = await interviewer.generateQuestions({ /* ... */ });

      // Verify RAG service was called
      expect(ragService.findSimilarLogs).toHaveBeenCalledWith(
        expect.any(String),
        5 // default limit
      );

      // Verify OpenAI prompt includes similar logs
      const openaiCalls = vi.mocked(openai.createChatCompletion).mock.calls;
      const userMessage = openaiCalls[0][0][1].content;
      expect(userMessage).toContain('Similar note 1');
    });
  });

  describe('フォールバック処理', () => {
    it('should fallback to templates when AI fails', async () => {
      vi.mocked(openai.createChatCompletion).mockRejectedValue(
        new Error('OpenAI API Error')
      );

      const mockTemplates = [
        { template_text: 'Default Q1', variables: {} },
      ];
      vi.mocked(ragService.getQuestionTemplates).mockResolvedValue(mockTemplates);

      const result = await interviewer.generateQuestions({
        sessionId: 'test-123',
        focusArea: 'harmony',
        intentHypothesis: 'Test',
        userShortNote: 'Test',
      });

      expect(result.generationMethod).toBe('template');
      expect(result.confidence).toBe(0.5);
      expect(result.questions[0].text).toBe('Default Q1');
    });

    it('should use generic fallback when templates unavailable', async () => {
      vi.mocked(openai.createChatCompletion).mockRejectedValue(new Error());
      vi.mocked(ragService.getQuestionTemplates).mockResolvedValue([]);

      const result = await interviewer.generateQuestions({ /* ... */ });

      expect(result.generationMethod).toBe('fallback');
      expect(result.confidence).toBe(0.3);
      expect(result.questions).toHaveLength(1); // At least one generic question
    });
  });

  describe('エッジケース', () => {
    it('should handle malformed OpenAI JSON response', async () => {
      vi.mocked(openai.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [{ message: { content: 'Not valid JSON' } }]
        },
        usage: { /* ... */ }
      });

      const result = await interviewer.generateQuestions({ /* ... */ });

      // Should fallback gracefully
      expect(result.generationMethod).toBe('template');
    });

    it('should sanitize question text for SQL injection', async () => {
      const maliciousNote = "'; DROP TABLE sessions; --";

      const result = await interviewer.generateQuestions({
        sessionId: 'test-123',
        focusArea: 'harmony',
        intentHypothesis: 'Test',
        userShortNote: maliciousNote,
      });

      // Questions should not contain raw SQL
      result.questions.forEach(q => {
        expect(q.text).not.toContain('DROP TABLE');
      });
    });

    it('should limit question count to 3', async () => {
      const mockQuestions = Array(10).fill(null).map((_, i) => ({
        text: `Question ${i}`,
        focus: 'harmony',
        depth: 'medium'
      }));

      vi.mocked(openai.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [{ message: { content: JSON.stringify({ questions: mockQuestions }) } }]
        },
        usage: { /* ... */ }
      });

      const result = await interviewer.generateQuestions({ /* ... */ });

      expect(result.questions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Template Variable Substitution', () => {
    it('should replace {chord} variable with actual chord name', async () => {
      const template = {
        template_text: '{chord}を選んだ理由は何ですか？',
        variables: { chord: 'Fメジャー' }
      };

      const result = await interviewer.applyTemplateVariables(template);

      expect(result).toBe('Fメジャーを選んだ理由は何ですか？');
    });

    it('should handle missing variables gracefully', async () => {
      const template = {
        template_text: '{chord}と{key}の関係は？',
        variables: { chord: 'Am' } // Missing 'key'
      };

      const result = await interviewer.applyTemplateVariables(template);

      // Should either use placeholder or skip the question
      expect(result).not.toContain('{key}');
    });
  });
});
```

**Expected Test Count**: **29 tests**
- 7 focusArea tests
- 1 RAG integration test
- 2 fallback tests
- 5 edge case tests
- 2 template variable tests
- 12 additional error scenarios (rate limit, timeout, etc.)

---

### 1.2 RAGService Unit Tests

**Current Plan**:
```
✅ Task 2.5: ユニットテスト
- [ ] 埋め込み生成テスト
- [ ] 類似度検索テスト
- [ ] テンプレート検索テスト
```

**Gap Analysis**:
- ❌ **No embedding dimension validation** → What if OpenAI returns 384-dim instead of 1536-dim?
- ❌ **No vector similarity computation test** → How to verify cosine distance calculations?
- ❌ **No pgvector mock strategy** → Use testcontainers or mock pg client?
- ❌ **No rate limiting test** → OpenAI Embeddings API has strict limits (3,000 RPM)
- ❌ **No cache invalidation test** → When should cached embeddings be refreshed?

**Recommended Test Cases** (18+ tests):

```typescript
// lib/services/rag.service.test.ts

describe('RAGService', () => {
  describe('Embedding Generation', () => {
    it('should generate 1536-dimensional embeddings', async () => {
      const mockEmbedding = Array(1536).fill(0).map(() => Math.random());

      vi.mocked(openai.createEmbedding).mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { total_tokens: 100 }
      });

      const result = await ragService.generateEmbedding('Test text');

      expect(result).toHaveLength(1536);
      expect(result.every(n => typeof n === 'number')).toBe(true);
    });

    it('should throw error if embedding dimension mismatch', async () => {
      const wrongDimEmbedding = Array(384).fill(0); // Wrong dimension!

      vi.mocked(openai.createEmbedding).mockResolvedValue({
        data: [{ embedding: wrongDimEmbedding }]
      });

      await expect(
        ragService.generateEmbedding('Test')
      ).rejects.toThrow('Expected 1536 dimensions, got 384');
    });

    it('should normalize embeddings to unit length', async () => {
      const unnormalizedEmbedding = Array(1536).fill(1);

      vi.mocked(openai.createEmbedding).mockResolvedValue({
        data: [{ embedding: unnormalizedEmbedding }]
      });

      const result = await ragService.generateEmbedding('Test');

      // Verify L2 norm = 1.0
      const magnitude = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should cache embeddings by text hash', async () => {
      const text = 'Repeated text';

      await ragService.generateEmbedding(text);
      await ragService.generateEmbedding(text); // Second call should use cache

      expect(openai.createEmbedding).toHaveBeenCalledTimes(1);
    });

    it('should respect rate limiting (3000 RPM)', async () => {
      vi.useFakeTimers();

      const promises = Array(10).fill(null).map(() =>
        ragService.generateEmbedding('Test')
      );

      // Should queue requests instead of making all at once
      await vi.advanceTimersByTimeAsync(100);

      // Verify rate limiter was used
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });

  describe('Similar Log Search', () => {
    it('should return logs sorted by similarity score', async () => {
      // Mock pgvector query result
      const mockResults = [
        { session_id: 'sess-1', user_short_note: 'Note 1', similarity: 0.95 },
        { session_id: 'sess-2', user_short_note: 'Note 2', similarity: 0.87 },
        { session_id: 'sess-3', user_short_note: 'Note 3', similarity: 0.75 },
      ];

      vi.mocked(db.execute).mockResolvedValue({ rows: mockResults });

      const result = await ragService.findSimilarLogs('Query text', 5);

      expect(result).toHaveLength(3);
      expect(result[0].similarity).toBeGreaterThan(result[1].similarity);
      expect(result[1].similarity).toBeGreaterThan(result[2].similarity);
    });

    it('should filter out low-similarity results (<0.7)', async () => {
      const mockResults = [
        { session_id: 'sess-1', similarity: 0.95 },
        { session_id: 'sess-2', similarity: 0.60 }, // Below threshold
      ];

      vi.mocked(db.execute).mockResolvedValue({ rows: mockResults });

      const result = await ragService.findSimilarLogs('Query', 5);

      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('should use pgvector cosine distance operator', async () => {
      await ragService.findSimilarLogs('Test', 5);

      const sql = vi.mocked(db.execute).mock.calls[0][0];
      expect(sql).toContain('embedding <=> $1'); // cosine distance operator
      expect(sql).toContain('ORDER BY similarity DESC');
    });

    it('should handle empty result set', async () => {
      vi.mocked(db.execute).mockResolvedValue({ rows: [] });

      const result = await ragService.findSimilarLogs('Nonexistent', 5);

      expect(result).toEqual([]);
    });
  });

  describe('Question Templates', () => {
    it('should retrieve templates by focusArea and depth', async () => {
      const mockTemplates = [
        { id: '1', focus: 'harmony', depth: 'medium', template_text: 'Q1' },
        { id: '2', focus: 'harmony', depth: 'deep', template_text: 'Q2' },
      ];

      vi.mocked(db.select).mockResolvedValue(mockTemplates);

      const result = await ragService.getQuestionTemplates('harmony', 'medium');

      expect(result).toHaveLength(1);
      expect(result[0].depth).toBe('medium');
    });

    it('should return templates sorted by priority', async () => {
      const mockTemplates = [
        { priority: 1, template_text: 'Low priority' },
        { priority: 10, template_text: 'High priority' },
      ];

      vi.mocked(db.select).mockResolvedValue(mockTemplates);

      const result = await ragService.getQuestionTemplates('harmony');

      expect(result[0].template_text).toBe('High priority');
    });
  });

  describe('Error Handling', () => {
    it('should retry on transient OpenAI errors', async () => {
      vi.mocked(openai.createEmbedding)
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValueOnce({ data: [{ embedding: Array(1536).fill(0) }] });

      const result = await ragService.generateEmbedding('Test');

      expect(openai.createEmbedding).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should throw after max retries exceeded', async () => {
      vi.mocked(openai.createEmbedding).mockRejectedValue(
        new Error('Persistent error')
      );

      await expect(
        ragService.generateEmbedding('Test')
      ).rejects.toThrow('Max retries exceeded');
    });
  });
});
```

**Expected Test Count**: **18 tests**
- 5 embedding generation tests
- 4 similar log search tests
- 2 template retrieval tests
- 3 error handling tests
- 4 performance/optimization tests

---

## 2. Integration Test Strategy Review

### 2.1 Interview API Integration Tests

**Current Plan**:
```
✅ Task 3.4: 統合テスト
- [ ] 質問生成APIテスト
- [ ] 回答保存APIテスト
- [ ] 履歴取得APIテスト
```

**Gap Analysis**:
- ❌ **No transaction rollback test** → What if InterviewerService fails mid-transaction?
- ❌ **No concurrent request test** → Race condition when creating questions for same session?
- ❌ **No authentication edge case** → What if session belongs to different user?
- ❌ **No pagination test for GET /history** → How to handle 100+ Q&A pairs?

**Recommended Test Cases** (15+ tests, following Phase 1.2 sessions API pattern):

```typescript
// tests/integration/api/interview-api.test.ts

describe('Interview API Integration Tests', () => {
  beforeEach(async () => {
    // Setup: Create test user and session
    await db.insert(users).values(mockUser);
    await db.insert(sessions).values(mockSession);
  });

  describe('POST /api/interview/questions', () => {
    it('should generate questions for valid sessionId', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      // Mock InterviewerService
      const mockQuestions = [
        { text: 'Q1', focus: 'harmony', depth: 'medium', order: 0 },
        { text: 'Q2', focus: 'harmony', depth: 'deep', order: 1 },
      ];

      vi.mocked(interviewer.generateQuestions).mockResolvedValue({
        questions: mockQuestions,
        generationMethod: 'ai',
        confidence: 0.85
      });

      const request = new NextRequest('http://localhost/api/interview/questions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-123' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toHaveLength(2);
      expect(data.generationMethod).toBe('ai');

      // Verify questions were saved to DB
      const savedQuestions = await db.select()
        .from(interviewQuestions)
        .where(eq(interviewQuestions.sessionId, 'session-123'));

      expect(savedQuestions).toHaveLength(2);
    });

    it('should return 400 for non-existent sessionId', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      const request = new NextRequest('http://localhost/api/interview/questions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'nonexistent' })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Session not found'
      });
    });

    it('should return 403 when accessing other user\'s session', async () => {
      mockAuth.mockReturnValue({ userId: 'different-user' });

      const request = new NextRequest('http://localhost/api/interview/questions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-123' })
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should handle InterviewerService failure with partial rollback', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      vi.mocked(interviewer.generateQuestions).mockRejectedValue(
        new Error('OpenAI timeout')
      );

      const request = new NextRequest('http://localhost/api/interview/questions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-123' })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);

      // Verify no orphaned questions in DB
      const questions = await db.select()
        .from(interviewQuestions)
        .where(eq(interviewQuestions.sessionId, 'session-123'));

      expect(questions).toHaveLength(0);
    });

    it('should prevent duplicate question generation for same session', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      // Pre-populate existing questions
      await db.insert(interviewQuestions).values({
        id: 'existing-q1',
        sessionId: 'session-123',
        text: 'Existing question',
        focus: 'harmony',
        depth: 'medium',
        order: 0
      });

      const request = new NextRequest('http://localhost/api/interview/questions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-123' })
      });

      const response = await POST(request);

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: 'Questions already generated for this session'
      });
    });
  });

  describe('POST /api/interview/answers', () => {
    beforeEach(async () => {
      // Setup: Create test question
      await db.insert(interviewQuestions).values({
        id: 'question-123',
        sessionId: 'session-123',
        text: 'Test question',
        focus: 'harmony',
        depth: 'medium',
        order: 0
      });
    });

    it('should save answer with AI insights', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      // Mock AI insights generation
      vi.mocked(openai.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [{
            message: {
              content: JSON.stringify({
                keyPhrases: ['サビ', '流れ', '滑らか'],
                emotionalTone: 'analytical'
              })
            }
          }]
        }
      });

      const request = new NextRequest('http://localhost/api/interview/answers', {
        method: 'POST',
        body: JSON.stringify({
          questionId: 'question-123',
          text: 'サビへの流れを滑らかにするため'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.answer.aiInsights.keyPhrases).toContain('サビ');
      expect(data.answer.aiInsights.emotionalTone).toBe('analytical');
    });

    it('should handle empty answer text gracefully', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      const request = new NextRequest('http://localhost/api/interview/answers', {
        method: 'POST',
        body: JSON.stringify({
          questionId: 'question-123',
          text: ''
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Answer text is required'
      });
    });

    it('should update existing answer instead of creating duplicate', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      // Pre-populate existing answer
      await db.insert(interviewAnswers).values({
        id: 'answer-123',
        questionId: 'question-123',
        text: 'Old answer',
        aiInsights: {}
      });

      const request = new NextRequest('http://localhost/api/interview/answers', {
        method: 'POST',
        body: JSON.stringify({
          questionId: 'question-123',
          text: 'Updated answer'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify only one answer exists
      const answers = await db.select()
        .from(interviewAnswers)
        .where(eq(interviewAnswers.questionId, 'question-123'));

      expect(answers).toHaveLength(1);
      expect(answers[0].text).toBe('Updated answer');
    });
  });

  describe('GET /api/interview/history', () => {
    it('should retrieve Q&A pairs for session', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      // Setup: Create questions and answers
      await db.insert(interviewQuestions).values([
        { id: 'q1', sessionId: 'session-123', text: 'Q1', focus: 'harmony', depth: 'medium', order: 0 },
        { id: 'q2', sessionId: 'session-123', text: 'Q2', focus: 'harmony', depth: 'deep', order: 1 },
      ]);

      await db.insert(interviewAnswers).values([
        { id: 'a1', questionId: 'q1', text: 'A1', aiInsights: {} },
        { id: 'a2', questionId: 'q2', text: 'A2', aiInsights: {} },
      ]);

      const request = new NextRequest(
        'http://localhost/api/interview/history?sessionId=session-123',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.qaPairs).toHaveLength(2);
      expect(data.qaPairs[0].question.text).toBe('Q1');
      expect(data.qaPairs[0].answer.text).toBe('A1');
    });

    it('should support pagination for large Q&A sets', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      // Setup: 50 Q&A pairs
      const questions = Array(50).fill(null).map((_, i) => ({
        id: `q${i}`,
        sessionId: 'session-123',
        text: `Question ${i}`,
        focus: 'harmony',
        depth: 'medium',
        order: i
      }));

      await db.insert(interviewQuestions).values(questions);

      const request = new NextRequest(
        'http://localhost/api/interview/history?sessionId=session-123&limit=20&offset=0',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.qaPairs).toHaveLength(20);
      expect(data.pagination).toMatchObject({
        total: 50,
        limit: 20,
        offset: 0,
        hasMore: true
      });
    });

    it('should return only answered questions', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-user-123' });

      // Setup: 3 questions, only 1 answered
      await db.insert(interviewQuestions).values([
        { id: 'q1', sessionId: 'session-123', text: 'Q1', focus: 'harmony', depth: 'medium', order: 0 },
        { id: 'q2', sessionId: 'session-123', text: 'Q2', focus: 'harmony', depth: 'medium', order: 1 },
      ]);

      await db.insert(interviewAnswers).values([
        { id: 'a1', questionId: 'q1', text: 'A1', aiInsights: {} },
      ]);

      const request = new NextRequest(
        'http://localhost/api/interview/history?sessionId=session-123',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.qaPairs).toHaveLength(1);
    });
  });
});
```

**Expected Test Count**: **15 tests**
- 5 POST /questions tests
- 3 POST /answers tests
- 3 GET /history tests
- 4 edge cases (concurrent requests, transaction rollback, etc.)

---

## 3. E2E Test Strategy Review

### 3.1 Phase 1.3 Complete Flow

**Current Plan**:
```
✅ Task 4.1: エンドツーエンドフロー
- [ ] Session作成 → Analyzer → Interview フロー
- [ ] RAG蓄積 → 検索フロー
- [ ] tests/e2e/muednote-phase1.3.spec.ts 作成
```

**Gap Analysis**:
- ❌ **No UI interaction test** → How does user trigger question generation in UI?
- ❌ **No real-time feedback test** → Are questions displayed incrementally or all at once?
- ❌ **No accessibility test** → Can keyboard-only users navigate interview flow?

**Recommended Test Cases** (5+ E2E tests, following Phase 2 pattern):

```typescript
// tests/e2e/muednote-phase1.3.spec.ts

import { test, expect } from '@playwright/test';

test.describe('MUEDnote Phase 1.3 - Interview Flow', () => {
  test('should complete full session → analyzer → interview flow', async ({ page }) => {
    // Navigate to MUEDnote page
    await page.goto('/muednote');
    await page.waitForLoadState('networkidle');

    // Step 1: Create new session
    await page.click('button:has-text("新しいセッション")');
    await page.fill('input[name="title"]', 'Test Composition Session');
    await page.fill('textarea[name="userShortNote"]', 'サビのコードをFからGに変えた。流れが良くなった。');
    await page.selectOption('select[name="type"]', 'composition');
    await page.click('button:has-text("保存")');

    // Wait for analyzer to complete
    await expect(page.locator('text=分析完了')).toBeVisible({ timeout: 10000 });

    // Verify AI annotations displayed
    await expect(page.locator('text=フォーカスエリア: harmony')).toBeVisible();

    // Step 2: Generate interview questions
    await page.click('button:has-text("質問を生成")');

    // Wait for questions to appear
    await expect(page.locator('[data-testid="interview-question"]')).toHaveCount(2, {
      timeout: 5000 // < 3s target + buffer
    });

    // Verify question focus and depth
    const firstQuestion = page.locator('[data-testid="interview-question"]').first();
    await expect(firstQuestion).toContainText('harmony');

    // Step 3: Answer questions
    await page.fill('textarea[name="answer-0"]', '転調をスムーズにするため');
    await page.click('button:has-text("回答を保存")');

    // Wait for AI insights
    await expect(page.locator('text=キーフレーズ:')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=転調')).toBeVisible();

    // Step 4: View interview history
    await page.click('button:has-text("履歴を見る")');

    await expect(page.locator('[data-testid="qa-pair"]')).toHaveCount(1);
  });

  test('should display RAG-enhanced questions based on similar logs', async ({ page }) => {
    // Pre-populate similar sessions via API
    await page.request.post('/api/muednote/sessions', {
      data: {
        type: 'composition',
        title: 'Previous Session',
        userShortNote: 'サビのコード進行を変更。明るい感じに。'
      }
    });

    // Create new similar session
    await page.goto('/muednote');
    await page.click('button:has-text("新しいセッション")');
    await page.fill('input[name="title"]', 'New Session');
    await page.fill('textarea[name="userShortNote"]', 'サビのコードをDからEに変えた。');
    await page.click('button:has-text("保存")');

    // Generate questions
    await page.click('button:has-text("質問を生成")');

    // Wait for questions
    await page.waitForSelector('[data-testid="interview-question"]');

    // Verify RAG context indicator
    await expect(page.locator('text=類似セッション')).toBeVisible();
    await expect(page.locator('text=Previous Session')).toBeVisible();
  });

  test('should handle question generation failure gracefully', async ({ page }) => {
    // Simulate OpenAI API failure (via test mode flag)
    await page.addInitScript(() => {
      window.localStorage.setItem('E2E_SIMULATE_AI_FAILURE', 'true');
    });

    await page.goto('/muednote');

    // Create session
    await page.click('button:has-text("新しいセッション")');
    await page.fill('input[name="title"]', 'Test Session');
    await page.fill('textarea[name="userShortNote"]', 'Test note');
    await page.click('button:has-text("保存")');

    // Try to generate questions
    await page.click('button:has-text("質問を生成")');

    // Should show fallback questions
    await expect(page.locator('text=テンプレート質問')).toBeVisible();
    await expect(page.locator('[data-testid="interview-question"]')).toHaveCount(1);
  });

  test('should measure RAG search performance < 500ms', async ({ page }) => {
    await page.goto('/muednote');

    // Create session
    await page.click('button:has-text("新しいセッション")');
    await page.fill('textarea[name="userShortNote"]', 'Test note for performance');
    await page.click('button:has-text("保存")');

    // Measure question generation time
    const startTime = Date.now();

    await page.click('button:has-text("質問を生成")');
    await page.waitForSelector('[data-testid="interview-question"]');

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify performance target (< 3s total, RAG search < 500ms is part of this)
    expect(duration).toBeLessThan(3000);

    // Check if performance metrics are logged
    const performanceLogs = await page.evaluate(() => {
      return window.localStorage.getItem('INTERVIEW_PERFORMANCE_METRICS');
    });

    if (performanceLogs) {
      const metrics = JSON.parse(performanceLogs);
      expect(metrics.ragSearchDuration).toBeLessThan(500);
    }
  });

  test('should support keyboard navigation through interview flow', async ({ page }) => {
    await page.goto('/muednote');

    // Tab to "新しいセッション" button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Fill form with keyboard
    await page.keyboard.type('Test Session');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Test note');

    // Submit with keyboard
    await page.keyboard.press('Enter');

    // Wait for questions
    await page.waitForSelector('[data-testid="interview-question"]');

    // Verify all interactive elements have focus indicators
    const focusableElements = await page.$$('[data-testid="interview-question"] button, [data-testid="interview-question"] textarea');
    for (const element of focusableElements) {
      await element.focus();
      const hasFocusIndicator = await element.evaluate(el => {
        const styles = window.getComputedStyle(el, ':focus');
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });
      expect(hasFocusIndicator).toBe(true);
    }
  });
});
```

**Expected Test Count**: **5 E2E tests**
- 1 complete flow test
- 1 RAG-enhanced questions test
- 1 fallback handling test
- 1 performance test
- 1 accessibility test

---

## 4. Performance Testing Strategy

### 4.1 Target Metrics

**Current Plan**:
```
✅ Task 4.2: パフォーマンステスト
- [ ] RAG検索レスポンス時間測定（< 500ms）
- [ ] 質問生成時間測定（< 3秒）
- [ ] データベースクエリ最適化
```

**Gap Analysis**:
- ❌ **No implementation strategy for assertions** → How to programmatically verify <500ms?
- ❌ **No load testing plan** → What if 100 users generate questions simultaneously?
- ❌ **No database connection pool test** → How to verify no connection leaks?
- ❌ **No pgvector index optimization test** → IVFFlat vs HNSW performance?

**Recommended Implementation**:

```typescript
// tests/performance/interview-performance.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';

describe('Interview Performance Tests', () => {
  describe('RAG Search Performance', () => {
    it('should complete vector search in < 500ms', async () => {
      const queryText = 'サビのコード進行を変更';

      const start = performance.now();
      const results = await ragService.findSimilarLogs(queryText, 5);
      const end = performance.now();

      const duration = end - start;

      expect(duration).toBeLessThan(500);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle 100 concurrent RAG searches without degradation', async () => {
      const promises = Array(100).fill(null).map((_, i) =>
        measureAsync(async () => {
          await ragService.findSimilarLogs(`Test query ${i}`, 5);
        })
      );

      const results = await Promise.all(promises);

      // P95 latency should be < 1000ms (2x normal latency)
      const p95 = percentile(results.map(r => r.duration), 95);
      expect(p95).toBeLessThan(1000);

      // P99 latency should be < 1500ms
      const p99 = percentile(results.map(r => r.duration), 99);
      expect(p99).toBeLessThan(1500);
    });

    it('should optimize pgvector index for cosine distance', async () => {
      // Verify HNSW index exists (faster than IVFFlat for high-dimensional vectors)
      const indexInfo = await db.execute(sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'rag_embeddings'
          AND indexdef LIKE '%vector_cosine_ops%'
      `);

      expect(indexInfo.rows.length).toBeGreaterThan(0);

      // Verify index is using HNSW (not IVFFlat)
      const hnswIndex = indexInfo.rows.find(row =>
        row.indexdef.includes('USING hnsw')
      );

      expect(hnswIndex).toBeDefined();
    });
  });

  describe('Question Generation Performance', () => {
    it('should generate questions in < 3 seconds', async () => {
      const start = performance.now();

      const result = await interviewer.generateQuestions({
        sessionId: 'test-123',
        focusArea: 'harmony',
        intentHypothesis: 'Test intent',
        userShortNote: 'Test note'
      });

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(3000);
      expect(result.questions.length).toBeGreaterThan(0);
    });

    it('should measure breakdown of generation time', async () => {
      const metrics = await measureGenerationBreakdown({
        sessionId: 'test-123',
        focusArea: 'harmony',
        intentHypothesis: 'Test',
        userShortNote: 'Test'
      });

      // Expected breakdown:
      // - RAG search: < 500ms
      // - OpenAI API call: < 2000ms
      // - DB save: < 500ms

      expect(metrics.ragSearch).toBeLessThan(500);
      expect(metrics.openaiCall).toBeLessThan(2000);
      expect(metrics.dbSave).toBeLessThan(500);
      expect(metrics.total).toBeLessThan(3000);
    });
  });

  describe('Database Connection Pool', () => {
    it('should not leak connections under load', async () => {
      const initialConnections = await getActiveConnections();

      // Execute 1000 queries
      const promises = Array(1000).fill(null).map(() =>
        ragService.findSimilarLogs('Test', 5)
      );

      await Promise.all(promises);

      // Wait for connection pool cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalConnections = await getActiveConnections();

      // Should return to initial state (± 5 connections for background tasks)
      expect(Math.abs(finalConnections - initialConnections)).toBeLessThan(5);
    });
  });
});

// Helper functions
function percentile(values: number[], p: number): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

async function measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
}

async function measureGenerationBreakdown(input: any) {
  // Implementation with performance.mark/measure
  // Returns { ragSearch, openaiCall, dbSave, total }
}

async function getActiveConnections(): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*) FROM pg_stat_activity
    WHERE datname = current_database()
  `);
  return parseInt(result.rows[0].count);
}
```

**Load Testing with k6** (recommended addition):

```javascript
// tests/performance/interview-load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },  // Peak at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests < 3s
    errors: ['rate<0.1'], // Error rate < 10%
  },
};

export default function () {
  // Create session
  const sessionRes = http.post(
    'http://localhost:3000/api/muednote/sessions',
    JSON.stringify({
      type: 'composition',
      title: 'Load Test Session',
      userShortNote: 'Test note for load testing'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(sessionRes, {
    'session created': (r) => r.status === 200,
  }) || errorRate.add(1);

  const sessionId = sessionRes.json('session.id');

  // Generate questions
  const questionsRes = http.post(
    'http://localhost:3000/api/interview/questions',
    JSON.stringify({ sessionId }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(questionsRes, {
    'questions generated in < 3s': (r) => r.timings.duration < 3000,
  }) || errorRate.add(1);

  sleep(1);
}
```

**Expected Test Count**: **8 performance tests**
- 3 RAG search performance tests
- 2 question generation tests
- 1 connection pool test
- 2 k6 load testing scenarios

---

## 5. Test Infrastructure Requirements

### 5.1 pgvector Test Environment

**Recommended Approach**: **Testcontainers for Integration Tests + Mocks for Unit Tests**

```typescript
// tests/setup/testcontainers.setup.ts

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

let container: PostgreSqlContainer;
let testPool: Pool;
let testDb: any;

export async function setupTestDatabase() {
  // Start pgvector container
  container = await new PostgreSqlContainer('pgvector/pgvector:pg16')
    .withExposedPorts(5432)
    .start();

  // Create connection pool
  testPool = new Pool({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    user: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
  });

  // Initialize Drizzle
  testDb = drizzle(testPool);

  // Run migrations
  await migrate(testDb, { migrationsFolder: './db/migrations' });

  // Enable pgvector extension
  await testPool.query('CREATE EXTENSION IF NOT EXISTS vector;');

  return { testDb, testPool };
}

export async function teardownTestDatabase() {
  await testPool.end();
  await container.stop();
}
```

**Usage in Integration Tests**:

```typescript
// tests/integration/api/interview-api.test.ts

import { beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../setup/testcontainers.setup';

let testDb: any;
let testPool: any;

beforeAll(async () => {
  ({ testDb, testPool } = await setupTestDatabase());
}, 60000); // 60s timeout for container startup

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Interview API Integration Tests', () => {
  // Tests use testDb instead of production db
});
```

### 5.2 Test Data Fixtures

**Create comprehensive fixtures for Phase 1.3**:

```typescript
// tests/fixtures/phase1.3-fixtures.ts

export const mockEmbedding1536 = (): number[] => {
  // Pre-computed embedding for deterministic tests
  const embedding = Array(1536).fill(0);
  // Add some structure to make it realistic
  for (let i = 0; i < 1536; i++) {
    embedding[i] = Math.sin(i / 100) * 0.5;
  }
  return embedding;
};

export const mockSessionData = {
  id: 'session-test-123',
  userId: 'user-test-123',
  type: 'composition' as const,
  title: 'Test Composition Session',
  userShortNote: 'サビのコードをFからGに変更。流れが良くなった。',
  projectId: 'project-456',
  projectName: 'Test Song',
  dawMeta: {
    dawName: 'Logic Pro',
    tempo: 120,
    timeSignature: '4/4',
    keyEstimate: 'C Major',
  },
  aiAnnotations: {
    focusArea: 'harmony',
    intentHypothesis: 'サビへの流れを滑らかにする意図',
    confidence: 0.85,
    analysisMethod: 'text_inference',
  },
  isPublic: false,
  shareWithMentor: true,
  status: 'draft' as const,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

export const mockQuestionTemplates = [
  {
    id: 'template-1',
    focus: 'harmony',
    depth: 'shallow',
    template_text: '{chord}を使った理由は何ですか？',
    variables: { chord: 'Gメジャー' },
    priority: 10,
  },
  {
    id: 'template-2',
    focus: 'harmony',
    depth: 'medium',
    template_text: 'コード進行を変更した意図を教えてください。',
    variables: {},
    priority: 8,
  },
  {
    id: 'template-3',
    focus: 'harmony',
    depth: 'deep',
    template_text: 'この和音の選択が楽曲全体の調性にどう影響しますか？',
    variables: {},
    priority: 5,
  },
];

export const mockSimilarLogs = [
  {
    sessionId: 'similar-1',
    userShortNote: 'サビのコードをDからEに変更。明るい雰囲気になった。',
    similarity: 0.87,
    focusArea: 'harmony',
  },
  {
    sessionId: 'similar-2',
    userShortNote: 'ブリッジのコード進行を調整。転調をスムーズに。',
    similarity: 0.75,
    focusArea: 'harmony',
  },
];

export const mockInterviewQuestions = [
  {
    id: 'question-1',
    sessionId: 'session-test-123',
    text: 'FメジャーからGメジャーに変更した理由は何ですか？',
    focus: 'harmony' as const,
    depth: 'medium' as const,
    order: 0,
    createdAt: new Date('2025-01-01T00:01:00Z'),
  },
  {
    id: 'question-2',
    sessionId: 'session-test-123',
    text: 'この転調が楽曲全体の印象にどう影響しますか？',
    focus: 'harmony' as const,
    depth: 'deep' as const,
    order: 1,
    createdAt: new Date('2025-01-01T00:01:00Z'),
  },
];

export const mockInterviewAnswers = [
  {
    id: 'answer-1',
    questionId: 'question-1',
    text: 'サビへの流れを滑らかにして、聴き手に期待感を持たせるため',
    aiInsights: {
      keyPhrases: ['サビ', '流れ', '滑らか', '期待感'],
      emotionalTone: 'analytical',
      intentClarity: 0.9,
    },
    createdAt: new Date('2025-01-01T00:02:00Z'),
    updatedAt: new Date('2025-01-01T00:02:00Z'),
  },
];
```

### 5.3 CI/CD Integration

**Update GitHub Actions workflow** (`.github/workflows/test.yml`):

```yaml
name: Phase 1.3 Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run performance tests
        run: npm run test:performance

      - name: Run k6 load tests
        run: k6 run tests/performance/interview-load-test.js
```

---

## 6. Coverage Target Analysis

### 6.1 Is >80% Realistic?

**Assessment**: ✅ **YES - Achievable with proper strategy**

**Calculation** (based on recommended test plan):

| Component | LoC Est. | Test Count | Coverage Est. | Weight |
|-----------|----------|------------|---------------|--------|
| InterviewerService | ~300 | 29 | 90% | 30% |
| RAGService | ~400 | 18 | 85% | 35% |
| Interview API (3 routes) | ~250 | 15 | 88% | 25% |
| Database migrations | ~100 | N/A | 60% | 10% |

**Weighted Coverage**: 0.90×0.30 + 0.85×0.35 + 0.88×0.25 + 0.60×0.10 = **0.85 (85%)**

**Recommendation**: Adjust target to **>85%** to reflect comprehensive test plan.

### 6.2 Coverage Gaps to Address

1. **Database Migrations**: Currently estimated at 60%
   - **Solution**: Add migration rollback tests + data integrity checks

2. **Error Boundaries**: Edge cases like API timeouts, rate limits
   - **Solution**: Add dedicated error scenario tests (12+ tests)

3. **Prompt Engineering**: Hard to test LLM output determinism
   - **Solution**: Mock OpenAI responses, test prompt structure (not output quality)

---

## 7. RAG-Specific Testing Strategy (NEW)

**Critical Addition** - Not in original plan:

### 7.1 Retrieval Quality Metrics

```typescript
// tests/rag/retrieval-quality.test.ts

describe('RAG Retrieval Quality', () => {
  it('should achieve Recall@5 > 0.8 for similar sessions', async () => {
    // Test data: 100 sessions with known similarity labels
    const testQueries = await loadTestQueries(); // From fixture

    let hits = 0;
    for (const query of testQueries) {
      const results = await ragService.findSimilarLogs(query.text, 5);

      // Check if any of top 5 results are in ground truth
      const hasRelevant = results.some(r =>
        query.relevantSessionIds.includes(r.sessionId)
      );

      if (hasRelevant) hits++;
    }

    const recall = hits / testQueries.length;
    expect(recall).toBeGreaterThan(0.8);
  });

  it('should achieve MRR > 0.7 for exact match queries', async () => {
    const testQueries = await loadTestQueries();

    let mrrSum = 0;
    for (const query of testQueries) {
      const results = await ragService.findSimilarLogs(query.text, 10);

      // Find rank of first relevant result
      const firstRelevantRank = results.findIndex(r =>
        query.relevantSessionIds.includes(r.sessionId)
      ) + 1;

      if (firstRelevantRank > 0) {
        mrrSum += 1 / firstRelevantRank;
      }
    }

    const mrr = mrrSum / testQueries.length;
    expect(mrr).toBeGreaterThan(0.7);
  });

  it('should filter out irrelevant results (similarity < 0.7)', async () => {
    const results = await ragService.findSimilarLogs(
      'Completely unrelated query about weather',
      10
    );

    // Should return empty or very few results
    expect(results.length).toBeLessThan(3);
    if (results.length > 0) {
      expect(results[0].similarity).toBeGreaterThan(0.7);
    }
  });
});
```

### 7.2 Semantic Evaluation

```typescript
// tests/rag/semantic-evaluation.test.ts

describe('RAG Semantic Evaluation', () => {
  it('should embed semantically similar texts close together', async () => {
    const text1 = 'サビのコードをFからGに変更';
    const text2 = 'サビのコード進行を F→G に変えた';
    const text3 = 'ドラムのパターンを 4つ打ちに変更'; // Different topic

    const emb1 = await ragService.generateEmbedding(text1);
    const emb2 = await ragService.generateEmbedding(text2);
    const emb3 = await ragService.generateEmbedding(text3);

    const similarity12 = cosineSimilarity(emb1, emb2);
    const similarity13 = cosineSimilarity(emb1, emb3);

    // Similar texts should have higher similarity
    expect(similarity12).toBeGreaterThan(0.8);
    expect(similarity13).toBeLessThan(0.6);
  });
});
```

---

## 8. Recommendations Summary

### Priority 1 (Critical) 🔴

1. **Define pgvector Test Strategy**
   - Implement testcontainers setup for integration tests
   - Create mock strategy for unit tests
   - Estimated effort: 2 days

2. **Add RAG Quality Metrics**
   - Implement Recall@K, MRR tests
   - Create test query fixtures with ground truth labels
   - Estimated effort: 1.5 days

3. **Implement Performance Assertions**
   - Create custom Vitest matchers for latency assertions
   - Add performance breakdown measurement utilities
   - Estimated effort: 1 day

### Priority 2 (High) 🟡

4. **Expand Error Scenario Coverage**
   - Add 12+ error tests (rate limits, timeouts, dimension mismatches)
   - Implement circuit breaker pattern for OpenAI API
   - Estimated effort: 2 days

5. **Create Comprehensive Fixtures**
   - Mock embeddings, question templates, session data
   - Ensure fixtures cover all 7 focusAreas
   - Estimated effort: 1 day

### Priority 3 (Medium) 🟢

6. **Add Load Testing**
   - Implement k6 load tests for 100+ concurrent users
   - Monitor P95/P99 latencies
   - Estimated effort: 1.5 days

7. **Enhance CI/CD Integration**
   - Add pgvector service to GitHub Actions
   - Implement test result reporting with coverage badges
   - Estimated effort: 0.5 days

### Total Additional Effort: ~10 days

**Revised Schedule**: Day 11-30 (20 days total)

---

## 9. Test Case Summary

### Proposed Test Count by Category

| Category | Original Plan | Recommended | Delta |
|----------|---------------|-------------|-------|
| InterviewerService Unit | ~5 | **29** | +24 |
| RAGService Unit | ~3 | **18** | +15 |
| Interview API Integration | ~3 | **15** | +12 |
| E2E Tests | ~2 | **5** | +3 |
| Performance Tests | ~2 | **8** | +6 |
| RAG Quality Tests | 0 | **6** | +6 |
| **TOTAL** | **~15** | **81** | **+66** |

### Coverage Projection

- **Phase 1.2 Baseline**: 41 tests passing (100%)
- **Phase 1.3 Recommended**: 81 tests
- **Total Phase 1.2-1.3**: 122 tests
- **Expected Coverage**: **85-90%** (exceeds >80% target)

---

## 10. Missing Considerations

### 10.1 Provenance & Lineage Testing

**Question**: How to test that RAG embeddings are linked to source sessions?

```typescript
it('should maintain provenance link from embedding to source session', async () => {
  const sessionId = 'session-123';
  const embedding = await ragService.generateEmbedding('Test note');

  await ragService.upsertEmbedding(sessionId, embedding);

  // Verify provenance record
  const provenance = await db.select()
    .from(provenanceTable)
    .where(eq(provenanceTable.sourceId, sessionId));

  expect(provenance).toHaveLength(1);
  expect(provenance[0].dataType).toBe('rag_embedding');
});
```

### 10.2 Multi-Language Support

**Question**: Does RAG work with English notes? Mixed JP/EN notes?

```typescript
it('should handle mixed Japanese/English notes', async () => {
  const mixedNote = 'Intro部分にreverbを追加、もっとspaceyな感じに';
  const results = await ragService.findSimilarLogs(mixedNote, 5);

  expect(results.length).toBeGreaterThan(0);
});
```

### 10.3 Embedding Model Version Management

**Question**: What happens when OpenAI updates text-embedding-ada-002?

```typescript
it('should detect embedding model version mismatch', async () => {
  // Mock old embedding (different dimension)
  const oldEmbedding = Array(512).fill(0);

  await expect(
    ragService.upsertEmbedding('session-123', oldEmbedding)
  ).rejects.toThrow('Embedding dimension mismatch');
});
```

---

## Conclusion

**Final Assessment**: ⭐⭐⭐⭐⭐ (5/5) - **EXCELLENT with Enhancements**

The original Phase 1.3 test strategy provides a solid foundation, but implementing the 66 additional tests recommended in this review will:

1. ✅ Ensure **>85% coverage** (exceeds >80% target)
2. ✅ Validate RAG system reliability with industry-standard metrics (Recall@K, MRR)
3. ✅ Prove performance targets (<500ms RAG, <3s generation) are met
4. ✅ Provide confidence for production deployment

**Next Steps**:
1. Review this document with development team
2. Prioritize Critical (🔴) recommendations for implementation
3. Update PHASE1.3_IMPLEMENTATION_PLAN.md with refined test tasks
4. Allocate 2-3 additional days for test infrastructure setup

---

**Document Author**: Claude Code (Sonnet 4.5)
**Review Date**: 2025-11-20
**Status**: Ready for Team Review
**Confidence**: High (Based on Phase 1.2 success + 2025 best practices research)
