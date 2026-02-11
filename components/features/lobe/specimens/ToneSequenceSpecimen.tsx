import { VARIABLE_COLORS } from '@/lib/muedlobe/constants';

export function ToneSequenceSpecimen() {
  const accent = VARIABLE_COLORS.WM;
  const steps = [1, 2, 3, 4, 5];

  return (
    <div aria-hidden="true" role="img" aria-label="Tone Sequence preview: 5 sequential steps">
      <div className="flex items-center gap-3">
        {steps.map((n) => (
          <div key={n} className="flex flex-col items-center gap-1.5">
            <div
              className="w-10 h-10 rounded-full border flex items-center justify-center text-sm"
              style={{
                borderColor: n === 3 ? accent : 'rgba(255,255,255,0.12)',
                color: n === 3 ? accent : 'rgba(255,255,255,0.3)',
              }}
            >
              {n}
            </div>
          </div>
        ))}
      </div>
      {/* Connecting line */}
      <div className="mt-2 mx-5 h-px bg-white/8" />
    </div>
  );
}
