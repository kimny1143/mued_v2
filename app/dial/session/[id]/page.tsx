'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useLocale } from '@/lib/i18n/locale-context';
import Link from 'next/link';
import { ChatPanel } from '@/components/dial/chat-panel';
import { AudioAnalyzerProvider } from '@/hooks/use-audio-analyzer-context';
import { UnifiedSessionPlayerV2 as UnifiedSessionPlayer } from '@/components/dial/v2/unified-session-player-v2';
import type { TakeEntry } from '@/components/dial/unified-session-player';

/** Stream audio through our own API to avoid GCS presigned URL length/CORS issues */
function taskStreamUrl(taskId: string): string {
  return `/api/dial/download?taskId=${taskId}&inline=1`;
}

/** Proxy individual stem via session-based lookup — server picks preview MP3 over final WAV */
function stemStreamUrl(sessionId: string, stemKey: string, token?: string | null): string {
  const base = `/api/dial/download?sessionId=${sessionId}&stemKey=${encodeURIComponent(stemKey)}&inline=1`;
  return token ? `${base}&token=${encodeURIComponent(token)}` : base;
}

/** Convert InstrumentGroup enum to short DAW-style label: BASS_GROUP → BASS */
function toShortLabel(group: string): string {
  return group.replace(/_GROUP$/, '').replace(/^(INSTRUMENT_|TRACK_)/, '');
}

function toDisplayName(t: Pick<Track, 'originalFilename' | 'instrumentGroup'>, idx: number): string {
  if (t.originalFilename) return t.originalFilename.replace(/\.[^.]+$/, '');
  if (t.instrumentGroup) return toShortLabel(t.instrumentGroup);
  return `Stem ${idx + 1}`;
}

interface Track {
  id: string;
  originalFilename: string;
  roexUploadUrl: string;
  instrumentGroup: string;
  presenceSetting: string;
  panPreference: string;
  reverbPreference: string;
  r2Url?: string | null;
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

interface Message {
  parameterChanges: Array<{
    track: string;
    changes: { gainDb?: number; panAngleDegrees?: number; reverbSend?: number };
    reason?: string;
  }> | null;
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
  messages?: Message[];
  analysisResult?: Record<string, unknown> | null;
  referenceTrackUrl?: string | null;
  referenceTrackFilename?: string | null;
  referenceAnalysisResult?: {
    loudnessLufs: number;
    peakDbfs: number;
    stereoField: string;
    tonalProfile: Record<string, string>;
  } | null;
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
  const [showPaymentBanner, setShowPaymentBanner] = useState(false);

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


  // Take folding — show only latest 3, collapse older
  const [showOlderTakes, setShowOlderTakes] = useState(false);

  // Elapsed time tracking for processing tasks
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const processingStartRef = useRef<number | null>(null);

  // Download tracking for completion section
  const [downloadedItems, setDownloadedItems] = useState<Set<string>>(new Set());
  const markDownloaded = (item: string) => {
    setDownloadedItems(prev => new Set(prev).add(item));
  };

  // Restore guest token from URL query param (email recovery link)
  const guestToken = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
      localStorage.setItem('dial_guest_token', urlToken);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
      return urlToken;
    }
    return localStorage.getItem('dial_guest_token');
  }, []);

  const headers: Record<string, string> = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(guestToken ? { 'X-Dial-Guest-Token': guestToken } : {}),
  }), [guestToken]);

  // Build download URL with guest token for browser link clicks
  const downloadUrl = useCallback((taskId: string, api: 'download' | 'stems' = 'download') => {
    const base = `/api/dial/${api}?taskId=${taskId}`;
    return guestToken ? `${base}&token=${guestToken}` : base;
  }, [guestToken]);

  // Extract latest parameterChanges from session messages and normalize track field:
  // parameterChanges[].track = originalFilename (e.g. "stem_BASS.wav")
  // stemsUrls keys = GCS filename from roexUploadUrl (e.g. "abc123-uuid.wav")
  // Bridge: originalFilename → roexUploadUrl path → "{uuid}.wav" → matches stemsUrls key
  const latestParamChanges = useMemo(() => {
    const raw = session?.messages?.[0]?.parameterChanges;
    if (!raw || !session?.tracks?.length) return undefined;
    const filenameToGcsKey = new Map(
      session.tracks.map((t) => [
        t.originalFilename,
        t.roexUploadUrl.split('/').pop()?.split('?')[0] ?? t.originalFilename,
      ])
    );
    return raw.map((p) => ({ ...p, track: filenameToGcsKey.get(p.track) ?? p.track }));
  }, [session?.messages, session?.tracks]);

  // Build TakeEntry[] for UnifiedSessionPlayer — used in both active sidebar and completion screen
  const sessionTakes = useMemo((): TakeEntry[] => {
    if (!session) return [];

    const hasStemsTask = (t: { stemsUrls: Record<string, string> | null }) =>
      !!t.stemsUrls && Object.keys(t.stemsUrls).length > 0;
    const stemTaskForKeys = session.tasks.find((t) => hasStemsTask(t));
    const proxiedStems = stemTaskForKeys
      ? Object.fromEntries(
          Object.keys(stemTaskForKeys.stemsUrls as Record<string, string>).map(
            (k) => [k, stemStreamUrl(session.id, k, guestToken)],
          ),
        )
      : null;

    const takes: TakeEntry[] = [];

    const mixFinalTask = session.tasks.find(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
    );
    const masteringFinalTask = session.tasks.find(
      (t) => t.taskType === 'mastering' && t.finalUrl,
    );

    // RAW: always enabled once stems are uploaded
    const rawStemEntries = session.tracks
      .filter((t) => !!t.r2Url)
      .map((t) => [t.id, t.r2Url as string] as const);
    if (rawStemEntries.length > 0) {
      takes.push({
        id: `raw-${session.id}`,
        label: 'RAW',
        url: rawStemEntries[0][1],
        stemsUrls: Object.fromEntries(rawStemEntries),
        createdAt: mixFinalTask?.createdAt ?? masteringFinalTask?.createdAt ?? '',
        enabled: true,
      });
    }

    // MIXED: all completed takes (final > previews > mix_checks) shown individually in drawer
    // Count each type chronologically (oldest = #1) for display labels
    const completedPreviews = [...session.tasks]
      .filter((t) => t.taskType === 'preview' && t.status === 'completed' && !!(t.previewUrl || t.finalUrl))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const completedMixChecks = [...session.tasks]
      .filter((t) => t.taskType === 'mix_check' && t.status === 'completed' && !!(t.previewUrl || t.finalUrl))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const completedFinals = session.tasks.filter(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.status === 'completed' && !!t.finalUrl,
    );

    // All completed MIXED takes, newest first for display
    const allCompletedMix = [
      ...completedFinals.map((t) => ({ task: t, sublabel: 'Final Mix' })),
      ...completedMixChecks.map((t, i) => ({ task: t, sublabel: `Mix Check ${i + 1}` })),
      ...completedPreviews.map((t, i) => ({ task: t, sublabel: `Preview ${i + 1}` })),
    ].sort((a, b) => new Date(b.task.createdAt).getTime() - new Date(a.task.createdAt).getTime());

    // Give proxiedStems to ALL MIXED takes — session-based proxy resolves to best task server-side.
    // Fixes B1: FinalMix generation used to push i=0 stems and null-out older takes' stem panels.
    allCompletedMix.forEach(({ task, sublabel }) => {
      takes.push({
        id: task.id,
        label: 'MIXED',
        sublabel,
        url: taskStreamUrl(task.id),
        stemsUrls: proxiedStems,
        createdAt: task.createdAt,
        enabled: true,
      });
    });

    // Processing MIXED task (disabled pill)
    const processingMix = session.tasks.find(
      (t) =>
        (t.taskType === 'preview' || t.taskType === 'mix_check' ||
         t.taskType === 'final_basic' || t.taskType === 'final_advanced') &&
        (t.status === 'processing' || t.status === 'pending'),
    );
    if (processingMix && allCompletedMix.length === 0) {
      // Show disabled MIXED pill only if no completed takes exist yet
      takes.push({
        id: processingMix.id,
        label: 'MIXED',
        sublabel: 'Processing…',
        url: '',
        stemsUrls: null,
        createdAt: processingMix.createdAt,
        enabled: false,
      });
    }

    // MASTERED: completed > processing (disabled)
    const masteringTask =
      masteringFinalTask ??
      session.tasks.find(
        (t) => t.taskType === 'mastering' && (t.status === 'processing' || t.status === 'pending'),
      );
    if (masteringTask) {
      const isMasteredEnabled = masteringTask.status === 'completed' && !!masteringTask.finalUrl;
      takes.push({
        id: masteringTask.id,
        label: 'MASTERED',
        url: taskStreamUrl(masteringTask.id),
        stemsUrls: null,
        createdAt: masteringTask.createdAt,
        enabled: isMasteredEnabled,
      });
    }

    return takes;
  }, [session, guestToken]);

  // Map normalizedBase(GCS filename) → display name for StemPanel.
  // Key matches initialStemMap key and stemDataList baseKey in unified-session-player-v2.
  const stemLabelMap = useMemo(() => {
    if (!session?.tracks) return {} as Record<string, string>;
    const nb = (k: string) => k.replace(/\.[^.]+$/, '').replace(/_normalized$/i, '').toLowerCase();
    return Object.fromEntries(
      session.tracks.map((t, idx) => [
        nb(t.roexUploadUrl.split('/').pop()?.split('?')[0] ?? t.id),
        toDisplayName(t, idx),
      ])
    );
  }, [session?.tracks]);

  // Stable key for UnifiedSessionPlayer — remount when:
  // 1. Enabled take IDs change (new task completes)
  // 2. Stem presence flips false→true (B2 fix: remount when stemsUrls first arrives so hook
  //    rebuilds nodes with correct stem keys instead of the { main: url } fallback)
  const playerKey = useMemo(() => {
    const ids = sessionTakes.filter((t) => t.enabled).map((t) => t.id).join(',');
    const hasStems = sessionTakes.some(
      (t) => t.enabled && !!t.stemsUrls && Object.keys(t.stemsUrls).length > 0,
    );
    return `${ids}:stems=${hasStems}`;
  }, [sessionTakes]);

  const fetchSession = useCallback(async (): Promise<Session | null> => {
    try {
      const res = await fetch(`/api/dial/session?id=${sessionId}`, {
        headers: guestToken ? { 'X-Dial-Guest-Token': guestToken } : {},
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.data);
        return data.data as Session;
      } else {
        setError(data.error || 'Failed to load session');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
    return null;
  }, [sessionId, guestToken]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll for task updates when tasks are processing
  // Also triggers GET /api/dial/final to poll RoEx for final/mix_check tasks
  useEffect(() => {
    const processingTasks = session?.tasks?.filter(
      (t) => t.status === 'processing' || t.status === 'pending',
    ) ?? [];
    if (processingTasks.length === 0) return;

    const poll = async () => {
      // For final/mix_check tasks, poll the RoEx result endpoint first
      const finalTask = processingTasks.find(
        (t) => t.taskType === 'final_basic' || t.taskType === 'final_advanced' || t.taskType === 'mix_check',
      );
      if (finalTask) {
        try {
          await fetch(`/api/dial/final?taskId=${finalTask.id}`, { headers });
        } catch { /* ignore */ }
      }
      // For mastering preview tasks, poll RoEx mastering endpoint
      const masteringPreviewTask = processingTasks.find(
        (t) => t.taskType === 'mastering_preview',
      );
      if (masteringPreviewTask) {
        try {
          await fetch(`/api/dial/mastering/preview?taskId=${masteringPreviewTask.id}`, { headers });
        } catch { /* ignore */ }
      }
      // For mastering final tasks, poll RoEx /retrievefinalmaster endpoint
      const masteringFinalTask = processingTasks.find(
        (t) => t.taskType === 'mastering',
      );
      if (masteringFinalTask) {
        try {
          await fetch(`/api/dial/mastering/final?taskId=${masteringFinalTask.id}`, { headers });
        } catch { /* ignore */ }
      }
      // Then refresh session data from DB
      await fetchSession();
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [session, fetchSession, headers]);

  // Sync mixGenerating state with session task status (handles page reload)
  useEffect(() => {
    if (!session?.tasks) return;
    const hasFinalProcessing = session.tasks.some(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced' || t.taskType === 'mix_check')
        && (t.status === 'processing' || t.status === 'pending'),
    );
    setMixGenerating(hasFinalProcessing);
  }, [session]);

  // Poll for payment confirmation after Stripe redirect
  const isPaymentRedirect = searchParams.get('payment') === 'success';
  useEffect(() => {
    if (!isPaymentRedirect || !session || session.paymentStatus === 'paid') return;
    const interval = setInterval(fetchSession, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 30000); // Stop after 30s
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [isPaymentRedirect, session, fetchSession]);

  // Show payment success banner when redirect arrives and payment is confirmed
  useEffect(() => {
    if (!isPaymentRedirect || !session || session.paymentStatus !== 'paid') return;
    setShowPaymentBanner(true);
    const timer = setTimeout(() => setShowPaymentBanner(false), 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentRedirect, session?.paymentStatus]);

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

  // Warn before leaving if stems haven't been downloaded
  useEffect(() => {
    if (!session) return;
    const hasFinalTask = session.tasks.some(
      (t) => ((t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl)
        || (t.taskType === 'mastering' && t.finalUrl),
    );
    if (!hasFinalTask) return;
    const finalTask = session.tasks.find(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.stemsUrls,
    );
    if (!finalTask?.stemsUrls || downloadedItems.has('stems')) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session, downloadedItems]);



  // Track elapsed time while processing
  useEffect(() => {
    const hasProcessing = session?.tasks?.some(
      (t) => t.status === 'processing' || t.status === 'pending',
    );
    if (hasProcessing) {
      if (!processingStartRef.current) {
        processingStartRef.current = Date.now();
        setElapsedSeconds(0);
      }
      const interval = setInterval(() => {
        if (processingStartRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - processingStartRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      processingStartRef.current = null;
      setElapsedSeconds(0);
    }
  }, [session]);

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
      // Signed-in users always use Bearer JWT — guestToken may be stale after auto-link clears it
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isSignedIn) {
        const token = await getToken();
        if (token) authHeaders['Authorization'] = `Bearer ${token}`;
      } else if (guestToken) {
        authHeaders['X-Dial-Guest-Token'] = guestToken;
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

  const _handleStyleChange = async (newStyle: string) => {
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
      // Timeout or network error — the task may have been submitted to RoEx successfully.
      // Check session state to see if a processing task exists.
      try {
        const refreshedSession = await fetchSession();
        const hasBackgroundTask = refreshedSession?.tasks?.some(
          (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced' || t.taskType === 'mix_check')
            && (t.status === 'processing' || t.status === 'pending'),
        );
        if (!hasBackgroundTask) {
          setError('Mix generation request timed out. Please try again.');
          setMixGenerating(false);
        }
      } catch { /* ignore */ }
      // else: mixGenerating stays true, polling will detect completion
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
  const generatingLabel = useMemo(() => {
    if (!mixGenerating || !latestTask) return undefined;
    switch (latestTask.taskType) {
      case 'mix_check': return 'Mix Check processing...';
      case 'final_basic':
      case 'final_advanced': return 'Final mix generating...';
      case 'mastering_preview': return 'Mastering preview generating...';
      case 'mastering': return 'Final master generating...';
      default: return 'Processing...';
    }
  }, [mixGenerating, latestTask]);

  const generatingElapsed = useMemo(() => {
    if (!mixGenerating || elapsedSeconds === 0) return undefined;
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return m > 0
      ? `${m}:${String(s).padStart(2, '0')}`
      : `${s}s`;
  }, [mixGenerating, elapsedSeconds]);

  const generatingEta = useMemo(() => {
    if (!mixGenerating || !latestTask) return undefined;
    const trackCount = session.tracks.length;
    switch (latestTask.taskType) {
      case 'preview': return trackCount > 8 ? '5–20 min' : '2–10 min';
      case 'mix_check': return '3–10 min';
      case 'final_basic':
      case 'final_advanced': return '3–10 min';
      case 'mastering_preview': return '1–5 min';
      case 'mastering': return '1–5 min';
      default: return undefined;
    }
  }, [mixGenerating, latestTask, session.tracks.length]);
  const hasCompletedPreview = session.tasks.some(
    (t) => t.taskType === 'preview' && t.status === 'completed',
  );
  const _hasMixCheck = session.tasks.some(
    (t) => t.taskType === 'mix_check' && (t.finalUrl || t.status === 'completed'),
  );
  const hasMixFinal = session.tasks.some(
    (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
  );
  const hasMasteringFinal = session.tasks.some(
    (t) => t.taskType === 'mastering' && t.finalUrl,
  );
  const _hasMasteringPreview = session.tasks.some(
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

  const allPreviewTasks = session.tasks.filter((t) => t.taskType === 'preview');

  // Navigation guard for stems download
  const handleNavigation = (e: React.MouseEvent, _href: string) => {
    const finalTask = session?.tasks?.find(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.stemsUrls,
    );
    if (finalTask?.stemsUrls && !downloadedItems.has('stems')) {
      const confirmed = window.confirm(
        'ステムファイルがまだダウンロードされていません。このページを離れるとダウンロードできなくなります。続けますか？',
      );
      if (!confirmed) {
        e.preventDefault();
      }
    }
  };

  // ─── Shared Sections (used in both layouts) ─────────────────────────────────

  const uploadSection = session.paymentStatus === 'paid' && session.tracks.length === 0 && !hasFinal && !(isMasteringPhase && !isMasteringOnly) && (
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
          data-testid="dial-file-input"
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
              data-testid="dial-upload-all"
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
            <audio controls src={taskStreamUrl(task.id)} className="w-full" />
          </div>
        )}

        {task.finalUrl && (
          <div className="mt-2">
            {task.taskType === 'mix_check' && (
              <audio controls src={taskStreamUrl(task.id)} className="w-full mb-2" />
            )}
            <a
              href={downloadUrl(task.id)}
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

  const _resultsSection = !hasFinal && session.tasks.length > 0 && (() => {
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
            <div className="flex items-center gap-3">
              <a
                href={downloadUrl(masteringFinalTask.id)}
                download
                onClick={() => markDownloaded('mastered')}
                data-testid="dial-download-mastered"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-base font-semibold transition-colors"
              >
                {downloadedItems.has('mastered') && <span className="text-white">&#10003;</span>}
                {t.dial.session.downloadFinal} (.wav)
              </a>
              <span className="text-xs text-zinc-500">30日間再ダウンロード可能</span>
            </div>
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
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={downloadUrl(mixFinalTask.id)}
                download
                onClick={() => markDownloaded('finalMix')}
                data-testid="dial-download-final-mix"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-colors ${
                  masteringFinalTask
                    ? 'bg-zinc-700 hover:bg-zinc-600 font-medium'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                {downloadedItems.has('finalMix') && <span className="text-white">&#10003;</span>}
                {t.dial.session.downloadFinal} (.wav)
              </a>
              <span className="text-xs text-zinc-500">30日間再ダウンロード可能</span>
            </div>
            {mixFinalTask.stemsUrls && Object.keys(mixFinalTask.stemsUrls).length > 0 && (
              <div className="mt-4 space-y-3">
                <a
                  href={downloadUrl(mixFinalTask.id, 'stems')}
                  download
                  onClick={() => markDownloaded('stems')}
                  data-testid="dial-download-stems"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-base font-medium transition-colors"
                >
                  {downloadedItems.has('stems') && <span className="text-white">&#10003;</span>}
                  {t.dial.session.downloadStems}
                  <span className="text-sm text-zinc-400">
                    {Object.keys(mixFinalTask.stemsUrls).length} {t.dial.session.tracks.toLowerCase()}
                  </span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Unified player — RAW / MIXED / MASTERED tabs */}
        {sessionTakes.length > 0 && (
          <UnifiedSessionPlayer
            key={playerKey}
            takes={sessionTakes}
            sessionId={session.id}
            guestToken={guestToken}
            initialParams={latestParamChanges}
            stemLabelMap={stemLabelMap}
          />
        )}

        {session.mode === 'omakase' && (
          <Link
            href="/dial?mode=dialogue"
            onClick={(e) => handleNavigation(e, '/dial?mode=dialogue')}
            data-testid="dial-dialogue-upsell"
            className="block w-full py-3.5 text-center bg-amber-500 hover:bg-amber-400 rounded-xl text-sm font-semibold text-zinc-950 transition-colors"
          >
            {t.dial.session.dialogueUpsell}
          </Link>
        )}

        <div className="flex gap-3">
          <Link
            href="/dial"
            onClick={(e) => handleNavigation(e, '/dial')}
            data-testid="dial-start-new-session"
            className="flex-1 py-3 text-center bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-colors"
          >
            {t.dial.session.startNewSession}
          </Link>
          {guestToken && !linked ? (
            <a
              href={`/sign-in?redirect_url=/dial/session/${session.id}`}
              onClick={(e) => handleNavigation(e, `/sign-in?redirect_url=/dial/session/${session.id}`)}
              className="flex-1 py-3 text-center bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
            >
              {t.dial.session.saveToAccount}
            </a>
          ) : (
            <Link
              href="/dashboard/dial"
              onClick={(e) => handleNavigation(e, '/dashboard/dial')}
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
                        <audio controls src={taskStreamUrl(task.id)} className="w-full" />
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
    <div className={showChat ? 'h-screen overflow-hidden flex flex-col bg-zinc-950 text-white' : 'min-h-screen bg-zinc-950 text-white'}>
      <div className={showChat ? 'flex-1 min-h-0 flex flex-col px-3 pt-3' : hasFinal ? 'w-full px-3 py-3' : 'mx-auto max-w-3xl px-6 py-12'}>
        {/* Header */}
        <div className={showChat ? 'flex-shrink-0 mb-2' : 'mb-8'}>
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
          <div data-testid="dial-session-error" className="mb-6 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Payment success banner — shown briefly after Stripe redirect */}
        {showPaymentBanner && (
          <div className="mb-4 p-4 bg-green-900/20 border border-green-700/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <span className="text-green-300 text-sm font-medium">支払いが確認されました！Hooがこれから案内するよ。</span>
            </div>
            <button
              onClick={() => setShowPaymentBanner(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none"
              aria-label="閉じる"
            >
              ✕
            </button>
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
            // 2-column layout: Player (left, flex-1) + Chat (right, fixed 440px) — both independently scrollable
            <div className="flex gap-3 flex-1 min-h-0">
              {/* Left: Player — fills remaining width, independently scrollable */}
              <div className="flex-1 min-w-0 overflow-y-auto">
                {/* Unified Player */}
                {sessionTakes.length > 0 ? (
                  <UnifiedSessionPlayer
                    key={playerKey}
                    takes={sessionTakes}
                    sessionId={session.id}
                    guestToken={guestToken}
                    initialParams={latestParamChanges}
                    stemLabelMap={stemLabelMap}
                    compact
                  />
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Now Playing</h3>
                    <div className="text-sm text-zinc-600 py-4 text-center">
                      {analyzing
                        ? 'Analyzing your audio...'
                        : hasTracks
                          ? (isMasteringOnly ? 'Chat with Hoo to start mastering' : 'Generate a preview to hear your mix')
                          : (isMasteringOnly ? 'Upload your 2-mix to get started' : 'Upload stems to get started')}
                    </div>
                  </div>
                )}

                {/* Mastering Phase Banner */}
                {isMasteringPhase && !isMasteringOnly && (
                  <div className="mt-3 p-4 bg-indigo-900/20 border border-indigo-800/40 rounded-xl text-center">
                    <p className="text-sm text-indigo-300 font-medium">Mix complete! Mastering phase</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Mastering
                    </p>
                  </div>
                )}

                {uploadSection}
              </div>

              {/* Right: Chat — fixed 440px, independently scrollable */}
              <div className="w-[440px] shrink-0 flex flex-col overflow-y-auto">
                {/* Processing banner — visible when task is being processed server-side */}
                {isProcessing && latestTask && (() => {
                  const trackCount = session.tracks.length;
                  const elapsedMin = Math.floor(elapsedSeconds / 60);
                  const elapsedSec = elapsedSeconds % 60;
                  const elapsed = elapsedMin > 0
                    ? `${elapsedMin}:${String(elapsedSec).padStart(2, '0')}`
                    : `0:${String(elapsedSec).padStart(2, '0')}`;

                  const { label, estimate } = (() => {
                    switch (latestTask.taskType) {
                      case 'preview':
                        return {
                          label: 'Generating preview...',
                          estimate: trackCount > 8 ? '5\u201320 min' : '2\u201310 min',
                        };
                      case 'mix_check':
                        return { label: 'Generating mix check...', estimate: '3\u201310 min' };
                      case 'final_basic':
                      case 'final_advanced':
                        return { label: 'Generating final mix...', estimate: '3\u201310 min' };
                      case 'mastering_preview':
                        return { label: 'Generating master preview...', estimate: '1\u20135 min' };
                      case 'mastering':
                        return { label: 'Generating mastered track...', estimate: '1\u20135 min' };
                      default:
                        return { label: 'Processing...', estimate: '' };
                    }
                  })();

                  return (
                    <div data-testid="dial-processing-banner" className="mb-2 px-4 py-3 bg-amber-900/20 border border-amber-800/40 rounded-xl flex items-center gap-3">
                      <div className="h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" role="status" />
                      <div className="text-sm flex-1">
                        <span className="text-amber-300 font-medium">{label}</span>
                        {estimate && (
                          <span className="text-zinc-500 ml-2 text-xs">
                            est. {estimate}
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-500 text-xs font-mono tabular-nums">{elapsed}</span>
                    </div>
                  );
                })()}
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
                    generatingLabel={generatingLabel}
                    generatingElapsed={generatingElapsed}
                    generatingEta={generatingEta}
                    phase={phase}
                    mode={session.mode ?? session.masteringMode ?? 'omakase'}
                    previewCount={session.previewCount}
                    previewLimit={isMasteringOnly ? 0 : session.mode === 'omakase' ? 5 : 0}
                    isMasteringPhase={isMasteringPhase}
                  />
                </div>
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
