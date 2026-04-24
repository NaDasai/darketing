import { z } from 'zod';
import { IsoDateSchema, ObjectIdSchema } from './common';

export const CreateSourceSchema = z.object({
  rssUrl: z.string().url(),
});

export const SourceDtoSchema = z.object({
  id: ObjectIdSchema,
  projectId: ObjectIdSchema,
  rssUrl: z.string().url(),
  isActive: z.boolean(),
  lastFetchedAt: IsoDateSchema.nullable(),
  createdAt: IsoDateSchema,
});

export const DiscoverFeedsSchema = z.object({
  url: z.string().url(),
});

export const DiscoveredFeedSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable(),
  type: z.enum(['rss', 'atom', 'unknown']),
});

export const DiscoverFeedsResultSchema = z.object({
  feeds: z.array(DiscoveredFeedSchema),
});

export type CreateSourceInput = z.infer<typeof CreateSourceSchema>;
export type SourceDto = z.infer<typeof SourceDtoSchema>;
export type DiscoverFeedsInput = z.infer<typeof DiscoverFeedsSchema>;
export type DiscoveredFeed = z.infer<typeof DiscoveredFeedSchema>;
export type DiscoverFeedsResult = z.infer<typeof DiscoverFeedsResultSchema>;
