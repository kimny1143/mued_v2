/**
 * Weak Drill Button Component
 *
 * プレイヤーに埋め込む「弱点ドリル生成」ボタン
 */

'use client';

import { useState } from 'react';
import type { WeakDrillResult } from '@/lib/ai/weak-drill-generator';
import { InlineError } from '@/components/ui/error-boundary';

export interface WeakDrillButtonProps {
  materialId: string;
  loopStartBar: number | null;
  loopEndBar: number | null;
  currentTempo: number;
  onDrillGenerated?: (drill: WeakDrillResult) => void;
}

export function WeakDrillButton({
  materialId,
  loopStartBar,
  loopEndBar,
  currentTempo,
  onDrillGenerated,
}: WeakDrillButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<WeakDrillResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const canGenerate = loopStartBar !== null && loopEndBar !== null && loopStartBar <= loopEndBar;

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError('Please select a loop range first');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/weak-drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          loopStartBar,
          loopEndBar,
          currentTempo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate drill');
        return;
      }

      setDrill(data.weakDrill);
      setShowModal(true);

      if (onDrillGenerated) {
        onDrillGenerated(data.weakDrill);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          title={!canGenerate ? 'Select a loop range first' : 'Generate practice drills'}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            '🎯 Generate Weak Drill'
          )}
        </button>

        {error && (
          <InlineError error={error} className="text-xs" />
        )}

        {canGenerate && (
          <p className="text-xs text-gray-500">
            Bars {loopStartBar}-{loopEndBar} selected
          </p>
        )}
      </div>

      {/* Modal */}
      {showModal && drill && (
        <WeakDrillModal
          drill={drill}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/**
 * Weak Drill Modal
 */
interface WeakDrillModalProps {
  drill: WeakDrillResult;
  onClose: () => void;
}

function WeakDrillModal({ drill, onClose }: WeakDrillModalProps) {
  const [selectedVariation, setSelectedVariation] = useState<'same' | 'easier' | 'harder'>('same');

  const currentDrill = drill.drills[selectedVariation];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{drill.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Original: Bars {drill.originalSection.bars.start}-{drill.originalSection.bars.end}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Variation Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setSelectedVariation('easier')}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              selectedVariation === 'easier'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            😌 Easier (-1)
          </button>

          <button
            onClick={() => setSelectedVariation('same')}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              selectedVariation === 'same'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🎯 Same Level
          </button>

          <button
            onClick={() => setSelectedVariation('harder')}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              selectedVariation === 'harder'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔥 Harder (+1)
          </button>
        </div>

        {/* Current Drill Content */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{currentDrill.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{currentDrill.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-xs font-medium text-gray-500">Difficulty</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 capitalize">
                {currentDrill.difficulty}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">Target Tempo</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {currentDrill.targetTempo} BPM
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">Est. Time</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                ~{currentDrill.estimatedTime}s
              </p>
            </div>
          </div>

          {/* Focus Points */}
          {currentDrill.focusPoints && currentDrill.focusPoints.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Focus on:</p>
              <div className="flex flex-wrap gap-2">
                {currentDrill.focusPoints.map((point, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                  >
                    {point}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ABC Notation */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">ABC Notation:</p>
            <div className="rounded-md bg-gray-900 p-4">
              <pre className="overflow-x-auto text-xs text-green-400">
                {currentDrill.abc}
              </pre>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(currentDrill.abc);
              alert('ABC notation copied to clipboard!');
            }}
            className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            📋 Copy ABC Notation
          </button>
        </div>
      </div>
    </div>
  );
}
