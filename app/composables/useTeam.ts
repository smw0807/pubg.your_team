import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { GameMode, GameType, Platform, Tier } from '~/models/common';
import type { Team } from '~/models/team';
import useFirebase from '~/utils/firebase';
import { teamsCollection } from '~/constants/collections';

export default function useTeam() {
  const { app } = useFirebase();
  const db = getFirestore(app);
  const toast = useToast();

  const teamList = ref<Team[]>([]);

  // 방 정보 가져오기
  const getTeams = async (
    platform: Platform,
    gameType: GameType,
    gameMode: GameMode,
    tier: Tier
  ) => {
    let q = query(
      collection(db, teamsCollection),
      where('platform', '==', platform),
      orderBy('createdAt', 'desc')
    );
    if (gameType !== 'all') {
      q = query(
        q,
        where('isRanked', '==', gameType === 'ranked' ? true : false)
      );
    }
    if (gameMode !== 'all') {
      q = query(q, where('mode', '==', gameMode));
    }
    if (tier !== 'all') {
      q = query(q, where('tier', '==', tier));
    }
    const teams = await getDocs(q);
    teamList.value = teams.docs.map((doc) => {
      return {
        id: doc.id,
        ...(doc.data() as Team),
      } as Team;
    }) as Team[];
  };

  // 방 생성
  const createTeam = async (team: Team) => {
    try {
      console.log(team);
      // await addDoc(collection(db, teamsCollection), team);
      toast.add({
        title: '방이 생성되었습니다.',
        color: 'success',
        orientation: 'horizontal',
      });
    } catch (error) {
      console.error(error);
    }
  };

  return {
    getTeams,
    teamList,
    createTeam,
  };
}
