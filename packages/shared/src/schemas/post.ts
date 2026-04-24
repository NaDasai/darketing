import { z } from 'zod';
import { PlatformSchema, PostStatusSchema, PostVariantSchema } from '../enums';
import { IsoDateSchema, ObjectIdSchema } from './common';

export const UpdatePostSchema = z
  .object({
    editedContent: z.string().max(10000).optional(),
    status: PostStatusSchema.optional(),
  })
  .refine((d) => d.editedContent !== undefined || d.status !== undefined, {
    message: 'At least one of editedContent or status is required',
  });

export const PostDtoSchema = z.object({
  id: ObjectIdSchema,
  projectId: ObjectIdSchema,
  contentItemId: ObjectIdSchema,
  platform: PlatformSchema,
  variant: PostVariantSchema.nullable(),
  content: z.string(),
  editedContent: z.string().nullable(),
  status: PostStatusSchema,
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export const PostsQuerySchema = z.object({
  projectId: ObjectIdSchema.optional(),
  status: PostStatusSchema.optional(),
  platform: PlatformSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
});

export const PaginatedPostsSchema = z.object({
  items: z.array(PostDtoSchema),
  nextCursor: z.string().nullable(),
});

export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type PostDto = z.infer<typeof PostDtoSchema>;
export type PostsQuery = z.infer<typeof PostsQuerySchema>;
export type PaginatedPosts = z.infer<typeof PaginatedPostsSchema>;
