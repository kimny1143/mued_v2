# MUEDear Figma Design Specification

## Overview

| Item | Value |
|------|-------|
| App Name | MUEDear（ミュードイヤー） |
| Tagline | "Train Your Golden Ears" |
| Mascot | Hoo (owl character) |
| Style | Warm retro-modern, professional yet friendly |
| Target | Music producers, audio engineers, sound designers |

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Gold/Amber | `#F5A623` | 245, 166, 35 | Primary accent, buttons, Hoo's eyes |
| Gold Light | `#F7B94D` | 247, 185, 77 | Hover states |
| Gold Dark | `#D88F1B` | 216, 143, 27 | Pressed states |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Sage Green | `#7D9B76` | 125, 155, 118 | Secondary accent, MuComp game |
| Sage Light | `#9AB393` | 154, 179, 147 | Hover states |
| Sage Dark | `#5F7D58` | 95, 125, 88 | Pressed states |

### Background Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Dark Background | `#2D2D2D` | 45, 45, 45 | Main screen background |
| Card Background | `#3D3D3D` | 61, 61, 61 | Cards, modals |
| Light Background | `#F5E6D3` | 245, 230, 211 | Light mode background |

### Text Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Light Text | `#FAFAFA` | 250, 250, 250 | Primary text on dark |
| Muted Text | `#9CA3AF` | 156, 163, 175 | Secondary text, labels |
| Dark Text | `#3D3D3D` | 61, 61, 61 | Text on light backgrounds |

### Status Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success | `#22C55E` | Correct answers |
| Error | `#EF4444` | Wrong answers |
| Warning | `#F59E0B` | Warnings |
| Info | `#3B82F6` | Information |

### Game-Specific Colors

| Game | Color | Hex |
|------|-------|-----|
| MuFreQ | Gold | `#F5A623` |
| MuComp | Sage | `#7D9B76` |
| MuRush | Red | `#EF4444` |
| MuVerb | Blue | `#3B82F6` |
| MuWidth | Purple | `#8B5CF6` |

---

## Typography

### Font Family
- **Primary**: System default (San Francisco on iOS, Roboto on Android)
- **Alternative**: Inter, SF Pro Display

### Font Sizes

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| xs | 12px | 16px | Labels, hints |
| sm | 14px | 20px | Secondary text |
| base | 16px | 24px | Body text |
| lg | 18px | 28px | Large body |
| xl | 20px | 28px | Section headers |
| 2xl | 24px | 32px | Card titles |
| 3xl | 30px | 36px | Screen titles |
| 4xl | 36px | 44px | Hero text |
| 5xl | 48px | 56px | Large numbers (scores) |

### Font Weights

| Name | Weight | Usage |
|------|--------|-------|
| Normal | 400 | Body text |
| Medium | 500 | Emphasis |
| Semibold | 600 | Buttons, labels |
| Bold | 700 | Titles, headings |

---

## Spacing System

| Name | Value | Usage |
|------|-------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Small gaps |
| md | 12px | Medium gaps |
| lg | 16px | Standard padding |
| xl | 24px | Section spacing |
| xxl | 32px | Large sections |
| xxxl | 48px | Hero spacing |

---

## Border Radius

| Name | Value | Usage |
|------|-------|-------|
| sm | 4px | Small elements |
| md | 8px | Inputs |
| lg | 12px | Cards |
| xl | 16px | Large cards |
| xxl | 24px | Modals |
| full | 9999px | Pills, avatars |

---

## Components

### 1. Button

**Variants:**
- Primary (Gold background, dark text)
- Secondary (Sage background, light text)
- Outline (Transparent with gold border)
- Ghost (Transparent, gold text)

**Sizes:**
- Small: px-12, py-8
- Medium: px-24, py-16
- Large: px-32, py-24

**States:**
- Default
- Hover (lighter)
- Pressed (darker)
- Disabled (50% opacity)

```
┌─────────────────────────────┐
│      Start Training         │  ← Primary, Large
└─────────────────────────────┘
Height: 56px, Border-radius: 12px
Font: 18px Semibold
```

### 2. Game Card

```
┌──────────────────────────────────────────┐
│  ┌────┐                                  │
│  │ 🎵 │  MuFreQ                    →    │
│  └────┘  Identify the boosted frequency  │
│          ● ○ ○  (difficulty)             │
└──────────────────────────────────────────┘

Width: 100%
Height: 88px
Background: #3D3D3D
Border-radius: 16px
Padding: 16px

Icon Container: 56x56px, border-radius 12px
Game-specific color background
```

### 3. Frequency Button (MuFreQ)

```
┌─────────┐
│  1kHz   │
└─────────┘

Width: 30% of screen
Aspect Ratio: 1.5:1
Background: #3D3D3D
Border-radius: 12px

States:
- Default: #3D3D3D
- Selected/Correct: #22C55E
- Wrong: #EF4444
- Disabled: 50% opacity
```

### 4. A/B Toggle Button

```
┌──────────────────┐  ┌──────────────────┐
│ ▶  A (Original)  │  │ ▶  B (Boosted)   │
└──────────────────┘  └──────────────────┘

Width: ~45% each
Height: 48px
Gap: 12px

Active: Gold background (#F5A623), dark text
Inactive: Card background (#3D3D3D), light text
```

### 5. Progress Bar

```
Round 3/10
┌────────■■■□□□□□□□────────┐
Width: 100%
Height: 4px
Background: #3D3D3D
Fill: #F5A623
Border-radius: 2px
```

### 6. Score Display

```
Score
1200
```
- Label: 12px, Muted text, uppercase
- Value: 48px, Bold, Gold

### 7. Hoo Mascot

**Sizes:**
- Small: 25% screen width
- Medium: 40% screen width
- Large: 60% screen width

**Variants:**
- Studio (with headphones, for home screen)
- Icon (circular, for results/modals)

---

## Screen Layouts

### Screen 1: HomeScreen

```
┌─────────────────────────────────────┐
│  MUEDear                            │  ← Brand (Gold, 20px)
│                                     │
│                                     │
│          ┌─────────────┐            │
│          │             │            │
│          │    [Hoo]    │            │  ← Studio variant, Large
│          │             │            │
│          └─────────────┘            │
│                                     │
│        Train Your                   │  ← 36px Bold
│        Golden Ears                  │
│                                     │
│    Develop professional listening   │  ← 16px Muted
│    skills with fun audio games      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      Start Training         │    │  ← Primary Button
│  └─────────────────────────────┘    │
│                                     │
│       5 plays remaining today       │  ← 14px Muted
│                                     │
│       Powered by Hoo the Owl        │  ← 12px Muted
└─────────────────────────────────────┘

Background: #2D2D2D
```

### Screen 2: GameSelectScreen

```
┌─────────────────────────────────────┐
│  ←   Choose Your Game     [🎮 5]   │  ← Header
├─────────────────────────────────────┤
│                                     │
│  EQ TRAINING                        │  ← Category (12px uppercase)
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [🎵] MuFreQ              → │    │
│  │      Identify the boosted...│    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [⚡] MuRush         🔒   → │    │  ← Locked state
│  │      60-second challenge... │    │
│  └─────────────────────────────┘    │
│                                     │
│  DYNAMICS TRAINING                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [📊] MuComp              → │    │
│  │      Spot the compressed... │    │
│  └─────────────────────────────┘    │
│                                     │
│  SPATIAL TRAINING                   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [🌊] MuVerb         🔒   → │    │
│  │      Find the different...  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [↔️] MuWidth        🔒   → │    │
│  │      Identify stereo width  │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘

Plays indicator: Pill shape (#3D3D3D), icon + number
Locked cards: 60% opacity
```

### Screen 3: MuFreQScreen (Game)

```
┌─────────────────────────────────────┐
│  ✕         Round 3/10        Score │
│         ┌──────────────┐       100 │
│         │■■■□□□□□□□    │           │
│         └──────────────┘           │
├─────────────────────────────────────┤
│                                     │
│     Which frequency is boosted?     │  ← 24px Bold
│                                     │
│  ┌───────────────┐ ┌───────────────┐│
│  │ ▶ A (Original)│ │ ▶ B (Boosted) ││  ← A/B Toggle
│  └───────────────┘ └───────────────┘│
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │ 60Hz  │ │ 125Hz │ │ 250Hz │     │
│  └───────┘ └───────┘ └───────┘     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │  ← 9 Frequency Buttons
│  │ 500Hz │ │  1kHz │ │  2kHz │     │     (3x3 grid)
│  └───────┘ └───────┘ └───────┘     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │  4kHz │ │  8kHz │ │ 12kHz │     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ✓ Correct! +100 points     │    │  ← Feedback (shown after answer)
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Next Round           │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘

Correct feedback: Green tint background
Wrong feedback: Red tint background + "The answer was X"
```

### Screen 4: ResultScreen

```
┌─────────────────────────────────────┐
│                                     │
│          ┌─────────────┐            │
│          │   [Hoo]     │            │  ← Icon variant, Medium
│          └─────────────┘            │
│                                     │
│          Game Complete!             │  ← 30px Bold
│             MuFreQ                  │  ← 18px Gold
│                                     │
│          ┌───────────────┐          │
│          │     Score     │          │
│          │     1200      │          │  ← 48px Bold Gold
│          │  🏆 New Best! │          │  ← If new high score
│          └───────────────┘          │
│                                     │
│   ┌────────┐ ┌────────┐ ┌────────┐  │
│   │   ✓    │ │   ✕    │ │   📊   │  │
│   │   8    │ │   2    │ │  80%   │  │  ← Stats grid
│   │Correct │ │ Wrong  │ │Accuracy│  │
│   └────────┘ └────────┘ └────────┘  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ "Great job! Keep practicing!"│   │  ← Hoo's message
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Play Again           │    │  ← Primary
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │       Back to Menu          │    │  ← Outline
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘

Hoo's message varies by accuracy:
- 80%+: "Outstanding! You have golden ears!"
- 60%+: "Great job! Keep practicing!"
- 40%+: "Not bad! Room for improvement."
- <40%: "Don't give up! Practice makes perfect!"
```

### Screen 5: RewardAdPrompt (Modal)

```
┌─────────────────────────────────────┐
│                                     │
│   ┌─────────────────────────────┐   │
│   │                         ✕   │   │  ← Close button
│   │      ┌─────────────┐        │   │
│   │      │   [Hoo]     │        │   │  ← Icon, Small
│   │      └─────────────┘        │   │
│   │                             │   │
│   │      Out of Plays!          │   │  ← 24px Bold
│   │  You've used all your free  │   │
│   │     plays for today         │   │
│   │                             │   │
│   │  ┌───────────────────────┐  │   │
│   │  │ "Hey there! Want to   │  │   │
│   │  │ keep training? Watch  │  │   │  ← Hoo's speech
│   │  │ a quick video..."     │  │   │
│   │  │              - Hoo    │  │   │
│   │  └───────────────────────┘  │   │
│   │                             │   │
│   │  ┌───────────────────────┐  │   │
│   │  │ ▶ Watch ad for +3     │  │   │  ← Reward info
│   │  └───────────────────────┘  │   │
│   │                             │   │
│   │  ┌───────────────────────┐  │   │
│   │  │      Watch Ad         │  │   │  ← Primary
│   │  └───────────────────────┘  │   │
│   │                             │   │
│   │       Maybe Later           │   │  ← Ghost text
│   │                             │   │
│   │   Free plays reset in 12h   │   │  ← 12px Muted
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘

Modal: #3D3D3D background, 24px border-radius
Overlay: rgba(0, 0, 0, 0.5)
Max width: 340px
```

---

## Icons

Use **Ionicons** or similar icon set:

| Usage | Icon Name |
|-------|-----------|
| Back | arrow-back |
| Close | close |
| Play | play |
| Game | game-controller |
| Lock | lock-closed |
| Forward | chevron-forward |
| Correct | checkmark-circle |
| Wrong | close-circle |
| Stats | analytics |
| Trophy | trophy |

### Game Icons (Ionicons mapping)

| Game | Icon |
|------|------|
| MuFreQ | pulse |
| MuComp | speedometer |
| MuRush | flash |
| MuVerb | water |
| MuWidth | swap-horizontal |

---

## Design Guidelines

### Do's
- Use dark mode as default
- Keep UI minimal and focused
- Use gold accent sparingly for important actions
- Maintain high contrast for accessibility
- Add subtle shadows for depth (card elevation)

### Don'ts
- Don't use more than 2-3 colors per screen
- Don't use pure black (#000000)
- Don't use thin fonts (< 400 weight)
- Don't crowd the interface with too many elements

### Animation Guidelines
- Button press: scale(0.98), 100ms
- Screen transitions: slide left/right, 300ms
- Feedback appearance: fade in, 200ms
- Modal: fade + scale from 0.9, 200ms

---

## Asset Requirements

### Hoo Mascot
1. **Studio Version**: Hoo with headphones in studio setting
   - Used on: HomeScreen splash
   - Aspect: Square or slightly tall

2. **Icon Version**: Circular Hoo face
   - Used on: Results, modals, small displays
   - Aspect: 1:1 (circular crop)

### App Icon
- Size: 1024x1024px
- Use circular Hoo icon
- Background: #2D2D2D
- Consider gold accent ring

---

## Responsive Considerations

| Device | Screen Width | Adjustments |
|--------|--------------|-------------|
| iPhone SE | 375px | Smaller Hoo, tighter spacing |
| iPhone 14 | 390px | Standard layout |
| iPhone 14 Pro Max | 430px | More breathing room |
| iPad | 768px+ | Consider 2-column game grid |

---

## Figma AI Prompt Examples

### Generate HomeScreen:
```
Create a mobile app home screen with dark background (#2D2D2D).
Center an owl mascot image (60% width). Below it, add title
"Train Your Golden Ears" in white 36px bold. Add subtitle in
gray. Large gold (#F5A623) button "Start Training" at bottom.
Show "5 plays remaining" in small gray text.
```

### Generate GameCard:
```
Create a horizontal card component with dark gray (#3D3D3D)
background, 16px border radius. Left side has 56x56px icon
container with game-specific color. Right side shows game
name in white bold, description in gray, and difficulty dots.
Chevron arrow on far right.
```

### Generate Frequency Grid:
```
Create a 3x3 grid of frequency buttons. Each button is
rectangular with aspect ratio 1.5:1, dark gray (#3D3D3D)
background, 12px border radius. Center text shows frequency
values: 60Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 12kHz.
```

---

*Last Updated: 2026-01-20*
