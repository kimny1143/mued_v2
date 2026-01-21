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
      retry: 'Retry',
    },

    // Navigation
    nav: {
      dashboard: 'Dashboard',
      lessons: 'Lessons',
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

    // Landing Page
    landing: {
      hero: {
        title: 'Music Lessons Made Easy',
        subtitle: 'MUED LMS connects students with expert mentors through a next-generation learning management system',
        cta: 'Get Started Free Today',
        login: 'Log In',
        getStarted: 'Get Started Free',
      },
      features: {
        scheduling: {
          title: 'Flexible Scheduling',
          description: 'Schedule lessons that work for both mentors and students',
        },
        library: {
          title: 'Rich Material Library',
          description: 'AI-generated personalized materials for efficient learning',
        },
        communication: {
          title: 'Real-Time Communication',
          description: 'Chat features for real-time interaction between mentors and students',
        },
      },
      pricing: {
        title: 'Pricing Plans',
        free: {
          name: 'Free Plan',
          price: '¥0',
          perMonth: '/month',
          features: [
            '1 lesson booking per month',
            'Access to basic materials',
            'Messaging features',
          ],
          cta: 'Get Started Free',
        },
        basic: {
          name: 'Basic Plan',
          price: '¥1,980',
          perMonth: '/month',
          features: [
            '4 lesson bookings per month',
            'Access to all materials',
            'Priority support',
          ],
          cta: 'Choose Plan',
        },
        premium: {
          name: 'Premium Plan',
          price: '¥2,980',
          perMonth: '/month',
          features: [
            'Unlimited lesson bookings',
            'AI material generation',
            '1-on-1 coaching',
          ],
          cta: 'Choose Plan',
        },
      },
      footer: {
        copyright: '© 2025 MUED LMS - glasswerks inc. All rights reserved.',
      },
    },

    // Dashboard
    dashboard: {
      welcome: 'Welcome back,',
      subtitle: "Here's what's happening with your learning journey today.",
      overview: 'Overview',
      quickActions: {
        title: 'Quick Actions',
        createMaterial: 'Create Material',
        createMaterialDesc: 'AI-powered generation',
        bookLesson: 'Book Lesson',
        bookLessonDesc: 'Schedule with mentor',
        myMaterials: 'My Materials',
        myMaterialsDesc: 'View all materials',
        upgradePlan: 'Upgrade Plan',
        upgradePlanDesc: 'Unlock more features',
      },
      stats: {
        totalMaterials: 'Total Materials',
        totalLessons: 'Total Lessons',
        completed: 'Completed',
        inProgress: 'In Progress',
      },
      recentMaterials: {
        title: 'Recent Materials',
        viewAll: 'View All',
        noMaterials: 'No materials yet',
        createFirst: 'Create Your First Material',
      },
      upcomingLessons: {
        title: 'Upcoming Lessons',
        viewAll: 'View All',
        noLessons: 'No upcoming lessons',
        bookFirst: 'Book Your First Lesson',
        lessonWith: 'Lesson with',
        payment: 'Payment:',
      },
    },

    // Materials Page
    materials: {
      title: '🎵 Music Material Library',
      subtitle: 'AI-powered music learning materials tailored to your needs',
      generate: 'Generate Music Material',
      monthlyUsage: 'Monthly Usage',
      emptyState: {
        title: 'Your Music Library Awaits',
        description: 'Create personalized practice routines, sheet music, exercises, and theory lessons tailored to your instrument and skill level',
        cta: 'Generate Your First Music Material',
      },
      deleteConfirm: 'Are you sure you want to delete this material?',
      deleteFailed: 'Failed to delete material',
    },

    // Library Page
    library: {
      title: 'Content Library',
      subtitle: 'Browse educational materials from note.com and other curated sources',
      loadingContent: 'Loading library content...',
      errorLoading: 'Error loading content',
      noContent: 'No content found',
      noContentDesc: 'Try adjusting your filters or check back later',
    },

    // Plugin Management
    plugins: {
      title: 'Plugin Management',
      subtitle: 'Manage content source plugins and monitor their health',
      registered: 'Registered Plugins',
      noPlugins: 'No plugins registered',
      noPluginsDesc: 'Plugins will appear here once registered',
      status: {
        active: 'Active',
        inactive: 'Inactive',
        healthy: 'Healthy',
        unhealthy: 'Unhealthy',
        unknown: 'Unknown',
      },
      actions: {
        enable: 'Enable',
        disable: 'Disable',
        checkHealth: 'Check Health',
        configure: 'Configure',
        viewDetails: 'View Details',
      },
      health: {
        title: 'Health Status',
        lastCheck: 'Last Check',
        checkAll: 'Check All',
        checking: 'Checking...',
        message: 'Message',
      },
      capabilities: {
        title: 'Capabilities',
        list: 'List Content',
        search: 'Search',
        filter: 'Filter',
        fetch: 'Fetch Individual Items',
        transform: 'Transform Content',
      },
      details: {
        name: 'Name',
        source: 'Source',
        version: 'Version',
        description: 'Description',
        apiEndpoint: 'API Endpoint',
        lastUpdated: 'Last Updated',
      },
    },

    // Subscription Page
    subscription: {
      title: 'Choose Your Plan',
      subtitle: 'Unlock the full power of MUEDnote with Hoo AI assistant',
      currentPlan: 'Current Plan:',
      hooConversations: 'Hoo AI:',
      notAvailable: 'Not available',
      unlimited: 'Unlimited',
      used: 'used',
      mostPopular: 'Most Popular',
      currentPlanBadge: 'Current Plan',
      upgrade: 'Upgrade',
      downgrade: 'Downgrade',
      freeForever: 'Free Forever',
      plans: {
        free: {
          name: 'Free',
          description: 'Try MUEDnote for free',
          features: [
            'Voice transcription (Whisper)',
            'Log storage: 90 days',
            'Hoo: Fixed responses only',
          ],
        },
        basic: {
          name: 'Basic',
          description: 'Full features with AI assistant',
          features: [
            'Voice transcription (Whisper)',
            'Log storage: Unlimited',
            'DAW log integration',
            'Dashboard & Export',
            'Hoo AI: 150 conversations/month',
          ],
        },
        premium: {
          name: 'Premium',
          description: 'Unlimited AI with your own API key',
          features: [
            'All Basic features',
            'Hoo AI: Unlimited (BYOK)',
            'Choose your own AI model',
            'System prompt access',
            'Full customization',
          ],
        },
      },
      faq: {
        title: 'Frequently Asked Questions',
        q1: 'Can I cancel anytime?',
        a1: 'Yes, you can cancel anytime. You will continue to have access until the end of your billing period.',
        q2: 'What happens when I reach my monthly limit?',
        a2: 'You can upgrade to a higher plan at any time, or wait until next month when your limits reset.',
        q3: 'Do unused AI materials roll over to the next month?',
        a3: 'No, usage limits reset monthly. For unlimited usage, we recommend upgrading to Basic or Premium plans.',
        q4: 'Can I downgrade my plan?',
        a4: 'Yes, you can downgrade at any time. The change will take effect at the end of your current billing period.',
      },
      scheduledCancel: 'Scheduled to cancel',
      reactivate: 'Reactivate',
      success: {
        title: 'Welcome to {tier}!',
        subtitle: 'Your subscription is now active',
        features: 'You now have access to:',
        cta: 'Start using Hoo',
        backToDashboard: 'Back to Dashboard',
      },
      cancel: {
        title: 'Downgrade Plan',
        confirmTitle: 'Are you sure?',
        loseAccess: "You'll lose access to:",
        reason: 'Why are you leaving?',
        reasons: {
          price: 'Too expensive',
          notUsing: 'Not using the features',
          otherService: 'Found another service',
          other: 'Other',
        },
        finalConfirm: 'Cancel subscription',
        periodEnd: 'Your subscription will end on',
        completed: 'Cancellation confirmed',
        keepUntil: 'You can keep using {tier} until',
      },
    },

    // Trial
    trial: {
      banner: {
        title: 'Try Hoo AI free for 3 days',
        description: '50 turns to experience AI-powered music reflection',
        startTrial: 'Start Free Trial',
        inProgress: 'Free Trial Active',
        remaining: '{days} days, {turns} turns remaining',
        expired: 'Trial ended',
        expiredDescription: 'Upgrade to Basic for continued Hoo AI access',
        turnsExhausted: 'Trial turns used up',
        turnsExhaustedDescription: 'Upgrade to Basic for 150 turns/month',
        upgradeNow: 'Upgrade to Basic',
      },
    },

    // Lessons Page
    lessons: {
      tabs: {
        chatMatching: '💬 Chat AI',
        aiMatching: '✨ AI Matching',
        booking: 'Book Lesson',
        reservations: 'My Reservations',
      },
      payment: {
        success: 'Payment Completed!',
        successDesc: 'Your lesson booking is confirmed. Please wait for contact from your mentor.',
        cancelled: 'Payment Cancelled',
        cancelledDesc: 'Your reservation is pending. Please complete payment later.',
      },
      aiMatching: {
        title: 'AI Mentor Matching',
        subtitle: 'Find the perfect mentor based on your learning style, goals, and schedule',
        perfectMatches: 'Perfect Matches',
        recommendedMentors: 'Recommended Mentors',
        otherMentors: 'Other Mentors',
        noMatches: 'No Matching Mentors Found',
        noMatchesDesc: 'Try adjusting your search criteria',
        resetPreferences: 'Reset Preferences',
        yourProfile: 'Your Profile',
        skillLevel: 'Skill Level:',
        learningGoals: 'Learning Goals:',
        budget: 'Budget:',
      },
      filters: {
        mentors: 'Mentors',
        price: 'Price',
        timeSlot: 'Time Slot',
        filterByTags: 'Filter by Tags',
        clearTags: 'Clear Tags',
        selectedTags: 'selected',
        resetFilters: 'Reset Filters',
        timeSlots: {
          all: 'All',
          morning: 'Morning (9:00-12:00)',
          afternoon: 'Afternoon (12:00-18:00)',
          evening: 'Evening (18:00-21:00)',
        },
      },
      slots: {
        noSlots: 'No Available Slots on This Day',
        noSlotsDesc: 'Select a different date or adjust your filters',
        reserved: '✓ Reserved',
        pending: '⏳ Pending',
        bookNow: 'Book Now',
        viewDetails: 'View Details',
      },
      reservations: {
        noReservations: 'No Reservations Yet',
        noReservationsDesc: 'Book your first lesson to get started',
        bookLesson: 'Book a Lesson',
      },
    },

    // Teacher Dashboard
    teacher: {
      title: '講師ダッシュボード',
      subtitle: 'レッスン状況と収益を確認できます',
      nextSteps: {
        title: '次のステップ',
        createSlots: 'レッスンスロットを作成して予約を受け付けましょう',
        createMaterials: '教材を作成して生徒の学習をサポートしましょう',
        updateProfile: 'プロフィールを充実させて予約率を向上させましょう',
      },
    },

    // MUEDnote Dashboard
    muednote: {
      header: {
        signOut: 'Log Out',
        managePlan: 'Manage Plan',
      },
      tabs: {
        home: 'Home',
        sessions: 'Sessions',
        hoo: 'Hoo',
        settings: 'Settings',
      },
      welcome: 'Welcome,',
      headline: 'Remember why you made that choice.',
      subtitle: 'Capture your decisions with voice on the iPhone app.\nLook back and apply them to your next session.',
      recentSessions: {
        title: 'Recent Sessions',
        viewAll: 'View all →',
        empty: 'No recordings yet',
        emptyHint: 'Start your first recording with the app',
        untitled: 'Untitled session',
      },
      stats: {
        totalTime: 'Total Session Time',
        today: 'Today',
        thisWeek: 'This Week',
        thisMonth: 'This Month',
        hours: 'h',
        minutes: 'm',
        weekSessions: 'Sessions This Week',
        overall: 'Overall Stats',
        sessions: 'Sessions',
        voiceLogs: 'Voice Logs',
      },
      weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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
      retry: '再試行',
    },

    // Navigation
    nav: {
      dashboard: 'ダッシュボード',
      lessons: 'レッスン',
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

    // Landing Page
    landing: {
      hero: {
        title: '音楽レッスンをもっと簡単に',
        subtitle: 'MUED LMSは、次世代の学習管理システムで生徒と専門メンターをつなぎます',
        cta: '今すぐ無料で始める',
        login: 'ログイン',
        getStarted: '無料で始める',
      },
      features: {
        scheduling: {
          title: '柔軟なスケジューリング',
          description: 'メンターと生徒の両方に合うレッスンスケジュールを設定',
        },
        library: {
          title: '豊富な教材ライブラリ',
          description: 'AI生成によるパーソナライズされた教材で効率的な学習',
        },
        communication: {
          title: 'リアルタイムコミュニケーション',
          description: 'メンターと生徒のリアルタイムなやり取りを可能にするチャット機能',
        },
      },
      pricing: {
        title: '料金プラン',
        free: {
          name: '無料プラン',
          price: '¥0',
          perMonth: '/月',
          features: [
            '月1回のレッスン予約',
            '基本教材へのアクセス',
            'メッセージング機能',
          ],
          cta: '無料で始める',
        },
        basic: {
          name: 'ベーシックプラン',
          price: '¥1,980',
          perMonth: '/月',
          features: [
            '月4回のレッスン予約',
            'すべての教材へのアクセス',
            '優先サポート',
          ],
          cta: 'プランを選択',
        },
        premium: {
          name: 'プレミアムプラン',
          price: '¥2,980',
          perMonth: '/月',
          features: [
            '無制限のレッスン予約',
            'AI教材生成',
            '1対1コーチング',
          ],
          cta: 'プランを選択',
        },
      },
      footer: {
        copyright: '© 2025 MUED LMS - glasswerks inc. All rights reserved.',
      },
    },

    // Dashboard
    dashboard: {
      welcome: 'おかえりなさい、',
      subtitle: '今日の学習状況をご覧ください。',
      overview: '概要',
      quickActions: {
        title: 'クイックアクション',
        createMaterial: '教材を作成',
        createMaterialDesc: 'AI自動生成',
        bookLesson: 'レッスン予約',
        bookLessonDesc: 'メンターと予約',
        myMaterials: 'マイ教材',
        myMaterialsDesc: 'すべての教材を見る',
        upgradePlan: 'プランアップグレード',
        upgradePlanDesc: 'さらに多くの機能を解放',
      },
      stats: {
        totalMaterials: '総教材数',
        totalLessons: '総レッスン数',
        completed: '完了',
        inProgress: '進行中',
      },
      recentMaterials: {
        title: '最近の教材',
        viewAll: 'すべて見る',
        noMaterials: 'まだ教材がありません',
        createFirst: '最初の教材を作成',
      },
      upcomingLessons: {
        title: '今後のレッスン',
        viewAll: 'すべて見る',
        noLessons: '予定されたレッスンはありません',
        bookFirst: '最初のレッスンを予約',
        lessonWith: 'レッスン：',
        payment: '支払い状況：',
      },
    },

    // Materials Page
    materials: {
      title: '🎵 音楽教材ライブラリ',
      subtitle: 'あなたのニーズに合わせたAI音楽学習教材',
      generate: '音楽教材を生成',
      monthlyUsage: '月間使用状況',
      emptyState: {
        title: 'あなたの音楽ライブラリが待っています',
        description: '楽器とスキルレベルに合わせた練習ルーティン、楽譜、エクササイズ、理論レッスンをカスタマイズして作成',
        cta: '最初の音楽教材を生成',
      },
      deleteConfirm: 'この教材を削除してもよろしいですか？',
      deleteFailed: '教材の削除に失敗しました',
    },

    // Library Page
    library: {
      title: 'コンテンツライブラリ',
      subtitle: 'note.comやその他の厳選されたソースから教育教材を閲覧',
      loadingContent: 'ライブラリコンテンツを読み込み中...',
      errorLoading: 'コンテンツの読み込みエラー',
      noContent: 'コンテンツが見つかりません',
      noContentDesc: 'フィルターを調整するか、後でもう一度確認してください',
    },

    // Plugin Management
    plugins: {
      title: 'プラグイン管理',
      subtitle: 'コンテンツソースプラグインを管理し、ヘルス状態を監視',
      registered: '登録済みプラグイン',
      noPlugins: '登録されたプラグインはありません',
      noPluginsDesc: '登録されるとここに表示されます',
      status: {
        active: '有効',
        inactive: '無効',
        healthy: '正常',
        unhealthy: '異常',
        unknown: '不明',
      },
      actions: {
        enable: '有効化',
        disable: '無効化',
        checkHealth: 'ヘルスチェック',
        configure: '設定',
        viewDetails: '詳細を表示',
      },
      health: {
        title: 'ヘルス状態',
        lastCheck: '最終チェック',
        checkAll: '全てチェック',
        checking: 'チェック中...',
        message: 'メッセージ',
      },
      capabilities: {
        title: '機能',
        list: 'コンテンツ一覧',
        search: '検索',
        filter: 'フィルター',
        fetch: '個別アイテム取得',
        transform: 'コンテンツ変換',
      },
      details: {
        name: '名前',
        source: 'ソース',
        version: 'バージョン',
        description: '説明',
        apiEndpoint: 'APIエンドポイント',
        lastUpdated: '最終更新',
      },
    },

    // Subscription Page
    subscription: {
      title: 'プランを選択',
      subtitle: 'Hoo AIアシスタントでMUEDnoteをフル活用',
      currentPlan: '現在のプラン：',
      hooConversations: 'Hoo AI：',
      notAvailable: '利用不可',
      unlimited: '無制限',
      used: '使用済み',
      mostPopular: '人気',
      currentPlanBadge: '現在のプラン',
      upgrade: 'アップグレード',
      downgrade: 'ダウングレード',
      freeForever: '永久無料',
      plans: {
        free: {
          name: 'フリー',
          description: 'MUEDnoteを無料でお試し',
          features: [
            '音声文字起こし（Whisper）',
            'ログ保存：90日間',
            'Hoo：定型文のみ',
          ],
        },
        basic: {
          name: 'ベーシック',
          description: 'AIアシスタント付きのフル機能',
          features: [
            '音声文字起こし（Whisper）',
            'ログ保存：無制限',
            'DAWログ連携',
            'ダッシュボード・エクスポート',
            'Hoo AI：月150回まで',
          ],
        },
        premium: {
          name: 'プレミアム',
          description: '自分のAPIキーで無制限AI',
          features: [
            'ベーシックの全機能',
            'Hoo AI：無制限（BYOK）',
            'AIモデル選択可能',
            'システムプロンプト開放',
            'フルカスタマイズ',
          ],
        },
      },
      faq: {
        title: 'よくある質問',
        q1: 'いつでもキャンセルできますか？',
        a1: 'はい、いつでもキャンセルできます。請求期間の終了まで引き続きアクセスできます。',
        q2: '月間制限に達したらどうなりますか？',
        a2: 'いつでも上位プランにアップグレードするか、翌月に制限がリセットされるまで待つことができます。',
        q3: '未使用のAI教材は翌月に繰り越されますか？',
        a3: 'いいえ、使用制限は毎月リセットされます。無制限の使用には、ベーシックまたはプレミアムプランへのアップグレードをお勧めします。',
        q4: 'プランをダウングレードできますか？',
        a4: 'はい、いつでもダウングレードできます。変更は現在の請求期間の終了時に有効になります。',
      },
      scheduledCancel: '解約予定',
      reactivate: '再アクティブ化',
      success: {
        title: '{tier}へようこそ！',
        subtitle: 'サブスクリプションが有効になりました',
        features: '以下の機能が利用可能になりました：',
        cta: 'Hooを使い始める',
        backToDashboard: 'ダッシュボードに戻る',
      },
      cancel: {
        title: 'プランのダウングレード',
        confirmTitle: '本当によろしいですか？',
        loseAccess: '以下の機能が使えなくなります：',
        reason: '解約理由を教えてください',
        reasons: {
          price: '価格が高い',
          notUsing: '機能を使っていない',
          otherService: '他のサービスを見つけた',
          other: 'その他',
        },
        finalConfirm: 'サブスクリプションを解約',
        periodEnd: 'サブスクリプションの終了日',
        completed: '解約手続きが完了しました',
        keepUntil: '{tier}は以下の日付まで引き続きご利用いただけます',
      },
    },

    // Trial
    trial: {
      banner: {
        title: '3日間無料でHoo AIを試す',
        description: '50ターンでAI音楽振り返り機能をお試し',
        startTrial: '無料トライアルを開始',
        inProgress: '無料トライアル中',
        remaining: '残り{days}日 / {turns}ターン',
        expired: 'トライアル終了',
        expiredDescription: 'Basicにアップグレードで継続利用',
        turnsExhausted: 'トライアルターン使用済み',
        turnsExhaustedDescription: 'Basicで月150ターン利用可能',
        upgradeNow: 'Basicにアップグレード',
      },
    },

    // Lessons Page
    lessons: {
      tabs: {
        chatMatching: '💬 チャットAI',
        aiMatching: '✨ AIマッチング',
        booking: 'レッスン予約',
        reservations: 'マイ予約',
      },
      payment: {
        success: '支払い完了！',
        successDesc: 'レッスン予約が確定しました。メンターからの連絡をお待ちください。',
        cancelled: '支払いがキャンセルされました',
        cancelledDesc: '予約は保留中です。後で支払いを完了してください。',
      },
      aiMatching: {
        title: 'AIメンターマッチング',
        subtitle: '学習スタイル、目標、スケジュールに基づいて最適なメンターを見つける',
        perfectMatches: '完璧なマッチ',
        recommendedMentors: 'おすすめメンター',
        otherMentors: 'その他のメンター',
        noMatches: 'マッチするメンターが見つかりません',
        noMatchesDesc: '検索条件を調整してみてください',
        resetPreferences: '設定をリセット',
        yourProfile: 'あなたのプロフィール',
        skillLevel: 'スキルレベル：',
        learningGoals: '学習目標：',
        budget: '予算：',
      },
      filters: {
        mentors: 'メンター',
        price: '価格',
        timeSlot: '時間帯',
        filterByTags: 'タグで絞り込み',
        clearTags: 'タグをクリア',
        selectedTags: '選択中',
        resetFilters: 'フィルターをリセット',
        timeSlots: {
          all: 'すべて',
          morning: '午前 (9:00-12:00)',
          afternoon: '午後 (12:00-18:00)',
          evening: '夜 (18:00-21:00)',
        },
      },
      slots: {
        noSlots: 'この日に空きスロットはありません',
        noSlotsDesc: '別の日を選択するか、フィルターを調整してください',
        reserved: '✓ 予約済み',
        pending: '⏳ 保留中',
        bookNow: '今すぐ予約',
        viewDetails: '詳細を見る',
      },
      reservations: {
        noReservations: 'まだ予約はありません',
        noReservationsDesc: '最初のレッスンを予約して始めましょう',
        bookLesson: 'レッスンを予約',
      },
    },

    // Teacher Dashboard
    teacher: {
      title: '講師ダッシュボード',
      subtitle: 'レッスン状況と収益を確認できます',
      nextSteps: {
        title: '次のステップ',
        createSlots: 'レッスンスロットを作成して予約を受け付けましょう',
        createMaterials: '教材を作成して生徒の学習をサポートしましょう',
        updateProfile: 'プロフィールを充実させて予約率を向上させましょう',
      },
    },

    // MUEDnote Dashboard
    muednote: {
      header: {
        signOut: 'ログアウト',
        managePlan: 'プラン管理',
      },
      tabs: {
        home: 'ホーム',
        sessions: 'セッション',
        hoo: 'Hoo',
        settings: '設定',
      },
      welcome: 'ようこそ、',
      headline: '「なぜそうしたか」を、残しておこう。',
      subtitle: '制作中の判断は、iPhoneアプリで声で残す。\n後から振り返って、次の制作に活かそう。',
      recentSessions: {
        title: '最近のセッション',
        viewAll: 'すべて見る →',
        empty: 'まだ記録がありません',
        emptyHint: 'アプリで最初の録音をしてみましょう',
        untitled: '無題のセッション',
      },
      stats: {
        totalTime: '累計セッション時間',
        today: '今日',
        thisWeek: '今週',
        thisMonth: '今月',
        hours: '時間',
        minutes: '分',
        weekSessions: '今週のセッション',
        overall: '全体統計',
        sessions: 'セッション',
        voiceLogs: '音声ログ',
      },
      weekDays: ['月', '火', '水', '木', '金', '土', '日'],
    },
  },
};

export type TranslationKeys = typeof translations.en;
