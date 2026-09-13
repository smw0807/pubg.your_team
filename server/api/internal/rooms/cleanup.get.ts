import { isCleanupAuthorized } from '../../../utils/cleanupAuth';
import { cleanupFirestore } from '../../../utils/cleanupFirestore';
import { cleanupRooms } from '../../../utils/roomCleanup';

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store');
  // Deliberately off by default; never run a production mutation with implicit credentials.
  if (process.env.ROOM_CLEANUP_ENABLED !== 'true') throw createError({ statusCode: 503, message: 'Room cleanup is disabled' });
  if (!isCleanupAuthorized(getHeader(event, 'authorization'), process.env.CRON_SECRET)) throw createError({ statusCode: 401, message: 'Unauthorized' });
  try {
    return await cleanupRooms(cleanupFirestore());
  } catch {
    // Do not expose SDK errors, service account details, document paths or keys.
    throw createError({ statusCode: 500, message: 'Room cleanup failed' });
  }
});
