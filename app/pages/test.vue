<script setup lang="ts">
import { addDoc, collection, getFirestore } from 'firebase/firestore';
import { mockTeams } from '~/assets/mock/temas';
import { teamsCollection } from '~/constants/collections';
import useFirebase from '~/utils/firebase';

const handleAddTeam = () => {
  const { app } = useFirebase();
  const db = getFirestore(app);
  console.log('방 데이터 추가하기');
  mockTeams.forEach(async (team) => {
    await addDoc(collection(db, teamsCollection), team);
  });
};
</script>

<template>
  <div>
    <UButton @click="handleAddTeam">방 데이터 추가하기</UButton>
  </div>
</template>
