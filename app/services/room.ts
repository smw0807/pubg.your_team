import {
  collection, doc, getDoc, getDocs, limit, query, runTransaction,
  serverTimestamp, setDoc, writeBatch, type Firestore,
} from 'firebase/firestore';
import type { Profile } from '../models/profile.ts';
import type { Team } from '../models/team.ts';

export class RoomError extends Error {}

export function roomErrorMessage(error: unknown): string {
  if (error instanceof RoomError) return error.message;
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return '접근 권한이 변경되었습니다. 로그인 상태와 팀 참여 여부를 확인해주세요.';
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return '서버에 연결하지 못했습니다. 인터넷 연결을 확인한 후 다시 시도해주세요.';
  if (code.includes('aborted')) return '다른 참여자의 변경과 겹쳤습니다. 잠시 후 다시 시도해주세요.';
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
}

export function readTeam(id: string, data: Record<string, unknown>): Team {
  if (!Array.isArray(data.members) || !data.members.every((uid) => typeof uid === 'string')
    || !['steam', 'kakao'].includes(String(data.platform)) || !['duo', 'squad'].includes(String(data.mode))) {
    throw new RoomError('팀 정보가 올바르지 않습니다. 다른 팀을 선택해주세요.');
  }
  const created = data.createdAt;
  const createdAt = created && typeof created === 'object' && 'toDate' in created && typeof created.toDate === 'function'
    ? created.toDate() as Date : new Date(0);
  return { ...data, id, createdAt } as Team;
}

export async function fetchRoom(db: Firestore, id: string): Promise<Team> {
  const snapshot = await getDoc(doc(db, 'TEAMS', id));
  if (!snapshot.exists() || snapshot.data().closedAt) throw new RoomError('존재하지 않거나 종료된 팀입니다.');
  return readTeam(id, snapshot.data());
}

export async function joinRoom(db: Firestore, id: string, uid: string, profile: Profile): Promise<Team> {
  const ref = doc(db, 'TEAMS', id);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().closedAt) throw new RoomError('존재하지 않거나 종료된 팀입니다.');
    const team = readTeam(id, snapshot.data());
    const nickname = team.platform === 'steam' ? profile.steamNickname : profile.kakaoNickname;
    if (!nickname.trim()) throw new RoomError(`${team.platform === 'steam' ? '스팀' : '카카오'} 닉네임을 먼저 저장해주세요.`);
    if (!team.members.includes(uid)) {
      if (team.members.length >= (team.mode === 'duo' ? 2 : 4)) throw new RoomError('팀 인원이 꽉 찼습니다.');
      team.members = [...team.members, uid];
      transaction.update(ref, { members: team.members });
    }
    transaction.set(doc(ref, 'PRESENCE', uid), { lastSeen: serverTimestamp() });
    return team;
  });
}

export async function touchRoomPresence(db: Firestore, id: string, uid: string) {
  await setDoc(doc(db, 'TEAMS', id, 'PRESENCE', uid), { lastSeen: serverTimestamp() });
}

export async function leaveRoom(db: Firestore, id: string, uid: string): Promise<void> {
  const ref = doc(db, 'TEAMS', id);
  const closed = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return false;
    const data = snapshot.data();
    if (data.closedAt) return data.closedBy === uid;
    if (!Array.isArray(data.members) || !data.members.includes(uid)) return false;
    const members = data.members.filter((member: string) => member !== uid);
    transaction.update(ref, members.length ? { members } : { members, closedBy: uid, closedAt: serverTimestamp() });
    transaction.delete(doc(ref, 'PRESENCE', uid));
    return members.length === 0;
  });
  if (!closed) return;
  // Keep the closed parent until all children are deleted; retries can resume here.
  for (const name of ['CHAT_MESSAGES', 'PRESENCE']) {
    while (true) {
      const children = await getDocs(query(collection(ref, name), limit(400)));
      if (children.empty) break;
      const batch = writeBatch(db);
      children.docs.forEach((child) => batch.delete(child.ref));
      await batch.commit();
    }
  }
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists() && snapshot.data().closedBy === uid && snapshot.data().members?.length === 0) transaction.delete(ref);
  });
}
