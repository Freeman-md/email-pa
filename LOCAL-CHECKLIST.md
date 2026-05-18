# Job Email Status Updater - Local Checklist

Purpose: track what remains before the Render cron job can fully process mailbox updates into application status changes.

Current state:

- Render cron runs daily.
- Airtable `App Settings` stores `last_successful_run_at`.
- Microsoft Graph device-code login works locally.
- App fetches recent messages locally and logs selected fields.
- Graph token persistence for unattended Render runs is working locally and on Render.

## Checklist

- [x] Persist Microsoft auth for unattended cron runs.
  - Store and reload the MSAL token cache outside the local process, probably in Airtable `App Settings`.
  - Render must refresh tokens without asking for device-code login every run.
  - Confirm manual Render run can fetch emails from Graph with no interactive prompt.

- [x] Replace latest-5 fetch with safe windowed email retrieval.
  - Use `last_successful_run_at` minus a small overlap buffer.
  - Query Microsoft Graph by `receivedDateTime`.
  - Page through results when more emails exist than the first page.
  - Only update `last_successful_run_at` after the run completes successfully.

- [ ] Add processed-email dedupe.
  - Store Microsoft Graph message IDs after processing.
  - Skip messages already processed in an earlier run or overlap window.
  - Keep enough metadata to debug what happened to each email.

- [ ] Normalize email content for analysis.
  - Convert Graph message fields into one internal email object.
  - Keep sender, subject, received time, body/body preview, web link, and message ID.
  - Strip or limit noisy HTML before sending content into classification.

- [ ] Implement relevance classification.
  - Decide whether an email is related to job applications.
  - Return a structured result with `isRelevant`, evidence, and confidence.
  - Skip irrelevant emails but still log that they were reviewed.

- [ ] Implement application-status classification.
  - Classify relevant emails into statuses such as rejection, interview invite, assessment, generic update, or unknown.
  - Keep rules/prompts clear enough to tune manually.
  - Route unknown/low-confidence emails to summary only, not automatic record updates.

- [ ] Map classified emails to Airtable job records.
  - Search existing job/application records by company, role, sender, links, and known identifiers.
  - Update the matching record when confidence is good.
  - Create a new record only when enough information exists and the behavior is intentional.

- [ ] Add email processing logs.
  - Store one log entry per processed email.
  - Include message ID, classification, action taken, linked Airtable record, errors, and run ID.
  - Make logs useful for reviewing bad classifications later.

- [ ] Add daily summary output.
  - Summarize processed count, irrelevant count, status changes, uncertain emails, and errors.
  - Send to Telegram after the full run completes.
  - Keep the summary readable from a phone.

- [ ] Harden failure behavior.
  - Do not advance `last_successful_run_at` after a failed run.
  - Log Graph/Airtable/API failures clearly.
  - Handle partial email failures without losing the rest of the run where possible.

- [ ] Prepare production Render configuration.
  - Ensure all required env vars exist in Render.
  - Decide whether Render dashboard or `render.yaml` is the source of truth.
  - Confirm scheduled run works after Graph token persistence is added.

- [ ] Notify user when Microsoft re-login is required.
  - Detect token-cache expiry, revoked consent, or silent-auth failure that cannot be recovered automatically.
  - Send a clear notification explaining that manual Microsoft device-code login is required.
  - Do not continue processing emails when Graph auth is invalid.

- [ ] Add a final production smoke test.
  - Run locally against a small mailbox window.
  - Run manually in Render.
  - Confirm Airtable state, email logs, and summary output are correct.
  - Confirm the next scheduled run does not duplicate already-processed emails.

- [ ] Create public project documentation.
  - Write a concise `README.md` that explains what the project does, who it is for, and the current production flow.
  - Add a setup section covering Microsoft app registration, Airtable base/table setup, env vars, local run, build, and Render cron deployment.
  - Add an architecture section showing the cron flow: Render -> Microsoft Graph -> classifier -> Airtable -> Telegram summary.
  - Add a decisions section explaining why this uses Render Cron first, Airtable for state, Microsoft Graph instead of Outlook API, and why BullMQ is not used yet.
  - Add a limitations section covering token persistence, personal-account consent, rate limits, classification confidence, and manual review.
  - Add a small case-study section with the problem, constraints, implementation path, tradeoffs, and what was learned.
  - Add example sanitized logs/output so readers can understand the system without seeing private emails or tokens.
  - Add a security/privacy section explaining what data is read, what is stored, and what should never be committed.
  - Add a roadmap section that mirrors the remaining checklist at a public-friendly level.
