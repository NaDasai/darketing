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
});

export type ContentItemDto = z.infer<typeof ContentItemDtoSchema>;
export type ContentQuery = z.infer<typeof ContentQuerySchema>;
