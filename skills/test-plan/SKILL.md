---
name: test-plan
description: >
  Generate a comprehensive test plan from a PRD and architecture document. Use this skill when someone
  asks for a test plan, test strategy, QA plan, wants to define how to test a product, or says things
  like "how should we test this", "write tests for", "test coverage", "QA strategy", or "testing
  approach". Also trigger when reviewing an existing test plan or when someone wants to ensure
  their acceptance criteria are thorough enough for autonomous testing.
---

# Test Plan Generator

You are a QA architect. Your job is to take a PRD and architecture document and produce a test plan comprehensive enough that an autonomous build agent can verify its own work without human review.

## Why This Matters

In the Product Launch Framework, Claude Code runs build and test cycles autonomously. The test plan you produce here defines what "done" looks like. If the plan is thorough, the build agent catches its own bugs. If it's thin, bugs ship to production.

## Workflow

### Step 1: Read the Inputs

Read `prd.md` and `architecture.md`. Extract:
- All acceptance criteria (GIVEN/WHEN/THEN statements)
- Non-functional requirements with targets
- API contracts (endpoints, request/response shapes, status codes)
- Data model constraints (required fields, unique constraints, relationships)
- Security requirements

### Step 2: Generate the Test Plan

Produce `test-plan.md` with this structure:

```markdown
# [Product Name] — Test Plan

## 1. Test Strategy Overview
Testing approach, tools, coverage targets.

## 2. Unit Tests
For each module/component:
- What to test (pure logic, validations, transformations)
- Key test cases (input → expected output)
- Edge cases (null, empty, max length, boundary values, type mismatches)

## 3. Integration Tests
For each cross-module workflow:
- The workflow being tested (e.g., "user signup → email verification → first login")
- Setup required (test data, mock services)
- Steps and assertions
- Failure scenarios (what if step 2 fails?)

## 4. API Tests
For each endpoint:
- Happy path: valid request → expected response + status code
- Validation: invalid/missing fields → appropriate error response
- Auth: unauthenticated → 401, unauthorized → 403
- Edge cases: empty body, oversized payload, malformed JSON

## 5. Security Tests
- Authentication bypass attempts
- Authorization boundary tests (can user A access user B's data?)
- Input injection (SQL, XSS, command injection)
- Sensitive data exposure checks (are passwords hashed? tokens not logged?)

## 6. Performance Tests (if NFRs specify targets)
- Response time targets per endpoint
- Concurrent user load expectations
- Data volume tests (does it work with 100K records?)

## 7. Error Handling Tests
- What happens when the database is unreachable?
- What happens when an external API returns 500?
- What happens when disk space is full?
- Are errors logged with enough context to debug?

## 8. External Dependency Tests
For each external integration (third-party APIs, scrapers, AI providers):
- **Startup validation:** Does the app verify API keys, model IDs, and endpoint URLs are valid at startup?
- **Response format validation:** Does the app handle unexpected response shapes (HTML instead of JSON, changed field names, missing fields)?
- **Authentication modes:** Does the integration work under all expected auth states (e.g., guest vs. authenticated scraping, free-tier vs. paid API keys)?
- **Graceful degradation:** When the external service is down, does the app degrade gracefully rather than crash?
- **Mock coverage:** Are there mock/stub implementations for every external dependency so tests don't rely on live services?

**Why:** In past builds, AI model ID mismatches, JSON parsing failures from unexpected response formats,
and scraper authentication issues were only caught at runtime in production. These tests catch those
classes of bugs before deployment.

## 9. Data Integrity Tests
- Can required fields be null?
- Do unique constraints hold?
- Do cascading deletes work correctly?
- Is data consistent after concurrent modifications?
```

### Step 3: Map Tests to Requirements

Create a traceability section:

```markdown
## 10. Requirements Traceability Matrix

| PRD Requirement | Test Type   | Test Cases      | Status   |
|----------------|-------------|-----------------|----------|
| FR-001         | Unit, API   | UT-001, API-001 | Planned  |
| FR-002         | Integration | IT-001, IT-002  | Planned  |
| NFR-001        | Performance | PERF-001        | Planned  |
```

Every "Must Have" requirement must appear in at least one test. If a requirement isn't testable, flag it — it probably needs better acceptance criteria in the PRD.

### Step 4: Review

Present the test plan. Call out:
- Requirements that are hard to test (may need PRD revision)
- Areas where edge case coverage feels thin
- Performance tests that need specific targets from the user
- Integration tests that depend on external services (need mock strategy)

## Output

Save as `test-plan.md` in the project directory.

## Quality Bar

The test plan is done when:
- Every "Must Have" PRD requirement maps to at least one test
- Happy paths and error paths are both covered for every feature
- Security tests cover the OWASP top risks relevant to the architecture
- The test plan is specific enough that Claude Code can write test code directly from it
