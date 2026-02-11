import { VARIABLE_COLORS } from '@/lib/muedlobe/constants';

export function FocusFlowSpecimen() {
  const accent = VARIABLE_COLORS.ATT;
  const symbols = ['△', '○', '★', '□', '△', '○'];
  const targetIndex = 2; // ★ is the target

  return (
    <div aria-hidden="true" role="img" aria-label="Focus Flow preview: symbol stream with highlighted target">
      <div className="flex items-center gap-2">
        {symbols.map((s, i) => (
          <span
            key={i}
            className="text-lg"
            style={{
              color: i === targetIndex ? accent : 'rgba(255,255,255,0.15)',
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
