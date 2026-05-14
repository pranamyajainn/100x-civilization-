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
  unsubscribeUrl: string;
}

/**
 * Sends a smart match notification email via the Resend REST API.
 * Returns true on success, false on failure (non-throwing — caller logs the error).
 */
export async function sendMatchNotification(
  payload: NotificationPayload
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("[email] RESEND_API_KEY or RESEND_FROM_EMAIL not set.");
    return false;
  }

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
    `— The 100x Civilization`,
    ``,
    `Unsubscribe: ${payload.unsubscribeUrl}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
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
