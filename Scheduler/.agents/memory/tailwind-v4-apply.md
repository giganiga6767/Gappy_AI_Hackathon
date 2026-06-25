---
name: Tailwind v4 @apply restriction
description: In Tailwind v4, @apply inside @layer components cannot reference other custom component classes — only utility classes.
---

## The rule

In Tailwind v4, `@apply` inside `@layer components` only works with utility classes, NOT with other component classes you've defined in the same layer.

## Symptom

```
[vite] Internal server error: Cannot apply unknown utility class `brutal-btn`
```

Even though `.brutal-btn` is defined right above it in the same `@layer components` block.

## Fix

Expand all base styles inline. Instead of:

```css
.brutal-btn-primary { @apply brutal-btn bg-ink text-paper; }
```

Write:

```css
.brutal-btn-primary { @apply inline-flex items-center justify-center font-bold border-2 border-ink shadow-brutal ... bg-ink text-paper; }
```

**Why:** Tailwind v4 resolves `@apply` strictly against the utility registry, not the component layer output.

**How to apply:** Never use `@apply someComponentClass` inside `@layer components`. Always flatten to utilities.
