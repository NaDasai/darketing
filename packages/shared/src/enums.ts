import { z } from 'zod';

export const TONE_VALUES = ['PROFESSIONAL', 'CASUAL', 'BOLD', 'EDUCATIONAL'] as const;
export const PLATFORM_VALUES = ['TWITTER', 'LINKEDIN'] as const;
export const POST_STATUS_VALUES = ['SUGGESTED', 'APPROVED', 'REJECTED'] as const;
export const POST_VARIANT_VALUES = ['EDUCATIONAL', 'CONTRARIAN', 'CONCISE'] as const;

export const ToneSchema = z.enum(TONE_VALUES);
export const PlatformSchema = z.enum(PLATFORM_VALUES);
export const PostStatusSchema = z.enum(POST_STATUS_VALUES);
export const PostVariantSchema = z.enum(POST_VARIANT_VALUES);

export type Tone = z.infer<typeof ToneSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type PostStatus = z.infer<typeof PostStatusSchema>;
export type PostVariant = z.infer<typeof PostVariantSchema>;
