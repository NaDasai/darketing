import { Schema, Types } from 'mongoose';
import { applyBaseToJSON, getOrCreateModel } from './helpers';

export interface ITrendTheme {
  title: string;
  description: string;
}

export interface ITrendItemRef {
  contentItemId: Types.ObjectId;
  title: string;
  sourceUrl: string;
}

export interface ITrend {
  projectId: Types.ObjectId;
  generatedAt: Date;
  headline: string;
  themes: ITrendTheme[];
  items: ITrendItemRef[];
  createdAt: Date;
  updatedAt: Date;
}

const themeSchema = new Schema<ITrendTheme>(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
  },
  { _id: false },
);

// Snapshot of each contributing item — kept on the trend doc itself so the
// report stays meaningful even if a content item is later removed, and so
// listings don't need a join.
const itemRefSchema = new Schema<ITrendItemRef>(
  {
    contentItemId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentItem',
      required: true,
    },
    title: { type: String, required: true, maxlength: 500 },
    sourceUrl: { type: String, required: true, maxlength: 2048 },
  },
  { _id: false },
);

const trendSchema = new Schema<ITrend>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    headline: { type: String, required: true, maxlength: 500 },
    themes: { type: [themeSchema], default: [] },
    items: { type: [itemRefSchema], default: [] },
  },
  { timestamps: true },
);

// Listing query: most-recent reports for a project.
trendSchema.index({ projectId: 1, generatedAt: -1 });

applyBaseToJSON(trendSchema, ['projectId'], (ret) => {
  if (Array.isArray(ret.items)) {
    ret.items = (ret.items as Array<Record<string, unknown>>).map((it) => ({
      ...it,
      contentItemId:
        it.contentItemId != null
          ? String(it.contentItemId)
          : it.contentItemId,
    }));
  }
});

export const TrendModel = getOrCreateModel<ITrend>('Trend', trendSchema);
