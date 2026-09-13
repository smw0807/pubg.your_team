import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
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
  const pageNumber = ref(1);
  const hasNext = ref(false);
  const hasPrevious = computed(() => pageNumber.value > 1);
  let pageStarts: Array<QueryDocumentSnapshot | null> = [null];
  let nextCursor: QueryDocumentSnapshot | null = null;
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
    hasNext.value = false;
    nextCursor = null;
    errorMessage.value = '';
    const fail = (error: unknown) => {
      if (!active || version !== generation) return;
      errorMessage.value = teamListError(error);
      isLoading.value = false;
    };
    try {
      unsubscribe = subscribe({ ...filters.value }, (result, cached, page) => {
        if (!active || version !== generation) return;
        teams.value = result;
        fromCache.value = cached;
        hasLoaded.value = true;
        isLoading.value = false;
        errorMessage.value = '';
        hasNext.value = !cached && Boolean(page?.hasNext);
        nextCursor = page?.cursor ?? null;
      }, fail, pageStarts[pageNumber.value - 1]);
    } catch (error) { fail(error); }
  };
  const refresh = () => { if (active) load(false); };
  const firstPage = () => {
    pageStarts = [null]; pageNumber.value = 1;
    if (active) load(true);
  };
  const nextPage = () => {
    if (!active || isLoading.value || isOffline.value || fromCache.value || errorMessage.value || !hasNext.value || !nextCursor) return;
    pageStarts = [...pageStarts.slice(0, pageNumber.value), nextCursor];
    pageNumber.value++; load(true);
  };
  const previousPage = () => {
    if (!active || isLoading.value || isOffline.value || !hasPrevious.value) return;
    pageNumber.value--; load(true);
  };
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
  watch(filters, firstPage);
  onScopeDispose(stop);
  return { teams, isLoading, hasLoaded, fromCache, isOffline, errorMessage, start, refresh, pageNumber, hasNext, hasPrevious, firstPage, nextPage, previousPage };
}
