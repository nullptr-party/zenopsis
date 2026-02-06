# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run start              # Run the bot
bun run dev                # Run with hot reload (--watch)
bun test                   # Run all tests
bun test --watch           # Watch mode
bun test tests/unit/llm    # Run tests in a specific directory
bun test --grep "pattern"  # Run tests matching pattern
bun run type-check         # TypeScript check (tsc --noEmit)
bun run db:generate        # Generate Drizzle migrations from schema changes
bun run db:push            # Push schema directly to DB
bun run db:studio          # Open Drizzle Studio (visual DB browser)
```

## Architecture

Zenopsis is a Telegram bot (grammY + Bun) that captures group chat messages and generates AI-powered summaries via OpenAI.

**Core flow:** Bot starts → DB migrations run → middleware stack processes every message → `/summary` command triggers LLM summarization.

- `src/bot/index.ts` — Bot init, command handlers (`/start`, `/help`, `/summary`), middleware registration
- `src/bot/middleware/message-logger.ts` — Captures ALL message types (text, photo, sticker, etc.), extracts content, saves to DB, fires off attachment downloads
- `src/bot/middleware/rate-limiter.ts` — Rate limits bot commands only (not regular messages)
- `src/db/schema.ts` — Drizzle ORM schema (SQLite): messages, messageAttachments, groupConfigs, summaries, messageReferences, summaryFeedback, userEngagement
- `src/db/repositories/` — Data access layer (MessagesRepository, GroupConfigsRepository, etc.)
- `src/llm/client.ts` — OpenAI client, Zod schema for summaries, `withErrorHandling` retry wrapper
- `src/llm/summarizer.ts` — Message batching, topic detection, summary generation
- `src/llm/scheduler.ts` — Summary formatting, manual trigger via `triggerManualSummary()`
- `src/services/attachment-downloader.ts` — Fire-and-forget file downloads via Bot API

## Imports

Path alias `@/*` maps to `src/*`. Always use it instead of relative paths:

```ts
import { db } from "@/db";
import { messages } from "@/db/schema";
import { MessagesRepository } from "@/db/repositories/messages";
```

Configured in `tsconfig.json` (`baseUrl: "src"`, `paths: { "@/*": ["*"] }`). Bun resolves these automatically.

## Database

- SQLite via Drizzle ORM. DB path from `DATABASE_URL` env var.
- Schema: `src/db/schema.ts`. Migrations: `src/db/migrations/`.
- After changing schema: `bun run db:generate` to create migration, then restart (migrations run on startup via `src/db/init.ts`).

## Testing

- Framework: `bun:test`. Test preload in `bunfig.toml` runs migrations via `tests/setup.ts`.
- Use `cleanDatabase()` in `beforeEach` for isolation (from `tests/helpers/test-utils.ts`).
- Factories: `createTestMessage()`, `createTestConfig()`, `createTestAttachment()` — accept override objects.
- Tests use `@/` imports for src code.

## Known Pre-existing Type Errors

These exist in the codebase and should not be "fixed" incidentally:
- `src/db/repositories/engagement.ts` — type issues with userId/timestamps
- `src/db/repositories/group-configs.ts` — implicit any on index signature
- `src/llm/clustering.ts` — instructor API callable issue

## Project Rules

- Update `ROADMAP.md` when making significant changes
- Auto-summarization scheduler is removed from startup — only manual `/summary` is active
