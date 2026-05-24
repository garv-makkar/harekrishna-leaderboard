# Supabase Setup

## 1. Create Project

Create a new Supabase project. Keep the project password somewhere safe.

## 2. Run Database Schema

Open Supabase Dashboard -> SQL Editor -> New query.

Paste the contents of `backend/supabase/schema.sql`, then run it.

This creates:

- profiles
- chant_totals
- groups
- group_members
- friend_requests
- row-level security policies
- signup trigger for profile creation
- username/phone login lookup functions

## 3. Get API Keys

Open Project Settings -> API.

Copy:

- Project URL
- anon public key
- service_role key

Use the project URL that looks like:

```text
https://your-project-ref.supabase.co
```

Do not use the REST URL that ends with `/rest/v1/`.

## 4. Create `frontend/.env.local`

Create this file in the `frontend` folder:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`, never paste it into browser code, and do not commit `.env.local`.

Restart the dev server after saving `frontend/.env.local`.

## 5. Auth Settings

For easiest local testing, you may temporarily turn off email confirmation in Authentication -> Providers -> Email.

For production, turn email confirmation back on:

1. Open Authentication -> Providers.
2. Open Email.
3. Enable Confirm email.
4. Save.

Then open Authentication -> URL Configuration and add your local and production URLs:

```text
http://localhost:3000
https://your-production-domain.com
```

## 6. Password Reset

The app uses Supabase password recovery links.

In Authentication -> Email Templates -> Reset Password, keep the action link enabled. The app listens for the recovery session and shows a "New password" form after the user opens the email link.

## 7. Email OTP

The app includes an Email OTP tab.

If you want users to type a numeric code, open Authentication -> Email Templates -> Magic Link and include the token in the email body:

```text
Your login code is {{ .Token }}
```

Keep the confirmation link too if you also want magic-link login.

## 8. Custom SMTP

Before real users, configure custom SMTP:

1. Open Project Settings -> Authentication.
2. Open SMTP Settings.
3. Enable custom SMTP.
4. Add sender name, sender email, host, port, username, and password from your email provider.

Supabase's built-in email sender is fine for testing, but production apps should use custom SMTP.

## Auth Identity Rules

The app uses:

- Email as the primary Supabase Auth identity.
- Username as a unique public handle.
- Phone as an optional unique profile identifier, stored in international format such as `+919876543210`.

Signup checks username, email, and optional phone before creating the auth user. The database also enforces unique username/email, and unique phone only when phone is present.

## 9. Run Locally

```powershell
npm run dev -- --port 3000
```

Open:

```text
http://localhost:3000
```

Once Supabase env values are present, the app uses Supabase instead of browser local storage.

## Project Structure

```text
frontend/
  Next.js app, UI, API routes, frontend environment variables

backend/supabase/
  Database schema, migrations, policies, SQL functions
```

You can still run common commands from the project root. The root `package.json` delegates them into `frontend/`.
