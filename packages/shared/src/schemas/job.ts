import { z } from 'zod';

export const JobStateSchema = z.enum([
  'waiting',
  'active',
  'completed',
  'failed',
  'unknown',
]);

// Worker emits structured progress like { phase, message, newItems, ... }.
// We keep it permissive — the FE picks the fields it knows.
export const JobProgressSchema = z
  .object({
    phase: z.string().optional(),
    message: z.string().optional(),
    newItems: z.number().optional(),
    selected: z.number().optional(),
    postsCreated: z.number().optional(),
  })
  .passthrough();

export const JobStatusDtoSchema = z.object({
  id: z.string(),
  state: JobStateSchema,
  progress: z.union([JobProgressSchema, z.number(), z.null()]).optional(),
  failedReason: z.string().nullable().optional(),
  processedOn: z.number().nullable().optional(),
  finishedOn: z.number().nullable().optional(),
});

export type JobState = z.infer<typeof JobStateSchema>;
export type JobProgress = z.infer<typeof JobProgressSchema>;
export type JobStatusDto = z.infer<typeof JobStatusDtoSchema>;
