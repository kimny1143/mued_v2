"use client";

import { Mic, Clock, ArrowRight, Calendar, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";

interface Session {
  id: string;
  sessionMemo: string | null;
  durationSec: number;
  createdAt: Date | null;
}

interface WeekDay {
  label: string;
  date: number;
  dateStr: string;
  isToday: boolean;
  isFuture: boolean;
  hasSession: boolean;
  sessionCount: number;
  totalMinutes: number;
}

interface TimeDisplay {
  value: number;
  unit: string;
  sub: string | null;
}

interface MuednoteDashboardContentProps {
  userName: string;
  recentSessions: Session[];
  sessionCount: number;
  logCount: number;
  todayTime: TimeDisplay;
  weekTime: TimeDisplay;
  monthTime: TimeDisplay;
  weekCalendar: WeekDay[];
}

/**
 * MUEDnote Dashboard Content - Client Component
 *
 * Handles i18n for the dashboard UI while receiving
 * server-fetched data as props.
 */
export function MuednoteDashboardContent({
  userName,
  recentSessions,
  sessionCount,
  logCount,
  todayTime,
  weekTime,
  monthTime,
  weekCalendar,
}: MuednoteDashboardContentProps) {
  const { t, locale } = useLocale();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Map week days to i18n
  const localizedWeekCalendar = weekCalendar.map((day, index) => ({
    ...day,
    label: t.muednote.weekDays[index],
  }));

  return (
    <>
      {/* Hero: iOS-First Messaging */}
      <div className="mb-8">
        <p className="text-indigo-400/80 text-sm mb-3">
          {t.muednote.welcome}{userName}
        </p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-snug">
          {t.muednote.headline}
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg whitespace-pre-line">
          {t.muednote.subtitle}
        </p>
      </div>

      {/* Overview Tab Content */}
      <div className="grid lg:grid-cols-[1fr,280px] gap-8 lg:gap-12">
        {/* Left: Recent Sessions (Primary) */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">{t.muednote.recentSessions.title}</h2>
            {recentSessions.length > 0 && (
              <Link
                href="/dashboard/muednote/sessions"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {t.muednote.recentSessions.viewAll}
              </Link>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl px-6 py-12 text-center">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-white font-medium mb-1">{t.muednote.recentSessions.empty}</p>
              <p className="text-sm text-slate-500">
                {t.muednote.recentSessions.emptyHint}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session, index) => (
                <Link
                  key={session.id}
                  href={`/dashboard/muednote/sessions/${session.id}`}
                  className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-4 transition-colors block"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl font-light text-slate-600 w-8 text-right">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {session.sessionMemo || t.muednote.recentSessions.untitled}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(session.durationSec)}
                        </span>
                        <span>{formatDate(session.createdAt)}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* iOS App Store Badge */}
          <div className="mt-8">
            <a
              href="https://apps.apple.com/app/muednote"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <div className="bg-black hover:bg-zinc-900 text-white px-4 py-2.5 rounded-xl inline-flex items-center gap-3 transition-colors border border-white/10">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] leading-none opacity-80">Download on the</p>
                  <p className="text-lg font-semibold leading-tight -mt-0.5">App Store</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Right: Stats (Secondary, smaller) */}
        <div className="lg:pt-0">
          {/* Total Time Section */}
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t.muednote.stats.totalTime}</p>
          </div>
          <div className="space-y-2 mb-6">
            {/* Today - Main Card */}
            <div className="bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-300">{t.muednote.stats.today}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{todayTime.value}</span>
                  <span className="text-sm text-slate-400">
                    {locale === "ja" ? todayTime.unit : (todayTime.unit === "時間" ? t.muednote.stats.hours : t.muednote.stats.minutes)}
                  </span>
                  {todayTime.sub && (
                    <span className="text-sm text-slate-500 ml-1">{todayTime.sub}</span>
                  )}
                </div>
              </div>
            </div>
            {/* This Week / This Month */}
            <div className="flex gap-2">
              <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-500 mb-1">{t.muednote.stats.thisWeek}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-white">{weekTime.value}</span>
                  <span className="text-xs text-slate-500">
                    {locale === "ja" ? weekTime.unit : (weekTime.unit === "時間" ? t.muednote.stats.hours : t.muednote.stats.minutes)}
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-500 mb-1">{t.muednote.stats.thisMonth}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-white">{monthTime.value}</span>
                  <span className="text-xs text-slate-500">
                    {locale === "ja" ? monthTime.unit : (monthTime.unit === "時間" ? t.muednote.stats.hours : t.muednote.stats.minutes)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Week Calendar */}
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-500" />
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t.muednote.stats.weekSessions}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 mb-6">
            <div className="grid grid-cols-7 gap-1">
              {localizedWeekCalendar.map((day) => (
                <div
                  key={day.dateStr}
                  className={`flex flex-col items-center py-2 rounded-lg transition-colors ${
                    day.isToday
                      ? "bg-indigo-500/20 border border-indigo-500/30"
                      : day.hasSession
                      ? "bg-white/5"
                      : ""
                  }`}
                >
                  <span
                    className={`text-[10px] ${
                      day.isToday ? "text-indigo-300" : "text-slate-500"
                    }`}
                  >
                    {day.label}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      day.isFuture
                        ? "text-slate-600"
                        : day.isToday
                        ? "text-white"
                        : day.hasSession
                        ? "text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {day.date}
                  </span>
                  {day.hasSession && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overall Stats */}
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t.muednote.stats.overall}</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
              <p className="text-lg font-semibold text-white">{sessionCount}</p>
              <p className="text-xs text-slate-500">{t.muednote.stats.sessions}</p>
            </div>
            <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
              <p className="text-lg font-semibold text-white">{logCount}</p>
              <p className="text-xs text-slate-500">{t.muednote.stats.voiceLogs}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
