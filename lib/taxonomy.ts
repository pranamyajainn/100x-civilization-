/**
 * DECISION: Taxonomy is a static constant exported from this module.
 * Terms are normalized to lowercase with hyphens for storage consistency.
 * The onboarding form uses this list for autocomplete and rejects any
 * term not present in this array. New terms must be added here before launch.
 */

export const SKILL_TAXONOMY: readonly string[] = [
  // AI / ML
  "machine-learning",
  "deep-learning",
  "natural-language-processing",
  "computer-vision",
  "llm-engineering",
  "prompt-engineering",
  "mlops",
  "data-science",
  "reinforcement-learning",
  "fine-tuning",
  "rag-systems",
  "vector-databases",
  "embeddings",
  "ai-agents",
  "data-engineering",
  "data-analysis",
  "analytics",
  "python",
  "pytorch",
  "tensorflow",
  "huggingface",
  "langchain",

  // Backend Engineering
  "backend-development",
  "node-js",
  "python-backend",
  "go",
  "rust",
  "java",
  "scala",
  "ruby-on-rails",
  "django",
  "fastapi",
  "express",
  "graphql",
  "rest-apis",
  "microservices",
  "system-design",
  "distributed-systems",
  "database-design",
  "postgresql",
  "mysql",
  "mongodb",
  "redis",
  "kafka",
  "rabbitmq",
  "elasticsearch",

  // Frontend Engineering
  "frontend-development",
  "react",
  "next-js",
  "vue-js",
  "angular",
  "typescript",
  "javascript",
  "css",
  "tailwind-css",
  "figma-to-code",
  "webgl",
  "three-js",
  "animation",
  "accessibility",
  "performance-optimization",

  // Mobile
  "ios-development",
  "android-development",
  "react-native",
  "flutter",
  "swift",
  "kotlin",

  // DevOps / Infra
  "devops",
  "aws",
  "gcp",
  "azure",
  "kubernetes",
  "docker",
  "terraform",
  "ci-cd",
  "linux",
  "networking",
  "security",
  "cloud-architecture",

  // Product
  "product-management",
  "product-strategy",
  "user-research",
  "roadmapping",
  "agile",
  "b2b-product",
  "b2c-product",
  "api-product",
  "developer-tools",
  "0-to-1",

  // Design
  "ui-design",
  "ux-design",
  "product-design",
  "brand-design",
  "motion-design",
  "design-systems",
  "user-testing",
  "figma",

  // Growth / Marketing
  "growth-hacking",
  "performance-marketing",
  "meta-ads",
  "google-ads",
  "seo",
  "content-marketing",
  "email-marketing",
  "community-building",
  "influencer-marketing",
  "social-media",
  "copywriting",
  "brand-strategy",

  // Sales / BD
  "sales",
  "enterprise-sales",
  "b2b-sales",
  "business-development",
  "partnerships",
  "crm",
  "outbound",
  "account-management",

  // Finance / Legal
  "financial-modeling",
  "fundraising",
  "venture-capital",
  "angel-investing",
  "due-diligence",
  "startup-finance",
  "accounting",
  "legal-contracts",
  "cap-table",

  // Founding / Strategy
  "founder",
  "co-founding",
  "startup-ops",
  "go-to-market",
  "pricing-strategy",
  "competitive-analysis",
  "market-research",
  "technical-writing",
  "pitch-decks",
  "investor-relations",

  // Domain / Industry
  "d2c",
  "e-commerce",
  "edtech",
  "fintech",
  "healthtech",
  "saas",
  "marketing",
  "content-creation",
  "video-production",
  "operations",
  "finance",
  "ui-ux-design",
  "graphic-design",
  "real-estate",
  "legal-tech",
  "supply-chain",
  "manufacturing",
  "consulting",
  "public-relations",

  // Education / Academic Background
  "computer-science",
  "machine-learning-research",
  "cybersecurity",
  "blockchain",
  "embedded-systems",
  "robotics",
  "business-administration",
  "mba",
  "economics",
  "commerce",
  "chartered-accountancy",
  "digital-marketing",
  "human-resources",
  "recruitment",
  "project-management",
  "agile-scrum",
  "pharmaceutical",
  "biotechnology",
  "civil-engineering",
  "mechanical-engineering",
  "electrical-engineering",
  "architecture",
  "journalism",
  "film-production",
  "music-production",
  "game-development",
  "ar-vr",
  "quantum-computing",
] as const;

export type SkillTag = (typeof SKILL_TAXONOMY)[number];

/**
 * Returns true if the provided term is a valid taxonomy skill.
 */
export function isValidSkill(term: string): boolean {
  return SKILL_TAXONOMY.includes(term as SkillTag);
}

/**
 * Returns a human-readable label for a skill tag (replaces hyphens with spaces,
 * title-cases the result).
 */
export function skillLabel(tag: string): string {
  return tag
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
