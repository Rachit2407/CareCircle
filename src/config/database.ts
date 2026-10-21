import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export const connectDatabase = async (uriOverride?: string): Promise<typeof mongoose> => {
  const uri = uriOverride || env.MONGODB_URI;

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      autoIndex: env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;

    // Drop legacy global unique on key if present (Requirement A.2)
    try {
      if (mongoose.connection.db) {
        const collections = await mongoose.connection.db.listCollections({ name: 'idempotencyrecords' }).toArray();
        if (collections.length > 0) {
          const indexes = await mongoose.connection.db.collection('idempotencyrecords').indexes();
          if (indexes.some((i) => i.name === 'key_1')) {
            await mongoose.connection.db.collection('idempotencyrecords').dropIndex('key_1');
          }
        }
      }
    } catch {
      // Ignore if index doesn't exist
    }

    if (env.NODE_ENV !== 'test') {
      console.log(`[Database] Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
    }
    return mongoose;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
};
