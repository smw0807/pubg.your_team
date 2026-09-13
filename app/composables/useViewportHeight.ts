import { onMounted, onScopeDispose, ref } from 'vue';
import { observeViewportHeight } from '../utils/viewport.ts';

export default function useViewportHeight() {
  const height = ref('100dvh');
  let stop: (() => void) | undefined;
  onMounted(() => { stop = observeViewportHeight(window, (value) => { height.value = value; }); });
  onScopeDispose(() => stop?.());
  return height;
}
