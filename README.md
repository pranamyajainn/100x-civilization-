# 100x Civilization

> A private AI-powered opportunity network for 100xEngineers alumni. Invite-only. Live now.

## What It Is

100x Civilization is a closed professional network where 100xEngineers alumni post opportunities — hiring, co-founder searches, paid projects, demo feedback, and warm intros — and receive AI-powered match notifications based on their skill profile. Every member is manually approved before gaining access. The platform is built to preserve the high-trust relationships that form during cohorts and activate them across cohort lines.

## Live Product

[https://100xcivilization.live](https://100xcivilization.live)

## Tech Stack

- **Next.js 15.5.15** — App Router, server components, API routes (Node.js runtime)
- **Firebase** — Firestore (database), Authentication (Google OAuth), Storage (certificate uploads)
- **OpenAI** — `text-embedding-3-small` for semantic skill matching (1536-dim vectors)
- **Resend** — Transactional email (pending approval, welcome, match notifications, abandoned onboarding recovery)
- **Vercel** — Hosting, serverless functions, daily cron job

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/pranamyajainn/100x-civilization-.git
cd 100x-civilization-

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in all required values (see Environment Variables table below)

# 4. Deploy Firestore rules (requires Firebase CLI)
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules

# 5. Start the development server
npm run dev
```

The app runs at `http://localhost:3000`.

## Environment Variables

| Variable | Description |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full Firebase Admin SDK service account JSON, stringified. Download from Firebase Console → Project Settings → Service Accounts. |
| `OPENAI_API_KEY` | OpenAI API key for generating embeddings via `text-embedding-3-small`. |
| `RESEND_API_KEY` | Resend API key for sending transactional email. |
| `RESEND_FROM_EMAIL` | Verified sender address, e.g. `team@100xcivilization.live`. |
| `APP_URL` | Full production URL, e.g. `https://100xcivilization.live`. Used in email links. |
| `CRON_SECRET` | Shared secret for authorizing the daily cron endpoint. Set the same value in Vercel project settings. |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Comma-separated admin email addresses. Controls visibility of the admin UI link on the feed page. |

The Firebase client config (`firebase-applet-config.json`) is bundled in the repository and contains only public project identifiers — no secrets.

## Architecture

See [CTO_REPORT.md](./CTO_REPORT.md) for the full technical architecture, including:
- Firestore collection schemas
- Authentication and authorization flow
- AI matching system design
- Complete API route reference
- Security posture and known technical debt

## Project Reports

- [CTO_REPORT.md](./CTO_REPORT.md) — Full technical architecture for engineers and CTOs
- [CEO_REPORT.md](./CEO_REPORT.md) — Product and business overview for founders and investors

## Team

- **Pranamya Jain** — AI Solutions Architect
- **Zara Kennedy** — Communications Strategist
- **Nakshatra Sain** — Growth & Marketing
- **Arunkumar S.V** — Applied AI Engineer

## License

Built as a 100xEngineers cohort capstone project.
