import { Schema, Types } from 'mongoose';
import { applyBaseToJSON, getOrCreateModel } from './helpers';

export interface ISource {
  projectId: Types.ObjectId;
  rssUrl: string;
  lastFetchedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sourceSchema = new Schema<ISource>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    rssUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    lastFetchedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// A given RSS URL is unique per project (the same feed can legitimately be
// attached to multiple projects).
sourceSchema.index({ projectId: 1, rssUrl: 1 }, { unique: true });

applyBaseToJSON(sourceSchema, ['projectId']);

export const SourceModel = getOrCreateModel<ISource>('Source', sourceSchema);
