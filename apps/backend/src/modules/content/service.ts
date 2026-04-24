import type { ContentItemDto, ContentQuery } from '@darketing/shared';
import { ContentItemModel, ProjectModel } from '../../models';

function toDto(doc: { toJSON: () => unknown }): ContentItemDto {
  return doc.toJSON() as ContentItemDto;
}

export async function projectExists(projectId: string): Promise<boolean> {
  return (await ProjectModel.countDocuments({ _id: projectId })) > 0;
}

export async function listContentForProject(
  projectId: string,
  query: ContentQuery,
): Promise<ContentItemDto[]> {
  const filter: Record<string, unknown> = { projectId };
  if (query.selected !== undefined) filter.selected = query.selected;

  // Ranking view: highest-scored first, then newest. Ties broken by createdAt.
  const items = await ContentItemModel.find(filter)
    .sort({ score: -1, createdAt: -1 })
    .limit(query.limit);

  return items.map(toDto);
}
