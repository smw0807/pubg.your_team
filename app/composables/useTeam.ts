import {
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type { CreateTeam } from '~/models/team';
import useAuth from '~/composables/useAuth';
import useFirebase from '~/utils/firebase';
import { teamsCollection } from '~/constants/collections';

export default function useTeam() {
  const { app } = useFirebase();
  const db = getFirestore(app);
  const toast = useToast();

  const { waitForAuth } = useAuth();
  const { getProfile } = useProfile();

  const createTeam = async (team: CreateTeam) => {
    const uid = (await waitForAuth())?.uid;
    if (!uid) throw new Error('로그인이 필요합니다.');
    const profile = await getProfile();
    const nickname = team.platform === 'steam' ? profile?.steamNickname : profile?.kakaoNickname;
    if (!nickname?.trim()) {
      throw new Error('선택한 플랫폼의 게임 닉네임을 먼저 저장해주세요.');
    }
    const title = team.title.trim();
    if (!title || title.length > 100 || team.description.length > 1000) {
      throw new Error('팀 제목은 1~100자, 설명은 1000자 이내로 입력해주세요.');
    }
    const params = {
      title, description: team.description.trim(), mode: team.mode,
      tier: team.tier, damage: team.damage, platform: team.platform,
      isRanked: team.isRanked, members: [uid], createdAt: serverTimestamp(),
    };
    const result = doc(collection(db, teamsCollection));
    const batch = writeBatch(db);
    batch.set(result, params);
    batch.set(doc(result, 'PRESENCE', uid), { lastSeen: serverTimestamp() });
    await batch.commit();
    toast.add({ title: '팀이 생성되었습니다.', color: 'success', orientation: 'horizontal' });
    await navigateTo(`/room/${result.id}`);
  };

  return { createTeam };
}
