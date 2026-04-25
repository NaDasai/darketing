import { Types } from 'mongoose';
import type { FastifyBaseLogger } from 'fastify';
import type {
  CreateProjectInput,
  ProjectDto,
  UpdateProjectInput,
} from '@darketing/shared';
import {
  ContentItemModel,
  GeneratedPostModel,
  ProjectModel,
  SourceModel,
  TrendModel,
} from '../../models';
import { enqueuePipelineRun } from '../../jobs/queue';
import {
  InvalidCronExpressionError,
  isValidCronExpression,
} from '../../jobs/cron';

// toJSON() returns a plain object shaped like ProjectDto thanks to
// applyBaseToJSON on the schema. Fastify serializes Date → ISO string on the
// wire, so the contract defined in @darketing/shared holds.
function toDto(doc: { toJSON: () => unknown }): ProjectDto {
  return doc.toJSON() as ProjectDto;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDto> {
  if (input.schedule !== undefined && !isValidCronExpression(input.schedule)) {
    throw new InvalidCronExpressionError(input.schedule);
  }
  const created = await ProjectModel.create(input);
  return toDto(created);
}

export async function listProjects(): Promise<ProjectDto[]> {
  const projects = await ProjectModel.find({}).sort({ createdAt: -1 });
  if (projects.length === 0) return [];

  const ids = projects.map((p) => p._id);
  const counts = await SourceModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { projectId: { $in: ids } } },
    { $group: { _id: '$projectId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map<string, number>(
    counts.map((c) => [String(c._id), c.count]),
  );

  return projects.map((p) => ({
    ...toDto(p),
    sourcesCount: countMap.get(String(p._id)) ?? 0,
  }));
}

export async function getProject(id: string): Promise<ProjectDto | null> {
  const project = await ProjectModel.findById(id);
  if (!project) return null;

  const [sourcesCount, contentCount] = await Promise.all([
    SourceModel.countDocuments({ projectId: project._id }),
    ContentItemModel.countDocuments({ projectId: project._id }),
  ]);

  return {
    ...toDto(project),
    sourcesCount,
    contentCount,
  };
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<ProjectDto | null> {
  if (input.schedule !== undefined && !isValidCronExpression(input.schedule)) {
    throw new InvalidCronExpressionError(input.schedule);
  }
  const updated = await ProjectModel.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  });
  return updated ? toDto(updated) : null;
}

export interface CascadeDeleteDeps {
  log: FastifyBaseLogger;
}

export async function deleteProjectCascade(
  id: string,
  deps: CascadeDeleteDeps,
): Promise<boolean> {
  const project = await ProjectModel.findById(id);
  if (!project) return false;

  const projectId = project._id;

  // Mongo standalone can't do multi-document transactions, so children are
  // deleted sequentially. On failure we log + continue so we don't leave the
  // project itself orphaned by a stuck intermediate step.
  try {
    await GeneratedPostModel.deleteMany({ projectId });
  } catch (err) {
    deps.log.warn({ err, projectId: id }, 'cascade: GeneratedPost delete failed');
  }
  try {
    await ContentItemModel.deleteMany({ projectId });
  } catch (err) {
    deps.log.warn({ err, projectId: id }, 'cascade: ContentItem delete failed');
  }
  try {
    await SourceModel.deleteMany({ projectId });
  } catch (err) {
    deps.log.warn({ err, projectId: id }, 'cascade: Source delete failed');
  }
  try {
    await TrendModel.deleteMany({ projectId });
  } catch (err) {
    deps.log.warn({ err, projectId: id }, 'cascade: Trend delete failed');
  }

  await project.deleteOne();
  return true;
}

export class ProjectInactiveError extends Error {
  constructor() {
    super('Project is inactive');
    this.name = 'ProjectInactiveError';
  }
}

export async function runProjectPipeline(id: string): Promise<string | null> {
  const project = await ProjectModel.findById(id).select('isActive');
  if (!project) return null;
  if (!project.isActive) throw new ProjectInactiveError();
  return enqueuePipelineRun(id, 'manual');
}
