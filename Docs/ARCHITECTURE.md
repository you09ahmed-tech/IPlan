# IPlan Architecture

> Last updated: September 2026  
> Purpose: Explain the current technical structure of IPlan so developers and AI assistants can understand how the application is organized before making changes.

---

# 1. Architecture Overview

IPlan is a React + Vite student-planning SaaS application with:

- React frontend
- Firebase client services
- Firestore persistence
- Firebase Authentication
- server-side API endpoints
- Firebase Admin services
- AI-powered planning/extraction functionality
- deterministic scheduling
- student-work personalization
- workload/risk detection
- Exam Mode
- academic calendar processing
- automated regression test suites

The application has evolved beyond a simple study planner into several interacting systems.

At a high level:

User Interface  
↓  
React Pages / Components  
↓  
Application Logic / Utilities  
↓  
Firebase Client Layer / Services  
↓  
Firestore / Authentication

AI-related flows:

React  
↓  
Client Service  
↓  
API Endpoint  
↓  
Validation / Quota / Rate Limiting  
↓  
AI Processing  
↓  
Structured Result  
↓  
Deterministic IPlan Logic

A major architectural principle is that AI-generated planning should not directly bypass deterministic scheduling and safety rules.

---

# 2. Project Structure

Current major project directories:

src/
- components/
- data/
- firebase/
- pages/
- services/
- styles/
- utils/

api/
- endpoints
- _lib/

tests/
- academicCalendar/
- aiQuota/
- aiUsage/
- aiUsageAggregation/
- deleteAccount/
- examMode/
- examModeStudentWorkModel/
- fallingBehind/
- liveSameDayAdaptation/
- overflowRecovery/
- riskNotifications/
- scheduler/
- sessionCheckIn/
- studentWorkModel/
- support/
- userStorage/
- workloadFeasibility/

---

# 3. Frontend Entry Points

## `src/main.jsx`

React application entry point.

Responsible for mounting the application.

## `src/App.jsx`

Primary application composition/router-level component.

It may coordinate:

- top-level navigation
- page selection/routing
- application-wide state or layout
- authentication-dependent rendering

Always inspect the current implementation before changing global navigation or page lifecycle behavior.

## Styling

Current styles include:

- `src/App.css`
- `src/index.css`
- `src/styles/dashboard.css`

`dashboard.css` is used broadly and may affect more than only the Dashboard.

---

# 4. Pages

Current pages:

- `AIAssistant.jsx`
- `Analytics.jsx`
- `Auth.jsx`
- `Breakdown.jsx`
- `Calendar.jsx`
- `Dashboard.jsx`
- `FocusMode.jsx`
- `Guide.jsx`
- `History.jsx`
- `Onboarding.jsx`
- `Plans.jsx`
- `Settings.jsx`
- `Subjects.jsx`
- `Tasks.jsx`
- `VacationMode.jsx`

## Dashboard

`Dashboard.jsx`

One of the most important integration surfaces in IPlan.

It has historically been involved in:

- Smart Scheduler interaction
- Reorganize My Day
- workload visibility
- falling-behind logic
- risk notifications
- session state
- acceptance/revalidation flows
- smart planning behavior

Changes to Dashboard should be treated as integration-sensitive.

## Calendar

`Calendar.jsx`

Responsible for calendar/session interaction.

Calendar mutations may affect:

- session persistence
- same-day adaptation
- availability
- scheduling state
- displaced-session lifecycle
- session-change notifications

Calendar changes must be tested against scheduling and live adaptation behavior.

## AI Assistant

`AIAssistant.jsx`

Frontend interface for IPlan's assistant.

AI-generated plans should feed into deterministic IPlan scheduling rather than directly creating unsafe calendar state.

## Tasks

`Tasks.jsx`

Task-focused interface.

Task lifecycle changes can affect:

- Dashboard
- Calendar
- overdue work
- scheduling
- workload feasibility
- student-work observations
- personalization

## Subjects

`Subjects.jsx`

Subject management interface.

Subject identity/naming is used across:

- tasks
- exams
- scheduling
- analytics
- Exam Mode

---

# 5. Reusable Components

Current components:

- `DailyGoals.jsx`
- `ExamModeSection.jsx`
- `LevelCard.jsx`
- `OverdueReviewModal.jsx`
- `PageHeader.jsx`
- `SessionCheckInManager.jsx`
- `Sidebar.jsx`
- `SmartSchedulePreview.jsx`
- `SubjectCard.jsx`
- `SubjectSelect.jsx`
- `SubtaskList.jsx`
- `SupportWidget.jsx`
- `TaskRow.jsx`

## SmartSchedulePreview

`SmartSchedulePreview.jsx`

Important scheduling UI.

Used to display scheduling proposals before acceptance.

Proposal acceptance must respect current:

- sessions
- tasks
- availability
- time
- protected state

Do not weaken stale-proposal validation when modifying this component or its callers.

## SessionCheckInManager

`SessionCheckInManager.jsx`

Handles session-completion/check-in related UI.

This system may interact with:

- session completion
- overruns
- missed/displaced work
- observed study behavior
- personalization

## ExamModeSection

`ExamModeSection.jsx`

Frontend integration point for Exam Mode.

## TaskRow

`TaskRow.jsx`

Reusable task presentation/action component.

Because task lifecycle affects scheduling, changes here may have downstream effects beyond UI presentation.

## SupportWidget

`SupportWidget.jsx`

Frontend support flow.

Potentially connects with:

- support context generation
- support API
- support email infrastructure

---

# 6. Static Data

`src/data/ibSubjects.js`

Contains IB subject data.

This should be preferred over duplicating IB subject definitions across components.

---

# 7. Firebase Client Layer

Current Firebase modules:

- `academicCalendar.js`
- `availability.js`
- `completedQuests.js`
- `config.js`
- `deleteAccount.js`
- `examMode.js`
- `firestore.js`
- `focusCity.js`
- `plans.js`
- `quests.js`
- `scheduling.js`
- `sessions.js`
- `subjects.js`
- `support.js`

These modules form the client-side persistence/data access layer.

UI components should generally avoid duplicating Firestore persistence logic when a dedicated Firebase module already exists.

---

# 8. Core Firebase Areas

## `config.js`

Firebase client configuration and initialization.

Changes here may affect the entire application.

## `firestore.js`

Shared Firestore functionality.

Inspect carefully before altering common persistence behavior.

## `sessions.js`

Study/calendar session persistence.

This is a critical module because sessions are consumed by:

- Calendar
- Smart Scheduler
- Reorganize My Day
- same-day adaptation
- check-ins
- workload calculations
- Exam Mode

## `availability.js`

Persistence for user availability/preferences.

Availability includes hard constraints such as unavailable periods as well as softer preferred study periods.

## `quests.js`

Legacy/current task persistence layer.

The project historically used the term "quests" for tasks.

New code should be conscious of legacy naming rather than assuming all task-related data has been renamed.

## `completedQuests.js`

Persistence related to completed task history.

## `scheduling.js`

Scheduling-related Firestore operations.

## `examMode.js`

Exam Mode persistence.

## `academicCalendar.js`

Academic calendar persistence.

## `subjects.js`

Subject persistence.

## `plans.js`

Saved planning data.

## `support.js`

Support-related client persistence or request logic.

## `deleteAccount.js`

Client-side account-deletion integration.

---

# 9. Client Service Layer

Current services:

- `academicCalendarApi.js`
- `assistantApi.js`
- `examModeApi.js`

The service layer sits between the frontend and backend API endpoints.

Conceptually:

React component/page  
↓  
service  
↓  
API endpoint

Prefer this separation over placing raw request logic throughout UI components.

---

# 10. Backend API Layer

Current API endpoints:

- `academic-calendar-extract.js`
- `assistant.js`
- `check-env.js`
- `delete-account.js`
- `exam-schedule-extract.js`
- `exam-scope-extract.js`
- `support.js`

These server-side endpoints handle functionality that should not be trusted entirely to the client.

---

# 11. Backend Shared Library

Current shared server infrastructure:

- `academicCalendarExtractionSchema.js`
- `aiQuota.js`
- `aiUsage.js`
- `aiUsageAggregation.js`
- `aiUsageQuery.js`
- `aiUsageRecorder.js`
- `aiUsageTimeRange.js`
- `assistantSchema.js`
- `deleteAccount.js`
- `examExtractionCore.js`
- `examExtractionSchema.js`
- `firebaseAdmin.js`
- `rateLimiter.js`
- `supportEmail.js`

This directory should be preferred for reusable server-side logic rather than duplicating code between API endpoints.

---

# 12. AI Assistant Backend

## `api/assistant.js`

Primary server-side assistant endpoint.

Its surrounding infrastructure indicates the assistant flow includes:

- structured request validation
- AI quota enforcement
- rate limiting
- usage tracking
- Firebase Admin access
- structured assistant responses

Related modules:

- `api/_lib/assistantSchema.js`
- `api/_lib/aiQuota.js`
- `api/_lib/aiUsage.js`
- `api/_lib/aiUsageRecorder.js`
- `api/_lib/rateLimiter.js`
- `api/_lib/firebaseAdmin.js`

The assistant endpoint should not be modified without considering quota and usage tracking.

---

# 13. AI Usage Infrastructure

Shared AI usage infrastructure includes:

- `aiQuota.js`
- `aiUsage.js`
- `aiUsageAggregation.js`
- `aiUsageQuery.js`
- `aiUsageRecorder.js`
- `aiUsageTimeRange.js`

This system appears responsible for:

- tracking AI usage
- enforcing user limits
- aggregating consumption
- querying usage
- defining time windows for usage limits

This is important for IPlan's paid SaaS model because AI cost needs to remain measurable and controllable.

---

# 14. Server Rate Limiting

`api/_lib/rateLimiter.js`

Rate limiting should remain part of public or expensive API protection.

Do not remove or bypass rate limiting when adding AI-powered endpoints.

---

# 15. Firebase Admin

`api/_lib/firebaseAdmin.js`

Server-side Firebase Admin initialization/shared access.

Client Firebase and Firebase Admin responsibilities should remain clearly separated.

---

# 16. Academic Calendar System

Frontend utilities:

- `src/utils/academicCalendarReminders.js`
- `src/utils/academicCalendarValidation.js`

Firebase:

- `src/firebase/academicCalendar.js`

Client API:

- `src/services/academicCalendarApi.js`

Backend:

- `api/academic-calendar-extract.js`
- `api/_lib/academicCalendarExtractionSchema.js`

Tests:

- `tests/academicCalendar/`

Conceptual flow:

Academic calendar source  
↓  
academicCalendarApi  
↓  
academic-calendar-extract endpoint  
↓  
schema validation / extraction  
↓  
structured academic calendar  
↓  
client validation  
↓  
Firestore  
↓  
reminders / scheduling context

---

# 17. Exam Mode Architecture

Exam Mode is one of IPlan's major subsystems.

Relevant files include:

- `src/components/ExamModeSection.jsx`
- `src/firebase/examMode.js`
- `src/services/examModeApi.js`
- `src/utils/examHistoryPersonalization.js`
- `src/utils/examModeNotifications.js`
- `src/utils/examModeSetupDraft.js`
- `src/utils/examModeStartDate.js`
- `src/utils/examModeStatus.js`
- `src/utils/examModeSubjectMatching.js`
- `src/utils/examRevisionEstimation.js`
- `src/utils/examRevisionSessionGeneration.js`
- `src/utils/examStudentWorkBridge.js`
- `src/utils/examTopicHeaviness.js`
- `src/utils/examTopicValidation.js`

Backend:

- `api/exam-schedule-extract.js`
- `api/exam-scope-extract.js`
- `api/_lib/examExtractionCore.js`
- `api/_lib/examExtractionSchema.js`

Tests:

- `tests/examMode/`
- `tests/examModeStudentWorkModel/`

Exam Mode appears to support functionality including:

- exam setup
- setup resume/draft state
- exam start-date logic
- subject matching
- exam schedule extraction
- exam scope/topic extraction
- topic validation
- topic priority/heaviness
- workload estimation
- revision-session generation
- revision allocation
- revision completion
- notifications
- history-based personalization
- integration with student-work observations
- overflow recovery
- live adaptation

Exam Mode should therefore be treated as an integrated planning system, not as a standalone UI feature.

---

# 18. Exam Extraction Architecture

Conceptually:

User exam input/document  
↓  
examModeApi  
↓  
exam schedule/scope endpoint  
↓  
examExtractionCore  
↓  
examExtractionSchema  
↓  
validated structured exam data  
↓  
Exam Mode logic

AI extraction output should always be structurally validated before entering core planning logic.

---

# 19. Smart Scheduler

Main scheduler:

`src/utils/smartScheduler.js`

This is a central deterministic planning engine.

It is used directly or indirectly by systems such as:

- Plan My Day
- Reorganize My Day
- AI-generated plan scheduling
- Exam revision scheduling
- overflow recovery
- workload feasibility

Scheduler behavior is protected by a dedicated regression test suite.

---

# 20. Scheduler Flow

Approximate conceptual flow:

Tasks / Work  
+ Availability  
+ Existing Sessions  
+ Deadlines / Priorities  
+ Current Time  
↓  
`smartScheduler.js`  
↓  
Scheduling Proposal  
↓  
SmartSchedulePreview  
↓  
Revalidation  
↓  
Acceptance  
↓  
Firestore Sessions

Acceptance must not blindly trust the state used when the proposal was generated.

---

# 21. Scheduler Safety

Important constraints include:

- unavailable periods are hard constraints
- completed work should not be rescheduled
- locked/fixed/protected sessions remain protected
- reserved work must reduce remaining workload correctly
- required breaks must be respected
- stale proposals must be revalidated
- time drift must be considered
- acceptance should use current persisted state
- scheduler changes require regression tests

See `SCHEDULER_SPEC.md` for the detailed behavioral contract once that document is created.

---

# 22. AI to Scheduler Integration

Relevant file:

`src/utils/assistantPlanScheduler.js`

IPlan should maintain a separation between:

AI interpretation/planning  
↓  
deterministic calendar placement

Preferred architecture:

User request  
↓  
AI Assistant  
↓  
Structured task/plan interpretation  
↓  
assistantPlanScheduler  
↓  
Smart Scheduler  
↓  
validated proposal  
↓  
user acceptance

The AI should not bypass scheduler safety rules.

---

# 23. Student Work Model

Relevant files:

- `src/utils/studentWorkModel.js`
- `src/utils/studentWorkObservations.js`
- `src/utils/studentWorkTaskTypes.js`
- `src/utils/studentWorkExplanation.js`
- `src/utils/studentWorkModelDevFixtures.js`

Tests:

- `tests/studentWorkModel/`
- `tests/examModeStudentWorkModel/`

The student-work model represents a major step toward adaptive IPlan behavior.

Its role appears to include learning from actual student behavior rather than only static user settings.

Adaptive behavior should be evidence-based.

Personalization must not override hard scheduler constraints.

---

# 24. Planning Duration Resolver

`src/utils/planningDurationResolver.js`

Responsible for resolving planning-duration estimates.

Changes to duration estimation may affect:

- workload feasibility
- Plan My Day
- Reorganize
- Exam Mode
- scheduler capacity

---

# 25. Plan My Day Personalization

`src/utils/planMyDayPersonalization.js`

Adds student-specific adaptation to planning.

Personalization should remain an input into deterministic scheduling rather than replacing scheduling rules.

---

# 26. Reorganize Personalization

`src/utils/reorganizePersonalization.js`

Adds personalization to Reorganize My Day.

Must preserve all existing Stage 3 safety invariants.

---

# 27. Workload Risk Personalization

`src/utils/workloadRiskPersonalization.js`

Connects learned/student-specific behavior to workload-risk analysis.

---

# 28. Falling Behind System

Relevant utility:

`src/utils/fallingBehind.js`

Tests:

`tests/fallingBehind/`

This system determines whether scheduled/remaining work suggests the student is falling behind.

The test structure includes both:

- logic tests
- Dashboard UI integration tests

---

# 29. Workload Feasibility

Relevant utility:

`src/utils/workloadFeasibility.js`

Tests:

`tests/workloadFeasibility/`

This system compares remaining workload with remaining available capacity while respecting actual availability.

---

# 30. Risk Notifications

Relevant utilities:

- `src/utils/riskNotifications.js`
- `src/utils/notifications.js`

Tests:

`tests/riskNotifications/`

Risk notifications translate planning/risk state into actionable user notifications.

They should not generate noisy or duplicate alerts.

---

# 31. Live Same-Day Adaptation

Relevant utility:

`src/utils/liveSameDayAdaptation.js`

Tests:

`tests/liveSameDayAdaptation/`

This is a major adaptive scheduling subsystem.

Test names indicate it handles:

- barrier crossing
- displaced session lifecycle
- calendar synchronization
- session-change signals
- integration with live adaptation
- manual moves
- no-capacity conditions
- review-change handoff
- time context

Live adaptation should remain conservative because it operates on already-active user schedules.

---

# 32. Displaced Session Lifecycle

Live adaptation includes the concept of displaced sessions.

Displaced state must remain lifecycle-safe:

scheduled  
→ displaced  
→ reviewed/recovered/rescheduled  
→ resolved

State should not silently become orphaned.

---

# 33. Overflow Recovery

Relevant utility:

`src/utils/overflowRecovery.js`

Tests:

`tests/overflowRecovery/`

Responsibilities appear to include recovering work that no longer fits its expected planning window.

Test coverage includes:

- planning overflow recovery
- acceptance
- lifecycle handling
- break isolation
- revalidation
- daily cap accounting
- stale task handling
- integration behavior

Overflow Recovery should preserve hard scheduler constraints.

---

# 34. Session Check-In System

Relevant files:

- `src/components/SessionCheckInManager.jsx`
- `src/utils/sessionCheckIn.js`

Tests:

`tests/sessionCheckIn/`

The test suite indicates support for:

- automatic check-in timing
- displaced-session suppression
- evidence integrity
- forgotten overrun confirmation
- overrun state
- overrun diagnostics
- refresh reconstruction
- render pipeline
- single-active overrun protection
- timezone/timer behavior
- pending overrun floors

This is a complex subsystem and should not be treated as a simple completion checkbox.

---

# 35. Availability Logic

Relevant files:

- `src/firebase/availability.js`
- `src/utils/availability.js`

Availability should distinguish between:

- hard unavailable periods
- preferred study periods
- potentially recurring availability rules

Hard unavailability must always override preference.

---

# 36. Subject Utilities

Relevant files:

- `src/utils/subjectNaming.js`
- `src/utils/subjectStats.js`
- `src/components/SubjectSelect.jsx`
- `src/components/SubjectCard.jsx`
- `src/firebase/subjects.js`
- `src/data/ibSubjects.js`

Subject identity must remain consistent across:

- tasks
- exams
- analytics
- schedule generation
- subject cards
- Exam Mode matching

Avoid introducing competing subject normalization logic.

---

# 37. Task Display and Task Types

Relevant files:

- `src/utils/taskDisplay.js`
- `src/utils/studentWorkTaskTypes.js`
- `src/components/TaskRow.jsx`

Display logic should remain separate from persistence and scheduling when possible.

---

# 38. User Storage

Relevant utility:

`src/utils/userStorage.js`

Tests:

`tests/userStorage/`

Use the existing abstraction rather than adding direct storage access throughout components.

---

# 39. Support System

Frontend:

- `src/components/SupportWidget.jsx`
- `src/utils/supportContext.js`
- `src/firebase/support.js`

Backend:

- `api/support.js`
- `api/_lib/supportEmail.js`

Tests:

`tests/support/`

The tests indicate support context is intentionally sanitized/safe before sending.

Do not send unnecessary private application state through support requests.

---

# 40. Account Deletion

Frontend:

`src/firebase/deleteAccount.js`

Backend:

- `api/delete-account.js`
- `api/_lib/deleteAccount.js`

Related policy utility:

`src/utils/refundPolicy.js`

Tests:

`tests/deleteAccount/`

Test coverage includes:

- deletion logic
- endpoint behavior
- Firebase Admin mocking
- refund policy
- Settings UI integration

Account deletion should remain a server-controlled operation where privileged cleanup is required.

---

# 41. Validation Boundary

AI and document-extraction endpoints should follow:

untrusted external/AI output  
↓  
schema validation  
↓  
normalized structured object  
↓  
application logic

Do not send arbitrary AI output directly into Firestore or the scheduler.

---

# 42. Testing Architecture

IPlan has a substantial permanent regression suite.

Current test domains:

- academicCalendar
- aiQuota
- aiUsage
- aiUsageAggregation
- deleteAccount
- examMode
- examModeStudentWorkModel
- fallingBehind
- liveSameDayAdaptation
- overflowRecovery
- riskNotifications
- scheduler
- sessionCheckIn
- studentWorkModel
- support
- userStorage
- workloadFeasibility

Each major subsystem generally has its own `run.mjs` and focused regression files.

---

# 43. Scheduler Tests

Current scheduler test files include:

- `activeOverrunExclusion.test.mjs`
- `assistantPlan.test.mjs`
- `fixtures.mjs`
- `harness.mjs`
- `lifecycle.test.mjs`
- `noCapacity.test.mjs`
- `protectedBreaks.test.mjs`
- `reservedWork.test.mjs`
- `run.mjs`
- `stage2.test.mjs`
- `stage3.test.mjs`
- `staleProposal.test.mjs`

This suite protects core deterministic scheduling behavior.

Any meaningful scheduler change should run this suite.

---

# 44. Live Adaptation Tests

`tests/liveSameDayAdaptation/`

This suite is especially important when changing:

- session mutation
- calendar behavior
- displacement
- same-day replanning
- session-change signals
- acceptance/review flows

---

# 45. Student Work Model Tests

`tests/studentWorkModel/`

Coverage includes:

- model behavior
- observations
- fixtures
- task types
- Plan My Day personalization
- reserved work
- planning duration
- Reorganize integration
- workload risk
- UI recommendations

This indicates the student-work model is deeply integrated into planning.

---

# 46. Exam Mode Tests

`tests/examMode/`

`tests/examModeStudentWorkModel/`

Exam Mode test coverage includes:

- extraction
- allocation
- plan acceptance
- setup resume
- start dates
- subject matching
- topic validation
- priority
- workload estimation
- completion
- history personalization
- notifications
- student-work integration
- live adaptation
- overflow recovery
- revision overruns

---

# 47. Development Safety Rule

Do not judge a change solely by whether the UI looks correct.

For IPlan, a change may affect:

UI  
↓  
persistence  
↓  
sessions  
↓  
scheduling  
↓  
adaptation  
↓  
risk calculations  
↓  
personalization

Therefore changes should be tested at the subsystem and integration level.

---

# 48. Core Architectural Principle

The most important architecture distinction is:

AI / interpretation / personalization  
↓  
deterministic planning rules  
↓  
validated persisted schedule

Personalization can influence decisions.

AI can interpret intent.

But neither should silently bypass:

- availability
- protected sessions
- completed work
- deadlines
- capacity
- break requirements
- stale-state revalidation

---

# 49. Preferred Change Workflow

For a significant change:

1. Identify subsystem.
2. Inspect current implementation.
3. Identify related persistence.
4. Identify related tests.
5. Make the smallest safe change.
6. Run affected regression suite.
7. Run adjacent integration tests if needed.
8. Update documentation if behavior or architecture changed.
9. Commit code, tests, and documentation together.

---

# 50. Documentation Relationships

Use these documents together.

## `IPLAN_CONTEXT.md`

Explains:

- what IPlan is
- current product direction
- important historical decisions
- high-level development state

## `ARCHITECTURE.md`

Explains:

- where systems live
- how they connect
- what areas are integration-sensitive

## `SCHEDULER_SPEC.md`

Should explain:

- exact scheduler behavioral rules
- scheduling invariants
- Stage 2 behavior
- Stage 3 behavior
- acceptance/revalidation

## `ROADMAP.md`

Should explain:

- completed work
- current priorities
- pre-launch work
- post-launch plans

---

# 51. Guidance for AI Assistants

Before modifying IPlan:

1. Read `IPLAN_CONTEXT.md`.
2. Read the relevant section of `ARCHITECTURE.md`.
3. Inspect the actual current code.
4. Inspect relevant tests.
5. For scheduling work, read `SCHEDULER_SPEC.md`.
6. Do not rely on historical chat memory over current code.
7. Do not assume an apparently isolated change has no downstream effects.
8. Preserve existing regression-tested behavior unless the requested change intentionally replaces it.

The repository and passing tests remain the definitive technical source of truth.