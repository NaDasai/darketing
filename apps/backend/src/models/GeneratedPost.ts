import { Schema, Types } from 'mongoose';
import {
  PLATFORM_VALUES,
  POST_STATUS_VALUES,
  POST_VARIANT_VALUES,
  type Platform,
  type PostStatus,
  type PostVariant,
} from '@darketing/shared';
import { applyBaseToJSON, getOrCreateModel } from './helpers';

export interface IGeneratedPost {
  // Denormalized so `GET /posts?projectId=...` is a single indexed lookup.
  projectId: Types.ObjectId;
  contentItemId: Types.ObjectId;
  platform: Platform;
  variant: PostVariant | null;
  content: string;
  editedContent: string | null;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
}

const generatedPostSchema = new Schema<IGeneratedPost>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    contentItemId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentItem',
      required: true,
      index: true,
    },
    platform: { type: String, enum: PLATFORM_VALUES, required: true },
    variant: { type: String, enum: POST_VARIANT_VALUES, default: null },
    content: { type: String, required: true, maxlength: 10000 },
    editedContent: { type: String, default: null, maxlength: 10000 },
    status: {
      type: String,
      enum: POST_STATUS_VALUES,
      default: 'SUGGESTED',
      required: true,
    },
  },
  { timestamps: true },
);

// Spec-required index: filter posts by status + platform for the dashboard.
generatedPostSchema.index({ status: 1, platform: 1 });
// Per-project dashboard listing.
generatedPostSchema.index({ projectId: 1, createdAt: -1 });
generatedPostSchema.index({ projectId: 1, status: 1, platform: 1 });

applyBaseToJSON(generatedPostSchema, ['projectId', 'contentItemId']);

export const GeneratedPostModel = getOrCreateModel<IGeneratedPost>(
  'GeneratedPost',
  generatedPostSchema,
);
