import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import useFirebase from '~/utils/firebase';
import { teamsCollection, chatMessagesCollection } from '~/constants/collections';
import type { Team } from '~/models/team';
import type { Profile } from '~/models/profile';
import type { ChatMessage } from '~/models/chat';

export default function useChat() {
  const { app } = useFirebase();
  const db = getFirestore(app);

  const router = useRouter();
  const { openAlert } = useAlert();
  const { user } = useAuth();
  const { profile, getProfile, searchProfile } = useProfile();

  const team = ref<Team | null>(null);
  const teamMembers = ref<Profile[]>([]);
  const chatMessages = ref<ChatMessage[]>([]);
  const hasJoinedTeam = ref(false);

  let stopWatchingTeamMembers: (() => void) | null = null;
  let stopWatchingChatMessages: (() => void) | null = null;

  const getTeamInfo = async (id: string) => {
    const data = await getDoc(doc(db, teamsCollection, id));
    if (!data.exists()) {
      openAlert('존재하지 않는 팀입니다.');
      team.value = null;
      router.back();
      return;
    }
    team.value = { id: data.id, ...(data.data() as Team) } as Team;
  };

  const cleanupWatchers = () => {
    stopWatchingTeamMembers?.();
    stopWatchingTeamMembers = null;
    stopWatchingChatMessages?.();
    stopWatchingChatMessages = null;
  };

  const joinTeam = async (id: string) => {
    const uid = user.value?.uid;
    if (!uid) {
      openAlert('로그인이 필요합니다.');
      return false;
    }

    await getProfile();
    if (!profile.value) {
      openAlert('프로필 정보를 입력해주세요.', '프로필 정보를 입력해야 팀 기능을 사용할 수 있습니다.');
      router.back();
      return false;
    }
    if (team.value?.platform === 'kakao' && !profile.value.kakaoNickname) {
      openAlert('카카오 닉네임을 입력해주세요.', '카카오 팀찾기를 이용하려면 닉네임을 입력해야 합니다.');
      router.back();
      return false;
    }
    if (team.value?.platform === 'steam' && !profile.value.steamNickname) {
      openAlert('스팀 닉네임을 입력해주세요.', '스팀 팀찾기를 이용하려면 닉네임을 입력해야 합니다.');
      router.back();
      return false;
    }

    const teamRef = doc(db, teamsCollection, id);
    const joinResult = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(teamRef);
      if (!snap.exists()) return 'not-found' as const;

      const teamData = snap.data() as Team;
      const memberLimit = teamData.mode === 'duo' ? 2 : 4;

      if (teamData.members.includes(uid)) return 'already-joined' as const;
      if (teamData.members.length >= memberLimit) return 'full' as const;

      transaction.update(teamRef, { members: [...teamData.members, uid] });
      return 'joined' as const;
    });

    if (joinResult === 'not-found') {
      openAlert('존재하지 않는 팀입니다.');
      router.back();
      return false;
    }
    if (joinResult === 'full') {
      openAlert('팀 인원이 꽉 찼습니다.');
      router.back();
      return false;
    }

    await getTeamInfo(id);
    cleanupWatchers();
    watchTeamMembers();
    watchChatMessages();
    hasJoinedTeam.value = true;
    return true;
  };

  const leaveTeam = async (id: string) => {
    const uid = user.value?.uid;
    cleanupWatchers();

    if (!uid || !hasJoinedTeam.value) return;

    const teamRef = doc(db, teamsCollection, id);
    const shouldDelete = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(teamRef);
      if (!snap.exists()) return false;

      const teamData = snap.data() as Team;
      const remaining = teamData.members.filter((m) => m !== uid);

      if (remaining.length === 0) {
        transaction.delete(teamRef);
        return true;
      }
      transaction.update(teamRef, { members: remaining });
      return false;
    });

    hasJoinedTeam.value = false;
    if (shouldDelete) {
      const chatMessageCollection = collection(teamRef, chatMessagesCollection);
      const messagesSnap = await getDocs(chatMessageCollection);
      if (!messagesSnap.empty) {
        const batch = writeBatch(db);
        messagesSnap.docs.forEach((msgDoc) => batch.delete(msgDoc.ref));
        await batch.commit();
      }
      team.value = null;
    }
  };

  const watchTeamMembers = () => {
    try {
      stopWatchingTeamMembers = onSnapshot(
        doc(db, teamsCollection, team.value?.id as string),
        async (snapshot) => {
          if (!snapshot.exists()) {
            teamMembers.value = [];
            return;
          }
          const data = snapshot.data() as Team;
          if (data.members) {
            const profiles = await Promise.all(data.members.map((member) => searchProfile(member)));
            teamMembers.value = profiles.filter((p): p is Profile => p !== null);
          }
        }
      );
    } catch (error) {
      console.error('팀 접속자 정보 데이터 변화 감지 실패:', error);
    }
  };

  const sendChatMessage = async (message: string) => {
    const params: ChatMessage = {
      type: 'user',
      uid: user.value?.uid as string,
      sender: team.value?.platform === 'kakao' ? profile.value?.kakaoNickname || '' : profile.value?.steamNickname || '',
      senderId: user.value?.uid as string,
      message,
      createdAt: new Date(),
    };
    const teamRef = doc(db, teamsCollection, team.value?.id as string);
    await addDoc(collection(teamRef, chatMessagesCollection), params);
  };

  const watchChatMessages = () => {
    try {
      const teamRef = doc(db, teamsCollection, team.value?.id as string);
      const q = query(collection(teamRef, chatMessagesCollection), orderBy('createdAt', 'asc'));
      stopWatchingChatMessages = onSnapshot(q, (querySnapshot) => {
        chatMessages.value = querySnapshot.docs.map((msgDoc) => ({
          ...(msgDoc.data() as ChatMessage),
          createdAt: msgDoc.data().createdAt.toDate().toLocaleString(),
        }));
      });
    } catch (error) {
      console.error('채팅 메시지 데이터 변화 감지 실패:', error);
    }
  };

  return { team, teamMembers, chatMessages, getTeamInfo, joinTeam, leaveTeam, sendChatMessage, cleanupWatchers };
}
