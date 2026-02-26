/**
 * Hoo System Prompt Loader
 *
 * Re-export barrel — all prompt logic has moved to lib/ai/prompts/hoo.ts
 */

export {
  getHooSystemPrompt,
  getHooCorePrompt,
  getHooExtendedPrompt,
  buildSessionContextPrompt,
  getHooSystemPromptWithContext,
  buildCustomInstructionsPrompt,
  buildMuedlobeInstructionsPrompt,
  getHooSystemPromptWithMemory,
} from './prompts/hoo';

export type { SessionContextForHoo } from './prompts/hoo';
