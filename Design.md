# 100x Civilization - Design & Architecture Documentation

## Overview

**The 100x Civilization** is a members-only exclusive economic engine landing page for 100x cohorts. It serves as a community proposal platform for the 100x Engineers brand, featuring an immersive waitlist experience with referral mechanics, advanced animations, and Firestore-backed signup management.

**Stack**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Framer Motion + Firebase Firestore

---

## 1. Project Structure

```
100x-civilization/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with font setup
│   ├── page.tsx             # Home page component composition
│   └── globals.css          # Global styles and Tailwind imports
├── components/              # Modular React components (98.7% of codebase)
│   ├── hero.tsx             # Main hero section with constellation animation
│   ├── hero-aurora.tsx      # Aurora background gradient effect
│   ├── hero-constellation.tsx # 3D constellation visualization
│   ├── waitlist-form.tsx    # Core signup form with transaction logic
│   ├── waitlist-modal.tsx   # Modal wrapper for waitlist
│   ├── cta.tsx              # Call-to-action section
│   ├── problem.tsx          # Problem statement section
│   ├── solution.tsx         # Solution overview with grid
│   ├── vision.tsx           # Vision section
│   ├── team.tsx             # Team member showcase
│   ├── footer.tsx           # Footer component
│   ├── cursor.tsx           # Custom animated cursor
│   ├── magnetic-button.tsx  # Interactive button with magnetic effect
│   ├── count-up.tsx         # Animated number counter
│   ├── live-counter.tsx     # Real-time signup counter
│   ├── scroll-reveal.tsx    # Scroll-triggered animations
│   ├── shimmer-effect.tsx   # Shimmer overlay animation
│   ├── easter-egg.tsx       # Hidden audio Easter egg
│   ├── scramble.tsx         # Text scramble animation
│   ├── tilt-card.tsx        # 3D tilt effect card
│   ├── section-divider.tsx  # Visual section separator
│   ├── lenis-provider.tsx   # Smooth scrolling provider
│   └── scroll-reveal.tsx    # Scroll-triggered reveal animation
├── lib/                     # Utility and integration modules
│   ├── firebase.ts          # Firebase initialization & Firestore
│   ├── store.ts             # Zustand modal state management
│   └── utils.ts             # Helper utilities (classname merging)
├── hooks/                   # Custom React hooks
│   └── use-mobile.ts        # Mobile device detection hook
├── next.config.ts           # Next.js configuration with security headers
├── package.json             # Dependencies (29 production, 9 dev)
├── tsconfig.json            # TypeScript configuration
├── firestore.rules          # Firestore security rules
├── firebase-applet-config.json # Firebase configuration (bundled)
└── .eslintrc.json           # ESLint configuration

```

---

## 2. Core Technologies & Dependencies

### Framework & UI
- **Next.js 15.4.9**: App Router for page routing and rendering
- **React 19.2.1**: UI component library
- **TypeScript 5.9.3**: Type safety

### Animation & Interactivity
- **Framer Motion 12.23.24** (aliased as `motion`): Primary animation library
  - Scroll-triggered animations via `useScroll()`, `useTransform()`
  - Spring physics for natural motion
  - Staggered animations for sequential element reveals
- **Lenis 1.3.23**: Smooth scrolling integration
- **Canvas-confetti 1.9.4**: Celebration particle effects on waitlist signup

### Styling
- **Tailwind CSS 4.1.11**: Utility-first CSS framework
- **PostCSS 8.5.6**: CSS processing
- **Autoprefixer 10.4.21**: Browser vendor prefixing

### Backend & Data
- **Firebase 12.12.1**: Cloud Firestore database
- **Zustand 5.0.12**: Lightweight state management (modal open/close)

### Graphics & 3D
- **OGL 1.0.11**: WebGL rendering (constellation visualization)
- **Postprocessing 6.39.1**: Post-processing effects (not actively used)
- **Three.js types** (for potential 3D math)

### Form & UI Utilities
- **React Hook Form 5.2.1**: Form state management
- **Lucide React 0.553.0**: Icon library (loading spinner, check mark)
- **CVA (class-variance-authority) 0.7.1**: Component variant utilities
- **clsx 2.1.1**: Conditional classname utilities
- **Tailwind Merge 3.5.0**: Merge conflicting Tailwind classes

### Google Integration
- **@google/genai 1.17.0**: Google AI Studio integration (available)

---

## 3. Architecture & Design Patterns

### 3.1 Page Structure (app/page.tsx)

The landing page is a sequential composition of section components:

```
Main (min-h-screen, overflow-hidden, dark theme)
├── Cursor                    # Global custom cursor
├── ShimmerEffect             # Overlay shimmer animation
├── EasterEggSound            # Audio trigger on interaction
├── WaitlistModal             # Modal container for signup
├── Hero                      # Hero section with CTA
├── SectionDivider
├── Problem                   # Problem statement
├── SectionDivider
├── Solution                  # Solution overview with grid
├── Vision                    # Vision statement
├── SectionDivider
├── Team                      # Team showcase
├── SectionDivider
├── FinalCTA                  # Final call-to-action
└── Footer                    # Footer
```

**Design Philosophy**: 
- Linear narrative flow from hero → problem → solution → vision → team → CTA
- Section dividers provide visual breathing room
- Global overlays (cursor, shimmer) create immersive UX
- Modal for signup keeps context (no page navigation)

### 3.2 Hero Component (components/hero.tsx)

**Key Features**:
- Responsive two-column layout: Typography (55% width) + Constellation (45% width)
- Animated headline with gradient "100x" text and italic "Civilization"
- Staggered entrance animations for eyebrow, headline, subcopy, and CTAs
- Scroll-triggered constellation animation:
  - **Scale**: 1 → 0.85 (50% scroll)
  - **Y-offset**: 0 → 80px (50% scroll)
  - **Opacity**: 1 → 0.4 (80% scroll)

**Color Scheme**:
- Eyebrow & highlight: `#FF4D00` (brand-neon, mapped to `--font-color-neon`)
- "100x" gradient: `linear-gradient(to right, #FF4D00 0%, #FFB37A 50%, #FFFFFF 100%)`
- Font: 
  - Headline: `var(--font-outfit)` (sans, semibold)
  - "Civilization" italic: `var(--font-cormorant)` Garamond (italic, medium)

**Accessibility**:
- `prefers-reduced-motion` honored: animations disabled for users with motion sensitivity
- Semantic HTML (section, h1)
- ARIA labels on interactive elements

### 3.3 Waitlist Form & Signup Flow (components/waitlist-form.tsx)

**Core Logic**:

1. **Form State** (local):
   - fullName, email, cohort, role, referral, linkedin
   - Status: 'idle' | 'loading' | 'success' | 'error'
   - Position & referral boosts (from Firestore listener)

2. **Submission Handler** (`handleSubmit`):
   ```
   a) Generate unique signup ID from Firestore
   b) Create referral code via hash(signupId)
   c) Execute Firestore transaction:
      - Increment metadata.signups.count
      - Write waitlist_signups/{signupId} document
      - Return new position
   d) Save to localStorage for persistence
   e) Show celebration state with position
   ```

3. **Referral Mechanism**:
   - Each signup generates a 6-char alphanumeric referral code
   - Users can share their code; referrers boost position
   - Real-time listener updates `referralsCount` when others use code
   - Effective position: `Math.max(1, position - referralBoosts)`

4. **Success State** (`CelebrationState`):
   - Displays position with 800ms number scramble animation
   - Shows referral code in copyable box
   - Trigger canvas-confetti explosion
   - Share button via Web Share API or clipboard fallback

5. **Form Validation** (Firestore rules + client):
   - Full Name: 2–80 chars
   - Email: RFC-compliant pattern
   - Cohort: One of 7 cohorts + "None"
   - Role: Founder, Engineer, Designer, PM, Marketer, Student, Other
   - Referral (optional): max 200 chars
   - LinkedIn (optional): max 200 chars, URL format

### 3.4 State Management (lib/store.ts)

**Zustand Modal Store**:
```typescript
interface ModalStore {
  isOpen: boolean;
  openModal: () => void;      // Opens modal + triggers shimmer
  closeModal: () => void;
}
```

**Key Integration**:
- Opening modal triggers shimmer effect via `useShimmerStore.getState().trigger()`
- Form visibility keyed to `isOpen` state (staggered animation on show)
- Multiple entry points: Hero CTA buttons, magnetic button on sections

---

## 4. Firebase Integration

### 4.1 Configuration (lib/firebase.ts)

```typescript
// Imports config from firebase-applet-config.json
// Singleton pattern: reuses existing Firebase app if already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
```

**Environment**:
- In AI Studio: Config bundled with build from `firebase-applet-config.json`
- For external deployment: Swap to `NEXT_PUBLIC_FIREBASE_*` env vars

### 4.2 Data Schema

**Collection: `metadata`**
```
Document: signups
├── count: number (total signups, incremented atomically)
```

**Collection: `waitlist_signups`**
```
Document: {signupId} (auto-generated)
├── fullName: string
├── email: string
├── cohort: string
├── role: string
├── referral?: string (optional, referral code used)
├── linkedin?: string (optional URL)
├── position: number (atomic counter at signup time)
├── referralCode: string (6-char code for sharing)
├── referralsCount: number (real-time boost count)
└── createdAt: serverTimestamp
```

### 4.3 Firestore Security Rules (firestore.rules)

**Default Deny Policy**:
```
match /{document=**} {
  allow read, write: if false;
}
```

**Metadata (Read-Only)**:
- Public read access to `metadata/signups`
- Only allow `count` field updates (atomic)
- Prevents creation

**Waitlist Signups (Create-Only)**:
- Block all reads (PII protection)
- Block updates & deletes
- Create allowed only if:
  - Required fields present (fullName, email, cohort, role, createdAt)
  - Field types and sizes validated
  - Email matches RFC pattern
  - Position must be a number (set by transaction)
  - `createdAt` must equal `request.time` (server-side timestamp)
- Prevents client-side position forgery

---

## 5. Animation & Motion Architecture

### 5.1 Scroll-Driven Animations

**Hero Constellation** (components/hero.tsx):
```javascript
const { scrollYProgress } = useScroll({
  target: heroRef,
  offset: ["start start", "end start"]  // 0% → 100% over hero height
});

const constellationScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0.85]);
const constellationY = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0, 80]);
const constellationOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0.4]);
```

### 5.2 Staggered Component Reveals

**Waitlist Form**:
```javascript
const formVariants = {
  show: { transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } }
};
```
Each form field staggers 60ms apart for sequential entrance effect.

### 5.3 Interactive Animations

**Magnetic Button** (components/magnetic-button.tsx):
- Pointer events trigger smooth position transitions
- Button follows cursor movement within hover zone (magnetic effect)
- Smooth return on exit

**Cursor** (components/cursor.tsx):
- Custom ring + center dot follows mouse
- Trail effect with staggered elements
- Scales on hover over interactive elements
- Respects `prefers-reduced-motion` (disables animation)

### 5.4 Motion Library

**Key APIs Used**:
- `motion.div`, `motion.button`, `motion.form`: Animated components
- `useScroll()`, `useTransform()`: Scroll-driven values
- `useAnimation()`: Programmatic animation control
- `useSpring()`: Spring physics
- `useReducedMotion()`: Accessibility check

---

## 6. Styling & Theme

### 6.1 Color System

**CSS Variables** (app/globals.css):
```css
--brand-black: #000000
--brand-white: #FFFFFF
--brand-neon: #FF4D00 (orange accent)
--brand-muted: subdued gray tones
--brand-border: border colors
```

### 6.2 Tailwind Configuration

**Key Utilities**:
```
text-brand-white      # Primary text
bg-brand-black        # Dark background
bg-brand-neon         # Accent elements (buttons, highlights)
text-brand-white/60   # Reduced opacity text
border-brand-neon     # Accent borders
```

**Dark Mode**: Hard-coded dark theme (html class="dark")

### 6.3 Responsive Breakpoints

- **Mobile**: Full-width, single-column layout
- **Tablet** (sm): 2-column layouts begin
- **Desktop** (lg): Full hero constellation visible, form layouts optimized

---

## 7. Performance & Optimization

### 7.1 Code Splitting

**Dynamic Import**:
```typescript
// Hero constellation (3D WebGL, heavy)
const HeroConstellation = dynamic(
  () => import('./hero-constellation').then(mod => mod.HeroConstellation),
  { ssr: false }
);
```
Constellation renders client-side only (disables SSR) for 3D canvas rendering.

### 7.2 Next.js Configuration (next.config.ts)

**Key Optimizations**:
- **React Strict Mode**: Enabled for development checks
- **Bundle Analysis**: `ANALYZE=true` env var enables bundle size reporting
- **Output**: Standalone build for serverless deployment
- **Transpile Packages**: `motion` library transpiled for compatibility
- **Image Optimization**: Remote patterns allow `picsum.photos` for placeholders
- **Cache Headers**: 
  - Static assets: 1 year immutable cache
  - HTML pages: no-cache (must revalidate)

### 7.3 Security Headers (next.config.ts)

```
Strict-Transport-Security: HSTS enabled
X-Frame-Options: SAMEORIGIN (clickjacking protection)
X-Content-Type-Options: nosniff
Content-Security-Policy: Allows Google APIs, Firebase, fonts
Referrer-Policy: origin-when-cross-origin
```

---

## 8. Component Deep Dive

### 8.1 Key Components

| Component | Purpose | Key Props/State |
|-----------|---------|-----------------|
| **Hero** | Main headline + constellation | scrollYProgress, modal trigger |
| **WaitlistForm** | Signup form + transaction | formData, status, position |
| **WaitlistModal** | Modal wrapper | isOpen, children |
| **Solution** | 40px grid background pattern | Grid with opacity 0.06 |
| **Team** | Member showcase with images | Team member cards with hover |
| **Cursor** | Custom mouse follower | Position tracking, scaling |
| **MagneticButton** | Interactive CTA button | onClick, variant (custom) |
| **CountUp** | Animated number | Final value, duration |
| **LiveCounter** | Real-time signup display | Firestore listener subscription |
| **ScrollReveal** | Scroll-triggered show/hide | Children, trigger threshold |
| **ShimmerEffect** | Overlay shimmer animation | Global state trigger |

### 8.2 Component Interactions

```
Page.tsx
  ├── Hero
  │   └── (openModal) → useModalStore
  ├── WaitlistModal
  │   ├── (isOpen) → useModalStore
  │   └── WaitlistForm
  │       ├── (handleSubmit) → Firebase transaction
  │       ├── (localStorage) → signup persistence
  │       └── (onSnapshot) → real-time referral listener
  ├── Solution
  │   ├── Grid background
  │   └── (ScrollReveal animates on scroll)
  ├── Team
  │   └── TiltCard (hover 3D effect)
  └── ...other sections
```

---

## 9. Data Flow & State Management

### 9.1 Signup Flow Sequence

```
User clicks "Request Access"
  ↓
openModal() → useModalStore.setState({ isOpen: true })
  ↓
  Triggers shimmer via useShimmerStore
  ↓
WaitlistForm reveals with staggered animation
  ↓
User fills form + clicks "Request Access" button
  ↓
handleSubmit() executes:
  ├─ Firestore transaction:
  │  ├─ Read metadata/signups.count
  │  ├─ Increment count
  │  ├─ Write waitlist_signups/{signupId}
  │  └─ Atomic return newPosition
  ├─ Generate referral code: shortHash(signupId)
  ├─ Save to localStorage
  └─ Switch to CelebrationState
  ↓
CelebrationState renders:
  ├─ 800ms number scramble animation
  ├─ Confetti explosion
  ├─ Show referral code
  └─ Share button
  ↓
Real-time listener on waitlist_signups/{signupId}:
  → Updates referralsCount when others use referral code
```

### 9.2 Modal State Lifecycle

```
Closed (isOpen: false)
  ↓ [User clicks CTA]
Open (isOpen: true) + Shimmer triggered
  ↓ [Form animation stagger begins]
Form visible + user interaction
  ↓ [User submits]
Loading state + Firebase transaction
  ↓ [Success]
Celebration state + success message
  ↓ [User closes modal]
Closed (isOpen: false)
```

---

## 10. Accessibility Considerations

### 10.1 Motion Preferences

**Reduced Motion** (`prefers-reduced-motion`):
```typescript
const prefersReducedMotion = useReducedMotion();

// Animations disabled if user has motion reduction preference
transition={prefersReducedMotion ? { duration: 0.7 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}

// Canvas confetti respects motion preference
disableForReducedMotion: true
```

### 10.2 Semantic HTML

- `<section>` for major page sections
- `<h1>`, `<h2>`, `<h3>` hierarchy maintained
- `<button>` for interactive elements
- `<form>` with proper `<label>` associations
- `aria-live="polite"` on form for status updates

### 10.3 Keyboard Navigation

- Form inputs keyboard accessible
- Tab order follows visual hierarchy
- Buttons keyboard navigable with `:focus` styles

---

## 11. Deployment & Environment Setup

### 11.1 Local Development

```bash
npm install
npm run dev
# http://localhost:3000
```

**Requirements**:
- Firebase config in `firebase-applet-config.json` (included in AI Studio)

### 11.2 Vercel Deployment

1. Push to GitHub
2. Connect repo in Vercel
3. Add `NEXT_PUBLIC_FIREBASE_*` env vars (6 total)
4. Deploy (security headers auto-configured)

### 11.3 Firebase Configuration

**AI Studio Environment**:
- Config bundled with build
- No env vars needed in `.env`

**External Deployment**:
- Use `NEXT_PUBLIC_FIREBASE_API_KEY` etc.
- Update `lib/firebase.ts` to read from `process.env` instead of imported JSON

---

## 12. Notable Patterns & Best Practices

### 12.1 Atomic Transactions

```typescript
const newPos = await runTransaction(db, async (transaction) => {
  const counterDoc = await transaction.get(counterRef);
  let count = counterDoc.exists() ? counterDoc.data().count : 0;
  transaction.set(counterRef, { count: count + 1 }, { merge: true });
  // Returns position for client-side use
  return count + 1;
});
```
Ensures atomicity: reads counter, increments, writes, all in single transaction.

### 12.2 Short Hash for Referral Codes

```typescript
function shortHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
}
```
Deterministic, short, URL-safe alphanumeric codes from UUID.

### 12.3 localStorage Persistence

```typescript
localStorage.setItem('signup_data', JSON.stringify({ 
  id: signupId, 
  position: newPos, 
  refCode 
}));

// On remount, check localStorage for cached state
const saved = localStorage.getItem('signup_data');
if (saved) {
  const data = JSON.parse(saved);
  setPosition(data.position);
  setStatus('success');
}
```
Prevents double-signup and provides offline-first experience.

### 12.4 Real-Time Referral Listener

```typescript
useEffect(() => {
  if (status === 'success' && docId) {
    const unsubscribe = onSnapshot(doc(db, 'waitlist_signups', docId), (snap) => {
      if (snap.exists()) {
        setReferralBoosts(snap.data().referralsCount || 0);
      }
    });
    return () => unsubscribe();
  }
}, [status, docId]);
```
Listens to single document for live referral count updates; unsubscribes on cleanup.

---

## 13. Known Limitations & Future Enhancements

### 13.1 Current Limitations

1. **No Email Verification**: Form accepts any email; no confirmation sent
2. **No Rate Limiting**: Client-side only; could be abused with bot requests
3. **No Duplicate Detection**: Same email can sign up multiple times
4. **PII Read Block**: Firestore rules block all reads; only count visible
5. **No Admin Dashboard**: No UI to view signups (Firebase Console only)

### 13.2 Potential Improvements

1. Add email verification workflow (Firebase Auth)
2. Implement server-side rate limiting (Cloud Functions)
3. Add unique email constraints via Cloud Function triggers
4. Build admin dashboard for cohort leads
5. Add cohort verification (check against official member list)
6. Implement SMS/email confirmation of position
7. Add social sharing analytics (track referrals from share links)
8. Leaderboard showing top referrers (privacy-preserving)

---

## 14. File-by-File Breakdown

### Core App Files

**app/layout.tsx**
- 4 Google Fonts: Inter, Outfit, JetBrains Mono, Cormorant Garamond
- Metadata + Open Graph setup
- LenisProvider wraps all content (smooth scrolling)
- Dark mode applied globally

**app/page.tsx**
- Sequential composition of 11 components
- No server-side logic; all client-side interactivity
- Overflow hidden on main to prevent layout shift

**app/globals.css**
- Tailwind directives (@tailwind)
- CSS variable definitions (brand colors)
- Global utility classes (min-h-screen, pt-safe)

### Component Architecture

**Sections** (Problem, Solution, Vision, CTA, Team, Footer):
- Markdown-like content components
- Scroll-triggered reveals
- Modular and reusable styling

**Interactive** (Hero, WaitlistForm, MagneticButton, Cursor):
- Heavy Framer Motion usage
- Event listeners (mouse, scroll, form)
- State management (local + Zustand)

**Visual Effects** (Shimmer, Aurora, Constellation, Easter Egg):
- Canvas/WebGL rendering (3D constellation)
- Canvas particle effects (confetti)
- CSS animations (shimmer)
- Audio playback (easter egg)

---

## 15. Environment & Build Configuration

### next.config.ts Highlights

```typescript
// Security headers: CSP, HSTS, X-Frame-Options, etc.
// Image optimization: Allow picsum.photos remote images
// Standalone output: For serverless deployment
// Transpile motion: Ensure compatibility
// HMR disabled in AI Studio: Watch files prevented
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "plugins": [{ "name": "next" }]
  }
}
```

### ESLint Configuration

- Simple extends: `"next"`
- No custom rules, uses Next.js defaults
- Ignores build errors (configured in next.config.ts)

---

## 16. Summary: Design Philosophy

**The 100x Civilization** embodies a **scroll-narrative UX design**:

1. **Immersive Hero**: Animated constellation + gradient text capture attention
2. **Linear Storytelling**: Problem → Solution → Vision → Team → CTA
3. **Referral Mechanics**: Gamify signup with position + sharing incentives
4. **Atomic Safety**: Firestore transactions ensure data consistency
5. **Performance-First**: Dynamic code splitting, cache headers, optimized builds
6. **Accessibility-Aware**: Motion preferences, semantic HTML, keyboard support
7. **Mobile-Responsive**: Breakpoints for mobile, tablet, desktop
8. **Real-Time Engagement**: Live counters, referral listeners, celebration effects

The codebase prioritizes **user engagement** (animation, gamification) while maintaining **data integrity** (Firestore rules, transactions) and **accessibility** (motion preferences, semantic markup).

---

**Version**: 1.0  
**Last Updated**: 2026-05-05  
**Repository**: pranamyajainn/100x-civilization-
