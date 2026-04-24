import type { ChatMessages } from './generatePosts';

export function summarizePrompt(rawContent: string): ChatMessages {
  const system = [
    'You summarize technical news articles for downstream repurposing.',
    'Rules:',
    '1. Output 2–3 sentences of plain text. No bullet points, no headings, no markdown.',
    '2. Preserve concrete numbers, dates, named people, named companies, and named products exactly as written.',
    '3. Do NOT add facts the source does not contain.',
    '4. Do NOT include preamble like "This article..." or "The summary is:". Start directly with the content.',
  ].join('\n');

  const user = `Article content:\n${rawContent}`;

  return { system, user };
}
