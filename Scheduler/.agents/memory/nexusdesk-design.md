---
name: NexusDesk design system
description: Muted Neo Brutalist rules and palette for NexusDesk — what must never be changed.
---

## Rules (all non-negotiable)

1. Zero border radius globally: `* { border-radius: 0 !important }` in `@layer base`
2. Palette defined in `@theme inline` in `index.css`: paper, ink, inkLight, inkFaint, surface, surfaceHover, terracotta, terracottaLight, terracottaDark, sage, sageLight, sageDark, amber, amberLight
3. Only hard offset shadows (no blur): shadow-brutal (4px 4px), shadow-brutal-sm (2px), shadow-brutal-lg (6px), shadow-brutal-accent (terracotta), shadow-brutal-sage
4. border-2 border-ink on all structural elements
5. Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (all data/numbers)
6. Hover: translate -2px -2px + shadow-brutal-sm. Active: translate +2px +2px + no shadow.
7. No emojis anywhere in the UI

**Why:** The entire visual identity is built on these rules. Breaking any one creates inconsistency that undermines the neo-brutalist aesthetic the user specified.

**How to apply:** Check all new components for rounded-* classes (banned), default shadcn shadows (override), and non-mono data display.
