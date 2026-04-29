import { z } from 'zod';
import { IsoDateSchema, ObjectIdSchema } from './common';

export const RunLogStatusSchema = z.enum(['SUCCEEDED', 'FAILED']);
export const RunLogTriggerSchema = z.enum(['manual', 'scheduled']);

export const RunLogEventSchema = z.object({
  level: z.enum(['info', 'warn', 'error']),
  phase: z.string(),
  message: z.string(),
  at: IsoDateSchema,
});

export const RunLogStatsSchema = z.object({
  newItems: z.number().int().nonnegative(),
  summarized: z.number().int().nonnegative(),
  scored: z.number().int().nonnegative(),
  selected: z.number().int().nonnegative(),
  postsCreated: z.number().int().nonnegative(),
  trendThemes: z.number().int().nonnegative(),
  marketSignals: z.number().int().nonnegative(),
});

export const RunLogDtoSchema = z.object({
  id: ObjectIdSchema,
  projectId: ObjectIdSchema,
  jobId: z.string().nullable(),
  trigger: RunLogTriggerSchema,
  status: RunLogStatusSchema,
  startedAt: IsoDateSchema,
  finishedAt: IsoDateSchema,
  durationMs: z.number().int().nonnegative(),
  stats: RunLogStatsSchema,
  events: z.array(RunLogEventSchema),
  failureReason: z.string().nullable(),
  createdAt: IsoDateSchema,
});

export const RunLogsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type RunLogStatus = z.infer<typeof RunLogStatusSchema>;
export type RunLogTrigger = z.infer<typeof RunLogTriggerSchema>;
export type RunLogEvent = z.infer<typeof RunLogEventSchema>;
export type RunLogStats = z.infer<typeof RunLogStatsSchema>;
export type RunLogDto = z.infer<typeof RunLogDtoSchema>;
export type RunLogsQuery = z.infer<typeof RunLogsQuerySchema>;
