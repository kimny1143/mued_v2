'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useLocale } from '@/lib/i18n/locale-context';
import { DashboardLocaleSwitcher } from '@/components/ui/dashboard-locale-switcher';
import Link from 'next/link';
import { ChatPanelV2 } from '@/components/dial/v2/chat';
import { AudioAnalyzerProvider } from '@/hooks/use-audio-analyzer-context';
import { UnifiedSessionPlayerV2 as UnifiedSessionPlayer } from '@/components/dial/v2/unified-session-player-v2';
import { MobileTransport, type TransportSnapshot } from '@/components/dial/v2/mobile-transport';
import type { TakeEntry } from '@/components/dial/unified-session-player';
import { type DeliveryTarget, DELIVERY_TARGETS, DELIVERY_TARGET_LABELS, DELIVERY_TARGET_LUFS, getLufsGapJudgment } from '@/lib/dial/lufs-presets';
import { isDialSessionTrackEditable } from '@/lib/dial/session-edit-lock';
import { buildSessionTakes, taskStreamUrl } from '@/lib/dial/session-takes';
import { getUnusedCompletedPreview, withoutIntermediatePreviews, paramsSignature } from '@/lib/dial/iteration-orchestration';

/** Convert InstrumentGroup enum to short DAW-style label: BASS_GROUP → BASS */
function toShortLabel(group: string): string {
  return group.replace(/_GROUP$/, '').replace(/^(INSTRUMENT_|TRACK_)/, '');
}

const IS_RESEARCH_BETA = process.env.NEXT_PUBLIC_RESEARCH_BETA === 'true';

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
  completedAt: string | null;
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
  const { t, locale } = useLocale();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null);
  const [showPaymentBanner, setShowPaymentBanner] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [fileUploadPercent, setFileUploadPercent] = useState(0);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [replacingTrackId, setReplacingTrackId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Preview state
  const [previewing, setPreviewing] = useState(false);

  // Mix generation state
  const [mixGenerating, setMixGenerating] = useState(false);
  const [mixGeneratingType, setMixGeneratingType] = useState<'preview' | 'mix_check' | 'final' | 'mastering_preview' | 'mastering' | null>(null);

  // ⑤ correctness: dialogue iterations need a FRESH render each time (RoEx caches a 2nd
  // /retrievefinalmix on the same preview task → stale audio). When the latest preview was already
  // rendered, we mint a fresh /preview, wait for it to render (existing poll), then fire /final.
  // pendingRender holds that "fire /final once this fresh preview completes" intent.
  const [pendingRender, setPendingRender] = useState<{ previewTaskId: string; type: 'mix_check' | 'final' } | null>(null);
  // detect-and-regen: per-type param signature of the last render we initiated. Unchanged signature
  // for the SAME render type → return the existing take instead of re-rendering (no wasted
  // minutes/charge). Per-type so a Final after a same-params Mix Check is never blocked (Final is a
  // distinct deliverable). Fail-safe: a miss only falls back to the bounded (baseCycleLimit)
  // re-render, never an extra charge. Reset on error.
  const lastRenderedSigRef = useRef<{ mix_check: string | null; final: string | null }>({ mix_check: null, final: null });

  // LUFS delivery target for mastering
  const [deliveryTarget, setDeliveryTarget] = useState<DeliveryTarget>('spotify');

  // Sidebar player — selected take


  // Take folding — show only latest 3, collapse older
  const [showOlderTakes, setShowOlderTakes] = useState(false);
  // Mobile (lg-) tab: the session screen is a single-column device, so player + chat each take the
  // full screen and switch via a tab bar. Default 'chat' (Hoo dialogue = the primary tool — MUEDial's
  // "director's seat"). On lg+ both panels show side-by-side and this is ignored.
  const [mobileTab, setMobileTab] = useState<'chat' | 'player'>('chat');
  // FF-1 sticky transport: the player writes its live transport here; the sticky <MobileTransport>
  // (below the mobile tab bar) reads it via rAF, so playback control stays reachable on scroll and
  // works from either tab without re-rendering this page.
  const transportRef = useRef<TransportSnapshot | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ id: string; role: string; content: string; createdAt: string }[]>([]);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);

  // Elapsed time tracking for processing tasks
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const processingStartRef = useRef<number | null>(null);

  // Download tracking for completion section
  const [downloadedItems, setDownloadedItems] = useState<Set<string>>(new Set());
  const markDownloaded = (item: string) => {
    setDownloadedItems(prev => new Set(prev).add(item));
  };

  const toggleChatHistory = useCallback(async () => {
    if (showChatHistory) {
      setShowChatHistory(false);
      return;
    }
    setShowChatHistory(true);
    if (chatHistory.length > 0) return;
    setLoadingChatHistory(true);
    try {
      const res = await fetch(`/api/dial/chat?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setChatHistory(data.data.messages ?? []);
    } finally {
      setLoadingChatHistory(false);
    }
  }, [showChatHistory, chatHistory.length, sessionId]);

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

  // Build TakeEntry[] for UnifiedSessionPlayer (RAW → MIXED newest-first → MASTERED).
  // Logic extracted to lib/dial/session-takes for unit-testability; each MIXED take gets its OWN
  // task's stem URLs (taskId-scoped) so "Preview 2" plays Preview 2's stems, not Preview 1's.
  // ⑤: hide intermediate previews. Each dialogue iteration mints a fresh base preview before its
  // mix_check/final; those superseded previews would otherwise clutter the take list. The initial
  // preview stays visible until the first mix_check.
  const sessionTakes = useMemo(
    (): TakeEntry[] =>
      session
        ? buildSessionTakes(
            { ...session, tasks: withoutIntermediatePreviews(session.tasks) },
            guestToken,
          )
        : [],
    [session, guestToken],
  );

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

  // RAW loudness from analysis — used by player to level-match RAW take to -14 LUFS target.
  const rawLoudnessLufs = useMemo(() => {
    const v = session?.analysisResult?.loudnessLufs;
    return typeof v === 'number' ? v : null;
  }, [session?.analysisResult]);

  // Player key — the v2 player now reconciles take add/remove IN PLACE (no remount), so a newly
  // completed take no longer tears down the AudioContext / interrupts playback. We still key on the
  // one-time stem-presence flip (false→true) so the hook rebuilds with real stem keys the first time
  // stems arrive (B2) instead of the { main: url } fallback — that flip happens once, before playback.
  const playerKey = useMemo(() => {
    const hasStems = sessionTakes.some(
      (t) => t.enabled && !!t.stemsUrls && Object.keys(t.stemsUrls).length > 0,
    );
    return `${sessionId}:stems=${hasStems}`;
  }, [sessionTakes, sessionId]);

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
      // For preview tasks, poll the dedicated GET route so its server-side timeout
      // backstop runs. The session-route inline poll (GET /api/dial/session) has no
      // timeout and swallows non-200 errors, so a hung/errored preview — the actual
      // incident type — would otherwise spin forever. This route flips it to 'failed'
      // past the timeout (markDialTaskFailed is idempotent, so the parallel session
      // poll never conflicts).
      const previewTask = processingTasks.find((t) => t.taskType === 'preview');
      if (previewTask) {
        try {
          await fetch(`/api/dial/preview?taskId=${previewTask.id}`, { headers });
        } catch { /* ignore */ }
      }
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

  // Sync mixGenerating state with session task status (handles page reload).
  // pendingRender keeps the progress UI on during the ⑤ fresh-base-preview rebuild phase, before any
  // final/mix_check task exists yet.
  useEffect(() => {
    if (!session?.tasks) return;
    const hasFinalProcessing = session.tasks.some(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced' || t.taskType === 'mix_check')
        && (t.status === 'processing' || t.status === 'pending'),
    );
    setMixGenerating(hasFinalProcessing || pendingRender !== null);
  }, [session, pendingRender]);

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



  // Track elapsed time while processing.
  // Starts immediately when mixGenerating is set (client-side) so the timer
  // runs during the RoEx blocking window before the DB task record exists.
  useEffect(() => {
    const hasProcessing = mixGenerating || session?.tasks?.some(
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
  }, [session, mixGenerating]);

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
    if (!window.confirm(t.dial.session.deleteTrackConfirm)) return;
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

  // Replace a track's audio in place (same trackId/row). Reuses the presign → Worker proxy →
  // confirm{trackId} flow so the file streams around Vercel's 4.5MB body limit. The server
  // rejects this once the session's track set is locked (final started).
  const handleReplaceTrack = async (trackId: string, file: File, instrumentGroup: string) => {
    if (!session) return;
    setError(null);
    setReplacingTrackId(trackId);
    try {
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isSignedIn) {
        const token = await getToken();
        if (token) authHeaders['Authorization'] = `Bearer ${token}`;
      } else if (guestToken) {
        authHeaders['X-Dial-Guest-Token'] = guestToken;
      }

      // 1) Presign
      const presignRes = await fetch('/api/dial/upload/presign', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ fileName: file.name, sessionId: session.id }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) {
        setError(presignData.error || 'Replace failed');
        return;
      }
      const { signedUrl, readableUrl } = presignData.data;

      // 2) PUT the file via the Cloudflare Worker proxy → RoEx GCS
      const proxyUrl = process.env.NEXT_PUBLIC_UPLOAD_PROXY_URL;
      if (!proxyUrl) throw new Error('Upload proxy URL not configured');
      const contentType = file.type || 'audio/wav';
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', proxyUrl, true);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.setRequestHeader('X-Upload-Target', signedUrl);
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload proxy failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      // 3) Confirm with trackId → replace the existing row in place
      const confirmRes = await fetch('/api/dial/upload/confirm', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ sessionId: session.id, trackId, fileName: file.name, readableUrl, instrumentGroup }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmData.success) {
        setError(confirmData.error || 'Replace failed');
        return;
      }

      await fetchSession();
    } catch (err) {
      setError(`Replace error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setReplacingTrackId(null);
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
    setMixGeneratingType('preview');
    setError(null);
    setErrorCode(null);
    setRetryFn(null);

    try {
      const res = await fetch('/api/dial/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: session.id }),
      });

      const data = await res.json();
      if (!data.success) {
        const code = data.code || (res.status >= 500 ? 'INFRA_ERROR' : null);
        setError(data.error || 'Preview request failed');
        setErrorCode(code);
        // PREVIEW_LIMIT: retrying will always fail — suppress retry button
        setRetryFn(code === 'PREVIEW_LIMIT' ? null : () => handlePreview);
        return;
      }


      await fetchSession();
    } catch {
      setError('Preview error');
      setErrorCode('INFRA_ERROR');
      setRetryFn(() => handlePreview);
    } finally {
      setPreviewing(false);
      setMixGeneratingType(null);
    }
  };

  const handleMixGenerate = async (taskId: string, type: 'mix_check' | 'final' = 'final') => {
    setError(null);
    setErrorCode(null);
    setRetryFn(null);
    setMixGenerating(true);
    setMixGeneratingType(type === 'mix_check' ? 'mix_check' : 'final');
    try {
      const res = await fetch('/api/dial/final', {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId, type }),
      });

      const data = await res.json();
      if (!data.success) {
        lastRenderedSigRef.current[type] = null; // failed → allow the same-params retry through detect-and-regen
        setError(data.error || 'Mix generation failed');
        setErrorCode(data.code || (res.status >= 500 ? 'INFRA_ERROR' : null));
        setRetryFn(() => () => handleMixGenerate(taskId, type));
        setMixGenerating(false);
        setMixGeneratingType(null);
        return;
      }

      // If already completed (dev key or fast response), update immediately
      if (data.data?.status === 'completed') {
        await fetchSession();
        setMixGenerating(false);
        setMixGeneratingType(null);
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
          lastRenderedSigRef.current[type] = null; // no task landed → allow the same-params retry
          setError('Mix generation request timed out. Please try again.');
          setErrorCode('INFRA_ERROR');
          setRetryFn(() => () => handleMixGenerate(taskId, type));
          setMixGenerating(false);
          setMixGeneratingType(null);
        }
      } catch { /* ignore */ }
      // else: mixGenerating stays true, polling will detect completion
    }
  };

  // ⑤ correctness — client-orchestrated render. RoEx is task-level idempotent, so a repeat
  // /retrievefinalmix on the SAME preview task returns the cached first render (stale audio). To
  // make every adjustment real: the FIRST render after a preview reuses it (its first apply is
  // fresh); each SUBSEQUENT render mints a fresh /preview, lets the existing poll drive it to ready,
  // then fires /final (see the pendingRender effect). detect-and-regen skips an unchanged re-render.
  const requestRender = useCallback(async (type: 'mix_check' | 'final') => {
    if (!session) return;
    const hasCompletedPreview = session.tasks.some(
      (tk) => tk.taskType === 'preview' && tk.status === 'completed',
    );
    if (!hasCompletedPreview) {
      setError(type === 'mix_check'
        ? 'Preview required before mix check. Please generate a preview first.'
        : 'Preview required before generating final mix. Please generate a preview first.');
      return;
    }

    // detect-and-regen: unchanged Hoo params since the last render OF THIS TYPE → show the existing
    // take instead of spending another multi-minute render + charge.
    const currentSig = paramsSignature(session.messages?.[0]?.parameterChanges ?? null);
    const hasCompletedRenderOfType = session.tasks.some((tk) =>
      tk.status === 'completed' && !!tk.finalUrl && (type === 'mix_check'
        ? tk.taskType === 'mix_check'
        : (tk.taskType === 'final_basic' || tk.taskType === 'final_advanced')),
    );
    if (currentSig !== '' && currentSig === lastRenderedSigRef.current[type] && hasCompletedRenderOfType) {
      setError(t.dial.session.noChangesSinceLastMix);
      setErrorCode('NO_CHANGES');
      setRetryFn(null);
      return;
    }

    // The first render after a preview can reuse it (its first /retrievefinalmix is uncached).
    const usable = getUnusedCompletedPreview(session.tasks);
    if (usable) {
      lastRenderedSigRef.current[type] = currentSig;
      await handleMixGenerate(usable.id, type);
      return;
    }

    // 2nd+ iteration: mint a FRESH base preview, then fire /final once it has rendered.
    lastRenderedSigRef.current[type] = currentSig;
    setError(null);
    setErrorCode(null);
    setRetryFn(null);
    setMixGenerating(true);
    setMixGeneratingType(type);
    try {
      const res = await fetch('/api/dial/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!data.success || !data.data?.taskId) {
        lastRenderedSigRef.current[type] = null;
        setError(data.error || 'Mix generation failed');
        setErrorCode(data.code || (res.status >= 500 ? 'INFRA_ERROR' : null));
        setRetryFn(() => () => requestRender(type));
        setMixGenerating(false);
        setMixGeneratingType(null);
        return;
      }
      setPendingRender({ previewTaskId: data.data.taskId, type });
      await fetchSession();
    } catch {
      lastRenderedSigRef.current[type] = null;
      setError('Mix generation error');
      setErrorCode('INFRA_ERROR');
      setRetryFn(() => () => requestRender(type));
      setMixGenerating(false);
      setMixGeneratingType(null);
    }
  // handleMixGenerate is a stable-enough closure (POSTs by taskId + stable headers); excluded to
  // avoid re-creating requestRender every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, headers, fetchSession, t]);

  // When a pending render's freshly-minted base preview completes, fire /final on it. firedRenderRef
  // de-dupes; pendingRender stays set (progress on) until /final lands a processing task, then clears.
  const firedRenderRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingRender || !session?.tasks) return;
    const pv = session.tasks.find((tk) => tk.id === pendingRender.previewTaskId);
    if (!pv) return;
    if (pv.status === 'completed' && (pv.previewUrl || pv.finalUrl)) {
      if (firedRenderRef.current === pendingRender.previewTaskId) return;
      firedRenderRef.current = pendingRender.previewTaskId;
      const { previewTaskId, type } = pendingRender;
      handleMixGenerate(previewTaskId, type).finally(() => setPendingRender(null));
    } else if (pv.status === 'failed') {
      lastRenderedSigRef.current[pendingRender.type] = null;
      setPendingRender(null);
      setError('Mix render failed while rebuilding the base mix. Please try again.');
      setErrorCode('INFRA_ERROR');
      setMixGenerating(false);
      setMixGeneratingType(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pendingRender]);

  // Chat-driven mix generation (⑤ client-orchestrated — reuses or mints a fresh base preview).
  const handleMixCheckFromChat = () => { void requestRender('mix_check'); };
  const handleFinalFromChat = () => { void requestRender('final'); };

  // Mastering handlers
  const handleMasteringPreview = async (desiredLoudness?: string) => {
    if (!session) return;
    setMixGenerating(true);
    setMixGeneratingType('mastering_preview');
    setError(null);
    setErrorCode(null);
    setRetryFn(null);
    try {
      const res = await fetch('/api/dial/mastering/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: session.id,
          deliveryTarget,
          ...(desiredLoudness && !deliveryTarget ? { desiredLoudness } : {}),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Mastering preview failed');
        setErrorCode(data.code || (res.status >= 500 ? 'INFRA_ERROR' : null));
        setRetryFn(() => () => handleMasteringPreview(desiredLoudness));
        return;
      }
      await fetchSession();
    } catch {
      setError('Mastering preview error');
      setErrorCode('INFRA_ERROR');
      setRetryFn(() => () => handleMasteringPreview(desiredLoudness));
    } finally {
      setMixGenerating(false);
      setMixGeneratingType(null);
    }
  };

  const handleMasteringFinal = async () => {
    if (!session) return;
    setMixGenerating(true);
    setMixGeneratingType('mastering');
    setError(null);
    setErrorCode(null);
    setRetryFn(null);
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
        setErrorCode(data.code || (res.status >= 500 ? 'INFRA_ERROR' : null));
        setRetryFn(() => handleMasteringFinal);
        return;
      }
      await fetchSession();
    } catch {
      setError('Mastering final error');
    } finally {
      setMixGenerating(false);
      setMixGeneratingType(null);
    }
  };

  // Surface a task that FAILED (RoEx failure or processing timeout) as a retryable
  // error, so the spinner doesn't silently vanish or spin forever. Only the latest
  // task is considered, so a superseded older failure isn't resurfaced.
  const notifiedFailedTaskRef = useRef<string | null>(null);
  // Always-latest retry handlers, so the failure effect need not list the (non-memoized)
  // handlers as deps — which would re-run it on every render.
  const retryHandlersRef = useRef({ handlePreview, handleMasteringPreview });
  retryHandlersRef.current = { handlePreview, handleMasteringPreview };
  useEffect(() => {
    const latest = session?.tasks?.[0];
    if (!latest || latest.status !== 'failed') return;
    if (notifiedFailedTaskRef.current === latest.id) return;
    notifiedFailedTaskRef.current = latest.id;

    // Clear any stuck "generating" spinner state.
    setMixGenerating(false);
    setMixGeneratingType(null);
    setPreviewing(false);

    setErrorCode('TASK_FAILED');
    const isFreeRender = latest.taskType === 'preview' || latest.taskType === 'mastering_preview';
    if (isFreeRender) {
      // Free render — safe to re-generate (no charge, no cycle consumed).
      setError(t.dial.session.errorTaskFailedHint);
      const retry = latest.taskType === 'preview'
        ? () => retryHandlersRef.current.handlePreview()
        : () => retryHandlersRef.current.handleMasteringPreview();
      setRetryFn(() => retry);
    } else {
      // Paid render (final / mix_check / mastering): the paid cycle was consumed at
      // submit time, so a blind re-POST would double-charge. Direct to support instead.
      setError(t.dial.session.errorTaskFailedSupport);
      setRetryFn(null);
    }
  }, [session, t]);

  // useMemo hooks must be called unconditionally before any early returns (React hook rules)
  const latestTask = session?.tasks[0];
  const generatingLabel = useMemo(() => {
    if (!mixGenerating) return undefined;
    // ⑤ U3: while we re-render a fresh base mix to apply the new adjustments, say so plainly
    // (otherwise the label would read "preview"/"processing" and surprise the user during the wait).
    if (pendingRender) return t.dial.session.statusRebuildingMix;
    if (!latestTask) return undefined;
    switch (latestTask.taskType) {
      case 'mix_check': return t.dial.session.statusMixCheckProcessing;
      case 'final_basic':
      case 'final_advanced': return t.dial.session.statusFinalMixGenerating;
      case 'mastering_preview': return t.dial.session.statusMasteringPreviewGenerating;
      case 'mastering': return t.dial.session.statusMasteringFinalGenerating;
      default: return t.dial.session.processing;
    }
  }, [mixGenerating, latestTask, t, pendingRender]);

  const generatingElapsed = useMemo(() => {
    if (!mixGenerating || elapsedSeconds === 0) return undefined;
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return m > 0
      ? `${m}:${String(s).padStart(2, '0')}`
      : `${s}s`;
  }, [mixGenerating, elapsedSeconds]);

  const generatingEta = useMemo(() => {
    if (!mixGenerating) return undefined;
    const trackCount = session?.tracks.length ?? 0;
    // ⑤ U3: during the rebuild phase the soft time guidance is folded into statusRebuildingMix (so it
    // reads as an estimate, not a hard cap) — suppress the separate hard ETA chip here.
    if (pendingRender) return undefined;
    if (!latestTask) return undefined;
    switch (latestTask.taskType) {
      case 'preview': return trackCount > 8 ? '5–20 min' : '2–10 min';
      case 'mix_check': return '3–10 min';
      case 'final_basic':
      case 'final_advanced': return '3–10 min';
      case 'mastering_preview': return '1–5 min';
      case 'mastering': return '1–5 min';
      default: return undefined;
    }
  }, [mixGenerating, latestTask, session?.tracks.length, pendingRender]);

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
          <p className="text-zinc-400">{error || t.dial.session.sessionExpiredFallback}</p>
        </div>
      </div>
    );
  }

  const hasTracks = session.tracks.length > 0;
  const isProcessing = latestTask?.status === 'processing' || latestTask?.status === 'pending';
  const _hasCompletedPreview = session.tasks.some(
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

  const _allPreviewTasks = session.tasks.filter((t) => t.taskType === 'preview');

  // Navigation guard for stems download
  const handleNavigation = (e: React.MouseEvent, _href: string) => {
    const finalTask = session?.tasks?.find(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.stemsUrls,
    );
    if (finalTask?.stemsUrls && !downloadedItems.has('stems')) {
      const confirmed = window.confirm(
        t.dial.session.stemDownloadGuard,
      );
      if (!confirmed) {
        e.preventDefault();
      }
    }
  };

  // ─── Shared Sections (used in both layouts) ─────────────────────────────────

  const editable = isDialSessionTrackEditable(session.status);
  // Tracks may be added / replaced / deleted only while the session is editable (pre-final) and
  // paid. Mirrors the server-side lock (lib/dial/session-edit-lock); the API enforces it regardless
  // of what the UI shows, so a direct API call can't mutate a paid deliverable.
  const canEditTracks = session.paymentStatus === 'paid' && editable && !hasFinal && !(isMasteringPhase && !isMasteringOnly);

  const uploadSection = canEditTracks && (isMasteringOnly ? session.tracks.length === 0 : true) && (
    <div>
      <h2 className="text-lg font-medium mb-4">{isMasteringOnly ? t.dial.session.upload2mix : t.dial.session.uploadStems}</h2>

      <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer text-sm transition-colors">
        {t.dial.session.addFiles}
        <input
          type="file"
          accept=".wav,.flac,.aiff,.mp3,.m4a"
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
                <th className="px-4 py-2 font-medium">{t.dial.session.fileTableHeader}</th>
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
              {stagedFiles.length === 1 ? t.dial.session.filesReadyOne : t.dial.session.filesReadyMany.replace('{count}', String(stagedFiles.length))}
            </span>
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              data-testid="dial-upload-all"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
            >
              {uploading && uploadProgress
                ? `${t.dial.session.uploading} ${uploadProgress.current}/${uploadProgress.total} (${fileUploadPercent}%)`
                : t.dial.session.uploadAllButton.replace('{count}', String(stagedFiles.length))}
            </button>
          </div>
        </div>
      )}
    </div>
  );


  // ─── Track Manager (add / replace / delete uploaded tracks) ─────────────────
  // Lets the user self-correct their stems while the session is still editable. Hidden once the
  // track set is locked; the server (lib/dial/session-edit-lock) is the source of truth.
  const trackManagerSection = canEditTracks && session.tracks.length > 0 && (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-zinc-400 mb-2">{t.dial.session.manageTracks}</h3>
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {session.tracks.map((track, idx) => {
              const isReplacing = replacingTrackId === track.id;
              const busy = isReplacing || uploading;
              return (
                <tr key={track.id} className="border-t border-zinc-800/50 first:border-t-0">
                  <td className="px-4 py-2 text-white truncate max-w-[240px]">
                    {toDisplayName(track, idx)}
                    {!isMasteringOnly && track.instrumentGroup && (
                      <span className="ml-2 text-xs text-zinc-500">{track.instrumentGroup}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <label
                      className={`inline-flex items-center gap-1 px-2 py-1 mr-1 rounded text-xs transition-colors ${
                        busy ? 'opacity-50 pointer-events-none' : 'text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer'
                      }`}
                    >
                      {isReplacing ? t.dial.session.replacing : t.dial.session.replace}
                      <input
                        type="file"
                        accept=".wav,.flac,.aiff,.mp3,.m4a"
                        className="hidden"
                        disabled={busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) handleReplaceTrack(track.id, f, track.instrumentGroup);
                        }}
                        aria-label={`${t.dial.session.replace} ${track.originalFilename}`}
                      />
                    </label>
                    <button
                      onClick={() => handleDeleteTrack(track.id)}
                      disabled={busy}
                      className="px-2 py-1 rounded text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                      title={t.dial.session.delete}
                      aria-label={`${t.dial.session.delete} ${track.originalFilename}`}
                    >
                      {t.dial.session.delete}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
                  ? t.dial.session.mixCheckLabel
                  : task.taskType === 'mastering_preview'
                    ? t.dial.session.masterPreviewLabel
                    : task.taskType === 'mastering'
                      ? t.dial.session.masterFinalLabel
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
            <audio controls src={taskStreamUrl(task.id, guestToken)} className="w-full" />
          </div>
        )}

        {task.finalUrl && (
          <div className="mt-2">
            {task.taskType === 'mix_check' && (
              <audio controls src={taskStreamUrl(task.id, guestToken)} className="w-full mb-2" />
            )}
            <a
              href={downloadUrl(task.id)}
              download
              className="inline-block px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
            >
              {task.taskType === 'mix_check'
                ? t.dial.session.downloadMixCheckWav
                : task.taskType === 'mastering'
                  ? t.dial.session.downloadMasteredTrackWav
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
        <h2 className="text-lg font-medium mb-3">{t.dial.session.mixResultsTitle}</h2>
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
              <span className="text-sm font-medium text-zinc-400">{t.dial.session.masteredTrack}</span>
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
                {t.dial.session.downloadMaster} (.wav)
              </a>
              <span className="text-xs text-zinc-500">{t.dial.session.formatMaster}</span>
              <span className="text-xs text-zinc-500">30日間再ダウンロード可能</span>
            </div>
          </div>
        )}

        {/* Mix final */}
        {mixFinalTask && (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-400">
                {t.dial.session.finalMixLabel}
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
              <span className="text-xs text-zinc-500">{t.dial.session.formatFinal}</span>
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

        {/* Conversation log download + read-only history */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-400">{t.dial.session.conversationHistory}</span>
            <div className="flex items-center gap-2">
              <a
                href={`/api/dial/session/chat-export?sessionId=${session.id}`}
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
              >
                ↓ {t.dial.session.downloadChatLog}
              </a>
              <button
                onClick={toggleChatHistory}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                {showChatHistory ? t.dial.session.hideConversation : t.dial.session.showConversation}
              </button>
            </div>
          </div>
          {showChatHistory && (
            <div className="mt-2 max-h-96 overflow-y-auto space-y-3 border-t border-zinc-800 pt-3">
              {loadingChatHistory ? (
                <div className="text-center text-zinc-500 text-sm py-4">Loading...</div>
              ) : chatHistory.filter((m) => m.role === 'user' || m.role === 'assistant').map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/80 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unified player — RAW / MIXED / MASTERED tabs */}
        {sessionTakes.length > 0 && (
          <UnifiedSessionPlayer
            key={playerKey}
            takes={sessionTakes}
            sessionId={session.id}
            guestToken={guestToken}
            initialParams={latestParamChanges}
            stemLabelMap={stemLabelMap}
            rawLoudnessLufs={rawLoudnessLufs}
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

        {/* Hoo Pass CTA — shown after session completes */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
          <p className="text-amber-400 text-xs font-medium mb-2">{t.dial.session.hooPassCtaLabel}</p>
          <Link
            href={IS_RESEARCH_BETA ? '/dial/waitlist' : '/dial/pricing'}
            onClick={(e) => handleNavigation(e, IS_RESEARCH_BETA ? '/dial/waitlist' : '/dial/pricing')}
            data-testid="dial-hoo-pass-cta"
            className="inline-block px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {IS_RESEARCH_BETA ? t.dial.session.hooPassCtaBeta : t.dial.session.hooPassCtaLive}
          </Link>
        </div>

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
              href="/dashboard"
              onClick={(e) => handleNavigation(e, '/dashboard')}
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
                        <audio controls src={taskStreamUrl(task.id, guestToken)} className="w-full" />
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
    <div className={showChat ? 'h-[100dvh] overflow-hidden flex flex-col bg-zinc-950 text-white' : 'min-h-screen bg-zinc-950 text-white'}>
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
              <DashboardLocaleSwitcher />
            </div>
          </div>
        </div>

        {error && (
          <div data-testid="dial-session-error" className={`mb-6 p-4 border rounded-lg text-sm ${
            errorCode === 'NO_CHANGES'
              ? 'bg-zinc-800/40 border-zinc-700 text-zinc-300' // benign info, not a failure
              : 'bg-red-900/30 border-red-800 text-red-300'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                {errorCode === 'INFRA_ERROR' && (
                  <p className="font-medium mb-1">{t.dial.session.errorInfra}</p>
                )}
                {errorCode === 'PREVIEW_LIMIT' && (
                  <p className="font-medium mb-1">{t.dial.session.errorPreviewLimit}</p>
                )}
                {errorCode === 'TASK_FAILED' && (
                  <p className="font-medium mb-1">{t.dial.session.errorTaskFailed}</p>
                )}
                {/* INFRA_ERROR carries the localized errorInfra heading + hint below; the raw
                    `error` body is non-actionable noise (and may be upstream copy), so hide it. */}
                {errorCode !== 'INFRA_ERROR' && <p>{error}</p>}
                {errorCode === 'INFRA_ERROR' && (
                  <p className="text-xs text-red-400/70 mt-1">{t.dial.session.errorInfraHint}</p>
                )}
              </div>
              {retryFn && errorCode !== 'NO_CHANGES' && (
                <button
                  onClick={() => { setError(null); setErrorCode(null); retryFn(); }}
                  className="shrink-0 px-3 py-1.5 bg-red-800/60 hover:bg-red-700/60 rounded-lg text-xs font-medium transition-colors"
                >
                  {t.dial.session.retryButton}
                </button>
              )}
            </div>
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
              aria-label={t.dial.session.close}
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
            // Mobile (lg-): a tab bar switches between full-screen Chat (default, primary) and Player.
            // Desktop (lg+): tab bar hidden, both panels side-by-side (Player flex-1 + Chat 440px) — no regression.
            <>
              {/* Mobile tab bar — Chat (primary) / Player */}
              <div className="lg:hidden shrink-0 flex gap-1.5 mb-2" role="tablist" aria-label={locale === 'en' ? 'Session view' : 'セッション表示'}>
                {([
                  { key: 'chat' as const, label: locale === 'en' ? 'Chat' : '対話' },
                  { key: 'player' as const, label: locale === 'en' ? 'Player' : 'プレイヤー' },
                ]).map((tab) => {
                  const active = mobileTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setMobileTab(tab.key)}
                      className="flex-1 min-h-[44px] rounded-[var(--radius-md)] text-sm font-medium border transition-colors"
                      style={active
                        ? { background: 'var(--amber-glow)', color: 'var(--amber)', borderColor: 'var(--amber-dim)' }
                        : { background: 'var(--ink-2)', color: 'var(--fg-2)', borderColor: 'var(--line)' }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {/* FF-1: sticky play/scrub bar below the tab bar (mobile only) — stays reachable on
                  scroll and works from either tab (the player stays mounted-but-hidden on Chat). */}
              <MobileTransport transportRef={transportRef} />
              {/* 2-column layout: Player (left, flex-1) + Chat (right, fixed 440px) — both independently scrollable */}
              <div className="flex gap-3 flex-1 min-h-0">
                {/* Left: Player — full screen on mobile (Player tab), flex-1 on desktop */}
                <div className={`${mobileTab === 'player' ? 'block' : 'hidden'} lg:block flex-1 min-w-0 overflow-y-auto chat-scroll`}>
                {/* Unified Player */}
                {sessionTakes.length > 0 ? (
                  <UnifiedSessionPlayer
                    key={playerKey}
                    takes={sessionTakes}
                    sessionId={session.id}
                    guestToken={guestToken}
                    initialParams={latestParamChanges}
                    stemLabelMap={stemLabelMap}
                    rawLoudnessLufs={rawLoudnessLufs}
                    transportRef={transportRef}
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
                  <div className="mt-3 p-4 bg-indigo-900/20 border border-indigo-800/40 rounded-xl">
                    <p className="text-sm text-indigo-300 font-medium text-center">Mix complete! Mastering phase</p>
                    <div className="mt-3">
                      <label className="block text-xs text-zinc-400 mb-1">配信先 / Delivery target</label>
                      <select
                        value={deliveryTarget}
                        onChange={(e) => setDeliveryTarget(e.target.value as DeliveryTarget)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                      >
                        {DELIVERY_TARGETS.map((t) => (
                          <option key={t} value={t}>{DELIVERY_TARGET_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                    {rawLoudnessLufs !== null && (() => {
                      const j = getLufsGapJudgment(rawLoudnessLufs, DELIVERY_TARGET_LUFS[deliveryTarget]);
                      return (
                        <div className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                          j.status === 'ok' ? 'bg-green-900/30 text-green-300' : 'bg-amber-900/30 text-amber-300'
                        }`}>
                          <span>{j.status === 'ok' ? '✅' : '⚠️'}</span>
                          <span>{j.message}</span>
                          {'gapDb' in j && (
                            <span className="ml-auto font-mono">{j.status === 'boost' ? `-${j.gapDb.toFixed(1)}` : `+${j.gapDb.toFixed(1)}`} dB</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Mastering-only delivery target selector */}
                {isMasteringOnly && !hasMasteringFinal && session.tracks.length > 0 && (
                  <div className="mt-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                    <label className="block text-xs text-zinc-400 mb-1">配信先 / Delivery target</label>
                    <select
                      value={deliveryTarget}
                      onChange={(e) => setDeliveryTarget(e.target.value as DeliveryTarget)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                    >
                      {DELIVERY_TARGETS.map((t) => (
                        <option key={t} value={t}>{DELIVERY_TARGET_LABELS[t]}</option>
                      ))}
                    </select>
                    {rawLoudnessLufs !== null && (() => {
                      const j = getLufsGapJudgment(rawLoudnessLufs, DELIVERY_TARGET_LUFS[deliveryTarget]);
                      return (
                        <div className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                          j.status === 'ok' ? 'bg-green-900/30 text-green-300' : 'bg-amber-900/30 text-amber-300'
                        }`}>
                          <span>{j.status === 'ok' ? '✅' : '⚠️'}</span>
                          <span>{j.message}</span>
                          {'gapDb' in j && (
                            <span className="ml-auto font-mono">{j.status === 'boost' ? `-${j.gapDb.toFixed(1)}` : `+${j.gapDb.toFixed(1)}`} dB</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {uploadSection}
                {trackManagerSection}
              </div>

                {/* Right: Chat — full screen on mobile (Chat tab, default), fixed 440px on desktop */}
                <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[440px] shrink-0 flex-col overflow-y-auto chat-scroll`}>
                {/* Processing banner — visible during client-side API call (mixGenerating/previewing) or DB-driven processing */}
                {(mixGenerating || previewing || isProcessing) && (() => {
                  const trackCount = session.tracks.length;
                  const elapsedMin = Math.floor(elapsedSeconds / 60);
                  const elapsedSec = elapsedSeconds % 60;
                  const elapsed = elapsedMin > 0
                    ? `${elapsedMin}:${String(elapsedSec).padStart(2, '0')}`
                    : `0:${String(elapsedSec).padStart(2, '0')}`;

                  // Determine label + estimate. Use mixGeneratingType when available (most accurate),
                  // fall back to latestTask.taskType for DB-driven polling state.
                  const activeType = mixGeneratingType ?? (isProcessing ? latestTask?.taskType : null);
                  const { label, estimate } = (() => {
                    switch (activeType) {
                      case 'preview':
                        return {
                          label: t.dial.session.processing,
                          estimate: trackCount > 8 ? '5\u201320 min' : '2\u201310 min',
                        };
                      case 'mix_check':
                        return { label: t.dial.session.statusMixCheckProcessing, estimate: '3\u201310 min' };
                      case 'final':
                      case 'final_basic':
                      case 'final_advanced':
                        return { label: t.dial.session.statusFinalMixGenerating, estimate: '3\u201310 min' };
                      case 'mastering_preview':
                        return { label: t.dial.session.statusMasteringPreviewGenerating, estimate: '1\u20135 min' };
                      case 'mastering':
                        return { label: t.dial.session.statusMasteringFinalGenerating, estimate: '1\u20135 min' };
                      default:
                        return { label: t.dial.session.processing, estimate: '' };
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
                  <ChatPanelV2
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
            </>
          ) : null
        )}

        {/* Completed state */}
        {completedSection}
      </div>
    </div>
  );
}
