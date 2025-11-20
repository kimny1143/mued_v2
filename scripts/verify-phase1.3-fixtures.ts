/**
 * Verification Script for Phase 1.3 Fixtures
 *
 * Simple validation script to verify all fixtures are properly structured.
 */

import {
  mockSessions,
  mockQuestionTemplates,
  mockEmbeddings,
  ragGroundTruth,
  mockInterviewQuestions,
  mockInterviewAnswers,
  mockRAGEmbeddings,
  Phase13FixtureFactory,
  phase13Helpers,
  generateDeterministicVector,
} from '../tests/fixtures/phase1.3-fixtures';

console.log('🔍 Verifying Phase 1.3 Fixtures...\n');

// 1. Mock Sessions
console.log('✅ Mock Sessions:');
console.log(`   - Total: ${mockSessions.length} (expected: 7)`);
const focusAreas = new Set(mockSessions.map((s) => s.aiAnnotations.focusArea));
console.log(`   - Unique focusAreas: ${focusAreas.size} (expected: 7)`);
console.log(`   - FocusAreas: ${Array.from(focusAreas).join(', ')}`);

// 2. Question Templates
console.log('\n✅ Question Templates:');
console.log(`   - Total: ${mockQuestionTemplates.length} (expected: 21)`);
const templatesByFocus = new Map<string, number>();
mockQuestionTemplates.forEach((t) => {
  templatesByFocus.set(t.focus, (templatesByFocus.get(t.focus) || 0) + 1);
});
console.log(`   - Templates per focusArea: ${Array.from(templatesByFocus.entries()).map(([k, v]) => `${k}:${v}`).join(', ')}`);

// 3. Mock Embeddings
console.log('\n✅ Mock Embeddings:');
console.log(`   - Total entries: ${Object.keys(mockEmbeddings).length}`);
const sampleKey = Object.keys(mockEmbeddings)[0];
const sampleVector = mockEmbeddings[sampleKey];
console.log(`   - Vector dimension: ${sampleVector.length} (expected: 1536)`);
console.log(`   - Value range: [${Math.min(...sampleVector).toFixed(3)}, ${Math.max(...sampleVector).toFixed(3)}]`);

// 4. Deterministic Vector Generation
console.log('\n✅ Deterministic Vector Generation:');
const text1 = 'テストテキスト';
const vec1 = generateDeterministicVector(text1);
const vec2 = generateDeterministicVector(text1);
const isDeterministic = JSON.stringify(vec1) === JSON.stringify(vec2);
console.log(`   - Deterministic: ${isDeterministic ? 'Yes ✓' : 'No ✗'}`);

// 5. RAG Ground Truth
console.log('\n✅ RAG Ground Truth:');
console.log(`   - Total queries: ${ragGroundTruth.length} (expected: ≥10)`);
const avgExpectedResults = ragGroundTruth.reduce((sum, gt) => sum + gt.expectedResults.length, 0) / ragGroundTruth.length;
console.log(`   - Avg expected results per query: ${avgExpectedResults.toFixed(1)}`);

// 6. Interview Questions & Answers
console.log('\n✅ Interview Questions & Answers:');
console.log(`   - Questions: ${mockInterviewQuestions.length}`);
console.log(`   - Answers: ${mockInterviewAnswers.length}`);

// 7. RAG Embeddings Database Records
console.log('\n✅ RAG Embeddings (DB Records):');
console.log(`   - Total: ${mockRAGEmbeddings.length} (expected: ${mockSessions.length})`);
const sourceTypes = new Set(mockRAGEmbeddings.map((e) => e.sourceType));
console.log(`   - Source types: ${Array.from(sourceTypes).join(', ')}`);

// 8. Factory Functions
console.log('\n✅ Factory Functions:');
const testSession = Phase13FixtureFactory.createSession();
console.log(`   - createSession(): ${testSession.id.startsWith('session-') ? 'OK' : 'FAIL'}`);
const testQuestion = Phase13FixtureFactory.createQuestion('session-001');
console.log(`   - createQuestion(): ${testQuestion.id.startsWith('q-') ? 'OK' : 'FAIL'}`);
const testAnswer = Phase13FixtureFactory.createAnswer('q-001');
console.log(`   - createAnswer(): ${testAnswer.id.startsWith('a-') ? 'OK' : 'FAIL'}`);
const batchSessions = Phase13FixtureFactory.createBatchSessions(5, 'harmony');
console.log(`   - createBatchSessions(5): ${batchSessions.length === 5 ? 'OK' : 'FAIL'}`);

// 9. Helper Functions
console.log('\n✅ Helper Functions:');
const harmonyTemplates = phase13Helpers.getTemplatesByFocus('harmony');
console.log(`   - getTemplatesByFocus('harmony'): ${harmonyTemplates.length} templates`);
const deepTemplates = phase13Helpers.getTemplatesByDepth('deep');
console.log(`   - getTemplatesByDepth('deep'): ${deepTemplates.length} templates`);

const vec1Test = [1, 0, 0];
const vec2Test = [1, 0, 0];
const similarity = phase13Helpers.cosineSimilarity(vec1Test, vec2Test);
console.log(`   - cosineSimilarity([1,0,0], [1,0,0]): ${similarity.toFixed(3)} (expected: 1.000)`);

const queryEmbedding = mockEmbeddings['サビのコード進行をFからGに変更した'];
const similarSessions = phase13Helpers.findSimilarSessions(queryEmbedding, 3);
console.log(`   - findSimilarSessions(): ${similarSessions.length} results`);
console.log(`   - Top result similarity: ${similarSessions[0].similarity.toFixed(3)} (expected: ~1.000)`);

// 10. Validation Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Validation Summary:');
console.log('='.repeat(60));

const checks = [
  { name: 'Mock Sessions (7 focusAreas)', pass: mockSessions.length === 7 && focusAreas.size === 7 },
  { name: 'Question Templates (21 total)', pass: mockQuestionTemplates.length === 21 },
  { name: 'Embeddings (1536 dimensions)', pass: sampleVector.length === 1536 },
  { name: 'Deterministic Vectors', pass: isDeterministic },
  { name: 'RAG Ground Truth (≥10 queries)', pass: ragGroundTruth.length >= 10 },
  { name: 'RAG Embeddings (match sessions)', pass: mockRAGEmbeddings.length === mockSessions.length },
  { name: 'Factory Functions', pass: testSession.id.startsWith('session-') },
  { name: 'Helper Functions', pass: similarity === 1 },
];

checks.forEach((check) => {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
});

const allPassed = checks.every((c) => c.pass);
console.log('\n' + (allPassed ? '🎉 All checks passed!' : '⚠️  Some checks failed'));

process.exit(allPassed ? 0 : 1);
