/**
 * Chat Matching Panel Component
 * Main container for conversational mentor matching
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { TypingIndicator } from './typing-indicator';
import { MentorDetailModal } from './mentor-detail-modal';
import type {
  ChatMatchingPanelProps,
  ChatMessage as ChatMessageType,
  MatchingStep,
  ExtractedUserNeeds,
  QuickReply,
} from '@/types/chat-matching';
import type { MentorProfile } from '@/types/matching';

const INITIAL_GREETING =
  'こんにちは！あなたにぴったりのメンターを見つけるお手伝いをします。どんな楽器や音楽を学びたいですか？';

const INITIAL_QUICK_REPLIES: QuickReply[] = [
  { id: '1', label: 'ピアノ', value: 'ピアノを学びたいです', icon: '🎹' },
  { id: '2', label: 'ギター', value: 'ギターを学びたいです', icon: '🎸' },
  { id: '3', label: 'ボーカル', value: 'ボーカル・歌を学びたいです', icon: '🎤' },
  { id: '4', label: 'その他', value: '他の楽器や音楽理論を学びたいです', icon: '🎵' },
];

// Fixed storage key for session persistence across component remounts
const SESSION_STORAGE_KEY = 'chat-matching-session-id';
const CHAT_STORAGE_KEY = 'chat-matching-data';

// Helper to get or create a persistent session ID
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID();

  const existingId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existingId) return existingId;

  const newId = crypto.randomUUID();
  localStorage.setItem(SESSION_STORAGE_KEY, newId);
  return newId;
}

export function ChatMatchingPanel({
  onMentorSelected,
  initialUserProfile: _initialUserProfile,
  onStepChange: _onStepChange,
  customGreeting,
  maxSuggestions: _maxSuggestions = 3,
  className = '',
}: ChatMatchingPanelProps) {
  // State for chat UI
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<MatchingStep>('greeting');
  const [extractedNeeds, setExtractedNeeds] = useState<Partial<ExtractedUserNeeds>>({});
  const [sessionId] = useState(() => getOrCreateSessionId());

  // State for mentor detail modal
  const [selectedMentorForDetail, setSelectedMentorForDetail] = useState<MentorProfile | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting message or restore from localStorage
  useEffect(() => {
    // Try to restore from localStorage first (using fixed key)
    const savedData = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        console.log('[ChatMatchingPanel] Restoring chat from localStorage:', {
          messageCount: parsed.messages?.length,
          currentStep: parsed.currentStep,
        });
        setMessages(parsed.messages.map((m: ChatMessageType) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
        setCurrentStep(parsed.currentStep || 'greeting');
        setExtractedNeeds(parsed.extractedNeeds || {});
        return;
      } catch {
        // If parsing fails, start fresh
        console.warn('[ChatMatchingPanel] Failed to parse localStorage, starting fresh');
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    }

    // Start fresh with greeting
    console.log('[ChatMatchingPanel] Starting fresh chat session');
    const greetingMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: {
        type: 'text',
        text: customGreeting || INITIAL_GREETING,
        quickReplies: INITIAL_QUICK_REPLIES,
      },
      timestamp: new Date(),
      metadata: { step: 'greeting' },
    };
    setMessages([greetingMessage]);
  }, [customGreeting]);

  // Persist to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
        messages,
        currentStep,
        extractedNeeds,
        sessionId, // Save sessionId for DB continuity
        updatedAt: new Date().toISOString(),
      }));
    }
  }, [messages, currentStep, extractedNeeds, sessionId]);

  // Note: Chat messages are now saved to DB in the API (/api/mentor-matching/chat)
  // No client-side file saving needed

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  // Call chat API
  const callChatAPI = useCallback(
    async (userText: string): Promise<{
      message: string;
      quickReplies?: QuickReply[];
      nextStep: MatchingStep;
      extractedNeeds: Partial<ExtractedUserNeeds>;
      shouldSearchMentors: boolean;
      searchCriteria?: Record<string, unknown>;
    }> => {
      const conversationHistory = messages
        .filter((m) => m.content.type === 'text')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content.text || '',
        }));

      const response = await fetch('/api/mentor-matching/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userText,
          conversationHistory,
          currentStep,
          extractedNeeds,
        }),
      });

      if (!response.ok) {
        throw new Error('チャットAPIの呼び出しに失敗しました');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'エラーが発生しました');
      }

      const quickReplies: QuickReply[] | undefined = data.data.quickReplies?.map(
        (qr: { label: string; value: string }, idx: number) => ({
          id: `qr-${idx}`,
          label: qr.label,
          value: qr.value,
        })
      );

      return {
        message: data.data.message,
        quickReplies,
        nextStep: data.data.nextStep,
        extractedNeeds: data.data.extractedNeeds,
        shouldSearchMentors: data.data.shouldSearchMentors ?? false,
        searchCriteria: data.data.searchCriteria,
      };
    },
    [messages, sessionId, currentStep, extractedNeeds]
  );

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: {
        type: 'text',
        text: userText,
      },
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await callChatAPI(userText);

      const aiResponse: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: {
          // quickReplies がある場合は 'quick_replies' タイプにして選択肢ボタンを表示
          type: result.quickReplies && result.quickReplies.length > 0 ? 'quick_replies' : 'text',
          text: result.message,
          quickReplies: result.quickReplies,
        },
        timestamp: new Date(),
        metadata: {
          step: result.nextStep,
          extractedData: result.extractedNeeds,
        },
      };

      setMessages((prev) => [...prev, aiResponse]);
      setCurrentStep(result.nextStep);
      setExtractedNeeds((prev) => ({ ...prev, ...result.extractedNeeds }));

      // If AI says to search mentors, call the search API
      if (result.shouldSearchMentors) {
        // Build search criteria from extractedNeeds if searchCriteria is not provided
        const searchCriteria = result.searchCriteria || {
          instrument: result.extractedNeeds.instrument,
          skillLevel: result.extractedNeeds.skillLevel,
          learningGoals: result.extractedNeeds.learningGoals,
          genres: result.extractedNeeds.preferredGenres,
        };

        // Add a "searching" message
        const searchingMessage: ChatMessageType = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: {
            type: 'text',
            text: '🔍 メンターを検索中...',
          },
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, searchingMessage]);

        try {
          const searchResponse = await fetch('/api/mentor-matching/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              criteria: searchCriteria,
              limit: 5,
            }),
          });

          if (!searchResponse.ok) {
            throw new Error('メンター検索に失敗しました');
          }

          const searchData = await searchResponse.json();

          // Remove the "searching" message and add results
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.content.text !== '🔍 メンターを検索中...');

            if (searchData.success && searchData.data.mentors.length > 0) {
              const resultsMessage: ChatMessageType = {
                id: (Date.now() + 3).toString(),
                role: 'assistant',
                content: {
                  type: 'mentor_suggestions',
                  text: `${searchData.data.mentors.length}名のメンターが見つかりました！`,
                  mentorSuggestions: searchData.data.mentors,
                },
                timestamp: new Date(),
              };
              return [...filtered, resultsMessage];
            } else {
              const noResultsMessage: ChatMessageType = {
                id: (Date.now() + 3).toString(),
                role: 'assistant',
                content: {
                  type: 'text',
                  text: '申し訳ありません、現在の条件に合うメンターが見つかりませんでした。条件を変更してみますか？',
                },
                timestamp: new Date(),
              };
              return [...filtered, noResultsMessage];
            }
          });
        } catch (searchError) {
          // Remove searching message on error
          setMessages((prev) => prev.filter((m) => m.content.text !== '🔍 メンターを検索中...'));
          setError(searchError instanceof Error ? searchError.message : 'メンター検索でエラーが発生しました');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to auto-send when inputValue is set from quick reply
  const [pendingQuickReply, setPendingQuickReply] = useState(false);

  const handleQuickReplyWithSend = (reply: { label: string; value: string }) => {
    // Use label for display (shows Japanese text like "ポップ" instead of "pop")
    setInputValue(reply.label);
    setPendingQuickReply(true);
  };

  useEffect(() => {
    if (pendingQuickReply && inputValue.trim()) {
      handleSendMessage();
      setPendingQuickReply(false);
    }
  }, [pendingQuickReply, inputValue]);

  // Handle mentor selection - open detail modal instead of navigating away
  const handleMentorSelect = (mentor: MentorProfile) => {
    console.log('[ChatMatchingPanel] Opening mentor detail modal:', mentor.name);
    setSelectedMentorForDetail(mentor);
    setIsDetailModalOpen(true);
  };

  // Handle booking from modal
  const handleBookSlot = async (slotId: string) => {
    console.log('[ChatMatchingPanel] Booking slot:', slotId);
    setIsDetailModalOpen(false);

    // Add booking message to chat
    const bookingMessage: ChatMessageType = {
      id: (Date.now()).toString(),
      role: 'assistant',
      content: {
        type: 'text',
        text: `${selectedMentorForDetail?.name}さんのレッスンを予約しています...`,
      },
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, bookingMessage]);

    // Navigate to payment/booking flow with slot ID
    // For now, we'll call onMentorSelected to maintain compatibility
    if (selectedMentorForDetail) {
      const mockMatchResult = {
        mentor: selectedMentorForDetail,
        score: {
          mentorId: selectedMentorForDetail.id,
          totalScore: 85,
          breakdown: {
            skillLevelMatch: 20,
            goalAlignment: 18,
            scheduleOverlap: 16,
            priceCompatibility: 12,
            reviewScore: 9,
            genreMatch: 10,
          },
          reasoning: ['目標に合致', 'スケジュール調整可能'],
        },
        isRecommended: true,
        isPerfectMatch: false,
      };
      onMentorSelected(selectedMentorForDetail, mockMatchResult);
    }
  };

  // Close modal handler
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMentorForDetail(null);
  };

  // Handle retry on error
  const handleRetry = () => {
    setError(null);
    // TODO: Implement retry logic via useChatMatching hook
  };

  // Start a new conversation (clears local state, keeps DB history)
  const handleStartNewConversation = () => {
    // Clear localStorage
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);

    // Generate new session ID
    const newSessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);

    // Reset state
    setMessages([]);
    setCurrentStep('greeting');
    setExtractedNeeds({});
    setError(null);

    // Add greeting message
    const greetingMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: {
        type: 'text',
        text: customGreeting || INITIAL_GREETING,
        quickReplies: INITIAL_QUICK_REPLIES,
      },
      timestamp: new Date(),
      metadata: { step: 'greeting' },
    };
    setMessages([greetingMessage]);

    console.log('[ChatMatchingPanel] Started new conversation, sessionId:', newSessionId);
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <CardHeader className="border-b border-gray-200 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
              AI
            </div>
            <div>
              <h2 className="text-lg font-semibold">AIメンターマッチング</h2>
              <p className="text-xs text-gray-500 font-normal">
                会話であなたに最適なメンターを見つけます
              </p>
            </div>
          </div>
          {/* New Conversation Button */}
          {messages.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartNewConversation}
              className="text-xs"
            >
              新しい会話
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 min-h-0" ref={messagesContainerRef}>
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              再試行
            </Button>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onQuickReplyClick={handleQuickReplyWithSend}
              onMentorSelect={handleMentorSelect}
            />
          ))}

          {/* Typing Indicator */}
          <TypingIndicator
            isVisible={isLoading}
            contextMessage="メンターを検索中..."
          />
        </div>

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="flex-shrink-0">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSendMessage}
          isDisabled={isLoading}
          placeholder="メッセージを入力..."
          quickActions={[]}
        />
      </div>

      {/* Mentor Detail Modal */}
      <MentorDetailModal
        mentor={selectedMentorForDetail}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onBookSlot={handleBookSlot}
      />
    </Card>
  );
}
