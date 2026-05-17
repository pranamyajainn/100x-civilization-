# CTO Report — 100x Civilization
**Prepared for:** Senior Engineer / CTO Review  
**Date:** May 2026  
**Status:** Production (capstone build)

---

## 1. System Overview

100x Civilization is a private, admin-gated opportunity network for 100xEngineers alumni (cohorts 1–7+). Members sign in with Google, submit an onboarding profile with a minimum of 5 skill tags from a controlled taxonomy, and wait for manual admin approval before accessing the feed. Once approved, they can post opportunities across five types (hiring, co-founder search, paid project, pressure test, warm intro) and receive AI-powered match notifications when new posts match their skill embedding. The system is built around a semantic matching layer: OpenAI embeddings are generated for both user profiles and posts, and cosine similarity ranks the most relevant alumni to notify. The core value loop is: post → embed → match → notify → connect → log.

**Tech stack with exact versions:**

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^15.5.15 |
| Runtime | Node.js | Vercel managed |
| Language | TypeScript | 5.9.3 |
| Auth | Firebase Authentication (Google OAuth) | firebase ^12.12.1 |
| Database | Firestore (Firebase) | firebase-admin ^13.9.0 |
| Storage | Firebase Storage | firebase ^12.12.1 |
| AI / Embeddings | OpenAI text-embedding-3-small | REST API |
| Email | Resend | REST API (no SDK) |
| Hosting | Vercel (Hobby plan) | — |
| Animation | Motion (Framer Motion successor) | ^12.23.24 |
| CSS | Tailwind CSS | 4.1.11 |

**Architecture overview:**

```
Browser
  │
  ├─ Next.js App Router (Vercel Edge / Node.js)
  │    ├─ /app/*          → RSC + client pages (feed, admin, onboarding)
  │    ├─ /api/*          → Route handlers (Node.js runtime)
  │    └─ middleware.ts   → Cookie-based route gating (reads Firestore)
  │
  ├─ Firebase Authentication → Google OAuth tokens
  ├─ Firestore              → All structured data
  ├─ Firebase Storage       → Certificate uploads
  │
  ├─ OpenAI API             → text-embedding-3-small (1536 dims)
  └─ Resend API             → Transactional email
```

---

## 2. Directory Structure

```
/
├── app/                        Next.js App Router root
│   ├── layout.tsx              Root layout (HTML shell, fonts, error boundary)
│   ├── page.tsx                Landing page (marketing, waitlist CTA)
│   ├── error.tsx               Root error boundary
│   ├── invite/page.tsx         Public auth page (Google sign-in)
│   └── app/                   Authenticated app shell (gated by middleware)
│       ├── layout.tsx          App layout wrapper
│       ├── feed/page.tsx       Main opportunity feed (AI-ranked, member list)
│       ├── onboarding/page.tsx Profile setup form (skill tags, LinkedIn, etc.)
│       ├── pending/page.tsx    Waiting room after onboarding submission
│       ├── rejected/page.tsx   Rejection state screen
│       ├── profile/page.tsx    Member profile / settings / unsubscribe
│       ├── posts/[id]/page.tsx Single post detail + connect action
│       ├── admin/page.tsx      Admin approval queue + platform metrics
│       └── error.tsx           App-scoped error boundary
│
├── app/api/                    API route handlers (all Node.js runtime)
│   ├── admin/approve/          POST — approve or reject a pending user
│   ├── auth/partial-signup/    POST — record incomplete signup for cron recovery
│   ├── connect/                POST — log a connection event
│   ├── cron/onboarding-reminder/ GET — daily cron for abandoned onboarding emails
│   ├── embed/                  POST — generate an OpenAI embedding
│   ├── notify/                 POST — rank matches and send notifications
│   ├── onboarding/submit/      POST — submit onboarding form
│   └── unsubscribe/            POST — disable notifications for a user
│
├── components/                 Shared React components
│   ├── activity-ticker.tsx     Scrolling live activity bar on feed
│   ├── post-card.tsx           Opportunity card (feed grid)
│   ├── post-form.tsx           New opportunity form modal (all 5 types)
│   ├── skill-tag-input.tsx     Taxonomy-constrained tag autocomplete input
│   ├── waitlist-form.tsx       Landing page waitlist capture
│   └── ...                     Marketing components (hero, problem, solution, etc.)
│
├── lib/                        Shared server + client utilities
│   ├── firebase.ts             Client-side Firebase init (auth, db, storage)
│   ├── firebase-admin.ts       Server-side Admin SDK init (uses service account)
│   ├── auth-middleware.ts      verifyIdToken() + isAdminUser() for API routes
│   ├── matching.ts             cosineSimilarity(), rankMatches(), scoreFeedRelevance()
│   ├── embeddings.ts           generateEmbedding() — OpenAI REST call
│   ├── email.ts                All email sending functions via Resend REST API
│   ├── taxonomy.ts             SKILL_TAXONOMY constant + isValidSkill(), skillLabel()
│   ├── rate-limit.ts           In-memory rate limiter (Map-based, per-key/window)
│   ├── client-session.ts       Cookie helpers (fb_session, fb_uid)
│   ├── linkedin.ts             LinkedIn URL normalization + context extraction
│   └── store.ts                Zustand store (client-side global state)
│
├── middleware.ts               Next.js middleware — route gating logic
├── firestore.rules             Firestore security rules
├── vercel.json                 Cron job configuration
├── next.config.ts              CSP headers, image domains, standalone output
├── 100x_civilization_prd.md    Product requirements document
└── scripts/                   Data seeding and cleanup scripts (dev only)
```

---

## 3. Authentication & Authorization

### Google OAuth (client flow)
1. User clicks "Sign in with Google" on `/invite`.
2. Firebase client SDK (`firebase/auth`) opens the Google OAuth popup/redirect.
3. On success, Firebase issues a short-lived ID token (1-hour TTL) and a refresh token.
4. The client stores session cookies (`fb_session=1`, `fb_uid=<uid>`) via `lib/client-session.ts` to enable server-side routing decisions in middleware.
5. For every API call, the client fetches a fresh ID token (`auth.currentUser.getIdToken()`) and attaches it as `Authorization: Bearer <token>`.

### Firebase Admin SDK token verification (server-side)
Every API route begins with:
```ts
const authUser = await verifyIdToken(request);
if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```
`verifyIdToken()` (in `lib/auth-middleware.ts`) extracts the Bearer token from the Authorization header and calls `adminAuth.verifyIdToken(token)`, which validates the signature against Google's public keys and checks expiry. The function returns `{ uid, email }` or `null`.

### Route gating in middleware.ts
`middleware.ts` runs on every request matching `/((?!_next/static|_next/image|favicon.ico).*)`. The logic:
- `/` and public prefixes (`/_next/`, `/api/`, `/invite`, `/fonts/`, `/favicon`, `/og-image`) pass through immediately.
- `/app/*` routes require both `fb_session=1` and `fb_uid` cookies. Missing cookies redirect to `/invite`.
- With valid cookies, middleware reads Firestore (`users` + `pending_users`) to determine state: approved, pending, rejected, or fresh.
- Routing table:
  - `approved` → `/app/feed`
  - `pending` → `/app/pending`
  - `rejected` → `/app/rejected`
  - no records → `/app/onboarding`
- `/app/admin` is additionally gated by `isAdmin: true` on the Firestore user document.

### How isAdmin() works
**Firestore rules:** `isAdmin()` checks `request.auth.token.email` against a hardcoded allowlist (`['pranamyajeet@gmail.com']`). This is evaluated client-to-Firestore for direct collection reads.

**API routes:** `isAdminUser(uid)` reads `users/{uid}.isAdmin` from Firestore via the Admin SDK. The `isAdmin` field is set manually on the user document — it is never exposed as a writable field through client-facing rules (`protectedUserFields()` blocks client writes to it).

### Known limitation: cookie-based routing is UX only
The middleware comment explicitly documents this:
> Cookie-based routing is for UX only. A user who spoofs `fb_session` will see empty pages since all data fetches require valid auth tokens.

Spoofed cookies reach the page shell but every data-fetching API call will fail with `401 Unauthorized` because they cannot produce a valid Firebase ID token.

---

## 4. Data Layer

### Firestore collections

**`users/{uid}`** — Approved members
| Field | Type | Notes |
|---|---|---|
| uid | string | Firebase Auth UID |
| fullName | string | 2-word minimum |
| email | string | From Google OAuth |
| phone | string | Digits only, 10–15 chars |
| cohort | string | "1"–"7" |
| currentRole | string | Free text, max 100 chars |
| linkedinUrl | string | Normalized, no protocol prefix |
| skillTags | string[] | From SKILL_TAXONOMY, min 5, max 20 |
| embedding | number[] | 1536-dim OpenAI vector |
| status | string | "approved" \| "rejected" |
| onboardingComplete | boolean | Set to true on approval |
| celebrationShown | boolean | Controls first-login interstitial |
| hiddenFromFeed | boolean | Consent withdrawal flag |
| notificationsEnabled | boolean | Match email opt-in |
| contactVisible | boolean | Whether contact info is revealed |
| isAdmin | boolean | Protected — never client-writable |
| certificateUrl | string | Firebase Storage URL |
| approvedAt | Timestamp | Server timestamp set on approval |
| updatedAt | Timestamp | Server timestamp |

**`pending_users/{uid}`** — Awaiting admin review
| Field | Type | Notes |
|---|---|---|
| uid | string | Firebase Auth UID |
| fullName, email, phone, cohort, linkedinUrl, skillTags | various | Copy of onboarding submission |
| certificateUrl | string | Optional upload |
| status | string | "pending" \| "rejected" |
| submittedAt | Timestamp | Server timestamp |
| consentGiven | boolean | Always true (enforced client + server) |
| reviewedAt | Timestamp | Set by admin on decision |
| reviewedBy | string | Admin UID |

**`posts/{postId}`** — Opportunities
| Field | Type | Notes |
|---|---|---|
| title | string | 5–120 chars |
| description | string | 10+ chars |
| type | string | "hiring" \| "co-founder" \| "paid-project" \| "pressure-test" \| "warm-intro" |
| skillTags | string[] | Post-level tags |
| embedding | number[] | 1536-dim OpenAI vector |
| authorUid / posterUid | string | Author's Firebase UID (both aliases used) |
| posterName | string | Denormalized from user profile |
| posterCohort | string | Denormalized |
| contactEmail | string | Revealed on connect |
| contactVisible | boolean | Whether email is surfaced |
| status | string | "open" \| "closed" |
| createdAt | Timestamp | Server timestamp |

**`connections/{connectionId}`** — Interaction log (key capstone metric)
| Field | Type | Notes |
|---|---|---|
| viewerUid, posterUid | string | Both parties |
| viewerCohort, posterCohort | string | For cross-cohort pair tracking |
| postId, postType | string | Which opportunity triggered it |
| actionType | string | "reveal" \| "message" |
| isCrossCohort | boolean | true when cohorts differ |
| emailDomain | string | For duplicate detection |
| deviceFingerprint | string | SHA-256(UA + IP) — raw values never stored |
| timestamp | Timestamp | Server timestamp |
| isSeedData | boolean | Distinguishes real from seeded data |

**`notifications/{uid_postId}`** — Match email audit trail
| Field | Type | Notes |
|---|---|---|
| uid | string | Notified alumni UID |
| email | string | Email address used |
| postId, postType, postTitle | string | Post details |
| posterUid, posterCohort | string | Who posted |
| sentAt | Timestamp | When email was dispatched |
| replied | boolean | Set true when a connection is logged |
| repliedAt | Timestamp | When replied was set |
| isSeedData | boolean | Distinguishes real from seeded |

**`consent_records/{uid}`** — DPDP/GDPR audit trail
| Field | Type | Notes |
|---|---|---|
| uid, email | string | Identity |
| consentGiven | boolean | Always true at creation |
| consentTimestamp | Timestamp | Server timestamp |

**`incomplete_signups/{uid}`** — Abandoned onboarding recovery
| Field | Type | Notes |
|---|---|---|
| uid, email, displayName | string | From partial-signup API call |
| startedAt | Timestamp | When OAuth was completed |
| reminderSent | boolean | False until cron fires |
| reminderSentAt | Timestamp | Set by cron after sending |

**`waitlist_signups/{signupId}`** — Pre-launch interest capture (landing page)
| Field | Type | Notes |
|---|---|---|
| fullName, email, cohort, role | string | Self-reported |
| createdAt | Timestamp | Server timestamp |
| referral, linkedin, referralCode | string | Optional fields |
| position | number | Queue position |

**`metadata/{docId}`** — Platform counters
| Field | Type | Notes |
|---|---|---|
| count | number | Approved member count (used in welcome email copy) |

### Firestore security rules summary
- **Default deny:** all paths start with `allow read, write: if false`.
- **`users`:** Owner can read/write own doc (client-writable fields only — `protectedUserFields` blocks `isAdmin`, `status`, `onboardingComplete`, `verificationStatus`). Admin can read/write all. Approved members can read other approved member docs.
- **`posts`:** Any signed-in user can read. Create requires `authorUid == request.auth.uid` and valid `type` enum. Update restricted to post owner. Delete allowed by owner or admin.
- **`connections`:** Admin-readable only. Any signed-in user can create (own viewerUid). Admin manages updates/deletes.
- **`notifications`:** Admin-readable. Owner can read own notification. Admin-managed writes.
- **`pending_users`:** Owner can create/read own record. Admin can read/update.
- **`incomplete_signups`:** Owner can create. Admin-only reads/updates/deletes.
- **`consent_records`:** Owner read/write only.
- **`metadata`:** Public read. Restricted update (count field only).
- **`waitlist_signups`:** Write-only at creation (no reads, no updates, no deletes from client).

### Firebase Storage usage
Graduation certificates are uploaded to `certificates/{uid}/cert` during onboarding via `uploadBytes()`. The download URL is stored in `pending_users/{uid}.certificateUrl` and copied to `users/{uid}.certificateUrl` on approval. Storage is only written from the client during onboarding; the download URL is the only reference stored in Firestore. No server-side processing of uploaded files occurs.

---

## 5. AI Matching System

### Embedding generation
Model: `text-embedding-3-small` (OpenAI), 1536 dimensions, $0.00002/1K tokens.

**Profile embeddings** are generated at approval time in `POST /api/admin/approve`. The input text is assembled in `approve/route.ts`:
```
{fullName}
currentRole: {currentRole}
cohort {cohort}
skills: {skillTag1}, {skillTag2}, ...
linkedin: {linkedinHandle}
background: {linkedinContext}
```
The result is stored in `users/{uid}.embedding`.

**Post embeddings** are generated on-demand in `POST /api/notify`. Input:
```
{type} {title} {description} {skillTag1 skillTag2 ...}
```
If the post already has an embedding stored, it is reused. Otherwise a new one is generated and used for that notification pass (it is not persisted back to the post document in the current implementation).

The `generateEmbedding()` function in `lib/embeddings.ts` calls the OpenAI REST API directly (no SDK), truncates input to 8192 characters, and returns the `data[0].embedding` array.

### Cosine similarity ranking
`cosineSimilarity(a, b)` in `lib/matching.ts` computes dot product divided by the product of L2 norms. Returns a value in [-1, 1]; higher is more similar. Implemented in the application layer — not in Firestore or pgvector.

`rankMatches(post, users, excludeUid, topN=5)`:
1. Filters users: excludes the poster, users with `notificationsEnabled=false`, and users with `hiddenFromFeed=true`.
2. Scores each eligible user: cosine similarity if both have embeddings, keyword overlap fallback otherwise.
3. Extracts `matchedSkills` (top 2 overlapping tags from taxonomy, used in email copy).
4. Filters scores > 0, sorts descending, returns top N.

### Keyword overlap fallback
`keywordOverlapScore(postTags, userTags)` computes Jaccard similarity: `|intersection| / |union|` on lowercased tag sets. Used when either the post or user lacks an embedding vector.

`scoreFeedRelevance(post, user)` (called client-side for feed ranking) uses the same logic: cosine similarity if both embeddings are present, keyword overlap otherwise.

### Where embeddings are stored and queried
- **Stored:** in `users/{uid}.embedding` (number[]) and (transiently) during notify execution.
- **Queried:** fetched via `adminDb.collection("users").limit(500).get()` — a full table scan filtered in application memory. There is no vector index. This is an explicit O(n) decision documented in the code: acceptable to ~500 users, flagged for v2 replacement with an ANN query.

---

## 6. API Routes

| Route | Method | Purpose | Auth | Rate Limit |
|---|---|---|---|---|
| `/api/onboarding/submit` | POST | Submit onboarding form → `pending_users`, send pending email | Firebase ID token | 3 req/min/IP |
| `/api/admin/approve` | POST | Approve or reject a pending user, generate embedding, send email | Firebase ID token + `isAdmin` Firestore check | None |
| `/api/notify` | POST | Generate post embedding, rank matches, send notification emails, write `notifications` docs | Firebase ID token (poster only — `authorUid` check) | 5 req/min/IP |
| `/api/embed` | POST | Generate an OpenAI embedding for arbitrary text | Firebase ID token | 10 req/min/IP |
| `/api/connect` | POST | Log a connection event, duplicate-detect, mark notification replied | Firebase ID token | None |
| `/api/auth/partial-signup` | POST | Record incomplete signup in `incomplete_signups` for cron recovery | Firebase ID token | None |
| `/api/unsubscribe` | POST | Set `notificationsEnabled: false` on user document | Firebase ID token | None |
| `/api/cron/onboarding-reminder` | GET | Find incomplete signups >2h old, send recovery email, mark `reminderSent: true` | `Authorization: Bearer {CRON_SECRET}` | Vercel cron (daily 09:00 UTC) |

---

## 7. Email System

All email is sent via the **Resend REST API** (`https://api.resend.com/emails`) using plain `fetch` — no SDK dependency. The implementation is in `lib/email.ts`. All emails are plain-text only (no HTML templates).

**Sender:** configured via `RESEND_FROM_EMAIL` env var.

### Email types

| Email | Trigger | Function | Subject |
|---|---|---|---|
| Pending approval | `POST /api/onboarding/submit` completes successfully | `pendingApprovalEmail()` | "You're through the door, {name}." |
| Welcome (approval) | Admin approves via `POST /api/admin/approve` | `welcomeEmail()` | "The door is open, {name}." |
| Rejection | Admin rejects via `POST /api/admin/approve` | `sendRejectionEmail()` | "Your 100x Civilization profile update" |
| Smart match notification | `POST /api/notify` — sent to each ranked match | `matchNotificationEmail()` | "New {type} opportunity matches {skill} and {skill}" |
| Abandoned onboarding recovery | Cron: `GET /api/cron/onboarding-reminder` | `abandonedOnboardingEmail()` | "You're one step away from 100x Civilization" |

### Cron job — abandoned onboarding recovery
- **Schedule:** `0 9 * * *` (daily at 09:00 UTC, configured in `vercel.json`)
- **Trigger:** Vercel Cron. Vercel sends a GET to `/api/cron/onboarding-reminder` with `Authorization: Bearer {CRON_SECRET}`.
- **Logic:** Queries `incomplete_signups` where `reminderSent == false` AND `startedAt < (now - 2h)`, up to 50 docs. For each: sends recovery email, then updates `reminderSent: true` and `reminderSentAt` in Firestore.
- **Purpose:** Recovers users who completed Google OAuth but abandoned the onboarding form before submitting.

---

## 8. Deployment

### Vercel configuration
- Output mode: `standalone` (set in `next.config.ts`)
- Cron jobs: defined in `vercel.json` (one job: daily onboarding reminder)
- Bundle analyzer: available via `ANALYZE=true npm run build`
- Console statements: stripped in production via `compiler.removeConsole`

### Environment variables required

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full Firebase Admin service account JSON (stringified) |
| `OPENAI_API_KEY` | OpenAI API key for text-embedding-3-small |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | Verified sender address (e.g. `team@100xcivilization.live`) |
| `APP_URL` | Full production URL (e.g. `https://100xcivilization.live`) |
| `CRON_SECRET` | Shared secret for cron endpoint authorization |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Comma-separated admin emails for client-side admin UI gating |

### Firebase configuration
- Client-side config is loaded from `firebase-applet-config.json` (bundled in the repo — contains no secrets, only public project config).
- The `firestoreDatabaseId` field in that config points to the named Firestore database (not the default `(default)` instance).
- Admin SDK uses `FIREBASE_SERVICE_ACCOUNT_JSON` only — never the client config.

### Domain
Live at `https://100xcivilization.live` (configured via Vercel project settings).

---

## 9. Known Technical Debt

### O(n) matching scan
`/api/notify` fetches all users (`limit(500)`) and scores them in the application layer. This is an intentional design decision for the capstone scale (~50–150 users). At >500 users, matching latency will degrade linearly. The code comment documents the v2 path: replace with a vector ANN query (pgvector, Pinecone, or Firestore Vector Search).

### In-memory rate limiter
`lib/rate-limit.ts` uses a `Map` stored in Node.js process memory. On Vercel, each serverless function invocation is isolated — buckets reset on cold starts and are not shared across concurrent instances. This means rate limits are per-instance, not globally enforced. At capstone scale this is acceptable. At production scale, rate limiting should move to Redis or a Vercel KV store.

### Cookie-based middleware routing
`middleware.ts` reads Firestore on every authenticated page request to determine the user's state. This adds latency (~50–100ms per request) and creates a Firestore read dependency in the hot path. The cookie-based approach also means middleware cannot reliably detect state changes until the next page navigation. See section 3 for the security implications.

### Admin identity has two sources of truth
Admin access is checked two ways: (1) `isAdmin: true` on the Firestore user document (used by API routes and the admin UI), and (2) a hardcoded email allowlist in `firestore.rules` (used by direct Firestore reads). These can drift if the email allowlist changes but the user document is not updated, or vice versa.

### Post embeddings not persisted
In `/api/notify`, if a post does not have a stored embedding, one is generated but written only to the in-memory `postEmbedding` variable — it is not saved back to `posts/{postId}`. Repeated notify calls for the same post regenerate the embedding each time, incurring unnecessary API cost.

### No cursor pagination
Admin and feed queries use `limit()` without cursor-based pagination. The admin page loads up to 50 pending users; the feed loads up to 100 posts; the notify route scans up to 500 users. All marked with `// v2: add cursor pagination` comments.

### Resend SDK not installed
`lib/email.ts` uses raw `fetch` to call the Resend REST API to avoid a dependency change during a verification phase. The SDK should be installed for better error handling and type safety in a production system.

### No unsubscribe link in email
`pendingApprovalEmail`, `welcomeEmail`, and `sendRejectionEmail` do not include a one-click unsubscribe link. The PRD compliance section requires it. Only match notification emails include a settings URL. This is a gap for CAN-SPAM / DPDP compliance.

---

## 10. Security Posture

### What is protected and how
- **All API routes** require a Firebase ID token (verified by Admin SDK). There are no unauthenticated data writes to Firestore via API routes.
- **Admin endpoints** require both a valid ID token and `isAdmin: true` in Firestore (`/api/admin/approve`).
- **Firestore rules** enforce ownership and field-level write protection client-side. Protected fields (`isAdmin`, `status`, `onboardingComplete`, `verificationStatus`) cannot be written by clients.
- **CSP headers** defined in `next.config.ts` restrict script sources to trusted Google/Firebase domains. `unsafe-eval` is disabled in production.
- **Security headers** set on all routes: HSTS (2 years, includeSubDomains, preload), X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy blocking camera/mic/geolocation.
- **Device fingerprinting** in `/api/connect` hashes User-Agent + IP (SHA-256) before storage — raw values are never persisted.
- **Skill tag validation** is enforced both client-side (autocomplete rejects freeform) and server-side (`isValidSkill()` checks every tag against SKILL_TAXONOMY).
- **Input validation** at every API boundary: name format (unicode letter regex), phone (digit-only regex), LinkedIn URL (pattern match), cohort (Set membership check), skill count (5–20 range).
- **Rate limiting** on high-value endpoints: onboarding submit (3/min), notify (5/min), embed (10/min).

### Known gaps
- In-memory rate limiter is not globally enforced across Vercel instances (see Technical Debt).
- No brute-force protection on the Google OAuth flow itself (Google-managed).
- Cron endpoint authenticated only by a shared secret (`CRON_SECRET`); if leaked, an attacker can trigger mass email sends. Should rotate periodically.
- Firebase Storage does not enforce file type server-side; content-type from the upload is trusted. Malicious file uploads would not execute on the server but could be served to an admin who downloads the certificate.
- `NEXT_PUBLIC_ADMIN_EMAILS` is exposed to the browser bundle — an attacker can read it. This only controls whether the admin UI link is shown, not actual admin access (which is gated by the Firestore `isAdmin` field on the server).
- No audit log for admin approval/rejection decisions beyond the Firestore `reviewedBy` and `reviewedAt` fields on `pending_users`.

### What was hardened during build
- Removed all direct client-to-Firestore writes for protected fields via `clientWritableUserFields()` / `protectedUserFields()` rule functions.
- Moved all embedding generation and email dispatch server-side — OpenAI and Resend API keys are never in the browser.
- Ensured `server-only` import guard on `firebase-admin.ts` and `auth-middleware.ts` to prevent accidental client bundle inclusion.
- Verified that `firebase-applet-config.json` contains only public Firebase project config (no private keys).
