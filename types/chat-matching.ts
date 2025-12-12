/**
 * Chat-based Mentor Matching Types
 *
 * UX Psychology-driven conversational matching for MUED LMS
 * Reduces cognitive load from 9/10 to 4/10 through progressive disclosure
 */

import type { MentorProfile, MatchResult } from '@/types/matching';
// MatchingPreferences is imported but may be used in future extensions of this type system
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { MatchingPreferences } from '@/types/matching';

// ========================================
// Chat Message Types
// ========================================

export type ChatRole = 'user' | 'assistant' | 'system';

export type MessageContentType =
  | 'text'
  | 'mentor_suggestions'
  | 'quick_replies'
  | 'loading';

export interface QuickReply {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

export interface MentorSuggestion {
  mentor: MentorProfile;
  matchResult: MatchResult;
  /** AI-generated brief reason for the match */
  reasonSummary: string;
  isTopPick?: boolean;
}

export interface ChatMessageContent {
  type: MessageContentType;
  text?: string;
  mentorSuggestions?: MentorSuggestion[];
  quickReplies?: QuickReply[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: ChatMessageContent;
  timestamp: Date;
  metadata?: {
    step?: MatchingStep;
    confidence?: number;
    extractedData?: Partial<ExtractedUserNeeds>;
  };
}

// ========================================
// Matching Flow State
// ========================================

export type MatchingStep =
  | 'greeting'           // Initial AI greeting
  | 'gathering_goals'    // Asking about learning goals
  | 'gathering_details'  // Follow-up questions (instrument, level, schedule)
  | 'searching'          // AI is searching for mentors
  | 'suggesting'         // Presenting mentor suggestions
  | 'selected'           // User selected a mentor
  | 'error';             // Error state

export interface ExtractedUserNeeds {
  // Core matching criteria
  learningGoals: string[];
  instrument?: string;
  // Can be enum or string from AI
  skillLevel?: string;
  preferredGenres?: string[];

  // Schedule preferences
  preferredDays?: string[];
  // Can be enum or detailed description from AI
  preferredTimeOfDay?: string;

  // Budget (min/max are optional since AI may return null during conversation)
  budgetRange?: {
    min?: number | null;
    max?: number | null;
  } | null;

  // Additional context
  previousExperience?: string;
  specificRequests?: string;

  // Confidence scores for each extracted field
  confidence?: {
    [K in keyof Omit<ExtractedUserNeeds, 'confidence'>]?: number;
  };
}

export interface MatchingState {
  step: MatchingStep;
  extractedNeeds: Partial<ExtractedUserNeeds>;
  suggestedMentors: MentorSuggestion[];
  selectedMentor: MentorProfile | null;
  conversationHistory: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

// ========================================
// Component Props
// ========================================

export interface ChatMatchingPanelProps {
  /** Callback when mentor is selected, triggers transition to detail view */
  onMentorSelected: (mentor: MentorProfile, matchResult: MatchResult) => void;

  /** Optional: Pre-fill with existing user profile data */
  initialUserProfile?: Partial<ExtractedUserNeeds>;

  /** Optional: Callback for analytics/tracking */
  onStepChange?: (step: MatchingStep, data?: Record<string, unknown>) => void;

  /** Optional: Custom greeting message */
  customGreeting?: string;

  /** Optional: Maximum mentors to suggest */
  maxSuggestions?: number;

  /** Optional: Theme customization */
  className?: string;
}

export interface ChatMessageProps {
  message: ChatMessage;
  onQuickReplyClick?: (reply: QuickReply) => void;
  onMentorSelect?: (mentor: MentorProfile) => void;
}

export interface MentorSuggestionCardProps {
  suggestion: MentorSuggestion;
  onSelect: (mentor: MentorProfile) => void;
  isCompact?: boolean;
  showDetailedScore?: boolean;
}

export interface TypingIndicatorProps {
  isVisible: boolean;
  contextMessage?: string;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isDisabled?: boolean;
  placeholder?: string;
  quickActions?: QuickReply[];
}

// ========================================
// Hook Return Types
// ========================================

export interface UseChatMatchingReturn {
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

// ========================================
// API Types
// ========================================

export interface ChatMatchingRequest {
  sessionId: string;
  message: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  currentStep: MatchingStep;
  extractedNeeds: Partial<ExtractedUserNeeds>;
}

export interface ChatMatchingResponse {
  message: string;
  nextStep: MatchingStep;
  extractedNeeds: Partial<ExtractedUserNeeds>;
  quickReplies?: Array<{
    label: string;
    value: string;
  }>;
  shouldSearchMentors: boolean;
  searchCriteria?: {
    skillLevel?: string;
    learningGoals?: string[];
    genres?: string[];
    priceRange?: { min: number; max: number };
    // availability can be array or object with days/times
    availability?: string[] | { days?: string[]; times?: string[] };
    // Allow additional fields AI might add
    [key: string]: unknown;
  };
  confidence: number;
}

export interface MentorSearchRequest {
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

export interface MentorSearchResponse {
  mentors: MentorSuggestion[];
  totalFound: number;
  searchQuality: number;
}

// ========================================
// UX Psychology Effect Mapping
// ========================================

/**
 * Maps UX Psychology effects to each step of the matching flow
 * Reference: docs/archive/UXpsychology.md
 */
export const UX_EFFECTS_BY_STEP: Record<MatchingStep, string[]> = {
  greeting: [
    'Anthropomorphism',      // AI avatar creates social presence
    'Cognitive Load Reduction', // Single question vs multi-field form
    'Priming Effect',        // Quick replies guide common paths
    'Reciprocity',           // Friendly greeting encourages response
  ],
  gathering_goals: [
    'Progressive Disclosure', // One question at a time
    'Labor Illusion',        // Typing indicator shows AI "working"
    'Confirmation Bias',     // Echoing validates user's choice
    'Doherty Threshold',     // Response < 400ms feels instant
  ],
  gathering_details: [
    'Progressive Disclosure', // Continued single-question approach
    'Sunk Cost Effect',      // User invested time, likely to continue
    'Goal Gradient Effect',  // Getting closer to mentor match
  ],
  searching: [
    'Labor Illusion',        // "Finding perfect mentors..."
    'Anticipation',          // Building expectation for results
  ],
  suggesting: [
    'Choice Architecture',   // Limited options prevent paralysis
    'Social Proof',          // Reviews and ratings build trust
    'Anchoring',             // Top match shown first
    'Scarcity',              // Percentage match implies curation
    'Von Restorff Effect',   // Top pick visually distinguished
  ],
  selected: [
    'Commitment & Consistency', // User expressed interest
    'Personalization',       // Highlighted matched preferences
    'Endowment Effect',      // User "owns" their choice
    'Peak-End Rule',         // Positive CTA leaves good impression
  ],
  error: [
    'Error Recovery',        // Clear path to retry
    'Forgiveness',           // Non-blaming error messages
  ],
};
