import { VARIABLE_COLORS } from '@/lib/muedlobe/constants';

export function CodeFillSpecimen() {
  const accent = VARIABLE_COLORS.PS;
  const pairs = [
    { digit: '1', symbol: '◇' },
    { digit: '2', symbol: '★' },
    { digit: '3', symbol: '△' },
    { digit: '4', symbol: '○' },
    { digit: '5', symbol: '□' },
  ];

  return (
    <div aria-hidden="true" role="img" aria-label="Code Fill preview: digit-symbol reference table">
      <div className="flex flex-col gap-3">
        {/* Reference row */}
        <div className="flex gap-1">
          {pairs.map(({ digit, symbol }) => (
            <div key={digit} className="flex flex-col items-center w-10">
              <span className="text-xs text-white/25">{digit}</span>
              <span className="text-sm text-white/40">{symbol}</span>
            </div>
          ))}
        </div>
        {/* Query */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg text-white/40">3</span>
          <span className="text-white/15">=</span>
          <span
            className="text-lg"
            style={{ color: accent }}
          >
            ?
          </span>
        </div>
      </div>
    </div>
  );
}
