import { parseStatsQuery, statsError, StatsError } from '../../utils/pubgStats';
import { createPubgService } from '../../utils/pubgService';

let service: ReturnType<typeof createPubgService> | undefined;
let configuredKey: string | undefined;

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store');
  try {
    const { platform, playerName } = parseStatsQuery(getQuery(event));
    const apiKey = (useRuntimeConfig().pubgApiKey as string | undefined)?.trim();
    if (!apiKey) throw new StatsError(503, '전적 조회 서비스가 아직 설정되지 않았습니다.');
    if (!service || configuredKey !== apiKey) {
      service = createPubgService(apiKey);
      configuredKey = apiKey;
    }
    return await service(platform, playerName);
  } catch (cause) {
    const error = statsError(cause);
    if (error.retryAfter) setHeader(event, 'Retry-After', error.retryAfter);
    // SDK errors can contain Authorization headers. Return only sanitized fields.
    throw createError({ statusCode: error.statusCode, message: error.message });
  }
});
