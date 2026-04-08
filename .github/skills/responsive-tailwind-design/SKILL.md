---
name: responsive-tailwind-design
description: 'Create or review responsive Tailwind CSS layouts for this Next.js app. Use when fixing mobile issues, adapting desktop-first pages for phones and laptops, auditing overflow, improving forms, tables, navigation, or sidebar behavior across breakpoints.'
argument-hint: 'Describe the page, component, or layout that needs responsive work and any target devices.'
user-invocable: true
---

# Responsive Tailwind Design

## What This Skill Produces

This workspace skill produces implementation guidance for responsive UI work in this repository so pages remain usable on mobile phones and laptops without redefining the visual language.

It is optimized for the current stack:
- Next.js App Router
- Tailwind CSS
- Page shells, data tables, forms, and management screens

## When to Use

Use this skill when a page or component has any of these problems:
- horizontal scrolling on mobile
- fixed widths that break narrow screens
- tables that are unreadable on phones
- sidebars or navigation that consume too much space on small screens
- form actions that only work comfortably on desktop
- layouts that were built from `lg:` downward instead of mobile-first

## Default Device Targets

Prioritize these viewports unless the prompt says otherwise:
- mobile: 320px to 430px wide
- laptop: 1024px to 1440px wide

Tablet can be treated as an in-between refinement, not the primary design target.

## Procedure

### 1. Audit the current surface

Inspect the page or component for the most common responsive failures:
- fixed widths such as `w-*`, `min-w-*`, or large `px-*` values that force overflow
- multi-column layouts without a single-column mobile fallback
- sidebars that stay permanently visible on small screens
- tables with too many visible columns for phone widths
- action rows that assume mouse precision instead of touch targets
- missing `min-w-0` on flex children that should shrink

Call out the exact elements that cause breakage before changing code.

### 2. Start from the mobile layout

Use unprefixed Tailwind classes for the phone layout first. Add breakpoint prefixes only for enhancements.

Preferred pattern:
- base classes define mobile stacking, wrapping, and touch-friendly spacing
- `sm:` and `md:` refine spacing and density only when needed
- `lg:` introduces desktop-only multi-column or persistent navigation patterns

Avoid desktop-first class sets like `flex-row lg:flex-row` with no mobile fallback.

### 3. Apply layout patterns that fit this repo

Use these defaults unless the screen has stronger requirements:

#### Page containers
- use `px-4 sm:px-6 lg:px-8`
- use `py-4 sm:py-6`
- keep content width fluid with `w-full` and constrain with `max-w-*` only where it improves readability

#### Content sections
- use `grid grid-cols-1` as the base
- promote to `lg:grid-cols-2` or higher only when the content still reads clearly on laptops
- use `gap-4 sm:gap-6`

#### Flex rows
- default to `flex-col`
- switch to `sm:flex-row` or `lg:flex-row` only when it improves scanability
- add `min-w-0` to shrinking content columns
- use `flex-wrap` for button groups, filters, and metadata rows

#### Navigation and shell
- on mobile, prefer an overlay drawer or other dismissible navigation pattern over a permanently visible rail
- on laptop, a persistent sidebar is acceptable if it does not compress main content excessively
- if a shell is collapsible, mobile should favor overlay or drawer behavior instead of a narrow always-on column

For this repository specifically, review the app shell first when a page feels cramped because the sidebar can be the root constraint.

### 4. Adapt dense data views

For entity tables and report screens:
- first try reducing visible columns on mobile
- if critical data still does not fit, switch to stacked cards or list rows on mobile and keep the table for larger screens
- use horizontal scrolling only as the last acceptable fallback for genuinely tabular data
- keep row actions reachable without hover

For pagination and filters:
- stack controls vertically on mobile
- keep primary actions full-width or easy to tap
- avoid filter bars that require the entire width to remain usable

### 5. Adapt forms for touch and narrow screens

For forms in this repo:
- stack fields in one column by default
- move to two columns only at `lg:` unless the fields are very short
- keep action buttons in a vertical or wrapped row on mobile
- ensure inputs and buttons have comfortable tap areas, typically around 44px tall
- keep labels and validation text visible without relying on hover or dense inline layouts

### 6. Protect typography and spacing

Keep text readable under compression:
- prefer `text-sm` or `text-base` for body content
- avoid long unbroken strings without wrapping rules
- use `truncate` only when full text is available elsewhere and truncation is intentional
- reduce decorative spacing before shrinking core content areas

### 7. Verify before considering the work complete

Check all of the following:
- no unexpected horizontal scrolling at phone widths
- primary actions are visible without precision clicking
- navigation remains understandable on mobile and laptop
- forms can be completed on a phone without zooming or hidden controls
- important table or list content is still understandable on mobile
- the layout remains visually balanced on laptop widths

## Decision Rules

- If a component is primarily sequential content, stack it on mobile.
- If a component is primarily comparative data, keep a table on larger screens and consider cards on mobile.
- If a sidebar makes the main content too narrow, change the shell behavior before compressing the page content further.
- If an element only works because there is extra horizontal space, redesign the layout instead of forcing smaller text.

## Tailwind-Specific Guardrails

- Prefer mobile-first utilities over repeated breakpoint overrides.
- Prefer `max-w-*` and fluid width patterns over hard-coded widths.
- Use `overflow-x-auto` only when the data structure truly requires it.
- Use `hidden lg:block` or similar patterns sparingly and always provide a mobile equivalent.
- Do not assume collapsed desktop navigation is a valid mobile navigation pattern.

## Completion Checklist

- The page is usable at phone widths without broken layout.
- The page is comfortable at laptop widths without wasted space or cramped panels.
- Navigation, tables, filters, and forms each have an intentional small-screen behavior.
- Breakpoints reflect content needs instead of arbitrary device assumptions.
- The responsive solution preserves the existing product styling unless the prompt asks for a redesign.