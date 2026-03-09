# Product Launch Framework — Master Playbook

A reusable framework for taking any product idea from definition through deployment, marketing, and ongoing support — using Claude as your autonomous team.

---

## How This Framework Works

This playbook defines **7 phases** that every project moves through. Each phase has a dedicated Cowork skill (for planning work) and a Claude Code prompt (for build work). The phases are sequential, but each one is self-contained: it takes a clear input, produces a clear output, and that output becomes the input for the next phase.

The key principle: **invest heavily in Phases 1–2 (Define & Architect) so that Phases 3–5 (Build, Test, Deploy) can run autonomously.** The more precise your requirements and architecture docs are, the less Claude Code needs to stop and ask you questions.

---

## Phase 0: Project Setup

Before any planning begins, create the project workspace. This takes 30 seconds and ensures every artifact has a home from the start.

```bash
# Create the project directory
mkdir -p ~/projects/my-project-name
cd ~/projects/my-project-name

# Initialize git
git init
git branch -m main

# Create the standard directory structure
mkdir -p docs prompts src tests

# Create a .gitignore (adjust for your stack — this is a sensible starting point)
cat > .gitignore << 'EOF'
node_modules/
__pycache__/
.env
.env.*
!.env.example
*.pyc
.DS_Store
dist/
build/
coverage/
.vscode/
.idea/
EOF

# Create the initial README
cat > README.md << 'EOF'
# [Project Name]

> One-line description of what this project does.

## Status

Phase 0: Project initialized. Planning in progress.

## Project Documents

| Document | Status | Description |
|----------|--------|-------------|
| [PRD](prd.md) | Pending | Product requirements and acceptance criteria |
| [Architecture](architecture.md) | Pending | Technical design and system architecture |
| [Tasks](tasks.md) | Pending | Ordered build task breakdown |
| [Test Plan](test-plan.md) | Pending | QA strategy and test cases |
| [Deploy Plan](deploy-plan.md) | Pending | Infrastructure and deployment runbook |
| [GTM Plan](gtm-plan.md) | Pending | Go-to-market strategy and launch assets |
| [Instrumentation](instrumentation-plan.md) | Pending | Analytics, monitoring, and alerting plan |

## Quick Start

_To be completed after Phase 3 (Build)._

## License

_TBD_
EOF

# Initial commit
git add .
git commit -m "Phase 0: Project setup — directory structure, .gitignore, README"

# Create remote repo and push (GitHub — adjust if using GitLab/Bitbucket)
gh repo create my-project-name --private --source=. --push
```

If you don't use the `gh` CLI, create the remote repo manually and run:
```bash
git remote add origin git@github.com:youruser/my-project-name.git
git push -u origin main
```

**In Cowork:** Select this project folder as your working directory so skills can read from and write to it directly.

**What goes where:**
- `docs/` — Supplementary documentation, user guides, SOPs (produced in Phase 7)
- `prompts/` — Copy the Claude Code prompts from the framework here (or reference them from your central framework folder)
- `src/` — Application code (Phase 3 will populate this)
- `tests/` — Test files (Phases 3–4 will populate this)
- Project root — Planning documents (`prd.md`, `architecture.md`, `tasks.md`, etc.) live here so Claude Code finds them easily and they're visible in the repo at a glance

---

## The Phases

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 0: PROJECT SETUP  → Git repo + directory structure   │
│  (Terminal — 30 seconds)                                    │
├─────────────────────────────────────────────────────────────┤
│  PHASE 1: DEFINE         → PRD + Acceptance Criteria        │
│  (Cowork — interactive)                                     │
├─────────────────────────────────────────────────────────────┤
│  PHASE 2: ARCHITECT      → Tech Design + Task Breakdown     │
│  (Cowork — interactive)                                     │
├─────────────────────────────────────────────────────────────┤
│  PHASE 3: BUILD          → Working Code + Passing Tests     │
│  (Claude Code — autonomous)                                 │
├─────────────────────────────────────────────────────────────┤
│  PHASE 4: TEST & HARDEN  → Verified, Production-Ready Code  │
│  (Claude Code — autonomous)                                 │
├─────────────────────────────────────────────────────────────┤
│  PHASE 5: DEPLOY         → Live System + Runbook            │
│  (Claude Code — autonomous)                                 │
├─────────────────────────────────────────────────────────────┤
│  PHASE 6: MARKET         → GTM Assets + Launch Plan         │
│  (Cowork — interactive)                                     │
├─────────────────────────────────────────────────────────────┤
│  PHASE 7: INSTRUMENT &   → Dashboards, Docs, SOPs          │
│  SUPPORT (Cowork + Code)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Define

**Goal:** Produce a PRD so specific that an engineer (human or AI) can build from it without asking questions.

**Tool:** Cowork → `project-kickoff` skill (wraps the PRD skill with additions)

**Input:** Your idea — however rough or polished.

**Process:**
1. The skill interviews you about the problem, users, constraints, and scope
2. It produces a full PRD with prioritized user stories and functional requirements
3. Critically, it also generates **machine-readable acceptance criteria** for every requirement — these become the "done" definitions that Claude Code uses to self-validate during build

**Output:** `prd.md` containing:
- Problem statement, goals, success metrics
- User stories with MoSCoW prioritization (Must/Should/Could/Won't)
- Functional requirements with testable acceptance criteria
- Non-functional requirements (performance, security, accessibility)
- Scope boundaries, dependencies, risks, open questions

**Quality Gate:** You review the PRD and confirm it's complete. Every "Must Have" requirement needs an acceptance criterion that can be verified programmatically or by inspection.

**Git checkpoint:**
```bash
git add prd.md
git commit -m "Phase 1: PRD complete — requirements and acceptance criteria defined"
git push
```
Update `README.md`: change the PRD row status from "Pending" to "Complete" and update the project Status line to "Phase 1 complete. Architecture in progress."

---

## Phase 2: Architect

**Goal:** Translate the PRD into technical decisions and a task breakdown that Claude Code can execute sequentially.

**Tool:** Cowork → `architecture` skill

**Input:** The approved `prd.md`

**Process:**
1. The skill reads your PRD and proposes an architecture (stack, data model, API design, component structure)
2. It asks you to confirm or adjust key decisions (database choice, auth approach, hosting, etc.)
3. It breaks the build into **milestones** — ordered chunks of work where each milestone produces a working, testable increment
4. Each milestone is broken into **tasks** — specific implementation units with clear inputs, outputs, and acceptance criteria pulled from the PRD

**Output:** `architecture.md` containing:
- Technology stack with rationale
- System architecture diagram (Mermaid)
- Data model / schema design
- API contract definitions
- Component/module breakdown
- Milestone plan with ordered tasks
- Each task references specific PRD requirements it fulfills

**Output:** `tasks.md` containing:
- Ordered list of implementation tasks grouped by milestone
- Each task has: description, files to create/modify, acceptance criteria, dependencies on other tasks
- Tasks are sequenced so Claude Code can execute them top-to-bottom

**Quality Gate:** You review the architecture and task breakdown. Confirm the stack, milestone order, and that no requirements are missing from the task list.

**Git checkpoint:**
```bash
git add architecture.md tasks.md
git commit -m "Phase 2: Architecture and task breakdown complete"
git push
```
Update `README.md`: mark Architecture and Tasks as "Complete". Update Status to "Phase 2 complete. Ready for build."

### Optional: Generate Test Plan

Before moving to the build phase, you can optionally run the `test-plan` skill in Cowork to produce `test-plan.md`. This gives the build and hardening agents a detailed testing roadmap beyond the PRD acceptance criteria. Recommended for complex projects; optional for straightforward ones.

---

## Phase 3: Build

**Goal:** Turn the architecture and task list into working, tested code.

**Tool:** Claude Code (CLI) — runs autonomously

**Input:** `prd.md`, `architecture.md`, `tasks.md`

**How to Run:**
```bash
# Point Claude Code at your project and let it build
claude -p "$(cat prompts/build.md)"
```

**What Happens:**
1. Claude Code reads all three docs
2. It initializes the project (scaffolding, dependencies, config)
3. It works through tasks.md top-to-bottom
4. For each task, it: writes the code → writes tests for that code → runs the tests → fixes failures → moves to next task
5. At each milestone boundary, it runs the full test suite to catch regressions

**Output:** A working codebase with tests passing for all completed milestones.

**Quality Gate:** All tests pass. You can optionally do a spot-check at milestone boundaries, but the goal is minimal intervention.

**Git checkpoint:** The build prompt already instructs Claude Code to commit after each task and at each milestone boundary. After the build completes:
```bash
git push
```
Update `README.md`: update Status to "Phase 3 complete. Code built, unit tests passing." Add a "Quick Start" section with instructions for running the app locally.

---

## Phase 4: Test & Harden

**Goal:** Go beyond unit tests — integration testing, edge cases, security, performance.

**Tool:** Claude Code (CLI) — runs autonomously

**Input:** The codebase from Phase 3, plus `prd.md` (for acceptance criteria), and `test-plan.md` if generated in Phase 2

**How to Run:**
```bash
claude -p "$(cat prompts/test-and-harden.md)"
```

**What Happens:**
1. Claude Code reads the PRD acceptance criteria and the existing test suite
2. It writes integration tests covering cross-component workflows
3. It writes edge case tests (boundary values, error states, malformed input)
4. It runs a security review (injection, auth bypass, data exposure)
5. It runs performance tests if NFRs specify targets
6. It fixes any issues found and re-runs until clean

**Output:** Hardened codebase with comprehensive test coverage, security fixes applied, performance validated.

**Quality Gate:** Full test suite passes. Security review produces no critical/high findings. Performance meets NFR targets.

**Git checkpoint:**
```bash
git push
```
Update `README.md`: update Status to "Phase 4 complete. Hardened and production-ready." Add test coverage stats and security review summary.

---

## Phase 5: Deploy

**Goal:** Get the system running in a production (or staging) environment with a documented deployment process.

**Tool:** Claude Code (CLI) + Cowork → `deploy-plan` skill

**Input:** The codebase, `architecture.md` (for infra decisions)

**Process:**
1. Use the `deploy-plan` skill in Cowork to generate a deployment runbook (infrastructure setup, CI/CD pipeline, environment config, rollback procedures)
2. Use Claude Code to execute the technical deployment:
```bash
claude -p "$(cat prompts/deploy.md)"
```
3. Claude Code creates Dockerfiles, CI/CD configs, IaC templates, and deployment scripts
4. If you have cloud credentials configured, it can deploy directly; otherwise it produces ready-to-run scripts

**Output:** Deployment artifacts (Dockerfile, CI/CD config, IaC), deployment runbook, monitoring setup.

**Quality Gate:** The system deploys successfully to staging. Health checks pass. Rollback procedure is tested.

**Git checkpoint:**
```bash
git add deploy-plan.md Dockerfile docker-compose.yml .github/ DEPLOY.md
git commit -m "Phase 5: Deployment artifacts and runbook"
git push
```
Update `README.md`: mark Deploy Plan as "Complete". Add deployment instructions or link to `DEPLOY.md`. Update Status to "Phase 5 complete. Deployed to staging."

---

## Phase 6: Market

**Goal:** Produce go-to-market assets — positioning, copy, launch plan.

**Tool:** Cowork → `go-to-market` skill

**Input:** `prd.md` (for product understanding), your target audience and business context

**Process:**
1. The skill interviews you about positioning, competitive landscape, channels, and budget
2. It generates a GTM package: messaging framework, landing page copy, email sequences, social content, pitch deck outline
3. You review, refine, iterate

**Output:** `gtm-plan.md` plus individual assets (copy docs, email drafts, etc.)

**Quality Gate:** You review all materials and confirm they match your brand voice and strategy.

**Git checkpoint:**
```bash
git add gtm-plan.md landing-page-copy.md email-sequence.md social-posts.md launch-blog-post.md
git commit -m "Phase 6: GTM plan and launch assets"
git push
```
Update `README.md`: mark GTM Plan as "Complete". Update Status to "Phase 6 complete. Launch assets ready."

---

## Phase 7: Instrument & Support

**Goal:** Set up observability and create the documentation needed for ongoing operations.

**Tool:** Cowork → `instrumentation` skill + `support-docs` skill; Claude Code for implementation

**Input:** `prd.md` (success metrics), `architecture.md` (system components), the deployed system

**Process:**
1. Use the `instrumentation` skill to define KPIs, tracking events, monitoring alerts, and dashboard layouts
2. Use the `support-docs` skill to generate user documentation, internal SOPs, troubleshooting guides, and knowledge base articles
3. Use Claude Code to implement the analytics/monitoring code:
```bash
claude -p "$(cat prompts/instrument.md)"
```

**Output:** Analytics tracking plan, monitoring/alerting config, dashboards, user docs, internal SOPs, KB articles.

**Quality Gate:** Key metrics are being captured. Alerts fire correctly on test triggers. Documentation covers the most common user questions and operational procedures.

**Git checkpoint:**
```bash
git add instrumentation-plan.md docs/
git commit -m "Phase 7: Instrumentation, user docs, and SOPs"
git push
```
Update `README.md`: mark Instrumentation as "Complete". Update Status to "Phase 7 complete. Launched." Do a final README pass — make sure Quick Start instructions are current, all document links work, and the description reflects what was actually built (not just what was planned).

---

## Quick-Start Checklist

For any new project:

1. **Create the project** — `mkdir`, `git init`, create remote repo, set up directory structure, push (see Phase 0)
2. **Select the folder** in Cowork as your working directory
3. Run `project-kickoff` skill → produces `prd.md` → **commit + push + update README**
4. Run `architecture` skill → produces `architecture.md` + `tasks.md` → **commit + push + update README**
5. Review both docs, approve
6. Switch to Claude Code:
   - Run `prompts/build.md` → working code with tests → **push + update README**
   - Run `prompts/test-and-harden.md` → hardened code → **push + update README**
   - Run `prompts/deploy.md` → deployed system → **push + update README**
7. Back in Cowork:
   - Run `deploy-plan` skill → deployment runbook → **commit + push**
   - Run `go-to-market` skill → marketing assets → **commit + push**
   - Run `instrumentation` skill → tracking plan → **commit + push**
   - Run `support-docs` skill → documentation → **commit + push**
8. In Claude Code:
   - Run `prompts/instrument.md` → monitoring implemented → **push**
9. **Final README pass** — ensure everything is current
10. **Final push** → Launch

---

## Version Control & Documentation Cadence

Git and documentation aren't afterthoughts — they're woven into every phase. Here's the rhythm:

**When to commit:**
- After every phase completion (at minimum)
- After every milestone within the build phase (the build prompt handles this automatically)
- After any significant decision or document revision
- Before switching to a different phase or tool

**When to push:**
- After every commit. There's no reason to let local commits pile up. If your machine dies, your work is safe.

**When to update the README:**
- After every phase. The README is the project's front page — anyone looking at the repo (including future you) should be able to tell at a glance what state the project is in, what's been completed, and what's next.
- After the build phase: add or update the "Quick Start" section with actual setup and run instructions
- After the deploy phase: add or link to deployment instructions
- After the docs phase: link to user-facing documentation
- Final pass before launch: make sure everything reflects reality, not just the plan

**What the README should always show:**
- What the project is (one-line description)
- Current status/phase
- Document table with completion status
- How to run the project locally (once it's buildable)
- How to deploy (once deployment exists)
- Links to key docs

**When to update other documentation:**
- If a phase produces output that changes a previous document (e.g., architecture decisions made during build that differ from the original plan), update the source document to reflect what was actually built. Documentation that describes the plan but not the reality is worse than no documentation.

**Commit message convention:**
Use the phase as a prefix for easy scanning in git log:
```
Phase 0: Project setup
Phase 1: PRD complete
Phase 2: Architecture and task breakdown
Phase 3/M1: Milestone 1 — auth and user management
Phase 3/M2: Milestone 2 — core feature implementation
Phase 4: Test hardening — integration tests and security review
Phase 5: Deployment artifacts and CI/CD
Phase 6: GTM plan and launch assets
Phase 7: Instrumentation and support documentation
```

---

## Tips for Maximum Autonomy

**In the PRD phase:**
- Write acceptance criteria as if/then statements: "IF the user submits the form without an email, THEN the system displays 'Email is required' and does not submit"
- Define every API endpoint's request/response shape
- Specify exact error codes and messages
- Include data validation rules

**In the architecture phase:**
- Choose boring technology unless you have a specific reason not to
- Define the file/folder structure explicitly
- Specify naming conventions (files, variables, CSS classes)
- Include example code patterns for common operations (API call, DB query, component structure)

**In the build phase:**
- Let Claude Code finish a full milestone before intervening
- If it gets stuck, give it a specific hint rather than a vague direction
- Keep your test suite fast — slow tests slow down the build loop

**General:**
- Store all docs (PRD, architecture, tasks) in the project repo so Claude Code always has access
- Use git commits at milestone boundaries as checkpoints
- If something goes wrong, you can always point Claude Code at a specific section of the PRD and say "re-implement this requirement"
