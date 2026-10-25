import type { SupabaseClient } from '@supabase/supabase-js';

// Envío de correos a postulantes desde la cuenta de GTH: lo hace el servidor (api/correo.ts) con SMTP_* de .env.local
// o de Vercel. La web solo manda destinatario, asunto y mensaje con la sesión del usuario.

export type TipoCorreo = 'agradecimiento' | 'entrevista' | 'perfil';
export type CorreoAEnviar = { destinatario: string; asunto: string; cuerpo: string; tipo: TipoCorreo; aviso_id?: string; id_postulante?: string };
export type ResultadoCorreo = { ok: boolean; error?: string };

const POR_PEDIDO = 20;   // igual que MAX_MENSAJES en server/correo.ts

/** Envía los correos en lotes y devuelve un resultado por correo, en el mismo orden. Si un lote no llega al servidor,
 *  sus correos quedan con error y los lotes siguientes no se intentan. */
export async function enviarCorreos(client: SupabaseClient, correos: CorreoAEnviar[]): Promise<ResultadoCorreo[]> {
  const { data } = await client.auth.getSession();
  const resultados: ResultadoCorreo[] = [];
  for (let i = 0; i < correos.length; i += POR_PEDIDO) {
    const lote = correos.slice(i, i + POR_PEDIDO);
    let error = '';
    try {
      const respuesta = await fetch('/api/correo', {
        method: 'POST', cache: 'no-store', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
        body: JSON.stringify({ mensajes: lote }),
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (respuesta.ok && Array.isArray(cuerpo.resultados)) {
        resultados.push(...lote.map((_, k) => {
          const r = cuerpo.resultados.find((x: { indice: number }) => x.indice === k);
          return r ? { ok: !!r.ok, error: r.error } : { ok: false, error: 'Sin respuesta del servidor de correo.' };
        }));
        continue;
      }
      error = cuerpo.error || 'No se pudo conectar con el servidor de correo.';
    } catch {
      error = 'No se pudo conectar con el servidor de correo.';
    }
    resultados.push(...correos.slice(i).map(() => ({ ok: false, error })));
    break;
  }
  return resultados;
}
