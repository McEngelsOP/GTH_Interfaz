/** Lectura conservadora de pretensión salarial desde campos explícitos de CSV Bumeran. */
export function extraerSueldoPretendido(records: Record<string,string>[]): number | null {
  for (const record of records) for (const [key, value] of Object.entries(record)) {
    if (!/pretensi[oó]n|sueldo\s*(pretendido|deseado)|expectativa\s*salarial|salario\s*(pretendido|deseado)/i.test(key)) continue;
    const raw = value.trim();
    if (!raw || /negociable|a convenir/i.test(raw)) continue;
    const cleaned = raw.replace(/[^\d.,]/g,'');
    const normalized = /,\d{3}(?:$|[,.])/.test(cleaned) ? cleaned.replace(/,/g,'') : cleaned.replace(/\.(?=\d{3}(?:$|[,.]))/g,'').replace(',','.');
    const n = Number(normalized);
    if (Number.isFinite(n) && n > 0 && n <= 1000000) return n;
  }
  return null;
}
export function compararSueldo(ofertado?:number|null, pretendido?:number|null):'dentro'|'supera'|'pendiente' {
  if (ofertado == null || pretendido == null || !Number.isFinite(ofertado) || !Number.isFinite(pretendido)) return 'pendiente';
  return pretendido <= ofertado ? 'dentro' : 'supera';
}
