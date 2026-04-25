import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from '@darketing/shared';
import * as service from './service';
import { ProjectInactiveError } from './service';
import { InvalidCronExpressionError } from '../../jobs/cron';

type IdParams = { id: string };

export async function createProjectHandler(
  req: FastifyRequest<{ Body: CreateProjectInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const project = await service.createProject(req.body);
    reply.code(201).send(project);
  } catch (err) {
    if (err instanceof InvalidCronExpressionError) {
      throw req.server.httpErrors.badRequest(err.message);
    }
    throw err;
  }
}

export async function listProjectsHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const projects = await service.listProjects();
  reply.send(projects);
}

export async function getProjectHandler(
  req: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const project = await service.getProject(req.params.id);
  if (!project) throw req.server.httpErrors.notFound('Project not found');
  reply.send(project);
}

export async function updateProjectHandler(
  req: FastifyRequest<{ Params: IdParams; Body: UpdateProjectInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const project = await service.updateProject(req.params.id, req.body);
    if (!project) throw req.server.httpErrors.notFound('Project not found');
    reply.send(project);
  } catch (err) {
    if (err instanceof InvalidCronExpressionError) {
      throw req.server.httpErrors.badRequest(err.message);
    }
    throw err;
  }
}

export async function deleteProjectHandler(
  req: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const ok = await service.deleteProjectCascade(req.params.id, { log: req.log });
  if (!ok) throw req.server.httpErrors.notFound('Project not found');
  reply.code(204).send();
}

export async function runProjectHandler(
  req: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const jobId = await service.runProjectPipeline(req.params.id);
    if (!jobId) throw req.server.httpErrors.notFound('Project not found');
    reply.code(202).send({ jobId });
  } catch (err) {
    if (err instanceof ProjectInactiveError) {
      throw req.server.httpErrors.conflict(err.message);
    }
    throw err;
  }
}
