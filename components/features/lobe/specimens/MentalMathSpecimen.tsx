import { VARIABLE_COLORS } from '@/lib/muedlobe/constants';

export function MentalMathSpecimen() {
  const accent = VARIABLE_COLORS.WM;

  return (
    <div aria-hidden="true" role="img" aria-label="Mental Math preview: arithmetic equation with blank">
      <div className="flex items-baseline gap-2 text-2xl">
        <span className="text-white/30">7</span>
        <span className="text-white/20">+</span>
        <span
          className="w-10 border-b-2 text-center text-lg"
          style={{ borderColor: accent, color: accent }}
        >
          _
        </span>
        <span className="text-white/20">=</span>
        <span className="text-white/30">13</span>
      </div>
    </div>
  );
}
