import { doc, getDoc, getFirestore } from 'firebase/firestore';
import useFirebase from '~/utils/firebase';
import { teamsCollection } from '~/constants/collections';
import type { Team } from '~/models/team';

export default function useRoom() {
  const { app } = useFirebase();
  const db = getFirestore(app);

  // 팀 정보
  const getTeam = async (id: string) => {
    const data = await getDoc(doc(db, teamsCollection, id));
    return {
      id: data.id,
      ...(data.data() as Team),
    } as Team;
  };

  // 팀 나가기

  return {
    getTeam,
  };
}
