# 100x Civilization — Product Requirements Document
**Version:** 1.0  
**Status:** Capstone Draft  
**Owner:** Pranamya, Sahajta AI  
**Last Updated:** May 2026

---

## Contents

1. Abstract
2. Business Objectives
3. KPIs
4. Success Criteria
5. User Journeys
6. Scenarios
7. User Flow
8. Functional Requirements
9. Model Requirements
10. Data Requirements
11. Prompt Requirements
12. Testing & Measurement
13. Risks & Mitigations
14. Costs
15. Assumptions & Dependencies
16. Compliance / Privacy / Legal
17. GTM / Rollout Plan

---

## 📝 Abstract

100x Civilization is a closed, invite-only opportunity feed for 100xEngineers alumni across all cohorts (1 to 7+). Alumni post needs across five types: hiring, co-founder search, paid project, technical pressure test, and warm intro request. A semantic skill-matching layer surfaces relevant opportunities to each member based on their tagged expertise, ranked by relevance. The core problem: 100x cohorts produce high-trust networks that go cold the moment the cohort ends. Value leaks out. Members post on LinkedIn for collaborators who are already inside the community. This platform closes that loop.

Built as a 100x cohort capstone. Week 1: build. Week 2: user acquisition and validation.

---

## 🎯 Business Objectives

- Prevent trust-network decay by creating a persistent, cross-cohort interaction layer
- Demonstrate that alumni from different cohorts can find, connect, and act on opportunities through a single platform faster than they can via LinkedIn or Slack
- Prove product-market fit within a 2-week validation window using real posting, matching, and connection data
- Establish Sahajta AI's capability to build, ship, and validate an AI-powered B2B product in one week

---

## 📊 KPIs

| GOAL | METRIC | TARGET (2-week window) |
|---|---|---|
| Cross-cohort trust activation | Unique cross-cohort connection pairs made via platform | 15+ pairs from 2+ different cohorts |
| AI matching effectiveness | Match notification to reply rate | 20%+ of notified alumni reply to matched opportunity |
| Feed liquidity | Opportunities posted by unique alumni | 20+ posts from 15+ unique alumni in week 2 |

---

## 🏆 Success Criteria

- At least 15 documented cross-cohort connections (user A from cohort X contacted user B from cohort Y via platform)
- AI matching system demonstrably routes relevant opportunities (measured by reply rate, not just open rate)
- Feed is live with real posts by real alumni, not seeded demo data, at time of capstone evaluation
- Zero manual admin intervention required to run the core feed after launch
- Siddhant or 100x internal team publicly endorses the product to alumni during week 2 acquisition

---

## 🚶 User Journeys

**Journey 1: The Builder Who Needs a Specific Skill**  
Pranamya (cohort 6) is building a new product and needs a meta ads expert for a 4-week paid engagement. Instead of posting on LinkedIn, he opens 100x Civilization, selects "Paid Project," fills a structured form, and posts. Alumni tagged with "performance marketing" or "meta ads" receive a ranked notification. Within 24 hours, two alumni from cohort 3 and cohort 5 reply. Pranamya messages both inside the platform. One is hired.

**Journey 2: The Alumni Who Wants to Stay Relevant**  
A cohort 2 alumna finished her program a year ago. She has frontend skills and occasional availability. She joins via invite link, tags 6 skills in onboarding, and sets availability to "open to paid projects." She gets notified of two relevant opportunities in week 1 without posting anything herself. She replies to one. A connection is made.

**Journey 3: The Founder Looking for a Co-Founder**  
A cohort 4 alum has a validated idea and needs a technical co-founder. He posts a co-founder search with his product domain, commitment expectation, and equity structure. The AI layer matches this to alumni tagged with complementary technical skills who have previously indicated interest in co-founding. Three people are notified. Two view the post. One starts a conversation.

---

## 📖 Scenarios

1. Alumni posts a hiring opportunity for a full-time AI engineer. System matches and notifies 5 alumni with relevant tags. 2 reply within 48 hours.
2. Alumni posts a pressure-test request for their MVP demo before a pitch. 4 alumni from different cohorts give structured feedback within the platform.
3. Alumni requests a warm intro to a specific investor. A second alumni who has a connection to that investor is surfaced by the matching layer.
4. New alumni joins via invite link, completes skill-tag onboarding (minimum 5 tags), and immediately sees 3 relevant open opportunities on the feed.
5. Alumni opens the feed, sees no relevant opportunities, but receives an email notification 6 hours later when a matching post goes live.

---

## 🕹️ User Flow

**Happy Path: Post and Match**

1. Alumni receives unique invite link (via DM, email, or Siddhant Slack post)
2. Lands on invite-gated signup page
3. Google OAuth login (no custom auth)
4. Onboarding: name, cohort number, current role, skill tags (autocomplete from controlled taxonomy, minimum 5 required), availability toggle
5. Profile saved. Embedding generated for skill tags and stored.
6. Lands on feed. Sees all open opportunities, filtered and ranked by relevance to their profile.
7. Clicks "Post Opportunity." Selects type (hiring / co-founder / paid project / pressure test / warm intro). Fills structured form per type. Submits.
8. AI layer generates embedding for the post. Matches against all alumni profiles. Top N matches receive email notification with ranked reason ("matches your skills in X, Y").
9. Notified alumni opens email, clicks through to platform, views post, replies inside platform or reveals contact info.
10. Connection recorded. Cross-cohort pair logged.

**Alternative Path: Receive and Respond**

1. Alumni receives smart match notification email
2. Clicks link, lands on specific opportunity post
3. Views post detail, sees poster's cohort and brief profile
4. Clicks "Connect" or "Reply" — contact info revealed or in-platform message sent
5. Connection logged

---

## 🧰 Functional Requirements

| SECTION | SUB-SECTION | USER STORY & EXPECTED BEHAVIORS | SCREENS |
|---|---|---|---|
| Auth | Google OAuth | As an invited alumni, I sign in with Google so I don't manage a password. Only users with a valid invite link can reach the signup page. | Invite landing, OAuth redirect |
| Onboarding | Profile Setup | As a new user, I complete my profile: name, cohort number, current role, skill tags (min 5, autocomplete taxonomy), availability. Cannot access feed until onboarding is complete. | Onboarding form |
| Feed | View Opportunities | As an alumni, I see a ranked feed of open opportunities. Default sort: relevance to my skill tags. Secondary sort: recency. | Feed page |
| Feed | Post Opportunity | As an alumni, I post an opportunity by selecting type and completing a type-specific structured form. All 5 types share one schema with conditional fields. | Post form modal |
| Matching | Smart Notifications | When a new opportunity is posted, the system generates its embedding, compares against all alumni profile embeddings, selects top N matches, and sends email notifications within 15 minutes. | Email template |
| Connection | Reveal / Reply | As a notified alumni, I can reveal the poster's contact info or send a message inside the platform. Connection event is logged with cohort data of both parties. | Post detail page |
| Admin | Invite Management | Admin (Pranamya / team) generates unique invite links tied to an email or open invite tokens. No public signup. | Admin panel (minimal) |
| Profile | Skill Tags | Skill tags use a controlled taxonomy with autocomplete. Freeform entry is rejected. Minimum 5 tags enforced at onboarding. | Onboarding, profile edit |

---

## 📐 Model Requirements

| SPECIFICATION | REQUIREMENT | RATIONALE |
|---|---|---|
| Open vs Proprietary | Proprietary (OpenAI or Anthropic API) | Speed of integration in 1-week build. No self-hosting infra. |
| Modalities | Text only | Profiles and posts are text. No image, audio, or video in v1. |
| Task type | Embedding + semantic similarity | Core matching is vector similarity, not generation. |
| Embedding model | text-embedding-3-small (OpenAI) or equivalent | Low cost, high throughput, sufficient for skill-tag similarity at this scale. |
| Context window | N/A for embedding task | Profiles and posts are short. Context window not a constraint. |
| Fine tuning | Not needed in v1 | Pre-trained embeddings on general text are sufficient for skill matching at sub-500 user scale. |
| Latency | Embedding generation under 2s per post or profile. Notification dispatch under 15 min of post creation. | Alumni expect near-real-time notification. Longer than 15 min breaks trust in the system. |
| Hallucination tolerance | Zero — matching is deterministic cosine similarity, no generative output in the matching path | Matching must be explainable and auditable. |

---

## 🧮 Data Requirements

- **Profile embeddings:** generated at onboarding from skill tags concatenated as a text string. Stored as a vector in the database alongside the user record.
- **Post embeddings:** generated at post creation from post type + title + description. Stored with the post record.
- **Skill taxonomy:** a static controlled list of ~100 to 200 skill terms curated before launch. Covers AI/ML, frontend, backend, growth, sales, design, product, finance. Stored as a lookup table.
- **Privacy:** no PII beyond name, cohort, email, and role. No phone numbers stored. Contact reveal is gated by user consent toggle.
- **Storage:** PostgreSQL (Supabase) for user, post, and connection records. pgvector extension for embedding similarity queries.
- **Data volume at launch:** expected 50 to 150 users, 20 to 50 posts in week 2. No scaling infrastructure required in v1.
- **Ongoing collection:** every connection event (who connected with whom, what post type, what cohorts) is logged. This is the capstone evaluation dataset.

---

## 💬 Prompt Requirements

No generative prompts in the core matching path. Matching is purely embedding similarity.

If opportunity quality scoring (v2 candidate) is added later:
- Prompt must evaluate clarity, specificity, and actionability of a post before it goes live
- Output must be a structured score (1 to 5) with one-line feedback, JSON only
- No hallucinated suggestions. If the post is unclear, prompt asks one targeted clarifying question only.

For v1, prompts are limited to:
- Email notification copy: plain, specific, non-promotional. States the opportunity type, match reason (top 2 matching skills), and a direct link. No hype language.
- Onboarding empty-state copy: if a user's feed shows no matches, explain why in one sentence and prompt them to add more skill tags.

---

## 🧪 Testing & Measurement

**Pre-launch (offline)**
- Seed 10 synthetic profiles with known skill tags. Post 5 synthetic opportunities. Verify that top-ranked notified profiles are correct by manual inspection.
- Test invite link gating: unauthenticated user with no invite link cannot access any page beyond the landing screen.
- Test onboarding enforcement: user cannot access feed without completing minimum 5 skill tags.

**Week 2 (live)**
- Track daily: posts created, unique posters, notifications sent, notification-to-reply rate, connections logged, cohort distribution of connected pairs.
- Flag if notification-to-reply rate drops below 10% on day 3. Indicates taxonomy mismatch or irrelevant matching. Immediate fix: manually review top 5 failed matches and adjust taxonomy terms.
- Rollback trigger: if embedding API is unavailable, fall back to simple keyword overlap matching. Non-AI fallback must be coded before launch.

---

## ⚠️ Risks & Mitigations

| RISK | MITIGATION |
|---|---|
| Supply-side collapse: feed launches with fewer than 5 posts | Pre-confirm 10 alumni who commit to posting on day 1 before launch. Do not open acquisition without this confirmed. |
| Smart matching returns irrelevant results due to inconsistent tags | Controlled taxonomy with autocomplete prevents freeform junk. Enforce minimum 5 tags. Review first 20 match events manually. |
| Alumni sign up but never post or reply (passive lurking) | Acquisition DMs must explicitly ask each person to either post an opportunity or reply to one specific existing post. Not "join." A specific ask. |
| Invite link misuse: non-alumni joins | Invite links expire after 48 hours or after one use. Admin can revoke. |
| Cross-cohort connection metric is gamed (same person, two accounts) | Connection events log device fingerprint and email domain. Flag duplicates before capstone submission. |
| Embedding API cost overrun | At 150 users and 50 posts, total embeddings are under 500 calls. text-embedding-3-small is $0.00002 per 1K tokens. Total cost is under $1. Not a risk. |

---

## 💰 Costs

**Development (week 1)**
- API costs: under $5 total for embeddings during build and testing
- Supabase: free tier sufficient for v1 scale
- Hosting: Vercel free tier for frontend, Supabase for backend
- Domain: existing or new, under $15

**Operational (week 2)**
- Embedding API: under $2 for full launch scale
- Email notifications: Resend or Postmark free tier (100 emails/day) sufficient for week 2
- Total operational cost for capstone window: under $20

---

## 🔗 Assumptions & Dependencies

1. Google OAuth is the only auth method. No custom email/password login in v1.
2. Web-only. No mobile app. Responsive design sufficient for mobile browsers.
3. Notifications are email-only. No push notifications, no in-app notification bell in v1.
4. Skill tags use a controlled taxonomy defined before build starts. No freeform tags accepted.
5. Siddhant sends one announcement to 100x alumni Slack in week 2. This is the primary top-of-funnel lever. If this does not happen, week 2 acquisition targets are at risk.
6. All 5 opportunity types share one database schema with a type enum field and conditional required fields per type.
7. No payments, no escrow, no revenue mechanism in v1.
8. Connection is defined as: user A from cohort X views a post by user B from cohort Y AND sends a message or reveals contact info. View alone does not count.
9. pgvector is available on Supabase free tier. If not, cosine similarity computed in application layer on retrieval.
10. **UNVERIFIED:** Post-capstone IP rights permit Sahajta to continue operating and developing the product. Verify before week 2 acquisition begins.

---

## 🔒 Compliance / Privacy / Legal

- No PII beyond name, email, cohort, role, and self-declared skill tags stored
- Contact info (email or LinkedIn) is stored but gated behind a consent toggle. Alumni opt in to making contact info visible to matched parties.
- No data sold or shared with third parties
- Invite-only gating limits data collection to verified community members
- DPDP Act (India, 2023): as a closed internal tool during capstone, formal compliance is not triggered at this scale. If operated publicly post-capstone, a privacy policy and consent framework is required before scaling beyond 100x alumni.
- Email notifications must include a one-click unsubscribe link

---

## 📣 GTM / Rollout Plan

**Week 1: Build**

| Day | Milestone |
|---|---|
| Day 1 | Supabase schema, Google OAuth, invite-gated signup, onboarding form |
| Day 2 | Feed view, post creation form (all 5 types), skill taxonomy finalized |
| Day 3 | Embedding generation on profile save and post create, pgvector similarity query |
| Day 4 | Smart match notification email (Resend), notification-to-post link flow |
| Day 5 | Connection logging, cross-cohort pair tracking, admin invite management |
| Day 6 | QA: 10 synthetic profiles, 5 synthetic posts, match verification |
| Day 7 | Deploy to production. Invite 5 trusted alumni for soft-launch pressure test. Fix critical bugs only. |

**Week 2: Acquisition**

| Day | Action |
|---|---|
| Day 8 | Confirm 10 alumni committed to posting on day 9. Email the 42-person waitlist. |
| Day 9 | Public soft-launch. Siddhant posts in alumni Slack. Team sends personal DMs (not broadcast, personal). Each DM asks for one specific action: post or reply. |
| Day 10 to 13 | Monitor KPIs daily. If reply rate below 10%, manually review top failed matches and patch taxonomy. If post volume below 10 by day 11, activate personal DM round 2. |
| Day 14 | Capstone submission. Export: total connections, cross-cohort pairs, post count, notification-to-reply rate. Prepare 3-minute live demo showing one end-to-end flow: post created, notification sent, alumni replies, connection logged. |

---

*Anything marked UNVERIFIED or ASSUMPTION can be revised. Post feedback on scope, risks, or KPIs.*
