import type { ChatMessages } from './generatePosts';

export interface TrendItemForPrompt {
  title: string;
  summary: string;
}

export interface GenerateTrendsPromptInput {
  domain: string;
  targetAudience: string;
  items: readonly TrendItemForPrompt[];
}

export function generateTrendsPrompt(
  input: GenerateTrendsPromptInput,
): ChatMessages {
  const itemsBlock = input.items
    .map((it, i) => `[${i + 1}] ${it.title}\n    ${it.summary}`)
    .join('\n');

  const system = [
    'You are a senior industry analyst who reviews a batch of newly-ingested articles and identifies the cross-cutting themes worth flagging.',
    'Rules you MUST follow:',
    '1. Identify between 2 and 5 themes. Do not invent themes that are not supported by at least two items.',
    '2. Each theme has a short title (max 8 words) and a 1-2 sentence description grounded in the articles.',
    '3. The headline is one sentence summarizing the dominant story across the batch.',
    '4. Do NOT invent facts, numbers, or names not present in the input.',
    '5. Output ONLY a single JSON object. No markdown fences, no prose.',
    '6. The JSON shape is: {"headline":"...","themes":[{"title":"...","description":"..."}]}',
  ].join('\n');

  const user = [
    `Domain / niche: ${input.domain}`,
    `Target audience: ${input.targetAudience}`,
    '',
    `Newly-ingested items (${input.items.length}):`,
    itemsBlock,
    '',
    'Return the JSON object now.',
  ].join('\n');

  return { system, user };
}
