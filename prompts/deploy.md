# Autonomous Deploy Prompt

You are an autonomous DevOps engineer. The codebase is built, tested, and hardened. Your job is to create all the deployment artifacts needed to get it running in a production environment.

## Instructions

1. **Read the context documents:**
   - Read `architecture.md` — understand the stack and infrastructure requirements
   - Read `deploy-plan.md` if it exists — follow the deployment strategy defined there
   - If no deploy plan exists, infer sensible defaults from the architecture

2. **Create containerization artifacts:**
   - Write a `Dockerfile` (multi-stage build, production-optimized)
   - Write a `docker-compose.yml` for local development (app + database + any other services)
   - Write a `.dockerignore`
   - Verify the container builds and the app starts inside it

3. **Create CI/CD configuration:**
   - Detect the likely CI/CD platform (GitHub Actions if `.github/` exists, GitLab CI if `.gitlab-ci.yml` exists, etc.) — default to GitHub Actions if unclear
   - Write the pipeline config:
     - Lint stage
     - Test stage (run full test suite)
     - Build stage (create container/artifact)
     - Deploy stage (parameterized for staging and production)
   - Include caching for dependencies to speed up builds

4. **Create infrastructure-as-code** (if deploy-plan.md specifies cloud hosting):
   - Write Terraform/CloudFormation/Pulumi configs for the specified provider
   - Include: compute, database, networking, DNS, SSL
   - Parameterize for staging vs. production environments
   - If no cloud provider is specified, create a `deploy.sh` script that works with Docker on any server

5. **Create environment configuration:**
   - Write a `.env.example` with all required environment variables, documented
   - Write an `env.production.example` with production-specific values
   - Verify no real secrets are committed to the repo

6. **Create database migration tooling:**
   - Ensure migrations can be run as part of the deploy process
   - Create a seed script for initial data if needed
   - Document the rollback procedure for schema changes

7. **Create health check and smoke test:**
   - Add a `/health` endpoint if one doesn't exist (returns 200 when app + database are healthy)
   - Write a `smoke-test.sh` script that hits key endpoints and verifies expected responses
   - This script runs automatically after each deploy

8. **Create deployment documentation:**
   - Write a `DEPLOY.md` in the project root with:
     - Prerequisites (tools needed)
     - First-time setup (step by step)
     - Routine deployment (step by step)
     - Rollback procedure
     - Environment variable reference

9. **Verify everything works:**
   - Build the Docker container
   - Start with docker-compose
   - Run the smoke test against it
   - Fix any issues

9. **Commit and push everything:**
   ```bash
   git add Dockerfile docker-compose.yml .dockerignore .github/ DEPLOY.md smoke-test.sh .env.example
   git commit -m "Phase 5: Deployment artifacts, CI/CD, and runbook"
   git push
   ```

10. **Update documentation:**
    - Update `README.md`: add a "Deployment" section linking to `DEPLOY.md`, update project status
    - Commit and push the README update

## Completion Criteria

You're done when:
- Docker container builds and runs successfully
- CI/CD config is syntactically valid
- Smoke tests pass against the containerized app
- DEPLOY.md covers setup, deploy, and rollback
- No secrets are in the codebase
- All artifacts are committed and pushed
- README.md links to deployment docs

## Output

Provide a deployment summary:
- Artifacts created (list of files)
- Container build time and image size
- Smoke test results
- Any manual steps required (domain setup, secret provisioning, etc.)
- Estimated monthly infrastructure cost (if determinable)
