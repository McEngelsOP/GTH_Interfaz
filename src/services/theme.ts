export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_TRANSITION_MS = 280;
const DARK_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SLOW_UPDATE_QUERY = '(update: slow)';
let colorTransition: string | null | undefined;

// Interpolate the shared palette, including SVGs and gradients, without
// replacing the existing transitions of buttons, drawers or other controls.
function registerThemeColors(root: HTMLElement): string | null {
  if (colorTransition !== undefined) return colorTransition;
  colorTransition = null;
  if (typeof CSS.registerProperty !== 'function') return null;
  const computed = getComputedStyle(root);
  const colors = Array.from(computed).filter((name) =>
    name.startsWith('--') && CSS.supports('color', computed.getPropertyValue(name).trim())
  );
  try {
    for (const name of colors) {
      CSS.registerProperty({ name, syntax: '<color>', inherits: true, initialValue: computed.getPropertyValue(name).trim() });
    }
    if (colors.length) colorTransition = colors.map((name) => `${name} ${THEME_TRANSITION_MS}ms ease-in-out`).join(', ');
  } catch {
    // Older engines or a conflicting registration use color-property transitions.
  }
  return colorTransition;
}

export function createThemeController() {
  const root = document.documentElement;
  const dark = window.matchMedia(DARK_QUERY);
  const reduced = window.matchMedia(REDUCED_MOTION_QUERY);
  const slow = window.matchMedia(SLOW_UPDATE_QUERY);
  let timer: number | undefined;
  // The bootstrap styles protect the empty page before the stylesheet loads.
  root.style.removeProperty('background-color');
  root.style.removeProperty('color-scheme');
  const transition = registerThemeColors(root);
  if (transition) root.style.setProperty('--theme-color-transition', transition);

  const stop = () => {
    window.clearTimeout(timer);
    timer = undefined;
    root.classList.remove('theme-transition', 'theme-transition-fallback');
  };

  return {
    apply(preference: ThemePreference, reducedMotion: boolean, animate = true) {
      root.classList.toggle('reduced-motion', reducedMotion);
      const shouldAnimate = animate && !reducedMotion && !reduced.matches && !slow.matches && document.visibilityState !== 'hidden';
      if (!shouldAnimate) stop();
      const isDark = preference === 'dark' || (preference === 'system' && dark.matches);
      if ((root.getAttribute('data-theme') === 'dark') === isDark) return;

      if (shouldAnimate) {
        window.clearTimeout(timer);
        root.classList.add(transition ? 'theme-transition' : 'theme-transition-fallback');
        // Establish the old palette before changing the selector. Rapid changes
        // retarget the in-progress transition from its current rendered color.
        getComputedStyle(root).getPropertyValue('--bg-base');
      }
      if (isDark) root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
      if (shouldAnimate) timer = window.setTimeout(stop, THEME_TRANSITION_MS + 80);
    },
    subscribe(listener: () => void) {
      const queries = [dark, reduced, slow];
      queries.forEach((query) => query.addEventListener('change', listener));
      return () => queries.forEach((query) => query.removeEventListener('change', listener));
    },
    dispose: stop,
  };
}
