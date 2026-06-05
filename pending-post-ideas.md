# Pending Post Ideas

## 1. The smallest rate-limit fix was the right one

### Hook
- I hit Airtable rate limits.
- The right fix was not workers, queues, or a bigger concurrency system.
- It was replacing one `Promise.all(...)` with sequential processing.

### Before
```ts
const processedEmails = await Promise.all(
  messages.map((message) => processEmail(message))
);
```

### After
```ts
const processedEmails = [];

for (const message of messages) {
  processedEmails.push(await processEmail(message));
}
```

### Points
- the issue was pressure, not missing infrastructure
- each email triggered multiple Airtable operations
- `Promise.all(...)` turned those into one burst against the same base
- the minimal fix solved the actual problem immediately
- concurrency is still available later, but it should be introduced deliberately

### Trade-off
- yes, sequential processing is slower
- but it is stable
- once the pipeline is stable, controlled concurrency can be added safely

### Angle
- not every rate-limit issue needs a big solution
- sometimes removing pressure is the whole fix
- sometimes the proposed solution is bigger than the problem

---

## 2. Rollback matters before retry [POSTED]

### Hook
- before adding retries, I had to make sure one failed email could clean up after itself

### Points
- if processing creates a DB record and later fails, that record can become misleading
- if processing marks an email as read and then fails, that side effect must be undone
- retrying on top of dirty state is weak engineering
- rollback first, retry second
- but not every failure deserves rollback
- some failures are side effects, not core pipeline failures

### What rollback covered
- delete the Airtable record if that attempt created it
- mark the Outlook email as unread if that attempt marked it as read

### Nuance
- I initially treated `markEmailAsRead(...)` failure as a full pipeline failure
- that turned out to be the wrong boundary
- classification + persistence are the core outcome
- marking as read is a side effect
- side-effect failure should be logged, not used to restart the whole classification pipeline

### Angle
- retries are not resilience on their own
- recovery paths matter just as much
- good rollback design depends on knowing what is truly core vs what is ancillary

---

## 3. The real job was choosing the right unit of work [POSTED]

### Hook
- the important shift was moving from batch-stage processing to per-email processing

### Points
- failure isolation became cleaner
- rollback became possible without touching unrelated emails
- retries became easier to reason about
- future worker-based concurrency became a clear next step instead of a forced fix
- future subscription-driven processing can reuse the same per-email pipeline

### Angle
- a lot of backend design gets easier once the unit of work is correct

---

## 4. Evals matter more once a system becomes agentic [POSTED]

### Hook
- once a system starts taking actions, mistakes become more expensive
- that is where evals stop being a nice-to-have and become trust infrastructure

### Core idea
- before an agent starts updating records at scale, I want a manually annotated dataset that shows whether the system is making the right judgments across varied inputs
- humans still make mistakes, but evals reduce avoidable mistakes before the system is trusted with larger-scale action

### Points
- agentic systems do not just answer, they act
- wrong classification can turn into wrong record updates
- a few successful live runs are not enough to justify trust at scale
- annotated datasets let you compare expected vs actual outcomes across diverse examples
- evals help expose drift, edge cases, and overconfidence before those issues spread into production actions

### What the evals should cover
- relevance classification
- status classification
- tricky borderline examples
- diverse real-world input shapes
- mismatch review over time

### Angle
- the goal is not perfection
- the goal is reducing mistakes enough that the action layer becomes trustworthy
- evals are one of the clearest ways to earn trust in an agentic system

---

## 5. Prototype first, then add tests before expanding the system

### Hook
- this is a bit opinionated, but for small prototypes I usually do not start with full automated tests

### Core idea
- I first build the working prototype
- then I run it enough times to understand whether the solution is stable
- then, before adding more features, I add automated tests to reduce breaking changes

### Points
- TDD is good, but not every mini build needs the full ceremony up front
- small prototypes often exist to discover the real problem first
- once the prototype works, it usually reveals the next engineering problem anyway
- that is the moment where tests become much more valuable
- tests then protect a system whose behavior is already understood

### Angle
- build the right thing first
- then lock it down before expanding it
