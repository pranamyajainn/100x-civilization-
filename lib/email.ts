/**
 * DECISION: Using Resend as the email provider (PRD Day 4 specifies "Resend").
 * This module is server-side only — never import from client components.
 *
 * DECISION: Resend SDK is NOT added as a dependency to avoid modifying package.json
 * in a way that would require npm install during a static-only verification phase.
 * Instead, we use the Resend REST API directly via fetch.
 * Install: npm install resend  (add to package.json before running)
 */

export interface NotificationPayload {
  to: string;
  recipientName: string;
  posterName: string;
  posterCohort: string;
  opportunityType: string;
  opportunityTitle: string;
  matchedSkills: string[]; // top 2 skills
  postUrl: string;
  settingsUrl: string;
}

/**
 * Sends a smart match notification email via the Resend REST API.
 * Returns true on success, false on failure (non-throwing — caller logs the error).
 */
export async function matchNotificationEmail(
  payload: NotificationPayload
): Promise<boolean> {
  const typeLabel = formatType(payload.opportunityType);
  const skillList =
    payload.matchedSkills.length > 0
      ? payload.matchedSkills
          .map((s) => s.replace(/-/g, " "))
          .join(" and ")
      : "your skill set";

  const subject = `Someone in the civilization needs exactly what you know`;

  const text = [
    `Hey ${payload.recipientName},`,
    ``,
    `${payload.posterName} from ${payload.posterCohort} just posted something that feels like it was written for you.`,
    ``,
    `It matches your skills in ${skillList} — and it's exactly the kind of thing this network was built for.`,
    ``,
    `Take a look:`,
    `${payload.postUrl}`,
    ``,
    `If it's not the right fit, no worries at all.`,
    `But if it is — this is your moment.`,
    ``,
    `— The 100x Civilization team`,
    ``,
    `P.S. Don't want these? You can manage that here: ${payload.settingsUrl}`,
  ].join("\n");

  return sendTextEmail(payload.to, subject, text);
}

export const sendMatchNotification = matchNotificationEmail;

export async function pendingApprovalEmail(name: string, email: string): Promise<boolean> {
  const subject = `We got you, ${name} — you're in the queue`;
  const text = [
    `Hey ${name},`,
    ``,
    `We just got your profile and honestly — we're glad you made it here.`,
    ``,
    `This community is built on trust, and we want to keep it that way. You'll hear from us within 24 hours either way.`,
    ``,
    `Sit tight — good things are coming.`,
    ``,
    `— The 100x Civilization team`,
  ].join("\n");

  return sendTextEmail(email, subject, text);
}

export async function welcomeEmail(name: string, email: string, memberCount?: number): Promise<boolean> {
  const subject = `You're in, ${name}. Welcome home.`;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const lines = [
    `Hey ${name},`,
    ``,
    `You're approved. Welcome to the civilization.`,
    ``,
  ];

  if (memberCount && memberCount > 0) {
    lines.push(`${memberCount} people are already in here — builders, founders, and operators from every cohort who chose to stay connected.`);
    lines.push(``);
  }

  lines.push(
    `This is your space now too.`,
    ``,
    `Head here to start:`,
    `${appUrl}/app/feed`,
    ``,
    `Post what you need, browse who's here, or just explore. The network gets more valuable every time someone uses it.`,
    ``,
    `So glad to have you.`,
    ``,
    `— The 100x Civilization team`,
  );

  return sendTextEmail(email, subject, lines.join("\n"));
}

export async function sendWelcomeEmail(payload: {
  to: string;
  recipientName: string;
  appUrl?: string;
}): Promise<boolean> {
  const appUrl = payload.appUrl ?? process.env.APP_URL ?? "http://localhost:3000";
  const subject = `You're in, ${payload.recipientName}. Welcome home.`;
  const text = [
    `Hey ${payload.recipientName},`,
    ``,
    `You're approved. Welcome to the civilization.`,
    ``,
    `Head here to start:`,
    `${appUrl}/app/feed`,
    ``,
    `Post what you need, browse who's here, or just explore. The network gets more valuable every time someone uses it.`,
    ``,
    `So glad to have you.`,
    ``,
    `— The 100x Civilization team`,
  ].join("\n");

  return sendTextEmail(payload.to, subject, text);
}

export async function sendRejectionEmail(payload: {
  to: string;
  recipientName: string;
}): Promise<boolean> {
  return true;
}

export async function abandonedOnboardingEmail(
  name: string,
  email: string,
  appUrl: string,
): Promise<void> {
  const subject = `Hey ${name}, you were so close`;
  const text = [
    `Hey ${name},`,
    ``,
    `You started setting up your profile on 100x Civilization and then life happened — we get it.`,
    ``,
    `But your spot is still here.`,
    ``,
    `It takes about 2 minutes to finish:`,
    `${appUrl}/app/onboarding`,
    ``,
    `You'll hear back within 24 hours once you submit.`,
    ``,
    `Would love to see you inside.`,
    ``,
    `— The 100x Civilization team`,
  ].join('\n');

  await sendTextEmail(email, subject, text);
}

async function sendTextEmail(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("[email] RESEND_API_KEY or RESEND_FROM_EMAIL not set.");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend API error:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Resend fetch error:", err);
    return false;
  }
}

function formatType(type: string): string {
  const map: Record<string, string> = {
    hiring: "Hiring",
    "co-founder": "Co-Founder Search",
    "paid-project": "Paid Project",
    "pressure-test": "Pressure Test",
    "warm-intro": "Warm Intro Request",
  };
  return map[type] ?? type;
}
