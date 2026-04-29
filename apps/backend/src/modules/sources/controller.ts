import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateSourceInput, DiscoverFeedsInput } from '@eagle-eyes/shared';
import * as service from './service';
import { SourceDuplicateError, SourceValidationError } from './service';

type ProjectIdParams = { id: string };
type SourceIdParams = { id: string };

export async function listProjectSourcesHandler(
  req: FastifyRequest<{ Params: ProjectIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  if (!(await service.projectExists(req.params.id))) {
    throw req.server.httpErrors.notFound('Project not found');
  }
  const sources = await service.listSourcesForProject(req.params.id);
  reply.send(sources);
}

export async function createProjectSourceHandler(
  req: FastifyRequest<{ Params: ProjectIdParams; Body: CreateSourceInput }>,
  reply: FastifyReply,
): Promise<void> {
  if (!(await service.projectExists(req.params.id))) {
    throw req.server.httpErrors.notFound('Project not found');
  }
  try {
    const source = await service.createSourceForProject(req.params.id, req.body);
    reply.code(201).send(source);
  } catch (err) {
    if (err instanceof SourceValidationError) {
      throw req.server.httpErrors.unprocessableEntity(err.message);
    }
    if (err instanceof SourceDuplicateError) {
      throw req.server.httpErrors.conflict(err.message);
    }
    throw err;
  }
}

export async function deleteSourceHandler(
  req: FastifyRequest<{ Params: SourceIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const ok = await service.deleteSource(req.params.id);
  if (!ok) throw req.server.httpErrors.notFound('Source not found');
  reply.code(204).send();
}

export async function discoverSourcesHandler(
  req: FastifyRequest<{ Body: DiscoverFeedsInput }>,
  reply: FastifyReply,
): Promise<void> {
  const feeds = await service.discoverFeedsForUrl(req.body.url);
  reply.send({ feeds });
}
