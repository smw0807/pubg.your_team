import { collection, documentId, getDocsFromServer, limit, onSnapshot, orderBy, query, startAfter, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore';
import type { ChatMessage } from '../models/chat.ts';

export const CHAT_PAGE_SIZE = 50;
export interface ChatEntry {
  message: ChatMessage & { id: string };
  cursor: QueryDocumentSnapshot;
  seconds: number;
  nanoseconds: number;
}
export interface ChatBatch { entries: ChatEntry[]; fromCache: boolean; hasOlder: boolean }
export interface ChatHistorySource {
  subscribe: (roomId: string, next: (batch: ChatBatch) => void, error: (error: unknown) => void) => () => void;
  older: (roomId: string, cursor: QueryDocumentSnapshot) => Promise<ChatBatch>;
}

export function chatHistoryQuery(db: Firestore, roomId: string, cursor?: QueryDocumentSnapshot) {
  const base = query(collection(db, 'TEAMS', roomId, 'CHAT_MESSAGES'), orderBy('createdAt', 'desc'), orderBy(documentId(), 'desc'));
  return cursor ? query(base, startAfter(cursor), limit(CHAT_PAGE_SIZE + 1)) : query(base, limit(CHAT_PAGE_SIZE));
}

function entry(snapshot: QueryDocumentSnapshot): ChatEntry {
  const data = snapshot.data({ serverTimestamps: 'estimate' });
  return {
    message: { ...data, id: snapshot.id, createdAt: data.createdAt?.toDate() ?? new Date(0) } as ChatMessage & { id: string },
    cursor: snapshot,
    seconds: data.createdAt?.seconds ?? 0,
    nanoseconds: data.createdAt?.nanoseconds ?? 0,
  };
}

export function createChatHistorySource(db: Firestore): ChatHistorySource {
  return {
    subscribe: (roomId, next, error) => onSnapshot(chatHistoryQuery(db, roomId), { includeMetadataChanges: true }, (snapshot) => {
      try { next({ entries: snapshot.docs.map(entry), fromCache: snapshot.metadata.fromCache, hasOlder: snapshot.size === CHAT_PAGE_SIZE }); }
      catch (cause) { error(cause); }
    }, error),
    older: async (roomId, cursor) => {
      // A sparse offline cache must never advance the history cursor or claim EOF.
      const snapshot = await getDocsFromServer(chatHistoryQuery(db, roomId, cursor));
      return { entries: snapshot.docs.slice(0, CHAT_PAGE_SIZE).map(entry), fromCache: false, hasOlder: snapshot.size > CHAT_PAGE_SIZE };
    },
  };
}

export function mergeChatEntries(...groups: ChatEntry[][]) {
  const byId = new Map<string, ChatEntry>();
  for (const group of groups) for (const value of group) byId.set(value.message.id, value);
  return [...byId.values()].sort((a, b) => a.seconds - b.seconds || a.nanoseconds - b.nanoseconds || (a.message.id < b.message.id ? -1 : a.message.id > b.message.id ? 1 : 0));
}
