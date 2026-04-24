import { z } from 'zod';

export const ObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

export const IsoDateSchema = z.string().datetime();

// Query params arrive as strings, so coerce explicitly.
// z.coerce.boolean() treats any non-empty string as true, which is wrong
// for "false" — use this stricter variant for URL query flags instead.
export const BooleanStringSchema = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type Pagination = z.infer<typeof PaginationQuerySchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
