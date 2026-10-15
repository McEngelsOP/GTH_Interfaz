import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppStateData, Candidate, JobPosting } from '../types/index.ts';
import { supabase } from './supabase.ts';
import { COMMENT_MAX_LENGTH, internalCommentKey } from './internalComments.ts';

type Notes = NonNullable<AppStateData['comentariosInternos']>;

export async function loadSharedComments(client: SupabaseClient, aviso: string): Promise<Notes> {
  const access = await client.from('gth_colaboradores').select('user_id').single();
  if (access.error || !access.data) throw new Error('Sin acceso a comentarios');
  const notes: Notes = {};
  // Paginar evita perder notas cuando el aviso supera el límite de la API.
  for (let start = 0; ; start += 500) {
    const result = await client.from('comentarios_internos')
      .select('id_postulante, texto, actualizado_at').eq('aviso_id', aviso)
      .order('id_postulante').range(start, start + 499);
    if (result.error) throw result.error;
    for (const row of result.data || []) {
      notes[JSON.stringify([aviso, row.id_postulante])] = { texto: row.texto, at: row.actualizado_at };
    }
    if ((result.data?.length || 0) < 500) break;
  }
  return notes;
}

export async function persistSharedComment(client: SupabaseClient, job: JobPosting, candidate: Candidate, value: string, hadNote: boolean) {
  const texto = value.trim().slice(0, COMMENT_MAX_LENGTH);
  const aviso = job.bumeran?.avisoId || job.id;
  const id = candidate.importedProfile?.externalId || candidate.id;
  const result = texto
    ? await client.from('comentarios_internos').upsert({ aviso_id: aviso, id_postulante: id, texto }, { onConflict: 'aviso_id,id_postulante' }).select('texto, actualizado_at').single()
    : await client.from('comentarios_internos').delete().eq('aviso_id', aviso).eq('id_postulante', id).select('id_postulante');
  if (result.error || (!texto && (!Array.isArray(result.data) || !result.data.length) && hadNote)) {
    throw new Error('Verifica tu sesión y los permisos de comentarios en Supabase.');
  }
}

export function useSharedComments(job: JobPosting | undefined) {
  const aviso = job?.bumeran?.avisoId || job?.id;
  const [snapshot, setSnapshot] = useState<{ aviso?: string; notes: Notes }>({ notes: {} });
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState('');
  const request = useRef(0);
  const reload = useCallback(async () => {
    if (!supabase || !aviso) return;
    const version = ++request.current;
    try {
      const notes = await loadSharedComments(supabase, aviso);
      if (request.current !== version) return;
      setSnapshot({ aviso, notes }); setError('');
    } catch {
      if (request.current === version) setError('Comprueba la conexión y el acceso del equipo a la tabla de comentarios.');
    } finally {
      if (request.current === version) setLoading(false);
    }
  }, [aviso]);

  useEffect(() => {
    setLoading(!!supabase && !!aviso); setError('');
    void reload();
    const timer = window.setInterval(() => void reload(), 30000);
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => { ++request.current; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [reload, aviso]);

  const save = async (candidate: Candidate, value: string) => {
    if (!supabase || !job || !aviso) throw new Error('No hay conexión a Supabase.');
    ++request.current;
    await persistSharedComment(supabase, job, candidate, value, !!snapshot.notes[internalCommentKey(job, candidate)]);
    await reload();
  };
  return { enabled: !!supabase, notes: snapshot.aviso === aviso ? snapshot.notes : {}, loading, error, reload, save };
}
