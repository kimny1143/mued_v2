'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowRight, Sparkles } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  createdAt: string;
}

export function RecentMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setMaterials(data.recentMaterials);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700',
  };

  const typeIcons = {
    'quick-test': '📝',
    'weak-drill': '💪',
    custom: '✨',
  };

  if (loading) {
    return (
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Materials</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--color-brand-green)]" />
          Recent Materials
        </h2>
        <Link
          href="/dashboard/materials"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No materials yet</p>
          <Link
            href="/dashboard/materials/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-brand-green)] text-white rounded-lg hover:bg-[var(--color-brand-green-hover)] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Create Your First Material
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <Link
              key={material.id}
              href={`/dashboard/materials/${material.id}`}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:border-[var(--color-brand-green)] hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded flex items-center justify-center text-xl">
                {typeIcons[material.type as keyof typeof typeIcons] || '📄'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-[var(--color-brand-green)] transition-colors">
                  {material.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      difficultyColors[material.difficulty as keyof typeof difficultyColors] ||
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {material.difficulty}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(material.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-brand-green)] group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
