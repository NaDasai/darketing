import { z } from 'zod';
import { IsoDateSchema, ObjectIdSchema } from './common';

export const TrendThemeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
});

export const TrendDtoSchema = z.object({
  id: ObjectIdSchema,
  projectId: ObjectIdSchema,
  generatedAt: IsoDateSchema,
  itemCount: z.number().int().nonnegative(),
  headline: z.string(),
  themes: z.array(TrendThemeSchema),
  createdAt: IsoDateSchema,
});

export const TrendsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type TrendTheme = z.infer<typeof TrendThemeSchema>;
export type TrendDto = z.infer<typeof TrendDtoSchema>;
export type TrendsQuery = z.infer<typeof TrendsQuerySchema>;
