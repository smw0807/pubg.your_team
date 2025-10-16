import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { profilesCollection } from '~/constants/collections';
import type { Profile } from '~/models/profile';
import useFirebase from '~/utils/firebase';

export default function useProfile() {
  const { app } = useFirebase();
  const db = getFirestore(app);

  const { user, getUserInfo } = useAuth();

  const profile = ref<Profile | null>(null);

  const getProfile = async () => {
    if (!user.value) return;
    const p = await getDoc(
      doc(db, profilesCollection, user.value?.uid as string)
    );
    profile.value = p.data() as Profile;
    return profile.value;
  };

  onMounted(async () => {
    await getUserInfo();
    await getProfile();
  });

  return {
    profile,
    getProfile,
  };
}
