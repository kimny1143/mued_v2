"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  Mic,
  Sliders,
  Volume2,
  GitMerge,
  MessageSquare,
} from "lucide-react";

interface VoiceLog {
  id: string;
  timestampSec: number;
  text: string;
  confidence: number | null;
}

interface DawLog {
  id: string;
  relativeTimeSec: number;
  action: string;
  trackId: number;
  deviceId: number;
  paramId: number;
  valueString: string;
}

interface DawStats {
  totalLogs: number;
  byAction: {
    parameter_change: number;
    track_volume: number;
    track_pan: number;
    track_select: number;
    clip_trigger: number;
    device_config_change: number;
  };
  oscCount: number;
}

interface SessionLogTabsProps {
  voiceLogs: VoiceLog[];
  dawLogs: DawLog[];
  dawStats: DawStats;
}

type TimelineEntry =
  | { type: "voice"; logId: string; time: number; text: string; confidence: number | null }
  | {
      type: "daw";
      logId: string;
      time: number;
      action: string;
      trackId: number;
      deviceId: number;
      paramId: number;
      valueString: string;
    };

/**
 * Session Log Tabs - 2列タイムライン同期表示
 *
 * Desktop: 左=Voice, 右=DAW, 中央タイムラインで時間同期
 * Mobile: 1列統合タイムライン（左ボーダー色分け）
 * DAWログなし: Voiceのみ表示
 */
export function SessionLogTabs({
  voiceLogs,
  dawLogs,
  dawStats,
}: SessionLogTabsProps) {
  const hasDawLogs = dawLogs.length > 0;

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "track_volume":
        return {
          label: "Volume",
          icon: Volume2,
          color: "bg-blue-600/20 text-blue-400",
        };
      case "track_pan":
        return {
          label: "Pan",
          icon: GitMerge,
          color: "bg-purple-600/20 text-purple-400",
        };
      case "parameter_change":
      case "device_config_change":
        return {
          label: "Param",
          icon: Sliders,
          color: "bg-amber-600/20 text-amber-400",
        };
      default:
        return {
          label: "Param",
          icon: Sliders,
          color: "bg-amber-600/20 text-amber-400",
        };
    }
  };

  // Voice-only layout (no DAW logs)
  if (!hasDawLogs) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Mic className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-slate-400">
            思考ログ
          </span>
          <span className="text-xs text-slate-500">
            ({voiceLogs.length})
          </span>
        </div>
        {voiceLogs.length === 0 ? (
          <GlassCard hover={false}>
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-slate-400">音声ログがありません</p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {voiceLogs.map((log) => (
              <GlassCard key={log.id} hover={false} className="py-3 px-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-14 text-right">
                    <span className="text-sm font-mono text-indigo-400">
                      {formatTimestamp(log.timestampSec)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white leading-relaxed">{log.text}</p>
                    {log.confidence !== null && log.confidence < 0.7 && (
                      <span className="text-xs text-amber-500 mt-1 inline-block">
                        低信頼度
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Merge and sort timeline entries
  const timeline: TimelineEntry[] = [
    ...voiceLogs.map((log) => ({
      type: "voice" as const,
      logId: log.id,
      time: log.timestampSec,
      text: log.text,
      confidence: log.confidence,
    })),
    ...dawLogs.map((log) => ({
      type: "daw" as const,
      logId: log.id,
      time: log.relativeTimeSec,
      action: log.action,
      trackId: log.trackId,
      deviceId: log.deviceId,
      paramId: log.paramId,
      valueString: log.valueString,
    })),
  ].sort((a, b) => a.time - b.time);

  return (
    <div>
      {/* Column Headers - Desktop */}
      <div className="hidden md:grid md:grid-cols-[1fr_40px_1fr] gap-0 mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-indigo-400">思考ログ</span>
          <span className="text-xs text-slate-500">({voiceLogs.length})</span>
        </div>
        <div />
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">DAWログ</span>
          <span className="text-xs text-slate-500">({dawStats.oscCount})</span>
        </div>
      </div>

      {/* Column Headers - Mobile */}
      <div className="flex md:hidden items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-slate-400">{voiceLogs.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-400">{dawStats.oscCount}</span>
        </div>
      </div>

      {/* Two-column Timeline - Desktop */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Central timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />

          <div className="space-y-2">
            {timeline.map((entry) => {
              if (entry.type === "voice") {
                return (
                  <div
                    key={`voice-${entry.logId}`}
                    className="grid grid-cols-[1fr_40px_1fr] gap-0 items-start"
                  >
                    {/* Left column: Voice */}
                    <div className="pr-3">
                      <div className="bg-white/5 border border-white/10 rounded-xl py-3 px-4">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <span className="text-sm font-mono text-indigo-400">
                              {formatTimestamp(entry.time)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm leading-relaxed">
                              {entry.text}
                            </p>
                            {entry.confidence !== null &&
                              entry.confidence < 0.7 && (
                                <span className="text-xs text-amber-500 mt-1 inline-block">
                                  低信頼度
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center: Timeline dot */}
                    <div className="flex justify-center pt-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-slate-900 z-10" />
                    </div>

                    {/* Right column: empty */}
                    <div />
                  </div>
                );
              } else {
                const badge = getActionBadge(entry.action);
                const Icon = badge.icon;

                return (
                  <div
                    key={`daw-${entry.logId}`}
                    className="grid grid-cols-[1fr_40px_1fr] gap-0 items-start"
                  >
                    {/* Left column: empty */}
                    <div />

                    {/* Center: Timeline dot */}
                    <div className="flex justify-center pt-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-slate-900 z-10" />
                    </div>

                    {/* Right column: DAW */}
                    <div className="pl-3">
                      <div className="bg-white/5 border border-white/10 rounded-xl py-3 px-4">
                        <div className="flex gap-2 items-start">
                          <div className="flex-shrink-0">
                            <span className="text-sm font-mono text-amber-400">
                              {formatTimestamp(entry.time)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${badge.color}`}
                              >
                                <Icon className="w-3 h-3" />
                                {badge.label}
                              </div>
                              <span className="text-slate-500 text-xs">
                                Track {entry.trackId}
                                {entry.deviceId >= 0 &&
                                  ` / Dev ${entry.deviceId}`}
                              </span>
                            </div>
                            <p className="text-white text-sm">
                              {entry.valueString}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Single-column Timeline - Mobile */}
      <div className="md:hidden space-y-2">
        {timeline.map((entry) => {
          if (entry.type === "voice") {
            return (
              <GlassCard
                key={`m-voice-${entry.logId}`}
                hover={false}
                className="py-3 px-4 border-l-2 border-l-indigo-500"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-12 text-right">
                    <span className="text-xs font-mono text-indigo-400">
                      {formatTimestamp(entry.time)}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Mic className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-white text-sm leading-relaxed">
                      {entry.text}
                    </p>
                  </div>
                </div>
              </GlassCard>
            );
          } else {
            const badge = getActionBadge(entry.action);
            const Icon = badge.icon;

            return (
              <GlassCard
                key={`m-daw-${entry.logId}`}
                hover={false}
                className="py-3 px-4 border-l-2 border-l-amber-500"
              >
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-12 text-right">
                    <span className="text-xs font-mono text-amber-400">
                      {formatTimestamp(entry.time)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${badge.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </div>
                      <span className="text-slate-500 text-xs">
                        T{entry.trackId}
                      </span>
                    </div>
                    <p className="text-white text-sm">{entry.valueString}</p>
                  </div>
                </div>
              </GlassCard>
            );
          }
        })}
      </div>
    </div>
  );
}
