import { StorageAdapter } from '../core/types';
import { JSONStorageAdapter } from './json-store';
import { MemoryStorageAdapter } from './memory-store';

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
 */
export function createStorageAdapter(): StorageAdapter {
  if (isFilesystemAvailable()) {
    console.log('Using filesystem storage (JSONStorageAdapter)');
    return new JSONStorageAdapter();
  } else {
    console.log('Using in-memory storage (MemoryStorageAdapter) - data will not persist');
    console.log('Consider using a database like Vercel KV, Postgres, or MongoDB for production');
    return new MemoryStorageAdapter();
  }
}

// Export singleton instance
export const storage = createStorageAdapter();
