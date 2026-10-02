import { RefObject, useEffect, useRef } from 'react';

const dialogs: HTMLElement[] = [];
let previousOverflow = '';
export function useDialog(isOpen: boolean, ref: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const element = ref.current;
    if (!isOpen || !element) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!dialogs.length) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialogs.push(element);
    const focusable = () => [...element.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')]
      .filter((el) => !el.hasAttribute('disabled') && el.tabIndex >= 0 && el.getClientRects().length > 0);
    (focusable()[0] || element).focus();
    const onKey = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== element) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = focusable(), first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); element.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      const index = dialogs.indexOf(element); if (index >= 0) dialogs.splice(index, 1);
      if (!dialogs.length) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, ref]);
}
