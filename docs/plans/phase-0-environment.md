---
phase: 0
title: Environment Setup
summary: Developer environment and project scaffold instructions — scaffold Next.js (App Router) app and add Tailwind CSS.
---

## 1. Overview

What: Define reproducible environment setup steps to scaffold the Next.js app (App Router) and install Tailwind CSS. This creates a consistent developer environment before implementation phases.

Why: Keep Phase 1 focused on domain/design while ensuring a clean, reproducible project scaffold (Next.js + Tailwind) is available for frontend and backend implementation.

## 2. Scope

Included
- Node.js installation recommendation
- Project scaffold using Next.js (App Router)
- Tailwind CSS installation and minimal config
- Recommended package.json scripts and gitignore

Not included
- Any domain code or feature implementation

## 3. Prerequisites

- macOS (you are on macOS) with a recent Node.js LTS (>=18). Use nvm to manage Node versions.

Recommended quick check:

```bash
node -v
npm -v
```

## 4. Commands (step-by-step)

1) Pick package manager: `npm` (simple, installed with Node). If you prefer `pnpm` or `yarn`, adapt commands accordingly.

2) From the repository root, initialize or scaffold Next.js (App Router) into the current folder:

```bash
# ensure you're in the repo root
cd "$(pwd)"

# if no package.json exists, create it
npm init -y

# scaffold Next.js (App Router) into current folder
npx create-next-app@latest . --use-npm --experimental-app
```

3) Install Tailwind CSS and peers, then initialize config:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

4) Update `tailwind.config.js` content paths (example):

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: { extend: {} },
  plugins: []
}
```

5) Add Tailwind directives to global CSS (e.g. `app/globals.css` or `styles/globals.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

6) Add recommended npm scripts to `package.json` (if not present):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

7) Commit scaffolded files and add `.gitignore` entries (node_modules, .env, .next).

## 5. Developer notes

- Node version: record chosen Node LTS in `engines` in `package.json` or add an `.nvmrc` file (recommended).
- Tailwind: we use utility-first approach across frontend plans; prefer small, composable classes and avoid large global CSS.
- Editor: recommend VSCode with Prettier and Tailwind IntelliSense.

## 6. Acceptance Criteria (Phase 0)

- `package.json` exists with `dev`, `build`, `start` scripts.
- Next.js App Router scaffold present (`app/` directory or `pages/` fallback) and runs with `npm run dev`.
- Tailwind CSS installed, `tailwind.config.js` present, and global CSS includes Tailwind directives.
- README updated with simple run instructions:

```bash
npm install
npm run dev
```

## Next Steps (after approval)

- Architect records approval and then other agents (Domain/Backend/Frontend) may proceed to implement their parts following the approved specs.

---
Stop: do NOT run commands automatically. Wait for explicit human approval to proceed with environment changes.
