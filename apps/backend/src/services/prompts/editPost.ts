import type { Platform, Tone } from '@darketing/shared';
import type { ChatMessages } from './generatePosts';

export interface EditPostPromptInput {
  currentContent: string;
  instruction: string;
  platform: Platform;
  tone: Tone;
  targetAudience: string;
  domain: string;
}

const TONE_GUIDANCE: Record<Tone, string> = {
  PROFESSIONAL:
    'measured, credible, zero hype. Short declarative sentences. Third-person framing where natural.',
  CASUAL:
    'conversational, first-person, light contractions. No slang fluff, no "hey folks" openers.',
  BOLD:
    'opinionated, high-conviction, one sharp claim. Avoid hedging language ("maybe", "it could be argued").',
  EDUCATIONAL:
    'explanatory, one concrete takeaway the reader can act on. Prefer specifics over abstractions.',
};

const PLATFORM_RULES: Record<Platform, string> = {
  TWITTER:
    'Single post, ≤280 characters total (including any URL). No threads. No hashtag soup — at most 1 hashtag if it earns its place. Keep any source URL that was already present.',
  LINKEDIN:
    '100–400 words, 1–3 short paragraphs separated by a blank line. Lead with the insight. No emojis. Keep any source URL that was already present, on its own line at the end.',
};

export function editPostPrompt(input: EditPostPromptInput): ChatMessages {
  const system = [
    'You are a senior social-media editor. You rewrite an existing draft post according to a specific user instruction.',
    'Rules you MUST follow:',
    '1. Do NOT invent facts, quotes, numbers, or names that are not in the existing draft.',
    '2. Preserve the source URL if one is present in the draft.',
    `3. Respect the platform rules exactly: ${PLATFORM_RULES[input.platform]}`,
    `4. Keep the requested tone: ${input.tone} — ${TONE_GUIDANCE[input.tone]}`,
    '5. Apply the user instruction faithfully. If the instruction conflicts with the platform rules (e.g. "make it 500 words" on Twitter), the platform rules win.',
    '6. Output ONLY the rewritten post as plain text. No preamble, no explanation, no markdown fences, no quotes around the output.',
  ].join('\n');

  const user = [
    `Platform: ${input.platform}`,
    `Target audience: ${input.targetAudience}`,
    `Domain / niche: ${input.domain}`,
    '',
    'Current draft:',
    input.currentContent,
    '',
    `Instruction: ${input.instruction}`,
    '',
    'Return the rewritten post now, as plain text only.',
  ].join('\n');

  return { system, user };
}
