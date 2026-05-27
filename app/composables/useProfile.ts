import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { profilesCollection } from '~/constants/collections';
import type { Profile } from '~/models/profile';
import useFirebase from '~/utils/firebase';

export default function useProfile() {
  const { app } = useFirebase();
  const db = getFirestore(app);

  const { user } = useAuth();

  const profile = ref<Profile | null>(null);

  const getProfile = async () => {
    if (!user.value) return;
    const p = await getDoc(doc(db, profilesCollection, user.value.uid));
    profile.value = p.exists() ? (p.data() as Profile) : null;
    return profile.value;
  };

  const setProfile = async (steamNickname: string, kakaoNickname: string) => {
    if (!user.value) return;
    const profileData: Profile = {
      id: user.value.uid,
      name: user.value.displayName as string,
      email: user.value.email as string,
      steamNickname,
      kakaoNickname,
    };
    await setDoc(doc(db, profilesCollection, user.value.uid), { ...profileData });
    profile.value = profileData;
  };

  const searchProfile = async (id: string) => {
    const p = await getDoc(doc(db, profilesCollection, id));
    return p.exists() ? (p.data() as Profile) : null;
  };

  return {
    profile,
    getProfile,
    setProfile,
    searchProfile,
  };
}
