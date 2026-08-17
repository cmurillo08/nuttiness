---
title: Copilot instructions for the "nuttiness" repo
---

Purpose
- Provide concise, actionable guidance so an AI coding agent can be productive immediately in this repo.

Big picture (what you'll find)
- **Monolithic Next.js application** (App Router + API routes) organized using DDD-lite: domain definitions, backend APIs, and frontend UI are separated by responsibility.
- **Spec-driven workflow** with phases 1–5 under `/docs/plans/`; phases 1–4 are implemented across foundation, products, expenses, and sales domains.
- **Phase 0 (environment setup)** is complete: Next.js + Tailwind CSS scaffold is deployed. Phases 1–5 define incrementally richer features.
- See `/.github/agents/architect.agent.md` for orchestration rules and agent workflow.

Key files & directories (examples)
- Agent conventions: `/.github/agents/architect.agent.md`, `/.github/agents/domain.agent.md`, `/.github/agents/backend.agent.md`, `/.github/agents/frontend.agent.md` — these contain mandatory agent behaviors and templates (output checklists, approval gates).
- Specs: `/docs/plans/` (architect creates `phase-*.md` files as the single source of truth for a phase).
- Examples: `docs/spreadsheet-examples/`.

Essential repo conventions (must-follow)
- Spec-driven development: do not implement functionality until a spec file for the phase exists and is approved by the human.
- Architect orchestration: the `Architect Agent` must record approvals in the todo tool and use the `agent` tool to instruct downstream agents to proceed. See the exact approval tokens: `approved`, `continue`, `proceed` (case-insensitive).
- Single source for domain rules: `Domain Agent` defines entities & business rules. Backend implements/persists but must not redefine domain logic.
- Role separation: Architect = design + orchestration (no code); Domain = rules + entities (no API/UI); Backend/Frontend = implementation (only after approved spec).
- Todo tool usage: Agents must use the workspace todo tool to record plans and phase progression.
- Branch workflow: use `dev` as the default integration branch, create feature branches from `dev`, and treat `main` as release-only.
- Main branch protection: do not commit directly to `main`; merge into `main` only through pull requests from `dev`.

Developer workflows (how to run & check things)
- **Development**: `npm run dev` starts the Next.js dev server on http://localhost:3000.
- **Building**: `npm run build` compiles the app for production.
- **Database**: Ensure `DATABASE_URL` env var points to a live Postgres instance before running migrations or API calls.
- **Migrations**: Place new `.sql` files in `/migrations/` with timestamp prefix (format: `YYYYMMDD_description.sql`). Run migrations via the test or setup script (check `tests/test_migrations_and_sales.js` for patterns).
- **Backend Tests**: `npm run test:backend` runs Node.js test suite (includes migrations and business logic).
- **Linting**: `npm run lint` runs Next.js eslint checks.

Tech stack & environment (important)
- **Frontend**: Next.js (App Router) — use the `app/` convention; all pages present under `app/(domain)/`.
- **Styling**: Tailwind CSS (v4.2+). Frontend agents must use Tailwind utility classes and prefer small, composable components.
- **Database**: **Postgres (required — must be configured before Phase 1 work)**. Set `DATABASE_URL` environment variable (e.g. `postgresql://user:password@localhost/nuttiness`) before running migrations or the app. Verify connection with `npm run test:backend` after setting. Migrations live in `/migrations/`. Do not substitute with in-repo JSON/SQLite unless explicitly approved.
- **Node**: >=18 LTS (confirmed in `package.json`). Use `nvm` if managing multiple Node versions.
- **Scripts**: `npm run dev` (development), `npm run build` (build), `npm run start` (production), `npm run lint` (eslint), `npm run test:backend` (Node test runner for migrations and business logic).
- **Phase 0 (Environment)**: ✅ **COMPLETE**. Next.js + Tailwind scaffold is deployed with `package.json` and migrations setup (`/migrations/` exists, tests configured). Install dependencies with `npm install` after human approval.
- **Caution**: Always verify `package.json` scripts before running builds or installs. Remove `postcss.config.cjs` if encountered (deprecation from Phase 0).

Integration & patterns to follow
- API contract first: Architect/spec -> Domain definitions -> Backend routes -> Frontend pages.
- Use the `Spec Template Checklist` in `architect.agent.md` when drafting or implementing features (API contract, data model, validation, acceptance checks).
- Example patterns in this repo: Next.js App Router for pages (frontend), Next.js API routes/server actions for backend, centralized domain model files (created by Domain Agent).

What to avoid (project-specific)
- **Approval flow**: Only top-level human messages trigger phase progression. Do not forward approval between agents. Architect must record approvals with exact tokens (`approved`, `continue`, `proceed`) before instructing downstream agents.
- **Agent role boundaries**: Architect generates design specs only (no code). Domain Agent defines entities and business rules only (no API/UI code). Backend/Frontend agents implement per approved specs—do not reinterpret domain rules.
- **Postcss config**: Use `postcss.config.mjs` (ESM). The `.cjs` file is deprecated; remove if present.
- **Database first**: Always verify `DATABASE_URL` is set before running tests or migrations.
- **Spec-driven**: Never implement features without an approved phase spec in `/docs/plans/`.

If something is missing
- **DATABASE_URL not set**: Backend/migration work cannot proceed. Ask the human for Postgres connection details and set the env var.
- **Phase spec missing**: For any phase without a `/docs/plans/phase-*.md` file, ask the Architect Agent or human to create the spec before implementation.
- **Test failures on `npm run test:backend`**: Verify DATABASE_URL is set and Postgres is running. Check `tests/test_migrations_and_sales.js` for debug patterns.
- **If you cannot find** `package.json`, `docs/plans/phase-*.md`, or test scripts, stop and ask the human for the preferred setup.

Feedback
- After applying changes or producing a spec, stop and request explicit human approval using the exact tokens above.

References
- See `/.github/agents/architect.agent.md`, `/.github/agents/domain.agent.md`, `/.github/agents/backend.agent.md`, `/.github/agents/frontend.agent.md` for templates and mandatory workflow rules.
