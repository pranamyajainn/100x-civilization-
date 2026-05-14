/**
 * scripts/seed-cleanup.ts
 *
 * Removes all documents where isSeedData === true from:
 * - users collection
 * - posts collection
 *
 * Run with: npx ts-node scripts/seed-cleanup.ts
 *
 * SAFETY: Only touches documents explicitly marked isSeedData: true.
 * Never touches waitlist_signups, metadata, connections, invites, notifications,
 * or any document without the isSeedData field set to true.
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const configPath = path.resolve(__dirname, "../firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const { projectId, firestoreDatabaseId: dbId, apiKey } = firebaseConfig;
const BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents`;

async function firestoreQuery(collectionId: string): Promise<string[]> {
  const url = `${BASE}:runQuery?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: "isSeedData" },
            op: "EQUAL",
            value: { booleanValue: true },
          },
        },
        limit: 500,
      },
    }),
  });

  if (!res.ok) {
    console.error(`Query failed for ${collectionId}:`, await res.text());
    return [];
  }

  const rows: any[] = await res.json();
  return rows
    .filter((r) => r.document?.name)
    .map((r) => r.document.name); // full resource names
}

async function firestoreDelete(resourceName: string): Promise<void> {
  // resourceName format: projects/{p}/databases/{d}/documents/{col}/{id}
  const docPath = resourceName.split("/documents/")[1];
  const url = `${BASE}/${docPath}?key=${apiKey}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    console.error(`Delete failed for ${resourceName}:`, await res.text());
  }
}

async function cleanCollection(collectionId: string): Promise<number> {
  console.log(`\n🔍  Querying ${collectionId} for seed documents...`);
  const names = await firestoreQuery(collectionId);

  if (names.length === 0) {
    console.log(`   No seed documents found in ${collectionId}.`);
    return 0;
  }

  console.log(`   Found ${names.length} seed document(s). Deleting...`);
  let deleted = 0;

  for (const name of names) {
    const docId = name.split("/").pop();
    process.stdout.write(`   Deleting ${docId}... `);
    await firestoreDelete(name);
    console.log("✓");
    deleted++;
    await new Promise((r) => setTimeout(r, 100)); // small delay
  }

  return deleted;
}

async function main() {
  console.log("🧹  100x Civilization — Seed Cleanup");
  console.log("─────────────────────────────────────");
  console.log(`Project: ${projectId}`);
  console.log(`Database: ${dbId}`);
  console.log("\n⚠️  This will ONLY delete documents marked isSeedData: true.");
  console.log("   Production data is not affected.\n");

  // Delay 2s to let operator abort
  console.log("Starting in 2 seconds... (Ctrl+C to abort)");
  await new Promise((r) => setTimeout(r, 2000));

  const collectionsToClean = ["users", "posts"];
  let totalDeleted = 0;

  for (const col of collectionsToClean) {
    totalDeleted += await cleanCollection(col);
  }

  console.log(`\n✅  Cleanup complete. ${totalDeleted} seed document(s) deleted.`);
}

main().catch((err) => {
  console.error("❌  Cleanup failed:", err);
  process.exit(1);
});
