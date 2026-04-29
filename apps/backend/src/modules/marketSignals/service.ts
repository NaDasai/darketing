import type {
  MarketReportDto,
  MarketReportsQuery,
} from '@eagle-eyes/shared';
import { MarketReportModel, ProjectModel } from '../../models';

function toDto(doc: { toJSON: () => unknown }): MarketReportDto {
  return doc.toJSON() as MarketReportDto;
}

export async function projectExists(projectId: string): Promise<boolean> {
  return (await ProjectModel.countDocuments({ _id: projectId })) > 0;
}

export async function listMarketReportsForProject(
  projectId: string,
  query: MarketReportsQuery,
): Promise<MarketReportDto[]> {
  const docs = await MarketReportModel.find({ projectId })
    .sort({ generatedAt: -1, _id: -1 })
    .limit(query.limit);
  return docs.map(toDto);
}
