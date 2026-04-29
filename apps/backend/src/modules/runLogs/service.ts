import type { RunLogDto, RunLogsQuery } from '@eagle-eyes/shared';
import { ProjectModel, RunLogModel } from '../../models';

function toDto(doc: { toJSON: () => unknown }): RunLogDto {
  return doc.toJSON() as RunLogDto;
}

export async function projectExists(projectId: string): Promise<boolean> {
  return (await ProjectModel.countDocuments({ _id: projectId })) > 0;
}

export async function listRunLogsForProject(
  projectId: string,
  query: RunLogsQuery,
): Promise<RunLogDto[]> {
  const docs = await RunLogModel.find({ projectId })
    .sort({ startedAt: -1, _id: -1 })
    .limit(query.limit);
  return docs.map(toDto);
}
