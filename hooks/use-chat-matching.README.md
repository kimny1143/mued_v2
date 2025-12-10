# useChatMatching Hook

Chat-based mentor matching hook for MUED LMS that implements UX Psychology-driven conversational matching to reduce cognitive load from 9/10 to 4/10 through progressive disclosure.

## Overview

The `useChatMatching` hook provides a complete state management solution for implementing a conversational AI-powered mentor matching experience. It handles:

- Progressive disclosure of matching questions
- Real-time conversation with AI assistant
- Automatic extraction of user needs and preferences
- Mentor search and suggestion presentation
- Error handling and retry logic
- Session management

## Installation

```typescript
import { useChatMatching } from '@/hooks/use-chat-matching';
```

## Basic Usage

```typescript
function MentorMatchingPage() {
  const {
    messages,
    currentStep,
    sendMessage,
    handleQuickReply,
    selectMentor,
  } = useChatMatching({
    onMentorSelected: (mentor, matchResult) => {
      // Handle mentor selection
      console.log(`Selected ${mentor.name} with score ${matchResult.score.totalScore}`);
    },
  });

  return (
    <div>
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
```

## API Reference

### Parameters

```typescript
interface UseChatMatchingProps {
  onMentorSelected: (mentor: MentorProfile, matchResult: MatchResult) => void;
  initialUserProfile?: Partial<ExtractedUserNeeds>;
  onStepChange?: (step: MatchingStep, data?: Record<string, unknown>) => void;
  maxSuggestions?: number;
}
```

#### `onMentorSelected` (required)

Callback function invoked when user selects a mentor from suggestions.

**Parameters:**
- `mentor: MentorProfile` - The selected mentor's profile
- `matchResult: MatchResult` - The matching algorithm's result including scores and reasons

**Example:**
```typescript
onMentorSelected: (mentor, matchResult) => {
  router.push(`/mentors/${mentor.id}/book`);
  analytics.track('Mentor Selected', {
    mentorId: mentor.id,
    score: matchResult.score.totalScore,
  });
}
```

#### `initialUserProfile` (optional)

Pre-fill the conversation with existing user profile data. Useful when user has already provided some information elsewhere.

**Example:**
```typescript
initialUserProfile: {
  instrument: 'ピアノ',
  skillLevel: 'intermediate',
  preferredGenres: ['クラシック'],
}
```

#### `onStepChange` (optional)

Callback for tracking step transitions. Useful for analytics and progress indicators.

**Parameters:**
- `step: MatchingStep` - The current matching step
- `data?: Record<string, unknown>` - Additional context (extractedNeeds, messageCount, etc.)

**Example:**
```typescript
onStepChange: (step, data) => {
  setProgressPercentage(getProgressForStep(step));
  analytics.track('Matching Step', { step, ...data });
}
```

#### `maxSuggestions` (optional)

Maximum number of mentor suggestions to return. Default: `3`

### Return Values

```typescript
interface UseChatMatchingReturn {
  // State
  messages: ChatMessage[];
  currentStep: MatchingStep;
  isLoading: boolean;
  extractedNeeds: Partial<ExtractedUserNeeds>;
  suggestedMentors: MentorSuggestion[];
  selectedMentor: MentorProfile | null;
  error: string | null;

  // Actions
  sendMessage: (text: string) => Promise<void>;
  selectMentor: (mentor: MentorProfile) => void;
  handleQuickReply: (reply: QuickReply) => void;
  resetConversation: () => void;
  retryLastAction: () => void;
}
```

#### State Properties

##### `messages: ChatMessage[]`

Array of all conversation messages including:
- Initial AI greeting
- User messages
- AI responses
- Mentor suggestions
- Loading indicators

**Structure:**
```typescript
{
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: {
    type: 'text' | 'mentor_suggestions' | 'quick_replies' | 'loading';
    text?: string;
    mentorSuggestions?: MentorSuggestion[];
    quickReplies?: QuickReply[];
  };
  timestamp: Date;
  metadata?: {
    step?: MatchingStep;
    confidence?: number;
    extractedData?: Partial<ExtractedUserNeeds>;
  };
}
```

##### `currentStep: MatchingStep`

Current stage of the matching flow:
- `'greeting'` - Initial AI greeting
- `'gathering_goals'` - Asking about learning goals
- `'gathering_details'` - Follow-up questions (instrument, level, schedule)
- `'searching'` - AI is searching for mentors
- `'suggesting'` - Presenting mentor suggestions
- `'selected'` - User selected a mentor
- `'error'` - Error state

##### `isLoading: boolean`

True when waiting for AI response or mentor search results.

##### `extractedNeeds: Partial<ExtractedUserNeeds>`

AI-extracted user preferences and requirements from conversation:

```typescript
{
  learningGoals?: string[];
  instrument?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  preferredGenres?: string[];
  preferredDays?: string[];
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  budgetRange?: { min: number; max: number };
  previousExperience?: string;
  specificRequests?: string;
}
```

##### `suggestedMentors: MentorSuggestion[]`

Array of matched mentors with AI-generated explanations:

```typescript
{
  mentor: MentorProfile;
  matchResult: MatchResult;
  reasonSummary: string;  // AI-generated brief reason
  isTopPick?: boolean;
}
```

##### `selectedMentor: MentorProfile | null`

The mentor selected by the user, or `null` if none selected yet.

##### `error: string | null`

User-friendly error message if something went wrong, otherwise `null`.

#### Action Methods

##### `sendMessage(text: string): Promise<void>`

Send a user message to the AI assistant.

**Parameters:**
- `text: string` - The message content

**Behavior:**
1. Adds user message to conversation
2. Calls `/api/mentor-matching/chat` endpoint
3. Updates `extractedNeeds` with AI response
4. Adds assistant response to messages
5. If `shouldSearchMentors`, automatically triggers mentor search
6. Updates `currentStep` based on AI response

**Example:**
```typescript
await sendMessage('ピアノを習いたいです');
```

##### `handleQuickReply(reply: QuickReply): void`

Handle click on a quick reply button. Convenience wrapper for `sendMessage()`.

**Parameters:**
- `reply: QuickReply` - The quick reply object with `{ id, label, value, icon? }`

**Example:**
```typescript
// Quick reply structure
const quickReply = {
  id: 'piano',
  label: 'ピアノ',
  value: 'ピアノを習いたいです',
  icon: '🎹',
};

handleQuickReply(quickReply); // Sends the value to chat
```

##### `selectMentor(mentor: MentorProfile): void`

Select a mentor from suggestions.

**Parameters:**
- `mentor: MentorProfile` - The selected mentor

**Behavior:**
1. Sets `selectedMentor` state
2. Updates `currentStep` to `'selected'`
3. Calls `onMentorSelected` callback with mentor and match result
4. Adds confirmation message to conversation

**Example:**
```typescript
selectMentor(suggestedMentors[0].mentor);
```

##### `resetConversation(): void`

Reset the entire conversation to initial state.

**Behavior:**
1. Clears all messages (restores initial greeting)
2. Resets `currentStep` to `'greeting'`
3. Clears `extractedNeeds` (preserves `initialUserProfile` if provided)
4. Clears `suggestedMentors`
5. Resets `selectedMentor` to `null`
6. Clears `error` state
7. Generates new `sessionId`

**Example:**
```typescript
<button onClick={resetConversation}>
  最初からやり直す
</button>
```

##### `retryLastAction(): Promise<void>`

Retry the last failed action. Useful for error recovery.

**Behavior:**
- Clears `error` state
- Re-executes the last action that failed
- Particularly useful after network errors

**Example:**
```typescript
{error && (
  <div>
    <p>{error}</p>
    <button onClick={retryLastAction}>再試行</button>
  </div>
)}
```

## Matching Flow Steps

```
┌─────────────┐
│  greeting   │ Initial AI greeting with quick replies
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ gathering_goals  │ AI asks about learning goals
└──────┬───────────┘
       │
       ▼
┌───────────────────┐
│ gathering_details │ Follow-up questions (level, schedule, budget)
└──────┬────────────┘
       │
       ▼
┌──────────┐
│searching │ AI searches database (loading state)
└──────┬───┘
       │
       ▼
┌────────────┐
│suggesting  │ Present mentor cards with match scores
└──────┬─────┘
       │
       ▼
┌──────────┐
│ selected │ User chose a mentor
└──────────┘
```

## Integration with API Endpoints

The hook expects these API endpoints to exist:

### POST `/api/mentor-matching/chat`

**Request:**
```typescript
{
  sessionId: string;
  message: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentStep: MatchingStep;
  extractedNeeds: Partial<ExtractedUserNeeds>;
}
```

**Response:**
```typescript
{
  message: string;
  nextStep: MatchingStep;
  extractedNeeds: Partial<ExtractedUserNeeds>;
  quickReplies?: Array<{ label: string; value: string }>;
  shouldSearchMentors: boolean;
  searchCriteria?: {
    skillLevel?: string;
    learningGoals?: string[];
    genres?: string[];
    priceRange?: { min: number; max: number };
    availability?: string[];
  };
  confidence: number;
}
```

### POST `/api/mentor-matching/search`

**Request:**
```typescript
{
  sessionId: string;
  criteria: {
    skillLevel?: string;
    learningGoals?: string[];
    genres?: string[];
    priceRange?: { min: number; max: number };
    availability?: string[];
  };
  limit?: number;
}
```

**Response:**
```typescript
{
  mentors: MentorSuggestion[];
  totalFound: number;
  searchQuality: number;
}
```

## Error Handling

The hook provides comprehensive error handling:

```typescript
const { error, retryLastAction } = useChatMatching({...});

return (
  <div>
    {error && (
      <ErrorBanner
        message={error}
        onRetry={retryLastAction}
      />
    )}
  </div>
);
```

**Error states are automatically set for:**
- Network failures
- API errors (4xx, 5xx responses)
- Invalid responses
- Search failures

**Error recovery:**
- Use `retryLastAction()` to retry the last operation
- Use `resetConversation()` to start over
- Errors don't block the UI - users can still interact

## UX Psychology Principles

This hook implements multiple UX psychology effects:

### Progressive Disclosure
- One question at a time instead of overwhelming forms
- Reduces cognitive load from 9/10 to 4/10

### Labor Illusion
- Loading states show AI "working" on the search
- Builds trust and perceived value

### Anthropomorphism
- AI assistant has personality and conversational style
- Creates social presence and engagement

### Choice Architecture
- Limited to 3 mentor suggestions by default
- Prevents decision paralysis

### Confirmation Bias
- AI echoes user's choices to validate decisions
- Increases confidence in selections

See `types/chat-matching.ts` for complete mapping of UX effects to each step.

## Testing

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatMatching } from '@/hooks/use-chat-matching';

test('should initialize with greeting', () => {
  const { result } = renderHook(() => useChatMatching({
    onMentorSelected: vi.fn(),
  }));

  expect(result.current.currentStep).toBe('greeting');
  expect(result.current.messages).toHaveLength(1);
});

test('should send message and receive response', async () => {
  const { result } = renderHook(() => useChatMatching({
    onMentorSelected: vi.fn(),
  }));

  await act(async () => {
    await result.current.sendMessage('ピアノを習いたい');
  });

  await waitFor(() => {
    expect(result.current.messages.length).toBeGreaterThan(1);
  });
});
```

## Performance Considerations

- Uses `useCallback` for all actions to prevent unnecessary re-renders
- `sessionId` is stable across re-renders (single `useState` call)
- Messages array is append-only for optimal React rendering
- Loading states prevent duplicate API calls

## Accessibility

- All messages have timestamps for screen readers
- Loading states announce search progress
- Error messages are clearly communicated
- Quick replies are keyboard accessible

## Related Documentation

- [Chat Matching Types](/types/chat-matching.ts)
- [Matching Algorithm](/lib/matching-algorithm.ts)
- [UX Psychology Effects](/docs/archive/UXpsychology.md)
- [API Routes](/app/api/mentor-matching/)

## License

Part of MUED LMS v2 - Internal use only
