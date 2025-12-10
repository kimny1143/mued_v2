/**
 * Unit Tests for useChatMatching Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useChatMatching } from '@/hooks/use-chat-matching';
import type { MentorProfile, MatchResult } from '@/types/matching';
import type { ChatMatchingResponse, MentorSearchResponse } from '@/types/chat-matching';

// Mock fetch globally
global.fetch = vi.fn();

describe('useChatMatching', () => {
  const mockOnMentorSelected = vi.fn();
  const mockOnStepChange = vi.fn();

  const defaultProps = {
    onMentorSelected: mockOnMentorSelected,
    onStepChange: mockOnStepChange,
    maxSuggestions: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with greeting state', () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      expect(result.current.currentStep).toBe('greeting');
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('assistant');
      expect(result.current.messages[0].content.type).toBe('text');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should include quick replies in greeting message', () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      const greeting = result.current.messages[0];
      expect(greeting.content.quickReplies).toBeDefined();
      expect(greeting.content.quickReplies?.length).toBeGreaterThan(0);
    });

    it('should use initial user profile if provided', () => {
      const initialProfile = {
        instrument: 'ピアノ',
        skillLevel: 'beginner' as const,
      };

      const { result } = renderHook(() =>
        useChatMatching({ ...defaultProps, initialUserProfile: initialProfile })
      );

      expect(result.current.extractedNeeds).toEqual(initialProfile);
    });

    it('should call onStepChange on initialization', () => {
      renderHook(() => useChatMatching(defaultProps));

      expect(mockOnStepChange).toHaveBeenCalledWith('greeting', expect.any(Object));
    });
  });

  describe('sendMessage', () => {
    it('should add user message to conversation', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      const mockResponse: ChatMatchingResponse = {
        message: 'ピアノですね！レベルはどのくらいですか？',
        nextStep: 'gathering_details',
        extractedNeeds: { instrument: 'ピアノ' },
        shouldSearchMentors: false,
        confidence: 0.9,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await act(async () => {
        await result.current.sendMessage('ピアノ');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(1);
      });

      const userMessage = result.current.messages.find((m) => m.role === 'user');
      expect(userMessage?.content.text).toBe('ピアノ');
    });

    it('should update extracted needs from API response', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      const mockResponse: ChatMatchingResponse = {
        message: 'わかりました！',
        nextStep: 'gathering_details',
        extractedNeeds: { instrument: 'ピアノ', skillLevel: 'beginner' },
        shouldSearchMentors: false,
        confidence: 0.85,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await act(async () => {
        await result.current.sendMessage('初心者です');
      });

      await waitFor(() => {
        expect(result.current.extractedNeeds.skillLevel).toBe('beginner');
      });

      expect(result.current.extractedNeeds.instrument).toBe('ピアノ');
    });

    it('should transition to searching when shouldSearchMentors is true', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      const mockChatResponse: ChatMatchingResponse = {
        message: 'メンターを探しています...',
        nextStep: 'searching',
        extractedNeeds: {},
        shouldSearchMentors: true,
        searchCriteria: {
          skillLevel: 'beginner',
          learningGoals: ['基礎を学びたい'],
        },
        confidence: 0.9,
      };

      const mockMentor: MentorProfile = {
        id: 'mentor-1',
        name: '田中先生',
        avatar: '/avatars/tanaka.jpg',
        bio: 'ピアノ指導歴10年',
        specialties: ['ピアノ', 'クラシック'],
        experience: ['音大卒業', '指導経験10年'],
        genres: ['クラシック', 'ポップス'],
        skillLevels: ['beginner', 'intermediate'],
        hourlyRate: 5000,
        rating: 4.8,
        totalReviews: 120,
        availability: {
          monday: ['10:00', '14:00'],
          wednesday: ['10:00', '14:00'],
          friday: ['10:00', '14:00'],
        },
        responseTime: '24時間以内',
      };

      const mockMatchResult: MatchResult = {
        mentor: mockMentor,
        score: {
          totalScore: 92,
          skillLevelMatch: 95,
          genreMatch: 90,
          experienceMatch: 88,
          availabilityMatch: 95,
          priceMatch: 90,
        },
        reasons: ['初心者向けの丁寧な指導'],
        isRecommended: true,
        isPerfectMatch: true,
      };

      const mockSearchResponse: MentorSearchResponse = {
        mentors: [
          {
            mentor: mockMentor,
            matchResult: mockMatchResult,
            reasonSummary: '初心者に最適な先生です',
            isTopPick: true,
          },
        ],
        totalFound: 5,
        searchQuality: 0.92,
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockChatResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse,
        });

      await act(async () => {
        await result.current.sendMessage('はい、お願いします');
      });

      await waitFor(() => {
        expect(result.current.currentStep).toBe('suggesting');
      });

      expect(result.current.suggestedMentors).toHaveLength(1);
      expect(result.current.suggestedMentors[0].mentor.id).toBe('mentor-1');
    });

    it('should handle API errors gracefully', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'サーバーエラー' }),
      });

      await act(async () => {
        await result.current.sendMessage('テスト');
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.currentStep).toBe('error');
      expect(result.current.error).toContain('サーバーエラー');
    });

    it('should not send empty messages', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      const initialMessageCount = result.current.messages.length;

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(result.current.messages.length).toBe(initialMessageCount);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('handleQuickReply', () => {
    it('should send message with quick reply value', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      const mockResponse: ChatMatchingResponse = {
        message: 'ピアノですね！',
        nextStep: 'gathering_details',
        extractedNeeds: { instrument: 'ピアノ' },
        shouldSearchMentors: false,
        confidence: 1.0,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quickReply = {
        id: 'piano',
        label: 'ピアノ',
        value: 'ピアノ',
        icon: '🎹',
      };

      await act(async () => {
        result.current.handleQuickReply(quickReply);
      });

      await waitFor(() => {
        const userMessage = result.current.messages.find((m) => m.role === 'user');
        expect(userMessage?.content.text).toBe('ピアノ');
      });
    });
  });

  describe('selectMentor', () => {
    it('should update selected mentor and call callback', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      const mockMentor: MentorProfile = {
        id: 'mentor-1',
        name: '田中先生',
        avatar: '/avatars/tanaka.jpg',
        bio: 'ピアノ指導歴10年',
        specialties: ['ピアノ'],
        experience: ['音大卒業'],
        genres: ['クラシック'],
        skillLevels: ['beginner'],
        hourlyRate: 5000,
        rating: 4.8,
        totalReviews: 120,
        availability: {},
        responseTime: '24時間以内',
      };

      const mockMatchResult: MatchResult = {
        mentor: mockMentor,
        score: {
          totalScore: 92,
          skillLevelMatch: 95,
          genreMatch: 90,
          experienceMatch: 88,
          availabilityMatch: 95,
          priceMatch: 90,
        },
        reasons: ['excellent match'],
        isRecommended: true,
        isPerfectMatch: true,
      };

      // Set up suggested mentors first
      act(() => {
        result.current.suggestedMentors.push({
          mentor: mockMentor,
          matchResult: mockMatchResult,
          reasonSummary: '初心者に最適',
          isTopPick: true,
        });
      });

      await act(async () => {
        result.current.selectMentor(mockMentor);
      });

      expect(result.current.selectedMentor).toEqual(mockMentor);
      expect(result.current.currentStep).toBe('selected');
      expect(mockOnMentorSelected).toHaveBeenCalledWith(mockMentor, mockMatchResult);
    });
  });

  describe('resetConversation', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      // First, modify the state
      const mockResponse: ChatMatchingResponse = {
        message: 'テスト',
        nextStep: 'gathering_details',
        extractedNeeds: { instrument: 'ピアノ' },
        shouldSearchMentors: false,
        confidence: 0.9,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await act(async () => {
        await result.current.sendMessage('ピアノ');
      });

      // Then reset
      act(() => {
        result.current.resetConversation();
      });

      expect(result.current.currentStep).toBe('greeting');
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.extractedNeeds).toEqual({});
      expect(result.current.suggestedMentors).toHaveLength(0);
      expect(result.current.selectedMentor).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should preserve initial user profile on reset', () => {
      const initialProfile = { instrument: 'ギター' };
      const { result } = renderHook(() =>
        useChatMatching({ ...defaultProps, initialUserProfile: initialProfile })
      );

      act(() => {
        result.current.resetConversation();
      });

      expect(result.current.extractedNeeds).toEqual(initialProfile);
    });
  });

  describe('retryLastAction', () => {
    it('should retry last failed action', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      // First attempt - fail
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Network error' }),
      });

      await act(async () => {
        await result.current.sendMessage('テスト');
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second attempt - succeed
      const mockResponse: ChatMatchingResponse = {
        message: '成功しました',
        nextStep: 'gathering_details',
        extractedNeeds: {},
        shouldSearchMentors: false,
        confidence: 0.9,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await act(async () => {
        await result.current.retryLastAction();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Step Transitions', () => {
    it('should notify step changes through callback', async () => {
      const { result } = renderHook(() => useChatMatching(defaultProps));

      const mockResponse: ChatMatchingResponse = {
        message: 'レベルをお聞かせください',
        nextStep: 'gathering_details',
        extractedNeeds: { instrument: 'ピアノ' },
        shouldSearchMentors: false,
        confidence: 0.9,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await act(async () => {
        await result.current.sendMessage('ピアノ');
      });

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(
          'gathering_details',
          expect.objectContaining({
            extractedNeeds: expect.objectContaining({ instrument: 'ピアノ' }),
          })
        );
      });
    });
  });
});
