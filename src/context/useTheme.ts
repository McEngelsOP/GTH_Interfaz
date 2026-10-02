import { useEffect, useRef } from 'react';
import { createThemeController, ThemePreference } from '../services/theme.ts';

export function useTheme(theme: ThemePreference, reducedMotion: boolean) {
  const controller = useRef<ReturnType<typeof createThemeController> | null>(null);
  const preferences = useRef({ theme, reducedMotion });
  preferences.current = { theme, reducedMotion };

  useEffect(() => {
    const instance = createThemeController();
    controller.current = instance;
    instance.apply(preferences.current.theme, preferences.current.reducedMotion, false);
    const unsubscribe = instance.subscribe(() => {
      instance.apply(preferences.current.theme, preferences.current.reducedMotion);
    });
    return () => { unsubscribe(); instance.dispose(); controller.current = null; };
  }, []);

  useEffect(() => {
    controller.current?.apply(theme, reducedMotion);
  }, [theme, reducedMotion]);
}
