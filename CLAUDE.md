# CLAUDE.md — nuttiness

Purpose
- Provide concise, actionable guidance so Claude Code can be productive immediately in this repo.

Big picture (what you'll find)
- **Monolithic Next.js application** (App Router + API routes) organized using DDD-lite: domain definitions, backend APIs, and frontend UI are separated by responsibility.
- **Spec-driven workflow** with phases 1–5 under `/docs/plans/`; phases 1–4 are implemented across foundation, products, expenses, and sales domains.
- **Phase 0 (environment setup)** is complete: Next.js + Tailwind CSS scaffold is deployed. Phases 1–5 define incrementally richer features.
- See "Agent workflow" below for how `architect`/`backend`/`frontend` hand off work.

Agent workflow (the main session is the orchestrator, not the agents)
- Agents don't invoke each other — `architect` has no `Agent` tool at all, and `backend`/`frontend` have no way to invoke one another either. Orchestration is done by whoever is talking to the human directly: the main Claude Code session (you), using its own `Agent` tool. The flow:
  1. The human describes a feature to the main session, with whatever details they have.
  2. The main session invokes `architect` with that request. `architect` writes/revises `docs/plans/phase-X-*.md` and stops — its final report is the plan.
  3. The main session presents the plan to the human and gets an explicit approval (`approved` / `continue` / `proceed`, case-insensitive) **in the main conversation**. This is the single approval gate for the whole feature.
  4. Once approved, the main session invokes `backend` and `frontend` **in parallel** (two `Agent` calls in the same turn), each given the approved phase file and told which phase to implement. Neither waits on the other's actual code — both build from the plan's contract (backend implements the API, frontend builds against the API shape the plan defines) — so parallel execution is safe. Each agent goes straight from design to code in one pass; there's no second approval pause per agent.
  5. The main session reports back the combined result (files touched, what was built) for the human to review as a normal code review — not another approval ceremony.
- This is deliberate, not a workaround for a missing feature: Claude Code subagents *can* technically nest-invoke each other, but subagent definitions only load at session start (no live-reload) and adding a delegation layer between agents just duplicates what the main session already does natively with the `Agent` tool.

Key files & directories (examples)
- Agent conventions: `.claude/agents/architect.md`, `.claude/agents/backend.md`, `.claude/agents/frontend.md` — these contain mandatory agent behaviors and templates (output checklists, approval gates).
- Skills: `.claude/skills/responsive-tailwind-design/SKILL.md` — responsive Tailwind/Next.js UI guidance, invoked automatically or via `/responsive-tailwind-design`.
- Specs: `/docs/plans/` (architect creates `phase-*.md` files as the single source of truth for a phase, including the domain model — entities and business rules).
- Examples: `docs/spreadsheet-examples/`.

Essential repo conventions (must-follow)
- Spec-driven development: do not implement functionality until a phase plan exists and is approved by the human.
- Approval tokens: `approved`, `continue`, `proceed` (case-insensitive), given directly by the human to the main session — this is the single gate for a feature. See "Agent workflow" above.
- Architect write scope: the `architect` agent's tools are technically restricted (via a `PreToolUse` hook) to writing/editing only `docs/plans/**` — it cannot write source code, even if asked, regardless of what it's told mid-conversation.
- Single source for domain rules: the architect's phase plan defines entities & business rules (there is no separate domain agent). Backend implements/persists but must not redefine domain logic.
- Role separation: Architect = design only, including the domain model (no code, no delegation); Backend/Frontend = implementation, invoked in parallel by the main session once the plan is approved, each going straight from design to code (no second per-agent approval pause).
- Todo tracking: agents must use `TodoWrite` to record plans and phase progression.
- UI work: when creating or updating pages, layouts, or Tailwind components, load the `.claude/skills/responsive-tailwind-design/SKILL.md` skill for mobile/laptop responsive rules.
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
- **Styling**: Tailwind CSS (v4.2+). Frontend work must use Tailwind utility classes and prefer small, composable components.
- **Database**: **Postgres (required — must be configured before Phase 1 work)**. Set `DATABASE_URL` environment variable (e.g. `postgresql://user:password@localhost/nuttiness`) before running migrations or the app. Verify connection with `npm run test:backend` after setting. Migrations live in `/migrations/`. Do not substitute with in-repo JSON/SQLite unless explicitly approved.
- **Node**: >=18 LTS (confirmed in `package.json`; see `.nvmrc`). Use `nvm` if managing multiple Node versions.
- **Scripts**: `npm run dev` (development), `npm run build` (build), `npm run start` (production), `npm run lint` (eslint), `npm run test:backend` (Node test runner for migrations and business logic).
- **Phase 0 (Environment)**: ✅ **COMPLETE**. Next.js + Tailwind scaffold is deployed with `package.json` and migrations setup (`/migrations/` exists, tests configured). Install dependencies with `npm install` after human approval.
- **Caution**: Always verify `package.json` scripts before running builds or installs. Remove `postcss.config.cjs` if encountered (deprecation from Phase 0).

Integration & patterns to follow
- API contract first: Architect/spec -> Domain definitions -> Backend routes -> Frontend pages.
- Use the `Spec Template Checklist` in `architect.md` when drafting or implementing features (API contract, data model, validation, acceptance checks).
- Example patterns in this repo: Next.js App Router for pages (frontend), Next.js API routes/server actions for backend, centralized domain model files (defined by the architect in the phase plan).

What to avoid (project-specific)
- **Approval flow**: Only a top-level human message to the main session counts as approval. Don't let `backend`/`frontend` start on the strength of a plan that hasn't actually been approved yet, and don't skip straight to implementation without having invoked `architect` first for a phase that has no plan.
- **Agent role boundaries**: Architect generates plans only (no code, no invoking other agents), including entities and business rules. Backend/Frontend agents implement per approved plans — do not reinterpret domain rules.
- **Postcss config**: Use `postcss.config.mjs` (ESM). The `.cjs` file is deprecated; remove if present.
- **Database first**: Always verify `DATABASE_URL` is set before running tests or migrations.
- **Spec-driven**: Never implement features without an approved phase spec in `/docs/plans/`.

If something is missing
- **DATABASE_URL not set**: Backend/migration work cannot proceed. Ask the human for Postgres connection details and set the env var.
- **Phase plan missing**: For any phase without a `/docs/plans/phase-*.md` file, invoke the `architect` agent (or ask the human) to create the plan before implementation.
- **Test failures on `npm run test:backend`**: Verify DATABASE_URL is set and Postgres is running. Check `tests/test_migrations_and_sales.js` for debug patterns.
- **If you cannot find** `package.json`, `docs/plans/phase-*.md`, or test scripts, stop and ask the human for the preferred setup.

Feedback
- After `architect` produces a plan, stop and request explicit human approval using the exact tokens above before invoking `backend`/`frontend`.

References
- See `.claude/agents/architect.md`, `.claude/agents/backend.md`, `.claude/agents/frontend.md` for templates and mandatory workflow rules.
- See `.claude/skills/responsive-tailwind-design/SKILL.md` for responsive UI guidance.
