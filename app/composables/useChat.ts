import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import useFirebase from '~/utils/firebase';
import {
  teamsCollection,
  chatMessagesCollection,
} from '~/constants/collections';
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

  // 팀 정보
  const getTeam = async (id: string) => {
    return await getDoc(doc(db, teamsCollection, id));
  };

  const getTeamInfo = async (id: string) => {
    const data = await getTeam(id);
    if (!data.exists()) {
      openAlert('존재하지 않는 팀입니다.');
      team.value = null;
      router.back();
      return;
    }
    team.value = {
      id: data.id,
      ...(data.data() as Team),
    } as Team;
  };

  // 팀 입장 자리 있는지 체크
  const checkTeamEntry = async (id: string) => {
    const data = await getTeam(id);
    const teamData = data.data() as Team;
    if (teamData.members.length >= (teamData.mode === 'duo' ? 2 : 4)) {
      return false;
    }
    return true;
  };

  // 팀 참여
  const joinTeam = async (id: string) => {
    await getProfile();
    if (!profile.value) {
      openAlert(
        '프로필 정보를 입력해주세요.',
        '프로필 정보를 입력해야 팀 기능을 사용할 수 있습니다.'
      );
      router.back();
      return;
    }
    if (team.value?.platform === 'kakao' && !profile.value?.kakaoNickname) {
      openAlert(
        '카카오 닉네임을 입력해주세요.',
        '카카오 팀찾기를 이용하려면 닉네임을 입력해야 합니다.'
      );
      router.back();
      return;
    }
    if (team.value?.platform === 'steam' && !profile.value?.steamNickname) {
      openAlert(
        '스팀 닉네임을 입력해주세요.',
        '스팀 팀찾기를 이용하려면 닉네임을 입력해야 합니다.'
      );
      router.back();
      return;
    }
    const check = await checkTeamEntry(id);
    if (!check) {
      openAlert('팀 인원이 꽉 찼습니다.');
      router.back();
      return;
    }
    await updateDoc(doc(db, teamsCollection, id), {
      members: arrayUnion(user.value?.uid as string),
    });
    await getTeamInfo(id);
    watchTeamMembers();
    watchChatMessages();
  };

  // 팀 나가기
  const leaveTeam = async (id: string) => {
    await updateDoc(doc(db, teamsCollection, id), {
      members: arrayRemove(user.value?.uid as string),
    });
    const data = await getTeam(id);
    const teamData = data.data() as Team;
    if (teamData.members.length === 0) {
      await deleteTeam(id);
      team.value = null;
    }
  };

  // 팀 삭제
  const deleteTeam = async (id: string) => {
    await deleteDoc(doc(db, teamsCollection, id));
    team.value = null;
  };

  // 팀 접속자 정보 데이터 변화 감지
  const watchTeamMembers = () => {
    try {
      onSnapshot(
        doc(db, teamsCollection, team.value?.id as string),
        async (doc) => {
          const data = doc.data() as Team;
          if (data.members) {
            teamMembers.value = [];
            for (const member of data.members) {
              const profile = await searchProfile(member);
              teamMembers.value.push(profile);
            }
          }
        }
      );
    } catch (error) {
      console.error('팀 접속자 정보 데이터 변화 감지 실패:', error);
    }
  };

  // 채팅 메시지 전송
  const sendChatMessage = async (message: string) => {
    const params: ChatMessage = {
      type: 'user',
      uid: user.value?.uid as string,
      sender:
        team.value?.platform === 'kakao'
          ? profile.value?.kakaoNickname || ''
          : profile.value?.steamNickname || '',
      senderId: user.value?.uid as string,
      message,
      createdAt: new Date(),
    };
    const teamRef = doc(db, teamsCollection, team.value?.id as string);
    const chatMessageCollection = collection(teamRef, chatMessagesCollection);
    await addDoc(chatMessageCollection, params);
  };

  // 채팅 메시지 데이터 변화 감지
  const watchChatMessages = () => {
    try {
      const teamRef = doc(db, teamsCollection, team.value?.id as string);
      const messageCollection = collection(teamRef, chatMessagesCollection);
      const q = query(messageCollection, orderBy('createdAt', 'asc'));
      onSnapshot(q, (querySnapshot) => {
        chatMessages.value = [];
        querySnapshot.forEach((doc) => {
          chatMessages.value.push({
            ...(doc.data() as ChatMessage),
            createdAt: doc.data().createdAt.toDate().toLocaleString(),
          });
        });
      });
    } catch (error) {
      console.error('채팅 메시지 데이터 변화 감지 실패:', error);
    }
  };

  return {
    team,
    teamMembers,
    chatMessages,
    getTeamInfo,
    joinTeam,
    leaveTeam,
    sendChatMessage,
  };
}
