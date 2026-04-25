import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import { env } from './config/env';
import { logger } from './lib/logger';
import { registerProjectsRoutes } from './modules/projects';
import { registerSourcesRoutes } from './modules/sources';
import { registerContentRoutes } from './modules/content';
import { registerPostsRoutes } from './modules/posts';
import { registerJobsRoutes } from './modules/jobs';
import { registerTrendsRoutes } from './modules/trends';

type FastifyValidationError = {
  keyword?: string;
  instancePath?: string;
  schemaPath?: string;
  params?: Record<string, unknown>;
  message?: string;
};

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE';
    case 503:
      return 'UNAVAILABLE';
    default:
      return status >= 500 ? 'INTERNAL' : 'ERROR';
  }
}

export async function buildApp() {
  const app = Fastify({
    logger,
    disableRequestLogging: false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(sensible);

  // TODO: auth — attach a preHandler here once the API becomes multi-tenant.
  // For the MVP we deliberately leave it open so the local UI works end-to-end
  // without a login flow.

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Request validation failed',
          details: err.flatten(),
        },
      });
      return;
    }

    if (err.validation) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: err.message,
          details: err.validation as FastifyValidationError[],
        },
      });
      return;
    }

    // Mongoose invalid ObjectId / cast failures surface as CastError.
    if (err.name === 'CastError') {
      reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: err.message },
      });
      return;
    }

    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) {
      req.log.error({ err }, 'Unhandled server error');
    }

    reply.status(statusCode).send({
      error: {
        code: codeForStatus(statusCode),
        message: err.message ?? 'Unexpected error',
      },
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  app.get('/health', async () => ({ ok: true, service: 'darketing-backend' }));

  await app.register(registerProjectsRoutes);
  await app.register(registerSourcesRoutes);
  await app.register(registerContentRoutes);
  await app.register(registerPostsRoutes);
  await app.register(registerJobsRoutes);
  await app.register(registerTrendsRoutes);

  return app;
}
