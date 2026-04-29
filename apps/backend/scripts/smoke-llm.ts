// Manual sanity check for the OpenRouter wiring.
//
// Run with:   pnpm --filter @eagle-eyes/backend exec tsx scripts/smoke-llm.ts
// Requires OPENROUTER_API_KEY set in apps/backend/.env.
//
// Exits 0 on success, 1 on failure. Prints the summary and the two generated
// posts to stdout so you can eyeball quality.

import { env } from '../src/config/env';
import { logger } from '../src/lib/logger';
import { generatePosts, summarize } from '../src/services/llm.service';

const SAMPLE_ARTICLE = `
OpenAI announced GPT-5 today, claiming a 40% reduction in hallucination rate
compared to GPT-4 on the TruthfulQA benchmark. The model is available via the
API starting at $0.015 per 1K input tokens. Internal testing at Anthropic
showed Claude Opus 4.7 still leading on SWE-Bench Verified with a 72% pass@1,
compared to GPT-5's 65%. Analysts at Gartner predict coding assistants will
drive $8B in enterprise spend by 2027.
`;

async function main(): Promise<void> {
  if (!env.OPENROUTER_API_KEY) {
    logger.error(
      'OPENROUTER_API_KEY is empty. Set it in apps/backend/.env before running this script.',
    );
    process.exitCode = 1;
    return;
  }

  logger.info({ model: env.OPENROUTER_MODEL }, 'smoke-llm: summarize()');
  const summary = await summarize(SAMPLE_ARTICLE);
  logger.info({ summary }, 'smoke-llm: summary ok');

  logger.info('smoke-llm: generatePosts()');
  const result = await generatePosts({
    title: 'OpenAI releases GPT-5 with reduced hallucination rate',
    summary,
    sourceUrl: 'https://example.com/openai-gpt5',
    tone: 'PROFESSIONAL',
    targetAudience: 'Software engineers and AI researchers',
    domain: 'AI, LLMs, developer tools',
    platforms: ['TWITTER', 'LINKEDIN'],
  });

  for (const post of result.posts) {
    logger.info({ platform: post.platform, chars: post.content.length }, post.content);
  }
}

main()
  .catch((err) => {
    logger.error({ err }, 'smoke-llm failed');
    process.exitCode = 1;
  });
