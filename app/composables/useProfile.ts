import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { profilesCollection } from '~/constants/collections';
import type { Profile } from '~/models/profile';
import useFirebase from '~/utils/firebase';

export default function useProfile() {
  const { app } = useFirebase();
  const db = getFirestore(app);

  const { user, getUserInfo } = useAuth();

  const profileInfo = ref<Profile | null>(null);
  const profile = computed<Profile | null>(() => profileInfo.value);

  const getProfile = async () => {
    if (!user.value) return;
    const p = await getDoc(
      doc(db, profilesCollection, user.value?.uid as string)
    );
    profileInfo.value = p.data() as Profile;
    return profileInfo.value;
  };

  const setProfile = async (steamNickname: string, kakaoNickname: string) => {
    if (!user.value) return;
    const profileData: Profile = {
      id: user.value?.uid as string,
      name: user.value?.displayName as string,
      email: user.value?.email as string,
      steamNickname,
      kakaoNickname,
    };

    await setDoc(doc(db, profilesCollection, user.value?.uid as string), {
      ...profileData,
    });
    profileInfo.value = profileData;
  };

  onMounted(async () => {
    await getUserInfo();
    await getProfile();
  });

  return {
    profile,
    getProfile,
    setProfile,
  };
}
