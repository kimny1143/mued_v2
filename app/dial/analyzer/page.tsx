'use client';

import { useAnalyzerReceiver } from '@/hooks/use-audio-analyzer';
import { AudioAnalyzer } from '@/components/dial/audio-analyzer';
import { useLocale } from '@/lib/i18n/locale-context';

export default function AnalyzerPopup() {
  const { data, connected } = useAnalyzerReceiver();
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-medium text-zinc-400">{t.dial.analyzer.title}</h1>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-zinc-600'}`}
            aria-label={connected ? t.dial.analyzer.connected : t.dial.analyzer.waitingForAudio}
          />
          <span className="text-[10px] text-zinc-500">
            {connected ? t.dial.analyzer.connected : t.dial.analyzer.waitingForAudio}
          </span>
        </div>
      </div>

      {connected && data ? (
        <AudioAnalyzer
          data={data}
          isActive={true}
          onConnect={() => {}}
          compact={false}
        />
      ) : (
        <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
          {t.dial.analyzer.playAudio}
        </div>
      )}
    </div>
  );
}
