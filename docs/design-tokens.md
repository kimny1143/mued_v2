# Design Tokens

All tokens are defined in `app/globals.css` under `@theme inline`.

## Token Categories

### Brand (`--color-mued-*`, `--color-brand-*`)
Core brand identity colors. Dark mode primary palette.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-mued-accent` | `#4f46e5` | Primary action, links |
| `--color-brand-green` | `#75bc11` | CTA buttons, success indicators |

### Glass (`--color-glass-*`)
Glassmorphism surfaces for dark-mode UI.

### Semantic Action (`--color-error`, `--color-warning`, `--color-info`)
Consistent action colors across all UI components.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-error` | `#dc2626` | Destructive actions, error states |
| `--color-warning` | `#ca8a04` | Caution, pending states |
| `--color-info` | `#9333ea` | Informational, secondary actions |
| `--color-disabled-bg` | `#d1d5db` | Disabled button background |
| `--color-disabled-text` | `#6b7280` | Disabled button text |

Each has `-hover` and `-active` variants.

### Lobe (`--color-lobe-*`)
MUEDlobe cognitive variable colors (memory, tempo, wordsense, patterns, focus).

## Naming Convention

```
--color-{category}-{descriptor}[-{state}]
```

Examples: `--color-error`, `--color-error-hover`, `--color-brand-green-active`

## Usage in Components

Use `var()` with Tailwind arbitrary values:
```
bg-[var(--color-error)]
hover:bg-[var(--color-error-hover)]
```

Do NOT use hardcoded Tailwind colors (e.g., `bg-red-600`) for semantic purposes.
