import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import type { Stat } from '../models/profile.ts';

export interface StatsTarget { platform: string; nickname: string }
export type FetchStats = (target: StatsTarget, signal: AbortSignal) => Promise<Stat>;

export function playerStatsError(error: unknown): string {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const status = Number(value.statusCode ?? value.status);
  if (status === 400) return '플랫폼과 게임 닉네임을 확인해주세요.';
  if (status === 404) return '플레이어 또는 해당 시즌 전적을 찾을 수 없습니다. 닉네임을 확인해주세요.';
  if (status === 429) return '전적 조회 요청이 많습니다. 잠시 후 다시 시도해주세요.';
  if (status === 502) return '전적 서버에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.';
  if (status === 503) return '전적 조회 서비스를 잠시 사용할 수 없습니다. 나중에 다시 시도해주세요.';
  if (status === 504) return '전적 서버 응답이 늦어지고 있습니다. 다시 시도해주세요.';
  return '전적을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
}

export default function usePlayerStats(target: Readonly<Ref<StatsTarget>>, fetchStats: FetchStats) {
  const stats = shallowRef<Stat | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref('');
  const hasLoaded = ref(false);
  let generation = 0;
  let controller: AbortController | undefined;
  let disposed = false;
  const reset = () => {
    generation++;
    controller?.abort();
    controller = undefined;
    isLoading.value = false;
    stats.value = null;
    errorMessage.value = '';
    hasLoaded.value = false;
  };
  const load = async () => {
    if (isLoading.value || disposed) return;
    const version = ++generation;
    controller = new AbortController();
    isLoading.value = true;
    errorMessage.value = '';
    stats.value = null;
    hasLoaded.value = false;
    try {
      const result = await fetchStats({ ...target.value }, controller.signal);
      if (disposed || version !== generation) return;
      if (!result || typeof result.seasonId !== 'string' || !Number.isFinite(Date.parse(result.fetchedAt))) throw new Error('Invalid stats response');
      stats.value = result;
      hasLoaded.value = true;
    } catch (error) {
      if (!disposed && version === generation) errorMessage.value = playerStatsError(error);
    } finally {
      if (version === generation) isLoading.value = false;
    }
  };
  watch(target, reset, { flush: 'sync' });
  onScopeDispose(() => { disposed = true; reset(); });
  return { stats, isLoading, errorMessage, hasLoaded, load, reset };
}
