"use client";

import {
  Brain,
  MessageCircle,
  Clock,
  ArrowRight,
  User,
  Pencil,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";

// ========================================
// Types
// ========================================

interface CognitiveScores {
  wm: number;
  ps: number;
  vc: number;
  pr: number;
  att: number;
  measuredAt: string | null;
}

interface TimeDisplay {
  value: number;
  unit: string;
  sub: string | null;
}

interface ProfileData {
  cognitiveScores: CognitiveScores | null;
  hooStats: {
    totalConversations: number;
    totalMessages: number;
  };
  recentConversations: {
    id: string;
    title: string | null;
    messageCount: number;
    updatedAt: string | null;
  }[];
  customInstructions: string | null;
  timerStats: {
    sessionCount: number;
    todayTime: TimeDisplay;
    weekTime: TimeDisplay;
    monthTime: TimeDisplay;
  };
  recentSessions: {
    id: string;
    sessionMemo: string | null;
    durationSec: number;
    createdAt: string | null;
  }[];
}

interface MuednoteDashboardContentProps {
  userName: string;
  profile: ProfileData;
}

// ========================================
// Radar Chart (SVG)
// ========================================

function CognitiveRadar({ scores }: { scores: CognitiveScores }) {
  const dimensions = [
    { key: "wm", label: "WM", value: scores.wm },
    { key: "ps", label: "PS", value: scores.ps },
    { key: "vc", label: "VC", value: scores.vc },
    { key: "pr", label: "PR", value: scores.pr },
    { key: "att", label: "ATT", value: scores.att },
  ];

  const cx = 80;
  const cy = 80;
  const r = 55;
  const n = dimensions.length;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  };

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [25, 50, 75, 100];

  // Data polygon
  const dataPoints = dimensions.map((d, i) => getPoint(i, d.value));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[200px]">
      {/* Grid */}
      {rings.map((pct) => {
        const pts = dimensions.map((_, i) => getPoint(i, pct));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        return <path key={pct} d={path} fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={0.5} />;
      })}

      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="white" strokeOpacity={0.06} strokeWidth={0.5} />;
      })}

      {/* Data fill */}
      <path d={dataPath} fill="rgb(99 102 241)" fillOpacity={0.15} stroke="rgb(99 102 241)" strokeWidth={1.5} />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="rgb(129 140 248)" />
      ))}

      {/* Labels */}
      {dimensions.map((d, i) => {
        const p = getPoint(i, 120);
        return (
          <text key={d.key} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-[9px] font-mono">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ========================================
// Main Component
// ========================================

export function MuednoteDashboardContent({
  userName,
  profile,
}: MuednoteDashboardContentProps) {
  const { locale } = useLocale();

  const { cognitiveScores, hooStats, recentConversations, customInstructions, timerStats, recentSessions } = profile;

  const hasProfile = cognitiveScores || hooStats.totalConversations > 0 || customInstructions;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-indigo-400/80 text-sm mb-1">
          {locale === "ja" ? `${userName}さん` : `Hey, ${userName}`}
        </p>
        <h1 className="text-2xl font-bold text-white">
          {locale === "ja" ? "Hooから見たあなた" : "How Hoo Sees You"}
        </h1>
      </div>

      {/* ========================================
          Main: Profile Card
          ======================================== */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        {!hasProfile ? (
          /* Empty state */
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              {locale === "ja"
                ? "Hooはまだあなたを知りません"
                : "Hoo doesn't know you yet"}
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              {locale === "ja"
                ? "MUEDlobeのゲームをプレイするか、Hooと会話を始めると、あなたのプロファイルが作られます。"
                : "Play MUEDlobe games or start chatting with Hoo to build your profile."}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/lobe"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Brain className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                MUEDlobe
              </Link>
              <Link
                href="/dashboard/muednote/hoo"
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                {locale === "ja" ? "Hooと話す" : "Talk to Hoo"}
              </Link>
            </div>
          </div>
        ) : (
          /* Profile content */
          <div className="grid lg:grid-cols-[1fr,200px] gap-6">
            {/* Left: Text profile */}
            <div className="space-y-5">
              {/* Custom Instructions (what Hoo knows) */}
              {customInstructions && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xs uppercase tracking-wider text-slate-500">
                      {locale === "ja" ? "Hooへのメモ" : "Notes for Hoo"}
                    </h3>
                    <Link href="/dashboard/settings" className="text-slate-600 hover:text-slate-400 transition-colors">
                      <Pencil className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                    {customInstructions}
                  </p>
                </div>
              )}

              {/* Hoo Conversation Stats */}
              {hooStats.totalConversations > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                    {locale === "ja" ? "Hooとの対話" : "Conversations with Hoo"}
                  </h3>
                  <div className="flex items-baseline gap-4">
                    <div>
                      <span className="text-2xl font-bold text-white">{hooStats.totalConversations}</span>
                      <span className="text-sm text-slate-500 ml-1">
                        {locale === "ja" ? "回" : "chats"}
                      </span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-white">{hooStats.totalMessages}</span>
                      <span className="text-sm text-slate-500 ml-1">
                        {locale === "ja" ? "メッセージ" : "messages"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* What Hoo doesn't know yet */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500/70" />
                  <h3 className="text-xs uppercase tracking-wider text-slate-500">
                    {locale === "ja" ? "Hooがまだ知らないこと" : "What Hoo doesn't know"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!cognitiveScores && (
                    <Link href="/lobe" className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs text-violet-300 hover:bg-violet-500/20 transition-colors">
                      {locale === "ja" ? "認知プロファイル" : "Cognitive profile"}
                    </Link>
                  )}
                  {!customInstructions && (
                    <Link href="/dashboard/settings" className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 hover:bg-amber-500/20 transition-colors">
                      {locale === "ja" ? "カスタム指示" : "Custom instructions"}
                    </Link>
                  )}
                  {hooStats.totalConversations === 0 && (
                    <Link href="/dashboard/muednote/hoo" className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                      {locale === "ja" ? "会話履歴" : "Chat history"}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Cognitive Radar */}
            {cognitiveScores && (
              <div className="flex flex-col items-center">
                <CognitiveRadar scores={cognitiveScores} />
                <p className="text-[10px] text-slate-600 mt-1">
                  {cognitiveScores.measuredAt
                    ? formatDate(cognitiveScores.measuredAt)
                    : ""}
                </p>
                <Link
                  href="/dashboard/muednote/lobe"
                  className="text-xs text-violet-400 hover:text-violet-300 mt-1 transition-colors"
                >
                  {locale === "ja" ? "詳細を見る" : "View details"}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================
          Sub: Recent Hoo Conversations
          ======================================== */}
      {recentConversations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {locale === "ja" ? "最近の会話" : "Recent Conversations"}
            </h2>
            <Link
              href="/dashboard/muednote/hoo"
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              {locale === "ja" ? "すべて見る" : "View all"}
            </Link>
          </div>
          <div className="space-y-2">
            {recentConversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/dashboard/muednote/hoo?id=${conv.id}`}
                className="group flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl px-4 py-3 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {conv.title || (locale === "ja" ? "無題の会話" : "Untitled")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {conv.messageCount} {locale === "ja" ? "メッセージ" : "msgs"} · {formatDate(conv.updatedAt)}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ========================================
          Sub: Timer Stats (Hoo's Care Context)
          ======================================== */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" />
          {locale === "ja" ? "制作時間" : "Studio Time"}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-1">
              {locale === "ja" ? "今日" : "Today"}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{timerStats.todayTime.value}</span>
              <span className="text-xs text-slate-500">{timerStats.todayTime.unit}</span>
              {timerStats.todayTime.sub && (
                <span className="text-xs text-slate-600">{timerStats.todayTime.sub}</span>
              )}
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-1">
              {locale === "ja" ? "今週" : "Week"}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{timerStats.weekTime.value}</span>
              <span className="text-xs text-slate-500">{timerStats.weekTime.unit}</span>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-1">
              {locale === "ja" ? "今月" : "Month"}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{timerStats.monthTime.value}</span>
              <span className="text-xs text-slate-500">{timerStats.monthTime.unit}</span>
            </div>
          </div>
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/muednote/sessions/${session.id}`}
                className="group flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-xs text-slate-600 font-mono w-10">
                  {formatDuration(session.durationSec)}
                </span>
                <span className="text-sm text-slate-400 truncate flex-1">
                  {session.sessionMemo || (locale === "ja" ? "無題" : "Untitled")}
                </span>
                <span className="text-xs text-slate-600">
                  {formatDate(session.createdAt)}
                </span>
              </Link>
            ))}
            <Link
              href="/dashboard/muednote/sessions"
              className="block text-center text-xs text-slate-500 hover:text-white py-2 transition-colors"
            >
              {locale === "ja" ? "すべてのセッション" : "All sessions"} ({timerStats.sessionCount})
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
