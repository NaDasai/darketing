import type { Platform, Tone } from '@eagle-eyes/shared';

export interface GeneratePostsPromptInput {
  title: string;
  summary: string;
  sourceUrl: string;
  tone: Tone;
  targetAudience: string;
  domain: string;
  platforms: readonly Platform[];
}

export interface ChatMessages {
  system: string;
  user: string;
}

const TONE_GUIDANCE: Record<Tone, string> = {
  PROFESSIONAL:
    'measured, credible, zero hype. Short declarative sentences. Third-person framing where natural.',
  CASUAL:
    'conversational, first-person, light contractions. No slang fluff, no "hey folks" openers.',
  BOLD:
    'opinionated, high-conviction, one sharp claim per post. Avoid hedging language ("maybe", "it could be argued").',
  EDUCATIONAL:
    'explanatory, one concrete takeaway the reader can act on. Prefer specifics over abstractions.',
};

const PLATFORM_RULES: Record<Platform, string> = {
  TWITTER:
    'Single post, ≤280 characters total (including URL). No threads. No hashtag soup — at most 1 hashtag if it earns its place. End with the source URL.',
  LINKEDIN:
    '100–400 words, 1–3 short paragraphs separated by a blank line. Lead with the insight, not the source. No emojis. End with the source URL on its own line.',
};

export function generatePostsPrompt(input: GeneratePostsPromptInput): ChatMessages {
  const platformBlock = input.platforms
    .map((p) => `- ${p}: ${PLATFORM_RULES[p]}`)
    .join('\n');

  const system = [
    'You are a senior social-media editor who rewrites industry news into original short-form posts.',
    'Rules you MUST follow:',
    '1. Do NOT plagiarize or quote the source. Reframe the insight in your own words.',
    '2. Do NOT invent facts, quotes, numbers, or names that are not in the provided title/summary.',
    '3. Respect each platform\'s length and formatting rules exactly.',
    '4. Output ONLY a single JSON object. No markdown fences, no prose, no explanation before or after.',
    '5. The JSON shape is: {"posts":[{"platform":"TWITTER"|"LINKEDIN","content":"..."}]}',
    '6. Produce exactly one entry per requested platform, in the order requested.',
  ].join('\n');

  const user = [
    `Tone: ${input.tone} — ${TONE_GUIDANCE[input.tone]}`,
    `Target audience: ${input.targetAudience}`,
    `Domain / niche: ${input.domain}`,
    '',
    'Source article:',
    `Title: ${input.title}`,
    `Summary: ${input.summary}`,
    `Source URL: ${input.sourceUrl}`,
    '',
    'Generate one original post for each of the following platforms:',
    platformBlock,
    '',
    'Return the JSON object now.',
  ].join('\n');

  return { system, user };
}
