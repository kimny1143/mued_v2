'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MUSIC_MATERIAL_TYPES,
  INSTRUMENTS,
  GENRES,
  DIFFICULTY_LEVELS,
  PRACTICE_DURATIONS,
  generateMusicPrompt,
  type Instrument,
} from '@/types/music-material';

export default function NewMusicMaterialPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    materialType: '',
    instrument: '',
    difficulty: 'beginner',
    topic: '',
    genre: '',
    duration: 30,
    additionalContext: '',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');

    try {
      // Generate the music-specific prompt
      const prompt = generateMusicPrompt(
        formData.materialType,
        formData.instrument,
        formData.difficulty,
        formData.topic,
        formData.genre || undefined,
        formData.duration
      );

      const response = await fetch('/api/ai/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.instrument,
          topic: formData.topic,
          difficulty: formData.difficulty,
          format: formData.materialType,
          additionalContext: `${prompt}\n\nAdditional context: ${formData.additionalContext}`,
          metadata: {
            instrument: formData.instrument,
            genre: formData.genre,
            duration: formData.duration,
            materialType: formData.materialType,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
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

  // Group instruments by category
  const instrumentsByCategory = INSTRUMENTS.reduce((acc, instrument) => {
    if (!acc[instrument.category]) {
      acc[instrument.category] = [];
    }
    acc[instrument.category].push(instrument);
    return acc;
  }, {} as Record<string, Instrument[]>);

  const categoryLabels: Record<string, string> = {
    keyboard: '🎹 Keyboard',
    strings: '🎸 Strings',
    brass: '🎺 Brass',
    woodwind: '🎶 Woodwind',
    percussion: '🥁 Percussion',
    vocal: '🎤 Vocal',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-[var(--color-brand-green)] hover:text-[var(--color-brand-green-hover)] mb-4 flex items-center font-medium"
        >
          ← Back to Material Library
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          🎵 Generate Music Learning Material
        </h1>
        <p className="text-gray-600 mt-2">
          Create AI-powered, personalized music education materials
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {/* Material Type */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Material Type *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {MUSIC_MATERIAL_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, materialType: type.id })}
                className={`px-4 py-3 rounded-lg border-2 text-center transition-all ${
                  formData.materialType === type.id
                    ? 'border-[var(--color-brand-green)] bg-green-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
                title={type.description}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-xs font-medium text-gray-700">{type.label}</div>
              </button>
            ))}
          </div>
          {formData.materialType && (
            <p className="text-sm text-gray-600 mt-2">
              {MUSIC_MATERIAL_TYPES.find(t => t.id === formData.materialType)?.description}
            </p>
          )}
        </div>

        {/* Instrument Selection */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Instrument *
          </label>
          <select
            value={formData.instrument}
            onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-green)] focus:border-[var(--color-brand-green)] text-gray-900"
          >
            <option value="">Select your instrument</option>
            {Object.entries(instrumentsByCategory).map(([category, instruments]) => (
              <optgroup key={category} label={categoryLabels[category]}>
                {instruments.map((instrument) => (
                  <option key={instrument.id} value={instrument.label}>
                    {instrument.icon} {instrument.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Topic or Focus Area *
          </label>
          <input
            type="text"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="e.g., Blues scale patterns, Jazz improvisation, Fingerpicking technique"
            required
            maxLength={200}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-green)] focus:border-[var(--color-brand-green)] text-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">
            Be specific about what you want to learn or practice
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Difficulty Level *
            </label>
            <div className="space-y-2">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, difficulty: level.value })}
                  className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                    formData.difficulty === level.value
                      ? 'border-[var(--color-brand-green)] bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{level.label}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{level.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Practice Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Practice Duration
            </label>
            <div className="space-y-2">
              {PRACTICE_DURATIONS.map((duration) => (
                <button
                  key={duration.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, duration: duration.value })}
                  className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                    formData.duration === duration.value
                      ? 'border-[var(--color-brand-green)] bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{duration.label}</span>
                    <span className="text-lg">{duration.icon}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Genre (Optional) */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Genre (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, genre: '' })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                formData.genre === ''
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              No preference
            </button>
            {GENRES.map((genre) => (
              <button
                key={genre.id}
                type="button"
                onClick={() => setFormData({ ...formData, genre: genre.label })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  formData.genre === genre.label
                    ? 'bg-[var(--color-brand-green)] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>

        {/* Additional Context */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Additional Notes (Optional)
          </label>
          <textarea
            value={formData.additionalContext}
            onChange={(e) => setFormData({ ...formData, additionalContext: e.target.value })}
            placeholder="Any specific requirements, learning goals, or preferences..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-green)] focus:border-[var(--color-brand-green)] text-gray-900"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
            disabled={generating}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={generating || !formData.materialType || !formData.instrument}
            className="px-8 py-3 bg-[var(--color-brand-green)] hover:bg-[var(--color-brand-green-hover)] text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          >
            {generating ? (
              <>
                <span className="animate-spin">⚙️</span>
                Generating Material...
              </>
            ) : (
              <>
                <span>✨</span>
                Generate Music Material
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generation Status */}
      {generating && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-[var(--color-brand-green)] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🎼</span>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-lg mb-2">
                AI is crafting your music material...
              </h4>
              <p className="text-sm text-gray-700 mb-3">
                Creating personalized {formData.materialType.replace('_', ' ')} content for{' '}
                {formData.instrument} at {formData.difficulty} level.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-brand-green)] rounded-full animate-pulse w-3/4"></div>
                </div>
                <span className="text-xs font-medium text-gray-600">Processing...</span>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                ⏱️ This usually takes 10-30 seconds depending on complexity
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
