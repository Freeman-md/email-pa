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

## 2. Rollback matters before retry

### Hook
- before adding retries, I had to make sure one failed email could clean up after itself

### Points
- if processing creates a DB record and later fails, that record can become misleading
- if processing marks an email as read and then fails, that side effect must be undone
- retrying on top of dirty state is weak engineering
- rollback first, retry second

### What rollback covered
- delete the Airtable record if that attempt created it
- mark the Outlook email as unread if that attempt marked it as read

### Angle
- retries are not resilience on their own
- recovery paths matter just as much

---

## 3. The real job was choosing the right unit of work

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
