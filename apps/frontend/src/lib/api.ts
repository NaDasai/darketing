import { z, type ZodTypeAny } from 'zod';
import {
  ContentItemDtoSchema,
  DiscoverFeedsResultSchema,
  JobStatusDtoSchema,
  PaginatedPostsSchema,
  PostDtoSchema,
  ProjectDtoSchema,
  SourceDtoSchema,
  type ContentItemDto,
  type ContentQuery,
  type CreateProjectInput,
  type CreateSourceInput,
  type DiscoveredFeed,
  type DiscoverFeedsInput,
  type DiscoverFeedsResult,
  type JobStatusDto,
  type PaginatedPosts,
  type PostDto,
  type PostsQuery,
  type ProjectDto,
  type SourceDto,
  type UpdatePostInput,
  type UpdateProjectInput,
} from '@darketing/shared';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    message: string,
    status: number,
    code = 'ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions<TSchema extends ZodTypeAny | undefined> {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  schema?: TSchema;
  signal?: AbortSignal;
}

type InferResult<TSchema extends ZodTypeAny | undefined> =
  TSchema extends ZodTypeAny ? z.infer<TSchema> : void;

async function request<TSchema extends ZodTypeAny | undefined = undefined>(
  path: string,
  opts: RequestOptions<TSchema> = {},
): Promise<InferResult<TSchema>> {
  const { method = 'GET', body, query, schema, signal } = opts;

  const qs = query ? buildQueryString(query) : '';

  const res = await fetch(`${BASE_URL}${path}${qs}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    cache: 'no-store',
  });

  if (!res.ok) {
    let code = 'HTTP_ERROR';
    let message = `${res.status} ${res.statusText}`;
    let details: unknown;
    try {
      const payload = (await res.json()) as {
        error?: { code?: string; message?: string; details?: unknown };
      };
      if (payload?.error) {
        code = payload.error.code ?? code;
        message = payload.error.message ?? message;
        details = payload.error.details;
      }
    } catch {
      // non-JSON body — keep defaults
    }
    throw new ApiError(message, res.status, code, details);
  }

  if (res.status === 204 || !schema) {
    return undefined as InferResult<TSchema>;
  }

  const json = (await res.json()) as unknown;
  return schema.parse(json) as InferResult<TSchema>;
}

function buildQueryString(
  query: Record<string, string | number | boolean | undefined | null>,
): string {
  const entries = Object.entries(query).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  const params = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  );
  return `?${params.toString()}`;
}

// ---------- Projects ----------

export const projectsApi = {
  list(signal?: AbortSignal): Promise<ProjectDto[]> {
    return request('/projects', {
      schema: z.array(ProjectDtoSchema),
      signal,
    });
  },

  get(id: string, signal?: AbortSignal): Promise<ProjectDto> {
    return request(`/projects/${id}`, { schema: ProjectDtoSchema, signal });
  },

  create(input: CreateProjectInput): Promise<ProjectDto> {
    return request('/projects', {
      method: 'POST',
      body: input,
      schema: ProjectDtoSchema,
    });
  },

  update(id: string, input: UpdateProjectInput): Promise<ProjectDto> {
    return request(`/projects/${id}`, {
      method: 'PATCH',
      body: input,
      schema: ProjectDtoSchema,
    });
  },

  remove(id: string): Promise<void> {
    return request(`/projects/${id}`, { method: 'DELETE' });
  },

  run(id: string): Promise<{ jobId: string }> {
    return request(`/projects/${id}/run`, {
      method: 'POST',
      schema: z.object({ jobId: z.string() }),
    });
  },
};

// ---------- Sources ----------

export const sourcesApi = {
  list(projectId: string, signal?: AbortSignal): Promise<SourceDto[]> {
    return request(`/projects/${projectId}/sources`, {
      schema: z.array(SourceDtoSchema),
      signal,
    });
  },

  create(projectId: string, input: CreateSourceInput): Promise<SourceDto> {
    return request(`/projects/${projectId}/sources`, {
      method: 'POST',
      body: input,
      schema: SourceDtoSchema,
    });
  },

  remove(id: string): Promise<void> {
    return request(`/sources/${id}`, { method: 'DELETE' });
  },

  discover(input: DiscoverFeedsInput): Promise<DiscoverFeedsResult> {
    return request('/sources/discover', {
      method: 'POST',
      body: input,
      schema: DiscoverFeedsResultSchema,
    });
  },
};

// ---------- Content ----------

export const contentApi = {
  list(
    projectId: string,
    query: Partial<ContentQuery> = {},
    signal?: AbortSignal,
  ): Promise<ContentItemDto[]> {
    return request(`/projects/${projectId}/content`, {
      query: { selected: query.selected, limit: query.limit },
      schema: z.array(ContentItemDtoSchema),
      signal,
    });
  },
};

// ---------- Posts ----------

export const postsApi = {
  list(
    query: Partial<PostsQuery> = {},
    signal?: AbortSignal,
  ): Promise<PaginatedPosts> {
    return request('/posts', {
      query: {
        projectId: query.projectId,
        status: query.status,
        platform: query.platform,
        limit: query.limit,
        cursor: query.cursor,
      },
      schema: PaginatedPostsSchema,
      signal,
    });
  },

  get(id: string, signal?: AbortSignal): Promise<PostDto> {
    return request(`/posts/${id}`, { schema: PostDtoSchema, signal });
  },

  update(id: string, input: UpdatePostInput): Promise<PostDto> {
    return request(`/posts/${id}`, {
      method: 'PATCH',
      body: input,
      schema: PostDtoSchema,
    });
  },
};

// ---------- Jobs ----------

export const jobsApi = {
  getStatus(jobId: string, signal?: AbortSignal): Promise<JobStatusDto> {
    return request(`/jobs/${jobId}`, {
      schema: JobStatusDtoSchema,
      signal,
    });
  },
};

export type {
  ContentItemDto,
  DiscoveredFeed,
  JobStatusDto,
  PaginatedPosts,
  PostDto,
  ProjectDto,
  SourceDto,
};
