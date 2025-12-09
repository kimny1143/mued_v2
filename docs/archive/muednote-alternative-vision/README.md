# MUEDnote Alternative Vision (Archived)

**Archived**: 2025-12-09
**Reason**: These documents describe a web-based chat interface approach that was superseded by the desktop silent console approach (v6.1).

## Contents

- `MUEDNOTE_INTEGRATED_SPEC_V2.md` - Web app with conversational AI chat interface
- `muednote-chat-ui-design.md` - Chat UI design for the web approach

## Current Direction

The project is implementing MUEDnote as a **desktop application** with:
- Tauri/Rust framework (`apps/muednote-v3/`)
- Silent console UX (AI does not respond)
- 0.5 second input → DAW focus return
- Background HLA (Human Learning Algorithm) processing

See: `docs/business/MUEDnote/muednote_master_plan_v6.1.md` for the current specification.

## Why This Was Archived

| v2.0 (Archived) | v6.1 (Current) |
|-----------------|----------------|
| Web application | Desktop (Tauri) |
| Chat-style conversation | Silent input only |
| AI responds with suggestions | AI processes silently |
| Next.js streaming | Rust/local daemon |

The desktop approach better serves DAW users who need zero interruption to their creative flow.
