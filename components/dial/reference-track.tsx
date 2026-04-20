'use client';

import { useState, useRef, useCallback } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';

interface ReferenceAnalysis {
  loudnessLufs: number;
  peakDbfs: number;
  stereoField: string;
  tonalProfile: Record<string, string>;
}

interface ReferenceTrackProps {
  sessionId: string;
  referenceFilename: string | null;
  referenceAnalysis: ReferenceAnalysis | null;
  headers: Record<string, string>;
  onUpdate: () => void;
}

type Status = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

export function ReferenceTrack({
  sessionId,
  referenceFilename,
  referenceAnalysis,
  headers,
  onUpdate,
}: ReferenceTrackProps) {
  const { t } = useLocale();
  const [status, setStatus] = useState<Status>(referenceFilename ? 'done' : 'idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setErrorMsg(null);
    setStatus('uploading');
    setUploadPercent(0);

    try {
      // 1. Get presigned URL
      const presignRes = await fetch('/api/dial/reference/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fileName: file.name, sessionId }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error(presignData.error || 'Presign failed');

      const { signedUrl, readableUrl } = presignData.data;

      // 2. Upload via proxy (same pattern as stem upload)
      const proxyUrl = process.env.NEXT_PUBLIC_UPLOAD_PROXY_URL;
      if (!proxyUrl) throw new Error('Upload proxy URL not configured');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', proxyUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'audio/wav');
        xhr.setRequestHeader('X-Upload-Target', signedUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadPercent(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.send(file);
      });

      // 3. Confirm + analyze
      setStatus('analyzing');
      const confirmRes = await fetch('/api/dial/reference/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, readableUrl, fileName: file.name }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmData.success) throw new Error(confirmData.error || 'Analysis failed');

      setStatus('done');
      onUpdate();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t.dial.session.uploadFailedError);
    }
  }, [sessionId, headers, onUpdate]);

  const handleRemove = useCallback(async () => {
    // Clear reference track by setting fields to null via session PATCH
    // For PoC, we'll just remove from client state and let user re-upload
    // A proper delete endpoint could be added later
    setStatus('idle');
    setErrorMsg(null);
  }, []);

  const formatStereoField = (field: string): string => {
    const map: Record<string, string> = {
      STEREO: 'Stereo',
      STEREO_UPMIX: 'Wide stereo',
      MONO: 'Mono',
      MID_SIDE: 'Mid/Side',
    };
    return map[field] ?? (field || 'n/a');
  };

  // Tonal profile mini-bar visualization
  const TONAL_LEVEL_MAP: Record<string, number> = { LOW: 0.25, MEDIUM: 0.55, HIGH: 0.85, VERY_HIGH: 1 };
  const renderTonalBars = (profile: Record<string, string>) => {
    const bands = Object.entries(profile);
    if (bands.length === 0) return null;
    return (
      <div className="flex items-end gap-0.5 h-3">
        {bands.map(([band, level]) => (
          <div
            key={band}
            className="w-1.5 bg-amber-500/60 rounded-sm"
            style={{ height: `${(TONAL_LEVEL_MAP[level] ?? 0.5) * 100}%` }}
            title={`${band}: ${level}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
        Reference Track
      </h3>

      {status === 'idle' && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-3 py-2.5 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 text-sm text-zinc-400 hover:text-zinc-300 transition-colors text-center"
          >
            + Add reference track (optional)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </>
      )}

      {status === 'uploading' && (
        <div className="px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1.5">Uploading... {uploadPercent}%</div>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
        </div>
      )}

      {status === 'analyzing' && (
        <div className="px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
          <div className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Analyzing...</span>
        </div>
      )}

      {status === 'done' && (referenceFilename || referenceAnalysis) && (
        <div className="px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-sm text-white font-medium truncate">
              <span className="text-amber-500">♪</span>
              <span className="truncate" title={referenceFilename ?? undefined}>
                {referenceFilename ?? 'Reference'}
              </span>
            </div>
            <button
              onClick={handleRemove}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 ml-2"
              title="Remove reference"
            >
              ✕
            </button>
          </div>
          {referenceAnalysis && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
              <span>{Math.round(referenceAnalysis.loudnessLufs * 10) / 10} LUFS</span>
              <span>|</span>
              <span>{formatStereoField(referenceAnalysis.stereoField)}</span>
              <span>|</span>
              {renderTonalBars(referenceAnalysis.tonalProfile)}
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="px-3 py-2.5 rounded-lg bg-red-950/20 border border-red-800/30">
          <div className="text-sm text-red-400 mb-1">{errorMsg || t.dial.session.uploadFailedError}</div>
          <button
            onClick={() => { setStatus('idle'); setErrorMsg(null); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
