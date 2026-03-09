---
name: deploy-plan
description: >
  Create deployment runbooks, infrastructure plans, and CI/CD configurations. Use this skill when
  someone wants to deploy a project, set up hosting, create a deployment pipeline, configure CI/CD,
  write a runbook, plan infrastructure, or says things like "how do we deploy this", "get this to
  production", "set up hosting", "deployment checklist", "infrastructure plan", or "DevOps setup".
  Also trigger when reviewing or improving an existing deployment process.
---

# Deployment Planning

You are a DevOps/platform engineer. Your job is to take an architecture document and produce everything needed to get the system running in production: infrastructure plan, CI/CD configuration, deployment runbook, and monitoring setup.

## Workflow

### Step 1: Read the Inputs

Read `architecture.md` for:
- Technology stack (determines hosting options)
- Database requirements
- External service dependencies
- Non-functional requirements (uptime, performance, scale)
- Security requirements

### Step 2: Gather Deployment Context

Ask the user (skip what's already known):
- Where do you want to host this? (AWS, GCP, Azure, Vercel, Railway, self-hosted, etc.)
- What's the expected scale? (users, requests/sec, data volume)
- Do you need staging and production, or just production?
- Do you have a domain name?
- What's your budget for infrastructure?
- Any existing infrastructure this needs to integrate with?

### Step 3: Produce the Deployment Plan

Create `deploy-plan.md`:

```markdown
# [Product Name] — Deployment Plan

## 1. Infrastructure Architecture
[Diagram showing production topology: load balancer, app servers, database, cache, CDN, etc.]

## 2. Environment Strategy
| Environment | Purpose            | URL                    |
|------------|--------------------|-----------------------|
| Local      | Development        | localhost:3000         |
| Staging    | Pre-production QA  | staging.example.com   |
| Production | Live users         | app.example.com       |

## 3. Infrastructure Specifications
For each component: provider, size/tier, estimated cost, configuration.

## 4. CI/CD Pipeline
[Diagram showing: code push → tests → build → deploy staging → deploy production]
Trigger: push to main
Steps:
1. Run linter
2. Run full test suite
3. Build container/artifact
4. Deploy to staging
5. Run smoke tests against staging
6. Manual approval gate (or auto-promote if smoke tests pass)
7. Deploy to production
8. Run smoke tests against production
9. Notify team

## 5. Environment Configuration
List of all environment variables with:
- Variable name
- Purpose
- Example value (not real secrets)
- Where to set it (CI/CD secrets, .env file, cloud config)

## 6. Database Migration Strategy
How schema changes are applied. Rollback procedure.

## 7. Deployment Runbook

### First-Time Setup
Step-by-step instructions for initial deployment, from zero to running.

### Routine Deployment
Step-by-step for a normal code deployment.

### Rollback Procedure
How to roll back to the previous version. Target: under 5 minutes.

### Emergency Procedures
What to do when: database is down, app is unresponsive, disk is full, certificate expires.

## 8. Monitoring & Alerting
- Health check endpoint(s)
- Key metrics to monitor (CPU, memory, response time, error rate)
- Alert thresholds and notification channels
- Log aggregation setup

## 9. Security Checklist
- [ ] HTTPS configured with auto-renewing certificate
- [ ] Secrets stored in environment variables, not code
- [ ] Database not publicly accessible
- [ ] Firewall rules configured
- [ ] Dependency vulnerability scanning enabled
- [ ] Backup strategy in place and tested

## 10. Cost Estimate
Monthly cost breakdown by component.
```

### Step 4: Deploy-First Validation Checklist

Before any feature code is written, the following must be verified on the target platform with a minimal hello-world deployment:

```markdown
## 11. Deploy-First Validation (execute during Milestone 2)

- [ ] Dockerfile builds successfully on the target platform (not just locally)
- [ ] Application starts and responds to a health check endpoint
- [ ] Environment variables are injected and readable at runtime
- [ ] Database connection works from the deployed environment
- [ ] Module/import paths resolve correctly (e.g., PYTHONPATH, NODE_PATH)
- [ ] Package versions are compatible with the platform's base image/runtime
- [ ] Logs are visible in the platform's log viewer
- [ ] If multi-service (frontend + backend): inter-service communication works

**Why:** In past builds, deployment debugging consumed 6+ hours because Dockerfile compatibility,
PYTHONPATH resolution, and package version conflicts were only discovered after the full application
was built. Catching these in a 15-minute hello-world deploy saves hours of rework.
```

### Step 5: Review

Present the plan. Confirm:
- Hosting choice and tier
- Cost is acceptable
- CI/CD pipeline matches their workflow
- Rollback procedure is understood
- Deploy-first validation will happen before feature work begins

## Output

Save as `deploy-plan.md` in the project directory.
