import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center">
            <img className="h-10 w-10" src="/logomark.svg" alt="MUED" />
            <span className="ml-2 text-2xl font-bold">MUED</span>
          </div>
          <nav>
            <Link 
              href="/about" 
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              About
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
            >
              ログイン
            </Link>
          </nav>
        </header>
        
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            音楽教育を次のレベルへ
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            MUED LMSは音楽教育のためのラーニングマネジメントシステムです
          </p>
          <div className="mt-10">
            <Link 
              href="/login" 
              className="inline-block bg-black px-5 py-3 rounded-md font-semibold text-white hover:bg-gray-800"
            >
              始めましょう
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 