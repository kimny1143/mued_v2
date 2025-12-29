/**
 * Hoo Messages - Hooのセリフ一覧
 *
 * メッセージ調整はこのファイルを編集
 */

// ========================================
// Home Screen
// ========================================

export const HOME_MESSAGES = {
  // 準備中
  loading: '準備中...少し待ってね',
  // 4時間超過警告
  overLimit: '今日は4時間超えたね。そろそろ休もう？',
};

// ========================================
// Focus Mode Messages
// ========================================

export const MODE_MESSAGES = {
  pomodoro: '25分集中して5分休む、ポモドーロだね。短く区切ってリズムよく！',
  standard: '50分の標準セッション。バランスよく集中できるよ！',
  deepwork: '90分のディープワーク。創作に没頭するならこれだね！',
  custom: '自分だけの時間設定。最大120分まで選べるよ！',
};

// ========================================
// Break Screen
// ========================================

export const BREAK_MESSAGES = {
  // 処理中
  processing: '録音を処理中...少し待ってね',

  // 4時間超過
  overLimit: '今日はそろそろ終わりにしませんか？',

  // 休憩中（休憩時間に応じて）
  duringBreak: {
    short: 'お疲れさま！軽く深呼吸してね',      // 5分以下
    medium: 'お疲れさま！少し体を動かしてみて', // 10-16分
    long: 'しっかり休もう。ストレッチや水分補給もいいよ', // 17分以上
  },

  // 休憩終了後
  afterBreak: {
    short: 'リフレッシュできた？',
    long: 'しっかり休めた？集中力も回復したね！', // 15分以上
  },
};

// ========================================
// Session Screen
// ========================================

export const SESSION_MESSAGES = {
  // 録音中（状態に応じて）
  recording: '集中してるね',
  ending: '終了処理中...',
};

// ========================================
// Review Screen
// ========================================

export const REVIEW_MESSAGES = {
  done: '記録したよ',
  saving: '保存中...',
};

// ========================================
// Helper Functions
// ========================================

/**
 * 休憩時間に応じたメッセージを取得
 */
export function getBreakMessage(
  breakDurationSec: number,
  isBreakOver: boolean,
  isProcessing: boolean,
  isOverLimit: boolean
): string {
  if (isProcessing) {
    return BREAK_MESSAGES.processing;
  }
  if (isOverLimit) {
    return BREAK_MESSAGES.overLimit;
  }

  const breakMins = Math.floor(breakDurationSec / 60);

  if (isBreakOver) {
    return breakMins >= 15
      ? BREAK_MESSAGES.afterBreak.long
      : BREAK_MESSAGES.afterBreak.short;
  }

  if (breakMins >= 17) {
    return BREAK_MESSAGES.duringBreak.long;
  } else if (breakMins >= 10) {
    return BREAK_MESSAGES.duringBreak.medium;
  } else {
    return BREAK_MESSAGES.duringBreak.short;
  }
}

/**
 * ホーム画面のメッセージを取得
 */
export function getHomeMessage(
  isOverLimit: boolean,
  isReady: boolean,
  modeMessage?: string
): string | undefined {
  if (modeMessage) {
    return modeMessage;
  }
  if (isOverLimit) {
    return HOME_MESSAGES.overLimit;
  }
  if (!isReady) {
    return HOME_MESSAGES.loading;
  }
  return undefined;
}
