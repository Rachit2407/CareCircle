import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterAll, beforeEach } from 'vitest';

let mongoServer: MongoMemoryServer | null = null;
const LOCAL_TEST_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carecircle_test_suite';

beforeAll(async () => {
  // First attempt: Connect directly to locally running mongod instance
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(LOCAL_TEST_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    return;
  } catch (err) {
    console.log('Local MongoDB not reached, attempting MongoMemoryServer...');
  }

  // Fallback: in-memory server
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'carecircle_test_db',
      },
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  } catch (err) {
    console.error('Failed to initialize test database:', err);
    throw err;
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
});
