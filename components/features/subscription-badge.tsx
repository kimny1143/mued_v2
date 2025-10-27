'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UsageLimits {
  tier: string;
  aiMaterialsLimit: number;
  aiMaterialsUsed: number;
  aiMaterialsRemaining: number;
  reservationsLimit: number;
  reservationsUsed: number;
  reservationsRemaining: number;
}

export function SubscriptionBadge() {
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageLimits();
  }, []);

  const fetchUsageLimits = async () => {
    try {
      const response = await fetch('/api/subscription/limits');
      const data = await response.json();
      if (data.success) {
        setLimits(data.limits);
      }
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>
    );
  }

  if (!limits) {
    return null;
  }

  const planColors = {
    freemium: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      badge: 'bg-gray-600',
      text: 'text-gray-900',
    },
    starter: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      badge: 'bg-blue-600',
      text: 'text-blue-900',
    },
    basic: {
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      badge: 'bg-purple-600',
      text: 'text-purple-900',
    },
    premium: {
      bg: 'bg-gradient-to-r from-yellow-50 to-orange-50',
      border: 'border-orange-300',
      badge: 'bg-gradient-to-r from-yellow-500 to-orange-600',
      text: 'text-orange-900',
    },
  };

  const colors = planColors[limits.tier as keyof typeof planColors] || planColors.freemium;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-6`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`${colors.badge} text-white text-sm font-bold px-4 py-1.5 rounded-full`}>
              {limits.tier.charAt(0).toUpperCase() + limits.tier.slice(1)} Plan
            </span>
            {limits.tier === 'freemium' && (
              <Link
                href="/dashboard/subscription"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                Upgrade to unlock more
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* AI Materials Usage */}
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-sm font-medium ${colors.text}`}>AI Materials:</span>
                <span className="text-lg font-bold text-gray-900">
                  {limits.aiMaterialsLimit === -1
                    ? 'Unlimited'
                    : `${limits.aiMaterialsUsed} / ${limits.aiMaterialsLimit}`}
                </span>
              </div>
              {limits.aiMaterialsLimit !== -1 && (
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((limits.aiMaterialsUsed / limits.aiMaterialsLimit) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Reservations Usage */}
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-sm font-medium ${colors.text}`}>Lesson Bookings:</span>
                <span className="text-lg font-bold text-gray-900">
                  {limits.reservationsLimit === -1
                    ? 'Unlimited'
                    : `${limits.reservationsUsed} / ${limits.reservationsLimit}`}
                </span>
              </div>
              {limits.reservationsLimit !== -1 && (
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((limits.reservationsUsed / limits.reservationsLimit) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/subscription"
          className="ml-6 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Manage Plan
        </Link>
      </div>
    </div>
  );
}
