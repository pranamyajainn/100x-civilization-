import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { generateEmbedding } from "@/lib/embeddings";
import { isAdminUser, verifyIdToken } from "@/lib/auth-middleware";
import { sendRejectionEmail, welcomeEmail } from "@/lib/email";
import { extractLinkedInContext, extractLinkedInHandle } from "@/lib/linkedin";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authUser = await verifyIdToken(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAdminUser(authUser.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const targetUid = typeof body.uid === "string" ? body.uid : "";
    const action =
      body.action === "approve" || body.action === "reject" ? body.action : null;

    if (!targetUid || !action) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const pendingRef = adminDb.collection("pending_users").doc(targetUid);
    const userRef = adminDb.collection("users").doc(targetUid);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      return NextResponse.json({ error: "Pending user not found" }, { status: 404 });
    }

    const pendingUser = pendingDoc.data() ?? {};
    const recipientEmail =
      typeof pendingUser.email === "string" ? pendingUser.email : "";
    const recipientName =
      typeof pendingUser.fullName === "string" ? pendingUser.fullName : "there";
    const warnings: string[] = [];

    if (action === "reject") {
      const batch = adminDb.batch();
      batch.set(
        pendingRef,
        {
          status: "rejected",
          reviewedAt: FieldValue.serverTimestamp(),
          reviewedBy: authUser.uid,
        },
        { merge: true }
      );
      batch.set(
        userRef,
        {
          uid: targetUid,
          status: "rejected",
          onboardingComplete: false,
          hiddenFromFeed: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await batch.commit();

      if (recipientEmail) {
        const emailSent = await sendRejectionEmail({
          to: recipientEmail,
          recipientName,
        });
        if (!emailSent) {
          warnings.push("The user was rejected, but the rejection email could not be sent.");
        }
      }

      return NextResponse.json({ success: true, status: "rejected", warnings });
    }

    let embedding =
      Array.isArray(pendingUser.embedding) && pendingUser.embedding.length > 0
        ? pendingUser.embedding
        : [];

    const fullName = typeof pendingUser.fullName === "string" ? pendingUser.fullName : "";
    const currentRole = typeof pendingUser.currentRole === "string" ? pendingUser.currentRole : "";
    const cohort = typeof pendingUser.cohort === "string" ? pendingUser.cohort : "";
    const linkedinUrl = typeof pendingUser.linkedinUrl === "string" ? pendingUser.linkedinUrl : "";
    const skillTags = Array.isArray(pendingUser.skillTags)
      ? pendingUser.skillTags.filter((tag): tag is string => typeof tag === "string")
      : [];
    const linkedinContext = extractLinkedInContext(linkedinUrl);
    const linkedinHandle = extractLinkedInHandle(linkedinUrl);
    const embeddingInput = [
      fullName,
      currentRole ? `currentRole: ${currentRole}` : '',
      `cohort ${cohort}`,
      `skills: ${skillTags.join(', ')}`,
      `linkedin: ${linkedinHandle}`,
      `background: ${linkedinContext}`,
    ]
      .filter((part) => part.trim().length > 0)
      .join("\n");

    if (embeddingInput.trim().length > 0) {
      try {
        embedding = await generateEmbedding(embeddingInput);
      } catch (error) {
        console.error("[admin/approve] embedding generation failed:", error);
        warnings.push("The user was approved, but embedding generation failed.");
      }
    }

    const batch = adminDb.batch();
    batch.set(
      userRef,
      {
        ...pendingUser,
        uid: targetUid,
        embedding,
        status: "approved",
        onboardingComplete: true,
        celebrationShown: false,
        hiddenFromFeed: false,
        isFoundingMember: true,
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batch.delete(pendingRef);
    await batch.commit();

    if (recipientEmail) {
      const emailSent = await welcomeEmail(recipientName, recipientEmail);
      if (!emailSent) {
        console.error("[admin/approve] welcome email failed for", targetUid);
        warnings.push("The user was approved, but the welcome email could not be sent.");
      }
    }

    return NextResponse.json({ success: true, status: "approved", warnings });
  } catch (error) {
    console.error("[admin/approve] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
