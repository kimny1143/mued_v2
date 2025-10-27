'use client';

/**
 * Share to Library Button
 * Library共有ボタン
 *
 * Converts a Material to UnifiedContent and shares it to Library
 */

import { useState } from 'react';

interface ShareToLibraryButtonProps {
  materialId: string;
  materialTitle: string;
  materialType: string;
  materialDifficulty: string;
  materialDescription: string;
}

export function ShareToLibraryButton({
  materialId,
  materialTitle,
  materialType,
  materialDifficulty,
  materialDescription,
}: ShareToLibraryButtonProps) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    try {
      setSharing(true);
      setError(null);

      const response = await fetch('/api/materials/share-to-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialId,
          title: materialTitle,
          type: materialType,
          difficulty: materialDifficulty,
          description: materialDescription,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        setError(result.error || 'Failed to share to Library');
      }
    } catch (err) {
      console.error('Error sharing to Library:', err);
      setError('Network error');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleShare}
        disabled={sharing || shared}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          shared
            ? 'bg-green-100 text-green-800 cursor-not-allowed'
            : sharing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {sharing ? 'Sharing...' : shared ? '✓ Shared to Library' : '📚 Share to Library'}
      </button>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
