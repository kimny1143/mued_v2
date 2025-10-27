interface QuotaIndicatorProps {
  used: number;
  limit: number;
  label?: string;
}

export function QuotaIndicator({ used, limit, label = "Usage" }: QuotaIndicatorProps) {
  const percentage = (used / limit) * 100;
  const isNearLimit = percentage >= 80;

  return (
    <div className="p-4 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-[var(--radius-lg)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
        <span className={`text-sm font-semibold ${isNearLimit ? "text-red-600" : "text-[var(--color-text-primary)]"}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isNearLimit ? "bg-red-500" : "bg-[var(--color-brand-green)]"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      {isNearLimit && (
        <p className="text-xs text-red-600 mt-2">
          Approaching limit. Please consider upgrading.
        </p>
      )}
    </div>
  );
}
