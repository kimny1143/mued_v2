import { VARIABLE_COLORS } from '@/lib/muedlobe/constants';

export function PatternCompleteSpecimen() {
  const accent = VARIABLE_COLORS.PR;
  // 3x3 grid with bottom-right missing
  const cells = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', null];

  return (
    <div aria-hidden="true" role="img" aria-label="Pattern Complete preview: 3x3 grid with missing piece">
      <div className="grid grid-cols-3 gap-1">
        {cells.map((cell, i) => (
          <div
            key={i}
            className="w-10 h-10 flex items-center justify-center text-xs rounded-sm"
            style={
              cell === null
                ? { border: `1px dashed ${accent}`, color: accent }
                : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }
            }
          >
            {cell ?? '?'}
          </div>
        ))}
      </div>
    </div>
  );
}
