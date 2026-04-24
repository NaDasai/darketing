import { Schema, Types } from 'mongoose';
import { applyBaseToJSON, getOrCreateModel } from './helpers';

export interface IContentItem {
  projectId: Types.ObjectId;
  sourceId: Types.ObjectId;
  sourceUrl: string;
  urlHash: string;
  title: string;
  rawContent: string;
  summary: string | null;
  score: number | null;
  selected: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const contentItemSchema = new Schema<IContentItem>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Source',
      required: true,
    },
    sourceUrl: { type: String, required: true, maxlength: 2048 },
    // sha256(normalizedUrl) — used as the primary dedup key since Mongo URL
    // indexes on long strings are wasteful.
    urlHash: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, maxlength: 500 },
    rawContent: { type: String, required: true },
    summary: { type: String, default: null },
    score: { type: Number, default: null },
    selected: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Ranking query: top-N per project ordered by score desc.
contentItemSchema.index({ projectId: 1, score: -1 });
// Selection query within a project.
contentItemSchema.index({ projectId: 1, selected: 1, createdAt: -1 });
// Title-similarity dedup window (last 7 days within a project).
contentItemSchema.index({ projectId: 1, createdAt: -1 });

applyBaseToJSON(contentItemSchema, ['projectId', 'sourceId']);

export const ContentItemModel = getOrCreateModel<IContentItem>(
  'ContentItem',
  contentItemSchema,
);
