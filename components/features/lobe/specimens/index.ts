import type { GameType } from '@/types/muedlobe';
import { ToneSequenceSpecimen } from './ToneSequenceSpecimen';
import { MentalMathSpecimen } from './MentalMathSpecimen';
import { SymbolMatchSpecimen } from './SymbolMatchSpecimen';
import { CodeFillSpecimen } from './CodeFillSpecimen';
import { WordBridgeSpecimen } from './WordBridgeSpecimen';
import { PatternCompleteSpecimen } from './PatternCompleteSpecimen';
import { FocusFlowSpecimen } from './FocusFlowSpecimen';

export const SPECIMENS: Record<GameType, React.ComponentType> = {
  'tone-sequence': ToneSequenceSpecimen,
  'mental-math': MentalMathSpecimen,
  'symbol-match': SymbolMatchSpecimen,
  'code-fill': CodeFillSpecimen,
  'word-bridge': WordBridgeSpecimen,
  'pattern-complete': PatternCompleteSpecimen,
  'focus-flow': FocusFlowSpecimen,
};
