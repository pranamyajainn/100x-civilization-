import 'server-only';

import { cert, getApp, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "@/firebase-applet-config.json";

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function readServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw || raw === "REPLACE_ME") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  }

  const parsed = JSON.parse(raw) as ServiceAccountJson;

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid.");
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

const adminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert(readServiceAccount()),
      });

const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const adminAuth = getAuth(adminApp);

export { adminApp, adminAuth, adminDb };
