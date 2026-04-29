import { Schema, Types } from 'mongoose';
import {
  ASSET_CLASS_VALUES,
  CONFIDENCE_VALUES,
  DIRECTION_VALUES,
  type AssetClass,
  type Confidence,
  type Direction,
} from '@eagle-eyes/shared';
import { applyBaseToJSON, getOrCreateModel } from './helpers';

export interface IMarketSignal {
  asset: string;
  assetClass: AssetClass;
  direction: Direction;
  confidence: Confidence;
  horizon?: string;
  rationale: string;
  supportingContentItemIds: Types.ObjectId[];
}

export interface IMarketReportItemRef {
  contentItemId: Types.ObjectId;
  title: string;
  sourceUrl: string;
}

export interface IMarketReport {
  projectId: Types.ObjectId;
  generatedAt: Date;
  signals: IMarketSignal[];
  items: IMarketReportItemRef[];
  createdAt: Date;
  updatedAt: Date;
}

const signalSchema = new Schema<IMarketSignal>(
  {
    asset: { type: String, required: true, maxlength: 160 },
    assetClass: { type: String, enum: ASSET_CLASS_VALUES, required: true },
    direction: { type: String, enum: DIRECTION_VALUES, required: true },
    confidence: { type: String, enum: CONFIDENCE_VALUES, required: true },
    horizon: { type: String, maxlength: 80 },
    rationale: { type: String, required: true, maxlength: 2000 },
    supportingContentItemIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
  },
  { _id: false },
);

const itemRefSchema = new Schema<IMarketReportItemRef>(
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

const marketReportSchema = new Schema<IMarketReport>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    signals: { type: [signalSchema], default: [] },
    items: { type: [itemRefSchema], default: [] },
  },
  { timestamps: true },
);

marketReportSchema.index({ projectId: 1, generatedAt: -1 });

applyBaseToJSON(marketReportSchema, ['projectId'], (ret) => {
  if (Array.isArray(ret.signals)) {
    ret.signals = (ret.signals as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      supportingContentItemIds: Array.isArray(s.supportingContentItemIds)
        ? (s.supportingContentItemIds as unknown[]).map((id) => String(id))
        : [],
    }));
  }
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

export const MarketReportModel = getOrCreateModel<IMarketReport>(
  'MarketReport',
  marketReportSchema,
);
