# チャット型UI UXパターン集

**Version**: 1.0.0
**Date**: 2025-11-19
**Status**: Pattern Library
**Project**: MUEDnote チャット型音楽学習ログシステム

---

## 1. 概要

本ドキュメントは、MUEDnoteのチャット型UIに特化したUXパターン集です。各パターンには、心理効果の根拠、実装例、測定方法を含みます。

### 1.1 パターンの構成

各パターンは以下の構成で記述されます：

- **概要**: パターンの説明
- **心理効果**: 活用する心理学的原理
- **実装例**: コード例とビジュアル
- **測定指標**: 効果測定のKPI
- **注意事項**: 実装時の留意点

---

## 2. 入力パターン

### 2.1 スマート・プレースホルダー

#### 概要
コンテキストに応じて動的に変化するプレースホルダーで、ユーザーの入力を自然に誘導

#### 心理効果
- **認知負荷削減**: 何を入力すべきか明確
- **プライミング効果**: 望ましい行動への誘導

#### 実装例

```typescript
const SmartPlaceholder = () => {
  const [placeholder, setPlaceholder] = useState('');
  const userContext = useUserContext();

  useEffect(() => {
    const placeholders = getContextualPlaceholders(userContext);

    // 時間帯に応じた変更
    const hour = new Date().getHours();
    if (hour < 12) {
      setPlaceholder(placeholders.morning);
    } else if (hour < 18) {
      setPlaceholder(placeholders.afternoon);
    } else {
      setPlaceholder(placeholders.evening);
    }
  }, [userContext]);

  return placeholder;
};

const getContextualPlaceholders = (context: UserContext) => {
  const base = {
    morning: "今日の練習目標を入力...",
    afternoon: "練習の進捗はいかがですか？",
    evening: "今日の振り返りを記録しましょう"
  };

  // ユーザーの進捗に応じた調整
  if (context.streakDays > 7) {
    base.morning = "素晴らしい継続ですね！今日の目標は？";
  }

  // 最近の活動に基づく提案
  if (context.recentActivity === 'composition') {
    base.afternoon = "作曲の進捗を記録...";
  }

  return base;
};
```

#### ビジュアル例

```
朝（6:00-12:00）:
┌─────────────────────────────────────┐
│ 🌅 今日の練習目標を入力...          │
└─────────────────────────────────────┘

昼（12:00-18:00）:
┌─────────────────────────────────────┐
│ 📝 練習の進捗はいかがですか？       │
└─────────────────────────────────────┘

夜（18:00-24:00）:
┌─────────────────────────────────────┐
│ 🌙 今日の振り返りを記録しましょう   │
└─────────────────────────────────────┘
```

#### 測定指標
- 入力開始時間: < 3秒
- プレースホルダーのクリック率: > 40%
- 入力完了率: > 75%

---

### 2.2 インライン・サジェスト

#### 概要
入力中にリアルタイムで関連する提案を表示し、入力を効率化

#### 心理効果
- **ナッジ効果**: さりげない行動誘導
- **認知負荷削減**: 思い出す負担を軽減

#### 実装例

```typescript
const InlineSuggest = () => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const generateSuggestions = useMemo(() => {
    return debounce((text: string) => {
      if (text.length < 2) {
        setSuggestions([]);
        return;
      }

      const musicTerms = [
        'コード進行', 'メロディー', 'リズム', 'ハーモニー',
        'スケール', 'アルペジオ', 'カデンツ', 'モチーフ'
      ];

      const recentLogs = getUserRecentLogs();
      const frequentPhrases = extractFrequentPhrases(recentLogs);

      // コンテキスト認識型サジェスト
      const contextSuggestions = [
        ...musicTerms.filter(term => term.includes(text)),
        ...frequentPhrases.filter(phrase => phrase.startsWith(text))
      ].slice(0, 5);

      setSuggestions(contextSuggestions);
    }, 300);
  }, []);

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          generateSuggestions(e.target.value);
        }}
        onKeyDown={handleKeyNavigation}
      />

      {suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`suggestion-item ${
                index === selectedIndex ? 'selected' : ''
              }`}
              onClick={() => applySuggestion(suggestion)}
            >
              <span className="suggestion-text">{suggestion}</span>
              <span className="suggestion-hint">Tab to insert</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

#### 測定指標
- サジェスト使用率: > 30%
- 入力時間短縮: -20%
- タイポ率削減: -50%

---

### 2.3 音声入力サポート

#### 概要
音声入力を自然に統合し、手が塞がっている時でも記録可能に

#### 心理効果
- **労働の錯覚削減**: 入力の手間を最小化
- **アクセシビリティ**: より多くの状況で利用可能

#### 実装例

```typescript
const VoiceInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognition = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.lang = 'ja-JP';
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;

        // 音楽用語の認識精度向上
        const correctedTranscript = correctMusicTerms(transcript);
        setTranscript(correctedTranscript);
      };
    }
  }, []);

  const correctMusicTerms = (text: string) => {
    const corrections = {
      'こーど': 'コード',
      'すけーる': 'スケール',
      'りずむ': 'リズム',
      'めろでぃー': 'メロディー'
    };

    let corrected = text;
    Object.entries(corrections).forEach(([wrong, right]) => {
      corrected = corrected.replace(new RegExp(wrong, 'gi'), right);
    });

    return corrected;
  };

  return (
    <div className="voice-input-container">
      <button
        className={`voice-button ${isListening ? 'listening' : ''}`}
        onClick={toggleListening}
        aria-label="音声入力"
      >
        {isListening ? <MicActiveIcon /> : <MicIcon />}
      </button>

      {isListening && (
        <div className="voice-indicator">
          <div className="pulse-animation" />
          <span>聞いています...</span>
        </div>
      )}

      {transcript && (
        <div className="transcript-preview">
          {transcript}
        </div>
      )}
    </div>
  );
};
```

---

## 3. 応答パターン

### 3.1 タイピング・インジケーター

#### 概要
AI処理中に「入力中」を示すアニメーションで待機時間を心理的に短縮

#### 心理効果
- **労働の錯覚**: 処理の価値を演出
- **期待感の醸成**: 応答への期待を高める

#### 実装例

```typescript
const TypingIndicator = ({ isTyping }: { isTyping: boolean }) => {
  if (!isTyping) return null;

  return (
    <div className="typing-indicator">
      <div className="typing-dot" style={{ animationDelay: '0ms' }} />
      <div className="typing-dot" style={{ animationDelay: '150ms' }} />
      <div className="typing-dot" style={{ animationDelay: '300ms' }} />
    </div>
  );
};

// CSS
const styles = `
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 12px;
  }

  .typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
    animation: typing-bounce 1.4s infinite;
  }

  @keyframes typing-bounce {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.5;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }
`;
```

#### 測定指標
- 体感待機時間: -30%
- 離脱率: < 10%
- ユーザー満足度: +15%

---

### 3.2 段階的コンテンツ表示

#### 概要
長い応答を段階的に表示し、読みやすさと理解度を向上

#### 心理効果
- **段階的開示**: 情報過多を防ぐ
- **視覚的階層**: 重要度の明確化

#### 実装例

```typescript
const ProgressiveContent = ({ content }: { content: AIResponse }) => {
  const [visibleSections, setVisibleSections] = useState<number>(1);
  const sections = useMemo(() => parseContentSections(content), [content]);

  useEffect(() => {
    // 段階的に表示
    const timer = setInterval(() => {
      setVisibleSections(prev => {
        if (prev >= sections.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(timer);
  }, [sections.length]);

  return (
    <div className="progressive-content">
      {sections.slice(0, visibleSections).map((section, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`content-section ${section.type}`}
        >
          {section.type === 'summary' && (
            <div className="summary-block">
              <h4>要約</h4>
              <p>{section.content}</p>
            </div>
          )}

          {section.type === 'tags' && (
            <div className="tags-block">
              {section.tags.map(tag => (
                <Tag key={tag} label={tag} />
              ))}
            </div>
          )}

          {section.type === 'encouragement' && (
            <div className="encouragement-block">
              <span className="icon">💪</span>
              <p>{section.content}</p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
```

---

### 3.3 感情的フィードバック

#### 概要
ユーザーの行動に対して感情的な反応を示し、つながりを強化

#### 心理効果
- **ピーク・エンドの法則**: 印象的な締めくくり
- **ユーザー歓喜効果**: 予期せぬ喜び

#### 実装例

```typescript
const EmotionalFeedback = ({ achievement }: { achievement: Achievement }) => {
  const getEmotionalResponse = (type: AchievementType) => {
    const responses = {
      first_log: {
        emoji: '🎉',
        message: '記念すべき最初の記録です！',
        animation: 'celebration'
      },
      streak_7: {
        emoji: '🔥',
        message: '7日連続！素晴らしい継続力です',
        animation: 'fire'
      },
      milestone_100: {
        emoji: '💯',
        message: '100回目の記録達成！',
        animation: 'confetti'
      },
      improvement: {
        emoji: '📈',
        message: '着実に上達していますね',
        animation: 'growth'
      }
    };

    return responses[type] || {
      emoji: '👍',
      message: 'よくできました！',
      animation: 'thumbsup'
    };
  };

  const response = getEmotionalResponse(achievement.type);

  return (
    <motion.div
      className="emotional-feedback"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="emoji-large">{response.emoji}</div>
      <h3>{response.message}</h3>
      <AnimationEffect type={response.animation} />
    </motion.div>
  );
};
```

---

## 4. フィードバックパターン

### 4.1 マイクロインタラクション

#### 概要
小さなアニメーションやエフェクトで、操作への即座のフィードバック

#### 心理効果
- **ドハティの閾値**: 0.4秒以内の反応
- **美的ユーザビリティ効果**: 洗練された印象

#### 実装例

```typescript
const MicroInteractions = () => {
  return (
    <>
      {/* ボタンのホバーエフェクト */}
      <style>
        {`
          .interactive-button {
            transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
            transform: scale(1);
          }

          .interactive-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }

          .interactive-button:active {
            transform: scale(0.98);
          }

          /* 送信成功のパルスエフェクト */
          @keyframes success-pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
            }
          }

          .success-animation {
            animation: success-pulse 1s;
          }
        `}
      </style>

      <button className="interactive-button">
        送信
      </button>
    </>
  );
};
```

---

### 4.2 エラーリカバリー

#### 概要
エラー時も前向きな表現で、ユーザーの再試行を促す

#### 心理効果
- **フレーミング効果**: ポジティブな表現
- **損失回避**: 進捗を失わない安心感

#### 実装例

```typescript
const ErrorRecovery = ({ error, draft }: ErrorProps) => {
  const [isRecovering, setIsRecovering] = useState(false);

  const errorMessages = {
    network: {
      title: '一時的な接続の問題',
      message: 'インターネット接続を確認中です...',
      action: '自動的に再試行します',
      icon: '🔄'
    },
    validation: {
      title: '入力内容の確認',
      message: 'もう少し詳しく教えていただけますか？',
      action: '例: 「今日はCメジャーのスケール練習を30分」',
      icon: '💡'
    },
    server: {
      title: 'サーバーが混雑中',
      message: 'たくさんの方にご利用いただいています',
      action: 'もう一度試す',
      icon: '⏰'
    }
  };

  const errorType = determineErrorType(error);
  const errorInfo = errorMessages[errorType];

  // 下書きの自動保存
  useEffect(() => {
    if (draft) {
      localStorage.setItem('draft_message', draft);
    }
  }, [draft]);

  return (
    <div className="error-recovery">
      <div className="error-icon">{errorInfo.icon}</div>
      <h4>{errorInfo.title}</h4>
      <p>{errorInfo.message}</p>

      {draft && (
        <div className="draft-saved">
          <CheckIcon /> 入力内容は保存されています
        </div>
      )}

      <button
        onClick={handleRetry}
        disabled={isRecovering}
        className="retry-button"
      >
        {isRecovering ? '再試行中...' : errorInfo.action}
      </button>
    </div>
  );
};
```

---

## 5. ナビゲーションパターン

### 5.1 コンテキスト保持型スクロール

#### 概要
スクロール位置を記憶し、ユーザーの文脈を保持

#### 心理効果
- **認知負荷削減**: 位置を探す必要がない
- **継続性**: 中断からの再開が容易

#### 実装例

```typescript
const ContextualScroll = () => {
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const currentContext = useContext(ChatContext);

  // スクロール位置の保存
  const saveScrollPosition = useCallback(() => {
    const position = window.scrollY;
    scrollPositions.current.set(currentContext.id, position);
  }, [currentContext.id]);

  // スクロール位置の復元
  const restoreScrollPosition = useCallback(() => {
    const saved = scrollPositions.current.get(currentContext.id);
    if (saved !== undefined) {
      window.scrollTo({
        top: saved,
        behavior: 'instant'
      });
    }
  }, [currentContext.id]);

  useEffect(() => {
    restoreScrollPosition();

    const handleScroll = debounce(saveScrollPosition, 100);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      saveScrollPosition();
    };
  }, [currentContext.id]);

  return null;
};
```

---

## 6. パフォーマンスパターン

### 6.1 楽観的更新

#### 概要
サーバー応答を待たずに即座にUIを更新し、体感速度を向上

#### 心理効果
- **ドハティの閾値**: 即座の反応
- **制御感**: 操作への確信

#### 実装例

```typescript
const OptimisticChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, Message>>(new Map());

  const sendMessage = async (content: string) => {
    const tempId = generateTempId();
    const optimisticMessage: Message = {
      id: tempId,
      content,
      timestamp: new Date(),
      status: 'sending',
      isOptimistic: true
    };

    // 即座にUIに反映
    setOptimisticMessages(prev => new Map(prev).set(tempId, optimisticMessage));

    try {
      const response = await api.sendMessage(content);

      // 成功: 楽観的更新を確定
      setMessages(prev => [...prev, response]);
      setOptimisticMessages(prev => {
        const next = new Map(prev);
        next.delete(tempId);
        return next;
      });

    } catch (error) {
      // 失敗: 楽観的更新を取り消し
      setOptimisticMessages(prev => {
        const next = new Map(prev);
        const failed = next.get(tempId);
        if (failed) {
          next.set(tempId, { ...failed, status: 'failed' });
        }
        return next;
      });
    }
  };

  const allMessages = [
    ...messages,
    ...Array.from(optimisticMessages.values())
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className="chat-messages">
      {allMessages.map(message => (
        <MessageBubble
          key={message.id}
          message={message}
          isOptimistic={message.isOptimistic}
        />
      ))}
    </div>
  );
};
```

---

## 7. アクセシビリティパターン

### 7.1 キーボードナビゲーション

#### 概要
キーボードのみで全機能を操作可能に

#### 実装例

```typescript
const KeyboardNavigation = () => {
  const [focusIndex, setFocusIndex] = useState(0);
  const elements = useRef<HTMLElement[]>([]);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch(e.key) {
      case 'Tab':
        e.preventDefault();
        setFocusIndex(prev =>
          e.shiftKey
            ? Math.max(0, prev - 1)
            : Math.min(elements.current.length - 1, prev + 1)
        );
        break;

      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          sendMessage();
        }
        break;

      case 'Escape':
        closeModal();
        break;

      case '/':
        if (e.ctrlKey) {
          openCommandPalette();
        }
        break;
    }
  };

  useEffect(() => {
    elements.current[focusIndex]?.focus();
  }, [focusIndex]);

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Focusable elements */}
    </div>
  );
};
```

---

## 8. 測定と最適化

### 8.1 パターン効果測定ダッシュボード

```typescript
interface PatternMetrics {
  pattern: string;
  usage: number;
  successRate: number;
  userSatisfaction: number;
  performanceImpact: number;
}

const PatternAnalytics = () => {
  const metrics = usePatternMetrics();

  return (
    <div className="pattern-dashboard">
      {metrics.map(metric => (
        <div key={metric.pattern} className="metric-card">
          <h3>{metric.pattern}</h3>
          <div className="metric-grid">
            <div>使用回数: {metric.usage}</div>
            <div>成功率: {metric.successRate}%</div>
            <div>満足度: {metric.userSatisfaction}/5</div>
            <div>パフォーマンス: {metric.performanceImpact}ms</div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 9. パターンの組み合わせ例

### 9.1 完全なチャット体験

```typescript
const CompleteChatExperience = () => {
  return (
    <ChatContainer>
      {/* コンテキスト保持 */}
      <ContextualScroll />

      {/* メッセージ表示エリア */}
      <MessageArea>
        <OptimisticChat />
        <TypingIndicator />
        <EmotionalFeedback />
      </MessageArea>

      {/* 入力エリア */}
      <InputArea>
        <SmartPlaceholder />
        <InlineSuggest />
        <VoiceInput />
        <MicroInteractions />
      </InputArea>

      {/* エラー処理 */}
      <ErrorRecovery />

      {/* キーボード操作 */}
      <KeyboardNavigation />
    </ChatContainer>
  );
};
```

---

## 10. ベストプラクティス

### 10.1 Do's（推奨事項）

✅ **即座のフィードバック**: すべての操作に0.4秒以内で反応
✅ **予測可能な動作**: ユーザーの期待に沿った動き
✅ **エラーの優雅な処理**: 失敗を学習の機会に変える
✅ **文脈の保持**: 中断と再開をスムーズに
✅ **段階的な複雑性**: 必要に応じて機能を開示

### 10.2 Don'ts（避けるべきこと）

❌ **過度なアニメーション**: 気を散らす動き
❌ **強制的な待機**: 不必要なローディング
❌ **文脈の喪失**: スクロール位置や入力内容の消失
❌ **予測不能な変更**: 突然のレイアウト変更
❌ **アクセシビリティの軽視**: キーボード操作の欠如

---

**作成者**: MUEDnote UXチーム
**最終更新**: 2025-11-19
**次回レビュー**: 2025-12-01

> "良いデザインは目に見えない" - Dieter Rams