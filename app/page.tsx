import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            MUED LMS
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            音楽教育のためのラーニングマネジメントシステム
          </p>
          <div className="mt-10">
            <Link 
              href="/login" 
              className="inline-block bg-indigo-600 px-5 py-3 rounded-md font-semibold text-white hover:bg-indigo-700"
            >
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 