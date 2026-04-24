import type { FastifyReply, FastifyRequest } from 'fastify';
import { getJobStatus } from '../../jobs/queue';

type JobIdParams = { jobId: string };

export async function getJobStatusHandler(
  req: FastifyRequest<{ Params: JobIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const status = await getJobStatus(req.params.jobId);
  if (!status) {
    throw req.server.httpErrors.notFound('Job not found');
  }
  reply.send(status);
}
