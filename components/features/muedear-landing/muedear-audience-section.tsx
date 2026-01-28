import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/glass-card";
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
    <section className="py-24 bg-[#0F0F1A]/85 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        {/* Section title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
          {t("title")}
        </h2>
        <p className="text-lg text-white/80 mb-16 text-center">
          {t("intro")}
        </p>

        {/* Audience cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
    <GlassCard className="text-center">
      {/* Icon */}
      <div className="w-16 h-16 mx-auto bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-indigo-400" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-4">{t("title")}</h3>

      {/* Description */}
      <p className="text-white/80 text-sm leading-relaxed">
        {t("description")}
      </p>
    </GlassCard>
  );
}
