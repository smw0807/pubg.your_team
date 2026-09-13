import { doc, getDoc, getFirestore, runTransaction, setDoc } from 'firebase/firestore';
import { profilesCollection, publicProfilesCollection } from '~/constants/collections';
import type { Profile } from '~/models/profile';
import useFirebase from '~/utils/firebase';

export default function useProfile() {
  const { app } = useFirebase();
  const db = getFirestore(app);

  const { user } = useAuth();

  const profile = ref<Profile | null>(null);

  const getProfile = async () => {
    const uid = user.value?.uid;
    if (!uid) {
      profile.value = null;
      return null;
    }
    const publicRef = doc(db, publicProfilesCollection, uid);
    profile.value = await runTransaction(db, async (transaction) => {
      const current = await transaction.get(publicRef);
      if (current.exists()) return toPublicProfile(uid, current.data());
      // Only the owner can read legacy account data. Never read another
      // member's legacy document, even as a fallback.
      const legacy = await transaction.get(doc(db, profilesCollection, uid));
      if (!legacy.exists()) return null;
      const migrated = toPublicProfile(uid, legacy.data());
      transaction.set(publicRef, migrated);
      return migrated;
    });
    return profile.value;
  };

  const setProfile = async (steamNickname: string, kakaoNickname: string) => {
    if (!user.value) throw new Error('로그인이 필요합니다.');
    const profileData: Profile = {
      id: user.value.uid,
      steamNickname: steamNickname.trim(),
      kakaoNickname: kakaoNickname.trim(),
    };
    if (profileData.steamNickname.length > 64 || profileData.kakaoNickname.length > 64) {
      throw new Error('닉네임은 64자 이내로 입력해주세요.');
    }
    await setDoc(doc(db, publicProfilesCollection, user.value.uid), { ...profileData });
    profile.value = profileData;
  };

  const searchProfile = async (id: string) => {
    const p = await getDoc(doc(db, publicProfilesCollection, id));
    return p.exists() ? toPublicProfile(id, p.data()) : null;
  };

  return {
    profile,
    getProfile,
    setProfile,
    searchProfile,
  };
}

function toPublicProfile(id: string, data: Record<string, unknown>): Profile {
  return {
    id,
    steamNickname: typeof data.steamNickname === 'string' ? data.steamNickname.trim() : '',
    kakaoNickname: typeof data.kakaoNickname === 'string' ? data.kakaoNickname.trim() : '',
  };
}
