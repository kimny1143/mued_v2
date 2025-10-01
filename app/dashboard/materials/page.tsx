'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Material {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  createdAt: string;
}

interface QuotaInfo {
  tier: string;
  used: number;
  limit: number;
  remaining: number;
}

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/ai/materials');
      const data = await response.json();

      if (data.success) {
        setMaterials(data.materials);
        setQuota(data.quota);
      } else {
        setError(data.error || 'Failed to load materials');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const response = await fetch(`/api/ai/materials/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMaterials(materials.filter((m) => m.id !== id));
      } else {
        alert('Failed to delete material');
      }
    } catch {
      alert('Network error');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return '📝';
      case 'summary':
        return '📄';
      case 'flashcards':
        return '🗂️';
      case 'practice':
        return '✏️';
      default:
        return '📚';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Study Materials</h1>
          <p className="text-gray-600 mt-2">
            Generate personalized study materials with AI
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/materials/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          + Generate New Material
        </button>
      </div>

      {/* Quota Info */}
      {quota && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-blue-900">
                Current Plan: {quota.tier.charAt(0).toUpperCase() + quota.tier.slice(1)}
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {quota.limit === -1
                  ? 'Unlimited AI material generation'
                  : `${quota.used} / ${quota.limit} materials used this month`}
              </p>
            </div>
            {quota.limit !== -1 && quota.remaining === 0 && (
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Upgrade Plan
              </button>
            )}
          </div>
          {quota.limit !== -1 && (
            <div className="mt-3 bg-white rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(quota.used / quota.limit) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Materials Grid */}
      {materials.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No materials yet
          </h3>
          <p className="text-gray-600 mb-6">
            Generate your first AI-powered study material to get started
          </p>
          <button
            onClick={() => router.push('/dashboard/materials/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
          >
            Generate Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <div
              key={material.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/materials/${material.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{getTypeIcon(material.type)}</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(material.difficulty)}`}
                >
                  {material.difficulty}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {material.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {material.description}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{new Date(material.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMaterial(material.id);
                  }}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
