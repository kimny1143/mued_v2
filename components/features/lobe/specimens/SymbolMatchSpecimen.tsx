import { VARIABLE_COLORS } from '@/lib/muedlobe/constants';

export function SymbolMatchSpecimen() {
  const accent = VARIABLE_COLORS.PS;
  const symbols = ['◇', '★', '△', '○', '□'];

  return (
    <div aria-hidden="true" role="img" aria-label="Symbol Match preview: target symbol and comparison row">
      <div className="flex flex-col items-center gap-3">
        {/* Target */}
        <div
          className="w-12 h-12 flex items-center justify-center text-xl border rounded"
          style={{ borderColor: accent, color: accent }}
        >
          ★
        </div>
        {/* Divider */}
        <div className="w-full h-px bg-white/10" />
        {/* Comparison row */}
        <div className="flex gap-2">
          {symbols.map((s, i) => (
            <div
              key={i}
              className="w-9 h-9 flex items-center justify-center text-sm border rounded text-white/25 border-white/10"
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
