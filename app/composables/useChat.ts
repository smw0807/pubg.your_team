import { addDoc, collection, doc, getFirestore, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import useFirebase from '~/utils/firebase';
import { fetchRoom, joinRoom, leaveRoom, readTeam, RoomError, roomErrorMessage, touchRoomPresence } from '~/services/room';
import type { Team } from '~/models/team';
import type { Profile } from '~/models/profile';
import type { ChatMessage } from '~/models/chat';

export default function useChat() {
  const db = getFirestore(useFirebase().app);
  const { user, waitForAuth, onBeforeSignOut } = useAuth();
  const { getProfile, searchProfile } = useProfile();
  const team = ref<Team | null>(null);
  const teamMembers = ref<Profile[]>([]);
  const chatMessages = ref<ChatMessage[]>([]);
  const phase = ref<'idle' | 'joining' | 'joined' | 'leaving' | 'leave-error' | 'error' | 'ended'>('idle');
  const errorMessage = ref('');
  const connectionErrors = reactive({ team: '', chat: '', profiles: '', presence: '' });
  const connectionError = computed(() => Object.values(connectionErrors).find(Boolean) ?? '');
  const isOffline = ref(false);
  let participantUid: string | null = null;
  let roomId: string | null = null;
  let joined = false;
  let disposed = false;
  let generation = 0;
  let memberRequest = 0;
  let lastMembers = '';
  let stops: Array<() => void> = [];
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let heartbeatPending = false;
  let joining: Promise<boolean> | null = null;
  let leaving: Promise<void> | null = null;

  const cleanupWatchers = () => {
    generation++;
    memberRequest++;
    stops.forEach((stop) => stop());
    stops = [];
    clearInterval(heartbeat);
    heartbeat = undefined;
  };
  const endSession = (message: string) => {
    cleanupWatchers();
    joined = false;
    phase.value = 'ended';
    errorMessage.value = message;
    teamMembers.value = [];
    chatMessages.value = [];
  };
  const pulse = async () => {
    if (!joined || !roomId || !participantUid || heartbeatPending || isOffline.value || disposed) return;
    const version = generation;
    heartbeatPending = true;
    try {
      await touchRoomPresence(db, roomId, participantUid);
      if (version === generation) connectionErrors.presence = '';
    } catch (error) {
      if (version === generation) connectionErrors.presence = roomErrorMessage(error);
    } finally { heartbeatPending = false; }
  };
  const watchRoom = () => {
    cleanupWatchers();
    if (!roomId || !participantUid || !joined || disposed) return;
    const version = generation;
    const current = () => version === generation && !disposed;
    const ref = doc(db, 'TEAMS', roomId);
    lastMembers = '';
    stops.push(onSnapshot(ref, (snapshot) => {
      if (!current()) return;
      if (!snapshot.exists() || snapshot.data().closedAt || !snapshot.data().members?.includes(participantUid)) {
        endSession('팀이 종료되었거나 참여가 해제되었습니다. 팀 목록에서 다시 입장해주세요.');
        return;
      }
      try {
        team.value = readTeam(snapshot.id, snapshot.data());
        connectionErrors.team = '';
      } catch (error) { connectionErrors.team = roomErrorMessage(error); return; }
      const members = team.value.members;
      const signature = JSON.stringify(members);
      if (signature === lastMembers) return;
      lastMembers = signature;
      const request = ++memberRequest;
      void Promise.all(members.map(searchProfile)).then((profiles) => {
        if (!current() || request !== memberRequest) return;
        teamMembers.value = profiles.filter((profile): profile is Profile => profile !== null);
        connectionErrors.profiles = '';
      }).catch((error: unknown) => {
        if (!current() || request !== memberRequest) return;
        lastMembers = '';
        connectionErrors.profiles = roomErrorMessage(error);
      });
    }, (error) => { if (current()) connectionErrors.team = roomErrorMessage(error); }));
    stops.push(onSnapshot(query(collection(ref, 'CHAT_MESSAGES'), orderBy('createdAt', 'asc')), (snapshot) => {
      if (!current()) return;
      chatMessages.value = snapshot.docs.map((message) => {
        const data = message.data({ serverTimestamps: 'estimate' });
        return { ...data, id: message.id, createdAt: data.createdAt?.toDate() ?? new Date() } as ChatMessage;
      });
      connectionErrors.chat = '';
    }, (error) => { if (current()) connectionErrors.chat = roomErrorMessage(error); }));
    heartbeat = setInterval(() => void pulse(), 60_000);
  };
  const joinTeam = (id: string): Promise<boolean> => {
    if (joining) return joining;
    if (joined) return Promise.resolve(true);
    joining = (async () => {
      phase.value = 'joining';
      errorMessage.value = '';
      try {
        const current = await waitForAuth();
        if (disposed) return false;
        if (!current) throw new RoomError('로그인 후 팀에 입장할 수 있습니다.');
        if (isOffline.value) throw new RoomError('인터넷 연결을 확인한 후 다시 입장해주세요.');
        team.value = await fetchRoom(db, id);
        const profile = await getProfile();
        if (!profile) throw new RoomError('상단 프로필에서 게임 닉네임을 먼저 저장해주세요.');
        if (disposed) return false;
        const result = await joinRoom(db, id, current.uid, profile);
        participantUid = current.uid;
        roomId = id;
        joined = true;
        team.value = result;
        if (user.value?.uid !== current.uid) {
          endSession('로그인 상태가 변경되었습니다. 다시 로그인해주세요.');
          return false;
        }
        phase.value = 'joined';
        watchRoom();
        return true;
      } catch (error) {
        phase.value = 'error';
        errorMessage.value = roomErrorMessage(error);
        return false;
      }
    })().finally(() => { joining = null; });
    return joining;
  };
  const leaveTeam = (): Promise<void> => {
    if (leaving) return leaving;
    leaving = (async () => {
      if (joining) await joining;
      if (!joined || !roomId || !participantUid) return;
      if (user.value?.uid !== participantUid) { endSession('로그인 상태가 변경되었습니다.'); return; }
      if (isOffline.value) throw new RoomError('오프라인에서는 퇴장을 완료할 수 없습니다. 연결 후 다시 시도해주세요.');
      phase.value = 'leaving';
      cleanupWatchers();
      try {
        await leaveRoom(db, roomId, participantUid);
        joined = false;
        team.value = null;
        phase.value = 'idle';
      } catch (error) {
        phase.value = 'leave-error';
        errorMessage.value = `퇴장 처리가 끝나지 않았습니다. ${roomErrorMessage(error)}`;
        // Do not discard membership: closing may have succeeded before cleanup failed.
        throw new RoomError(errorMessage.value);
      }
    })().finally(() => { leaving = null; });
    return leaving;
  };
  const retryConnection = async () => {
    if (phase.value === 'leaving' || phase.value === 'leave-error' || !joined || !roomId) return;
    errorMessage.value = '';
    Object.keys(connectionErrors).forEach((key) => { connectionErrors[key as keyof typeof connectionErrors] = ''; });
    watchRoom();
    await pulse();
  };
  const sendChatMessage = async (message: string) => {
    const text = message.trim();
    if (!joined || !roomId || user.value?.uid !== participantUid || phase.value !== 'joined') throw new RoomError('팀에 입장한 후 메시지를 보낼 수 있습니다.');
    if (isOffline.value) throw new RoomError('오프라인입니다. 연결 후 다시 전송해주세요.');
    if (!text || text.length > 2000) throw new RoomError('메시지는 1~2000자로 입력해주세요.');
    const profile = await getProfile();
    const nickname = team.value?.platform === 'kakao' ? profile?.kakaoNickname : profile?.steamNickname;
    if (!nickname) throw new RoomError('게임 닉네임을 먼저 저장해주세요.');
    await addDoc(collection(db, 'TEAMS', roomId, 'CHAT_MESSAGES'), {
      type: 'user', uid: participantUid, senderId: participantUid, sender: nickname,
      message: text, createdAt: serverTimestamp(),
    });
  };
  const updateOnline = () => {
    isOffline.value = !navigator.onLine;
    if (!isOffline.value && joined) void retryConnection();
  };
  const resume = () => { if (document.visibilityState === 'visible') updateOnline(); };
  const unregisterSignOut = onBeforeSignOut(async () => {
    await leaveTeam();
    endSession('로그아웃되었습니다. 팀 목록에서 다시 입장해주세요.');
  });
  onMounted(() => {
    isOffline.value = !navigator.onLine;
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    document.addEventListener('visibilitychange', resume);
  });
  watch(() => user.value?.uid, (uid) => {
    if (joined && uid !== participantUid) endSession('로그인 상태가 변경되었습니다. 다시 로그인해주세요.');
  });
  onUnmounted(() => {
    disposed = true;
    unregisterSignOut();
    cleanupWatchers();
    window.removeEventListener('online', updateOnline);
    window.removeEventListener('offline', updateOnline);
    document.removeEventListener('visibilitychange', resume);
  });
  return { team, teamMembers, chatMessages, phase, errorMessage, connectionError, isOffline, joinTeam, leaveTeam, retryConnection, sendChatMessage };
}
