"use client";

import {
  Brain,
  Clock,
  ArrowRight,
  CheckCircle,
  Circle,
  Pencil,
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
  }[];  // kept for data compatibility — not rendered
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
  gameProgress: {
    completedGames: string[];
    totalGames: number;
  };
  completeness: {
    score: number;
    max: number;
    checks: {
      gamesCompleted: boolean;
      hasProfile: boolean;
      hasCustomInstructions: boolean;
      hasConversations: boolean;
      hasSessions: boolean;
      hasUserProfile: boolean;
    };
  };
}

interface MuednoteDashboardContentProps {
  userName: string;
  profile: ProfileData;
}

// ========================================
// Game definitions (mirrors lib/muedlobe/constants.ts)
// ========================================

const GAMES = [
  { type: "tone-sequence", name: "Tone Sequence", nameJa: "音系列記憶", variable: "WM" },
  { type: "mental-math", name: "Mental Math", nameJa: "メンタルマス", variable: "WM" },
  { type: "symbol-match", name: "Symbol Match", nameJa: "シンボルマッチ", variable: "PS" },
  { type: "code-fill", name: "Code Fill", nameJa: "コードフィル", variable: "PS" },
  { type: "word-bridge", name: "Word Bridge", nameJa: "ワードブリッジ", variable: "VC" },
  { type: "pattern-complete", name: "Pattern Complete", nameJa: "パターンコンプリート", variable: "PR" },
  { type: "focus-flow", name: "Focus Flow", nameJa: "フォーカスフロー", variable: "ATT" },
];

const VARIABLE_COLORS: Record<string, string> = {
  WM: "text-amber-400",
  PS: "text-emerald-400",
  VC: "text-sky-400",
  PR: "text-violet-400",
  ATT: "text-rose-400",
};

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

  const rings = [25, 50, 75, 100];
  const dataPoints = dimensions.map((d, i) => getPoint(i, d.value));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[180px]">
      {rings.map((pct) => {
        const pts = dimensions.map((_, i) => getPoint(i, pct));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        return <path key={pct} d={path} fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={0.5} />;
      })}
      {dimensions.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="white" strokeOpacity={0.06} strokeWidth={0.5} />;
      })}
      <path d={dataPath} fill="rgb(99 102 241)" fillOpacity={0.15} stroke="rgb(99 102 241)" strokeWidth={1.5} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="rgb(129 140 248)" />
      ))}
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
// Profile Completeness Bar
// ========================================

function CompletenessBar({
  score,
  max,
  checks,
  locale,
}: {
  score: number;
  max: number;
  checks: ProfileData["completeness"]["checks"];
  locale: string;
}) {
  const pct = Math.round((score / max) * 100);

  const items = [
    { key: "gamesCompleted", done: checks.gamesCompleted, label: locale === "ja" ? "7ゲーム完了" : "Complete 7 games", href: "/lobe" },
    { key: "hasProfile", done: checks.hasProfile, label: locale === "ja" ? "認知プロファイル" : "Cognitive profile", href: "/lobe" },
    { key: "hasCustomInstructions", done: checks.hasCustomInstructions, label: locale === "ja" ? "カスタム指示" : "Custom instructions", href: "/dashboard/settings" },
    { key: "hasConversations", done: checks.hasConversations, label: locale === "ja" ? "Hoo会話" : "Hoo conversations", href: null },
    { key: "hasSessions", done: checks.hasSessions, label: locale === "ja" ? "制作セッション" : "Studio sessions", href: null },
    { key: "hasUserProfile", done: checks.hasUserProfile, label: locale === "ja" ? "ユーザープロファイル" : "User profile", href: "/dashboard/muednote/import" },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-slate-400">
          {locale === "ja" ? "プロファイル充実度" : "Profile Completeness"}
        </h2>
        <span className="text-sm font-bold text-white">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2 mb-4">
        <div
          className="h-2 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const content = (
            <div className="flex items-center gap-2 text-xs">
              {item.done ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <span className={item.done ? "text-slate-500 line-through" : "text-slate-300"}>
                {item.label}
              </span>
            </div>
          );

          if (!item.done && item.href) {
            return (
              <Link key={item.key} href={item.href} className="hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                {content}
              </Link>
            );
          }
          return <div key={item.key} className="px-2 py-1.5 -mx-2">{content}</div>;
        })}
      </div>
    </div>
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

  const { cognitiveScores, customInstructions, timerStats, recentSessions, gameProgress, completeness } = profile;

  const completedSet = new Set(gameProgress.completedGames);
  const gamesCompleted = completedSet.size;

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
          {locale === "ja" ? "あなたのプロファイル" : "Your Profile"}
        </h1>
      </div>

      {/* ========================================
          Profile Completeness
          ======================================== */}
      <CompletenessBar
        score={completeness.score}
        max={completeness.max}
        checks={completeness.checks}
        locale={locale}
      />

      {/* ========================================
          MUEDlobe: Game Progress + Cognitive Profile
          ======================================== */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" />
            MUEDlobe
          </h2>
          <span className="text-xs text-slate-500">
            {gamesCompleted}/{gameProgress.totalGames} {locale === "ja" ? "ゲーム完了" : "games"}
          </span>
        </div>

        {gamesCompleted === 0 ? (
          /* No games played — primary CTA */
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-7 h-7 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {locale === "ja"
                ? "認知プロファイルを作ろう"
                : "Build Your Cognitive Profile"}
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-5">
              {locale === "ja"
                ? "7つのゲームをプレイして、あなたの認知スタイルを発見しましょう。Hooがあなたに合わせてパーソナライズされます。"
                : "Play 7 quick games to discover your cognitive style. Hoo will personalize to match how you think."}
            </p>
            <Link
              href="/lobe"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Brain className="w-4 h-4" />
              {locale === "ja" ? "MUEDlobeを始める" : "Start MUEDlobe"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Games in progress or completed */
          <div className="grid lg:grid-cols-[1fr,180px] gap-6">
            {/* Left: Game list */}
            <div>
              {/* Game progress grid */}
              <div className="grid grid-cols-1 gap-1.5">
                {GAMES.map((game) => {
                  const done = completedSet.has(game.type);
                  return (
                    <div
                      key={game.type}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                        done ? "bg-white/[0.02]" : "bg-white/[0.01]"
                      }`}
                    >
                      {done ? (
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${done ? "text-slate-300" : "text-slate-500"}`}>
                        {locale === "ja" ? game.nameJa : game.name}
                      </span>
                      <span className={`text-xs font-mono ${VARIABLE_COLORS[game.variable] || "text-slate-500"}`}>
                        {game.variable}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* CTA if not all done */}
              {gamesCompleted < gameProgress.totalGames && (
                <Link
                  href="/lobe"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {locale === "ja" ? "続きをプレイ" : "Continue playing"}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Right: Cognitive Radar (if profile exists) */}
            {cognitiveScores ? (
              <div className="flex flex-col items-center justify-center">
                <CognitiveRadar scores={cognitiveScores} />
                <p className="text-[10px] text-slate-600 mt-1">
                  {cognitiveScores.measuredAt ? formatDate(cognitiveScores.measuredAt) : ""}
                </p>
                <Link
                  href="/dashboard/muednote/lobe"
                  className="text-xs text-violet-400 hover:text-violet-300 mt-1 transition-colors"
                >
                  {locale === "ja" ? "詳細を見る" : "View details"}
                </Link>
              </div>
            ) : gamesCompleted >= 7 ? (
              <div className="flex flex-col items-center justify-center text-center">
                <p className="text-xs text-slate-500 mb-2">
                  {locale === "ja" ? "プロファイル生成中..." : "Generating profile..."}
                </p>
                <Link
                  href="/lobe/results"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {locale === "ja" ? "結果を確認" : "View results"}
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ========================================
          Custom Instructions (compact)
          ======================================== */}
      {customInstructions && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">
              {locale === "ja" ? "Hooへのメモ" : "Notes for Hoo"}
            </h3>
            <Link href="/dashboard/settings" className="text-slate-600 hover:text-slate-400 transition-colors">
              <Pencil className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
            {customInstructions}
          </p>
        </div>
      )}

      {/* ========================================
          Studio Time
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

      {/* Hoo conversations section removed — conversations are mobile-only */}
    </div>
  );
}
