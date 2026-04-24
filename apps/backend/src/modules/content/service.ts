import mongoose, { type FilterQuery } from 'mongoose';
import type {
  ContentItemDto,
  ContentQuery,
  PaginatedContent,
} from '@darketing/shared';
import {
  ContentItemModel,
  ProjectModel,
  type IContentItem,
} from '../../models';

function toDto(doc: { toJSON: () => unknown }): ContentItemDto {
  return doc.toJSON() as ContentItemDto;
}

export class InvalidCursorError extends Error {
  constructor() {
    super('Invalid cursor');
    this.name = 'InvalidCursorError';
  }
}

export async function projectExists(projectId: string): Promise<boolean> {
  return (await ProjectModel.countDocuments({ _id: projectId })) > 0;
}

export async function listContentForProject(
  projectId: string,
  query: ContentQuery,
): Promise<PaginatedContent> {
  const filter: FilterQuery<IContentItem> = { projectId };
  if (query.selected !== undefined) filter.selected = query.selected;

  if (query.cursor) {
    if (!mongoose.isValidObjectId(query.cursor)) {
      throw new InvalidCursorError();
    }
    filter._id = { $lt: new mongoose.Types.ObjectId(query.cursor) };
  }

  // Keyset pagination by _id desc (monotonic under ObjectId, matches the
  // recency-first ordering). Fetch one extra to detect hasMore without a
  // separate count query.
  const docs = await ContentItemModel.find(filter)
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
