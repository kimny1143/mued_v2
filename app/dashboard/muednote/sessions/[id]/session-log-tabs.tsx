"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Mic, Sliders, Volume2, GitMerge, MessageSquare } from "lucide-react";

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
  };
}

interface SessionLogTabsProps {
  voiceLogs: VoiceLog[];
  dawLogs: DawLog[];
  dawStats: DawStats;
}

type TabType = "voice" | "daw" | "combined";

/**
 * Session Log Tabs - タブ切り替えでログを表示
 *
 * - Voice: 音声ログのみ
 * - DAW: DAWパラメータログのみ
 * - Combined: 時系列で統合表示
 */
export function SessionLogTabs({
  voiceLogs,
  dawLogs,
  dawStats,
}: SessionLogTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    dawLogs.length > 0 ? "combined" : "voice"
  );

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
      default:
        return {
          label: "Param",
          icon: Sliders,
          color: "bg-amber-600/20 text-amber-400",
        };
    }
  };

  // Combined timeline: merge and sort by timestamp
  const combinedLogs = [
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

  const hasDawLogs = dawLogs.length > 0;

  return (
    <div>
      {/* Tab Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("voice")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "voice"
              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
              : "bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent"
          }`}
        >
          <Mic className="w-4 h-4" />
          思考ログ
          <span className="text-xs opacity-70">({voiceLogs.length})</span>
        </button>

        {hasDawLogs && (
          <>
            <button
              onClick={() => setActiveTab("daw")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "daw"
                  ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent"
              }`}
            >
              <Sliders className="w-4 h-4" />
              DAWログ
              <span className="text-xs opacity-70">({dawStats.totalLogs})</span>
            </button>

            <button
              onClick={() => setActiveTab("combined")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "combined"
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent"
              }`}
            >
              <GitMerge className="w-4 h-4" />
              タイムライン
            </button>
          </>
        )}
      </div>

      {/* Voice Logs Tab */}
      {activeTab === "voice" && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            セッション中に記録された独り言・思考の断片
          </p>
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
      )}

      {/* DAW Logs Tab */}
      {activeTab === "daw" && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            DAWで操作したパラメータの変更履歴
          </p>
          {dawLogs.length === 0 ? (
            <GlassCard hover={false}>
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sliders className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-slate-400">DAWログがありません</p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {dawLogs.map((log) => {
                const badge = getActionBadge(log.action);
                const Icon = badge.icon;
                return (
                  <GlassCard key={log.id} hover={false} className="py-3 px-4">
                    <div className="flex gap-3 items-center">
                      <div className="flex-shrink-0 w-14 text-right">
                        <span className="text-sm font-mono text-amber-400">
                          {formatTimestamp(log.relativeTimeSec)}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-400 text-sm">
                          Track {log.trackId}
                          {log.deviceId >= 0 && ` / Device ${log.deviceId}`}
                        </span>
                        <span className="text-white ml-2">
                          {log.valueString}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Combined Timeline Tab */}
      {activeTab === "combined" && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            思考ログとDAW操作を時系列で統合表示
          </p>
          {combinedLogs.length === 0 ? (
            <GlassCard hover={false}>
              <div className="text-center py-8">
                <p className="text-slate-400">ログがありません</p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {combinedLogs.map((log) => {
                if (log.type === "voice") {
                  return (
                    <GlassCard
                      key={`voice-${log.logId}`}
                      hover={false}
                      className="py-3 px-4 border-l-2 border-l-indigo-500"
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-14 text-right">
                          <span className="text-sm font-mono text-indigo-400">
                            {formatTimestamp(log.time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <p className="text-white leading-relaxed">
                            {log.text}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  );
                } else {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  return (
                    <GlassCard
                      key={`daw-${log.logId}`}
                      hover={false}
                      className="py-3 px-4 border-l-2 border-l-amber-500"
                    >
                      <div className="flex gap-3 items-center">
                        <div className="flex-shrink-0 w-14 text-right">
                          <span className="text-sm font-mono text-amber-400">
                            {formatTimestamp(log.time)}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-400 text-sm">
                            Track {log.trackId}
                          </span>
                          <span className="text-white ml-2">
                            {log.valueString}
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
