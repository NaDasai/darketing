import mongoose, { type FilterQuery } from 'mongoose';
import type {
  PaginatedPosts,
  PostDto,
  PostsQuery,
  UpdatePostInput,
} from '@darketing/shared';
import { GeneratedPostModel, type IGeneratedPost } from '../../models';

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
