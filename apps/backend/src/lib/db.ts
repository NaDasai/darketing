import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from './logger';

mongoose.set('strictQuery', true);

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:/]+):([^@]+)@/, '//$1:***@');
}

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info({ uri: redactUri(env.MONGODB_URI) }, 'MongoDB connected');
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    throw err;
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info('MongoDB disconnected cleanly');
}
