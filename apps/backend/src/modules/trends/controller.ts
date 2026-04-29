import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TrendsQuery } from '@eagle-eyes/shared';
import * as service from './service';

type IdParams = { id: string };

export async function listProjectTrendsHandler(
  req: FastifyRequest<{ Params: IdParams; Querystring: TrendsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  if (!(await service.projectExists(req.params.id))) {
    throw req.server.httpErrors.notFound('Project not found');
  }
  const trends = await service.listTrendsForProject(req.params.id, req.query);
  reply.send(trends);
}
