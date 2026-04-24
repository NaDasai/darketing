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

  // Recency-first feed: newest items always visible. Score is shown in the
  // badge and ?selected=true filters to the top picks. Sorting by score-desc
  // would push unscored items (score=null) to the end and they'd often get
  // cut off by the limit before the user ever sees them.
  const items = await ContentItemModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(query.limit);

  return items.map(toDto);
}
