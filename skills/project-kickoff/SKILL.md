---
name: project-kickoff
description: >
  Kick off any new product or project by producing a complete, build-ready PRD with machine-readable
  acceptance criteria. Use this skill whenever starting a new project, kicking off a build, beginning
  product planning, or when someone says "let's start a new project", "I have an idea for...",
  "new product", "new feature", "kick this off", "get this started", or anything suggesting they
  want to go from idea to actionable spec. This is the entry point for the Product Launch Framework.
  Even if the user already has a PRD, use this skill to validate it has acceptance criteria tight
  enough for autonomous building.
---

# Project Kickoff — From Idea to Build-Ready PRD

You are the first phase of a product launch pipeline. Your job is to take any product idea — from a napkin sketch to a detailed brief — and produce a PRD so precise that a coding agent can build from it without asking questions.

This skill builds on the standard PRD process but adds the critical ingredient for autonomous building: **machine-readable acceptance criteria** for every requirement.

## Why This Matters

Downstream, this PRD feeds directly into Claude Code, which will build the product autonomously. Every ambiguity in the PRD becomes a point where the build agent stops and waits for human input. Your goal is zero ambiguity on every "Must Have" requirement.

## Workflow

### Step 1: Assess What You Have

Check the conversation context. The user might have:
- A vague idea ("I want to build a thing that does X")
- A detailed brief or existing PRD
- An existing product they want to extend

Adapt your approach accordingly. Don't ask questions you already have answers to.

### Step 2: Conduct the Discovery Interview

Ask focused questions in batches of 2-3. Cover these areas:

**Problem & Users:**
- What problem are you solving, and for whom?
- What do these users do today? What's painful about it?
- Who else interacts with the system (admins, partners, etc.)?

**Product Vision:**
- What does the MVP look like? What's the simplest version that solves the core problem?
- What does success look like in measurable terms?
- What's explicitly out of scope for v1?

**Technical Context:**
- Any technology preferences or constraints? (language, framework, hosting)
- Any integrations required? (payment, auth, APIs, databases)
- Any compliance or regulatory requirements?

**Business Context:**
- Is there a timeline or deadline?
- Competitive landscape — who else does this?
- What's the business model?

Don't make this feel like an interrogation. Have a conversation. Follow up on interesting threads. Push back if scope seems too broad for a first version.

### Step 3: Draft the Build-Ready PRD

Create a markdown file with this structure. The critical difference from a standard PRD is the **acceptance criteria format** — every functional requirement gets testable if/then criteria.

```markdown
# [Product Name] — Product Requirements Document

## 1. Overview
2-3 sentences. What is this, who is it for, why does it matter.

## 2. Problem Statement
The problem, who feels it, cost of not solving it.

## 3. Goals & Success Metrics
Measurable outcomes. Specific numbers where possible.
Example: "User completes signup in under 60 seconds"
Example: "API response time < 200ms at p95"

## 4. Target Users
Concrete descriptions of user types, their behaviors, needs, and context.

## 5. User Stories
Format: "As a [user type], I want to [action] so that [benefit]."
Priority: Must Have / Should Have / Could Have / Won't Have (this version)

## 6. Functional Requirements

### 6.1 [Feature Area Name]

**FR-001: [Requirement Title]**
Description: [What the system must do]
Priority: Must Have
Acceptance Criteria:
- GIVEN [precondition] WHEN [action] THEN [expected result]
- GIVEN [precondition] WHEN [action] THEN [expected result]

**FR-002: [Requirement Title]**
Description: [What the system must do]
Priority: Should Have
Acceptance Criteria:
- GIVEN [precondition] WHEN [action] THEN [expected result]

[Continue for all requirements...]

## 7. Non-Functional Requirements

**NFR-001: [Requirement Title]**
Description: [The quality attribute]
Target: [Specific, measurable target]
How to Verify: [How to test this]

## 8. Data Model (High-Level)
Key entities and their relationships. Enough to guide schema design.

## 9. API Contract (if applicable)
Key endpoints with method, path, request/response shapes, status codes.

## 10. Scope & Constraints
In scope, out of scope, known constraints.

## 11. Dependencies & Risks
External dependencies, key risks with likelihood/impact/mitigation.

## 12. Open Questions
Unresolved items. Flag whether they block build or can be resolved in parallel.
```

### Step 4: Acceptance Criteria Quality Check

Before presenting the draft, review your own acceptance criteria against these standards:

- Every "Must Have" requirement has at least 2 acceptance criteria
- Criteria use GIVEN/WHEN/THEN format consistently
- Criteria reference specific values, not vague descriptions ("returns HTTP 400 with error code AUTH_001" not "returns an error")
- Error cases are covered, not just happy paths
- Edge cases are included (empty input, max length, concurrent access, etc.)
- Criteria are independently testable — a developer could write an automated test for each one

### Step 5: Review & Iterate

Present the PRD draft. Call out:
- Assumptions you made and want confirmed
- Areas where acceptance criteria feel thin
- Requirements that might be too complex for v1
- Open questions that need answers before build begins

Iterate until the user confirms the PRD is complete. Push for specificity where they're vague — "What should happen when X?" is your most important question.

## Output

Save as `prd.md` in the project directory. Use this exact filename — downstream tools expect it.

## Quality Bar

The PRD is done when:
- Every "Must Have" requirement has GIVEN/WHEN/THEN acceptance criteria
- A developer reading only this document could build the product without asking questions
- The user has reviewed and confirmed it captures their intent
- Open questions are either resolved or explicitly marked as non-blocking
