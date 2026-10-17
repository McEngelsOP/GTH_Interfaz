import React, { useState } from 'react';
import { KeyRound, LogIn, LogOut, Lock, Mail, RefreshCw } from 'lucide-react';
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
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) setError(/invalid/i.test(authError.message) ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión. Intenta nuevamente.');
    } catch { setError('No se pudo conectar. Revisa tu conexión e intenta nuevamente.'); }
    finally { setSending(false); }
  };

  return (
    <Tarjeta onSubmit={submit} etiqueta="Iniciar sesión">
      <Titulo texto="Inicia sesión con tu cuenta del Equipo de GTHC para ver los avisos y postulantes." />
      <Input label="Correo" type="email" autoComplete="username" required value={email}
        onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={16} />} />
      <Input label="Contraseña" type="password" autoComplete="current-password" required value={password}
        onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock size={16} />} />
      {error && <p role="alert" style={{ fontSize: '0.8125rem', color: '#DC2626', fontWeight: 500 }}>{error}</p>}
      <Button type="submit" variant="primary" icon={<LogIn size={17} />} disabled={sending}>
        {sending ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </Tarjeta>
  );
}

function Tarjeta({ etiqueta, onSubmit, children }: { etiqueta: string; onSubmit?: (event: React.FormEvent) => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', backgroundColor: 'var(--bg-base)' }}>
      <form onSubmit={onSubmit || ((e) => e.preventDefault())} aria-label={etiqueta} style={{ width: '100%', maxWidth: '380px',
        backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)', padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </form>
    </div>
  );
}

function Titulo({ texto }: { texto: string }) {
  return (
    <div>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
        TalentAI <span style={{ color: 'var(--primary-red)' }}>· ESAN</span>
      </h1>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{texto}</p>
    </div>
  );
}

const salir = () => supabase?.auth.signOut({ scope: 'local' });

/** Primer ingreso con contraseña temporal (o después de que una cuenta maestra la restableciera). */
export function CambiarClaveView({ onListo }: { onListo: () => void }) {
  const [clave, setClave] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    if (clave.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (clave !== repetida) { setError('Las contraseñas no coinciden.'); return; }
    setSending(true); setError('');
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: clave });
      if (authError) { setError(/different|same/i.test(authError.message) ? 'Elige una contraseña distinta de la temporal.' : 'No se pudo cambiar la contraseña. Intenta nuevamente.'); return; }
      const { error: rpcError } = await supabase.rpc('gth_clave_cambiada');
      if (rpcError) { setError('La contraseña cambió, pero no se pudo registrar. Vuelve a intentar.'); return; }
      onListo();
    } catch { setError('No se pudo conectar. Revisa tu conexión e intenta nuevamente.'); }
    finally { setSending(false); }
  };

  return (
    <Tarjeta onSubmit={submit} etiqueta="Cambiar contraseña">
      <Titulo texto="Ingresaste con una contraseña temporal. Elige una nueva para continuar." />
      <Input label="Nueva contraseña" type="password" autoComplete="new-password" required value={clave}
        onChange={(e) => setClave(e.target.value)} leftIcon={<Lock size={16} />} helperText="Al menos 8 caracteres." />
      <Input label="Repite la contraseña" type="password" autoComplete="new-password" required value={repetida}
        onChange={(e) => setRepetida(e.target.value)} leftIcon={<Lock size={16} />} />
      {error && <p role="alert" style={{ fontSize: '0.8125rem', color: '#DC2626', fontWeight: 500 }}>{error}</p>}
      <Button type="submit" variant="primary" icon={<KeyRound size={17} />} disabled={sending}>
        {sending ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
      <Button type="button" variant="ghost" icon={<LogOut size={17} />} onClick={salir}>Cerrar sesión</Button>
    </Tarjeta>
  );
}

/** Sesión válida pero sin perfil activo en gth_perfiles (cuenta desactivada o creada fuera de la web). */
export function SinAccesoView({ error, onReintentar }: { error: boolean; onReintentar: () => void }) {
  return (
    <Tarjeta etiqueta="Sin acceso">
      <Titulo texto={error ? 'No se pudo verificar tu acceso. Revisa tu conexión e intenta nuevamente.'
        : 'Tu cuenta no tiene acceso activo. Pide a una cuenta maestra del Equipo de GTHC que la habilite.'} />
      {error && <Button type="button" variant="primary" icon={<RefreshCw size={17} />} onClick={onReintentar}>Reintentar</Button>}
      <Button type="button" variant="secondary" icon={<LogOut size={17} />} onClick={salir}>Cerrar sesión</Button>
    </Tarjeta>
  );
}
