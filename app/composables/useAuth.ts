import { app } from '~/utils/firebase';
import {
  getAdditionalUserInfo,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type UserCredential,
} from 'firebase/auth';

export default function useAuth() {
  const auth: Auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  const signIn = async () => {
    const result = await signInWithPopup(auth, provider);
    console.log(result);
  };

  // 첫 로그인 여부 확인
  const isNewUser = async (user: UserCredential) => {
    const result = getAdditionalUserInfo(user);
    return result?.isNewUser || null;
  };

  return {
    signIn,
    signOut: signOut(auth),
    isNewUser,
  };
}
