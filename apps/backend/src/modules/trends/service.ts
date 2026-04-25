import type { TrendDto, TrendsQuery } from '@darketing/shared';
import { ProjectModel, TrendModel } from '../../models';

function toDto(doc: { toJSON: () => unknown }): TrendDto {
  return doc.toJSON() as TrendDto;
}

export async function projectExists(projectId: string): Promise<boolean> {
  return (await ProjectModel.countDocuments({ _id: projectId })) > 0;
}

export async function listTrendsForProject(
  projectId: string,
  query: TrendsQuery,
): Promise<TrendDto[]> {
  const docs = await TrendModel.find({ projectId })
    .sort({ generatedAt: -1, _id: -1 })
    .limit(query.limit);
  return docs.map(toDto);
}
