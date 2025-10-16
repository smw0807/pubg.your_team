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

export default function useAuth() {
  const { app } = useFirebase();
  const auth: Auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  const userInfo = ref<User | null>(null);
  const user = computed<User | null>(() => userInfo.value);

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

  // 로그인 사용자 정보 가져오기
  const getUserInfo = async () => {
    return getAuth(app);
  };

  // 현재 로그인 사용자 확인
  const currentUser = async (callback: (user: User | null) => void) => {
    try {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          callback(user);
        } else {
          callback(null);
        }
      });
    } catch (error) {
      callback(null);
      console.error(error);
      throw new Error('현재 사용자 정보 가져오기 실패');
    }
  };

  currentUser((u) => {
    if (u) {
      userInfo.value = u;
    } else {
      userInfo.value = null;
    }
  });

  return {
    signIn,
    signOut: handleSignOut,
    isNewUser,
    user,
    getUserInfo,
  };
}
