---
title: Copilot instructions for the "nuttiness" repo
---

Purpose
- Provide concise, actionable guidance so an AI coding agent can be productive immediately in this repo.

Big picture (what you'll find)
- Monolithic Next.js application (App Router + API routes) — the project is organized using a DDD-lite pattern: domain definitions, backend APIs, and frontend UI are separated by responsibility.
- Spec-driven workflow: features are developed in small phases under `/docs/plans/` (e.g. `phase-1-foundation.md`). See `/.github/agents/architect.agent.md` for orchestration rules.

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

Developer workflows (how to run & check things)
- Look for `package.json` at repository root to discover exact scripts. If present, prefer the scripts there (typical Next.js scripts: `dev`, `build`, `start`).
- If `package.json` is missing, ask the human for the project's package manager and exact commands before running installs or builds.
- Tests: search for `test` scripts in `package.json` or CI files. Do not assume test runner — discover it first.

Tech stack & environment (important)
- Frontend: Next.js (App Router) — use the `app/` convention when present.
- Styling: Tailwind CSS (utility-first). Frontend agents must use Tailwind classes and prefer small, composable utilities.
- Database: Postgres is the canonical persistence for Phase 1+. Do not substitute with in-repo JSON/SQLite unless the human explicitly approves.
- Node: target an active LTS (>=18). Recommend using `nvm` and recording the version in `.nvmrc`.
- Phase-0: A Phase-0 environment/setup spec exists at `docs/plans/phase-0-environment.md`. Follow that spec for scaffolding (Next.js + Tailwind) and do NOT run scaffold/install commands unless the human approves and records approval via the todo tool.
- Caution: Always check `package.json` before running installs. If missing, stop and request permission.

Integration & patterns to follow
- API contract first: Architect/spec -> Domain definitions -> Backend routes -> Frontend pages.
- Use the `Spec Template Checklist` in `architect.agent.md` when drafting or implementing features (API contract, data model, validation, acceptance checks).
- Example patterns in this repo: Next.js App Router for pages (frontend), Next.js API routes/server actions for backend, centralized domain model files (created by Domain Agent).

What to avoid (project-specific)
- Do not proceed on human approval forwarded by another agent — approval must be a top-level human message.
- Do not generate code as Architect Agent. Do not reinterpret domain rules as Backend/Frontend — follow the Domain Agent outputs.

If something is missing
- If you cannot find `package.json`, `specs/phase-*.md`, or CI scripts, stop and ask the human for the preferred commands and where to place specs.

Feedback
- After applying changes or producing a spec, stop and request explicit human approval using the exact tokens above.

References
- See `/.github/agents/architect.agent.md`, `/.github/agents/domain.agent.md`, `/.github/agents/backend.agent.md`, `/.github/agents/frontend.agent.md` for templates and mandatory workflow rules.
