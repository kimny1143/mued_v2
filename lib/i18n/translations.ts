export type Locale = 'en' | 'ja';

export const translations = {
  en: {
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      filter: 'Filter',
    },

    // Navigation
    nav: {
      dashboard: 'Dashboard',
      materials: 'Materials',
      library: 'Library',
      admin: 'Admin',
      settings: 'Settings',
      signOut: 'Sign Out',
    },

    // RAG Metrics Dashboard
    ragMetrics: {
      title: 'RAG Metrics Dashboard',
      subtitle: 'Monitor AI dialogue performance, citation rates, and SLO compliance',

      // SLO Status
      sloStatus: {
        title: 'SLO Status Overview',
        allMet: 'All SLOs Met',
        someNotMet: 'Some SLOs Not Met',
        citationRate: 'Citation Rate',
        latency: 'Latency (P50)',
        cost: 'Cost per Answer',
        target: 'Target',
        current: 'Current',
      },

      // Current Metrics
      currentMetrics: {
        title: 'Current Metrics Overview',
        last7Days: 'Last 7 Days',
        totalQueries: 'Total Queries',
        avgCitationRate: 'Avg Citation Rate',
        avgLatency: 'Avg Latency (P50)',
        avgCost: 'Avg Cost per Answer',
        uniqueUsers: 'Unique Users',
        positiveVotes: 'Positive Votes',
      },

      // Historical Trends
      historical: {
        title: 'Historical Trends',
        period7d: '7 Days',
        period30d: '30 Days',
        noData: 'No historical data available yet. Data will be collected daily.',

        // Chart titles
        citationRateChart: 'Citation Rate Over Time',
        latencyChart: 'Latency Over Time',
        costChart: 'Cost per Answer & Query Volume',

        // Chart labels
        citationRateLabel: 'Citation Rate',
        latencyP50Label: 'P50 Latency',
        latencyP95Label: 'P95 Latency',
        costLabel: 'Cost',
        queriesLabel: 'Queries',

        // Axis labels
        citationRateAxis: 'Citation Rate (%)',
        latencyAxis: 'Latency (ms)',
        costAxis: 'Cost (¥)',
        queriesAxis: 'Queries',
      },
    },
  },

  ja: {
    // Common
    common: {
      loading: '読み込み中...',
      error: 'エラー',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      edit: '編集',
      search: '検索',
      filter: 'フィルター',
    },

    // Navigation
    nav: {
      dashboard: 'ダッシュボード',
      materials: '教材',
      library: 'ライブラリ',
      admin: '管理',
      settings: '設定',
      signOut: 'サインアウト',
    },

    // RAG Metrics Dashboard
    ragMetrics: {
      title: 'RAGメトリクスダッシュボード',
      subtitle: 'AI対話のパフォーマンス、引用率、SLO準拠状況を監視',

      // SLO Status
      sloStatus: {
        title: 'SLOステータス概要',
        allMet: 'すべてのSLO達成',
        someNotMet: '一部のSLO未達成',
        citationRate: '引用率',
        latency: 'レイテンシ（P50）',
        cost: '回答あたりコスト',
        target: '目標',
        current: '現在',
      },

      // Current Metrics
      currentMetrics: {
        title: '現在のメトリクス概要',
        last7Days: '過去7日間',
        totalQueries: '総クエリ数',
        avgCitationRate: '平均引用率',
        avgLatency: '平均レイテンシ（P50）',
        avgCost: '平均回答コスト',
        uniqueUsers: 'ユニークユーザー数',
        positiveVotes: 'ポジティブ評価数',
      },

      // Historical Trends
      historical: {
        title: '履歴トレンド',
        period7d: '7日間',
        period30d: '30日間',
        noData: '履歴データはまだありません。データは毎日収集されます。',

        // Chart titles
        citationRateChart: '引用率の推移',
        latencyChart: 'レイテンシの推移',
        costChart: '回答あたりコストとクエリ数',

        // Chart labels
        citationRateLabel: '引用率',
        latencyP50Label: 'P50レイテンシ',
        latencyP95Label: 'P95レイテンシ',
        costLabel: 'コスト',
        queriesLabel: 'クエリ数',

        // Axis labels
        citationRateAxis: '引用率 (%)',
        latencyAxis: 'レイテンシ (ms)',
        costAxis: 'コスト (¥)',
        queriesAxis: 'クエリ数',
      },
    },
  },
} as const;

export type TranslationKeys = typeof translations.en;
