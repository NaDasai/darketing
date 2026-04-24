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

export type CreateSourceInput = z.infer<typeof CreateSourceSchema>;
export type SourceDto = z.infer<typeof SourceDtoSchema>;
