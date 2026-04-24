import { z } from 'zod';
import { ToneSchema } from '../enums';
import { IsoDateSchema, ObjectIdSchema } from './common';

export const ProjectCoreSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(''),
  tone: ToneSchema,
  targetAudience: z.string().min(1).max(500),
  domain: z.string().min(1).max(200),
  topNPerRun: z.number().int().min(1).max(50).default(5),
  isActive: z.boolean().default(true),
});

export const CreateProjectSchema = ProjectCoreSchema.extend({
  // topNPerRun and isActive keep their defaults if omitted.
  topNPerRun: z.number().int().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(2000).optional(),
});

export const UpdateProjectSchema = ProjectCoreSchema.partial();

export const ProjectDtoSchema = ProjectCoreSchema.extend({
  id: ObjectIdSchema,
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
  sourcesCount: z.number().int().nonnegative().optional(),
  contentCount: z.number().int().nonnegative().optional(),
  lastRunAt: IsoDateSchema.nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ProjectDto = z.infer<typeof ProjectDtoSchema>;
