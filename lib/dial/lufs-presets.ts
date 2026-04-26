export const DELIVERY_TARGET_LUFS = {
  spotify: -14,
  apple_music: -16,
  youtube: -14,
  tidal: -14,
  amazon_music: -14,
  broadcast: -23,
  podcast: -16,
} as const;

export type DeliveryTarget = keyof typeof DELIVERY_TARGET_LUFS;

export const DELIVERY_TARGET_LABELS: Record<DeliveryTarget, string> = {
  spotify: 'Spotify (-14 LUFS)',
  apple_music: 'Apple Music (-16 LUFS)',
  youtube: 'YouTube (-14 LUFS)',
  tidal: 'Tidal (-14 LUFS)',
  amazon_music: 'Amazon Music (-14 LUFS)',
  broadcast: 'Broadcast / EBU R128 (-23 LUFS)',
  podcast: 'Podcast (-16 LUFS)',
};

export const DELIVERY_TARGETS = Object.keys(DELIVERY_TARGET_LUFS) as DeliveryTarget[];

export function mapLufsToDesiredLoudness(lufs: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (lufs <= -20) return 'LOW';    // Broadcast EBU R128 (-23)
  if (lufs <= -15) return 'MEDIUM'; // Apple Music / Podcast (-16)
  return 'HIGH';                     // Spotify / YouTube / Tidal / Amazon (-14)
}
