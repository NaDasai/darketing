import { Schema } from 'mongoose';
import { TONE_VALUES, type Tone } from '@darketing/shared';
import { applyBaseToJSON, getOrCreateModel } from './helpers';

export interface IProject {
  name: string;
  description: string;
  tone: Tone;
  targetAudience: string;
  domain: string;
  topNPerRun: number;
  isActive: boolean;
  schedule: string;
  lastRunStartedAt: Date | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    tone: { type: String, enum: TONE_VALUES, required: true },
    targetAudience: { type: String, required: true, trim: true, maxlength: 500 },
    domain: { type: String, required: true, trim: true, maxlength: 200 },
    topNPerRun: { type: Number, default: 5, min: 1, max: 50 },
    isActive: { type: Boolean, default: true, index: true },
    schedule: { type: String, default: '0 6 * * *', trim: true },
    lastRunStartedAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true },
);

applyBaseToJSON(projectSchema);

export const ProjectModel = getOrCreateModel<IProject>('Project', projectSchema);
