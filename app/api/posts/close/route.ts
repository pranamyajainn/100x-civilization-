import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const postId = typeof body.postId === "string" ? body.postId : "";

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const postDoc = await adminDb.collection("posts").doc(postId).get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postDoc.data()!;
    const authorUid = post.authorUid ?? post.posterUid;

    if (authorUid !== authUser.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await adminDb.collection("posts").doc(postId).update({ status: "closed" });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[posts/close] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
