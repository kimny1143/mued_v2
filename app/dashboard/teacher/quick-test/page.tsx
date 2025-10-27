/**
 * Quick Test Generator Page
 *
 * 教師向け5分間小テスト生成UI
 */

'use client';

import { useState } from 'react';
import type { QuickTestResult } from '@/lib/ai/quick-test-generator';

export default function QuickTestPage() {
  const [materialId, setMaterialId] = useState('');
  const [studentIds, setStudentIds] = useState('');
  const [sectionsCount, setSectionsCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quickTest, setQuickTest] = useState<QuickTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aggregationInfo, setAggregationInfo] = useState<any>(null);

  const handleGenerate = async () => {
    setError(null);
    setQuickTest(null);
    setAggregationInfo(null);

    // バリデーション
    if (!materialId.trim()) {
      setError('Material ID is required');
      return;
    }

    if (!studentIds.trim()) {
      setError('Student IDs are required');
      return;
    }

    const classUserIds = studentIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (classUserIds.length === 0) {
      setError('At least one student ID is required');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/quick-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: materialId.trim(),
          classUserIds,
          sectionsCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate quick test');
        return;
      }

      setQuickTest(data.quickTest);
      setAggregationInfo(data.aggregation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quickTest) return;

    try {
      const response = await fetch('/api/ai/quick-test/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickTest }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to generate PDF');
        return;
      }

      // PDFをダウンロード
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quickTest.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF download failed');
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">5-Minute Quick Test Generator</h1>
        <p className="mt-2 text-gray-600">
          Generate focused practice exercises based on your class&apos;s weak spots
        </p>
      </div>

      {/* Input Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="materialId" className="block text-sm font-medium text-gray-700">
              Material ID
            </label>
            <input
              type="text"
              id="materialId"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              placeholder="Enter material UUID"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="studentIds" className="block text-sm font-medium text-gray-700">
              Student IDs (comma-separated)
            </label>
            <textarea
              id="studentIds"
              value={studentIds}
              onChange={(e) => setStudentIds(e.target.value)}
              placeholder="uuid1, uuid2, uuid3..."
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="sectionsCount" className="block text-sm font-medium text-gray-700">
              Number of Problems (3-5)
            </label>
            <input
              type="number"
              id="sectionsCount"
              value={sectionsCount}
              onChange={(e) => setSectionsCount(parseInt(e.target.value, 10))}
              min={1}
              max={5}
              className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
          >
            {isGenerating ? 'Generating...' : 'Generate Quick Test'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Aggregation Info */}
      {aggregationInfo && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">Class Analysis</h3>
          <div className="mt-2 space-y-1 text-sm text-blue-800">
            <p>Material: {aggregationInfo.materialTitle}</p>
            <p>
              Students: {aggregationInfo.studentsWithMetrics} / {aggregationInfo.totalStudents}{' '}
              with practice data
            </p>
            <p>Instrument: {aggregationInfo.instrument}</p>
            <p>Target Tempo: {aggregationInfo.targetTempo} BPM</p>
            <p>Weak Spots Identified: {aggregationInfo.topWeakSpots?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Quick Test Result */}
      {quickTest && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{quickTest.title}</h2>
              <p className="mt-1 text-gray-600">{quickTest.description}</p>
              <div className="mt-3 flex gap-4 text-sm text-gray-500">
                <span>⏱️ {quickTest.estimatedTime} minutes</span>
                <span>📊 {quickTest.problems.length} problems</span>
                <span>🎵 {quickTest.totalBars} bars</span>
              </div>
            </div>

            <button
              onClick={handleDownloadPdf}
              className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Download PDF
            </button>
          </div>

          {/* Problems Preview */}
          <div className="space-y-4">
            {quickTest.problems.map((problem) => (
              <div
                key={problem.problemNumber}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-green-700">
                    Problem {problem.problemNumber}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      problem.difficulty === 'high'
                        ? 'bg-red-100 text-red-800'
                        : problem.difficulty === 'medium'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {problem.difficulty}
                  </span>
                </div>

                <h4 className="text-lg font-semibold text-gray-900">{problem.title}</h4>
                <p className="mt-2 text-gray-600">{problem.instruction}</p>

                <div className="mt-3 flex gap-4 text-sm text-gray-500">
                  <span>
                    Bars: {problem.targetBars.startBar}-{problem.targetBars.endBar}
                  </span>
                  <span>Time: ~{problem.estimatedTime}s</span>
                </div>

                <div className="mt-4 rounded-md bg-gray-50 p-4">
                  <pre className="overflow-x-auto text-xs text-gray-700">{problem.abc}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
