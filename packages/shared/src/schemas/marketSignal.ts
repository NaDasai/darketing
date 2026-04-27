import { z } from 'zod';
import { IsoDateSchema, ObjectIdSchema } from './common';

export const ASSET_CLASS_VALUES = [
  'crypto',
  'stock',
  'commodity',
  'currency',
  'index',
  'other',
] as const;
export const AssetClassSchema = z.enum(ASSET_CLASS_VALUES);
export type AssetClass = (typeof ASSET_CLASS_VALUES)[number];

export const DIRECTION_VALUES = ['up', 'down', 'uncertain'] as const;
export const DirectionSchema = z.enum(DIRECTION_VALUES);
export type Direction = (typeof DIRECTION_VALUES)[number];

export const CONFIDENCE_VALUES = ['low', 'medium', 'high'] as const;
export const ConfidenceSchema = z.enum(CONFIDENCE_VALUES);
export type Confidence = (typeof CONFIDENCE_VALUES)[number];

export const MarketSignalSchema = z.object({
  asset: z.string().min(1).max(160),
  assetClass: AssetClassSchema,
  direction: DirectionSchema,
  confidence: ConfidenceSchema,
  horizon: z.string().max(80).optional(),
  rationale: z.string().min(1).max(2000),
  supportingContentItemIds: z.array(ObjectIdSchema),
});

export const MarketReportItemRefSchema = z.object({
  contentItemId: ObjectIdSchema,
  title: z.string(),
  sourceUrl: z.string().url(),
});

export const MarketReportDtoSchema = z.object({
  id: ObjectIdSchema,
  projectId: ObjectIdSchema,
  generatedAt: IsoDateSchema,
  signals: z.array(MarketSignalSchema),
  items: z.array(MarketReportItemRefSchema),
  createdAt: IsoDateSchema,
});

export const MarketReportsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type MarketSignal = z.infer<typeof MarketSignalSchema>;
export type MarketReportItemRef = z.infer<typeof MarketReportItemRefSchema>;
export type MarketReportDto = z.infer<typeof MarketReportDtoSchema>;
export type MarketReportsQuery = z.infer<typeof MarketReportsQuerySchema>;
