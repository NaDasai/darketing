import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ContentQuery } from '@darketing/shared';
import * as service from './service';
import { InvalidCursorError } from './service';

type IdParams = { id: string };

export async function listProjectContentHandler(
  req: FastifyRequest<{ Params: IdParams; Querystring: ContentQuery }>,
  reply: FastifyReply,
): Promise<void> {
  if (!(await service.projectExists(req.params.id))) {
    throw req.server.httpErrors.notFound('Project not found');
  }
  try {
    const result = await service.listContentForProject(
      req.params.id,
      req.query,
    );
    reply.send(result);
  } catch (err) {
    if (err instanceof InvalidCursorError) {
      throw req.server.httpErrors.badRequest(err.message);
    }
    throw err;
  }
}
