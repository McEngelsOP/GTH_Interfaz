import React, { useState } from 'react';
import { LogIn, Lock, Mail } from 'lucide-react';
import { Button } from '../components/common/Button.tsx';
import { Input } from '../components/common/Input.tsx';
import { supabase } from '../services/supabase.ts';

// Solo aparece si Supabase está configurado: los avisos y postulantes de Bumeran son datos personales
// (Ley 29733) y la base de datos solo los entrega con una sesión iniciada. Usuarios: Supabase → Authentication.
export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSending(true); setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSending(false);
    if (authError) setError(/invalid/i.test(authError.message) ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión. Intenta nuevamente.');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', backgroundColor: 'var(--bg-base)' }}>
      <form onSubmit={submit} aria-label="Iniciar sesión" style={{ width: '100%', maxWidth: '380px',
        backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)', padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
            TalentAI <span style={{ color: 'var(--primary-red)' }}>· ESAN</span>
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Inicia sesión con tu cuenta del Equipo de GTHC para ver los avisos y postulantes.
          </p>
        </div>
        <Input label="Correo" type="email" autoComplete="username" required value={email}
          onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={16} />} />
        <Input label="Contraseña" type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock size={16} />} />
        {error && <p role="alert" style={{ fontSize: '0.8125rem', color: '#DC2626', fontWeight: 500 }}>{error}</p>}
        <Button type="submit" variant="primary" icon={<LogIn size={17} />} disabled={sending}>
          {sending ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </div>
  );
}
