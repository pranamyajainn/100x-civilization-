# The 100x Civilization

Members-only exclusive economic engine for 100x cohorts. A community proposal landing page to mirror the 100x Engineers brand.

*Note: This is a community project and not an official 100x Engineers product.*

## Setup & Deployment

Our stack relies on Next.js 14 App Router, standard Tailwind CSS, Framer Motion, and a lightweight client-side Firebase integration for waitlist signups.

### Firebase Configuration (AI Studio)

You have successfully connected this project to a Google Cloud Firebase backend using the built-in AI Studio integration.
- The `lib/firebase.ts` file automatically imports your configuration from `firebase-applet-config.json`.
- Environment variables (`NEXT_PUBLIC_FIREBASE_*`) are no longer necessary for deployment within the AI Studio environment, as the configuration is bundled with the build.
- When exporting this applet to GitHub or Vercel, you can swap out the imported config with environment variables if you prefer.

### 4. Vercel Deployment

1. Push your repository to GitHub.
2. In the Vercel dashboard, click "Add New..." -> "Project".
3. Import your GitHub repository.
4. Before clicking "Deploy", expand the "Environment Variables" section.
5. Add all 6 `NEXT_PUBLIC_FIREBASE_*` environment variables matching your local setup.
6. Hit Deploy. Performance tuning and Lighthouse constraints will automatically hold up through the build.

### 5. Viewing Signups

1. In the Firebase Console, navigate to the **Firestore Database**.
2. Go to the "Data" tab.
3. You will see a collection named `waitlist_signups` populated with cohort members requesting access.
