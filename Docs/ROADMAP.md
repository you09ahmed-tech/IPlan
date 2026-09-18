# IPlan Roadmap

> Last updated: September 2026  
> Purpose: Keep IPlan development focused on the highest-value work, prevent scope creep, and make it clear what is complete, what is in progress, and what should wait until after launch.

---

# 1. Product Direction

IPlan is being built as a paid student-planning SaaS, initially focused on IB students.

Its core value is not simply helping students manually organize their schedules.

IPlan should:

- understand the student's workload
- identify what matters most
- build realistic study schedules automatically
- adapt when the student's day changes
- protect existing commitments
- recognize when the student is falling behind
- gradually personalize planning based on actual study behavior

The central product direction is:

**IPlan should intelligently guide the student toward what to do next and plan ahead for them.**

---

# 2. Development Principle

The main development priority is:

**Reliability before intelligence.**

A highly intelligent planner that creates unsafe, duplicated, impossible, or stale schedules will lose student trust.

Therefore development priority should generally follow:

1. data safety
2. scheduler reliability
3. lifecycle correctness
4. clear user experience
5. monitoring and analytics
6. payments and launch infrastructure
7. adaptive intelligence
8. deeper personalization

---

# 3. Scope Discipline

IPlan has many possible long-term differentiators.

They should not all be built before launch.

Before launch, prefer:

- reliable core workflows
- stable scheduling
- clear onboarding
- trustworthy calendar behavior
- safe AI integration
- payment readiness
- security
- closed-beta validation

Avoid expanding the product simply because another useful idea is discovered.

New features should answer:

**Does this materially improve the initial paid product?**

If not, it should usually wait.

---

# 4. Phase 1 — Reliable Scheduler

The first major product phase is a reliable deterministic scheduler.

Core capabilities include:

- automatic study scheduling
- multi-day planning
- deadlines
- task priorities
- task difficulty/workload
- unavailable periods
- preferred study periods
- fixed commitments
- existing session protection
- break handling
- after-school buffer
- realistic study windows
- session splitting
- large-task distribution
- daily capacity control
- overload reporting
- calendar persistence
- duplicate prevention
- acceptance/reconciliation safety

This phase is substantially implemented.

---

# 5. Stage 2 — Plan My Day

Plan My Day is a core scheduling workflow.

It should:

- evaluate active work
- rank work deterministically
- identify available study time
- create a realistic multi-day proposal
- split larger tasks into manageable sessions
- respect deadlines and capacity
- prefer suitable study windows
- report work that cannot fit
- show a preview before writing anything
- persist only after explicit acceptance

The scheduler should remain deterministic and regression-tested.

---

# 6. Phase 2 — Adaptive Scheduler

The second major phase moves IPlan from static scheduling toward safe adaptation.

Capabilities include:

- Reorganize My Day
- completed-session protection
- locked-session protection
- stale-proposal protection
- changing-availability protection
- remaining-work accounting
- reserved-work accounting
- current-time validation
- acceptance reconciliation
- session lifecycle safety
- same-day adaptation
- recovery of displaced work
- falling-behind detection
- workload feasibility
- risk notifications

This phase is actively developed and already contains substantial implementation.

---

# 7. Reorganize My Day

Reorganize My Day should remain one of the main launch features.

It allows IPlan to safely replan the rest of the current day when reality changes.

It must preserve:

- completed work
- locked sessions
- fixed commitments
- unavailable periods
- current time
- protected future work
- required breaks

It must never silently destroy accepted work.

---

# 8. Same-Day Adaptation

IPlan includes live same-day adaptation infrastructure.

The long-term goal is for the system to react intelligently when:

- a study session overruns
- a session is missed
- a session is moved
- available capacity changes
- later work becomes displaced

This system should remain conservative.

Automatic adaptation must not feel like the calendar is constantly changing without the student's understanding.

---

# 9. Session Check-In System

The Session Check-In system provides real evidence about how students actually work.

It can capture cases such as:

- completed as planned
- still working
- overrun
- unfinished work
- missed/displaced work

This system supports future personalization.

Before expanding it, priority should remain on:

- evidence integrity
- avoiding duplicate evidence
- reliable timing
- correct overrun lifecycle
- safe integration with scheduling

---

# 10. Student Work Model

The Student Work Model is IPlan's personalization foundation.

Its purpose is to learn from real student behavior rather than assuming every student studies at the same speed.

Potential evidence includes:

- planned duration
- actual duration
- session overruns
- completed work
- subject
- task type
- historical patterns

Current personalization can influence planning-duration estimates.

Hard scheduler rules must always remain stronger than personalization.

---

# 11. Plan My Day Personalization

Plan My Day can compare:

- the student's own estimate
- IPlan's learned estimate

The student should remain in control.

Personalization should be explainable and should not silently modify the official task estimate.

---

# 12. Reorganize Personalization

Reorganize My Day can use the Student Work Model to produce more realistic remaining-day plans.

This should remain separate from Plan My Day's estimate preference.

A student's choice for one planning action should not silently apply to every future planning workflow.

---

# 13. Falling-Behind Detection

IPlan should identify when the student is unlikely to finish important work with their remaining capacity.

Inputs may include:

- remaining task workload
- deadlines
- available study time
- existing sessions
- completed minutes
- personalized duration estimates
- exam revision workload

The system should detect risk early enough to be useful.

It should not wait until a task is already overdue.

---

# 14. Workload Feasibility

Workload Feasibility answers a broader question than:

"Is this task overdue?"

It should evaluate:

**Can the student's remaining workload realistically fit inside the time they actually have?**

This system should feed:

- Dashboard workload visibility
- falling-behind detection
- risk warnings
- recovery actions

---

# 15. Risk Notifications

Risk notifications should help the student take action without becoming noisy.

Good notifications should be:

- specific
- calm
- timely
- actionable
- non-duplicative

Avoid turning IPlan into an alarm-heavy app.

---

# 16. Overflow Recovery

Overflow Recovery handles work that no longer fits its expected scheduling window.

It is distinct from Reorganize My Day.

Reorganize My Day:

- current day
- immediate adjustment

Overflow Recovery:

- later-day recovery
- cross-day capacity search
- deadline-aware rescheduling

This separation should remain clear.

---

# 17. Academic Calendar Import

IPlan has academic-calendar infrastructure.

Its role includes helping understand:

- exam periods
- school dates
- important academic events

Academic-calendar extraction should remain validated and structured.

It can later support:

- exam preparation timing
- reminders
- Exam Mode activation prompts
- school-aware planning

---

# 18. Exam Mode

Exam Mode is a major product expansion already under development.

Its purpose is to turn an exam period into a structured revision plan.

Capabilities include:

- exam schedule extraction
- exam scope extraction
- subject matching
- topic validation
- exam start-date logic
- revision workload estimation
- revision-session generation
- topic allocation
- history personalization
- revision completion tracking
- risk integration
- notifications
- overflow recovery
- student-work model integration

Exam Mode should reuse shared planning infrastructure rather than becoming a separate incompatible scheduler.

---

# 19. Exam Mode Product Principle

Exam Mode should not simply generate a revision calendar.

It should guide students through a progression such as:

1. concepts
2. weak topics
3. active recall
4. practice
5. past papers
6. final review

The exact structure may evolve, but revision planning should be purposeful rather than random time allocation.

---

# 20. AI Assistant

The AI Assistant should remain an interpretation and planning layer.

Useful AI responsibilities include:

- understanding student requests
- breaking tasks into subtasks
- explaining plans
- helping students structure work
- interpreting academic documents
- generating structured planning intent

The AI should not directly bypass deterministic scheduling safeguards.

Preferred architecture:

**AI reasoning → structured plan → deterministic scheduler → preview → acceptance**

---

# 21. AI Cost Control

Because IPlan is intended to be a paid SaaS, AI usage must be measurable.

Current infrastructure includes:

- AI quota
- usage recording
- usage aggregation
- usage queries
- rate limiting

Before launch, verify:

- expected cost per active user
- expensive AI workflows
- abuse protection
- quota behavior
- error handling
- plan/subscription limits

---

# 22. Support System

IPlan includes support infrastructure.

Before paid launch, support should be capable of handling:

- bug reports
- account problems
- scheduling issues
- payment issues
- feature confusion

Support context should avoid exposing unnecessary private student data.

---

# 23. Account Deletion

Account deletion should be production-ready before paid launch.

It should correctly handle:

- authentication cleanup
- Firestore user data
- relevant server-side cleanup
- deletion confirmation
- refund-policy interaction where applicable

This flow should remain tested.

---

# 24. Current Technical Priorities

The current technical priority should be stability and cleanup across the systems already built.

Focus areas include:

- task/session lifecycle correctness
- scheduler regression safety
- Reorganize acceptance
- same-day adaptation
- overflow recovery
- Student Work Model integrity
- Exam Mode integration
- account lifecycle
- security rules
- support
- production cleanup

---

# 25. Known Lifecycle Concern

A previously reported issue involved deleting a task while related calendar sessions or overdue carryover state remained visible.

Task deletion must be treated as a lifecycle problem, not merely a UI problem.

The final behavior should clearly define what happens to:

- scheduled sessions
- overdue state
- completed history
- displaced state
- linked scheduler data
- Firestore references

Any fix should include regression coverage.

---

# 26. Firebase / Data Safety

Before beta, Firestore architecture should be reviewed for:

- ownership enforcement
- authentication requirements
- least-privilege access
- cross-user data isolation
- sensitive fields
- server-only operations
- indexes
- deletion behavior

`firestore.rules` and related backend protections should be treated as launch-critical.

---

# 27. Security Audit

A pre-launch security review should include:

- Firebase security rules
- API authorization
- Firebase Admin usage
- environment variables
- OpenAI/API secrets
- rate limiting
- AI abuse protection
- support endpoints
- account deletion
- user data exposure
- unsafe client-side privileged operations

Security review should happen before opening IPlan broadly to paying users.

---

# 28. Payment Infrastructure

IPlan is intended to use monthly and/or annual subscriptions.

Before paid launch, payment infrastructure should cover:

- account-to-subscription mapping
- successful payment activation
- failed payments
- subscription renewal
- cancellation
- refunds
- test-to-production transition
- user entitlement checks
- webhook/idempotency behavior if used
- payment status recovery

Payment logic should not rely only on client-side state.

---

# 29. Legal / Company Setup

Before commercial launch, complete the required legal/company setup relevant to operating IPlan.

The intended business activity includes software/SaaS, educational technology, and AI-enabled digital services.

Legal and accounting requirements should be confirmed with qualified Egyptian professionals before commercial operation.

---

# 30. Analytics

Before beta, define the small number of product events that matter.

Useful metrics may include:

- onboarding completion
- first task created
- availability configured
- Plan My Day generated
- Plan My Day accepted
- Reorganize generated
- Reorganize accepted
- scheduler rejection/stale proposal
- session completed
- session overrun
- risk warning shown
- Exam Mode setup
- revision plan accepted
- AI Assistant use
- subscription conversion

Avoid collecting data merely because it is available.

---

# 31. Error Monitoring

Before beta, IPlan should have a reliable way to detect production errors.

Monitor areas such as:

- scheduler acceptance failures
- Firebase failures
- API failures
- AI endpoint failures
- extraction failures
- account deletion
- payment failures
- unhandled React errors

A user should not need to report every production failure manually.

---

# 32. Closed Beta

Before public paid launch, run a closed beta with real students.

The beta should test more than whether the application loads.

The key questions are:

- Do students understand Plan My Day?
- Do students trust automatic scheduling?
- Do they understand why sessions move?
- Is Reorganize My Day useful?
- Are stale-proposal rejections understandable?
- Do students complete generated sessions?
- Are duration estimates realistic?
- Are risk warnings useful?
- Does Exam Mode make revision easier?
- Are AI features worth their cost?
- Which flows confuse students?
- Which bugs destroy trust?

---

# 33. Beta User Group

The initial beta should stay relatively narrow.

Ideal first users:

- IB students
- students with real assignment/exam workload
- students willing to use IPlan for several weeks
- students willing to report confusing behavior

A focused beta will provide better evidence than a broad but shallow audience.

---

# 34. Beta Success Criteria

Do not define beta success only as user count.

Important signals include:

- students repeatedly use Plan My Day
- students accept generated schedules
- students return after schedule disruptions
- Reorganize solves real problems
- scheduling errors are rare
- duplicate/lost sessions do not occur
- students understand warnings
- students perceive IPlan as saving planning effort
- AI cost per active user is sustainable

---

# 35. Paid Launch Scope

The initial paid version should focus on a reliable core.

Target launch capabilities:

- task management
- subjects
- deadlines
- availability
- fixed/unavailable commitments
- automatic scheduling
- multi-day planning
- Reorganize My Day
- deadline-aware prioritization
- Today's Priority
- workload visibility
- safe AI planning
- deterministic calendar placement
- reliable persistence
- account management
- payment/subscription support

Exam Mode may be included if it reaches the same reliability standard.

---

# 36. Features That Should Not Delay Launch

Long-term ideas should not automatically delay launch.

Examples of functionality that can evolve after launch include:

- highly advanced personalization
- complex predictive behavior
- broad social features
- large numbers of AI workflows
- extensive gamification expansion
- support for every education system
- advanced collaboration
- deep integrations with many external platforms

Launch should happen when the core product is trustworthy and valuable.

---

# 37. Post-Launch Priority 1 — Better Falling-Behind Detection

After launch, improve falling-behind detection using real usage evidence.

Potential inputs include:

- completed minutes
- session overruns
- missed sessions
- remaining workload
- deadlines
- future capacity
- repeated recovery
- personalized task duration

The goal is to identify problems before they become overdue crises.

---

# 38. Post-Launch Priority 2 — Exam Planning

Continue deepening Exam Mode.

Possible future improvements include:

- topic confidence tracking
- weak-topic prioritization
- spaced revision
- past-paper allocation
- final-review strategy
- performance feedback
- automatic revision-plan adjustment

Exam planning should remain integrated with ordinary coursework capacity.

---

# 39. Post-Launch Priority 3 — Personal Learning Model

The long-term personalization objective is for IPlan to understand how each student works.

Potential learned patterns include:

- how long Math homework usually takes
- which task types are underestimated
- preferred productive study times
- likelihood of session overruns
- realistic daily workload
- revision pace
- subject-specific work patterns

This model should become more useful as evidence grows.

It should not make strong claims from weak evidence.

---

# 40. Personalization Confidence

Future personalization should distinguish between:

- little/no evidence
- weak evidence
- moderate evidence
- strong evidence

When confidence is low, IPlan should remain close to the student's own inputs.

As confidence improves, recommendations can become more individualized.

---

# 41. Explainability

IPlan should explain important scheduling or personalization decisions in student-friendly language.

Examples:

- why one task was prioritized
- why a task could not fit
- why a session moved
- why IPlan recommends more time
- why workload is at risk
- why a proposal became stale

Students should not feel that the calendar changes for mysterious reasons.

---

# 42. Trust as a Product Metric

Scheduler trust is a central product metric.

Trust can be damaged by:

- duplicate sessions
- disappearing sessions
- ignoring unavailable periods
- rescheduling completed work
- silently moving locked sessions
- impossible workloads
- inconsistent estimates
- unexplained changes

Fixing these issues is more valuable than adding superficial intelligence.

---

# 43. Current Development Order

Unless a critical issue changes priorities, development should broadly proceed in this order:

1. finish current reliability/lifecycle cleanup
2. keep scheduler and adaptive-system regressions green
3. remove temporary development-only code
4. complete security review
5. complete Firebase production hardening
6. complete payments/subscriptions
7. complete legal/company requirements
8. add production error monitoring
9. finalize analytics
10. prepare beta onboarding
11. run closed beta
12. fix beta trust/reliability issues
13. measure AI usage/cost
14. prepare paid launch
15. expand personalization after launch

---

# 44. Temporary Development Code

Temporary development fixtures or instrumentation should not remain indefinitely.

Before beta, review:

- DEV-only buttons
- fixture imports
- manual test helpers
- console-heavy debugging
- obsolete code paths
- abandoned components
- legacy IBStudyQuest naming
- old unused Firebase functions
- stale files

Remove them only after confirming they are genuinely unused.

---

# 45. Test Strategy

IPlan should continue using permanent subsystem regression suites.

Major current test areas include:

- scheduler
- liveSameDayAdaptation
- overflowRecovery
- sessionCheckIn
- studentWorkModel
- workloadFeasibility
- fallingBehind
- riskNotifications
- examMode
- examModeStudentWorkModel
- academicCalendar
- AI quota/usage
- support
- account deletion
- user storage

New high-risk fixes should normally receive permanent regression coverage.

---

# 46. Documentation Strategy

Keep the permanent project documents updated:

- `IPLAN_CONTEXT.md`
- `ARCHITECTURE.md`
- `SCHEDULER_SPEC.md`
- `ROADMAP.md`

Update documentation when there is a meaningful change to:

- architecture
- scheduler behavior
- product direction
- major subsystem behavior
- launch priorities

Do not document every tiny code change.

---

# 47. Git Strategy

Important project work should be committed to Git.

Prefer meaningful commits such as:

- scheduler lifecycle fix
- Exam Mode allocation update
- Firebase rules hardening
- support system
- account deletion
- documentation update

Avoid allowing months of unrelated changes to accumulate in one giant commit.

---

# 48. Source-of-Truth Order

For product direction:

1. current explicit product decisions
2. `ROADMAP.md`
3. `IPLAN_CONTEXT.md`
4. historical chat discussions

For technical behavior:

1. current repository code
2. passing regression tests
3. `SCHEDULER_SPEC.md`
4. `ARCHITECTURE.md`
5. historical chat discussions

---

# 49. When Adding a New Feature

Before building a new feature, answer:

1. What user problem does it solve?
2. Is this required before beta or launch?
3. Does an existing system already solve part of it?
4. Which data does it depend on?
5. Which existing systems could it break?
6. What is the minimum useful version?
7. How will it be tested?
8. What metric will show that students actually use it?

If these questions cannot be answered clearly, the feature probably needs more definition before implementation.

---

# 50. Long-Term Product Vision

The long-term version of IPlan should behave less like a calendar tool and more like a reliable academic companion.

It should progressively understand:

- what the student needs to finish
- how long their work actually takes
- when they realistically have time
- where they are falling behind
- what they should focus on next
- how exams change priorities
- when plans need to adapt

The end goal is not maximum automation.

The end goal is:

**useful, trustworthy guidance that reduces the student's planning burden.**

---

# 51. Guidance for AI Assistants

When helping develop IPlan:

1. Read `IPLAN_CONTEXT.md`.
2. Read `ARCHITECTURE.md`.
3. Read `SCHEDULER_SPEC.md` for scheduler-related work.
4. Read this roadmap before proposing major new features.
5. Do not expand scope automatically.
6. Prioritize reliability and launch readiness.
7. Distinguish pre-launch requirements from post-launch ideas.
8. Check the repository and tests before assuming something is missing.
9. Prefer improvements to existing systems over unnecessary parallel systems.
10. Flag changes that could delay beta without materially improving the launch product.

The roadmap is a prioritization guide, not a substitute for the current repository or tests.