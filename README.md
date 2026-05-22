# Job Email Status Updater

A cron-style backend service that reads emails from Microsoft Outlook via Microsoft Graph, classifies job-application updates with AI, stores processing state in Airtable, and sends a readable run summary to Telegram.

This repository is the working codebase. A full case study is still to come. For now, this README is meant to make the project understandable to anyone landing here cold.

## What it does

The service is built for a practical problem: job-related email gets noisy fast, and important updates such as rejections, interview invites, assessments, and generic application updates are easy to miss.

Current flow:

1. fetch recent emails from Microsoft Graph using a safe time window
2. dedupe against already-processed messages
3. normalize the email content into one internal shape
4. classify whether each email is relevant to an active job application
5. classify relevant emails into status buckets
6. persist processing state in Airtable
7. send a concise Telegram summary after the run completes

## Current status

Implemented:

- unattended Microsoft Graph auth persistence
- windowed message retrieval with overlap
- processed-email dedupe
- email normalization
- relevance classification
- application-status classification
- Telegram run summaries

Still in progress:

- mapping classified emails back to Airtable job/application records
- hardening partial-failure behavior
- production smoke testing
- fuller public documentation and case study

## Why this exists

This project is intentionally small and practical:

- **Microsoft Graph** is the source of truth for mailbox data
- **Airtable** is used as lightweight state storage and processing ledger
- **Vercel AI SDK** is used for structured classification
- **Telegram** is the notification channel because the output needs to be readable from a phone

The goal is not to build a giant workflow engine. The goal is to reliably convert noisy job emails into actionable status signals.

## Architecture

The codebase is organized around three concerns:

```text
src/
  config/                 # service-specific config readers
  email-processing/       # business workflow, classification, mapping, run orchestration
  integrations/          # Airtable, Microsoft Graph, Telegram
  shared/                # small generic utilities
```

Current high-level runtime flow:

```text
Microsoft Graph -> normalize -> relevance classify -> status classify
                -> Airtable state/logging -> Telegram summary
```

## Key behavior

### Safe windowed retrieval

The service does not fetch an arbitrary “latest N” emails list.

It keeps a `last_successful_run_at` value and uses that to build a retrieval window with overlap. That reduces the chance of missing emails around run boundaries.

### Dedupe and processing ledger

Processed Microsoft Graph message IDs are stored so overlap windows do not cause duplicate work.

The processed-emails records also act as a progress ledger for later stages, not just as a simple dedupe table.

### AI classification

There are currently two classification stages:

- **relevance classification**: is this email actually part of a real job application pipeline?
- **status classification**: if relevant, is it a rejection, interview invitation, assessment, or generic update?

### Rate-limit handling

The service hit rate limits when interacting with Vercel AI Gateway free-tier credits. To keep runs stable, the current implementation uses:

- sequential per-email classification
- fixed delays between classifications
- periodic cooldowns
- retry with cooldown on actual rate-limit failures

This was chosen because proactive pacing was more effective here than bursty batching.

## Setup

### Requirements

- Node.js 20+
- a Microsoft app registration with Graph Mail read access
- an Airtable base
- a Telegram bot and chat ID
- AI provider access via the configured Vercel AI SDK setup

### Environment variables

The project currently expects configuration for:

- Airtable
  - `AIRTABLE_TOKEN`
  - `AIRTABLE_BASE_ID`
  - `AIRTABLE_API_URL` (optional)

- Microsoft Graph
  - `MICROSOFT_CLIENT_ID`
  - `MICROSOFT_TENANT_ID` (optional)
  - `MICROSOFT_GRAPH_SCOPES` (optional)
  - `MICROSOFT_TOKEN_CACHE_KEY` (optional)

- Email processing
  - `LOOKBACK_HOURS` (optional)
  - `LAST_SUCCESSFUL_RUN_KEY` (optional)

- AI
  - `AI_MODEL` (optional)
  - `AI_CLASSIFICATION_MODEL` (optional)
  - `AI_CLASSIFICATION_MAX_OUTPUT_TOKENS` (optional)
  - `AI_CLASSIFICATION_CONCURRENCY` (optional)
  - `AI_RETRY_MAX_RETRIES` (optional)
  - `AI_RETRY_BASE_DELAY_MS` (optional)

- Telegram
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`

### Install and run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Run compiled output:

```bash
npm run start
```

## Deployment

The project is intended to run as a scheduled backend job rather than a long-lived web server.

Current deployment target:

- **Render Cron Job**

The repository already includes a `render.yaml` blueprint with the cron service definition, build command, and start command.

Current Render shape:

- runtime: Node
- build command: `npm ci && npm run build`
- start command: `npm start`
- scheduled execution via Render Cron

### Render setup notes

For production deployment, Render still needs the full environment-variable set configured in the dashboard or synced from the blueprint strategy you choose.

At minimum, ensure Render has:

- Airtable credentials
- Microsoft Graph credentials
- AI model/provider configuration
- Telegram bot token and chat ID
- email-processing window configuration

Operationally, this service is best treated as:

- a scheduled worker
- stateful through Airtable
- externally dependent on Microsoft Graph, AI classification, and Telegram delivery

The remaining production work is mainly around:

- environment-variable completeness
- production auth durability
- failure handling
- final smoke testing of the full scheduled path

## Airtable usage

Today Airtable is used for lightweight application state, not as the final canonical job-application store.

Current responsibilities include:

- app settings such as the last successful run timestamp
- processed-email records used for dedupe and stage tracking

The next step is mapping classified messages to actual job/application records intentionally and safely.

## Telegram summary output

After a run completes, the service sends a phone-friendly Telegram summary containing:

- processed counts
- skipped counts
- relevance results
- status results

The Telegram message is meant to be a concise operational summary, not a raw log dump.

## Security and privacy

This service reads mailbox content and stores derived processing state, so the operational surface matters.

Important rules for running it safely:

- never commit secrets or local env files
- keep Microsoft Graph credentials and token-cache storage private
- keep Airtable API credentials private
- treat Telegram bot credentials as secrets
- sanitize examples and logs before sharing publicly

This repository is public-facing, but the actual mailbox data, tokens, and private operational state should never be.

## Limitations

- job/application record mapping is not complete yet
- failure handling is still being hardened
- classification quality depends on mailbox quality and prompt quality
- AI rate limits are a real constraint, especially on cheaper/free paths
- Microsoft auth still needs proper operational care in production

## Roadmap

Near-term work:

- map classified emails to Airtable job/application records
- improve partial-failure handling and run recovery
- tighten production deployment and smoke testing
- expand public documentation
- publish a fuller technical case study

## License

This project is currently licensed under **ISC**, matching the package metadata in `package.json`.

## Notes

This is a real working project, not a polished template repo. Some edges are still being tightened, but the core classification pipeline is already in place and functional.
