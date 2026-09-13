import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import type { Team } from '../models/team.ts';
import { teamListError, type SubscribeTeams, type TeamFilters } from '../services/teamList.ts';

// Subscription ownership lives in the page's scope, never in a shared SSR singleton.
export default function useTeamList(filters: Readonly<Ref<TeamFilters>>, subscribe: SubscribeTeams) {
  const teams = shallowRef<Team[]>([]);
  const isLoading = ref(true);
  const hasLoaded = ref(false);
  const fromCache = ref(false);
  const isOffline = ref(false);
  const errorMessage = ref('');
  let active = false;
  let generation = 0;
  let unsubscribe: (() => void) | undefined;

  const load = (clear: boolean) => {
    const version = ++generation;
    unsubscribe?.();
    unsubscribe = undefined;
    if (clear) {
      teams.value = [];
      hasLoaded.value = false;
      fromCache.value = false;
    }
    isLoading.value = true;
    errorMessage.value = '';
    const fail = (error: unknown) => {
      if (!active || version !== generation) return;
      errorMessage.value = teamListError(error);
      isLoading.value = false;
    };
    try {
      unsubscribe = subscribe({ ...filters.value }, (result, cached) => {
        if (!active || version !== generation) return;
        teams.value = result;
        fromCache.value = cached;
        hasLoaded.value = true;
        isLoading.value = false;
        errorMessage.value = '';
      }, fail);
    } catch (error) { fail(error); }
  };
  const refresh = () => { if (active) load(false); };
  const onlineChanged = () => {
    isOffline.value = !navigator.onLine;
    if (!isOffline.value) refresh();
  };
  const resume = () => {
    if (document.visibilityState === 'visible') onlineChanged();
  };
  const start = () => {
    if (active) return;
    active = true;
    if (typeof window !== 'undefined') {
      isOffline.value = !navigator.onLine;
      window.addEventListener('online', onlineChanged);
      window.addEventListener('offline', onlineChanged);
      document.addEventListener('visibilitychange', resume);
    }
    load(true);
  };
  const stop = () => {
    active = false;
    generation++;
    unsubscribe?.();
    unsubscribe = undefined;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onlineChanged);
      window.removeEventListener('offline', onlineChanged);
      document.removeEventListener('visibilitychange', resume);
    }
  };
  watch(filters, () => { if (active) load(true); });
  onScopeDispose(stop);
  return { teams, isLoading, hasLoaded, fromCache, isOffline, errorMessage, start, refresh };
}
