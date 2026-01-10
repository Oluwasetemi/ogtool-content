import { StorageAdapter } from '../core/types';
import { JSONStorageAdapter } from './json-store';
import { MemoryStorageAdapter } from './memory-store';
import { KVStorageAdapter } from './kv-store';

/**
 * Determines if Upstash Redis (Vercel KV) is available
 */
function isKVAvailable(): boolean {
  // Check if Upstash Redis environment variables are set
  // These are automatically set by Vercel when KV database is created
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Determines if the environment supports filesystem operations
 */
function isFilesystemAvailable(): boolean {
  // In serverless environments (Vercel, AWS Lambda), the filesystem is read-only
  // except for /tmp directory
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }

  // Check if we're in production and not in a writable environment
  if (process.env.NODE_ENV === 'production' && !process.env.USE_FILESYSTEM) {
    return false;
  }

  return true;
}

/**
 * Creates the appropriate storage adapter based on the environment
 * Priority: KV > Filesystem > Memory
 */
export function createStorageAdapter(): StorageAdapter {
  // Priority 1: Upstash Redis / Vercel KV (best for production)
  if (isKVAvailable()) {
    console.log('✅ Using Upstash Redis (Vercel KV) storage - data persists across deployments');
    return new KVStorageAdapter();
  }

  // Priority 2: Filesystem (good for development)
  if (isFilesystemAvailable()) {
    console.log('📁 Using filesystem storage (JSONStorageAdapter)');
    return new JSONStorageAdapter();
  }

  // Priority 3: Memory (fallback)
  console.log('⚠️  Using in-memory storage (MemoryStorageAdapter) - data will not persist');
  console.log('💡 Set up Vercel KV for production persistence: https://vercel.com/docs/storage/vercel-kv');
  return new MemoryStorageAdapter();
}

// Export singleton instance
export const storage = createStorageAdapter();
