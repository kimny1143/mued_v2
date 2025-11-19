'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MaterialJSON {
  type: string;
  title: string;
  description: string;
  abcNotation?: string;
  learningPoints?: string[];
  practiceInstructions?: string[];
  questions?: unknown[];
  cards?: unknown[];
  problems?: unknown[];
}

export default function MaterialImportPage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState('');
  const [parsedData, setParsedData] = useState<MaterialJSON | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [makePublic, setMakePublic] = useState(false);

  const validateAndParse = (text: string) => {
    try {
      const data = JSON.parse(text);

      // Basic validation
      if (!data.type) {
        setError('Missing required field: type');
        setParsedData(null);
        return;
      }
      if (!data.title) {
        setError('Missing required field: title');
        setParsedData(null);
        return;
      }
      if (!data.description) {
        setError('Missing required field: description');
        setParsedData(null);
        return;
      }

      // Type-specific validation
      if (data.type === 'music' && !data.abcNotation) {
        setError('Music materials must have abcNotation field');
        setParsedData(null);
        return;
      }

      setError('');
      setParsedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
      setParsedData(null);
    }
  };

  const handleImport = async () => {
    if (!parsedData) {
      setError('No valid data to import');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/materials/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: parsedData,
          difficulty,
          makePublic,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/dashboard/materials/${result.materialId}`);
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/materials')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          ← Back to Materials
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Import Material from JSON</h1>
        <p className="text-gray-600 mt-2">
          Paste JSON generated from Claude Desktop or ChatGPT
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              JSON Data
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                validateAndParse(e.target.value);
              }}
              placeholder='{"type": "music", "title": "...", "description": "...", "abcNotation": "..."}'
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>

          {/* Settings */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') {
                    setDifficulty(value);
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="makePublic"
                checked={makePublic}
                onChange={(e) => setMakePublic(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="makePublic" className="text-sm font-medium text-gray-700">
                Make this material public (visible to all users)
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-semibold">Validation Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={!parsedData || loading}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
              !parsedData || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {loading ? 'Importing...' : 'Import Material'}
          </button>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Preview</h2>

          {parsedData ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              {/* Basic Info */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Type</div>
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium inline-block">
                  {parsedData.type}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-1">Title</div>
                <div className="text-lg font-semibold text-gray-900">
                  {parsedData.title}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-1">Description</div>
                <div className="text-gray-700">{parsedData.description}</div>
              </div>

              {/* Type-specific preview */}
              {parsedData.type === 'music' && parsedData.abcNotation && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">ABC Notation</div>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                    {parsedData.abcNotation.substring(0, 200)}...
                  </pre>
                </div>
              )}

              {parsedData.learningPoints && parsedData.learningPoints.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Learning Points</div>
                  <div className="text-sm text-gray-700">
                    {parsedData.learningPoints.length} items
                  </div>
                </div>
              )}

              {parsedData.practiceInstructions && parsedData.practiceInstructions.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Practice Instructions</div>
                  <div className="text-sm text-gray-700">
                    {parsedData.practiceInstructions.length} steps
                  </div>
                </div>
              )}

              {/* Status indicator */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Valid JSON - Ready to import</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500">Paste JSON to see preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How to use</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Generate material using Claude Desktop or ChatGPT with the provided prompts</li>
          <li>Copy the generated JSON output</li>
          <li>Paste it into the text area on the left</li>
          <li>Select difficulty level and public/private setting</li>
          <li>Click &quot;Import Material&quot; to save to your library</li>
        </ol>
        <div className="mt-4 text-sm text-blue-700">
          <strong>Prompt locations:</strong>
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>Claude Desktop: <code className="bg-blue-100 px-1 py-0.5 rounded">docs/claude-desktop-music-prompt.md</code></li>
            <li>ChatGPT: <code className="bg-blue-100 px-1 py-0.5 rounded">docs/chatgpt-music-prompt.md</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
