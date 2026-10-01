// Runs before styles load to avoid a bright flash when dark mode is saved.
(() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('talentai.appearance.v1') || '{}') || {}; } catch { /* default appearance */ }
  const mode = ['light','dark','system'].includes(saved.mode) ? saved.mode : 'light';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    document.documentElement.dataset.theme = mode === 'system' ? media.matches ? 'dark' : 'light' : mode;
    document.documentElement.dataset.motion = saved.reduceMotion === true ? 'reduced' : 'normal';
  };
  apply();
})();
