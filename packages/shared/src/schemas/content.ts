import { z } from 'zod';
import { BooleanStringSchema, IsoDateSchema, ObjectIdSchema } from './common';

export const ContentItemDtoSchema = z.object({
  id: ObjectIdSchema,
  projectId: ObjectIdSchema,
  sourceId: ObjectIdSchema,
  sourceUrl: z.string().url(),
  title: z.string(),
  summary: z.string().nullable(),
  score: z.number().nullable(),
  selected: z.boolean(),
  publishedAt: IsoDateSchema.nullable(),
  createdAt: IsoDateSchema,
});

export const ContentQuerySchema = z.object({
  selected: BooleanStringSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1),
});

export const PaginatedContentSchema = z.object({
  items: z.array(ContentItemDtoSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export type ContentItemDto = z.infer<typeof ContentItemDtoSchema>;
export type ContentQuery = z.infer<typeof ContentQuerySchema>;
export type PaginatedContent = z.infer<typeof PaginatedContentSchema>;
