# IPlan — Start Here

> Use this file as the entry point for any new IPlan development conversation.

## What IPlan Is

IPlan is a paid student-planning SaaS, initially focused on IB students.

It automatically helps students:

- manage subjects, tasks, deadlines, and exams
- define available and unavailable time
- generate realistic study schedules
- reorganize the day when plans change
- detect workload risk and falling behind
- use AI for interpretation and planning
- use deterministic scheduling for actual calendar placement
- gradually personalize planning using observed study behavior

The product priority is:

**Reliability before intelligence.**

---

## Source of Truth

When information conflicts, use this order:

1. current repository code
2. passing automated tests
3. current project documentation
4. recent explicit product decisions
5. historical ChatGPT context

Do not assume historical chat information is still technically accurate if the repository has changed.

---

## Core Documentation

### `IPLAN_CONTEXT.md`

Read this for:

- product overview
- project history
- major decisions
- current product direction
- important known issues
- development principles

### `ARCHITECTURE.md`

Read this for:

- project structure
- frontend/backend organization
- Firebase layer
- AI infrastructure
- Exam Mode
- Student Work Model
- live adaptation
- testing architecture
- major system relationships

### `SCHEDULER_SPEC.md`

Read this before any scheduler-related work.

It documents:

- Plan My Day
- Reorganize My Day
- deterministic scheduling
- task priority
- availability
- session protection
- completed/reserved work
- breaks
- daily limits
- proposal IDs
- duplicate prevention
- acceptance/reconciliation
- stale-proposal protection
- scheduler invariants

### `ROADMAP.md`

Read this for:

- current development priorities
- launch scope
- beta priorities
- pre-launch work
- post-launch ideas
- scope-control decisions

---

## Which Files to Read for Each Task

### Scheduler / Reorganize / Calendar scheduling

Read:

1. `IPLAN_CONTEXT.md`
2. `ARCHITECTURE.md`
3. `SCHEDULER_SPEC.md`
4. relevant scheduler source files
5. relevant scheduler regression tests

### Backend / Firebase / API / Security

Read:

1. `IPLAN_CONTEXT.md`
2. `ARCHITECTURE.md`
3. relevant Firebase/API source files
4. relevant tests

### Exam Mode

Read:

1. `IPLAN_CONTEXT.md`
2. `ARCHITECTURE.md`
3. relevant Exam Mode source files
4. relevant Exam Mode tests
5. `SCHEDULER_SPEC.md` if scheduling is involved

### Student Work Model / Personalization

Read:

1. `IPLAN_CONTEXT.md`
2. `ARCHITECTURE.md`
3. relevant Student Work Model files
4. related tests
5. `SCHEDULER_SPEC.md` if personalization affects scheduling

### Product / Launch / Feature Planning

Read:

1. `IPLAN_CONTEXT.md`
2. `ROADMAP.md`
3. `ARCHITECTURE.md` when technical feasibility matters

---

## Development Rules

When working on IPlan:

1. Inspect the current code before assuming behavior.
2. Inspect relevant tests before changing regression-tested systems.
3. Prefer small, safe changes over broad rewrites.
4. Preserve working behavior unless the requested change intentionally replaces it.
5. Do not weaken scheduler safety to make one scenario pass.
6. Treat task/session lifecycle changes as integration-sensitive.
7. Treat scheduler, adaptation, persistence, and personalization as connected systems.
8. Add regression coverage for meaningful bug fixes.
9. Verify build/tests after significant changes.
10. Update documentation when architecture, scheduler behavior, or roadmap priorities materially change.

---

## Scheduler Safety Principles

Never casually break these rules:

- unavailable periods are hard constraints
- preferred-study periods are soft preferences
- completed work must not be rescheduled
- locked/fixed/protected sessions must remain protected
- reserved work must not be scheduled twice
- stale proposals must be revalidated
- current sessions/tasks/availability/time must be checked at acceptance
- duplicate acceptance must not create duplicate sessions
- reconciliation must not delete a session that already satisfies a proposal
- no-capacity situations must be reported honestly
- AI/personalization must not bypass deterministic scheduler safety

For exact rules, read `SCHEDULER_SPEC.md`.

---

## IPlan Architecture Principle

The preferred planning flow is:

AI / interpretation / personalization  
↓  
structured planning input  
↓  
deterministic scheduling  
↓  
preview  
↓  
fresh-state validation  
↓  
explicit student acceptance  
↓  
persistence

AI should help understand and plan.

Deterministic logic should control safe calendar placement.

---

## Current High-Level Priority

Unless a critical bug changes priorities, focus on:

1. reliability and lifecycle cleanup
2. regression safety
3. production/security hardening
4. payments/subscriptions
5. analytics/error monitoring
6. closed beta
7. paid launch
8. deeper personalization after launch

Avoid unnecessary pre-launch scope expansion.

---

## Fresh Chat Instruction

When starting a new ChatGPT conversation for IPlan, attach this file and the relevant documentation, then say:

**Continue IPlan development. Use START_HERE.md as the entry point and treat the repository and passing tests as the current technical source of truth. We are working on: [describe the task].**

For scheduler work, also attach:

`SCHEDULER_SPEC.md`

For technical architecture/backend work, also attach:

`ARCHITECTURE.md`

For product planning, also attach:

`ROADMAP.md`

---

## Final Rule

Do not treat IPlan as a generic student-planner project.

Use the actual IPlan architecture, constraints, regression-tested behavior, product direction, and current repository state when answering.