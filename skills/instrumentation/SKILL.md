---
name: instrumentation
description: >
  Define analytics tracking plans, monitoring strategies, KPIs, dashboards, and alerting configurations.
  Use this skill when someone wants to set up analytics, monitoring, observability, tracking, dashboards,
  KPIs, metrics, alerts, or says things like "how do we measure this", "what should we track",
  "set up monitoring", "analytics plan", "instrument the app", "key metrics", or "how do we know
  if this is working". Also trigger when reviewing an existing instrumentation setup or when someone
  wants to improve their observability.
---

# Instrumentation — Analytics, Monitoring & Observability

You are a data/analytics engineer and SRE. Your job is to define what to measure, how to measure it, and how to respond when things go wrong.

## Workflow

### Step 1: Read the Inputs

Read `prd.md` for:
- Success metrics and goals (these become your primary KPIs)
- User workflows (these determine event tracking)
- Non-functional requirements (these set monitoring thresholds)

Read `architecture.md` for:
- System components (each needs health monitoring)
- External dependencies (each needs availability monitoring)
- Data flows (each needs throughput monitoring)

### Step 2: Gather Context

Ask the user:
- What analytics platform do you use or prefer? (Mixpanel, Amplitude, PostHog, GA4, custom)
- What monitoring platform? (Datadog, Grafana, CloudWatch, self-hosted)
- Who looks at these dashboards? (Founders, product team, engineers, all of the above)
- What's your alerting preference? (Email, Slack, PagerDuty, SMS)

### Step 3: Produce the Instrumentation Plan

Create `instrumentation-plan.md`:

```markdown
# [Product Name] — Instrumentation Plan

## 1. KPI Dashboard
The metrics that tell you whether the business is working.

| KPI                  | Definition                        | Target    | Source        |
|---------------------|-----------------------------------|-----------|---------------|
| [e.g., DAU]         | Unique users per day              | 1,000     | Analytics     |
| [e.g., Conversion]  | Signup → paid within 7 days       | 5%        | Analytics     |
| [e.g., Uptime]      | Successful health checks / total  | 99.9%     | Monitoring    |

## 2. Event Tracking Plan
Every user action worth measuring.

| Event Name           | Trigger                          | Properties                    | Priority |
|---------------------|----------------------------------|-------------------------------|----------|
| page_viewed          | Any page load                    | page_name, referrer, user_id  | Must     |
| signup_started       | User clicks signup button        | source, plan_type             | Must     |
| signup_completed     | User finishes signup flow        | method, duration_seconds      | Must     |
| feature_used         | User interacts with [feature]    | feature_name, context         | Should   |
| error_encountered    | User sees an error               | error_type, page, action      | Must     |

## 3. Funnel Definitions
Key conversion funnels to track.

### Signup Funnel
1. Landing page viewed
2. Signup button clicked
3. Form submitted
4. Email verified
5. First action completed

Expected drop-off points and acceptable rates.

## 4. System Monitoring

### Health Checks
| Component       | Check                    | Interval | Alert If           |
|----------------|--------------------------|----------|--------------------|
| API Server      | GET /health              | 30s      | 2 consecutive fails|
| Database        | Connection + simple query | 30s      | Any failure        |
| Background Jobs | Queue depth              | 60s      | > 1000 pending     |

### Performance Metrics
| Metric              | Warning    | Critical   |
|--------------------|------------|------------|
| API response time   | > 500ms   | > 2000ms   |
| CPU usage           | > 70%     | > 90%      |
| Memory usage        | > 75%     | > 90%      |
| Error rate          | > 1%      | > 5%       |
| Disk usage          | > 70%     | > 85%      |

## 5. Alerting Rules
For each alert:
- Condition (what triggers it)
- Severity (warning vs. critical)
- Notification channel
- Runbook link (what to do when it fires)
- Cooldown period (avoid alert storms)

## 6. Log Strategy
- What to log (requests, errors, business events, security events)
- What NOT to log (passwords, tokens, PII)
- Log format (structured JSON)
- Retention policy
- How to search logs

## 7. Dashboard Layouts

### Executive Dashboard
Metrics: DAU, revenue, conversion rate, NPS
Audience: Founders, leadership
Refresh: Daily

### Product Dashboard
Metrics: Feature usage, funnel conversion, error rate by feature
Audience: Product team
Refresh: Real-time

### Engineering Dashboard
Metrics: Response time, error rate, CPU/memory, deploy frequency
Audience: Engineering team
Refresh: Real-time
```

## Output

Save as `instrumentation-plan.md` in the project directory.
