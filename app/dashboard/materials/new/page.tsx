'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewMaterialPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    format: 'quiz' as 'quiz' | 'summary' | 'flashcards' | 'practice',
    additionalContext: '',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/ai/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to the generated material
        router.push(`/dashboard/materials/${data.materialId}`);
      } else {
        setError(data.error || 'Failed to generate material');
        if (data.upgradeRequired) {
          setTimeout(() => {
            router.push('/dashboard/subscription');
          }, 3000);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const subjects = [
    'Mathematics',
    'Science',
    'English',
    'History',
    'Computer Science',
    'Physics',
    'Chemistry',
    'Biology',
    'Geography',
    'Literature',
    'Economics',
    'Other',
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          ← Back to Materials
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          Generate Study Material
        </h1>
        <p className="text-gray-600 mt-2">
          Create personalized study materials powered by AI
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* Subject */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <select
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a subject</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topic *
          </label>
          <input
            type="text"
            value={formData.topic}
            onChange={(e) =>
              setFormData({ ...formData, topic: e.target.value })
            }
            placeholder="e.g., Quadratic equations, Photosynthesis, World War II"
            required
            maxLength={200}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFormData({ ...formData, difficulty: level })}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                  formData.difficulty === level
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Material Format *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'quiz', label: '📝 Quiz', desc: 'Multiple choice questions' },
              { value: 'summary', label: '📄 Summary', desc: 'Topic overview' },
              {
                value: 'flashcards',
                label: '🗂️ Flashcards',
                desc: 'Term-definition pairs',
              },
              {
                value: 'practice',
                label: '✏️ Practice',
                desc: 'Problems with solutions',
              },
            ].map((format) => (
              <button
                key={format.value}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    format: format.value as typeof formData.format,
                  })
                }
                className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                  formData.format === format.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="font-medium">{format.label}</div>
                <div className="text-sm text-gray-600">{format.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Context */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            value={formData.additionalContext}
            onChange={(e) =>
              setFormData({ ...formData, additionalContext: e.target.value })
            }
            placeholder="Any specific requirements or focus areas..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            disabled={generating}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={generating}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⚙️</span>
                Generating...
              </>
            ) : (
              <>
                <span>✨</span>
                Generate Material
              </>
            )}
          </button>
        </div>
      </form>

      {generating && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h4 className="font-semibold text-blue-900">
                AI is generating your material...
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                This usually takes 10-30 seconds depending on the material type and
                difficulty level.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
