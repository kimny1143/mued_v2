/**
 * Chat-based Mentor Matching Hook
 *
 * UX Psychology-driven conversational matching for MUED LMS
 * Reduces cognitive load through progressive disclosure
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ChatMessage,
  MatchingStep,
  ExtractedUserNeeds,
  MentorSuggestion,
  QuickReply,
  UseChatMatchingReturn,
  ChatMatchingResponse,
  MentorSearchResponse,
} from '@/types/chat-matching';
import type { MentorProfile, MatchResult } from '@/types/matching';

interface UseChatMatchingProps {
  onMentorSelected: (mentor: MentorProfile, matchResult: MatchResult) => void;
  initialUserProfile?: Partial<ExtractedUserNeeds>;
  onStepChange?: (step: MatchingStep, data?: Record<string, unknown>) => void;
  maxSuggestions?: number;
}

// Initial AI greeting with quick replies
const INITIAL_GREETING: ChatMessage = {
  id: crypto.randomUUID(),
  role: 'assistant',
  content: {
    type: 'text',
    text: 'こんにちは！あなたにぴったりのメンターを見つけるお手伝いをします。まず、どんな楽器を学びたいですか？',
    quickReplies: [
      { id: 'piano', label: 'ピアノ', value: 'ピアノ', icon: '🎹' },
      { id: 'guitar', label: 'ギター', value: 'ギター', icon: '🎸' },
      { id: 'violin', label: 'バイオリン', value: 'バイオリン', icon: '🎻' },
      { id: 'drums', label: 'ドラム', value: 'ドラム', icon: '🥁' },
      { id: 'other', label: 'その他', value: 'その他の楽器', icon: '🎵' },
    ],
  },
  timestamp: new Date(),
  metadata: {
    step: 'greeting',
  },
};

export function useChatMatching({
  onMentorSelected,
  initialUserProfile,
  onStepChange,
  maxSuggestions = 3,
}: UseChatMatchingProps): UseChatMatchingReturn {
  // ========================================
  // State Management
  // ========================================
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [currentStep, setCurrentStep] = useState<MatchingStep>('greeting');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedNeeds, setExtractedNeeds] = useState<Partial<ExtractedUserNeeds>>(
    initialUserProfile || {}
  );
  const [suggestedMentors, setSuggestedMentors] = useState<MentorSuggestion[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());

  // Keep track of last action for retry
  const lastActionRef = useRef<(() => Promise<void>) | null>(null);

  // ========================================
  // Side Effects
  // ========================================

  // Notify step changes
  useEffect(() => {
    onStepChange?.(currentStep, {
      extractedNeeds,
      messageCount: messages.length,
      hasSuggestions: suggestedMentors.length > 0,
    });
  }, [currentStep, extractedNeeds, messages.length, suggestedMentors.length, onStepChange]);

  // ========================================
  // Helper Functions
  // ========================================

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  const updateStep = useCallback((step: MatchingStep) => {
    setCurrentStep(step);
  }, []);

  // ========================================
  // Core API Functions
  // ========================================

  const callChatAPI = useCallback(
    async (userMessage: string): Promise<ChatMatchingResponse> => {
      const response = await fetch('/api/mentor-matching/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          conversationHistory: messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role,
              content: typeof m.content === 'string' ? m.content : m.content.text || '',
            })),
          currentStep,
          extractedNeeds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'チャット処理に失敗しました');
      }

      return response.json();
    },
    [sessionId, messages, currentStep, extractedNeeds]
  );

  const searchMentors = useCallback(
    async (criteria: ChatMatchingResponse['searchCriteria']): Promise<MentorSearchResponse> => {
      if (!criteria) {
        throw new Error('検索条件が指定されていません');
      }

      const response = await fetch('/api/mentor-matching/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          criteria,
          limit: maxSuggestions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'メンター検索に失敗しました');
      }

      return response.json();
    },
    [sessionId, maxSuggestions]
  );

  // ========================================
  // Main Actions
  // ========================================

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Clear any previous errors
      setError(null);

      // Add user message
      addMessage({
        role: 'user',
        content: { type: 'text', text },
      });

      setIsLoading(true);

      const action = async () => {
        try {
          // Call chat API
          const chatResponse = await callChatAPI(text);

          // Update extracted needs
          setExtractedNeeds((prev) => ({
            ...prev,
            ...chatResponse.extractedNeeds,
          }));

          // Update step
          updateStep(chatResponse.nextStep);

          // Add assistant response
          addMessage({
            role: 'assistant',
            content: {
              type: 'text',
              text: chatResponse.message,
              quickReplies: chatResponse.quickReplies?.map((qr) => ({
                id: crypto.randomUUID(),
                ...qr,
              })),
            },
            metadata: {
              step: chatResponse.nextStep,
              confidence: chatResponse.confidence,
              extractedData: chatResponse.extractedNeeds,
            },
          });

          // If AI says we should search for mentors, do it
          if (chatResponse.shouldSearchMentors) {
            updateStep('searching');

            // Add searching indicator
            addMessage({
              role: 'assistant',
              content: {
                type: 'loading',
                text: 'あなたにぴったりのメンターを探しています...',
              },
              metadata: { step: 'searching' },
            });

            // Search for mentors
            const searchResponse = await searchMentors(chatResponse.searchCriteria);

            // Update state with suggestions
            setSuggestedMentors(searchResponse.mentors);
            updateStep('suggesting');

            // Add mentor suggestions message
            addMessage({
              role: 'assistant',
              content: {
                type: 'mentor_suggestions',
                text: `${searchResponse.totalFound}名のメンターが見つかりました！トップ${searchResponse.mentors.length}名をご紹介します：`,
                mentorSuggestions: searchResponse.mentors,
              },
              metadata: { step: 'suggesting' },
            });
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : '予期しないエラーが発生しました';
          setError(errorMessage);
          updateStep('error');

          addMessage({
            role: 'assistant',
            content: {
              type: 'text',
              text: `申し訳ございません。${errorMessage}\n\nもう一度お試しいただけますか？`,
            },
            metadata: { step: 'error' },
          });
        } finally {
          setIsLoading(false);
        }
      };

      // Save for retry
      lastActionRef.current = action;
      await action();
    },
    [
      isLoading,
      addMessage,
      callChatAPI,
      updateStep,
      searchMentors,
    ]
  );

  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      sendMessage(reply.value);
    },
    [sendMessage]
  );

  const selectMentor = useCallback(
    (mentor: MentorProfile) => {
      setSelectedMentor(mentor);
      updateStep('selected');

      // Find the match result for this mentor
      const matchResult = suggestedMentors.find((s) => s.mentor.id === mentor.id)?.matchResult;

      if (matchResult) {
        onMentorSelected(mentor, matchResult);
      }

      // Add confirmation message
      addMessage({
        role: 'assistant',
        content: {
          type: 'text',
          text: `${mentor.name}さんを選択されました！詳細を確認して、体験レッスンを予約しましょう。`,
        },
        metadata: { step: 'selected' },
      });
    },
    [suggestedMentors, onMentorSelected, updateStep, addMessage]
  );

  const resetConversation = useCallback(() => {
    setMessages([INITIAL_GREETING]);
    setCurrentStep('greeting');
    setIsLoading(false);
    setExtractedNeeds(initialUserProfile || {});
    setSuggestedMentors([]);
    setSelectedMentor(null);
    setError(null);
    lastActionRef.current = null;
  }, [initialUserProfile]);

  const retryLastAction = useCallback(async () => {
    if (lastActionRef.current) {
      setError(null);
      await lastActionRef.current();
    }
  }, []);

  // ========================================
  // Return Hook Interface
  // ========================================

  return {
    // State
    messages,
    currentStep,
    isLoading,
    extractedNeeds,
    suggestedMentors,
    selectedMentor,
    error,

    // Actions
    sendMessage,
    selectMentor,
    handleQuickReply,
    resetConversation,
    retryLastAction,
  };
}
