# Nuttiness — Phase 0 Environment

This repo has the Phase 0 scaffold for the developer environment (Next.js + Tailwind). Do NOT run installs automatically—request permission first.

## Branch workflow

Use `dev` as the integration branch and keep `main` for production-ready code only.

1. Create and push `dev` once if it does not exist yet:

   ```bash
   git checkout -b dev
   git push -u origin dev
   ```

2. In GitHub, open **Settings → Branches** (or **Settings → Rules → Rulesets**) and:
   - set `dev` as the default branch
   - add protection for `main`
   - disable direct pushes to `main`
   - require pull requests before merging into `main`

3. Create feature branches from `dev`, then open pull requests back into `dev`.
4. When `dev` is ready for release, open a pull request from `dev` into `main`.

Quick start (after approval):

```bash
npm install
npm run dev
```

Phase-0 acceptance checklist:
- `package.json` with `dev`, `build`, `start` scripts
- `app/` scaffold present (App Router)
- `tailwind.config.js` and `postcss.config.js` present
- `app/globals.css` includes Tailwind directives
