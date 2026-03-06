'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Track {
  id: string;
  originalFilename: string;
  instrumentGroup: string;
  presenceSetting: string;
}

interface Task {
  id: string;
  taskType: string;
  status: string;
  previewUrl: string | null;
  finalUrl: string | null;
  createdAt: string;
}

interface Session {
  id: string;
  mode: 'omakase' | 'dialogue';
  status: string;
  musicalStyle: string;
  title: string | null;
  paymentStatus: string;
  tracks: Track[];
  tasks: Task[];
}

const INSTRUMENT_GROUPS = [
  'VOCAL', 'GUITAR', 'BASS', 'DRUMS', 'KEYS', 'SYNTH', 'STRINGS', 'BRASS', 'OTHER',
];

export default function DialSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadGroup, setUploadGroup] = useState('VOCAL');

  // Preview state
  const [previewing, setPreviewing] = useState(false);

  const guestToken = typeof window !== 'undefined'
    ? localStorage.getItem('dial_guest_token')
    : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(guestToken ? { 'X-Dial-Guest-Token': guestToken } : {}),
  };

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/dial/session?id=${sessionId}`, {
        headers: guestToken ? { 'X-Dial-Guest-Token': guestToken } : {},
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.data);
      } else {
        setError(data.error || 'Failed to load session');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [sessionId, guestToken]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll for task updates when tasks are processing
  useEffect(() => {
    if (!session?.tasks?.some((t) => t.status === 'processing' || t.status === 'pending')) return;
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [session, fetchSession]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    setUploading(true);
    setError(null);

    try {
      // Step 1: Get signed URL from server
      const res = await fetch('/api/dial/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: session.id,
          fileName: file.name,
          instrumentGroup: uploadGroup,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Upload failed');
        return;
      }

      // Step 2: PUT file directly to signed URL
      const uploadRes = await fetch(data.data.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'audio/wav' },
        body: file,
      });

      if (!uploadRes.ok) {
        setError('File upload to storage failed');
        return;
      }

      // Refresh session to show new track
      await fetchSession();
    } catch {
      setError('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async () => {
    if (!session) return;
    setPreviewing(true);
    setError(null);

    try {
      const res = await fetch('/api/dial/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: session.id }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Preview request failed');
        return;
      }

      await fetchSession();
    } catch {
      setError('Preview error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleFinal = async (taskId: string) => {
    setError(null);
    try {
      const res = await fetch('/api/dial/final', {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Final mix request failed');
        return;
      }

      await fetchSession();
    } catch {
      setError('Final mix error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Session not found</h2>
          <p className="text-zinc-400">{error || 'This session may have expired.'}</p>
        </div>
      </div>
    );
  }

  const hasTracks = session.tracks.length > 0;
  const latestTask = session.tasks[0];
  const isProcessing = latestTask?.status === 'processing' || latestTask?.status === 'pending';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            MUED<span className="text-indigo-400">ial</span>
            <span className="text-lg font-normal text-zinc-400 ml-3">
              {session.mode === 'omakase' ? 'Omakase' : 'Dialogue'} Mix
            </span>
          </h1>
          <div className="flex gap-3 mt-2 text-sm text-zinc-500">
            <span>Style: {session.musicalStyle}</span>
            <span>Status: {session.status}</span>
            <span>Payment: {session.paymentStatus}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Payment pending */}
        {session.paymentStatus !== 'paid' && (
          <div className="p-6 bg-amber-900/20 border border-amber-800 rounded-xl text-center">
            <h2 className="text-lg font-medium text-amber-300 mb-2">Payment Required</h2>
            <p className="text-zinc-400">Complete payment to start uploading tracks.</p>
          </div>
        )}

        {/* Upload Section */}
        {session.paymentStatus === 'paid' && (
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-4">Upload Stems</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="group" className="block text-sm text-zinc-400 mb-1">
                  Instrument Group
                </label>
                <select
                  id="group"
                  value={uploadGroup}
                  onChange={(e) => setUploadGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm"
                >
                  {INSTRUMENT_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer text-sm transition-colors">
                  {uploading ? 'Uploading...' : 'Choose File'}
                  <input
                    type="file"
                    accept=".wav,.flac,.aiff,.mp3"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tracks List */}
        {hasTracks && (
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-3">
              Tracks ({session.tracks.length})
            </h2>
            <div className="space-y-2">
              {session.tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                >
                  <div>
                    <span className="text-sm">{track.originalFilename}</span>
                    <span className="ml-2 text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded">
                      {track.instrumentGroup}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">{track.presenceSetting}</span>
                </div>
              ))}
            </div>

            {/* Preview Button */}
            {!isProcessing && (
              <button
                onClick={handlePreview}
                disabled={previewing}
                className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
              >
                {previewing ? 'Requesting...' : 'Generate Preview Mix'}
              </button>
            )}
          </div>
        )}

        {/* Tasks / Results */}
        {session.tasks.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-3">Mix Results</h2>
            <div className="space-y-3">
              {session.tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {task.taskType.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.status === 'completed'
                        ? 'bg-green-900/50 text-green-300'
                        : task.status === 'processing'
                          ? 'bg-amber-900/50 text-amber-300'
                          : task.status === 'failed'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  {task.status === 'processing' && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <div className="h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Processing... this may take a few minutes.
                    </div>
                  )}

                  {task.previewUrl && (
                    <div className="mt-2">
                      <audio controls src={task.previewUrl} className="w-full" />
                    </div>
                  )}

                  {task.finalUrl && (
                    <a
                      href={task.finalUrl}
                      download
                      className="inline-block mt-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Download Final Mix
                    </a>
                  )}

                  {task.status === 'completed' && task.previewUrl && !task.finalUrl && (
                    <button
                      onClick={() => handleFinal(task.id)}
                      className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
                    >
                      Generate Final Mix
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
