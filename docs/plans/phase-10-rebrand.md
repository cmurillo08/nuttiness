# Phase 10 — Rebrand to Káru

## Overview

The brand has been updated. The new logo (`public/karu-logo.png`) introduces the **Káru** brand identity — a warm, natural aesthetic built around deep chocolate brown, warm cream, forest green, and terracotta accents. This phase replaces all "Nuttiness" branding references and realigns the app's visual theme to match the new logo.

The internal codebase name ("nuttiness"), database schema, and session cookie name (`nuttiness_session`) are **not changed** — these are technical identifiers, not user-facing brand strings.

---

## Scope

### Included
- Rename old PWA icons as legacy backups and generate new icons derived from the Kárulogo
- Update `tailwind.config.mjs` color tokens to the new Kárupalette
- Update hardcoded color values in `app/login/page.js` and `components/AppShell.jsx` to use Tailwind tokens
- Update brand name strings ("Nuttiness" → "Káru") and tagline ("Sabor que Enloquece" → "Disfruta sin culpa")
- Update `public/manifest.json` (name, description, theme colors)
- Update `app/layout.js` metadata (title, theme-color meta tag)
- Update sidebar background hardcoded color `#f6efe1` to the new cream token

### NOT Included
- Database schema changes
- Session cookie name (`nuttiness_session`) — internal identifier, unchanged
- Any routing or feature changes

---

## New Color Palette

Extracted from the Kárulogo:

| Token        | Hex       | Usage                                              |
|------------- |-----------|----------------------------------------------------|
| `primary`    | `#3B1F07` | Deep chocolate brown — brand text, active states   |
| `secondary`  | `#5A7A38` | Forest green — leaf accent, secondary actions      |
| `accent`     | `#C0714A` | Terracotta / rust — heart icon, warm highlights    |
| `brand-bg`   | `#F0DFCA` | Warm cream/parchment — sidebar background, mobile header |

---

## Files to Change

### 1. `public/icons/` — Icon Regeneration

- Rename `icon-192.png` → `icon-192-legacy.png`
- Rename `icon-512.png` → `icon-512-legacy.png`
- Generate new `icon-192.png` (192×192 px) from the Kárulogo, using the warm cream background (`#F0DFCA`) and centering the Káruwordmark
- Generate new `icon-512.png` (512×512 px) from the same source, same treatment

### 2. `tailwind.config.mjs` — Theme Tokens

Replace the `colors` block:

```js
colors: {
  primary:   '#3B1F07',  // deep chocolate (was #8B6F47)
  secondary: '#5A7A38',  // forest green   (was #f59e0b)
  accent:    '#C0714A',  // terracotta
  'brand-bg': '#F0DFCA', // warm cream
},
```

### 3. `app/globals.css` — Body Background

Update `background-color` to align with the new neutral:

```css
body {
  background-color: #faf7f3;   /* slightly warmer off-white than #ffffff */
  color: #0f1724;
}
```

### 4. `app/layout.js` — Metadata

| Field | Old value | New value |
|-------|-----------|-----------|
| `title` | `'Nuttiness'` | `'Káru'` |
| `appleWebApp.title` | `'Nuttiness'` | `'Káru'` |
| `<meta name="theme-color">` | `#8B6F47` | `#3B1F07` |
| `<link rel="apple-touch-icon">` | `/icons/icon-192.png` | `/icons/icon-192.png` *(unchanged path, new image)* |

### 5. `public/manifest.json` — PWA Manifest

| Field | Old value | New value |
|-------|-----------|-----------|
| `name` | `"Nuttiness"` | `"Káru"` |
| `short_name` | `"Nuttiness"` | `"Káru"` |
| `description` | `"Sabor que Enloquece"` | `"Mantequillas de Frutos Secos"` |
| `background_color` | `"#f6efe1"` | `"#F0DFCA"` |
| `theme_color` | `"#8B6F47"` | `"#3B1F07"` |

### 6. `components/AppShell.jsx` — Shell Branding

| Location | Old value | New value |
|----------|-----------|-----------|
| Mobile header `<span>` | `Nuttiness` | `Káru` |
| Mobile header `alt` | `"Nuttiness"` | `"Káru"` |
| Mobile sidebar brand name | `Nuttiness` | `Káru` |
| Mobile sidebar tagline | `Sabor que Enloquece` | `Disfruta sin culpa` |
| Mobile sidebar `aria-label` | `"Nuttiness home"` | `"Káruhome"` |
| Desktop sidebar brand name | `Nuttiness` | `Káru` |
| Desktop sidebar tagline | `Sabor que Enloquece` | `Disfruta sin culpa` |
| Desktop sidebar `aria-label` | `"Nuttiness home"` | `"Káruhome"` |
| Desktop sidebar `title` | `"Nuttiness"` | `"Káru"` |
| Desktop sidebar `alt` | `"Nuttiness"` | `"Káru"` |
| Sidebar/header `bg-[#f6efe1]` (×3) | `#f6efe1` | `bg-brand-bg` |

### 7. `app/login/page.js` — Login Page

| Location | Old value | New value |
|----------|-----------|-----------|
| `<h1>` text | `Nuttiness` | `Káru` |
| `<h1>` hardcoded color `text-[#8B6F47]` | `text-[#8B6F47]` | `text-primary` |
| Input `focus:border-[#8B6F47]` | `focus:border-[#8B6F47]` | `focus:border-primary` |
| Input `focus:ring-[#8B6F47]/20` | `focus:ring-[#8B6F47]/20` | `focus:ring-primary/20` |

---

## Acceptance Criteria

- [ ] `public/icons/icon-192-legacy.png` and `icon-512-legacy.png` exist (old icons backed up)
- [ ] `public/icons/icon-192.png` and `icon-512.png` exist and are derived from the Kárulogo
- [ ] No remaining "Nuttiness" user-facing strings exist in `app/` or `components/` (cookie names and internal identifiers excluded)
- [ ] Sidebar and mobile header render `Káru` brand name and `Disfruta sin culpa` tagline
- [ ] Login page renders `Káru` as the heading with no hardcoded hex colors
- [ ] `tailwind.config.mjs` contains the new `primary`, `secondary`, `accent`, and `brand-bg` tokens
- [ ] `manifest.json` reflects the new name, description, and hex colors
- [ ] `app/layout.js` title and `theme-color` meta are updated
- [ ] No hardcoded `#f6efe1` or `#8B6F47` colors remain in component files (replaced with Tailwind tokens)
- [ ] App loads in the browser without visual regressions on mobile and desktop
