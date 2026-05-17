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

  const subject = `New ${typeLabel} opportunity matches ${skillList}`;

  const text = [
    `Hi ${payload.recipientName},`,
    ``,
    `A new opportunity was posted by ${payload.posterName} (${payload.posterCohort}) that matches your skills in ${skillList}.`,
    ``,
    `Type: ${typeLabel}`,
    `Title: ${payload.opportunityTitle}`,
    ``,
    `View and reply here: ${payload.postUrl}`,
    ``,
    `Manage notifications: ${payload.settingsUrl}`,
    ``,
    `— The 100x Civilization`,
  ].join("\n");

  return sendTextEmail(payload.to, subject, text);
}

export const sendMatchNotification = matchNotificationEmail;

export async function pendingApprovalEmail(name: string, email: string): Promise<boolean> {
  const subject = `You're through the door, ${name}.`;
  const text = [
    `Hi ${name},`,
    ``,
    `Your profile is with us.`,
    ``,
    `We review every member personally — this is how`,
    `we keep the network worth being in.`,
    ``,
    `You'll hear from us within 24 hours either way.`,
    ``,
    `— The 100x Civilization team`,
  ].join("\n");

  return sendTextEmail(email, subject, text);
}

export async function welcomeEmail(name: string, email: string, memberCount?: number): Promise<boolean> {
  const subject = `The door is open, ${name}.`;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const lines = [
    `Hi ${name},`,
    ``,
    `You're in.`,
    ``,
  ];

  if (memberCount && memberCount > 0) {
    lines.push(`${memberCount} people are waiting to meet you.`);
  }

  lines.push(
    `Head here to start:`,
    `${appUrl}/app/feed`,
    ``,
    `Post what you need or browse who's here.`,
    `The network works when people use it.`,
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
  const subject = "You're in. Welcome to 100x Civilization.";
  const text = [
    `Hi ${payload.recipientName},`,
    ``,
    `You're approved. Head here to start:`,
    `${appUrl}/app/feed`,
    ``,
    `Post an opportunity or browse what's live.`,
    `The network works when people use it.`,
    ``,
    `— The 100x Civilization team`,
  ].join("\n");

  return sendTextEmail(payload.to, subject, text);
}

export async function sendRejectionEmail(payload: {
  to: string;
  recipientName: string;
}): Promise<boolean> {
  const subject = "Your 100x Civilization profile update";
  const text = [
    `Hi ${payload.recipientName},`,
    ``,
    `We reviewed your submission and could not approve it at this time.`,
    `Reply to this email if you think this was a mistake or want to share more context.`,
    ``,
    `— The 100x Civilization`,
  ].join("\n");

  return sendTextEmail(payload.to, subject, text);
}

export async function abandonedOnboardingEmail(
  name: string,
  email: string,
  appUrl: string,
): Promise<void> {
  const subject = "You're one step away from 100x Civilization";
  const text = [
    `Hi ${name},`,
    ``,
    `You started joining 100x Civilization but didn't finish your profile.`,
    ``,
    `It takes 2 minutes. Complete it here:`,
    `${appUrl}/app/onboarding`,
    ``,
    `Once submitted, we review and approve within 24 hours.`,
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
