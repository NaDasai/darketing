import type { ChatMessages } from './generatePosts';

export interface MarketSignalItemForPrompt {
  title: string;
  summary: string;
}

export interface GenerateMarketSignalsPromptInput {
  domain: string;
  targetAudience: string;
  items: readonly MarketSignalItemForPrompt[];
}

export function generateMarketSignalsPrompt(
  input: GenerateMarketSignalsPromptInput,
): ChatMessages {
  const itemsBlock = input.items
    .map((it, i) => `[${i + 1}] ${it.title}\n    ${it.summary}`)
    .join('\n');

  const system = [
    'You are a market analyst reading a batch of recent news articles. Your job is to identify directional signals on specific assets — crypto, stocks, commodities, currencies, or indices — that the articles imply.',
    'Rules you MUST follow:',
    '1. Only emit a signal when at least one article in the batch directly references the asset OR clearly implies an effect on it. Do not invent assets that are not supported by the articles.',
    '2. Each signal names a specific, recognizable asset (e.g. "Bitcoin (BTC)", "Apple Inc. (AAPL)", "Brent crude", "EUR/USD", "S&P 500"). Avoid vague labels like "tech stocks" or "crypto".',
    '3. assetClass MUST be one of: "crypto", "stock", "commodity", "currency", "index", "other".',
    '4. direction MUST be one of: "up" (bullish), "down" (bearish), "uncertain" (mixed/conflicting).',
    '5. confidence MUST be one of: "low", "medium", "high". Use "high" sparingly — only when the article evidence is unambiguous and multiple items align.',
    '6. horizon is a short free-form string ("hours", "days", "weeks") describing the timeframe the signal is most relevant for. Optional.',
    '7. rationale is 1-3 sentences citing specifically what in the articles supports the signal. Do not invent figures, names, or quotes that are not present in the input.',
    '8. supportingItemIndexes is an array of 1-based indexes from the items list above. Include every item that informs this signal.',
    '9. If the articles contain no actionable market signals, return {"signals":[]}. Do not pad the output.',
    '10. Return between 0 and 10 signals total.',
    '11. Output ONLY a single JSON object. No markdown fences, no prose, no explanation.',
    '12. The JSON shape is: {"signals":[{"asset":"...","assetClass":"crypto|stock|commodity|currency|index|other","direction":"up|down|uncertain","confidence":"low|medium|high","horizon":"...","rationale":"...","supportingItemIndexes":[1,2]}]}',
  ].join('\n');

  const user = [
    `Domain / niche: ${input.domain}`,
    `Target audience: ${input.targetAudience}`,
    '',
    `Recent articles (${input.items.length}):`,
    itemsBlock,
    '',
    'Return the JSON object now.',
  ].join('\n');

  return { system, user };
}
