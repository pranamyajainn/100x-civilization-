/**
 * DECISION: Cosine similarity is computed in the application layer (not pgvector)
 * because the project uses Firebase/Firestore rather than Supabase+pgvector.
 * This is consistent with PRD Assumption #9: "If pgvector not available, cosine
 * similarity computed in application layer on retrieval."
 *
 * DECISION: Top N defaults to 5 matches per post. Configurable via the exported
 * constant. Adjust before launch based on cohort size.
 */

export const TOP_N_MATCHES = 5;

/**
 * Computes the cosine similarity between two equal-length embedding vectors.
 * Returns a value in [-1, 1]; higher is more similar.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  cohort: string;
  skillTags: string[];
  embedding: number[] | null;
  notificationsEnabled: boolean;
  hiddenFromFeed?: boolean; // true when user has withdrawn consent
}

export interface PostDoc {
  title: string;
  type: string;
  description: string;
  skillTags?: string[];
  embedding: number[] | null;
}

export interface MatchResult {
  uid: string;
  email: string;
  fullName: string;
  cohort: string;
  score: number;
  matchedSkills: string[]; // top 2 matching skills for email copy
}

/**
 * Ranks alumni profiles against a post using cosine similarity.
 * Falls back to keyword overlap if either the post or any profile lacks an embedding.
 *
 * @param post  - The newly created post with its embedding.
 * @param users - All alumni profiles with their embeddings and skill tags.
 * @param topN  - Maximum number of matches to return.
 */
export function rankMatches(
  post: PostDoc,
  users: UserProfile[],
  excludeUid: string, // poster's own uid — do not notify them
  topN: number = TOP_N_MATCHES
): MatchResult[] {
  const eligible = users.filter(
    (u) => u.uid !== excludeUid && u.notificationsEnabled && !u.hiddenFromFeed
  );

  const useEmbedding = post.embedding !== null && post.embedding.length > 0;

  const scored = eligible.map((user) => {
    let score: number;

    if (useEmbedding && user.embedding && user.embedding.length > 0) {
      score = cosineSimilarity(post.embedding!, user.embedding);
    } else {
      // Keyword overlap fallback
      score = keywordOverlapScore(post.skillTags ?? [], user.skillTags);
    }

    const matchedSkills = topMatchingSkills(
      post.skillTags ?? [],
      user.skillTags,
      2
    );

    return { uid: user.uid, email: user.email, fullName: user.fullName, cohort: user.cohort, score, matchedSkills };
  });

  return scored
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Keyword overlap fallback: Jaccard-like score of matching skill tags.
 */
function keywordOverlapScore(
  postTags: string[],
  userTags: string[]
): number {
  if (postTags.length === 0 || userTags.length === 0) return 0;
  const postSet = new Set(postTags.map((t) => t.toLowerCase()));
  const userSet = new Set(userTags.map((t) => t.toLowerCase()));
  const intersection = [...postSet].filter((t) => userSet.has(t)).length;
  const union = new Set([...postSet, ...userSet]).size;
  return intersection / union;
}

/**
 * Returns the top K skill tags common between post and user (for email copy).
 */
function topMatchingSkills(
  postTags: string[],
  userTags: string[],
  k: number
): string[] {
  const postSet = new Set(postTags.map((t) => t.toLowerCase()));
  return userTags
    .filter((t) => postSet.has(t.toLowerCase()))
    .slice(0, k);
}
