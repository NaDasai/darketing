import mongoose from 'mongoose';
import type {
  CreateSourceInput,
  DiscoveredFeed,
  SourceDto,
} from '@darketing/shared';
import { ProjectModel, SourceModel } from '../../models';
import { fetchFeed } from '../../services/rss.service';
import { discoverFeeds } from '../../services/feed-discovery.service';

function toDto(doc: { toJSON: () => unknown }): SourceDto {
  return doc.toJSON() as SourceDto;
}

export class SourceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceValidationError';
  }
}

export class SourceDuplicateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceDuplicateError';
  }
}

export async function projectExists(projectId: string): Promise<boolean> {
  return (await ProjectModel.countDocuments({ _id: projectId })) > 0;
}

export async function listSourcesForProject(projectId: string): Promise<SourceDto[]> {
  const sources = await SourceModel.find({ projectId }).sort({ createdAt: -1 });
  return sources.map(toDto);
}

export async function createSourceForProject(
  projectId: string,
  input: CreateSourceInput,
): Promise<SourceDto> {
  // Verify reachability before persisting — a source that never parses is
  // worse than no source at all, since the worker would log a failure every
  // cron tick.
  try {
    await fetchFeed(input.rssUrl);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new SourceValidationError(
      `Could not fetch or parse RSS feed: ${detail}`,
    );
  }

  try {
    const created = await SourceModel.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      rssUrl: input.rssUrl,
      isActive: true,
    });
    return toDto(created);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new SourceDuplicateError(
        'A source with this RSS URL already exists for this project',
      );
    }
    throw err;
  }
}

export async function deleteSource(id: string): Promise<boolean> {
  const deleted = await SourceModel.findByIdAndDelete(id);
  return deleted !== null;
}

export async function discoverFeedsForUrl(
  url: string,
): Promise<DiscoveredFeed[]> {
  return discoverFeeds(url);
}
