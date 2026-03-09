'use client';

import { useAnalyzerReceiver } from '@/hooks/use-audio-analyzer';
import { AudioAnalyzer } from '@/components/dial/audio-analyzer';

export default function AnalyzerPopup() {
  const { data, connected } = useAnalyzerReceiver();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-medium text-zinc-400">MUEDial Analyzer</h1>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-zinc-600'}`}
          />
          <span className="text-[10px] text-zinc-500">
            {connected ? 'Connected' : 'Waiting for audio...'}
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
          Play audio in the session to see the analyzer
        </div>
      )}
    </div>
  );
}
