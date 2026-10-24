import { HTMLAttributes, RefObject, useLayoutEffect, useRef } from 'react';

/** Anima el contenido que cambió sin desmontar formularios ni perder su estado. */
export function useContentMotion(ref: RefObject<HTMLElement | null>, changeKey: string) {
  const previous = useRef(changeKey);
  useLayoutEffect(() => {
    const changed = previous.current !== changeKey;
    previous.current = changeKey;
    const element = ref.current;
    if (!changed || !element || typeof element.animate !== 'function') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const slow = window.matchMedia('(update: slow)');
    if (reduced.matches || slow.matches || document.documentElement.classList.contains('reduced-motion')) return;
    const animation = element.animate([
      { opacity: .86, transform: 'translateY(4px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    const cancel = () => animation.cancel();
    reduced.addEventListener('change', cancel);
    slow.addEventListener('change', cancel);
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('reduced-motion')) cancel();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const detach = () => {
      observer.disconnect();
      reduced.removeEventListener('change', cancel);
      slow.removeEventListener('change', cancel);
    };
    void animation.finished.then(detach, detach);
    return () => { cancel(); detach(); };
  }, [changeKey, ref]);
}

export function MotionRegion({ motionKey, children, ...props }: HTMLAttributes<HTMLDivElement> & { motionKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useContentMotion(ref, motionKey);
  return <div {...props} ref={ref}>{children}</div>;
}
