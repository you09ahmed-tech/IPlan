# IPlan Scheduler Specification

> Last updated: September 2026
> Purpose: Define the behavioral contract of IPlan's deterministic scheduling system so future development does not accidentally break established scheduling, reorganization, acceptance, safety, or lifecycle behavior.

---

# 1. Purpose

IPlan's scheduler converts student work, deadlines, availability, existing sessions, and scheduling preferences into deterministic study-session proposals.

The scheduler is designed around one core principle:

**Scheduling logic proposes changes. It does not directly persist them.**

`src/utils/smartScheduler.js` is intended to remain:

- deterministic
- synchronous
- side-effect free
- independent of Firebase
- independent of React
- independent of network calls
- independent of AI/OpenAI

Given identical inputs, scheduling should produce identical outputs.

All sources of current time used for scheduling should be explicitly injectable where possible so behavior can be regression tested.

Persistence is handled by callers such as Dashboard after the student explicitly accepts a preview.

---

# 2. Primary Scheduler Entry Points

The main scheduling functions include:

## `buildSmartSchedule(...)`

Main Stage 2 / Plan My Day scheduling engine.

Used to build deterministic scheduling proposals over one or more days.

## `reorganizeRemainingDay(...)`

Stage 3 scheduling operation.

Used to reorganize the student's remaining work for the current day while preserving work that must not move.

## Supporting functions

Important supporting functions include:

- `splitIntoChunks(...)`
- `getCompletedMinutesByTask(...)`
- `getReservedMinutesByTask(...)`
- `identifyReorganizableSessions(...)`
- `getExistingProposalIds(...)`
- `identifySessionsToReconcile(...)`
- `excludeSessionsSatisfyingProposals(...)`
- `planReorganizeAcceptance(...)`
- `validateReorganizeProposal(...)`
- `findProposalsBlockedByAvailability(...)`
- `getSameDayFloorMinutes(...)`

Exact exported functions should always be verified against the current implementation.

---

# 3. Stage 2 — Plan My Day

Stage 2 is the baseline deterministic scheduling system.

Its major responsibilities include:

- determining eligible tasks
- calculating remaining work
- prioritizing tasks
- splitting work into study chunks
- determining available study windows
- respecting unavailable periods
- respecting existing protected/fixed sessions
- considering preferred study windows
- respecting daily study limits
- considering after-school buffers
- distributing large tasks across days
- balancing subject variety
- reporting overload honestly
- preventing duplicate acceptance
- reconciling existing IPlan sessions safely

Stage 2 proposals use:

`proposalType = "plan"`

unless another caller explicitly specifies a different proposal type.

---

# 4. Stage 3 — Reorganize My Day

Stage 3 reorganizes remaining work for the rest of the current day.

Its purpose is not to rebuild the student's entire calendar.

It must:

- operate on the current day
- identify sessions that are genuinely movable
- preserve completed sessions
- preserve locked sessions
- preserve fixed/manual/otherwise protected sessions
- recover work from missed replaceable sessions
- subtract completed work
- subtract protected reserved work
- respect current unavailable periods
- respect current time
- respect protected-session break spacing
- report work that cannot safely fit
- avoid deleting a session that already satisfies the accepted proposal

Stage 3 proposals use:

`proposalType = "reorganize-day"`

---

# 5. Eligible Tasks

A task may enter Smart Scheduler only when it is a valid active task.

A task should be excluded when:

- it is missing or malformed
- its title is empty
- `completed === true`
- its status is not active

Historically, a missing status is treated as:

`active`

The task ID should be stable whenever possible.

---

# 6. Remaining Work

Remaining work is not always equal to the task's original estimate.

Conceptually:

`remaining = estimated - completed - reserved`

where applicable.

## Valid task estimate

When the task has a positive valid `estimatedMinutes`, that estimate is used.

## Missing or invalid estimate

When no usable estimate exists, IPlan uses the configured default session duration.

Historically, the default fallback is 45 minutes when no valid configured value exists.

The assessment should identify whether the estimate came from:

- `task`
- `default`

---

# 7. Completed Work

Completed work is derived from study-session history.

Only sessions that:

- have `status === "completed"`
- have a stable `taskId`
- have a positive duration

count toward completed minutes.

Completed minutes reduce remaining work.

A missed or unfinished study block does not count as completed work merely because its scheduled time has passed.

---

# 8. Stage 2 vs Stage 3 Completed-Work Behavior

The Stage 2 baseline intentionally preserves its historical Plan My Day behavior unless completed-minute information is explicitly provided.

Stage 3 supplies completed-work information because Reorganize My Day must understand what work has already actually happened.

This distinction must not be removed accidentally.

---

# 9. Reserved Work

Reserved work means:

**work that is not complete, but already has a protected future session assigned to it.**

Reserved work must not be scheduled again.

This prevents:

- duplicate scheduling
- inflated unscheduled-work reporting
- double allocation

Protected/reserved sessions can include:

- locked sessions
- fixed sessions
- sessions from protected sources
- sessions on other days
- future sessions that the current reorganization is not allowed to move

---

# 10. What Does Not Count as Reserved Work

Reserved work must not include:

- completed sessions
- archived sessions
- sessions currently being replaced
- past missed sessions whose time has already ended
- sessions without a usable task identity

Completed sessions are handled separately as completed work.

Missed past work remains outstanding and should be eligible for rescheduling.

---

# 11. Reserved Work Must Not Double Count

Each reserved session must only be counted once.

Multiple protected sessions for the same task should sum correctly.

Example:

Task estimate:

`90 minutes`

Two protected future sessions:

`30 + 30 minutes`

Then:

`reservedMinutes = 60`

and only:

`30 minutes`

remain to be newly scheduled.

---

# 12. Completed + Reserved Work

Completed and reserved work are separate concepts and must remain separate in scheduling assessments.

Example:

Task estimate:

`90 minutes`

Completed:

`30 minutes`

Protected future work:

`30 minutes`

Then:

`remainingMinutes = 30`

The task should not be scheduled for 90 or 60 minutes again.

---

# 13. Fully Covered Tasks

If completed work plus reserved work fully covers a task:

- no new proposal should be generated for that task
- the task should not incorrectly appear in `unscheduledTasks`

A task with 30 minutes remaining in its estimate and a protected 30-minute future session is already covered.

---

# 14. Active Overrun Protection

The scheduler integrates with Session Check-In / overrun behavior.

A task the student is actively working on through an active overrun must not receive an additional future study block simply because an overrun floor causes remaining work to remain positive.

The active overrun itself represents the student's current work.

Once the active-overrun state ends, normal remaining-work scheduling may resume.

---

# 15. Priority Scoring

Smart Scheduler uses its own scheduling-specific priority score.

This is deliberately separate from Dashboard's "Today's Priority" ranking.

Scheduling priority currently considers:

1. deadline urgency
2. user-set priority
3. workload pressure
4. assessed-work/task type
5. age/neglect
6. difficulty

Deadline urgency is intended to remain the strongest factor.

---

# 16. Deadline Scores

Current scheduling deadline scores are:

- Overdue: `100`
- Due today: `88`
- Due tomorrow: `76`
- Due within 3 days: `60`
- Due within 7 days: `40`
- Due later: `18`
- No deadline: `6`

These are scheduler-specific values.

Do not assume Dashboard priority scoring uses the same values.

---

# 17. User Priority Scores

Current scheduling priority values:

- High: `30`
- Medium: `16`
- Low: `6`

The default falls back to Medium behavior.

---

# 18. Task-Type Scores

Current assessed-work bonuses:

- EE: `14`
- IA: `12`
- TOK: `10`
- Exam Prep: `8`
- Revision: `6`
- CAS: `3`

Unrecognized task types receive no special task-type bonus.

Task type should remain important but should not overpower urgent deadlines.

A small urgent task may correctly outrank a large distant assessed task.

---

# 19. Difficulty Scores

Current difficulty bonuses:

- Hard: `6`
- Medium: `3`
- Easy: `0`

Difficulty is intentionally a minor factor.

"Hard" must not automatically mean "schedule first."

---

# 20. Workload Pressure

Workload pressure considers how much work must be completed per remaining day.

The current maximum workload-pressure contribution is:

`25`

The reference pressure is approximately:

`120 minutes/day`

Large undated tasks may receive modest workload pressure but should not overpower real deadlines.

---

# 21. Age / Neglect Boost

Older open work receives a small capped priority boost so that tasks without urgent deadlines do not disappear indefinitely.

Current behavior:

- approximately `2` points per week
- capped at `10`

Age must remain weaker than meaningful deadline urgency.

---

# 22. Session Splitting

Large tasks should be broken into study chunks.

Chunk sizing is based primarily on the student's configured default session duration.

If no useful configured value exists, the historical default is approximately:

`45 minutes`

A small trailing remainder below the minimum-session threshold should normally be merged into the preceding chunk rather than creating an impractically tiny session.

The total duration across chunks must always equal the actual remaining work.

---

# 23. Session Split Example

If a task requires:

`150 minutes`

the scheduler should divide it into multiple sessions rather than creating one 150-minute study block.

Existing Stage 2 regression coverage verifies:

- more than one chunk is generated
- no chunk exceeds expected chunk limits in the tested configuration
- total scheduled duration remains exactly 150 minutes

---

# 24. Daily Smart-Study Cap

The scheduler currently applies an internal maximum smart-study allocation of approximately:

`300 minutes per day`

Real availability may be smaller and must always win.

Existing study sessions on the day also count toward the effective daily cap.

The cap must not mean:

"300 new minutes regardless of existing study."

Instead it must consider already scheduled task-linked study work.

---

# 25. Existing Sessions and Daily Cap

If a future day already contains study sessions, those minutes reduce how much additional work Smart Scheduler may place there.

This prevents a previously scheduled 270-minute day from receiving another full 300 minutes of newly generated work.

Daily summaries may still distinguish:

- work already existing
- work added by the current scheduler run

Do not silently redefine summary fields while fixing cap accounting.

---

# 26. Availability

Availability is a hard input to placement.

The scheduler must distinguish at least:

## `unavailable`

Hard blocking constraint.

Study may not overlap it.

Examples:

- School
- Football
- appointment
- dentist
- other commitments

## `preferred-study`

Soft preference.

The scheduler should favor it where reasonable but it must not be treated as unavailable time.

---

# 27. Recurring Availability

Availability rules may recur.

Scheduler and acceptance validation must correctly evaluate whether a recurring block applies on the relevant date.

An unavailable recurring occurrence that applies today blocks scheduling.

A recurring occurrence that:

- belongs to another weekday
- is excluded on the current date
- belongs to another date

must not falsely block scheduling.

---

# 28. Availability Adjacency

Unavailable periods block overlap, not adjacency.

A study session may begin exactly when an unavailable period ends.

A study session may end exactly when an unavailable period begins.

There is no generic study-break padding around ordinary non-study availability blocks.

---

# 29. Preferred Study Windows

Preferred study windows influence placement.

For non-urgent work, a valid preferred window should generally be favored.

Urgency may override the preference.

Example:

- non-urgent reading may wait for the preferred evening window
- a high-priority task due immediately may be placed earlier

Preferred time is a preference, not a hard scheduling constraint.

---

# 30. School Buffer

The scheduler supports an after-school buffer.

A block qualifies as School only when:

- it is an unavailable block
- it applies on the relevant date
- its label contains the word "school" case-insensitively

The scheduler must not invent a school block that does not exist.

The configured after-school buffer is applied after the latest applicable school block.

Regression behavior has included a 30-minute buffer after a school day ending at 15:30, producing a normal study floor at 16:00.

---

# 31. Existing Session Protection

Existing sessions reduce available scheduling windows according to their protection/movability rules.

Completed sessions must continue occupying their calendar time.

Archived sessions should not occupy active scheduling space.

A completed IPlan session must not become movable simply because its `locked` field is false.

---

# 32. Stage 2 Existing Session Protection

Stage 2 must not overlap:

- fixed sessions
- locked sessions
- legacy non-IPlan sessions
- other existing non-movable calendar sessions

Legacy sessions must not be silently superseded merely because Smart Scheduler exists.

---

# 33. Reorganizable Stage 3 Sessions

A session should be eligible for Reorganize My Day only when it is genuinely scheduler-controlled and movable.

The regression contract excludes examples such as:

- locked sessions
- completed sessions
- manual-source sessions
- task-less sessions
- legacy/fixed sessions
- sessions on another day

An ordinary unlocked, task-linked IPlan session on the current day may be eligible.

---

# 34. Protected Stage 3 Sessions

Stage 3 must preserve sessions that cannot be safely reorganized.

Protected examples include:

- completed sessions
- locked sessions
- fixed sessions
- non-IPlan/manual sessions
- relevant future protected sessions

Protected sessions should be exposed to the preview so the student can understand what is staying as planned.

---

# 35. Missed Sessions

A past replaceable session that was not completed does not count as finished work.

Its work remains outstanding.

Reorganize My Day should be able to recover that work later in the same day if safe capacity remains.

---

# 36. Current-Time Floor

The scheduler must not propose a same-day session:

- in the past
- effectively starting immediately with no preparation time

The current same-day floor adds approximately:

`15 minutes`

and rounds upward to a:

`5-minute`

boundary.

Example conceptually:

Current time + 15-minute lead  
→ round upward to next 5-minute boundary  
→ earliest valid same-day start.

---

# 37. Time Must Be Injectable

Scheduler functions should receive current time as input where possible.

Do not hide scheduling-critical behavior behind uncontrolled calls to:

`Date.now()`

This allows deterministic regression testing.

---

# 38. Reorganize Is Today-Only

Reorganize My Day is a same-day operation.

It should not become an implicit multi-day planner.

All new Stage 3 reorganization proposals should belong to the current date.

Cross-day work recovery belongs to separate systems such as Overflow Recovery.

---

# 39. Single-Day Horizon Is Not Automatically "Last Chance"

A critical rule:

A one-day planning horizon does not mean every task is urgent or on its final scheduling opportunity.

Stage 3 planning only today must not automatically relax breaks and buffers for non-urgent work simply because today is the only date in the scheduling call.

"Last chance" should reflect the task's real deadline or a genuine multi-day planning boundary.

---

# 40. Protected Study Breaks

Stage 3 can enforce study breaks around existing protected study sessions.

The configured break must apply:

- after a protected study session
- before a protected study session

Example:

Protected study:

`20:50–21:20`

10-minute break:

earliest following study start:

`21:30`

---

# 41. Break Before Protected Study

New study work must also leave sufficient break space before an upcoming protected study session.

Example:

Protected session begins:

`20:00`

Required break:

`10 minutes`

A new study block should normally end no later than:

`19:50`

---

# 42. Multiple Protected Sessions

The scheduler must not squeeze a new study session into a technically open gap when doing so would violate required breaks around one or both protected sessions.

A gap between two protected sessions is only usable when:

- the study block fits
- required break spacing also fits

---

# 43. Breaks Around Non-Study Commitments

Study-session break padding must not be applied to ordinary availability blocks.

Example:

Football:

`17:00–19:00`

If study is otherwise allowed from 19:00 onward, study may begin exactly at:

`19:00`

unless some other rule creates a later floor.

---

# 44. Breaks Between Newly Placed Sessions

The scheduler should also maintain the configured break between study sessions it places during the same scheduling run.

Newly generated sessions should not be packed back-to-back when a study break is configured.

---

# 45. Completed Sessions Also Occupy Break Context

A completed study session still represents real study that occurred.

Where Stage 3 protected-study break handling is enabled, new work immediately afterward should respect the configured break.

---

# 46. Stage 2 Break Compatibility

Stage 2's historical Plan My Day behavior must remain compatible with its regression baseline.

`breakAroundProtectedStudy`

defaults to off for ordinary Stage 2 plans.

Therefore Stage 3 protected-session break changes must not silently alter Stage 2 placement.

---

# 47. Emergency Break Relaxation

Urgent last-chance work may under controlled circumstances relax certain buffer/break constraints.

If this occurs, the proposal should carry explicit metadata such as:

- `breakRelaxed`
- `bufferRelaxed`

The system must never hide that a normal spacing preference was relaxed.

Hard overlap constraints must still remain protected.

---

# 48. Latest Study Time

No generated session may extend beyond the configured latest study time.

The scheduler must not fabricate capacity beyond the student's allowed study window.

---

# 49. Earliest Study Time

Generated sessions should respect the student's configured earliest study time as part of availability-window generation.

Same-day current-time floors may create a later effective start.

---

# 50. Subject Variety

IPlan contains a modest subject-variety rule.

If the student has just received repeated sessions from the same subject, another reasonably comparable task from another subject may temporarily be preferred.

Variety must never override strong urgency.

The scheduler should not defer:

- overdue work
- work due today
- work due tomorrow

merely for subject variety.

The existing score-comparison tolerance is intentionally modest.

---

# 51. Multi-Day Distribution

Large tasks should normally be distributed across available days rather than consuming all capacity immediately.

The scheduler calculates a reasonable chunk allowance per day based on:

- number of chunks
- available planning days
- deadline

This distribution preference may be lifted on a genuine last-chance day so deadline completion is not sacrificed merely for even spreading.

---

# 52. Deadline Boundaries

A non-overdue task should not be scheduled after its deadline.

Overdue work is handled as already late and may be scheduled for recovery.

---

# 53. Overload

The scheduler must not pretend all work fits when it does not.

When capacity is insufficient:

- schedule as much appropriate work as possible
- preserve hard constraints
- report remaining work honestly
- populate `unscheduledTasks`
- populate relevant overload information

Do not manufacture capacity by:

- exceeding latest study time
- overlapping protected sessions
- overlapping unavailable time
- breaking the daily cap
- silently dropping remaining work

---

# 54. Deadline Feasibility

Task assessments may include deadline feasibility information such as:

- due work minutes
- available minutes before deadline
- deficit minutes

This information should describe reality rather than guarantee completion.

Example regression behavior:

540 minutes of work  
180 minutes available before deadline  
→ 360-minute deficit.

---

# 55. Proposal IDs

Scheduler proposals use deterministic proposal IDs.

Conceptually:

`taskId + date + time + chunkIndex`

Deterministic IDs make:

- repeated generation
- duplicate prevention
- reconciliation
- idempotent acceptance

possible.

Changing proposal-ID semantics is high risk.

---

# 56. Batch IDs

Scheduling runs may also generate deterministic batch identifiers based on the planning period.

These should remain stable and deterministic rather than random when they are used for reconciliation or tracing.

---

# 57. Duplicate Prevention

Accepting the same plan repeatedly should not create duplicate sessions.

Before persistence, existing proposal IDs should be identified.

A proposed session whose proposal ID is already represented by a real accepted session should not be recreated.

---

# 58. Reconciliation

IPlan may identify existing IPlan sessions that are eligible to be replaced by newly accepted proposals.

Reconciliation must remain narrow.

An unrelated task must not be deleted because another task was rescheduled.

Task/date identity and scheduler ownership matter.

---

# 59. The Duplicate-Reconciliation Trap

A previously identified failure mode occurred when:

1. an existing session already satisfied a newly generated proposal
2. deterministic proposal ID caused creation to be skipped
3. reconciliation still selected the existing session for deletion
4. acceptance could leave zero sessions

This is forbidden.

The acceptance layer must distinguish:

- sessions to create
- obsolete sessions to delete
- sessions already satisfying the accepted proposal

---

# 60. `excludeSessionsSatisfyingProposals(...)`

This guard prevents a session that already fulfills an accepted proposal from being deleted during reconciliation.

A matching accepted proposal means the existing satisfying session should remain.

Unrelated obsolete sessions may still be removed.

---

# 61. `planReorganizeAcceptance(...)`

Stage 3 acceptance planning must coordinate creation and deletion together.

Conceptually it returns categories such as:

- `toCreate`
- `toDelete`
- `keptAsAlreadySatisfied`
- `blockedByAvailability`

Acceptance planning must be idempotent.

Running the same accepted Reorganize plan repeatedly should converge on:

**exactly one correct session**

—not zero and not duplicates.

---

# 62. Genuine Moves

If a session genuinely moves from one time to another:

- the new session should be created
- the obsolete previous session should be removed
- exactly one pending session should remain

The duplicate-protection system must not accidentally prevent legitimate movement.

---

# 63. Write-Failure Safety

Creation should happen before destructive deletion.

If creating the replacement fails, the original session must remain.

The acceptance flow must not:

1. delete old session
2. attempt create
3. fail
4. leave the student with lost work

The safer contract is:

1. create required replacement(s)
2. only after successful creation, perform eligible deletion(s)

---

# 64. Stale Proposal Principle

A proposal may become unsafe between:

1. generation
2. review
3. acceptance

Therefore acceptance must never assume the original state still exists.

Reorganize proposals must be revalidated against fresh state before persistence.

---

# 65. Fresh State Required at Acceptance

Before accepting a Reorganize proposal, reload relevant current data.

This includes:

- current sessions
- current tasks/quests
- current availability
- current time

Acceptance must operate on fresh data rather than stale Dashboard state.

---

# 66. Task Deleted Before Acceptance

If a task represented in the proposal was deleted while the preview was open:

- validation must fail
- no replacement session should be created for that task
- the student should receive an actionable explanation

Deletion/completion changes invalidate stale proposals.

---

# 67. Task Completed Before Acceptance

If the underlying task becomes completed while the proposal is open:

- proposal validation must fail
- completed work must not be recreated

This includes workflows where completing a task removes it from the active quest collection.

---

# 68. Session Completed Before Acceptance

If a session that the proposal intended to replace becomes completed before acceptance:

- validation must fail
- the completed session must not be deleted
- the student should receive a useful reason

The lower-level acceptance planner should independently refuse to delete completed sessions even if called directly.

---

# 69. Session Locked Before Acceptance

If a previously replaceable session becomes locked while the proposal is open:

- validation must fail
- the session must remain
- the student should receive a reason identifying the changed session

The lower-level acceptance planner should independently avoid deleting locked sessions.

---

# 70. Proposed Time Passes Before Acceptance

If the proposed session's start time becomes invalid while the preview remains open:

- validation must fail
- the student should regenerate/reorganize

A proposal that was valid at generation time is not permanently valid.

---

# 71. New Protected Session Before Acceptance

If a new fixed/locked/protected session appears while a proposal is open and overlaps the proposed study block:

- validation must fail
- the protected session wins

Stale acceptance must never overwrite newly created protected calendar state.

---

# 72. New Unavailable Availability Before Acceptance

If a new unavailable block is created after proposal generation and it overlaps a proposed session:

- validation must fail
- the proposal must not persist the conflicting study block

This protection must work for real persisted availability-document shapes, not only simplified test fixtures.

---

# 73. Availability Validation Rules

At acceptance:

- overlapping `unavailable` block → invalid
- partially overlapping `unavailable` block → invalid
- unavailable block ending exactly at proposal start → allowed
- unavailable block beginning exactly at proposal end → allowed
- overlapping `preferred-study` → allowed
- recurring unavailable occurrence applying that day → invalid
- recurring block on another weekday → ignored
- excluded recurrence occurrence → ignored
- one-off block on another date → ignored

---

# 74. Persistence-Layer Availability Guard

Availability protection should exist at more than only the visible validation layer.

`planReorganizeAcceptance(...)` should independently avoid creating sessions that collide with unavailable periods.

This provides defense in depth.

A proposal rejected by validation must not be persisted.

A persistence plan with a detected availability clash must not create the clashing session.

---

# 75. Already-Protected Sessions Are Not Stale Changes

A protected session that already existed when the proposal was generated must not itself cause stale-proposal rejection merely because it is locked or completed.

The scheduler already knew about it.

The important distinction is:

## Protected before generation

Expected state.

Do not reject solely because it is protected.

## Became protected after generation

State changed.

Reject if the change invalidates the proposal.

---

# 76. Protected Session Preview

Reorganize previews should clearly show sessions that are staying as planned.

Protected-reason descriptions may include:

- Completed
- Locked
- Fixed
- Unchanged

The UI must derive these labels from actual session state rather than guessing from session titles.

---

# 77. Preview Is Presentational

`SmartSchedulePreview.jsx` should remain a display/interaction component.

It should not:

- run Smart Scheduler itself
- directly write scheduling changes
- become the source of scheduling truth

Dashboard/calling logic owns:

- proposal generation
- validation
- acceptance
- persistence

---

# 78. Preview Modes

The current preview supports multiple scheduling contexts including:

- normal plan
- reorganize
- exam revision
- recovery

These modes share presentation infrastructure while preserving different behavioral meaning.

Reorganize is today-focused.

Recovery may span later days.

Exam revision may use the multi-day plan presentation.

---

# 79. Reorganize Empty State

If there is no remaining movable/outstanding work:

- `nothingToReorganize` should be true
- no proposals should be generated
- no replacement IDs should be generated

The UI may communicate that there is nothing left to reorganize.

---

# 80. Plan My Day and Reorganize Must Stay Distinct

Stage 3 was intentionally added without silently rewriting Stage 2 behavior.

Examples of deliberate differences include:

## Plan My Day

- multi-day capable
- proposal type `plan`
- baseline reserved-work behavior remains unchanged unless supplied
- protected-study break padding historically defaults off

## Reorganize My Day

- current day only
- proposal type `reorganize-day`
- subtracts completed work
- subtracts reserved protected work
- identifies replaceable sessions
- protects completed/locked/fixed state
- enforces protected-study break behavior
- uses stale acceptance validation

Do not merge these modes casually.

---

# 81. Student Work Model Interaction

Personalization may adjust the estimated duration IPlan chooses to plan with.

However personalization must remain upstream of deterministic placement.

Conceptually:

student evidence  
↓  
duration prediction  
↓  
effective scheduling duration  
↓  
deterministic Smart Scheduler

Personalization must not bypass:

- availability
- protected sessions
- daily capacity
- deadlines
- stale validation
- break rules

---

# 82. Plan My Day Personalization Scope

Plan My Day may offer a plan-scoped choice between:

- user's own estimate
- IPlan personalized estimate

This choice should not silently modify the stored task estimate unless the user explicitly chooses a flow that does so.

---

# 83. Reorganize Personalization Scope

Reorganize My Day maintains its own estimate-preference state.

It should not automatically inherit a Plan My Day preference merely because both features use Smart Scheduler.

---

# 84. Exam Mode Integration

Exam revision planning may reuse Smart Scheduler for deterministic placement.

Exam-specific workload generation should happen before placement.

The scheduler still owns calendar constraints.

Exam Mode must not receive permission to bypass ordinary scheduling safety merely because the work is revision.

---

# 85. Overflow Recovery Integration

Overflow Recovery uses related scheduling infrastructure for cross-day recovery.

It is distinct from Reorganize My Day.

Reorganize:

**same-day adjustment**

Overflow Recovery:

**cross-day recovery of work that no longer fits**

Do not turn Reorganize into Overflow Recovery.

---

# 86. Availability and Falling-Behind Consistency

Other systems that calculate available study capacity should use scheduler-compatible availability/time-floor logic rather than reimplementing incompatible versions.

For example, current-day capacity calculations should be consistent with the same-day floor used by Smart Scheduler.

---

# 87. No Mutation of Inputs

Core scheduling functions should not mutate input arrays or source objects.

Regression tests explicitly verify this behavior.

Pure transformations are important for:

- deterministic testing
- React state safety
- avoiding hidden side effects

---

# 88. Honest Summaries

Scheduler summaries should distinguish what IPlan actually scheduled from what already existed.

Do not silently redefine:

- scheduled minutes
- available minutes
- remaining minutes
- unscheduled minutes

when fixing another calculation.

---

# 89. Unscheduled Work

`unscheduledTasks` should contain genuinely uncovered work.

It must not include minutes that are already:

- completed
- reserved by protected sessions

Unscheduled work is real work for which no safe scheduling slot was found.

---

# 90. No-Capacity Behavior

If no safe capacity exists:

- do not force placement
- do not violate constraints
- report the remaining work honestly

Safety is more important than always producing a complete-looking calendar.

---

# 91. Acceptance Is Explicit

Smart scheduling should not persist automatically because the student opened Dashboard or because data refreshed.

Generation should occur through explicit planning/reorganization actions.

Persistence should occur after explicit acceptance.

This preview-first model is an important user-control guarantee.

---

# 92. Revalidation Comes Before Mutation

The acceptance order should conceptually be:

1. reload fresh state
2. validate proposal
3. reject if stale
4. calculate safe acceptance plan
5. create needed sessions
6. delete only eligible obsolete sessions
7. refresh UI/state

Never begin destructive mutation before stale validation.

---

# 93. User-Presentable Rejection Reasons

When a stale proposal is rejected, reasons must not be empty.

Reasons should be:

- specific
- actionable
- understandable

Examples of causes:

- task completed or deleted
- session completed
- session locked
- proposed time already passed
- schedule now clashes
- availability changed

The student should be able to understand why they need to regenerate the plan.

---

# 94. Deterministic Acceptance

Repeated acceptance planning over unchanged state should produce stable results.

Acceptance should be idempotent.

The invariant is:

**exactly one correct accepted representation of each intended session**

—not duplicates and not accidental disappearance.

---

# 95. Scheduler Regression Suite

Core scheduler regression files currently include:

- `tests/scheduler/activeOverrunExclusion.test.mjs`
- `tests/scheduler/assistantPlan.test.mjs`
- `tests/scheduler/fixtures.mjs`
- `tests/scheduler/harness.mjs`
- `tests/scheduler/lifecycle.test.mjs`
- `tests/scheduler/noCapacity.test.mjs`
- `tests/scheduler/protectedBreaks.test.mjs`
- `tests/scheduler/reservedWork.test.mjs`
- `tests/scheduler/run.mjs`
- `tests/scheduler/stage2.test.mjs`
- `tests/scheduler/stage3.test.mjs`
- `tests/scheduler/staleProposal.test.mjs`

---

# 96. Tests Are Part of the Specification

For scheduler development, the regression tests are not merely implementation checks.

They form part of the behavioral contract.

If new code disagrees with an existing regression test:

1. determine whether the requested behavior intentionally changes the specification
2. do not simply delete or weaken the test to make the build green
3. update both implementation and specification deliberately if behavior truly changes

---

# 97. Minimum Tests After Scheduler Changes

Any meaningful change to scheduler behavior should run the scheduler regression suite.

Depending on the change, also run relevant adjacent suites such as:

- liveSameDayAdaptation
- overflowRecovery
- sessionCheckIn
- studentWorkModel
- workloadFeasibility
- fallingBehind
- examMode
- examModeStudentWorkModel

Scheduler behavior is consumed by several higher-level systems.

---

# 98. High-Risk Areas

Treat changes in these areas as high risk:

- proposal IDs
- remaining-work accounting
- reserved work
- completed-work accounting
- session movability
- availability recurrence
- protected-session breaks
- current-time floor
- daily cap
- stale validation
- acceptance ordering
- reconciliation
- task deletion/completion lifecycle
- active overrun behavior
- cross-day scheduling
- personalization duration inputs

A small-looking change in one of these areas may alter many planning flows.

---

# 99. Source-of-Truth Order

When scheduler information conflicts, use:

1. current scheduler implementation
2. passing scheduler regression tests
3. this specification
4. architecture/context documentation
5. historical chat discussion

If code and tests conflict, investigate rather than assuming either is automatically correct.

---

# 100. Core Invariants Summary

Future IPlan development must preserve these invariants unless an intentional product change explicitly replaces them:

1. Smart Scheduler proposes; it does not persist by itself.
2. Scheduling remains deterministic for identical inputs.
3. Hard unavailable periods are never overlapped.
4. Preferred-study periods remain preferences, not hard blocks.
5. Completed work is not scheduled again.
6. Protected reserved work is not scheduled again.
7. Past missed work remains outstanding.
8. Locked/fixed/protected sessions remain protected.
9. Reorganize My Day only moves genuinely eligible sessions.
10. Reorganize My Day operates on the remaining current day.
11. Same-day proposals respect the current-time floor.
12. Study-break rules around protected sessions are respected in Stage 3.
13. Non-study availability blocks receive no generic study-break padding.
14. Existing study work counts toward daily capacity.
15. No work is silently fabricated to fit beyond capacity.
16. Unscheduled work is reported honestly.
17. Proposal IDs remain deterministic.
18. Repeat acceptance must not create duplicates.
19. A session satisfying an accepted proposal must not be deleted.
20. Genuine moves must still replace obsolete sessions.
21. Creation happens before destructive deletion.
22. Fresh sessions, tasks, availability, and time are checked at acceptance.
23. Deleted/completed tasks invalidate stale proposals.
24. Newly completed/locked sessions invalidate stale proposals where relevant.
25. Newly unavailable time invalidates conflicting stale proposals.
26. Newly protected calendar conflicts invalidate stale proposals.
27. Already-protected sessions known at generation do not falsely invalidate.
28. Rejected proposals produce useful user-facing reasons.
29. AI and personalization may influence inputs but do not bypass deterministic safety.
30. Regression tests are part of the scheduler's behavioral contract.

---

# 101. Guidance for AI Assistants

Before changing scheduler-related IPlan code:

1. Read `IPLAN_CONTEXT.md`.
2. Read `ARCHITECTURE.md`.
3. Read this `SCHEDULER_SPEC.md`.
4. Inspect the current implementation in `src/utils/smartScheduler.js`.
5. Inspect the caller that will persist the result, especially Dashboard.
6. Identify which scheduler regression tests cover the affected behavior.
7. Identify adjacent systems that depend on the changed rule.
8. Prefer the smallest safe change.
9. Add or update a regression test for any new edge case.
10. Run the affected regression suites.
11. Do not weaken an invariant simply to make one scenario pass.
12. If code, tests, and documentation disagree, flag the inconsistency before making assumptions.

The repository and passing regression tests remain the definitive technical source of truth.