import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MarketReportsQuery } from '@eagle-eyes/shared';
import * as service from './service';

type IdParams = { id: string };

export async function listProjectMarketReportsHandler(
  req: FastifyRequest<{ Params: IdParams; Querystring: MarketReportsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  if (!(await service.projectExists(req.params.id))) {
    throw req.server.httpErrors.notFound('Project not found');
  }
  const reports = await service.listMarketReportsForProject(
    req.params.id,
    req.query,
  );
  reply.send(reports);
}
