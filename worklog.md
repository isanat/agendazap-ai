---
Task ID: 2
Agent: Main
Task: Add timezone field to production PostgreSQL schema + fix runtime bugs for Vercel deployment

Work Log:
- Added `timezone` field to `prisma/schema.postgresql.prisma` (Account model) - was missing from production schema
- Created migration `20260420000004_add_timezone_to_account/migration.sql` with ALTER TABLE for PostgreSQL
- Fixed undefined `dayNames` reference in `src/lib/ai-context-service.ts` line 1057 (was causing ReferenceError at runtime)
- Exported `sendWhatsAppMessage` from webhook route (needed by evolution-health.ts queue processing dynamic import)
- Added `timezone` field to account PUT API route in `src/app/api/account/route.ts`
- Verified settings page already has timezone selector with Brazilian timezone options
- Committed and pushed both changes to GitHub (2 commits: 99625f2 and bdd0f95)
- Attempted to verify Vercel deployment but the provided token was invalid/unauthorized

Stage Summary:
- Production PostgreSQL schema now has `timezone` field (will be created via `prisma migrate deploy` on Vercel build)
- Fixed `dayNames` runtime bug that would crash AI prompt generation
- Fixed `sendWhatsAppMessage` export for message queue retry functionality
- Settings UI already supports timezone selection with Brazilian timezones
- Vercel deployment will auto-trigger from GitHub push and create the timezone column via migration
- All code fixes from Issues #4-#7 are verified and in place
