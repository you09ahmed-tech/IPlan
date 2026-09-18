# IPlan Project Context

> Last updated: September 2026
> Purpose: Give developers and AI assistants enough context to continue IPlan development without relying on old chat history.

---

# 1. Instructions for ChatGPT / AI Assistants

When helping develop IPlan:

* Treat this document and the current repository code as the primary project context.
* Do not give generic React, Firebase, or scheduling advice without considering IPlan's existing implementation.
* Preserve existing scheduler invariants and previously fixed edge cases.
* Prefer targeted changes over unnecessary rewrites.
* Before modifying scheduling behavior, consider Stage 2 and Stage 3 regression behavior.
* Do not assume a feature is missing simply because it is not mentioned in the current conversation.
* Protect completed, locked, fixed, and otherwise protected sessions.
* Always consider Firestore persistence and stale-state risks.
* When proposing a code change, identify the files/functions likely affected.
* Important behavioral fixes should normally receive regression tests.
* If documentation and repository code disagree, flag the inconsistency rather than silently assuming one is correct.
* The repository code represents the actual implementation; this document explains intended architecture and important historical decisions.

---

# 2. Product Overview

**IPlan** is a student study-planning SaaS application initially focused on IB students.

The student adds:

* subjects
* assignments
* tests
* deadlines
* available study periods
* unavailable periods
* fixed commitments

IPlan then builds realistic study schedules based on:

* deadlines
* task priority
* difficulty/workload
* remaining work
* availability
* existing commitments
* break requirements
* previously scheduled work

IPlan is intended to move beyond being a traditional planner.

Its longer-term positioning is:

> Other planners help students intelligently plan their day. IPlan aims to intelligently guide the student toward what they should do next and plan ahead for them.

The product is planned as a **paid SaaS**, using monthly and/or annual subscriptions.

---

# 3. Initial Target Market

Initial target users:

**IB Diploma Programme students**

The product may expand beyond IB later, but development decisions should currently prioritize the IB student workflow.

---

# 4. Technology Stack

## Frontend

* React
* Vite

The project was originally created using Vite and React.

## Backend / Cloud

Firebase is used for:

* Firebase Authentication
* Cloud Firestore
* Firebase Analytics

Firestore is configured in a European region.

## Authentication

Current authentication includes:

* Email/password authentication
* Firebase Auth
* Logout through the application sidebar

---

# 5. Main Application Areas

The standard sidebar currently includes:

1. Dashboard
2. Subjects
3. Focus Mode
4. Analytics
5. Quest History
6. AI Assistant
7. Calendar
8. Study Parties
9. Settings
10. Reality Mode

Other pages/features developed or present in the application include:

* Onboarding
* AI Planner
* Plans
* Authentication
* Daily Goals
* History
* Smart scheduling interfaces

Important components created during development include:

* DailyGoals
* IntegrityCard
* LevelCard
* XPBar
* QuestCard
* SubjectCard
* SubtaskList
* Sidebar
* SmartSchedulePreview

---

# 6. Important Firebase / Persistence Areas

Relevant data includes concepts such as:

* quests/tasks
* completed quests
* saved plans
* calendar/study sessions
* availability

Historically relevant files include:

* `firebase/config.js`
* `firebase/firestore.js`
* `quests.js`
* `completedQuests.js`
* `plans.js`

The exact current repository structure should always be checked before making changes.

---

# 7. Smart Scheduler

The Smart Scheduler is one of IPlan's core systems.

Important scheduling capabilities already implemented include:

* automatic scheduling
* multi-day scheduling
* deadlines
* task priorities
* availability
* unavailable periods
* fixed commitments
* preferred study periods
* workload handling
* study breaks
* scheduling buffers
* session persistence
* overload/no-capacity handling

Scheduler changes must be treated as high-risk because small changes can affect many scheduling scenarios.

---

# 8. Scheduler Development Stages

## Stage 2

Stage 2 implemented the main smart scheduling behavior.

It includes the underlying scoring, splitting, availability, break, buffer, preferred-time, and overload logic later reused by Stage 3.

Stage 2 acceptance was later hardened so that availability is reloaded before accepting proposals.

A time guard was also added so proposals that have become invalid because time has passed are not blindly accepted.

---

# 9. Stage 3 — Reorganize My Day

Stage 3 introduced:

**Reorganize My Day**

Its purpose is to safely reorganize remaining work without damaging work that has already happened or should remain protected.

Stage 3 is intentionally a relatively thin layer over Stage 2 scheduling logic rather than an entirely separate scheduler.

Relevant historical implementation areas include:

* `src/utils/smartScheduler.js`
* `src/components/SmartSchedulePreview.jsx`
* `src/pages/Dashboard.jsx`
* `src/styles/dashboard.css`

Exact current paths should be verified against the repository.

---

# 10. Critical Scheduler Invariants

These rules are extremely important.

## Completed work

Completed work must not be rescheduled as unfinished work.

Completed sessions/tasks should remain protected from inappropriate replacement.

## Locked sessions

Locked sessions must not be moved or removed by automatic reorganization.

## Fixed/protected sessions

Fixed and otherwise protected future sessions must remain intact.

## Unavailable periods

A study session must never be scheduled inside an availability block whose kind is:

`unavailable`

## Preferred study periods

Preferred-study periods influence scheduling but are not hard blocking constraints.

## Remaining work

The scheduler must account for work that has already been scheduled or reserved.

It must not schedule the full original task duration when part of that task's workload is already safely represented by protected sessions.

---

# 11. Reserved Work Fix

A previous Stage 3 issue caused reorganizing to potentially ignore work already reserved by protected sessions.

The scheduler was changed to calculate reserved minutes using logic equivalent to:

`getReservedMinutesByTask`

Protected sessions that can reserve work include categories such as:

* locked sessions
* fixed sessions
* protected future sessions
* sessions originating from other protected sources

Sessions that should not reserve remaining work include cases such as:

* completed sessions
* replaced sessions
* archived sessions
* certain past/missed sessions

The current code should be checked for the definitive implementation.

---

# 12. Protected Study Break Fix

Stage 3 must respect breaks around existing protected study sessions.

The scheduler should reject candidate sessions that violate required break spacing around a protected study session.

Conceptually, candidates should not:

* begin inside the required break period immediately after a protected study session
* end inside the required break period immediately before a protected study session

Protected study-session break padding should not incorrectly turn ordinary non-study availability constraints into padded periods.

---

# 13. Duplicate Proposal Acceptance Fix

A previous issue occurred because deterministic proposal IDs could cause a proposal acceptance flow to both skip and remove the same session incorrectly.

Helpers were introduced around acceptance planning, including concepts equivalent to:

* `excludeSessionsSatisfyingProposals()`
* `planReorganizeAcceptance()`

The purpose is to coordinate acceptance safely and prevent duplicate/replacement corruption.

---

# 14. Stale Proposal Protection

This is a critical IPlan rule.

A scheduling proposal can become invalid between:

1. generation
2. user review
3. acceptance

Therefore proposals must be revalidated when accepted.

Before acceptance, current data should be reloaded, including:

* sessions
* quests/tasks
* availability
* current time

A proposal should be rejected or regenerated when relevant constraints have changed.

---

# 15. Availability Revalidation

An important bug was discovered where Stage 3 acceptance reloaded sessions and quests but did not reload availability.

This created the possibility that a user could:

1. generate a proposal
2. add an unavailable period
3. accept the old proposal
4. accidentally save a study session inside the newly unavailable period

This was fixed.

Acceptance now checks current availability and rejects stale proposals that collide with unavailable periods.

Stage 2 acceptance was subsequently hardened with equivalent availability protection.

---

# 16. Time Drift Protection

A proposal may also become stale simply because time passes while it is open.

Acceptance therefore includes a time-based guard.

A lead-time floor of approximately 15 minutes was introduced in the acceptance flow so sessions are not accepted with starts that have effectively become invalid.

The current implementation should be considered authoritative.

---

# 17. Regression Testing

Permanent scheduler tests were added.

Historically, the regression suite has included files such as:

* `tests/scheduler/run.mjs`
* `tests/scheduler/harness.mjs`
* `tests/scheduler/fixtures.mjs`
* `tests/scheduler/stage2.test.mjs`
* `tests/scheduler/stage3.test.mjs`
* `tests/scheduler/reservedWork.test.mjs`
* `tests/scheduler/protectedBreaks.test.mjs`
* `tests/scheduler/lifecycle.test.mjs`
* `tests/scheduler/staleProposal.test.mjs`
* `tests/scheduler/noCapacity.test.mjs`

A script equivalent to:

`npm run test:scheduler`

is used for scheduler regression testing.

At one major checkpoint, the scheduler regression suite reached **184 passing assertions**.

The exact current test count should always be taken from the repository rather than this document.

---

# 18. Scheduler Testing Principle

Any meaningful scheduler change should normally be validated against:

* Stage 2 behavior
* Stage 3 behavior
* availability constraints
* stale-state handling
* protected sessions
* completed sessions
* reserved work
* breaks
* no-capacity conditions
* persistence/lifecycle behavior

A fix should not be considered complete merely because the UI appears correct in one test case.

---

# 19. Browser Testing Already Performed

One important browser test involved:

1. opening a Reorganize proposal
2. completing a Math HW task from another tab
3. returning to the stale proposal
4. attempting acceptance

The final state remained safe:

* Math HW appeared only once
* Math HW remained completed
* unrelated IA work was unchanged
* no inappropriate replacement occurred

The Dashboard subsequently reported that nothing remained to reorganize.

Two edge-case browser checks were previously skipped intentionally:

* proposed start time passing before acceptance
* a new protected/fixed study session being created while a proposal remains open

These may still be useful future tests if the affected acceptance code changes.

---

# 20. Known / Recent Issue

A recent lifecycle issue was reported:

> Deleting tasks from Active Tasks does not necessarily remove the related entries from Calendar or Overdue Carryovers.

This should be investigated as a data lifecycle / synchronization issue rather than treated only as a UI rendering problem.

When fixing it, consider:

* deleting the source task
* existing calendar sessions linked to that task
* overdue carryover data
* completed-task behavior
* orphaned references
* Firestore persistence
* whether deletion should cascade or mark related data as archived
* regression tests for task deletion

---

# 21. AI Assistant and Smart Day

IPlan contains an AI Assistant.

The strategic architecture is that AI reasoning and deterministic scheduling should complement each other.

The AI can help:

* interpret student requests
* break down work
* suggest plans
* understand intent

But actual calendar placement should remain compatible with deterministic scheduling rules and safety constraints.

A key product direction is:

**AI planning → deterministic Smart Day scheduling**

rather than allowing unconstrained AI-generated calendar changes.

---

# 22. Product Roadmap Direction

The product roadmap has broadly been:

## Phase 1 — Reliable Scheduler

Prioritize scheduler reliability.

Capabilities include:

* automatic scheduling
* multi-day planning
* deadlines
* availability
* fixed/unavailable commitments
* breaks
* priorities
* calendar persistence

## Phase 2 — Adaptive Scheduler

Capabilities include:

* Reorganize My Day
* completed-session protection
* locked-session protection
* stale-proposal protection
* changing-availability handling
* acceptance/reconciliation improvements
* AI Assistant → Smart Day scheduling

## Before paid launch

Major priorities include:

* remaining reliability cleanup
* legal/company setup
* payments/subscriptions
* security audit
* beta infrastructure
* analytics
* bug/error monitoring
* closed beta

## Post-launch intelligence

Longer-term priorities include:

### Falling-behind detection

Use information such as:

* remaining work
* deadlines
* availability
* sessions
* completed minutes

to identify when the student's plan is becoming unrealistic.

### Exam planning

Break exam preparation into areas such as:

* concepts
* practice
* weak topics
* past-paper work
* final review

and schedule them intelligently.

### Personal learning model

Over time, IPlan should learn how the individual student works rather than treating every student identically.

This is a long-term differentiator and should not compromise launch reliability.

---

# 23. Development Philosophy

IPlan should prioritize:

**Reliability before intelligence.**

A scheduling system that appears intelligent but creates unreliable calendars damages trust.

Therefore:

1. protect user data
2. protect accepted schedules
3. prevent stale-state corruption
4. maintain deterministic constraints
5. regression-test behavior
6. add adaptive intelligence progressively

---

# 24. Product Scope Discipline

Not every future differentiator needs to exist before launch.

Avoid continuously expanding pre-launch scope.

The initial paid product should primarily deliver a reliable version of:

* automatic study scheduling
* realistic availability-aware planning
* deadline-aware scheduling
* Reorganize My Day
* Today's Priority
* clear workload visibility
* AI-assisted task planning
* deterministic calendar scheduling

More advanced personalization can follow after real-world usage data is available.

---

# 25. Naming

The product name is:

# IPlan

Previous/internal name:

`IBStudyQuest`

When creating new user-facing copy, documentation, or UI, use **IPlan** unless historical context requires mentioning the old name.

---

# 26. Repository

The project has historically used the GitHub repository:

`you09ahmed-tech/IPlan`

Previous commits included work such as:

* initial IBStudyQuest prototype
* rebrand to IPlan
* AI planner and saved plans

The repository itself should always be considered authoritative for current implementation.

---

# 27. Developer Preference

When helping with code changes:

* preserve existing working behavior
* make changes incrementally
* avoid replacing entire systems without a strong reason
* clearly identify affected files
* verify builds/tests after meaningful changes
* explain risks when modifying scheduler behavior

Historically, full replacement code blocks were useful when making file-level changes, but edits should still respect the current repository state.

---

# 28. Source-of-Truth Hierarchy

When information conflicts, use this order:

1. Current repository code
2. Current automated tests
3. Current project documentation
4. Recent explicit development decisions
5. Historical ChatGPT conversation context

Old chat messages should never override newer repository behavior.

---

# 29. Documentation Maintenance

Update this document when there is a major change to:

* architecture
* scheduler behavior
* Firebase/data model
* product direction
* critical invariants
* development workflow

Do not fill this document with every small bug fix.

Detailed subsystem behavior should gradually move into dedicated documents such as:

* `ARCHITECTURE.md`
* `SCHEDULER_SPEC.md`
* `ROADMAP.md`
* `FIREBASE_SCHEMA.md`
* `TEST_STATUS.md`

---

# 30. Starting a New Chat

A fresh IPlan development conversation can begin with:

> Continue IPlan development. Use `IPLAN_CONTEXT.md` as the project context and treat the repository as the current source of truth. We are working on: [task].

For scheduler work, also provide:

`SCHEDULER_SPEC.md`

For structural/backend work, also provide:

`ARCHITECTURE.md`

For planning/product work, also provide:

`ROADMAP.md`
