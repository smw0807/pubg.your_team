import { ref, type Ref } from 'vue';

export default function useChatComposer(disabled: Readonly<Ref<boolean>>, send: (message: string) => Promise<void>, onError: (error: unknown) => void, onSent: () => Promise<void>) {
  const draft = ref('');
  const isSending = ref(false);
  const sendMessage = async () => {
    if (disabled.value || isSending.value || !draft.value.trim()) return;
    isSending.value = true;
    const submitted = draft.value;
    try {
      await send(submitted);
      if (draft.value === submitted) draft.value = '';
      await onSent();
    } catch (error) { onError(error); }
    finally { isSending.value = false; }
  };
  return { draft, isSending, sendMessage };
}
