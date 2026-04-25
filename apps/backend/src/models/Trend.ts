import { Schema, Types } from 'mongoose';
import { applyBaseToJSON, getOrCreateModel } from './helpers';

export interface ITrendTheme {
  title: string;
  description: string;
}

export interface ITrend {
  projectId: Types.ObjectId;
  generatedAt: Date;
  itemCount: number;
  headline: string;
  themes: ITrendTheme[];
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

const trendSchema = new Schema<ITrend>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    itemCount: { type: Number, required: true, min: 0 },
    headline: { type: String, required: true, maxlength: 500 },
    themes: { type: [themeSchema], default: [] },
  },
  { timestamps: true },
);

// Listing query: most-recent reports for a project.
trendSchema.index({ projectId: 1, generatedAt: -1 });

applyBaseToJSON(trendSchema, ['projectId']);

export const TrendModel = getOrCreateModel<ITrend>('Trend', trendSchema);
