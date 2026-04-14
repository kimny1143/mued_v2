"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/analytics/gtag";
import { GUMROAD_CLAUDE_CODE_TEMPLATE_URL } from "@/lib/gumroad/constants";

const GUMROAD_URL = `${GUMROAD_CLAUDE_CODE_TEMPLATE_URL}?utm_source=mued&utm_medium=web&utm_campaign=landing_page_v2&utm_content=section_a`;

/**
 * Claude Code Template Section (層A)
 *
 * Shown only when ?cta=v2. Placed between DeveloperStory and FinalCTA.
 * Drives Gumroad conversion for Claude Code users who already know Hoo MCP.
 */
export function ClaudeCodeTemplateSection() {
  const t = useTranslations("landing.brand.claudeCodeTemplate");
  const features = t.raw("features") as string[];

  return (
    <section className="py-24 bg-[#0f0f0f] relative">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      <div className="container mx-auto px-6">
        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Badge */}
          <p className="text-xs tracking-widest uppercase text-indigo-400/70 mb-4">
            {t("badge")}
          </p>

          {/* Heading */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
            {t("title")}
          </h2>

          {/* Description */}
          <p className="text-white/60 text-base leading-relaxed mb-8">
            {t("description")}
          </p>

          {/* Feature list */}
          <ul className="space-y-2 mb-10">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-white/70 text-sm">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href={GUMROAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent({
                action: "cta_click",
                params: {
                  product: "claude_code_template",
                  location: "template_section",
                  variant: "v2",
                },
              })
            }
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-[var(--radius-lg)] transition-colors duration-200"
          >
            {t("cta")}
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
