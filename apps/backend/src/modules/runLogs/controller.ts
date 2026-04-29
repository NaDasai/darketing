import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RunLogsQuery } from '@eagle-eyes/shared';
import * as service from './service';

type IdParams = { id: string };

export async function listProjectRunLogsHandler(
  req: FastifyRequest<{ Params: IdParams; Querystring: RunLogsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  if (!(await service.projectExists(req.params.id))) {
    throw req.server.httpErrors.notFound('Project not found');
  }
  const logs = await service.listRunLogsForProject(req.params.id, req.query);
  reply.send(logs);
}
