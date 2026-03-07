'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ChatPanel } from '@/components/dial/chat-panel';

interface Track {
  id: string;
  originalFilename: string;
  instrumentGroup: string;
  presenceSetting: string;
  panPreference: string;
  reverbPreference: string;
}

interface PreviewParams {
  musicalStyle: string;
  tracks: {
    id: string;
    filename: string;
    instrumentGroup: string;
    presenceSetting?: string;
    panPreference?: string;
    reverbPreference?: string;
  }[];
}

interface Task {
  id: string;
  taskType: string;
  status: string;
  previewUrl: string | null;
  finalUrl: string | null;
  stemsUrls: Record<string, string> | null;
  previewParams: PreviewParams | null;
  createdAt: string;
}

interface Session {
  id: string;
  mode: 'omakase' | 'dialogue';
  status: string;
  musicalStyle: string;
  title: string | null;
  paymentStatus: string;
  mixCheckCount: number;
  tracks: Track[];
  tasks: Task[];
}

const INSTRUMENT_GROUPS = [
  'VOCAL', 'GUITAR', 'BASS', 'DRUMS', 'KEYS', 'SYNTH', 'STRINGS', 'BRASS', 'OTHER',
];

const MUSICAL_STYLES = [
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock / Indie' },
  { value: 'hiphop', label: 'Hip-Hop / Grime' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'acoustic', label: 'Acoustic' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Classical / Orchestral' },
  { value: 'rnb', label: 'R&B' },
  { value: 'metal', label: 'Metal' },
  { value: 'reggae', label: 'Reggae / Dub' },
  { value: 'other', label: 'Other' },
];

interface StagedFile {
  file: File;
  instrumentGroup: string;
}

function guessInstrumentGroup(filename: string): string {
  const name = filename.toLowerCase();
  if (/vocal|vox|voice|sing/i.test(name)) return 'VOCAL';
  if (/drum|kit|snare|kick|hat|cymbal|tom/i.test(name)) return 'DRUMS';
  if (/bass/i.test(name)) return 'BASS';
  if (/guitar|gtr|guit|\bag\b/i.test(name)) return 'GUITAR';
  if (/key|piano|organ|rhodes/i.test(name)) return 'KEYS';
  if (/synth|pad|lead/i.test(name)) return 'SYNTH';
  if (/string|violin|cello|viola/i.test(name)) return 'STRINGS';
  if (/brass|trumpet|horn|trombone|sax/i.test(name)) return 'BRASS';
  return 'OTHER';
}

export default function DialSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { isSignedIn, getToken } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  // Preview state
  const [previewing, setPreviewing] = useState(false);

  // Mix generation state
  const [mixGenerating, setMixGenerating] = useState(false);

  // Sidebar player — selected take
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);
  const prevCompletedCountRef = useRef(0);

  // Track whether params changed since last preview
  const [dirty, setDirty] = useState(false);
  const lastPreviewSnapshotRef = useRef<string>('');

  // Take folding — show only latest 3, collapse older
  const [showOlderTakes, setShowOlderTakes] = useState(false);

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

  // Auto-link: if user just signed up/in and guestToken exists, link session to account
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    if (!isSignedIn || !guestToken || linked) return;
    fetch('/api/dial/link-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          localStorage.removeItem('dial_guest_token');
          setLinked(true);
          fetchSession();
        }
      })
      .catch(() => {});
  }, [isSignedIn, guestToken, linked, fetchSession]);

  // Snapshot current params to detect changes after preview
  const buildSnapshot = useCallback((s: Session) => {
    const trackPart = s.tracks
      .map((t) => `${t.id}:${t.instrumentGroup}:${t.presenceSetting}:${t.panPreference}:${t.reverbPreference}`)
      .sort()
      .join(',');
    return `${s.musicalStyle}|${trackPart}`;
  }, []);

  // Build snapshot from previewParams (persisted at preview-generation time)
  const buildSnapshotFromParams = useCallback((pp: PreviewParams) => {
    const trackPart = pp.tracks
      .map((t) => `${t.id}:${t.instrumentGroup}:${t.presenceSetting ?? 'NORMAL'}:${t.panPreference ?? 'NO_PREFERENCE'}:${t.reverbPreference ?? 'NONE'}`)
      .sort()
      .join(',');
    return `${pp.musicalStyle}|${trackPart}`;
  }, []);

  // Restore snapshot from the latest completed preview's previewParams
  useEffect(() => {
    if (!session) return;
    const latestPreview = session.tasks
      .filter((t) => t.taskType === 'preview' && t.status === 'completed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (latestPreview && !lastPreviewSnapshotRef.current) {
      if (latestPreview.previewParams) {
        lastPreviewSnapshotRef.current = buildSnapshotFromParams(latestPreview.previewParams);
      } else {
        // Fallback for older previews without full params
        lastPreviewSnapshotRef.current = buildSnapshot(session);
      }
    }
  }, [session, buildSnapshot, buildSnapshotFromParams]);

  // Check dirty whenever session changes
  useEffect(() => {
    if (!session || !lastPreviewSnapshotRef.current) {
      setDirty(false);
      return;
    }
    setDirty(buildSnapshot(session) !== lastPreviewSnapshotRef.current);
  }, [session, buildSnapshot]);

  // Auto-select latest completed task for sidebar player
  useEffect(() => {
    if (!session) return;
    const completedTasks = session.tasks.filter(
      (t) => t.status === 'completed' && (t.previewUrl || t.finalUrl),
    );
    const count = completedTasks.length;
    if (count > prevCompletedCountRef.current || prevCompletedCountRef.current === 0) {
      if (completedTasks[0]) setSelectedTakeId(completedTasks[0].id);
    }
    prevCompletedCountRef.current = count;
  }, [session]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newStaged: StagedFile[] = Array.from(files).map((file) => ({
      file,
      instrumentGroup: guessInstrumentGroup(file.name),
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);
    e.target.value = '';
  };

  const updateStagedGroup = (index: number, group: string) => {
    setStagedFiles((prev) => prev.map((f, i) => i === index ? { ...f, instrumentGroup: group } : f));
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (!session || stagedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: stagedFiles.length });
    setError(null);

    for (let i = 0; i < stagedFiles.length; i++) {
      const { file, instrumentGroup } = stagedFiles[i];
      setUploadProgress({ current: i + 1, total: stagedFiles.length });

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', session.id);
        formData.append('instrumentGroup', instrumentGroup);

        // Upload route is excluded from Clerk middleware (large FormData bodies
        // fail in Edge Runtime). Send auth explicitly via Bearer token or guest header.
        const uploadHeaders: Record<string, string> = {};
        if (guestToken) {
          uploadHeaders['X-Dial-Guest-Token'] = guestToken;
        } else if (isSignedIn) {
          const token = await getToken();
          if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/dial/upload', {
          method: 'POST',
          headers: uploadHeaders,
          body: formData,
        });

        const data = await res.json();
        if (!data.success) {
          setError(`Upload failed for "${file.name}": ${data.error || 'Unknown error'}`);
          setUploading(false);
          setUploadProgress(null);
          return;
        }
      } catch {
        setError(`Upload error for "${file.name}"`);
        setUploading(false);
        setUploadProgress(null);
        return;
      }
    }

    setStagedFiles([]);
    setUploadProgress(null);
    setUploading(false);
    await fetchSession();
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!session) return;
    setError(null);

    try {
      const res = await fetch('/api/dial/tracks', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ sessionId: session.id, trackId }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to delete track');
        return;
      }

      await fetchSession();
    } catch {
      setError('Delete error');
    }
  };

  const handleTrackGroupChange = async (trackId: string, newGroup: string) => {
    if (!session) return;
    setError(null);

    try {
      const res = await fetch('/api/dial/tracks', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sessionId: session.id,
          updates: [{ trackId, instrumentGroup: newGroup }],
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to update track');
        return;
      }

      await fetchSession();
    } catch {
      setError('Update error');
    }
  };

  const handleStyleChange = async (newStyle: string) => {
    if (!session) return;
    setError(null);

    try {
      const res = await fetch('/api/dial/session', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: session.id, musicalStyle: newStyle }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to update style');
        return;
      }

      await fetchSession();
    } catch {
      setError('Update error');
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

      // Reset dirty state — new preview is based on current params
      lastPreviewSnapshotRef.current = buildSnapshot(session);
      setDirty(false);

      await fetchSession();
    } catch {
      setError('Preview error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleMixGenerate = async (taskId: string, type: 'mix_check' | 'final' = 'final') => {
    setError(null);
    setMixGenerating(true);
    try {
      const res = await fetch('/api/dial/final', {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId, type }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Mix generation failed');
        return;
      }

      await fetchSession();
    } catch {
      setError('Mix generation error');
    } finally {
      setMixGenerating(false);
    }
  };

  // Chat-driven mix generation (find latest preview task and trigger)
  const handleMixCheckFromChat = () => {
    const latestPreview = session?.tasks.find(
      (t) => t.taskType === 'preview' && t.status === 'completed',
    );
    if (latestPreview) handleMixGenerate(latestPreview.id, 'mix_check');
  };

  const handleFinalFromChat = () => {
    const latestPreview = session?.tasks.find(
      (t) => t.taskType === 'preview' && t.status === 'completed',
    );
    if (latestPreview) handleMixGenerate(latestPreview.id, 'final');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

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
  const hasCompletedPreview = session.tasks.some(
    (t) => t.taskType === 'preview' && t.status === 'completed',
  );
  const hasMixCheck = session.tasks.some(
    (t) => t.taskType === 'mix_check' && (t.finalUrl || t.status === 'completed'),
  );
  const hasFinal = session.tasks.some(
    (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
  );
  // In dialogue mode, chat is always visible (the primary UI)
  const showChat = session.mode === 'dialogue' && session.paymentStatus === 'paid' && !hasFinal;
  const phase: 1 | 2 | 3 = hasFinal ? 3 : session.mixCheckCount > 0 ? 3 : 1;

  // Sidebar player — derive from selected take
  const selectedTask = session.tasks.find((t) => t.id === selectedTakeId);
  const selectedAudioUrl = selectedTask?.finalUrl || selectedTask?.previewUrl || null;
  const allPreviewTasks = session.tasks.filter((t) => t.taskType === 'preview');
  const selectedTakeLabel = (() => {
    if (!selectedTask) return '';
    if (selectedTask.taskType === 'mix_check') return 'Mix Check';
    const idx = allPreviewTasks.findIndex((t) => t.id === selectedTask.id);
    if (idx >= 0) return `Take ${allPreviewTasks.length - idx}`;
    return selectedTask.taskType.replace('_', ' ');
  })();

  // ─── Shared Sections (used in both layouts) ─────────────────────────────────

  const uploadSection = session.paymentStatus === 'paid' && !hasFinal && (
    <div>
      <h2 className="text-lg font-medium mb-4">Upload Stems</h2>

      <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer text-sm transition-colors">
        + Add Files
        <input
          type="file"
          accept=".wav,.flac,.aiff,.mp3"
          multiple
          onChange={handleFilesSelected}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {stagedFiles.length > 0 && (
        <div className="mt-4 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 text-left">
                <th className="px-4 py-2 font-medium">File</th>
                <th className="px-4 py-2 font-medium w-44">Instrument Group</th>
                <th className="px-4 py-2 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {stagedFiles.map((staged, i) => (
                <tr key={i} className="border-t border-zinc-800/50">
                  <td className="px-4 py-2 text-white truncate max-w-[200px]">
                    {staged.file.name}
                    <span className="ml-2 text-xs text-zinc-500">
                      {(staged.file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={staged.instrumentGroup}
                      onChange={(e) => updateStagedGroup(i, e.target.value)}
                      className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                    >
                      {INSTRUMENT_GROUPS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeStagedFile(i)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''} ready
            </span>
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
            >
              {uploading && uploadProgress
                ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                : `Upload All (${stagedFiles.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const tracksSection = hasTracks && (
    <div>
      <h2 className="text-lg font-medium mb-3">
        Tracks ({session.tracks.length})
      </h2>
      <div className="space-y-2">
        {session.tracks.map((track) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <span className="text-sm truncate max-w-[200px]">{track.originalFilename}</span>
            <div className="flex items-center gap-3">
              {hasFinal ? (
                <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded">
                  {track.instrumentGroup}
                </span>
              ) : (
                <select
                  value={track.instrumentGroup}
                  onChange={(e) => handleTrackGroupChange(track.id, e.target.value)}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-xs"
                >
                  {INSTRUMENT_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
              {!hasFinal && (
                <button
                  onClick={() => handleDeleteTrack(track.id)}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                  title="Delete track"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dirty banner */}
      {dirty && hasCompletedPreview && !isProcessing && (
        <div className="mt-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg text-sm text-amber-300">
          Settings changed since last preview. Re-generate to hear updated mix.
        </div>
      )}

      {/* Preview Button */}
      {!isProcessing && !hasFinal && (
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="mt-4 w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
        >
          {previewing
            ? 'Requesting...'
            : dirty && hasCompletedPreview
              ? 'Re-generate Preview'
              : 'Generate Preview Mix'}
        </button>
      )}
    </div>
  );

  // Render a single task card (preview take or non-preview)
  const renderTask = (task: Task, allPreviews: Task[]) => {
    const pp = task.previewParams;
    const taskStyleLabel = pp
      ? MUSICAL_STYLES.find((s) => s.value === pp.musicalStyle)?.label ?? pp.musicalStyle
      : null;
    const trackCount = pp?.tracks?.length;
    const previewNumber = allPreviews.length > 0 && task.taskType === 'preview'
      ? allPreviews.length - allPreviews.findIndex((t) => t.id === task.id)
      : 0;

    return (
      <div
        key={task.id}
        className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium capitalize">
              {task.taskType === 'preview' && previewNumber > 0
                ? `Take ${previewNumber}`
                : task.taskType === 'mix_check'
                  ? 'Mix Check'
                  : task.taskType.replace('_', ' ')}
            </span>
            {pp && (
              <span className="text-xs text-zinc-500">
                {taskStyleLabel} / {trackCount} tracks
              </span>
            )}
          </div>
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
          <div className="mt-2">
            {task.taskType === 'mix_check' && (
              <audio controls src={task.finalUrl} className="w-full mb-2" />
            )}
            <a
              href={task.finalUrl}
              download
              className="inline-block px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
            >
              {task.taskType === 'mix_check' ? 'Download Mix Check (.wav)' : 'Download Final Mix (.wav)'}
            </a>
          </div>
        )}

        {/* Omakase: single Final button */}
        {task.status === 'completed' && task.previewUrl && !task.finalUrl && !hasFinal && session.mode === 'omakase' && (
          <button
            onClick={() => handleMixGenerate(task.id, 'final')}
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            Generate Final Mix
          </button>
        )}

        {/* Dialogue: NO standalone buttons — actions are driven through chat */}
      </div>
    );
  };

  const resultsSection = !hasFinal && session.tasks.length > 0 && (() => {
    const allPreviews = session.tasks.filter((t) => t.taskType === 'preview');
    const nonPreviews = session.tasks.filter((t) => t.taskType !== 'preview');
    const recentTakes = allPreviews.slice(0, 3);
    const olderTakes = allPreviews.slice(3);

    return (
      <div>
        <h2 className="text-lg font-medium mb-3">Mix Results</h2>
        <div className="space-y-3">
          {nonPreviews.map((t) => renderTask(t, allPreviews))}
          {recentTakes.map((t) => renderTask(t, allPreviews))}

          {olderTakes.length > 0 && (
            <>
              <button
                onClick={() => setShowOlderTakes(!showOlderTakes)}
                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 border-dashed rounded-lg transition-colors"
              >
                {showOlderTakes
                  ? 'Hide older takes'
                  : `Show ${olderTakes.length} older take${olderTakes.length !== 1 ? 's' : ''}`}
              </button>
              {showOlderTakes && olderTakes.map((t) => renderTask(t, allPreviews))}
            </>
          )}
        </div>
      </div>
    );
  })();

  // ─── Completed banner ───────────────────────────────────────────────────────

  const completedSection = hasFinal && (() => {
    const finalTask = session.tasks.find(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
    );
    const allPreviews = session.tasks.filter((t) => t.taskType === 'preview');
    const styleLabel = MUSICAL_STYLES.find((s) => s.value === session.musicalStyle)?.label ?? session.musicalStyle;

    return (
      <div className="space-y-6">
        <div className="p-8 bg-gradient-to-b from-green-900/20 to-zinc-900 border border-green-800/40 rounded-2xl text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <h2 className="text-2xl font-bold mb-1">Your mix is ready</h2>
          <p className="text-zinc-400 text-sm">
            {styleLabel} &middot; {session.tracks.length} tracks &middot; {allPreviews.length} take{allPreviews.length !== 1 ? 's' : ''} explored
          </p>
        </div>

        {finalTask && (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-400 capitalize">
                {finalTask.taskType.replace('_', ' ')}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-300">
                completed
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={finalTask.finalUrl!}
                download
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-base font-semibold transition-colors"
              >
                Download Final Mix (.wav)
              </a>
              {finalTask.stemsUrls && Object.keys(finalTask.stemsUrls).length > 0 && (
                <a
                  href={`/api/dial/stems?taskId=${finalTask.id}`}
                  download
                  className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-base font-medium transition-colors"
                >
                  Download Stems (.zip)
                  <span className="text-sm text-zinc-400">
                    {Object.keys(finalTask.stemsUrls).length} tracks
                  </span>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <a
            href="/dial"
            className="flex-1 py-3 text-center bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-colors"
          >
            Start New Session
          </a>
          {guestToken && !linked ? (
            <a
              href={`/sign-up?redirect_url=/dial/session/${session.id}`}
              className="flex-1 py-3 text-center bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
            >
              Save to Account
            </a>
          ) : (
            <a
              href="/dashboard/dial"
              className="flex-1 py-3 text-center bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
            >
              Back to Dashboard
            </a>
          )}
        </div>

        {allPreviews.length > 0 && (
          <div>
            <button
              onClick={() => setShowOlderTakes(!showOlderTakes)}
              className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 border-dashed rounded-lg transition-colors"
            >
              {showOlderTakes
                ? 'Hide preview takes'
                : `Show ${allPreviews.length} preview take${allPreviews.length !== 1 ? 's' : ''}`}
            </button>
            {showOlderTakes && (
              <div className="mt-3 space-y-3">
                {allPreviews.map((task) => {
                  const pp = task.previewParams;
                  const takeStyleLabel = pp
                    ? MUSICAL_STYLES.find((s) => s.value === pp.musicalStyle)?.label ?? pp.musicalStyle
                    : null;
                  const previewNumber = allPreviews.length - allPreviews.findIndex((t) => t.id === task.id);
                  return (
                    <div key={task.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">Take {previewNumber}</span>
                        {pp && (
                          <span className="text-xs text-zinc-500">
                            {takeStyleLabel} / {pp.tracks?.length} tracks
                          </span>
                        )}
                      </div>
                      {task.previewUrl && (
                        <audio controls src={task.previewUrl} className="w-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  })();

  // ─── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className={`mx-auto px-6 py-12 ${showChat ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {/* Header */}
        <div className={showChat ? 'mb-4' : 'mb-8'}>
          <div className="flex items-center justify-between">
            <h1 className={`font-bold ${showChat ? 'text-xl' : 'text-3xl'}`}>
              MUED<span className="text-indigo-400">ial</span>
              <span className={`font-normal text-zinc-400 ml-3 ${showChat ? 'text-sm' : 'text-lg'}`}>
                {session.mode === 'omakase' ? 'Omakase' : 'Dialogue'} Mix
              </span>
            </h1>
            <div className="flex items-center gap-3">
              {showChat ? (
                // Dialogue: genre is set through chat — show as label only
                session.musicalStyle && session.musicalStyle !== 'other' && (
                  <span className="text-xs text-zinc-500 px-2 py-1 bg-zinc-900 rounded-lg">
                    {MUSICAL_STYLES.find((s) => s.value === session.musicalStyle)?.label ?? session.musicalStyle}
                  </span>
                )
              ) : (
                // Omakase: genre selector
                <select
                  value={session.musicalStyle}
                  onChange={(e) => handleStyleChange(e.target.value)}
                  disabled={hasFinal}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm disabled:opacity-50"
                >
                  {MUSICAL_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              )}
            </div>
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

        {/* ─── Main Content ─────────────────────────────────────────────── */}

        {session.paymentStatus === 'paid' && !hasFinal && (
          showChat ? (
            // 2-column layout: Chat dominant (left) + Sidebar (right)
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left: Chat panel */}
              <div className="flex-1 min-w-0">
                <div className="h-[calc(100vh-14rem)]">
                  <ChatPanel
                    className="h-full"
                    sessionId={session.id}
                    tracks={session.tracks}
                    headers={headers}
                    onParametersApplied={fetchSession}
                    onPreviewRequested={handlePreview}
                    onMixCheckRequested={handleMixCheckFromChat}
                    onFinalRequested={handleFinalFromChat}
                    generating={mixGenerating}
                    phase={phase}
                  />
                </div>
              </div>

              {/* Right: Sidebar — player, take history, tracks, upload */}
              <div className="lg:w-80 shrink-0 space-y-5 overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
                {/* Shared Player */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Now Playing</h3>
                  {selectedAudioUrl ? (
                    <>
                      <div className="text-sm text-white font-medium mb-2">{selectedTakeLabel}</div>
                      <audio controls src={selectedAudioUrl} className="w-full" key={selectedAudioUrl} />
                      <a
                        href={selectedAudioUrl}
                        download
                        className="mt-2 inline-block text-xs text-zinc-400 hover:text-white transition-colors"
                      >
                        Download {selectedTask?.finalUrl ? '.wav' : '.mp3'}
                      </a>
                    </>
                  ) : (
                    <div className="text-sm text-zinc-600 py-4 text-center">
                      {hasTracks
                        ? 'Generate a preview to hear your mix'
                        : 'Upload stems to get started'}
                    </div>
                  )}
                </div>

                {/* Take History */}
                {session.tasks.some((t) => t.taskType === 'preview' || t.taskType === 'mix_check') && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Takes</h3>
                    <div className="space-y-1">
                      {session.tasks
                        .filter((t) => t.taskType === 'preview' || t.taskType === 'mix_check')
                        .map((task) => {
                          const isSelected = task.id === selectedTakeId;
                          const hasAudio = !!(task.previewUrl || task.finalUrl);
                          const label = task.taskType === 'mix_check'
                            ? 'Mix Check'
                            : `Take ${allPreviewTasks.length - allPreviewTasks.findIndex((t) => t.id === task.id)}`;

                          return (
                            <button
                              key={task.id}
                              onClick={() => hasAudio && setSelectedTakeId(task.id)}
                              disabled={!hasAudio}
                              className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600/20 border border-indigo-500/30 text-white'
                                  : hasAudio
                                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-transparent'
                                    : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected && hasAudio && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                )}
                                <span>{label}</span>
                              </div>
                              {task.status === 'processing' && (
                                <div className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              )}
                              {task.status === 'failed' && (
                                <span className="text-xs text-red-400">failed</span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {tracksSection}
                {uploadSection}
              </div>
            </div>
          ) : session.mode === 'omakase' ? (
            // Omakase: Single column (upload → tracks → preview → results)
            <div className="space-y-8">
              {uploadSection}
              {tracksSection}
              {resultsSection}
            </div>
          ) : null
        )}

        {/* Completed state */}
        {completedSection}
      </div>
    </div>
  );
}
