import mongoose, { type FilterQuery } from 'mongoose';
import type {
  AiEditPostInput,
  AiEditPostResult,
  PaginatedPosts,
  PostDto,
  PostsQuery,
  UpdatePostInput,
} from '@eagle-eyes/shared';
import {
  GeneratedPostModel,
  ProjectModel,
  type IGeneratedPost,
} from '../../models';
import { editPost as llmEditPost } from '../../services/llm.service';

function toDto(doc: { toJSON: () => unknown }): PostDto {
  return doc.toJSON() as PostDto;
}

export class InvalidCursorError extends Error {
  constructor() {
    super('Invalid cursor');
    this.name = 'InvalidCursorError';
  }
}

export async function listPosts(query: PostsQuery): Promise<PaginatedPosts> {
  const filter: FilterQuery<IGeneratedPost> = {};
  if (query.projectId) filter.projectId = query.projectId;
  if (query.status) filter.status = query.status;
  if (query.platform) filter.platform = query.platform;

  if (query.cursor) {
    if (!mongoose.isValidObjectId(query.cursor)) {
      throw new InvalidCursorError();
    }
    filter._id = { $lt: new mongoose.Types.ObjectId(query.cursor) };
  }

  // Keyset pagination by _id desc (monotonic under ObjectId). Fetch one extra
  // to detect "hasMore" without a separate count query.
  const docs = await GeneratedPostModel.find(filter)
    .sort({ _id: -1 })
    .limit(query.limit + 1);

  const hasMore = docs.length > query.limit;
  const page = hasMore ? docs.slice(0, query.limit) : docs;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return {
    items: page.map(toDto),
    nextCursor,
  };
}

export async function getPost(id: string): Promise<PostDto | null> {
  const doc = await GeneratedPostModel.findById(id);
  return doc ? toDto(doc) : null;
}

export async function updatePost(
  id: string,
  input: UpdatePostInput,
): Promise<PostDto | null> {
  const updated = await GeneratedPostModel.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  });
  return updated ? toDto(updated) : null;
}

export class PostNotFoundError extends Error {
  constructor() {
    super('Post not found');
    this.name = 'PostNotFoundError';
  }
}

export class ProjectMissingError extends Error {
  constructor() {
    super('Project for this post no longer exists');
    this.name = 'ProjectMissingError';
  }
}

export async function aiEditPost(
  id: string,
  input: AiEditPostInput,
): Promise<AiEditPostResult> {
  const post = await GeneratedPostModel.findById(id);
  if (!post) throw new PostNotFoundError();

  const project = await ProjectModel.findById(post.projectId);
  if (!project) throw new ProjectMissingError();

  const content = await llmEditPost({
    currentContent: input.currentContent,
    instruction: input.instruction,
    platform: post.platform,
    tone: project.tone,
    targetAudience: project.targetAudience,
    domain: project.domain,
  });

  return { content };
}
