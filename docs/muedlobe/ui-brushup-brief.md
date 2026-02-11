# MUEDlobe Game UI Brushup Brief

## Product Context

MUEDlobe is a cognitive profiling feature within MUEDnote (a music production companion app). Users complete 7 short games that measure different cognitive variables. Results are used to calibrate an AI assistant's communication style.

- **Target users**: Music producers (hobbyist to semi-pro, 20-40s)
- **Platform**: Web (PWA), mobile-first but also desktop
- **Tech**: Next.js, TailwindCSS 4, dark theme (#0a0a0f base)
- **Tone**: Calm, focused, not gamified — more like a "tuning session" than a game

## The 7 Games

| # | Game | Variable | Duration | What it measures |
|---|------|----------|----------|-----------------|
| 1 | Tone Sequence | Memory (WM) | 4-6 min | Listen to note sequences, reproduce in order |
| 2 | Mental Math | Memory (WM) | 4-5 min | Solve spoken arithmetic problems |
| 3 | Symbol Match | Tempo (PS) | 2 min | Match target symbol against comparison set |
| 4 | Code Fill | Tempo (PS) | 2 min | Map digits to symbols using a reference table |
| 5 | Word Bridge | Word Sense (VC) | 3 min | Find abstract connection between two words |
| 6 | Pattern Complete | Patterns (PR) | 4-5 min | Complete 3x3 matrix patterns |
| 7 | Focus Flow | Focus (ATT) | 3-4 min | Respond to target symbol, ignore distractors |

## Current State

Screenshots are in `docs/image/screenshots/muedlobe/` (2880x1800 PNG, Japanese UI).

Each game's start screen currently has the identical layout:
- Header: variable label + game name (English)
- Body: Japanese title, description, purple "Start" button
- Footer: disclaimer text

## Problems

### P1: All 7 screens look identical
The most critical issue. Every game shares the exact same layout: title -> description -> button. Users cannot distinguish games at a glance. There is no visual identity per game.

### P2: 80% empty space
Content is clustered in a small center area. The screen size is not utilized. There's no visual hierarchy beyond "read text, press button."

### P3: No visual preview of gameplay
Users must read the description to understand what each game involves. There are no icons, illustrations, animations, or mini-previews that communicate the game mechanic at a glance.

### P4: Mixed language in header
The header shows the English game name ("Tone Sequence") while the body shows the Japanese name ("Tone Sequence"). This creates inconsistency.

### P5: Generic button design
The purple button with subtle glow/gradient looks AI-generated. It's the same across all games with no differentiation.

### P6: Disclaimer visible before start
The footer disclaimer ("This is not a medical assessment...") is shown before the game starts, adding visual noise to the start screen.

## Constraints

- **Dark theme is non-negotiable** — base color #0a0a0f
- **No excessive decoration** — project design principle: "Premium = (image quality x size) + whitespace - decoration"
- **Backdrop-blur, glow effects, hover:scale = AI-generated feel** — avoid these
- **Must work on mobile (375px) and desktop (1440px)**
- **i18n**: Japanese and English support required
- **Accessibility**: WCAG AA contrast, keyboard navigable
- **No heavy assets**: keep page weight under 200KB per game page

## Key Questions

1. **How do we give each game a distinct visual identity** without adding heavy illustrations or breaking the minimal aesthetic?
2. **What should fill the empty space?** Subtle gameplay preview? Abstract visual hint? Or is the emptiness actually fine if the content is restructured?
3. **Should the start screen show more information** (estimated time, what it measures, difficulty) or less (just an icon and start button)?
4. **Color strategy**: Should each cognitive variable (Memory, Tempo, Word Sense, Patterns, Focus) have its own accent color? If so, what palette works on #0a0a0f?
5. **Transition from start screen to gameplay**: Should we consider removing the start screen entirely and going straight into a brief countdown?

## Reference Aesthetic

The desired feel is closer to:
- Neuropsychological test software (clinical, clean)
- Premium music tools (Native Instruments, Ableton)
- NOT: Mobile casual games, gamified learning apps

Think "tuning an instrument" rather than "playing a game."

## Deliverable Expected

Concrete UI proposals per game screen with:
- Layout structure (wireframe level is fine)
- Color/accent suggestions
- How each game differentiates visually
- Any interaction patterns worth considering
