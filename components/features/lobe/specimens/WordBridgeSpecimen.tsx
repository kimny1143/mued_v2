import { VARIABLE_COLORS } from '@/lib/muedlobe/constants';

export function WordBridgeSpecimen() {
  const accent = VARIABLE_COLORS.VC;

  return (
    <div aria-hidden="true" role="img" aria-label="Word Bridge preview: two words connected by a question mark">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/35">apple</span>
        <div className="flex items-center gap-1">
          <span className="text-white/10">---</span>
          <span className="text-lg" style={{ color: accent }}>?</span>
          <span className="text-white/10">---</span>
        </div>
        <span className="text-sm text-white/35">orange</span>
      </div>
    </div>
  );
}
