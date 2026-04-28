# LaunchIn 48

A full-stack SaaS platform for rapid website and WhatsApp chatbot delivery. Clients order a service, track their project, and manage payments — all in one place. Admins manage projects, users, payments, and maintenance from a dedicated dashboard.

Live: [launchin48.app](https://launchin48.app)

---

## Features

**Client-facing**
- Browse and purchase service packages (website, chatbot, bundle, growth)
- Razorpay-powered checkout with partial payment support
- Real-time project status tracking
- Payment history and remaining balance view
- Post-launch maintenance charge tracking
- Direct messaging with the team

**Admin**
- Full user management with per-user financial summaries
- Project lifecycle management (pending → in progress → review → complete)
- Payment oversight across all projects
- Maintenance charge creation and tracking
- Analytics dashboard with charts
- Broadcast and project-specific messaging

**Platform**
- Supabase Auth (email/password, JWT sessions)
- Role-based access control (admin / customer)
- Edge middleware protecting all dashboard and admin routes
- Email notifications via Resend
- SMS and WhatsApp notifications via Twilio
- Scheduled payment cleanup via cron

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + Radix UI (shadcn/ui) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Razorpay |
| Email | Resend |
| SMS / WhatsApp | Twilio |
| Deployment | Vercel / Docker |
| Analytics | Vercel Analytics |

---

## Architecture

```
Browser
  └── Next.js App Router (SSR + Client Components)
        ├── Middleware (edge) — session refresh, route protection
        ├── /app/dashboard — authenticated client area
        ├── /app/admin — admin-only area (role check in middleware + layout)
        └── /app/api — API routes (server-side, service role Supabase client)
              ├── /admin/* — requireAdmin() guard on every route
              ├── /projects, /payments, /maintenance — business logic
              ├── /create-order, /verify-payment — Razorpay integration
              ├── /send-email, /send-sms-whatsapp — notifications
              └── /cron/cleanup-payments — scheduled job (CRON_SECRET protected)

External Services
  ├── Supabase — database, auth, row-level security
  ├── Razorpay — payment orders and verification
  ├── Resend — transactional email
  └── Twilio — SMS and WhatsApp
```

---

## Local Development

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Razorpay](https://razorpay.com) account (test keys are fine)
- Optional: Resend and Twilio accounts for notifications

### Setup

```bash
# 1. Clone
git clone https://github.com/your-username/launchin-48.git
cd launchin-48

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in your credentials in .env

# 4. Run the database migrations
# Apply scripts/001_create_database_schema.sql through
# scripts/006_add_email_notifications_table.sql in your Supabase SQL editor

# 5. Start the dev server
npm run dev
```

App runs at `http://localhost:3000`.

---

## Docker Setup

Build and run with a single command:

```bash
# Copy and fill in your env file
cp .env.example .env

# Build and start
docker compose up --build
```

App runs at `http://localhost:3000`.

To run in the background:

```bash
docker compose up --build -d
```

To stop:

```bash
docker compose down
```

### How the Docker build works

The Dockerfile uses a three-stage build:

1. `deps` — installs npm dependencies with a frozen lockfile
2. `builder` — runs `next build` with public env vars injected as build args
3. `runner` — minimal Alpine image with only the Next.js standalone output

Server-side secrets (Supabase service role key, Razorpay secret, Twilio, Resend) are passed as runtime environment variables and are never baked into the image.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | Razorpay publishable key |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay secret key (server-only) |
| `RESEND_API_KEY` | Yes | Resend API key for email |
| `RESEND_FROM_EMAIL` | Yes | Sender email address |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth token (server-only) |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio SMS number |
| `TWILIO_WHATSAPP_NUMBER` | Optional | Twilio WhatsApp number |
| `CRON_SECRET` | Yes | Secret for protecting the cron endpoint |

---

## Database Setup

Run the numbered SQL scripts in `scripts/` against your Supabase project in order:

```
scripts/001_create_database_schema.sql   — core tables
scripts/002_seed_initial_data.sql        — initial data
scripts/003_add_project_comments.sql     — comments support
scripts/004_fix_rls_policies.sql         — row-level security
scripts/005_add_missing_services.sql     — service catalog
scripts/006_add_email_notifications_table.sql — email log table
```

Run these in the Supabase SQL editor or via the Supabase CLI.

---

## API Endpoints

All admin endpoints require a valid session with `role = 'admin'`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/projects` | List / create projects |
| GET/PATCH | `/api/projects/[id]` | Get / update project |
| POST | `/api/create-order` | Create Razorpay order |
| POST | `/api/verify-payment` | Verify Razorpay payment |
| POST | `/api/create-maintenance-order` | Create maintenance payment order |
| POST | `/api/verify-maintenance-payment` | Verify maintenance payment |
| GET/POST | `/api/messages` | Messaging |
| GET/POST | `/api/direct-messages` | Direct messages |
| GET | `/api/maintenance` | Maintenance records |
| GET | `/api/maintenance-charges` | Maintenance charges |
| POST | `/api/send-email` | Send email notification |
| POST | `/api/send-sms-whatsapp` | Send SMS/WhatsApp |
| GET | `/api/admin/users` | All users with financials |
| GET | `/api/admin/projects` | All projects |
| GET | `/api/admin/payments` | All payments |
| GET | `/api/admin/stats` | Dashboard stats |
| POST | `/api/admin/create-user` | Create user manually |
| GET | `/api/cron/cleanup-payments` | Cleanup stale payments (cron) |

---

## Folder Structure

```
.
├── app/
│   ├── (public pages)       — home, about, services, contact, legal
│   ├── auth/                — login, signup, password reset
│   ├── dashboard/           — client portal
│   ├── admin/               — admin portal
│   ├── api/                 — API routes
│   └── create-project/      — project request form
├── components/
│   ├── ui/                  — shadcn/ui base components
│   ├── admin/               — admin-specific components
│   └── user/                — client-specific components
├── lib/
│   ├── supabase/            — client, server, service, middleware helpers
│   ├── auth/                — requireAdmin helper
│   └── *.ts                 — business logic (maintenance, payments)
├── scripts/
│   └── 00*_*.sql            — ordered database migrations
├── public/                  — static assets
├── database/                — additional schema files
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── next.config.mjs
```

---

## Production Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import the repo in Vercel
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Deploy

### Docker / VPS

```bash
docker compose up --build -d
```

Point your reverse proxy (nginx, Caddy, etc.) to port 3000. Add TLS termination at the proxy level.

---

## Screenshots

> Add screenshots of the home page, client dashboard, and admin panel here.

---

## Future Improvements

- CI/CD pipeline with GitHub Actions (lint, build, deploy)
- Rate limiting on API routes (e.g., Upstash Redis)
- Automated database migrations via Supabase CLI in CI
- End-to-end tests with Playwright
- Monitoring and error tracking (Sentry)
- Google OAuth re-enablement
- Invoice PDF generation for payments

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE)
