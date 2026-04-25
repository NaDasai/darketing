import type { FilterQuery } from 'mongoose';
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

export async function projectExists(projectId: string): Promise<boolean> {
  return (await ProjectModel.countDocuments({ _id: projectId })) > 0;
}

export async function listContentForProject(
  projectId: string,
  query: ContentQuery,
): Promise<PaginatedContent> {
  const filter: FilterQuery<IContentItem> = { projectId };
  if (query.selected !== undefined) filter.selected = query.selected;

  const skip = (query.page - 1) * query.limit;

  // Offset pagination: OK at MVP scale (a project's content list rarely
  // exceeds a few thousand rows). Revisit if large collections push skip
  // into noticeable latency.
  // Sort by source publish date desc (what the article was actually posted),
  // tie-break by _id desc so ingestion order decides among items sharing a
  // publish timestamp. MongoDB sorts null after dates in desc order, so
  // unpublished items naturally fall to the end.
  const [docs, total] = await Promise.all([
    ContentItemModel.find(filter)
      .sort({ publishedAt: -1, _id: -1 })
      .skip(skip)
      .limit(query.limit),
    ContentItemModel.countDocuments(filter),
  ]);

  return {
    items: docs.map(toDto),
    page: query.page,
    limit: query.limit,
    total,
  };
}
