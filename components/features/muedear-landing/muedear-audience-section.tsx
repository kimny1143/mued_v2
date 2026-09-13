import { useTranslations } from "next-intl";
import { Home, GraduationCap, Headphones } from "lucide-react";

const AUDIENCE_ICONS = {
  bedroom: Home,
  student: GraduationCap,
  pro: Headphones,
} as const;

type AudienceKey = keyof typeof AUDIENCE_ICONS;

const AUDIENCES: AudienceKey[] = ["bedroom", "student", "pro"];

/**
 * MUEDear Audience Section
 *
 * Target user personas: bedroom producers, students, and professionals.
 */
export function MuedearAudienceSection() {
  const t = useTranslations("muedear.audience");

  return (
    <section className="py-28 bg-[var(--bg-base)] relative">
      {/* Section divider - subtle */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        {/* Section title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
          {t("title")}
        </h2>
        <p className="text-lg text-white/80 mb-16 text-center">
          {t("intro")}
        </p>

        {/* Audience cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {AUDIENCES.map((audienceKey) => (
            <AudienceCard key={audienceKey} audienceKey={audienceKey} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface AudienceCardProps {
  audienceKey: AudienceKey;
}

function AudienceCard({ audienceKey }: AudienceCardProps) {
  const t = useTranslations(`muedear.audience.${audienceKey}`);
  const Icon = AUDIENCE_ICONS[audienceKey];

  return (
    <div className="bg-[#111] border border-white/5 rounded-xl p-6 text-center hover:border-white/10 transition-colors">
      {/* Icon */}
      <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-amber-400" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-4">{t("title")}</h3>

      {/* Description */}
      <p className="text-white/60 text-sm leading-relaxed">
        {t("description")}
      </p>
    </div>
  );
}
