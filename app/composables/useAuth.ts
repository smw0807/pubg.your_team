import useFirebase from '~/utils/firebase';
import {
  getAdditionalUserInfo,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';

// 모듈 스코프 싱글톤: 인증 상태는 앱 전체에서 공유
let unsubscribeAuth: (() => void) | null = null;
const userInfo = ref<User | null>(null);

export default function useAuth() {
  const { app } = useFirebase();
  const auth: Auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  const user = computed<User | null>(() => userInfo.value);

  // 아직 리스너가 등록되지 않은 경우에만 등록
  if (!unsubscribeAuth) {
    unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      userInfo.value = u;
    });
  }

  // 로그인
  const signIn = async () => {
    await signInWithPopup(auth, provider);
  };

  // 로그아웃
  const handleSignOut = async () => {
    await signOut(auth);
  };

  // 첫 로그인 여부 확인
  const isNewUser = async (user: UserCredential) => {
    const result = getAdditionalUserInfo(user);
    return result?.isNewUser || null;
  };

  return {
    signIn,
    signOut: handleSignOut,
    isNewUser,
    user,
  };
}
