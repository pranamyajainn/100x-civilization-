# Graph Report - 100x-civilization-  (2026-05-11)

## Corpus Check
- 57 files · ~25,980 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 235 nodes · 328 edges · 28 communities (23 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24d665a3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `100x Civilization — Product Requirements Document` - 19 edges
2. `db` - 10 edges
3. `useModalStore` - 9 edges
4. `auth` - 8 edges
5. `POST()` - 6 edges
6. `ScrollReveal()` - 6 edges
7. `The 100x Civilization` - 6 edges
8. `MagneticButton()` - 5 edges
9. `main()` - 5 edges
10. `isAdmin()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `rankMatches()`  [EXTRACTED]
  app/api/notify/route.ts → lib/matching.ts
- `Hero()` --calls--> `useModalStore`  [EXTRACTED]
  components/hero.tsx → lib/store.ts
- `WaitlistForm()` --calls--> `useModalStore`  [EXTRACTED]
  components/waitlist-form.tsx → lib/store.ts
- `WaitlistModal()` --calls--> `useModalStore`  [EXTRACTED]
  components/waitlist-modal.tsx → lib/store.ts
- `FinalCTA()` --calls--> `useModalStore`  [EXTRACTED]
  components/cta.tsx → lib/store.ts

## Communities (28 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (18): Props, SkillTagInput(), PostDetail, TYPE_LABELS, auth, db, googleProvider, isValidSkill() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (11): Cursor(), EasterEggSound(), Footer(), Problem(), ScrollReveal(), SectionDivider(), pillars, Solution() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (12): FinalCTA(), HeroAurora(), Hero(), LiveCounter(), MagneticButton(), ShimmerEffect(), ShimmerStore, useShimmerStore (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (19): 100x Civilization — Product Requirements Document, 📝 Abstract, 🔗 Assumptions & Dependencies, 🎯 Business Objectives, 🔒 Compliance / Privacy / Legal, Contents, 💰 Costs, 🧮 Data Requirements (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (14): formatRelative(), PostCard(), PostCardProps, PostData, PostType, TYPE_COLORS, TYPE_LABELS, FormState (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (10): formatType(), NotificationPayload, sendMatchNotification(), cosineSimilarity(), MatchResult, PostDoc, rankMatches(), UserProfile (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (8): cormorant, inter, jetbrains, metadata, outfit, viewport, LenisProvider(), ReactLenis

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (11): configPath, firebaseConfig, firestorePatch(), generateEmbedding(), main(), makeEmbeddingValue(), makeStringArrayValue(), SEED_POSTS (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.54
Nodes (7): buildFingerprint(), emailDomain(), firestorePatch(), firestoreQuery(), isDuplicate(), markNotificationReplied(), POST()

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (8): The 100x Civilization, 100x Engineers, Firebase, Framer Motion, Next.js 14 App Router, Tailwind CSS, Vercel, waitlist_signups collection

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (6): AdminPage(), computeKpis(), Connection, Invite, KpiMetrics, NotifDoc

### Community 11 - "Community 11"
Cohesion: 0.43
Nodes (6): cleanCollection(), configPath, firebaseConfig, firestoreDelete(), firestoreQuery(), main()

### Community 12 - "Community 12"
Cohesion: 0.73
Nodes (5): DELETE(), generateToken(), GET(), isAdmin(), POST()

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (5): 4. Vercel Deployment, 5. Viewing Signups, Firebase Configuration (AI Studio), Setup & Deployment, The 100x Civilization

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (3): center, nodes, HeroConstellation

## Knowledge Gaps
- **78 isolated node(s):** `PUBLIC_PREFIXES`, `config`, `config`, `__filename`, `__dirname` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `Community 0` to `Community 10`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `HeroConstellation` connect `Community 14` to `Community 2`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `PUBLIC_PREFIXES`, `config`, `config` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._