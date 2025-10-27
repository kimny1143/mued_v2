/**
 * Learning Tracker
 *
 * 学習メトリクスの計算とトラッキング
 */

export interface PracticeSession {
  materialId: string;
  userId: string;
  instrument: string;

  // セッション情報
  startTime: Date;
  endTime: Date;
  duration: number; // 秒

  // 達成率データ
  sectionsCompleted: number;
  sectionsTotal: number;

  // 反復データ
  loopEvents: LoopEvent[];

  // テンポデータ
  targetTempo: number; // BPM
  achievedTempo: number; // BPM
}

export interface LoopEvent {
  startBar: number;
  endBar: number;
  timestamp: Date;
  tempo: number; // このループ時のテンポ
}

export interface WeakSpot {
  startBar: number;
  endBar: number;
  loopCount: number;
  lastPracticedAt: string;
}

export interface LearningMetrics {
  // 達成率
  achievementRate: number; // 0-100%

  // 反復指数
  repetitionIndex: number; // 平均反復回数

  // テンポ到達
  tempoAchievement: number; // 0-100%

  // 滞在箇所
  weakSpots: WeakSpot[];
}

/**
 * 練習セッションから学習メトリクスを計算
 */
export function calculateLearningMetrics(session: PracticeSession): LearningMetrics {
  const achievementRate = calculateAchievementRate(
    session.sectionsCompleted,
    session.sectionsTotal
  );

  const repetitionIndex = calculateRepetitionIndex(session.loopEvents);

  const tempoAchievement = calculateTempoAchievement(
    session.achievedTempo,
    session.targetTempo
  );

  const weakSpots = identifyWeakSpots(session.loopEvents);

  return {
    achievementRate,
    repetitionIndex,
    tempoAchievement,
    weakSpots,
  };
}

/**
 * 達成率を計算（セクション完了率）
 */
export function calculateAchievementRate(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.min(100, (completed / total) * 100);
}

/**
 * 反復指数を計算（平均反復回数）
 */
export function calculateRepetitionIndex(loopEvents: LoopEvent[]): number {
  if (loopEvents.length === 0) return 0;

  // 各小節範囲の出現回数をカウント
  const loopCounts = new Map<string, number>();

  for (const event of loopEvents) {
    const key = `${event.startBar}-${event.endBar}`;
    loopCounts.set(key, (loopCounts.get(key) || 0) + 1);
  }

  // 平均反復回数
  const totalLoops = Array.from(loopCounts.values()).reduce((a, b) => a + b, 0);
  const uniqueSections = loopCounts.size;

  return uniqueSections > 0 ? totalLoops / uniqueSections : 0;
}

/**
 * テンポ到達率を計算
 */
export function calculateTempoAchievement(
  achieved: number,
  target: number
): number {
  if (target === 0) return 0;
  return Math.min(100, (achieved / target) * 100);
}

/**
 * 滞在箇所（最も反復した箇所）を特定
 */
export function identifyWeakSpots(
  loopEvents: LoopEvent[],
  topN: number = 3
): WeakSpot[] {
  if (loopEvents.length === 0) return [];

  // 各小節範囲の出現回数と最終練習日時をカウント
  const loopData = new Map<
    string,
    { startBar: number; endBar: number; count: number; lastPracticedAt: Date }
  >();

  for (const event of loopEvents) {
    const key = `${event.startBar}-${event.endBar}`;
    const existing = loopData.get(key);

    if (existing) {
      existing.count += 1;
      existing.lastPracticedAt = event.timestamp;
    } else {
      loopData.set(key, {
        startBar: event.startBar,
        endBar: event.endBar,
        count: 1,
        lastPracticedAt: event.timestamp,
      });
    }
  }

  // カウントの多い順にソート
  const sorted = Array.from(loopData.values()).sort((a, b) => b.count - a.count);

  // 上位N件を返す
  return sorted.slice(0, topN).map((item) => ({
    startBar: item.startBar,
    endBar: item.endBar,
    loopCount: item.count,
    lastPracticedAt: item.lastPracticedAt.toISOString(),
  }));
}

/**
 * 複数セッションのメトリクスを集計
 */
export function aggregateMetrics(sessions: PracticeSession[]): {
  totalPracticeTime: number; // 秒
  sessionCount: number;
  averageAchievementRate: number;
  averageRepetitionIndex: number;
  averageTempoAchievement: number;
  overallWeakSpots: WeakSpot[];
} {
  if (sessions.length === 0) {
    return {
      totalPracticeTime: 0,
      sessionCount: 0,
      averageAchievementRate: 0,
      averageRepetitionIndex: 0,
      averageTempoAchievement: 0,
      overallWeakSpots: [],
    };
  }

  const totalPracticeTime = sessions.reduce((sum, s) => sum + s.duration, 0);
  const sessionCount = sessions.length;

  // 各セッションのメトリクスを計算
  const metrics = sessions.map((s) => calculateLearningMetrics(s));

  const averageAchievementRate =
    metrics.reduce((sum, m) => sum + m.achievementRate, 0) / sessionCount;

  const averageRepetitionIndex =
    metrics.reduce((sum, m) => sum + m.repetitionIndex, 0) / sessionCount;

  const averageTempoAchievement =
    metrics.reduce((sum, m) => sum + m.tempoAchievement, 0) / sessionCount;

  // 全セッションのループイベントを統合
  const allLoopEvents = sessions.flatMap((s) => s.loopEvents);
  const overallWeakSpots = identifyWeakSpots(allLoopEvents, 5);

  return {
    totalPracticeTime,
    sessionCount,
    averageAchievementRate,
    averageRepetitionIndex,
    averageTempoAchievement,
    overallWeakSpots,
  };
}

/**
 * 進捗リング用のデータを生成
 */
export interface ProgressRingData {
  achievement: {
    value: number; // 0-100
    label: string;
    color: string;
  };
  tempo: {
    value: number; // 0-100
    label: string;
    color: string;
  };
  practice: {
    value: number; // 0-100 (目標時間に対する割合)
    label: string;
    color: string;
  };
}

export function generateProgressRing(
  achievementRate: number,
  tempoAchievement: number,
  practiceTime: number,
  targetPracticeTime: number = 1800 // 30分がデフォルト目標
): ProgressRingData {
  const practiceProgress = Math.min(100, (practiceTime / targetPracticeTime) * 100);

  return {
    achievement: {
      value: Math.round(achievementRate),
      label: `${Math.round(achievementRate)}%`,
      color: getProgressColor(achievementRate),
    },
    tempo: {
      value: Math.round(tempoAchievement),
      label: `${Math.round(tempoAchievement)}%`,
      color: getProgressColor(tempoAchievement),
    },
    practice: {
      value: Math.round(practiceProgress),
      label: formatDuration(practiceTime),
      color: getProgressColor(practiceProgress),
    },
  };
}

/**
 * 進捗率に応じた色を返す
 */
function getProgressColor(progress: number): string {
  if (progress >= 80) return '#75bc11'; // 緑（目標達成）
  if (progress >= 60) return '#f59e0b'; // 黄色（良好）
  if (progress >= 40) return '#fb923c'; // オレンジ（改善必要）
  return '#ef4444'; // 赤（要改善）
}

/**
 * 秒数を「〇分」形式にフォーマット
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}秒`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}分`;
  }

  return `${minutes}分${remainingSeconds}秒`;
}

/**
 * クラス全体の集計データを生成（教師向け）
 */
export interface ClassAggregateData {
  totalStudents: number;
  averageAchievementRate: number;
  averageTempoAchievement: number;
  totalPracticeTime: number;
  activeStudentsToday: number;
  strugglingStudents: Array<{
    userId: string;
    name: string;
    achievementRate: number;
    weakSpots: WeakSpot[];
  }>;
}

export function generateClassAggregate(
  studentMetrics: Array<{
    userId: string;
    name: string;
    achievementRate: number;
    tempoAchievement: number;
    practiceTime: number;
    lastPracticedAt: Date | null;
    weakSpots: WeakSpot[];
  }>
): ClassAggregateData {
  const totalStudents = studentMetrics.length;

  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      averageAchievementRate: 0,
      averageTempoAchievement: 0,
      totalPracticeTime: 0,
      activeStudentsToday: 0,
      strugglingStudents: [],
    };
  }

  const averageAchievementRate =
    studentMetrics.reduce((sum, s) => sum + s.achievementRate, 0) / totalStudents;

  const averageTempoAchievement =
    studentMetrics.reduce((sum, s) => sum + s.tempoAchievement, 0) / totalStudents;

  const totalPracticeTime = studentMetrics.reduce((sum, s) => sum + s.practiceTime, 0);

  // 本日練習した生徒数（過去24時間以内）
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const activeStudentsToday = studentMetrics.filter(
    (s) => s.lastPracticedAt && s.lastPracticedAt >= yesterday
  ).length;

  // 苦戦している生徒（達成率 < 50%）
  const strugglingStudents = studentMetrics
    .filter((s) => s.achievementRate < 50)
    .sort((a, b) => a.achievementRate - b.achievementRate)
    .slice(0, 5)
    .map((s) => ({
      userId: s.userId,
      name: s.name,
      achievementRate: s.achievementRate,
      weakSpots: s.weakSpots,
    }));

  return {
    totalStudents,
    averageAchievementRate,
    averageTempoAchievement,
    totalPracticeTime,
    activeStudentsToday,
    strugglingStudents,
  };
}
