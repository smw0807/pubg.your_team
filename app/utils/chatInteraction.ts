export function isChatSubmitKey(event: Pick<KeyboardEvent, 'key' | 'isComposing' | 'keyCode' | 'shiftKey' | 'repeat'>) {
  // Safari can report isComposing=false for the Enter that commits an IME value.
  return event.key === 'Enter' && !event.isComposing && event.keyCode !== 229 && !event.shiftKey && !event.repeat;
}

export function handleChatEnter(event: KeyboardEvent, submit: () => void) {
  // Let the IME commit its candidate; only suppress the form's ordinary Enter.
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if (isChatSubmitKey(event)) submit();
}

export function isNearChatBottom(element: Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 64;
}
