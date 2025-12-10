/**
 * Usage Example for useChatMatching Hook
 *
 * This file demonstrates how to use the chat-based mentor matching hook
 * in a React component.
 */

import { useState } from 'react';
import { useChatMatching } from '@/hooks/use-chat-matching';
import type { MentorProfile, MatchResult } from '@/types/matching';

export function ChatMatchingExample() {
  const [matchedMentor, setMatchedMentor] = useState<MentorProfile | null>(null);

  const {
    messages,
    currentStep,
    isLoading,
    extractedNeeds,
    suggestedMentors,
    error,
    sendMessage,
    handleQuickReply,
    selectMentor,
    resetConversation,
    retryLastAction,
  } = useChatMatching({
    onMentorSelected: (mentor: MentorProfile, matchResult: MatchResult) => {
      console.log('Mentor selected:', mentor.name);
      console.log('Match score:', matchResult.score.totalScore);
      setMatchedMentor(mentor);
      // Navigate to mentor detail page or booking flow
    },
    onStepChange: (step, data) => {
      console.log('Step changed:', step, data);
      // Track analytics
    },
    maxSuggestions: 3,
  });

  return (
    <div className="chat-matching-container">
      <h1>メンターを見つける</h1>

      {/* Current Step Indicator */}
      <div className="step-indicator">
        現在のステップ: {currentStep}
      </div>

      {/* Extracted Needs Display */}
      {Object.keys(extractedNeeds).length > 0 && (
        <div className="extracted-needs">
          <h3>抽出された希望条件:</h3>
          <ul>
            {extractedNeeds.instrument && <li>楽器: {extractedNeeds.instrument}</li>}
            {extractedNeeds.skillLevel && <li>レベル: {extractedNeeds.skillLevel}</li>}
            {extractedNeeds.learningGoals && (
              <li>目標: {extractedNeeds.learningGoals.join(', ')}</li>
            )}
          </ul>
        </div>
      )}

      {/* Chat Messages */}
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-content">
              {/* Text Content */}
              {message.content.text && <p>{message.content.text}</p>}

              {/* Quick Replies */}
              {message.content.quickReplies && (
                <div className="quick-replies">
                  {message.content.quickReplies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleQuickReply(reply)}
                      disabled={isLoading}
                      className="quick-reply-button"
                    >
                      {reply.icon && <span>{reply.icon}</span>}
                      {reply.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Mentor Suggestions */}
              {message.content.mentorSuggestions && (
                <div className="mentor-suggestions">
                  {message.content.mentorSuggestions.map((suggestion) => (
                    <div key={suggestion.mentor.id} className="mentor-card">
                      <img src={suggestion.mentor.imageUrl} alt={suggestion.mentor.name} />
                      <h4>{suggestion.mentor.name}</h4>
                      <p>{suggestion.reasonSummary}</p>
                      <p>マッチスコア: {suggestion.matchResult.score.totalScore}%</p>
                      {suggestion.isTopPick && <span className="badge">トップピック</span>}
                      <button
                        onClick={() => selectMentor(suggestion.mentor)}
                        className="select-button"
                      >
                        このメンターを選ぶ
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Loading Indicator */}
              {message.content.type === 'loading' && (
                <div className="loading-indicator">
                  <span className="spinner" />
                  {message.content.text}
                </div>
              )}
            </div>

            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString('ja-JP')}
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={retryLastAction}>再試行</button>
        </div>
      )}

      {/* Chat Input */}
      {currentStep !== 'selected' && (
        <div className="chat-input">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
              if (input.value.trim()) {
                sendMessage(input.value);
                input.value = '';
              }
            }}
          >
            <input
              type="text"
              name="message"
              placeholder="メッセージを入力..."
              disabled={isLoading}
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading}>
              送信
            </button>
          </form>
        </div>
      )}

      {/* Reset Button */}
      <button onClick={resetConversation} className="reset-button">
        最初からやり直す
      </button>

      {/* Matched Mentor Display */}
      {matchedMentor && (
        <div className="matched-mentor">
          <h2>選択されたメンター</h2>
          <p>{matchedMentor.name}</p>
          {/* Show booking options, etc. */}
        </div>
      )}
    </div>
  );
}

/**
 * Advanced Example: With Custom Initial Profile
 */
export function ChatMatchingWithProfile() {
  const {
    messages,
    sendMessage,
    // ... other methods
  } = useChatMatching({
    onMentorSelected: (mentor) => {
      console.log('Selected:', mentor.name);
    },
    // Pre-fill with user's profile data
    initialUserProfile: {
      instrument: 'ピアノ',
      skillLevel: 'intermediate',
      preferredGenres: ['クラシック', 'ジャズ'],
    },
  });

  return (
    <div>
      {/* The AI will already know the user plays piano at intermediate level */}
      {/* Messages will be more contextual */}
    </div>
  );
}

/**
 * Integration Example: With Analytics
 */
export function ChatMatchingWithAnalytics() {
  const {
    messages,
    currentStep,
    extractedNeeds,
    sendMessage,
  } = useChatMatching({
    onMentorSelected: (mentor, matchResult) => {
      // Track conversion
      window.analytics?.track('Mentor Selected', {
        mentorId: mentor.id,
        matchScore: matchResult.score.totalScore,
        isPerfectMatch: matchResult.isPerfectMatch,
      });
    },
    onStepChange: (step, data) => {
      // Track step progression
      window.analytics?.track('Matching Step Changed', {
        step,
        messageCount: data?.messageCount,
        extractedFields: Object.keys(extractedNeeds).length,
      });
    },
  });

  return <div>{/* Component UI */}</div>;
}

// Declare analytics for TypeScript
declare global {
  interface Window {
    analytics?: {
      track: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}
