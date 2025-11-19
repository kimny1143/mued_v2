'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MaterialData {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: string;
  content: Record<string, unknown>;
  isPublic?: boolean;
}

export default function MaterialEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [material, setMaterial] = useState<MaterialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [contentJson, setContentJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    fetchMaterial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchMaterial = async () => {
    try {
      const response = await fetch(`/api/ai/materials/${params.id}`);
      const data = await response.json();

      if (data.success && data.data) {
        // Handle wrapped API response
        const material = data.data.material;
        setMaterial(material);
        setTitle(material.title);
        setDescription(material.description);
        setDifficulty(material.difficulty);
        setContentJson(JSON.stringify(material.content, null, 2));
        setIsPublic(material.isPublic || false);
      } else if (data.success) {
        // Handle unwrapped response (backward compatibility)
        setMaterial(data.material);
        setTitle(data.material.title);
        setDescription(data.material.description);
        setDifficulty(data.material.difficulty);
        setContentJson(JSON.stringify(data.material.content, null, 2));
        setIsPublic(data.material.isPublic || false);
      } else {
        setError(data.error || 'Failed to load material');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const validateJson = (text: string) => {
    try {
      JSON.parse(text);
      setJsonError('');
      return true;
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateJson(contentJson)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/ai/materials/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          difficulty,
          content: JSON.parse(contentJson),
          isPublic,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/dashboard/materials/${params.id}`);
      } else {
        setError(result.error || 'Update failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !material) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <button
          onClick={() => router.push('/dashboard/materials')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Materials
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <button
          onClick={() => router.push(`/dashboard/materials/${params.id}`)}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          ← Cancel and Go Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Material</h1>
        <p className="text-gray-600 mt-2">
          Modify material details and content
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

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
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm font-semibold text-gray-700 cursor-pointer">
              Make this material public (visible in library)
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Content (JSON)
            </label>
            <textarea
              value={contentJson}
              onChange={(e) => {
                setContentJson(e.target.value);
                validateJson(e.target.value);
              }}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            />
            {jsonError && (
              <p className="mt-2 text-sm text-red-600">{jsonError}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !!jsonError}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                saving || jsonError
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => router.push(`/dashboard/materials/${params.id}`)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Preview</h2>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Title</div>
              <div className="text-lg font-semibold text-gray-900">{title}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Description</div>
              <div className="text-gray-700">{description}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Difficulty</div>
              <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium inline-block">
                {difficulty}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Type</div>
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium inline-block">
                {material?.type}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Visibility</div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
                isPublic
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isPublic ? '🌐 Public' : '🔒 Private'}
              </div>
            </div>

            {!jsonError && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Valid JSON</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Editing Tips</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>Modify the JSON content to fix errors or add missing information</li>
          <li>For music materials, ensure ABC notation is valid</li>
          <li>Validate JSON before saving to prevent errors</li>
          <li>Changes will be saved immediately upon clicking &quot;Save Changes&quot;</li>
        </ul>
      </div>
    </div>
  );
}
