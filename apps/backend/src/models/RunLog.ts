import { Schema, Types } from 'mongoose';
import { applyBaseToJSON, getOrCreateModel } from './helpers';

export type RunLogStatus = 'SUCCEEDED' | 'FAILED';
export type RunLogTrigger = 'manual' | 'scheduled';

export interface IRunLogEvent {
  level: 'info' | 'warn' | 'error';
  phase: string;
  message: string;
  at: Date;
}

export interface IRunLogStats {
  newItems: number;
  summarized: number;
  scored: number;
  selected: number;
  postsCreated: number;
  trendThemes: number;
  marketSignals: number;
}

export interface IRunLog {
  projectId: Types.ObjectId;
  jobId: string | null;
  trigger: RunLogTrigger;
  status: RunLogStatus;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  stats: IRunLogStats;
  events: IRunLogEvent[];
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IRunLogEvent>(
  {
    level: { type: String, enum: ['info', 'warn', 'error'], required: true },
    phase: { type: String, required: true, maxlength: 80 },
    message: { type: String, required: true, maxlength: 2000 },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const statsSchema = new Schema<IRunLogStats>(
  {
    newItems: { type: Number, default: 0 },
    summarized: { type: Number, default: 0 },
    scored: { type: Number, default: 0 },
    selected: { type: Number, default: 0 },
    postsCreated: { type: Number, default: 0 },
    trendThemes: { type: Number, default: 0 },
    marketSignals: { type: Number, default: 0 },
  },
  { _id: false },
);

const runLogSchema = new Schema<IRunLog>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    jobId: { type: String, default: null },
    trigger: {
      type: String,
      enum: ['manual', 'scheduled'],
      required: true,
    },
    status: {
      type: String,
      enum: ['SUCCEEDED', 'FAILED'],
      required: true,
    },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },
    stats: { type: statsSchema, default: () => ({}) },
    events: { type: [eventSchema], default: [] },
    failureReason: { type: String, default: null, maxlength: 2000 },
  },
  { timestamps: true },
);

runLogSchema.index({ projectId: 1, startedAt: -1 });

applyBaseToJSON(runLogSchema, ['projectId']);

export const RunLogModel = getOrCreateModel<IRunLog>('RunLog', runLogSchema);
