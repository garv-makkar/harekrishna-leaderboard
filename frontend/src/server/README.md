# Server Helpers

This folder contains server-only code used by Next.js API routes.

Use it for logic that must not run in browser components, such as service-role Supabase operations, private environment variables, external data fetching, and third-party HTML parsing.

Client components should call API routes instead of importing files from this folder directly.
