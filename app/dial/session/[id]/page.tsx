'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useLocale } from '@/lib/i18n/locale-context';
import Link from 'next/link';
import { ChatPanel } from '@/components/dial/chat-panel';
import { AudioAnalyzerProvider, useAudioAnalyzerContext } from '@/hooks/use-audio-analyzer-context';
import { AudioAnalyzer } from '@/components/dial/audio-analyzer';

/** Proxy GCS audio URLs through our Worker to add CORS headers (needed for Web Audio API analyzer) */
function proxyAudioUrl(url: string): string {
  const proxyBase = process.env.NEXT_PUBLIC_UPLOAD_PROXY_URL;
  if (!proxyBase || !url.includes('storage.googleapis.com')) return url;
  return `${proxyBase}?url=${encodeURIComponent(url)}`;
}

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
  mode: 'omakase' | 'dialogue' | null; // null = mastering-only
  masteringMode: 'omakase' | 'dialogue' | null;
  status: string;
  musicalStyle: string;
  title: string | null;
  paymentStatus: string;
  mixCheckCount: number;
  previewCount: number;
  tracks: Track[];
  tasks: Task[];
  analysisResult?: Record<string, unknown> | null;
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
  return (
    <AudioAnalyzerProvider>
      <DialSessionContent />
    </AudioAnalyzerProvider>
  );
}

function DialSessionContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const { isSignedIn, getToken } = useAuth();
  const { t } = useLocale();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [fileUploadPercent, setFileUploadPercent] = useState(0);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Preview state
  const [previewing, setPreviewing] = useState(false);

  // Mix generation state
  const [mixGenerating, setMixGenerating] = useState(false);

  // Sidebar player — selected take
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);
  const prevCompletedCountRef = useRef(0);

  // Audio analyzer (from context)
  const { audioRef, isActive: analyzerActive, connect: analyzerConnect } = useAudioAnalyzerContext();

  // Dev-mode local audio for testing analyzer
  const [devAudioUrl, setDevAudioUrl] = useState<string | null>(null);
  const [devDragOver, setDevDragOver] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';
  const devFileInputRef = useRef<HTMLInputElement>(null);

  const handleDevDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDevDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('audio/')) {
      setDevAudioUrl(URL.createObjectURL(file));
    }
  }, []);

  // Track whether params changed since last preview
  const [dirty, setDirty] = useState(false);
  const lastPreviewSnapshotRef = useRef<string>('');

  // Take folding — show only latest 3, collapse older
  const [showOlderTakes, setShowOlderTakes] = useState(false);

  const guestToken = typeof window !== 'undefined'
    ? localStorage.getItem('dial_guest_token')
    : null;

  const headers: Record<string, string> = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(guestToken ? { 'X-Dial-Guest-Token': guestToken } : {}),
  }), [guestToken]);

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

  // Clear mixGenerating flag when the processing final/mix_check task completes
  useEffect(() => {
    if (!mixGenerating || !session?.tasks) return;
    const hasFinalProcessing = session.tasks.some(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced' || t.taskType === 'mix_check')
        && (t.status === 'processing' || t.status === 'pending'),
    );
    if (!hasFinalProcessing) {
      setMixGenerating(false);
    }
  }, [session, mixGenerating]);

  // Poll for payment confirmation after Stripe redirect
  const isPaymentRedirect = searchParams.get('payment') === 'success';
  useEffect(() => {
    if (!isPaymentRedirect || !session || session.paymentStatus === 'paid') return;
    const interval = setInterval(fetchSession, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 30000); // Stop after 30s
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [isPaymentRedirect, session, fetchSession]);

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

  // Reconnect analyzer when selected take changes (audio element is recreated via React key)
  useEffect(() => {
    if (!analyzerActive || !selectedTakeId) return;
    const timer = setTimeout(() => analyzerConnect(), 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTakeId, analyzerActive]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newStaged: StagedFile[] = Array.from(files).map((file) => ({
      file,
      instrumentGroup: guessInstrumentGroup(file.name),
    }));

    // Mastering: single file — skip staging, upload immediately
    const isMasteringOnly = !session?.mode && !!session?.masteringMode;
    if (isMasteringOnly && newStaged.length > 0) {
      e.target.value = '';
      setStagedFiles(newStaged);
      // Trigger upload directly
      await uploadFiles(newStaged);
      return;
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    e.target.value = '';
  };

  const updateStagedGroup = (index: number, group: string) => {
    setStagedFiles((prev) => prev.map((f, i) => i === index ? { ...f, instrumentGroup: group } : f));
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: StagedFile[]) => {
    if (!session || files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    setFileUploadPercent(0);
    setError(null);

    for (let i = 0; i < files.length; i++) {
      const { file, instrumentGroup } = files[i];
      setUploadProgress({ current: i + 1, total: files.length });
      setFileUploadPercent(0);

      // Refresh auth headers per file (Clerk JWT expires in ~60s, WAV uploads take longer)
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (guestToken) {
        authHeaders['X-Dial-Guest-Token'] = guestToken;
      } else if (isSignedIn) {
        const token = await getToken();
        if (token) authHeaders['Authorization'] = `Bearer ${token}`;
      }

      try {
        // Step 1: Get presigned URL (metadata only — no file body)
        const presignRes = await fetch('/api/dial/upload/presign', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ fileName: file.name, sessionId: session.id }),
        });
        const presignData = await presignRes.json();
        if (!presignData.success) {
          setError(`Presign failed for "${file.name}": ${presignData.error || 'Unknown error'}`);
          setUploading(false);
          setUploadProgress(null);
          return;
        }
        const { signedUrl, readableUrl } = presignData.data;

        // Step 2: PUT file via Cloudflare Worker proxy → RoEx GCS
        // Worker streams the body through (no buffering, no CORS issue)
        // Use XMLHttpRequest for upload progress tracking
        const proxyUrl = process.env.NEXT_PUBLIC_UPLOAD_PROXY_URL;
        if (!proxyUrl) throw new Error('Upload proxy URL not configured');
        const contentType = file.type || 'audio/wav';
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', proxyUrl, true);
          xhr.setRequestHeader('Content-Type', contentType);
          xhr.setRequestHeader('X-Upload-Target', signedUrl);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setFileUploadPercent(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload proxy failed (${xhr.status})`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(file);
        });

        // Step 3: Confirm upload — save track record in DB
        const confirmRes = await fetch('/api/dial/upload/confirm', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            sessionId: session.id,
            fileName: file.name,
            readableUrl,
            instrumentGroup,
          }),
        });
        const confirmData = await confirmRes.json();
        if (!confirmData.success) {
          setError(`Confirm failed for "${file.name}": ${confirmData.error || 'Unknown error'}`);
          setUploading(false);
          setUploadProgress(null);
          return;
        }
      } catch (err) {
        setError(`Upload error for "${file.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        setUploading(false);
        setUploadProgress(null);
        return;
      }
    }

    setStagedFiles([]);
    setUploadProgress(null);
    setFileUploadPercent(0);
    setUploading(false);
    await fetchSession();

    // Auto-analyze for mastering sessions after upload
    const isMasterOnly = !session.mode && !!session.masteringMode;
    if (isMasterOnly) {
      await runAnalysis();
    }
  };

  const runAnalysis = async () => {
    if (!session || analyzing) return;
    setAnalyzing(true);
    try {
      await fetch('/api/dial/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: session.id }),
      });
      await fetchSession();
    } catch {
      // Analysis failure is non-blocking
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUploadAll = () => uploadFiles(stagedFiles);

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
        setMixGenerating(false);
        return;
      }

      // If already completed (dev key or fast response), update immediately
      if (data.data?.status === 'completed') {
        await fetchSession();
        setMixGenerating(false);
        return;
      }

      // Task is processing — session polling (every 5s) will detect completion.
      // Trigger one immediate fetch to get the processing task into state,
      // then let the polling interval handle the rest.
      await fetchSession();
      // Note: mixGenerating stays true until session polling detects the
      // final/mix_check task has completed (handled in useEffect below)
    } catch {
      setError('Mix generation error');
      setMixGenerating(false);
    }
  };

  // Chat-driven mix generation (find latest preview task and trigger)
  const handleMixCheckFromChat = () => {
    const latestPreview = session?.tasks.find(
      (t) => t.taskType === 'preview' && t.status === 'completed',
    );
    if (!latestPreview) {
      setError('Preview required before mix check. Please generate a preview first.');
      return;
    }
    handleMixGenerate(latestPreview.id, 'mix_check');
  };

  const handleFinalFromChat = () => {
    const latestPreview = session?.tasks.find(
      (t) => t.taskType === 'preview' && t.status === 'completed',
    );
    if (!latestPreview) {
      setError('Preview required before generating final mix. Please generate a preview first.');
      return;
    }
    handleMixGenerate(latestPreview.id, 'final');
  };

  // Mastering handlers
  const handleMasteringPreview = async (desiredLoudness?: string) => {
    if (!session) return;
    setMixGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/dial/mastering/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: session.id,
          desiredLoudness: desiredLoudness ?? 'MEDIUM',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Mastering preview failed');
        return;
      }
      await fetchSession();
    } catch {
      setError('Mastering preview error');
    } finally {
      setMixGenerating(false);
    }
  };

  const handleMasteringFinal = async () => {
    if (!session) return;
    setMixGenerating(true);
    setError(null);
    try {
      const masteringPreviewTask = session.tasks.find(
        (t) => t.taskType === 'mastering_preview' && t.status === 'completed',
      );
      if (!masteringPreviewTask) {
        setError('No completed mastering preview found');
        return;
      }
      const res = await fetch('/api/dial/mastering/final', {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId: masteringPreviewTask.id }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Mastering final failed');
        return;
      }
      await fetchSession();
    } catch {
      setError('Mastering final error');
    } finally {
      setMixGenerating(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-400" role="status">{t.dial.session.loadingSession}</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">{t.dial.session.sessionNotFound}</h2>
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
  const hasMixFinal = session.tasks.some(
    (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
  );
  const hasMasteringFinal = session.tasks.some(
    (t) => t.taskType === 'mastering' && t.finalUrl,
  );
  const hasMasteringPreview = session.tasks.some(
    (t) => t.taskType === 'mastering_preview' && t.status === 'completed',
  );
  const isMasteringOnly = !session.mode && !!session.masteringMode;
  const isMasteringPhase = isMasteringOnly
    ? !hasMasteringFinal // mastering-only: always in mastering phase until done
    : (!!(session.masteringMode) && hasMixFinal && !hasMasteringFinal); // mix+mastering: after mix final

  // Fully completed = (no mix or mix done) AND (no mastering or mastering done)
  const hasFinal = isMasteringOnly
    ? hasMasteringFinal
    : hasMixFinal && (!session.masteringMode || hasMasteringFinal);

  // Chat is visible: during mixing, during mastering phase, or mastering-only (always until done)
  const showChat = session.paymentStatus === 'paid'
    && (isMasteringOnly
      ? !hasMasteringFinal
      : (!hasMixFinal || (session.masteringMode && !hasMasteringFinal)));
  const phase: 1 | 2 | 3 = hasMixFinal ? 3 : session.mixCheckCount > 0 ? 2 : 1;

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

  const uploadSection = session.paymentStatus === 'paid' && !hasFinal && !(isMasteringPhase && !isMasteringOnly) && (
    <div>
      <h2 className="text-lg font-medium mb-4">{isMasteringOnly ? t.dial.session.upload2mix : t.dial.session.uploadStems}</h2>

      <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer text-sm transition-colors">
        + Add Files
        <input
          type="file"
          accept=".wav,.flac,.aiff,.mp3"
          multiple={!isMasteringOnly}
          onChange={handleFilesSelected}
          disabled={uploading}
          className="hidden"
          aria-label={isMasteringOnly ? t.dial.session.upload2mix : t.dial.session.uploadStems}
        />
      </label>

      {stagedFiles.length > 0 && (
        <div className="mt-4 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 text-left">
                <th className="px-4 py-2 font-medium">File</th>
                {!isMasteringOnly && <th className="px-4 py-2 font-medium w-44">{t.dial.session.instrumentGroup}</th>}
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
                  {!isMasteringOnly && (
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
                  )}
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeStagedFile(i)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                      title={t.dial.session.delete}
                      aria-label={`${t.dial.session.delete} ${staged.file.name}`}
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
                ? `${t.dial.session.uploading} ${uploadProgress.current}/${uploadProgress.total} (${fileUploadPercent}%)`
                : `Upload All (${stagedFiles.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const tracksSection = hasTracks && !(isMasteringPhase && !isMasteringOnly) && (
    <div>
      <h2 className="text-lg font-medium mb-3">
        {t.dial.session.tracks} ({session.tracks.length})
      </h2>
      <div className="space-y-2">
        {session.tracks.map((track) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <span className="text-sm truncate max-w-[200px]">{track.originalFilename}</span>
            <div className="flex items-center gap-3">
              {!isMasteringOnly && (
                hasFinal ? (
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
                )
              )}
              {!hasFinal && (
                <button
                  onClick={() => handleDeleteTrack(track.id)}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                  title={t.dial.session.delete}
                  aria-label={`${t.dial.session.delete} ${track.originalFilename}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dirty banner */}
      {dirty && hasCompletedPreview && !isProcessing && !isMasteringOnly && (
        <div className="mt-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg text-sm text-amber-300">
          {t.dial.session.settingsChanged}
        </div>
      )}

      {/* Preview Button (mix only — mastering uses chat-driven flow) */}
      {!isProcessing && !hasFinal && !isMasteringOnly && !isMasteringPhase && (
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="mt-4 w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
        >
          {previewing
            ? t.dial.session.processing
            : dirty && hasCompletedPreview
              ? t.dial.session.regeneratePreview
              : t.dial.session.generatePreview}
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
                ? `${t.dial.session.take} ${previewNumber}`
                : task.taskType === 'mix_check'
                  ? 'Mix Check'
                  : task.taskType === 'mastering_preview'
                    ? 'Master Preview'
                    : task.taskType === 'mastering'
                      ? 'Master Final'
                      : task.taskType.replace('_', ' ')}
            </span>
            {pp && (
              <span className="text-xs text-zinc-500">
                {taskStyleLabel} / {trackCount} {t.dial.session.tracks.toLowerCase()}
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
          <div className="flex items-center gap-2 text-sm text-zinc-400" role="status">
            <div className="h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            {t.dial.session.processing}
          </div>
        )}

        {task.previewUrl && (
          <div className="mt-2">
            <audio controls src={proxyAudioUrl(task.previewUrl)} crossOrigin="anonymous" className="w-full" />
          </div>
        )}

        {task.finalUrl && (
          <div className="mt-2">
            {task.taskType === 'mix_check' && (
              <audio controls src={proxyAudioUrl(task.finalUrl)} crossOrigin="anonymous" className="w-full mb-2" />
            )}
            <a
              href={task.finalUrl}
              download
              className="inline-block px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
            >
              {task.taskType === 'mix_check'
                ? 'Download Mix Check (.wav)'
                : task.taskType === 'mastering'
                  ? 'Download Mastered Track (.wav)'
                  : `${t.dial.session.downloadFinal} (.wav)`}
            </a>
          </div>
        )}

        {/* NO standalone buttons — actions are driven through chat for both modes */}
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
                  ? `Hide ${t.dial.session.previousTakes.toLowerCase()}`
                  : `Show ${olderTakes.length} ${t.dial.session.previousTakes.toLowerCase()}`}
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
    const mixFinalTask = session.tasks.find(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
    );
    const masteringFinalTask = session.tasks.find(
      (t) => t.taskType === 'mastering' && t.finalUrl,
    );
    const allPreviews = session.tasks.filter((t) => t.taskType === 'preview');
    const styleLabel = MUSICAL_STYLES.find((s) => s.value === session.musicalStyle)?.label ?? session.musicalStyle;

    return (
      <div className="space-y-6">
        <div className="p-8 bg-gradient-to-b from-green-900/20 to-zinc-900 border border-green-800/40 rounded-2xl text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <h2 className="text-2xl font-bold mb-1">
            {t.dial.session.yourMixReady}
          </h2>
          <p className="text-zinc-400 text-sm">
            {styleLabel} &middot; {session.tracks.length} {t.dial.session.tracks.toLowerCase()} &middot; {allPreviews.length} {t.dial.session.take.toLowerCase()}{allPreviews.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Mastered final — primary download */}
        {masteringFinalTask && (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-400">Mastered Track</span>
              <span className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-300">completed</span>
            </div>
            <a
              href={masteringFinalTask.finalUrl!}
              download
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-base font-semibold transition-colors"
            >
              {t.dial.session.downloadFinal} (.wav)
            </a>
          </div>
        )}

        {/* Mix final */}
        {mixFinalTask && (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-400 capitalize">
                {mixFinalTask.taskType.replace('_', ' ')}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-300">
                completed
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={mixFinalTask.finalUrl!}
                download
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-colors ${
                  masteringFinalTask
                    ? 'bg-zinc-700 hover:bg-zinc-600 font-medium'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                {t.dial.session.downloadFinal} (.wav)
              </a>
              {mixFinalTask.stemsUrls && Object.keys(mixFinalTask.stemsUrls).length > 0 && (
                <a
                  href={`/api/dial/stems?taskId=${mixFinalTask.id}`}
                  download
                  className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-base font-medium transition-colors"
                >
                  {t.dial.session.downloadStems}
                  <span className="text-sm text-zinc-400">
                    {Object.keys(mixFinalTask.stemsUrls).length} {t.dial.session.tracks.toLowerCase()}
                  </span>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/dial"
            className="flex-1 py-3 text-center bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-colors"
          >
            {t.dial.session.startNewSession}
          </Link>
          {guestToken && !linked ? (
            <Link
              href={`/sign-up?redirect_url=/dial/session/${session.id}`}
              className="flex-1 py-3 text-center bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
            >
              {t.dial.session.saveToAccount}
            </Link>
          ) : (
            <Link
              href="/dashboard/dial"
              className="flex-1 py-3 text-center bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
            >
              {t.dial.session.backToDashboard}
            </Link>
          )}
        </div>

        {allPreviews.length > 0 && (
          <div>
            <button
              onClick={() => setShowOlderTakes(!showOlderTakes)}
              className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 border-dashed rounded-lg transition-colors"
            >
              {showOlderTakes
                ? `Hide ${t.dial.session.previousTakes.toLowerCase()}`
                : `Show ${allPreviews.length} ${t.dial.session.take.toLowerCase()}${allPreviews.length !== 1 ? 's' : ''}`}
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
                        <span className="text-sm font-medium">{t.dial.session.take} {previewNumber}</span>
                        {pp && (
                          <span className="text-xs text-zinc-500">
                            {takeStyleLabel} / {pp.tracks?.length} {t.dial.session.tracks.toLowerCase()}
                          </span>
                        )}
                      </div>
                      {task.previewUrl && (
                        <audio controls src={proxyAudioUrl(task.previewUrl)} crossOrigin="anonymous" className="w-full" />
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
                {isMasteringPhase || isMasteringOnly
                  ? 'Mastering'
                  : `${session.mode === 'omakase' ? 'Omakase' : 'Dialogue'} Mix`}
              </span>
            </h1>
            <div className="flex items-center gap-3">
              {!isMasteringOnly && session.musicalStyle && session.musicalStyle !== 'other' && (
                <span className="text-xs text-zinc-500 px-2 py-1 bg-zinc-900 rounded-lg">
                  {MUSICAL_STYLES.find((s) => s.value === session.musicalStyle)?.label ?? session.musicalStyle}
                </span>
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
            {isPaymentRedirect ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" role="status" />
                  <h2 className="text-lg font-medium text-amber-300">Confirming payment...</h2>
                </div>
                <p className="text-zinc-400">This usually takes a few seconds.</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-medium text-amber-300 mb-2">{t.dial.session.paymentRequired}</h2>
                <p className="text-zinc-400">{t.dial.session.completePayment}</p>
              </>
            )}
          </div>
        )}

        {/* ─── Main Content ─────────────────────────────────────────────── */}

        {session.paymentStatus === 'paid' && !hasFinal && (
          showChat ? (
            // 2-column layout: Chat dominant (left) + Sidebar (right)
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left: Chat panel */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Processing banner — visible when task is being processed server-side */}
                {isProcessing && latestTask && (
                  <div className="mb-2 px-4 py-3 bg-amber-900/20 border border-amber-800/40 rounded-xl flex items-center gap-3">
                    <div className="h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" role="status" />
                    <div className="text-sm">
                      <span className="text-amber-300 font-medium">
                        {latestTask.taskType === 'mastering' ? 'Generating mastered track...'
                          : latestTask.taskType === 'mastering_preview' ? 'Generating master preview...'
                          : latestTask.taskType === 'mix_check' ? 'Generating mix check...'
                          : latestTask.taskType === 'preview' ? 'Generating preview...'
                          : 'Processing...'}
                      </span>
                      <span className="text-zinc-500 ml-2 text-xs">This may take a few minutes</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  <ChatPanel
                    className="h-full"
                    sessionId={session.id}
                    tracks={session.tracks}
                    headers={headers}
                    onParametersApplied={fetchSession}
                    onPreviewRequested={handlePreview}
                    onMixCheckRequested={handleMixCheckFromChat}
                    onFinalRequested={handleFinalFromChat}
                    onMasteringPreviewRequested={handleMasteringPreview}
                    onMasteringFinalRequested={handleMasteringFinal}
                    generating={mixGenerating}
                    phase={phase}
                    mode={session.mode ?? session.masteringMode ?? 'omakase'}
                    previewCount={session.previewCount}
                    previewLimit={isMasteringOnly ? 0 : session.mode === 'omakase' ? 5 : 0}
                    isMasteringPhase={isMasteringPhase}
                  />
                </div>
              </div>

              {/* Right: Sidebar — player, take history, tracks, upload */}
              <div className="lg:w-80 shrink-0 space-y-5 overflow-y-auto lg:max-h-[calc(100vh-14rem)] lg:sticky lg:top-24 lg:self-start">
                {/* Shared Player */}
                <div
                  className={`bg-zinc-900 border rounded-xl p-4 transition-colors ${
                    devDragOver ? 'border-indigo-500 bg-indigo-950/20' : 'border-zinc-800'
                  }`}
                  {...(isDev ? {
                    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDevDragOver(true); },
                    onDragEnter: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDevDragOver(true); },
                    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDevDragOver(false); },
                    onDrop: handleDevDrop,
                  } : {})}
                >
                  <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Now Playing</h3>
                  {(() => {
                    const effectiveUrl = devAudioUrl || selectedAudioUrl;
                    const isDevOverride = !!devAudioUrl;
                    return effectiveUrl ? (
                      <>
                        <div className="text-sm text-white font-medium mb-2">
                          {isDevOverride ? '🔧 Dev Audio' : selectedTakeLabel}
                        </div>
                        <audio
                          ref={audioRef}
                          controls
                          src={proxyAudioUrl(effectiveUrl)}
                          crossOrigin="anonymous"
                          className="w-full"
                          key={effectiveUrl}
                        />
                        {!isDevOverride && selectedAudioUrl && (
                          <button
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = selectedAudioUrl;
                              a.download = `mix${selectedTask?.finalUrl ? '.wav' : '.mp3'}`;
                              a.target = '_blank';
                              a.rel = 'noopener noreferrer';
                              a.click();
                            }}
                            className="mt-2 inline-block text-xs text-zinc-400 hover:text-white transition-colors"
                          >
                            Download {selectedTask?.finalUrl ? '.wav' : '.mp3'}
                          </button>
                        )}
                        {isDevOverride && (
                          <button
                            onClick={() => { setDevAudioUrl(null); }}
                            className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            Remove dev audio
                          </button>
                        )}
                        <div className="mt-3 border-t border-zinc-800 pt-3">
                          <AudioAnalyzer compact />
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-zinc-600 py-4 text-center">
                        {analyzing
                          ? 'Analyzing your audio...'
                          : hasTracks
                            ? (isMasteringOnly ? 'Chat with Hoo to start mastering' : 'Generate a preview to hear your mix')
                            : (isMasteringOnly ? 'Upload your 2-mix to get started' : 'Upload stems to get started')}
                      </div>
                    );
                  })()}
                  {/* Dev-mode: always show file picker for local audio testing */}
                  {isDev && (
                    <div className="mt-3 border-t border-zinc-800 pt-3">
                      <div className="text-[10px] text-zinc-600 mb-2">
                        {devDragOver ? '↓ Drop here' : '🔧 Dev: drag audio onto this card, or'}
                      </div>
                      <button
                        onClick={() => devFileInputRef.current?.click()}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Select file
                      </button>
                      <input
                        ref={devFileInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDevAudioUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Mastering Phase Banner */}
                {isMasteringPhase && !isMasteringOnly && (
                  <div className="p-4 bg-indigo-900/20 border border-indigo-800/40 rounded-xl text-center">
                    <p className="text-sm text-indigo-300 font-medium">Mix complete! Mastering phase</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Mastering
                    </p>
                  </div>
                )}

                {/* Take History */}
                {session.tasks.some((t) => t.taskType === 'preview' || t.taskType === 'mix_check' || t.taskType === 'mastering_preview' || t.taskType === 'mastering') && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Takes</h3>
                    <div className="space-y-1">
                      {session.tasks
                        .filter((t) => t.taskType === 'preview' || t.taskType === 'mix_check' || t.taskType === 'mastering_preview' || t.taskType === 'mastering')
                        .map((task) => {
                          const isSelected = task.id === selectedTakeId;
                          const hasAudio = !!(task.previewUrl || task.finalUrl);
                          const label = task.taskType === 'mix_check'
                            ? 'Mix Check'
                            : task.taskType === 'mastering_preview'
                              ? 'Master Preview'
                              : task.taskType === 'mastering'
                                ? 'Master Final'
                                : `${t.dial.session.take} ${allPreviewTasks.length - allPreviewTasks.findIndex((tt) => tt.id === task.id)}`;

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
                                <div className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" role="status" aria-label={t.dial.session.processing} />
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
          ) : null
        )}

        {/* Completed state */}
        {completedSection}
      </div>
    </div>
  );
}
