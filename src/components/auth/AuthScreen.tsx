import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './auth-screen.css';

const INTRO_MS = 2500;
let introFinished = false;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce), (update: slow)').matches
    || document.documentElement.classList.contains('reduced-motion');
}

/** Presentación compartida del acceso. La introducción se reproduce una vez por carga. */
export function AuthScreen({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  const screen = useRef<HTMLElement>(null);
  const brandSlot = useRef<HTMLDivElement>(null);
  const [intro, setIntro] = useState(() => !introFinished && !reducedMotion());

  useLayoutEffect(() => {
    const words = screen.current?.querySelector<HTMLElement>('.auth-words');
    const university = words?.querySelector<HTMLElement>('.auth-university span');
    if (!words || !university) return;
    let alive = true;
    const fit = () => {
      if (!alive) return;
      university.style.fontSize = '100px';
      const width = university.getBoundingClientRect().width;
      if (width) university.style.fontSize = `${100 * words.clientWidth / width}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(words);
    document.fonts?.ready.then(fit);
    return () => { alive = false; observer.disconnect(); };
  }, []);

  useLayoutEffect(() => {
    if (!intro) return;
    const position = () => {
      if (!brandSlot.current || !screen.current) return;
      const box = brandSlot.current.getBoundingClientRect();
      screen.current.style.setProperty('--intro-x', `${window.innerWidth / 2 - box.left - box.width / 2}px`);
      screen.current.style.setProperty('--intro-y', `${window.innerHeight / 2 - box.top - box.height / 2}px`);
    };
    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [intro]);

  useEffect(() => {
    const finish = () => { introFinished = true; setIntro(false); };
    if (!intro) { introFinished = true; return; }
    const timer = window.setTimeout(finish, INTRO_MS);
    const media = window.matchMedia('(prefers-reduced-motion: reduce), (update: slow)');
    const onPreference = () => { if (reducedMotion()) finish(); };
    media.addEventListener('change', onPreference);
    return () => { window.clearTimeout(timer); media.removeEventListener('change', onPreference); };
  }, [intro]);

  return (
    <main ref={screen} className={`auth-screen${intro ? ' auth-intro' : ''}`} aria-label={`${etiqueta} · TalentAI ESAN`}>
      <div className="auth-ambient" aria-hidden="true" />
      <div className="auth-layout">
        <div ref={brandSlot} className="auth-brand-slot">
          <div className="auth-lockup" role="img" aria-label="Universidad ESAN">
            <div className="auth-seal">
              <img src="/esan-seal.png" alt="" width="420" height="420" decoding="async" />
              <span className="auth-ring" aria-hidden="true" />
            </div>
            <div className="auth-words" aria-hidden="true">
              <div className="auth-esan">
                {'esan'.split('').map((letter, i) => <span key={letter} style={{ '--letter': i } as React.CSSProperties}>{letter}</span>)}
              </div>
              <div className="auth-university"><span>UNIVERSITY</span></div>
            </div>
          </div>
        </div>
        <section className="auth-card" aria-label={etiqueta} aria-busy={intro || undefined} inert={intro}>
          {children}
        </section>
      </div>
    </main>
  );
}
