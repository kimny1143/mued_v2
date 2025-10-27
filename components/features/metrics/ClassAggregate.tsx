/**
 * Class Aggregate Component
 *
 * 教師向けクラス全体の学習メトリクス集計ビュー
 */

'use client';

import React from 'react';
import type { WeakSpot } from './ProgressRing';

export interface ClassAggregateData {
  totalStudents: number;
  averageAchievementRate: number;
  averageTempoAchievement: number;
  totalPracticeTime: number;
  activeStudentsToday: number;
  strugglingStudents: Array<{
    userId: string;
    name: string;
    achievementRate: number;
    weakSpots: WeakSpot[];
  }>;
}

export interface ClassAggregateProps {
  data: ClassAggregateData;
}

export function ClassAggregate({ data }: ClassAggregateProps) {
  const {
    totalStudents,
    averageAchievementRate,
    averageTempoAchievement,
    totalPracticeTime,
    activeStudentsToday,
    strugglingStudents,
  } = data;

  const totalPracticeHours = Math.floor(totalPracticeTime / 3600);
  const totalPracticeMinutes = Math.floor((totalPracticeTime % 3600) / 60);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={totalStudents.toString()}
          icon="👥"
          color="bg-blue-50 text-blue-700"
        />

        <StatCard
          title="Active Today"
          value={activeStudentsToday.toString()}
          subtitle={`${((activeStudentsToday / Math.max(totalStudents, 1)) * 100).toFixed(0)}% of class`}
          icon="🎯"
          color="bg-green-50 text-green-700"
        />

        <StatCard
          title="Avg Achievement"
          value={`${averageAchievementRate.toFixed(0)}%`}
          icon="📊"
          color="bg-purple-50 text-purple-700"
        />

        <StatCard
          title="Avg Tempo"
          value={`${averageTempoAchievement.toFixed(0)}%`}
          icon="🎵"
          color="bg-orange-50 text-orange-700"
        />
      </div>

      {/* Total Practice Time */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Total Class Practice Time</h3>
        <p className="text-3xl font-bold text-gray-900">
          {totalPracticeHours}h {totalPracticeMinutes}m
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Avg per student: {Math.floor(totalPracticeTime / Math.max(totalStudents, 1) / 60)}min
        </p>
      </div>

      {/* Struggling Students */}
      {strugglingStudents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Students Needing Support ({strugglingStudents.length})
          </h3>

          <div className="space-y-3">
            {strugglingStudents.map((student) => (
              <div
                key={student.userId}
                className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-gray-900">{student.name}</p>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                    {student.achievementRate.toFixed(0)}% Achievement
                  </span>
                </div>

                {student.weakSpots.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-sm font-medium text-gray-700">Weak Spots:</p>
                    <div className="flex flex-wrap gap-2">
                      {student.weakSpots.slice(0, 3).map((spot, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-white px-2 py-1 text-xs text-gray-700"
                        >
                          Bars {spot.startBar}-{spot.endBar} ({spot.loopCount}x)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {strugglingStudents.length === 0 && totalStudents > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-medium text-green-900">
            🎉 All students are doing well!
          </p>
          <p className="mt-1 text-sm text-green-700">
            No students with achievement rate below 50%
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: string;
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <span className={`rounded-full px-3 py-1 text-2xl ${color}`}>{icon}</span>
      </div>

      <p className="text-3xl font-bold text-gray-900">{value}</p>

      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
