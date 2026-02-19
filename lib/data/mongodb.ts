import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

/**
 * Global cache for the Mongoose connection.
 * In dev, Next.js hot-reloads clear module scope — caching on `global`
 * prevents opening a new connection on every reload.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    console.log("[MongoDB] Attempting connection to:", MONGODB_URI.replace(/\/\/.*@/, "//<credentials>@"));
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log("[MongoDB] Connected successfully");
    return cached.conn;
  } catch (err) {
    // Clear the cached promise so the next call retries a fresh connection
    cached.promise = null;
    cached.conn = null;
    throw err;
  }
}
