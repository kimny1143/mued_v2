'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function DebugAPIPage() {
  const [lessonSlots, setLessonSlots] = useState<any>(null);
  const [reservations, setReservations] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const today = new Date();
      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      
      // Fetch lesson slots
      const slotsRes = await fetch(`/api/lesson-slots?startDate=${startDate}&endDate=${endDate}&viewMode=all`, {
        credentials: 'include',
      });
      const slotsData = await slotsRes.json();
      setLessonSlots({
        status: slotsRes.status,
        ok: slotsRes.ok,
        data: slotsData
      });
      
      // Fetch reservations
      const resRes = await fetch(`/api/reservations?startDate=${startDate}&endDate=${endDate}`, {
        credentials: 'include',
      });
      const resData = await resRes.json();
      setReservations({
        status: resRes.status,
        ok: resRes.ok,
        data: resData
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API Debug Page</h1>
      
      <button 
        onClick={fetchData}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {loading ? 'Loading...' : 'Refresh Data'}
      </button>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Lesson Slots API</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(lessonSlots, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Reservations API</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(reservations, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}