---
description: "Use when creating or updating Next.js pages, layouts, and Tailwind UI components in this repo. Covers responsive design for mobile phones and laptops, including forms, tables, filters, navigation, and overflow prevention."
name: "Responsive Tailwind UI"
applyTo:
  - "app/layout.js"
  - "app/**/page.js"
  - "app/**/loading.js"
  - "app/**/error.js"
  - "app/**/template.js"
  - "components/**/*.js"
  - "components/**/*.jsx"
---

# Responsive Tailwind UI

- Treat responsive behavior as part of the initial implementation, not a later cleanup pass.
- Build mobile-first with unprefixed Tailwind classes first, then add `sm:`, `md:`, and `lg:` only for necessary enhancements.
- Optimize primarily for phone widths from 320px to 430px and laptop widths from 1024px to 1440px.
- Use `px-4 sm:px-6 lg:px-8`, `py-4 sm:py-6`, `w-full`, and `min-w-0` as the default foundation for flexible page layouts.
- Default grids and content sections to one column on small screens and only increase columns at larger breakpoints when readability remains strong.
- Default flex layouts to `flex-col`; only switch to horizontal layouts at larger breakpoints when actions and content still scan cleanly.
- Prefer wrapped or stacked action rows, filters, and metadata groups on mobile instead of forcing everything onto one line.
- For forms, use one-column layouts by default, move to two columns only when the fields are short or the larger breakpoint clearly improves usability, and keep controls touch-friendly.
- For dense tables and reports, reduce columns first; if the data still does not fit, prefer mobile cards or list rows before relying on horizontal scrolling.
- Use `overflow-x-auto` only when the structure is truly tabular and cannot be meaningfully restructured for mobile.
- Treat sidebar and shell behavior as a root responsive concern: on phones, prefer an overlay drawer or other dismissible navigation instead of a persistent narrow rail.
- If a page feels cramped, check whether the shell is the constraint before shrinking text, spacing, or controls.
- Avoid hard-coded widths, large fixed paddings, and layout choices that only work because desktop has extra horizontal space.
- Preserve the existing visual language of the repo while making the layout intentionally usable on both mobile and laptop.
- Before finishing, verify there is no unintended horizontal scrolling, primary actions remain easy to reach on phones, and the main content stays readable on laptops.

For detailed decision rules and deeper workflow guidance, follow [.github/skills/responsive-tailwind-design/SKILL.md](../skills/responsive-tailwind-design/SKILL.md).