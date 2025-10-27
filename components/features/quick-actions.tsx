'use client';

import Link from 'next/link';
import { PlusCircle, Calendar, BookOpen, TrendingUp } from 'lucide-react';

export function QuickActions() {
  return (
    <section>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/materials/new"
          className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:border-[var(--color-brand-green)] hover:shadow-md transition-all group"
        >
          <PlusCircle className="w-8 h-8 text-[var(--color-brand-green)] mb-3 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-gray-900">Create Material</span>
          <span className="text-xs text-gray-500 mt-1">AI-powered generation</span>
        </Link>

        <Link
          href="/dashboard/lessons"
          className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all group"
        >
          <Calendar className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-gray-900">Book Lesson</span>
          <span className="text-xs text-gray-500 mt-1">Schedule with mentor</span>
        </Link>

        <Link
          href="/dashboard/materials"
          className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all group"
        >
          <BookOpen className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-gray-900">My Materials</span>
          <span className="text-xs text-gray-500 mt-1">View all materials</span>
        </Link>

        <Link
          href="/dashboard/subscription"
          className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-md transition-all group"
        >
          <TrendingUp className="w-8 h-8 text-orange-500 mb-3 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-gray-900">Upgrade Plan</span>
          <span className="text-xs text-gray-500 mt-1">Unlock more features</span>
        </Link>
      </div>
    </section>
  );
}
