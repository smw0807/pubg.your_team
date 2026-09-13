import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { mergeChatEntries, type ChatEntry, type ChatHistorySource } from '../services/chatHistory.ts';
import { roomErrorMessage } from '../services/room.ts';

export default function useChatHistory(source: ChatHistorySource) {
  const entries = shallowRef<ChatEntry[]>([]);
  const messages = computed(() => entries.value.map((entry) => entry.message));
  const hasOlder = ref(false);
  const isLoadingOlder = ref(false);
  const fromCache = ref(true);
  const error = ref('');
  const historyError = ref('');
  const notice = ref('');
  let latest: ChatEntry[] = [];
  let confirmedLatest: ChatEntry[] | undefined;
  let history: ChatEntry[] = [];
  let cursor: ChatEntry | undefined;
  let historyOpened = false;
  let room: string | undefined;
  let stop: (() => void) | undefined;
  let generation = 0;
  let historyGeneration = 0;
  let disposed = false;

  const pause = () => {
    generation++; historyGeneration++;
    stop?.(); stop = undefined;
    isLoadingOlder.value = false;
  };
  const clear = () => {
    pause(); room = undefined; latest = []; confirmedLatest = undefined; history = []; cursor = undefined; historyOpened = false;
    entries.value = []; hasOlder.value = false; fromCache.value = true;
    error.value = ''; historyError.value = ''; notice.value = '';
  };
  const start = (roomId: string) => {
    if (disposed) return;
    const resetNotice = room === roomId && historyOpened;
    clear(); room = roomId;
    if (resetNotice) notice.value = '다시 연결되어 최근 메시지부터 표시합니다. 이전 메시지는 다시 불러올 수 있습니다.';
    const version = generation;
    const fail = (cause: unknown) => { if (version === generation && !disposed) error.value = roomErrorMessage(cause); };
    try {
      stop = source.subscribe(roomId, (batch) => {
        if (version !== generation || disposed) return;
        if (batch.fromCache && confirmedLatest) {
          // A reconnect cache cannot replace the last authoritative window or
          // hide a gap between that window and the next server response.
          fromCache.value = true;
          return;
        }
        // Cache snapshots may be incomplete. Only server-confirmed windows define gaps.
        if (!batch.fromCache && confirmedLatest?.length && batch.entries.length && !batch.entries.some((entry) => confirmedLatest!.some((old) => old.message.id === entry.message.id))) {
          history = []; historyOpened = false; historyGeneration++; isLoadingOlder.value = false;
          notice.value = '최근 메시지 범위가 바뀌었습니다. 누락 없이 보려면 이전 메시지를 다시 불러와주세요.';
        }
        if (historyOpened) history = mergeChatEntries(history, latest);
        latest = batch.entries;
        if (!batch.fromCache) confirmedLatest = batch.entries;
        fromCache.value = batch.fromCache;
        entries.value = mergeChatEntries(history, latest);
        if (!historyOpened) { cursor = entries.value[0]; hasOlder.value = batch.hasOlder; }
        error.value = '';
      }, fail);
    } catch (cause) { fail(cause); }
  };
  const loadOlder = async () => {
    if (disposed || !stop || !room || !cursor || fromCache.value || isLoadingOlder.value || !hasOlder.value || cursor.cursor.metadata.hasPendingWrites) return;
    const version = generation; const historyVersion = historyGeneration;
    const targetRoom = room; const boundary = cursor;
    isLoadingOlder.value = true; historyError.value = '';
    // Retain the contiguous live window while this request is in flight.
    historyOpened = true;
    history = mergeChatEntries(history, latest);
    try {
      const batch = await source.older(targetRoom, boundary.cursor);
      if (disposed || version !== generation || historyVersion !== historyGeneration) return;
      if (batch.fromCache) throw new Error('Unconfirmed history');
      history = mergeChatEntries(history, batch.entries);
      entries.value = mergeChatEntries(history, latest);
      cursor = entries.value[0];
      hasOlder.value = batch.hasOlder;
    } catch (cause) {
      if (!disposed && version === generation && historyVersion === historyGeneration) historyError.value = roomErrorMessage(cause);
    } finally {
      if (version === generation && historyVersion === historyGeneration) isLoadingOlder.value = false;
    }
  };
  onScopeDispose(() => { disposed = true; clear(); });
  return { messages, hasOlder, isLoadingOlder, fromCache, error, historyError, notice, start, pause, clear, loadOlder };
}
