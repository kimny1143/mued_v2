/**
 * Repository Layer - Data Access Abstraction
 *
 * Export all repositories for centralized imports.
 * Use repositories instead of direct DB access in services.
 *
 * @example
 * import { userRepository, materialRepository } from '@/lib/repositories';
 *
 * const user = await userRepository.findByClerkId(clerkId);
 * const materials = await materialRepository.findByCreator(user.id);
 */

// User management
export {
  UserRepository,
  userRepository,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilters,
  type UserRole,
} from './users.repository';

// Subscriptions & billing
export {
  SubscriptionRepository,
  subscriptionRepository,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
  type SubscriptionFilters,
  type SubscriptionTier,
  type SubscriptionStatus,
  TIER_LIMITS,
} from './subscriptions.repository';

// Session/Interview system
export {
  SessionRepository,
  sessionRepository,
  type CreateSessionInput,
  type UpdateSessionInput,
  type CreateSessionAnalysisInput,
  type CreateInterviewQuestionInput,
  type CreateInterviewAnswerInput,
  type SessionFilters,
} from './sessions.repository';

// Hoo AI memories
export {
  HooMemoriesRepository,
  hooMemoriesRepository,
  type HooMemorySettings,
  type HooAutoMemory,
  type UpdateCustomInstructionsInput,
  type ToggleCustomInstructionsInput,
} from './hoo-memories.repository';

// MUEDlobe - Cognitive profiling
export {
  CognitiveProfileRepository,
  cognitiveProfileRepository,
} from './cognitive-profiles.repository';

// MUEDial - Mixing/Mastering
export {
  DialRepository,
  dialRepository,
  type DialSession,
  type DialPurchase,
  type DialSubscription,
  type DialTrack,
  type DialTask,
  type CreateDialSessionInput,
  type CreateDialPurchaseInput,
} from './dial.repository';
